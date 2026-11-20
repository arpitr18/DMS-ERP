import {z} from 'zod';
import {prisma} from '../db.js';
import {returnCredit} from '../services/returnPricing.js';
import {money} from '../utils/numbers.js';

const schema=z.object({retailerId:z.string().uuid(),invoiceId:z.string().uuid().nullable().optional(),type:z.enum(['INVOICE','WITHOUT_INVOICE']),returnDate:z.string().date(),reason:z.string().trim().max(500).optional().default(''),items:z.array(z.object({productId:z.string().uuid(),quantity:z.number().positive().multipleOf(0.001),condition:z.enum(['DAMAGED','EXPIRED'])})).min(1)}).refine(d=>d.type!=='INVOICE'||!!d.invoiceId,'Select an invoice.').refine(d=>new Set(d.items.map(i=>i.productId)).size===d.items.length,'Each product may appear once.');
export async function listReturns(req,res){res.json(await prisma.returnRecord.findMany({orderBy:{createdAt:'desc'},take:300}));}
export async function invoiceReturnItems(req,res){
  const invoice=await prisma.invoice.findUnique({where:{id:req.params.id},include:{items:true}});
  if(!invoice)return res.status(404).json({message:'Invoice not found.'});
  const previous=await prisma.returnRecord.findMany({where:{invoiceId:invoice.id}});
  res.json({invoice,items:invoice.items.map(item=>{const returned=previous.flatMap(r=>r.items).filter(i=>i.productId===item.productId).reduce((sum,i)=>sum+i.quantity,0);return {...item,returnedQuantity:returned,remainingQuantity:Math.max(0,Number(item.quantity)-returned),returnRate:Number(item.lineTotal)/Number(item.quantity)};})});
}
export async function createReturn(req,res){
  const data=schema.parse(req.body);
  const saved=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(78314292)::text AS locked`;
    await tx.$queryRaw`SELECT "id" FROM "Retailer" WHERE "id"=${data.retailerId} FOR UPDATE`;
    const retailer=await tx.retailer.findUnique({where:{id:data.retailerId}});
    if(!retailer?.active)throw Object.assign(new Error('Select an active retailer.'),{status:400});
    const invoice=data.type==='INVOICE'?await tx.invoice.findUnique({where:{id:data.invoiceId},include:{items:true}}):null;
    if(data.type==='INVOICE'&&(!invoice||invoice.retailerId!==retailer.id))throw Object.assign(new Error('Invoice does not belong to this retailer.'),{status:400});
    if(invoice&&data.returnDate<invoice.invoiceDate.toISOString().slice(0,10))throw Object.assign(new Error('Return date cannot precede invoice date.'),{status:400});
    const previous=invoice?await tx.returnRecord.findMany({where:{invoiceId:invoice.id}}):[];
    const items=[];
    for(const entry of data.items){
      const product=await tx.product.findUnique({where:{id:entry.productId}});
      if(!product)throw Object.assign(new Error('Product not found.'),{status:400});
      const source=invoice?.items.find(i=>i.productId===product.id);
      if(invoice&&!source)throw Object.assign(new Error('Product is not on this invoice.'),{status:400});
      const returned=previous.flatMap(r=>r.items).filter(i=>i.productId===product.id).reduce((sum,i)=>sum+i.quantity,0);
      const rate=source?Number(source.lineTotal)/Number(source.quantity):Number(product.defaultSellingRate);
      const amount=source?returnCredit(source.lineTotal,Number(source.quantity),returned,entry.quantity):money(rate*entry.quantity);
      items.push({...entry,code:product.code,name:source?.productNameSnapshot||product.name,unit:source?.unitSnapshot||product.unit,rate,amount,costRate:Number(source?.costRate??product.basePrice)});
    }
    const amount=money(items.reduce((sum,i)=>sum+i.amount,0));
    if(amount<=0)throw Object.assign(new Error('Return credit must be greater than zero.'),{status:400});
    const record=await tx.returnRecord.create({data:{retailerId:retailer.id,retailerName:retailer.name,invoiceId:invoice?.id||null,invoiceNumber:invoice?.invoiceNumber||null,type:data.type,returnDate:new Date(data.returnDate+'T00:00:00Z'),reason:data.reason,amount,items}});
    await tx.retailerCredit.create({data:{retailerId:retailer.id,amount,reason:'RETURN',notes:'Return '+record.id+': '+data.reason,creditDate:record.returnDate}});
    for(const item of items)await tx.inventoryTransaction.create({data:{productId:item.productId,type:'RETURN',quantityChange:0,unitCost:item.costRate,referenceType:'RETURN',referenceId:record.id,transactionDate:record.returnDate,note:item.condition+': '+item.quantity+' '+item.unit}});
    return record;
  });
  res.status(201).json(saved);
}
