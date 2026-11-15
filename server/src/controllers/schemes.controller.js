import { z } from 'zod';
import { prisma } from '../db.js';
import { validDateKey, indiaToday } from '../../../shared/schemeDates.js';
import {schemeTypes,convertSchemeUnits,freeQuantityInBillingUnits} from '../../../shared/schemeBenefits.js';
import {retailChannels,retailSubchannels} from '../../../shared/retailAttributes.js';

const dateKey = z.string().refine(validDateKey, 'Enter a valid calendar date.');
const schemeSchema = z.object({name:z.string().trim().min(1).max(120),targetType:z.enum(['PRODUCT','BRAND','CHANNEL','COMBINED','ALL','OUTLET','BEAT']).default('PRODUCT'),productId:z.string().uuid().nullable().optional(),brand:z.string().trim().min(1).nullable().optional(),channel:z.enum(retailChannels).nullable().optional(),subchannel:z.enum(retailSubchannels).nullable().optional(),retailerId:z.string().uuid().nullable().optional(),beatId:z.string().nullable().optional(),type:z.enum(schemeTypes).default('PERCENT'),quantityUnit:z.enum(['VALUE','PIECE','BOX']).default('VALUE'),repeatBenefit:z.boolean().default(false),discountPercent:z.number().positive().max(100).optional(),slabs:z.array(z.object({minimumQuantity:z.number().nonnegative().multipleOf(0.001),value:z.number().positive().multipleOf(0.01)})).min(1).max(30).optional(),startDate:dateKey,endDate:dateKey}).superRefine((data,ctx)=>{
  const target={PRODUCT:data.productId,BRAND:data.brand,CHANNEL:data.channel,COMBINED:data.productId||data.brand||data.channel,ALL:true,OUTLET:data.retailerId,BEAT:data.beatId}[data.targetType];
  if(!target)ctx.addIssue({code:'custom',message:'Select the scheme target.'});
  if(data.targetType==='COMBINED'&&data.subchannel&&!data.channel)ctx.addIssue({code:'custom',message:'Select a retail channel for the subchannel.'});
  if(data.type.startsWith('FREE_')&&!data.productId)ctx.addIssue({code:'custom',message:'Free-item schemes require a product target to identify the bonus product.'});
  const slabs=data.slabs||[{minimumQuantity:0,value:data.discountPercent}];
  if(data.endDate<data.startDate)ctx.addIssue({code:'custom',message:'End date must be on or after start date.'});
  if(new Set(slabs.map(s=>s.minimumQuantity)).size!==slabs.length)ctx.addIssue({code:'custom',message:'Each minimum quantity slab must be unique.'});
  if(slabs.some(s=>!Number.isFinite(s.value)||(data.type==='PERCENT'&&s.value>100)))ctx.addIssue({code:'custom',message:'Enter valid benefit values. Percentage cannot exceed 100.'});
  if(data.type.startsWith('FREE_')&&slabs.some(s=>s.minimumQuantity<=0||!Number.isInteger(s.value)))ctx.addIssue({code:'custom',message:'Free-item slabs require a positive minimum quantity and whole-number bonus pieces/boxes.'});
}).transform(data=>{const slabs=(data.slabs||[{minimumQuantity:0,value:data.discountPercent}]).sort((a,b)=>a.minimumQuantity-b.minimumQuantity);return{...data,slabs,discountPercent:data.type==='PERCENT'?slabs[0].value:0};});
export async function listSchemes(req, res) {
  const where = {};
  if (req.query.on) {
    const on = new Date(dateKey.parse(req.query.on) + 'T00:00:00.000Z');
    Object.assign(where, { cancelledAt: null, startDate: { lte: on }, endDate: { gte: on } });
  }
  res.json(await prisma.productScheme.findMany({ where, include: { product: { select: { code: true, name: true, unit: true, active: true } } }, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }] }));
}
export async function createScheme(req, res) {
  const data = schemeSchema.parse(req.body);
  if (data.startDate < indiaToday()) return res.status(400).json({ message: 'New schemes must start today or on a future date.' });
  const startDate = new Date(data.startDate + 'T00:00:00.000Z');
  const endDate = new Date(data.endDate + 'T00:00:00.000Z');
  const saved = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(78314292)::text AS locked`;
    const hasProduct = data.targetType==='PRODUCT'||['COMBINED','OUTLET','BEAT'].includes(data.targetType)&&Boolean(data.productId);
    const product = hasProduct?await tx.product.findUnique({ where: { id: data.productId } }):null;
    if (hasProduct && !product?.active) throw Object.assign(new Error('Select an active product.'), { status: 400 });
    if(product&&data.targetType==='COMBINED'&&data.brand&&product.brand.toLowerCase()!==data.brand.toLowerCase())throw Object.assign(new Error('The selected product does not belong to this brand.'),{status:400});
    try {
      if(product&&data.quantityUnit!=='VALUE')convertSchemeUnits(1,product,data.quantityUnit);
      if(product&&(data.type==='PER_PIECE'||data.type==='PER_BOX'))convertSchemeUnits(1,product,data.type==='PER_PIECE'?'PIECE':'BOX');
      if(data.type.startsWith('FREE_'))for(const slab of data.slabs)freeQuantityInBillingUnits(slab.value,product,data.type);
    } catch(error){throw Object.assign(error,{status:400});}
    if(data.targetType==='OUTLET'&&!await tx.retailer.findFirst({where:{id:data.retailerId,active:true}}))throw Object.assign(new Error('Choose an active outlet.'),{status:400});
    if(data.targetType==='BEAT'&&!await tx.beat.findFirst({where:{id:data.beatId,active:true}}))throw Object.assign(new Error('Choose an active beat.'),{status:400});
    if(data.targetType==='CHANNEL'&&!['Wholesale','Retail'].includes(data.channel))throw Object.assign(new Error('Choose a valid channel.'),{status:400});
    const prefix='S'+indiaToday().slice(5,7)+indiaToday().slice(2,4);
    const codes=await tx.productScheme.findMany({where:{code:{startsWith:prefix+'-'}},select:{code:true}});
    const serial=Math.max(0,...codes.map(s=>Number(s.code.split('-')[1])||0))+1;
    if(serial>9999)throw Object.assign(new Error('Monthly scheme code limit reached.'),{status:409});
    const combined=data.targetType==='COMBINED';
    return tx.productScheme.create({data:{...data,code:prefix+'-'+String(serial).padStart(4,'0'),productId:hasProduct?data.productId:null,brand:combined||data.targetType==='BRAND'?data.brand:null,channel:combined||data.targetType==='CHANNEL'?data.channel:null,subchannel:combined||data.targetType==='CHANNEL'?data.subchannel:null,retailerId:data.targetType==='OUTLET'?data.retailerId:null,beatId:data.targetType==='BEAT'?data.beatId:null,startDate,endDate}});
  });
  res.status(201).json(saved);
}
export async function cancelScheme(req, res) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(78314292)::text AS locked`;
    const scheme = await tx.productScheme.findUnique({ where: { id: req.params.id } });
    if (!scheme) throw Object.assign(new Error('Scheme not found.'), { status: 404 });
    if (scheme.cancelledAt) throw Object.assign(new Error('Scheme is already cancelled.'), { status: 409 });
    if (scheme.endDate.toISOString().slice(0,10) < indiaToday()) throw Object.assign(new Error('Expired schemes remain in history and cannot be cancelled.'), { status: 400 });
    await tx.productScheme.update({ where: { id: scheme.id }, data: { cancelledAt: new Date() } });
  });
  res.json({ status: 'CANCELLED' });
}

export async function modifyScheme(req, res) {
  const data = z.object({ endDate: dateKey }).strict().parse(req.body);
  if (data.endDate < indiaToday()) return res.status(400).json({ message: 'End date cannot be before today.' });
  const saved = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(78314292)::text AS locked`;
    const scheme = await tx.productScheme.findUnique({ where: { id: req.params.id } });
    if (!scheme) throw Object.assign(new Error('Scheme not found.'), { status: 404 });
    if (scheme.cancelledAt || scheme.endDate.toISOString().slice(0,10) < indiaToday()) throw Object.assign(new Error('Only active or upcoming schemes can be modified.'), { status: 409 });
    if (data.endDate < scheme.startDate.toISOString().slice(0,10)) throw Object.assign(new Error('End date cannot precede the scheme start date.'), { status: 400 });
    const endDate = new Date(data.endDate + 'T00:00:00.000Z');
    return tx.productScheme.update({ where: { id: scheme.id }, data: { endDate } });
  });
  res.json(saved);
}
