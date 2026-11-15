export const schemeTypes = ['PERCENT','PER_PIECE','PER_BOX','FREE_PIECE','FREE_BOX'];
export const schemeTypeLabels = {PERCENT:'Percentage discount',PER_PIECE:'INR off per piece',PER_BOX:'INR off per box',FREE_PIECE:'Free pieces',FREE_BOX:'Free boxes'};
export function convertSchemeUnits(quantity,product,target) {
  if(target==='BILLING_UNIT')return quantity;
  const unit=product.unit||'PCS',packing=Number(product.unitsPerCarton||0);
  let pieces;
  if(unit==='PCS')pieces=quantity;
  else if(['BOX','CASE','CARTON'].includes(unit)&&packing>0)pieces=quantity*packing;
  else throw new Error('Configure piece/case packing before using this scheme.');
  if(target==='PIECE')return pieces;
  if(!packing)throw new Error('Pieces per case must be configured for box schemes.');
  return pieces/packing;
}
export function freeQuantityInBillingUnits(value,product,type) {
  const unit=product.unit||'PCS',packing=Number(product.unitsPerCarton||0);
  const result=type==='FREE_PIECE'?(unit==='PCS'?value:['BOX','CASE','CARTON'].includes(unit)&&packing>0?value/packing:NaN):(unit==='PCS'&&packing>0?value*packing:['BOX','CASE','CARTON'].includes(unit)?value:NaN);
  if(!Number.isFinite(result)||Math.abs(result*1000-Math.round(result*1000))>0.000001)throw new Error('Free quantity cannot be represented in this stock unit. Choose a compatible bonus quantity or use a piece-based product.');
  return Math.round(result*1000)/1000;
}
export function evaluateScheme(scheme,product,quantity,rate) {
  const none={schemePercent:0,schemeDiscount:0,freeQuantity:0,benefitLabel:''};
  if(!scheme||quantity<=0)return none;
  const type=scheme.type||'PERCENT',basis=convertSchemeUnits(quantity,product,scheme.quantityUnit||'BILLING_UNIT');
  const slabs=scheme.slabs||[{minimumQuantity:0,value:Number(scheme.discountPercent)}];
  const slab=[...slabs].sort((a,b)=>b.minimumQuantity-a.minimumQuantity).find(s=>basis+0.0000001>=Number(s.minimumQuantity));
  if(!slab)return {...none,benefitLabel:'Minimum quantity not reached'};
  const value=Number(slab.value),gross=Math.round(quantity*rate*100);
  let deduction=0,freeQuantity=0;
  if(type==='PERCENT')deduction=Math.round(gross*value/100);
  if(type==='PER_PIECE')deduction=Math.round(convertSchemeUnits(quantity,product,'PIECE')*value*100);
  if(type==='PER_BOX')deduction=Math.round(Math.floor(convertSchemeUnits(quantity,product,'BOX')+0.0000001)*value*100);
  if(type.startsWith('FREE_'))freeQuantity=freeQuantityInBillingUnits(value*(scheme.repeatBenefit?Math.floor((basis+0.0000001)/Number(slab.minimumQuantity)):1),product,type);
  return {schemePercent:type==='PERCENT'?value:0,schemeDiscount:Math.min(gross,deduction)/100,freeQuantity,benefitLabel:type==='PERCENT'?value+'% off':type==='PER_PIECE'?'INR '+value+' off / piece':type==='PER_BOX'?'INR '+value+' off / complete box':freeQuantity+' '+(product.unit||'PCS')+' free'};
}
