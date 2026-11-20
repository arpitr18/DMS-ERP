import test from 'node:test';
import assert from 'node:assert/strict';
import {excessPayment,settleGeneralPayments} from './paymentAllocations.js';
import {availableRetailerCredit} from './retailerCredit.js';
test('25000 settles 23510.57 of older bills, preserving only 1489.43 excess',async()=>{
 const bill={id:'old',grandTotal:23510.57,creditApplied:0,payments:[],createdAt:'2026-11-01'};
 const payment={id:'receipt',amount:25000,createdAt:'2026-11-20'};
 const tx={retailer:{findUnique:async()=>({openingOutstanding:0})},invoice:{findMany:async()=>[bill],update:async({data})=>Object.assign(bill,data)},payment:{findMany:async()=>[payment],update:async({data})=>Object.assign(payment,data)}};
 await settleGeneralPayments(tx,'retailer');
 assert.equal(bill.status,'PAID');assert.equal(bill.balanceDue,0);assert.equal(bill.generalPaymentApplied,23510.57);
 assert.equal(excessPayment(payment),1489.43);
 await settleGeneralPayments(tx,'retailer');assert.equal(excessPayment(payment),1489.43);
});
test('1300 credit applied to 1000 bill leaves 300',()=>{
 assert.equal(availableRetailerCredit(0,1300,0,[{grandTotal:1000,creditApplied:1000,payments:[]}]),300);
});
test('general payments settle positive opening dues before invoices',async()=>{
 const payment={id:'receipt',amount:200,createdAt:'2026-11-20'};
 const tx={retailer:{findUnique:async()=>({openingOutstanding:150})},invoice:{findMany:async()=>[]},payment:{findMany:async()=>[payment],update:async({data})=>Object.assign(payment,data)}};
 await settleGeneralPayments(tx,'retailer');assert.equal(excessPayment(payment),50);
});
