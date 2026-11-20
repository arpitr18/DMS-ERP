export function returnCredit(lineTotal, soldQuantity, returnedQuantity, quantity) {
  if(quantity<=0||returnedQuantity+quantity>soldQuantity+0.0000001)throw Object.assign(new Error('Return quantity exceeds the remaining invoiced quantity.'),{status:400});
  return (Math.round(Number(lineTotal)*100*(returnedQuantity+quantity)/soldQuantity)-Math.round(Number(lineTotal)*100*returnedQuantity/soldQuantity))/100;
}
