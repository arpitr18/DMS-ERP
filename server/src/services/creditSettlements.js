import {excessPayment} from './paymentAllocations.js';

export async function creditSources(tx,retailerId){
  const where=retailerId?{retailerId}:{};
  const [notes,payments]=await Promise.all([
    tx.retailerCredit.findMany({where,include:{retailer:{select:{name:true}}}}),
    tx.payment.findMany({where:{...where,invoiceId:null},include:{retailer:{select:{name:true}}}})
  ]);
  return [...notes,...payments.filter(p=>excessPayment(p)>0).map(p=>({...p,amount:excessPayment(p),creditDate:p.paymentDate,reason:'EXCESS_PAYMENT',notes:'Excess from payment '+p.id}))];
}

// Explicit allocations are authoritative. Older bills only saved a pooled amount;
// reconstruct those using oldest available credit first and label them inferred.
export function creditSettlementHistory(credits,invoices){
  const rows=new Map(credits.map(c=>[c.id,{...c,settledAmount:0,settlements:[]}]));
  const ordered=[...credits].sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt)||a.id.localeCompare(b.id));
  const bills=[...invoices].sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt)||a.id.localeCompare(b.id));
  for(const bill of bills){
    let remaining=Math.round(Number(bill.creditApplied)*100);
    const allocations=Array.isArray(bill.creditAllocations)?bill.creditAllocations:null;
    const candidates=allocations||ordered.filter(c=>+new Date(c.createdAt)<=+new Date(bill.createdAt)).map(c=>({creditId:c.id,amount:Number(c.amount)}));
    for(const allocation of candidates){
      const row=rows.get(allocation.creditId);
      if(!row||remaining<=0)continue;
      const amount=Math.min(remaining,Math.round((Number(row.amount)-row.settledAmount)*100),Math.round(Number(allocation.amount)*100));
      if(amount<=0)continue;
      row.settledAmount=Math.round(row.settledAmount*100+amount)/100;
      row.settlements.push({invoiceId:bill.id,invoiceNumber:bill.invoiceNumber,amount:amount/100,inferred:!allocations});
      remaining-=amount;
    }
  }
  return [...rows.values()].map(row=>({...row,remainingAmount:Math.max(0,Math.round((Number(row.amount)-row.settledAmount)*100)/100),status:row.settledAmount<=0?'UNSETTLED':row.settledAmount>=Number(row.amount)?'SETTLED':'PARTIAL'}));
}

export async function allocateCreditNotes(tx,retailerId,amount){
  const [credits,invoices]=await Promise.all([creditSources(tx,retailerId),tx.invoice.findMany({where:{retailerId,creditApplied:{gt:0}}})]);
  let remaining=Math.round(amount*100);
  return creditSettlementHistory(credits,invoices).sort((a,b)=>+new Date(a.createdAt)-+new Date(b.createdAt)||a.id.localeCompare(b.id)).flatMap(c=>{
    const used=Math.min(remaining,Math.round(c.remainingAmount*100));remaining-=used;
    return used>0?[{creditId:c.id,amount:used/100}]:[];
  });
}
