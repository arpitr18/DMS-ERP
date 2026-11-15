import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesScheme,applyStackedSchemes} from './stackedSchemes.js';

const product={id:'snack',brand:'Haldiram',unit:'PCS'};
const retailer={id:'shop',channel:'Retail',subchannel:'Grocery',beatId:'beat'};

test('each combination requires all selected conditions, ignoring unchecked conditions',()=>{
  const conditions=[{productId:'snack'},{brand:'Haldiram'},{channel:'Retail',subchannel:'Grocery'}];
  for(let mask=1;mask<8;mask++){
    const scheme={targetType:'COMBINED',...Object.assign({},...conditions.filter((_,i)=>mask&(1<<i)))};
    assert.equal(matchesScheme(scheme,product,retailer),true,`combination ${mask}`);
    assert.equal(matchesScheme(scheme,{...product,id:'other'},retailer),!(mask&1));
    assert.equal(matchesScheme(scheme,{...product,brand:'Cadbury'},retailer),!(mask&2));
    assert.equal(matchesScheme(scheme,product,{...retailer,channel:'Wholesale'}),!(mask&4));
    assert.equal(matchesScheme(scheme,product,{...retailer,subchannel:'Bakery'}),!(mask&4));
  }
});

test('all-products scope and legacy scopes still match',()=>{
  assert.equal(matchesScheme({targetType:'ALL'},product,{}),true);
  assert.equal(matchesScheme({targetType:'PRODUCT',productId:'snack'},product,retailer),true);
  assert.equal(matchesScheme({targetType:'BRAND',brand:'haldiram'},product,retailer),true);
  assert.equal(matchesScheme({targetType:'CHANNEL',channel:'Retail'},product,retailer),true);
});

test('custom outlet and beat schemes can be restricted to a named product',()=>{
  for(const targetType of ['OUTLET','BEAT']){
    const scheme={targetType,retailerId:'shop',beatId:'beat',productId:'snack'};
    assert.equal(matchesScheme(scheme,product,retailer),true);
    assert.equal(matchesScheme(scheme,{...product,id:'other'},retailer),false);
    assert.equal(matchesScheme({...scheme,productId:null},{...product,id:'other'},retailer),true);
    assert.equal(matchesScheme(scheme,product,{...retailer,id:'different',beatId:'different'}),false);
  }
});

test('combined value thresholds exclude nonmatching products and custom discounts stack last',()=>{
  const lines=[{product,quantity:1,rate:100},{product:{...product,id:'other',brand:'Cadbury'},quantity:1,rate:1000}];
  const combined={id:'general',code:'S1126-0001',targetType:'COMBINED',brand:'Haldiram',channel:'Retail',type:'PERCENT',quantityUnit:'VALUE',slabs:[{minimumQuantity:101,value:10}]};
  assert.deepEqual(applyStackedSchemes(lines,[combined],retailer).map(l=>l.schemeDiscount),[0,0]);
  combined.slabs[0].minimumQuantity=100;
  const custom={id:'custom',code:'S1126-0000',targetType:'OUTLET',retailerId:'shop',type:'PERCENT',quantityUnit:'VALUE',slabs:[{minimumQuantity:0,value:2}]};
  const result=applyStackedSchemes(lines,[custom,combined],retailer);
  assert.deepEqual(result.map(l=>l.schemeDiscount),[11.8,20]);
  assert.deepEqual(result[0].appliedSchemes.map(s=>s.id),['general','custom']);
});
