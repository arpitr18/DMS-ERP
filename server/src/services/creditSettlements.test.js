import test from 'node:test';
import assert from 'node:assert/strict';
import {creditSettlementHistory} from './creditSettlements.js';
const credits=[{id:'a',amount:10,createdAt:'2026-11-16'},{id:'b',amount:46.5,createdAt:'2026-11-20'}];
test('legacy usage matches only credits existing at bill creation',()=>{
 const rows=creditSettlementHistory(credits,[{id:'bill',invoiceNumber:'INV1',creditApplied:10,createdAt:'2026-11-17'}]);
 assert.equal(rows[0].status,'SETTLED');assert.equal(rows[0].settlements[0].invoiceNumber,'INV1');assert.equal(rows[0].settlements[0].inferred,true);
 assert.equal(rows[1].status,'UNSETTLED');assert.equal(rows[1].remainingAmount,46.5);
});
test('explicit allocations support partial use across invoices',()=>{
 const rows=creditSettlementHistory(credits,[{id:'bill',invoiceNumber:'INV1',creditApplied:4,createdAt:'2026-11-17',creditAllocations:[{creditId:'a',amount:4}]}]);
 assert.equal(rows[0].status,'PARTIAL');assert.equal(rows[0].remainingAmount,6);assert.equal(rows[0].settlements[0].inferred,false);
});
test('an explicit empty allocation does not consume notes when advance credit was used',()=>{
 assert.equal(creditSettlementHistory(credits,[{id:'bill',creditApplied:100,createdAt:'2026-11-21',creditAllocations:[]}])[0].status,'UNSETTLED');
});
