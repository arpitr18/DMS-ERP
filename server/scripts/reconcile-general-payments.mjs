import 'dotenv/config';
import {prisma} from '../src/db.js';
import {settleGeneralPayments} from '../src/services/paymentAllocations.js';
import {retailerAccount} from '../src/services/retailerCredit.js';
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw Error('This repair is restricted to localhost.');
try{
 const ids=await prisma.payment.findMany({where:{invoiceId:null},select:{retailerId:true},distinct:['retailerId']});
 for(const {retailerId} of ids)await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(78314292)::text AS locked`;
   await tx.$queryRaw`SELECT "id" FROM "Retailer" WHERE "id"=${retailerId} FOR UPDATE`;
   await settleGeneralPayments(tx,retailerId);
 });
 console.log('Reconciled retailers:',ids.length);
 const retailer=await prisma.retailer.findFirst({where:{name:{equals:'Banaras Super Mart',mode:'insensitive'}}});
 if(retailer){const account=await retailerAccount(prisma,retailer.id);console.log(JSON.stringify({retailer:retailer.name,outstanding:account.outstanding,previousDues:account.previousDues,availableCredit:account.availableCredit}));}
}finally{await prisma.$disconnect()}
