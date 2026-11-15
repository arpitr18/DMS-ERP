import {convertSchemeUnits,evaluateScheme} from './schemeBenefits.js';
export function matchesScheme(scheme,product,retailer) {
  switch(scheme.targetType||'PRODUCT') {
    case 'ALL':return true;
    case 'COMBINED':return (!scheme.productId||scheme.productId===product.id)
      &&(!scheme.brand||(product.brand||'Haldiram').toLowerCase()===scheme.brand.toLowerCase())
      &&(!scheme.channel||retailer?.channel===scheme.channel)
      &&(!scheme.subchannel||retailer?.subchannel===scheme.subchannel);
    case 'PRODUCT':return scheme.productId===product.id;
    case 'BRAND':return (product.brand||'Haldiram').toLowerCase()===(scheme.brand||'').toLowerCase();
    case 'CHANNEL':return retailer?.channel===scheme.channel&&(!scheme.subchannel||retailer?.subchannel===scheme.subchannel);
    case 'OUTLET':return retailer?.id===scheme.retailerId&&(!scheme.productId||scheme.productId===product.id);
    case 'BEAT':return (retailer?.beat?.id===scheme.beatId||retailer?.beatId===scheme.beatId)&&(!scheme.productId||scheme.productId===product.id);
    default:return false;
  }
}
export function applyStackedSchemes(lines,schemes,retailer) {
  const result=lines.map(line=>({...line,schemeDiscount:0,freeQuantity:0,schemePercent:0,appliedSchemes:[]}));
  const ordered=[...schemes].sort((a,b)=>Number(['OUTLET','BEAT'].includes(a.targetType))-Number(['OUTLET','BEAT'].includes(b.targetType))||String(a.code||a.id).localeCompare(String(b.code||b.id)));
  for(const scheme of ordered){
    const matching=result.filter(line=>matchesScheme(scheme,line.product,retailer));
    const basis=matching.reduce((sum,line)=>sum+(scheme.quantityUnit==='VALUE'?Math.round(line.quantity*line.rate*100)/100:convertSchemeUnits(line.quantity,line.product,scheme.quantityUnit||'BILLING_UNIT')),0);
    const slab=[...(scheme.slabs||[{minimumQuantity:0,value:Number(scheme.discountPercent)}])].sort((a,b)=>b.minimumQuantity-a.minimumQuantity).find(s=>basis+0.0000001>=Number(s.minimumQuantity));
    if(!slab)continue;
    for(const line of matching){
      const gross=Math.round(line.quantity*line.rate*100),remaining=gross-Math.round(line.schemeDiscount*100);
      let benefit;
      if(scheme.type==='PERCENT'||!scheme.type)benefit={schemeDiscount:Math.round(remaining*Number(slab.value)/100)/100,freeQuantity:0};
      else {
        const benefitScheme={...scheme,quantityUnit:'BILLING_UNIT',slabs:[{minimumQuantity:0,value:slab.value}],repeatBenefit:false};
        benefit=evaluateScheme(benefitScheme,line.product,line.quantity,line.rate);
        if(scheme.repeatBenefit&&scheme.type.startsWith('FREE_'))benefit.freeQuantity*=Math.floor((basis+0.0000001)/Number(slab.minimumQuantity));
      }
      const amount=Math.min(remaining,Math.round(benefit.schemeDiscount*100))/100;
      line.schemeDiscount=Math.round((line.schemeDiscount+amount)*100)/100;
      line.freeQuantity+=benefit.freeQuantity;
      if(amount||benefit.freeQuantity)line.appliedSchemes.push({id:scheme.id,code:scheme.code||'',name:scheme.name,type:scheme.type||'PERCENT',value:Number(slab.value),discount:amount,freeQuantity:benefit.freeQuantity});
    }
  }
  return result;
}
