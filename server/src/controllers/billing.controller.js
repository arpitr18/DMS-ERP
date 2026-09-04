import { z } from 'zod';
import { prisma } from '../db.js';
import { getBusinessSettings } from '../services/businessSettings.js';
import { streamInvoicePdf } from '../services/pdf.js';
import { getEffectivePrice } from '../services/pricing.js';
import { generateInvoiceNumber } from '../utils/invoiceNumber.js';
import { money } from '../utils/numbers.js';

const itemSchema = z.object({ productId: z.string().uuid(), quantity: z.coerce.number().positive(), manualRate: z.coerce.number().positive().optional().nullable() });
const invoiceSchema = z.object({
  retailerId: z.string().uuid(), invoiceDate: z.string().or(z.date()), paymentMode: z.enum(['CASH', 'CREDIT', 'PARTIAL']).default('CREDIT'),
  amountReceived: z.coerce.number().min(0).default(0), discount: z.coerce.number().min(0).default(0), roundOff: z.coerce.number().default(0),
  notes: z.string().optional().nullable(), items: z.array(itemSchema).min(1)
});

export async function listInvoices(req, res) {
  const where = {};
  if (req.query.retailerId) where.retailerId = String(req.query.retailerId);
  if (req.query.from || req.query.to) {
    where.invoiceDate = {};
    if (req.query.from) where.invoiceDate.gte = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.invoiceDate.lte = new Date(`${req.query.to}T23:59:59.999`);
  }
  const rows = await prisma.invoice.findMany({ where, include: { retailer: { select: { name: true, market: true } } }, orderBy: { invoiceDate: 'desc' }, take: 300 });
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
  const invoice = await prisma.$transaction(async tx => {
    const retailer = await tx.retailer.findUnique({ where: { id: data.retailerId } });
    if (!retailer || !retailer.active) throw Object.assign(new Error('Retailer not found or inactive.'), { status: 400 });
    const business = await getBusinessSettings(tx);
    const productIds = [...new Set(data.items.map(i => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: productIds }, active: true } });
    const productMap = new Map(products.map(p => [p.id, p]));
    if (products.length !== productIds.length) throw Object.assign(new Error('One or more products are unavailable.'), { status: 400 });
    const itemRows = [];
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      const stockAgg = await tx.inventoryTransaction.aggregate({ where: { productId: product.id }, _sum: { quantityChange: true } });
      const available = Number(stockAgg._sum.quantityChange || 0);
      if (available < item.quantity) throw Object.assign(new Error(`${product.name}: only ${available} ${product.unit} available.`), { status: 400 });
      const effective = await getEffectivePrice(tx, retailer.id, product.id);
      const rate = item.manualRate ?? effective.rate;
      const taxableAmount = money(item.quantity * rate);
      const taxAmount = money(taxableAmount * Number(product.gstRate) / 100);
      itemRows.push({
        productId: product.id, productCodeSnapshot: product.code, productNameSnapshot: product.name, hsnCodeSnapshot: product.hsnCode,
        quantity: item.quantity, rate, costRate: Number(product.basePrice), mrpSnapshot: Number(product.mrp), gstRate: Number(product.gstRate),
        taxableAmount, taxAmount, lineTotal: money(taxableAmount + taxAmount)
      });
    }
    const subtotal = money(itemRows.reduce((sum, item) => sum + item.taxableAmount, 0));
    const discount = Math.min(data.discount, subtotal);
    const discountRatio = subtotal ? (subtotal - discount) / subtotal : 1;
    let taxableAmount = 0; let totalTax = 0;
    for (const item of itemRows) {
      item.taxableAmount = money(item.taxableAmount * discountRatio);
      item.taxAmount = money(item.taxableAmount * item.gstRate / 100);
      item.lineTotal = money(item.taxableAmount + item.taxAmount);
      taxableAmount += item.taxableAmount; totalTax += item.taxAmount;
    }
    taxableAmount = money(taxableAmount); totalTax = money(totalTax);
    const sameState = String(retailer.state || '').trim().toLowerCase() === String(business.state || '').trim().toLowerCase();
    const cgst = sameState ? money(totalTax / 2) : 0;
    const sgst = sameState ? money(totalTax - cgst) : 0;
    const igst = sameState ? 0 : totalTax;
    const grandTotal = money(taxableAmount + totalTax + data.roundOff);
    const requestedReceived = data.paymentMode === 'CASH' && Number(data.amountReceived) === 0 ? grandTotal : money(data.amountReceived);
    const amountReceived = Math.min(requestedReceived, grandTotal);
    const balanceDue = money(grandTotal - amountReceived);
    const created = await tx.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(business.invoicePrefix), retailerId: retailer.id, invoiceDate: new Date(data.invoiceDate),
        paymentMode: data.paymentMode, status: balanceDue <= 0 ? 'PAID' : 'OPEN', retailerNameSnapshot: retailer.name,
        retailerCodeSnapshot: retailer.code, retailerGstinSnapshot: retailer.gstin, retailerAddressSnapshot: retailer.address,
        retailerStateSnapshot: retailer.state, businessNameSnapshot: business.businessName, businessGstinSnapshot: business.gstin || null,
        businessAddressSnapshot: business.address || null, businessPhoneSnapshot: business.phone || null, businessStateSnapshot: business.state || null,
        subtotal, discount, taxableAmount, cgst, sgst, igst, roundOff: data.roundOff, grandTotal, amountReceived, balanceDue,
        notes: data.notes, items: { create: itemRows }
      }, include: { items: true }
    });
    for (const item of itemRows) {
      await tx.inventoryTransaction.create({ data: { productId: item.productId, type: 'SALE', quantityChange: -item.quantity, unitCost: item.costRate, referenceType: 'INVOICE', referenceId: created.id, transactionDate: new Date(data.invoiceDate) } });
    }
    if (amountReceived > 0) await tx.payment.create({ data: { retailerId: retailer.id, invoiceId: created.id, amount: amountReceived, paymentDate: new Date(data.invoiceDate), method: data.paymentMode === 'CREDIT' ? 'CASH' : data.paymentMode } });
    return created;
  });
  res.status(201).json(invoice);
}
