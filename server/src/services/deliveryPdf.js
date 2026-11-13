import PDFDocument from 'pdfkit';

export async function deliveryPdf(plan,kind) {
  const snapshot=plan.snapshot;
  const doc=new PDFDocument({size:'A4',margin:36});
  const chunks=[];
  const done=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  // Prepare every row before writing so the party summary can remain one readable page.
  const columns=kind==='party'?[220,200,100]:[195,65,65,85,110];
  const headers=kind==='party'?['Party','Invoice number','Bill value (INR)']:['Product','Qty / unit','Pieces','Weight (kg)','Value (INR)'];
  const money=value=>Number(value).toFixed(2);
  const rows=kind==='party'?snapshot.bills.map(b=>[b.party,b.invoiceNumber,money(b.total)]):snapshot.products.map(p=>[`${p.name} (${p.code})`,`${p.quantity} ${p.unit}`,p.pieces==null?'Unknown':String(p.pieces),p.weightKg==null?'Unknown':Number(p.weightKg).toFixed(3),money(p.value)]);
  doc.font('Helvetica').fontSize(9);
  const heights=rows.map(row=>Math.max(24,...row.map((text,i)=>doc.heightOfString(text,{width:columns[i]-10})+12)));
  if(kind==='party'&&heights.reduce((a,b)=>a+b,0)>565){doc.end();await done;throw Object.assign(new Error('Party summary exceeds one readable page. Split this delivery into smaller plans.'),{status:400});}
  function heading(){doc.font('Helvetica-Bold').fontSize(17).text(kind==='party'?'Delivery Party Summary':'Delivery Product Summary');doc.moveDown(0.5).font('Helvetica').fontSize(9).text(`Plan ${plan.id.slice(0,8)} | ${new Date(plan.scheduledDate).toLocaleDateString('en-GB')} | ${plan.status}`).text(`Vehicle ${snapshot.vehicle.name ? snapshot.vehicle.name+' / ' : ''}${snapshot.vehicle.number} | Driver ${snapshot.vehicle.driverName} | ${snapshot.vehicle.phone||''}`);doc.moveDown();}
  function row(cells,height,bold=false){const y=doc.y;let x=36;doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(9);cells.forEach((cell,i)=>{doc.text(cell,x+4,y+5,{width:columns[i]-10});x+=columns[i];});doc.strokeColor('#cbd5e1').moveTo(36,y+height).lineTo(556,y+height).stroke();doc.x=36;doc.y=y+height;}
  heading();row(headers,26,true);
  rows.forEach((cells,i)=>{if(doc.y+heights[i]>740){doc.addPage();heading();row(headers,26,true);}row(cells,heights[i]);});
  doc.moveDown().font('Helvetica-Bold').text(`Total bill value (INR) ${money(snapshot.total)}`);
  if(kind==='product'){doc.font('Helvetica').fontSize(8).text('Quantities and packing weights are snapshotted when the plan is created. Unknown weights require product packing setup.').text(`Product line value (INR) ${money(snapshot.products.reduce((sum,p)=>sum+p.value,0))}. Bill rounding/adjustments may differ from product line totals.`);}
  doc.end();return done;
}
