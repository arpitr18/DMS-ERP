import { z } from 'zod';
import { prisma } from '../db.js';
import { getBusinessSettings } from '../services/businessSettings.js';
import { streamInvoicePdf } from '../services/pdf.js';
import { getEffectivePrice } from '../services/pricing.js';
import { generateInvoiceNumber } from '../utils/invoiceNumber.js';
import { money } from '../utils/numbers.js';
import { calculateInclusiveTotals } from '../services/inclusiveTax.js';
import { validDateKey } from '../../../shared/schemeDates.js';
import {applyStackedSchemes} from '../../../shared/stackedSchemes.js';
import {retailerAccount} from '../services/retailerCredit.js';

const itemSchema = z.object({ productId: z.string().uuid(), quantity: z.coerce.number().positive(), manualRate: z.coerce.number().positive().optional().nullable() });
const invoiceSchema = z.object({
  confirmedCreditOutstanding:z.number().optional(),
  customSchemeIds:z.array(z.string().uuid()).optional(),creditAmount:z.number().nonnegative().multipleOf(0.01).default(0),
  salesmanId:z.string().uuid().optional().nullable(),additionalDiscountPercent:z.number().min(0).max(100).optional(),billType: z.enum(['GST', 'RETAIL']).default('RETAIL'), retailerId: z.string().uuid(), invoiceDate: z.string().or(z.date()), paymentMode: z.enum(['CASH', 'CREDIT', 'PARTIAL']).default('CREDIT'),
  amountReceived: z.coerce.number().min(0).default(0), discount: z.coerce.number().min(0).default(0), roundOff: z.coerce.number().default(0),
  notes: z.string().optional().nullable(), items: z.array(itemSchema).min(1).refine(items=>new Set(items.map(item=>item.productId)).size===items.length,'Combine duplicate product quantities into one line so schemes are applied once per product.')
});

export async function getRetailerBenefits(req,res){
  res.json(await retailerAccount(prisma,req.params.retailerId));
}

