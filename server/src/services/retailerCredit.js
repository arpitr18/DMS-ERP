import {money} from '../utils/numbers.js';
import {retailerOutstanding} from './outstanding.js';

// Credits are allocations of existing funds/credit notes, never new collections.
export function availableRetailerCredit(openingOutstanding, generalPayments, creditNotes, invoices) {
  const openingCredit=Math.max(0,-Number(openingOutstanding));
  const used=invoices.reduce((sum,i)=>sum+Number(i.creditApplied||0),0);
  const overpayments=invoices.reduce((sum,i)=>{
    const paid=i.payments.reduce((total,p)=>total+Number(p.amount),0);
    return sum+Math.max(0,paid-Math.max(0,Number(i.grandTotal)-Number(i.creditApplied||0)));
  },0);
  return money(Math.max(0,openingCredit+Number(generalPayments)+Number(creditNotes)+overpayments-used));
}

export async function retailerAccount(tx,retailerId) {
  const retailer=await tx.retailer.findUnique({where:{id:retailerId}});
  if(!retailer)throw Object.assign(new Error('Retailer not found.'),{status:404});
  const [general,credits,invoices,outstanding]=await Promise.all([
    tx.payment.aggregate({where:{retailerId,invoiceId:null},_sum:{amount:true}}),
    tx.retailerCredit.findMany({where:{retailerId},orderBy:{creditDate:'desc'}}),
    tx.invoice.findMany({where:{retailerId},select:{grandTotal:true,creditApplied:true,payments:{select:{amount:true}}}}),
    retailerOutstanding(tx,retailerId)
  ]);
  const availableCredit=availableRetailerCredit(retailer.openingOutstanding,general._sum.amount||0,credits.reduce((sum,c)=>sum+Number(c.amount),0),invoices);
  return {outstanding:money(outstanding),previousDues:money(Math.max(0,outstanding+availableCredit)),availableCredit,credits};
}
