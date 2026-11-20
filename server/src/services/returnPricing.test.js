import test from 'node:test';
import assert from 'node:assert/strict';
import {returnCredit} from './returnPricing.js';
test('returns refund net invoiced amount, preserving paise across partial returns',()=>{
  assert.equal(returnCredit(38,10,0,3),11.4);
  const a=returnCredit(10,3,0,1),b=returnCredit(10,3,1,1),c=returnCredit(10,3,2,1);
  assert.equal(Math.round((a+b+c)*100),1000);
});
test('return quantities cannot exceed remaining purchased quantity',()=>{
  assert.throws(()=>returnCredit(45.6,12,0,16),/exceeds/);
  assert.equal(returnCredit(45.6,12,0,12),45.6);
  assert.throws(()=>returnCredit(45.6,12,5,8),/exceeds/);
  assert.throws(()=>returnCredit(38,10,9,2),/exceeds/);
  assert.throws(()=>returnCredit(38,10,0,0),/exceeds/);
});
