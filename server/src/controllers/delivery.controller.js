import { z } from 'zod';
import { prisma } from '../db.js';
import { deliverySnapshot } from '../services/deliverySummary.js';
import { deliveryPdf } from '../services/deliveryPdf.js';
import { reviseDeliverySnapshot } from '../services/deliveryRevision.js';

const vehicleSchema = z.object({ name: z.string().trim().min(1).max(120), number: z.string().trim().min(3).transform(v => v.replace(/\s/g,'').toUpperCase()), driverName: z.string().trim().min(1), phone: z.string().optional().nullable(), capacityKg: z.number().positive().optional().nullable(), active: z.boolean().default(true) });
export async function listVehicles(req,res) { res.json(await prisma.vehicle.findMany({orderBy:{number:'asc'}})); }
export async function saveVehicle(req,res) {
  const data=vehicleSchema.parse(req.body);
  res.status(req.params.id?200:201).json(req.params.id?await prisma.vehicle.update({where:{id:req.params.id},data}):await prisma.vehicle.create({data}));
}
export async function availableBills(req,res) {
  const where={deliveryPlanId:null};
  if(req.query.market)where.retailer={market:String(req.query.market)};
  if(req.query.retailerId)where.retailerId=String(req.query.retailerId);
  const q=String(req.query.q||'').trim();
  if(q)where.OR=[{invoiceNumber:{contains:q,mode:'insensitive'}},{retailerNameSnapshot:{contains:q,mode:'insensitive'}}];
  res.json(await prisma.invoice.findMany({where,include:{retailer:{select:{market:true}}},orderBy:{invoiceDate:'desc'}}));
}
export async function listPlans(req,res) { res.json(await prisma.deliveryPlan.findMany({orderBy:{createdAt:'desc'}})); }
export async function getPlan(req,res) {
  const plan=await prisma.deliveryPlan.findUnique({where:{id:req.params.id}});
  if(!plan)return res.status(404).json({message:'Delivery plan not found.'});
  res.json(plan);
}
export async function createPlan(req,res) {
  const data=z.object({vehicleId:z.string().uuid(),scheduledDate:z.string().refine(v=>!Number.isNaN(new Date(v).getTime()),'Valid delivery date required.'),notes:z.string().optional(),invoiceIds:z.array(z.string().uuid()).min(1).max(500)}).parse(req.body);
  const ids=[...new Set(data.invoiceIds)];
  const plan=await prisma.$transaction(async tx=>{
    const vehicle=await tx.vehicle.findUnique({where:{id:data.vehicleId}});
    if(!vehicle?.active)throw Object.assign(new Error('Choose an active vehicle.'),{status:400});
    const invoices=await tx.invoice.findMany({where:{id:{in:ids},deliveryPlanId:null},include:{retailer:true,items:{include:{product:true}}}});
    if(invoices.length!==ids.length)throw Object.assign(new Error('Some bills are already assigned or delivered. Refresh the available bills.'),{status:409});
    const created=await tx.deliveryPlan.create({data:{vehicleId:data.vehicleId,scheduledDate:new Date(data.scheduledDate),notes:data.notes,snapshot:deliverySnapshot(invoices,vehicle)}});
    const claimed=await tx.invoice.updateMany({where:{id:{in:ids},deliveryPlanId:null},data:{deliveryPlanId:created.id}});
    if(claimed.count!==ids.length)throw Object.assign(new Error('Another plan claimed one of these bills. Refresh and retry.'),{status:409});
    return created;
  });
  res.status(201).json(plan);
}
export async function changePlan(req,res) {
  const {status}=z.object({status:z.enum(['DELIVERED','CANCELLED'])}).parse(req.body);
  await prisma.$transaction(async tx=>{
    const result=await tx.deliveryPlan.updateMany({where:{id:req.params.id,status:'PLANNED'},data:{status,completedAt:new Date()}});
    if(result.count!==1)throw Object.assign(new Error('This plan is already completed/cancelled or does not exist.'),{status:409});
    if(status==='CANCELLED')await tx.invoice.updateMany({where:{deliveryPlanId:req.params.id},data:{deliveryPlanId:null}});
  });
  res.json({status});
}
export async function summaryPdf(req,res) {
  const kind=z.enum(['party','product']).parse(req.params.kind);
  const plan=await prisma.deliveryPlan.findUnique({where:{id:req.params.id}});
  if(!plan)return res.status(404).json({message:'Delivery plan not found.'});
  if(plan.status!=='PLANNED')return res.status(409).json({message:'Printing is available only for pending delivery plans. Cancelled and delivered plans cannot be printed.'});
  const buffer=await deliveryPdf(plan,kind);
  res.type('application/pdf').attachment(`delivery-${kind}-${plan.id.slice(0,8)}.pdf`).send(buffer);
}