export async function listInvoices(req, res) {
  const where = {};
  const q = String(req.query.q || '').trim();
  if (q) where.OR = [
    { invoiceNumber: { contains: q, mode: 'insensitive' } },
    { retailerNameSnapshot: { contains: q, mode: 'insensitive' } },
    { retailer: { name: { contains: q, mode: 'insensitive' } } }
  ];
  if (req.query.market) where.retailer = { market: String(req.query.market) };
  const page = z.coerce.number().int().min(1).parse(req.query.page || 1);
  if (req.query.retailerId) where.retailerId = String(req.query.retailerId);
  if (req.query.from || req.query.to) {
    where.invoiceDate = {};
    if (req.query.from) where.invoiceDate.gte = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.invoiceDate.lte = new Date(`${req.query.to}T23:59:59.999`);
  }
  const rows = await prisma.invoice.findMany({ where, include: { retailer: { select: { name: true, market: true } }, deliveryPlan: { select: { id: true, status: true, scheduledDate: true } } }, orderBy: [{ invoiceDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], take: 300, skip: (page - 1) * 300 });
  res.json(rows);
}

export async function getInvoice(req, res) {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { items: true, payments: true } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  res.json(invoice);
}

export async function getInvoicePdf(req, res) {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { items: { orderBy: { productNameSnapshot: 'asc' } } } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  streamInvoicePdf(invoice, res);
}

export async function createInvoice(req, res) {
  const data = invoiceSchema.parse(req.body);
  const invoiceDay = typeof data.invoiceDate === 'string' ? data.invoiceDate.slice(0, 10) : data.invoiceDate.toISOString().slice(0, 10);
  if (!validDateKey(invoiceDay) || Number.isNaN(new Date(data.invoiceDate).getTime())) return res.status(400).json({ message: 'A valid invoice date is required.' });
  const invoice = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(78314292)::text AS locked`;
    await tx.$queryRaw`SELECT "id" FROM "Retailer" WHERE "id"=${data.retailerId} FOR UPDATE`;
    const retailer = await tx.retailer.findUnique({ where: { id: data.retailerId } });
    if (!retailer || !retailer.active) throw Object.assign(new Error('Retailer not found or inactive.'), { status: 400 });
    if (!retailer.address?.trim() || !retailer.state?.trim()) throw Object.assign(new Error('Add the retailer complete shop address and state before creating a bill.'), { status: 400 });
    if (data.billType === 'GST' && !retailer.gstin?.trim()) throw Object.assign(new Error('Add the retailer GSTIN before creating a GST bill.'), { status: 400 });
    const business = await getBusinessSettings(tx);
    const productIds = [...new Set(data.items.map(i => i.productId))];
    const schemeDate = new Date(invoiceDay + 'T00:00:00.000Z');
    const activeSchemes = await tx.productScheme.findMany({ where: { cancelledAt: null, startDate: { lte: schemeDate }, endDate: { gte: schemeDate } } });
    const schemes=activeSchemes.filter(s=>!['OUTLET','BEAT'].includes(s.targetType)||data.customSchemeIds===undefined||data.customSchemeIds.includes(s.id));

    const products = await tx.product.findMany({ where: { id: { in: productIds }, active: true } });
    const productMap = new Map(products.map(p => [p.id, p]));
    if (products.length !== productIds.length) throw Object.assign(new Error('One or more products are unavailable.'), { status: 400 });
    retailer.beatId=(await tx.beat.findUnique({where:{name:retailer.market},select:{id:true}}))?.id;
    let salesman=null,regularBeatOrder=null,bookingRemark=null;
    if(data.salesmanId){
      salesman=await tx.salesman.findUnique({where:{id:data.salesmanId},include:{schedule:{include:{beat:true}}}});
      if(!salesman?.active)throw Object.assign(new Error('Choose an active salesman.'),{status:400});
      const weekday=new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(schemeDate);
      const scheduled=salesman.schedule.find(entry=>entry.day===weekday);
      regularBeatOrder=scheduled?.beatId===retailer.beatId;
      if(!regularBeatOrder)bookingRemark='This is not his regular beat order. '+(scheduled?'Assigned beat for '+weekday+': '+scheduled.beat.name+'.':'No beat assigned for '+weekday+'.');
    }
    const rawLines=[];
    for(const item of data.items){const product=productMap.get(item.productId);const price=await getEffectivePrice(tx,retailer.id,product.id);rawLines.push({product,productId:product.id,quantity:item.quantity,rate:item.manualRate??price.rate});}
    let benefits;
    try{benefits=applyStackedSchemes(rawLines,schemes,retailer)}catch(error){throw Object.assign(error,{status:400});}
    if(data.customSchemeIds?.some(id=>!benefits.some(line=>line.appliedSchemes.some(s=>s.id===id))))throw Object.assign(new Error('A selected extra scheme is no longer eligible. Refresh the bill and review the available discounts.'),{status:409});
    const itemRows = [];
    const requiredStock = new Map();
    for (const [index,item] of data.items.entries()) {
      const product = productMap.get(item.productId);
      const stockAgg = await tx.inventoryTransaction.aggregate({ where: { productId: product.id }, _sum: { quantityChange: true } });
      const available = Number(stockAgg._sum.quantityChange || 0) - (requiredStock.get(product.id)||0);
      if (available < item.quantity) throw Object.assign(new Error(`${product.name}: only ${available} ${product.unit} available.`), { status: 400 });
      const benefit=benefits[index];
      const rate=benefit.rate;
      if(available<item.quantity+benefit.freeQuantity)throw Object.assign(new Error(`${product.name}: stock is insufficient including ${benefit.freeQuantity} free units.`),{status:400});
      requiredStock.set(product.id,(requiredStock.get(product.id)||0)+item.quantity+benefit.freeQuantity);
      const taxableAmount = money(item.quantity * rate / (1 + Number(product.gstRate) / 100));
      const taxAmount = money(item.quantity * rate - taxableAmount);
      itemRows.push({
        schemeIdSnapshot:benefit.appliedSchemes.length===1?benefit.appliedSchemes[0].id:null,schemeNameSnapshot:benefit.appliedSchemes.map(s=>s.code+' '+s.name).join(' + ')||null,schemeTypeSnapshot:benefit.appliedSchemes.length?'STACKED':null,appliedSchemes:benefit.appliedSchemes,
        schemePercent: benefit.schemePercent, schemeDiscount: benefit.schemeDiscount, freeQuantity:benefit.freeQuantity, unitSnapshot:product.unit,
        productId: product.id, productCodeSnapshot: product.code, productNameSnapshot: product.name, hsnCodeSnapshot: product.hsnCode,
        quantity: item.quantity, rate, costRate: Number(product.basePrice), mrpSnapshot: Number(product.mrp), gstRate: Number(product.gstRate),
        taxableAmount, taxAmount, lineTotal: money(taxableAmount + taxAmount)
      });
    }
    const beforeBillDiscount=calculateInclusiveTotals(itemRows,0);
    const extraDiscount=data.additionalDiscountPercent==null?data.discount:money(beforeBillDiscount.total*data.additionalDiscountPercent/100);
    const totals = calculateInclusiveTotals(itemRows, extraDiscount);
    const { subtotal, discount, taxableAmount, totalTax } = totals;
    itemRows.splice(0, itemRows.length, ...totals.lines);
    const sameState = String(retailer.state || '').trim().toLowerCase() === String(business.state || '').trim().toLowerCase();
    const cgst = sameState ? money(totalTax / 2) : 0;
    const sgst = sameState ? money(totalTax - cgst) : 0;
    const igst = sameState ? 0 : totalTax;
    const grandTotal = money(taxableAmount + totalTax + data.roundOff);
    if(grandTotal<0)throw Object.assign(new Error('Bill total cannot be negative.'),{status:400});
    const creditApplied=money(Math.min(data.creditAmount,grandTotal));
    if(creditApplied>0){
      const account=await retailerAccount(tx,retailer.id);
      if(creditApplied>account.availableCredit)throw Object.assign(new Error('Available retailer credit has changed. Refresh and review the credit before saving.'),{status:409});
    }
    const requestedReceived = data.paymentMode === 'CASH' && Number(data.amountReceived) === 0 ? grandTotal : money(data.amountReceived);
    const cashReceived = Math.min(requestedReceived, money(grandTotal-creditApplied));
    const amountReceived = money(cashReceived+creditApplied);
    const account=await retailerAccount(tx,retailer.id);
    const projectedOutstanding=money(account.outstanding+grandTotal-cashReceived);
    if(retailer.creditLimit!==null&&projectedOutstanding>Number(retailer.creditLimit)&&data.confirmedCreditOutstanding!==projectedOutstanding){
      throw Object.assign(new Error('This bill exceeds the retailer credit limit. Confirm to save anyway.'),{status:409,creditLimit:Number(retailer.creditLimit),projectedOutstanding});
    }
    const balanceDue = money(grandTotal - amountReceived);
    const created = await tx.invoice.create({
      data: {
        creditApplied,salesmanId:salesman?.id||null,salesmanNameSnapshot:salesman?.name||null,regularBeatOrder,bookingRemark,additionalDiscountPercent:data.additionalDiscountPercent||0,
        billType: data.billType, invoiceNumber: generateInvoiceNumber(business.invoicePrefix), retailerId: retailer.id, invoiceDate: new Date(data.invoiceDate),
        paymentMode: data.paymentMode, status: balanceDue <= 0 ? 'PAID' : 'OPEN', retailerNameSnapshot: retailer.name,
        retailerCodeSnapshot: retailer.code, retailerGstinSnapshot: data.billType === 'GST' ? retailer.gstin : null, retailerAddressSnapshot: [retailer.address, retailer.city].filter(Boolean).join(', '),
        retailerStateSnapshot: retailer.state, businessNameSnapshot: business.businessName, businessGstinSnapshot: business.gstin || null,
        businessAddressSnapshot: business.address || null, businessPhoneSnapshot: business.phone || null, businessStateSnapshot: business.state || null,
        subtotal, discount, schemeDiscount: totals.schemeDiscount, taxableAmount, cgst, sgst, igst, roundOff: data.roundOff, grandTotal, amountReceived, balanceDue,
        notes: data.notes, items: { create: itemRows }
      }, include: { items: true }
    });
    for (const item of itemRows) {
      await tx.inventoryTransaction.create({ data: { productId: item.productId, type: 'SALE', quantityChange: -(item.quantity+Number(item.freeQuantity||0)), unitCost: item.costRate, referenceType: 'INVOICE', referenceId: created.id, transactionDate: new Date(data.invoiceDate) } });
    }
    if (cashReceived > 0) await tx.payment.create({ data: { retailerId: retailer.id, invoiceId: created.id, amount: cashReceived, paymentDate: new Date(data.invoiceDate), method: data.paymentMode === 'CREDIT' ? 'CASH' : data.paymentMode } });
    return created;
  });
  res.status(201).json(invoice);
}
