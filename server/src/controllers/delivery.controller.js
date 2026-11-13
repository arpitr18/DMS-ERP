import { z } from 'zod';
import { prisma } from '../db.js';
import { deliverySnapshot } from '../services/deliverySummary.js';
import { deliveryPdf } from '../services/deliveryPdf.js';

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
  const buffer=await deliveryPdf(plan,kind);
  res.type('application/pdf').attachment(`delivery-${kind}-${plan.id.slice(0,8)}.pdf`).send(buffer);
}