export async function modifyPlan(req, res) {
  const data = z.object({ removeBeats: z.array(z.string()).default([]), removeRetailerIds: z.array(z.string().uuid()).default([]) }).parse(req.body);
  const replacement = await prisma.$transaction(async tx => {
    // Claim the state transition first. Competing modify/complete/cancel requests cannot all win.
    const claimed = await tx.deliveryPlan.updateMany({ where: { id: req.params.id, status: 'PLANNED' }, data: { status: 'CANCELLED', completedAt: new Date() } });
    if (claimed.count !== 1) throw Object.assign(new Error('Only pending delivery plans can be modified. Refresh the delivery details.'), { status: 409 });
    const old = await tx.deliveryPlan.findUnique({ where: { id: req.params.id } });
    const original = old.snapshot;
    const knownBeats = new Set(original.bills.map(bill => bill.beat));
    const knownRetailers = new Set(original.bills.map(bill => bill.retailerId));
    if (data.removeBeats.some(beat => !knownBeats.has(beat)) || data.removeRetailerIds.some(id => !knownRetailers.has(id))) {
      throw Object.assign(new Error('Choose beats and outlets from this delivery plan only.'), { status: 400 });
    }
    const keep = original.bills.filter(bill => !data.removeBeats.includes(bill.beat) && !data.removeRetailerIds.includes(bill.retailerId));
    if (keep.length === original.bills.length) throw Object.assign(new Error('Remove at least one beat or outlet before saving.'), { status: 400 });
    if (!keep.length) throw Object.assign(new Error('No bills remain. Use Cancel Plan to cancel the whole delivery.'), { status: 400 });
    const invoices = await tx.invoice.findMany({ where: { deliveryPlanId: old.id }, include: { items: true } });
    if (invoices.length !== original.bills.length || invoices.some(invoice => !original.bills.some(bill => bill.id === invoice.id))) {
      throw Object.assign(new Error('Delivery bill assignments changed. Refresh and try again.'), { status: 409 });
    }
    const keepIds = new Set(keep.map(bill => bill.id));
    const revised = reviseDeliverySnapshot(original, invoices.filter(invoice => keepIds.has(invoice.id)));
    const created = await tx.deliveryPlan.create({ data: {
      vehicleId: old.vehicleId, scheduledDate: old.scheduledDate, notes: old.notes,
      snapshot: { ...revised, previousPlanId: old.id }
    } });
    await tx.deliveryPlan.update({ where: { id: old.id }, data: {
      snapshot: { ...original, nextPlanId: created.id, revision: { removeBeats: data.removeBeats, removeRetailerIds: data.removeRetailerIds } }
    } });
    await tx.invoice.updateMany({ where: { deliveryPlanId: old.id }, data: { deliveryPlanId: null } });
    const assigned = await tx.invoice.updateMany({ where: { id: { in: [...keepIds] }, deliveryPlanId: null }, data: { deliveryPlanId: created.id } });
    if (assigned.count !== keep.length) throw Object.assign(new Error('Bill assignments changed. Please retry.'), { status: 409 });
    return created;
  });
  res.status(201).json(replacement);
}
