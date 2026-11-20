import {money} from '../utils/numbers.js';

// Rebuild general-payment allocations deterministically; never create a second
// cash receipt. Existing receipts remain intact for the ledger and reports.
export async function settleGeneralPayments(tx,retailerId){
  const retailer=await tx.retailer.findUnique({where:{id:retailerId}});
  const bills=await tx.invoice.findMany({where:{retailerId},include:{payments:true},orderBy:[{invoiceDate:'asc'},{createdAt:'asc'},{id:'asc'}]});
  const payments=await tx.payment.findMany({where:{retailerId,invoiceId:null},orderBy:[{createdAt:'asc'},{id:'asc'}]});
  const applied=new Map(bills.map(b=>[b.id,0]));
  let opening=Math.max(0,Math.round(Number(retailer.openingOutstanding)*100));
  for(const payment of payments){
    let remaining=Math.round(Number(payment.amount)*100);const allocations=[];
    const openingUsed=Math.min(opening,remaining);opening-=openingUsed;remaining-=openingUsed;
    if(openingUsed)allocations.push({type:'OPENING',amount:openingUsed/100});
    for(const bill of bills){
      if(+new Date(bill.createdAt)>+new Date(payment.createdAt))continue;
      const direct=bill.payments.reduce((sum,p)=>sum+Math.round(Number(p.amount)*100),0);
      const due=Math.max(0,Math.round((Number(bill.grandTotal)-Number(bill.creditApplied))*100)-direct-applied.get(bill.id));
      const used=Math.min(remaining,due);if(!used)continue;
      remaining-=used;applied.set(bill.id,applied.get(bill.id)+used);
      allocations.push({type:'INVOICE',invoiceId:bill.id,invoiceNumber:bill.invoiceNumber,amount:used/100});
    }
    await tx.payment.update({where:{id:payment.id},data:{allocations}});
  }
  for(const bill of bills){
    const generalPaymentApplied=applied.get(bill.id)/100;
    const received=money(bill.payments.reduce((sum,p)=>sum+Number(p.amount),0)+Number(bill.creditApplied)+generalPaymentApplied);
    const due=money(Math.max(0,Number(bill.grandTotal)-received));
    await tx.invoice.update({where:{id:bill.id},data:{generalPaymentApplied,amountReceived:received,balanceDue:due,status:due===0?'PAID':'OPEN'}});
  }
}

export function excessPayment(payment){
  return money(Math.max(0,Number(payment.amount)-(payment.allocations||[]).reduce((sum,a)=>sum+Number(a.amount),0)));
}
