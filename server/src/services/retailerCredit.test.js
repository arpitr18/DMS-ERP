import test from 'node:test';
import assert from 'node:assert/strict';
import {availableRetailerCredit} from './retailerCredit.js';

test('opening credit, advances and refund credits form the available credit pool',()=>{
  assert.equal(availableRetailerCredit(-100,200,50,[]),350);
  assert.equal(availableRetailerCredit(100,200,50,[]),250);
});

test('declining credit preserves it for a later bill',()=>{
  assert.equal(availableRetailerCredit(0,500,0,[{grandTotal:2000,creditApplied:0,payments:[]}]),500);
});

test('partial settlement consumes only the applied amount and cannot be reused',()=>{
  const bills=[{grandTotal:300,creditApplied:300,payments:[]}];
  assert.equal(availableRetailerCredit(0,500,0,bills),200);
  bills.push({grandTotal:1000,creditApplied:200,payments:[]});
  assert.equal(availableRetailerCredit(0,500,0,bills),0);
});

test('invoice payments are not reusable, but their genuine overpayments are',()=>{
  assert.equal(availableRetailerCredit(0,0,0,[{grandTotal:100,creditApplied:0,payments:[{amount:150}]}]),50);
  assert.equal(availableRetailerCredit(0,0,0,[{grandTotal:100,creditApplied:0,payments:[{amount:100}]}]),0);
});

test('later collections preserve the credit already settled against the invoice',()=>{
  assert.equal(availableRetailerCredit(0,100,0,[{grandTotal:200,creditApplied:100,payments:[{amount:100}]}]),0);
});
