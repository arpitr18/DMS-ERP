import PDFDocument from 'pdfkit';

const amount = value => Number(value || 0).toFixed(2);

export function streamInvoicePdf(invoice, res) {
  const doc = new PDFDocument({size:'A4', margin:38});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="'+invoice.invoiceNumber+'.pdf"');
  doc.pipe(res);
  const gst = invoice.billType !== 'RETAIL';
  const text=(value,x,y,width,size=9,bold=false,align='left')=>{
    doc.fillColor('#111111').font(bold?'Helvetica-Bold':'Helvetica').fontSize(size)
      .text(String(value||''),x,y,{width,align});
  };
  const box=(x,y,w,h,fill=false)=>{
    doc.lineWidth(0.5).strokeColor('#777777');
    if(fill) doc.rect(x,y,w,h).fillAndStroke('#dddddd','#777777');
    else doc.rect(x,y,w,h).stroke();
  };
  const header=()=>{
    text(invoice.businessNameSnapshot,40,43,275,16,true);
    text([invoice.businessAddressSnapshot,invoice.businessStateSnapshot,invoice.businessPhoneSnapshot?'Phone: '+invoice.businessPhoneSnapshot:'',invoice.businessGstinSnapshot?'GSTIN: '+invoice.businessGstinSnapshot:''].filter(Boolean).join('\n'),40,70,265);
    text(gst?'TAX INVOICE':'RETAIL INVOICE',320,42,235,23,true,'right');
    const rows=[['INVOICE #','DATE'],[invoice.invoiceNumber,new Date(invoice.invoiceDate).toLocaleDateString('en-IN')],['CUSTOMER ID','TERMS'],[invoice.retailerCodeSnapshot,invoice.paymentMode]];
    rows.forEach((row,i)=>row.forEach((v,j)=>{box(325+j*115,103+i*22,115,22,i%2===0);text(v,329+j*115,110+i*22,107,8,i%2===0,'center');}));
    for(const [x,title] of [[40,'BILL TO'],[325,'SHIP TO']]) {
      box(x,216,230,20,true);text(title,x+5,222,220,9,true);
      text([invoice.retailerNameSnapshot,invoice.retailerAddressSnapshot,invoice.retailerStateSnapshot,gst&&invoice.retailerGstinSnapshot?'GSTIN: '+invoice.retailerGstinSnapshot:''].filter(Boolean).join('\n'),x+3,243,224);
    }
  };
  const columns=[40,340,385,470,555];
  const tableHeader=y=>{
    ['DESCRIPTION','QTY','UNIT PRICE','AMOUNT'].forEach((label,i)=>{box(columns[i],y,columns[i+1]-columns[i],22,true);text(label,columns[i]+4,y+7,columns[i+1]-columns[i]-8,8,true,i?'right':'left');});
  };
  header(); let top=345; tableHeader(top); let y=top+22;
  const bottom=650;
  const closeTable=()=>{columns.forEach(x=>doc.moveTo(x,top+22).lineTo(x,bottom).stroke());doc.moveTo(40,bottom).lineTo(555,bottom).stroke();};
  for(const item of invoice.items) {
    const description=item.productNameSnapshot+(gst?' (GST '+Number(item.gstRate)+'%)':'');
    doc.font('Helvetica').fontSize(9);
    const height=Math.max(24,doc.heightOfString(description,{width:290})+10);
    if(y+height>bottom) {closeTable();text('Continued on next page',40,670,515,9,false,'right');doc.addPage();text(invoice.invoiceNumber+' - continued',40,40,515,11,true);top=70;tableHeader(top);y=top+22;}
    text(description,45,y+6,290);
    text(Number(item.quantity),344,y+6,37,9,false,'right');
    text(amount(item.rate),389,y+6,77,9,false,'right');
    text(amount(item.lineTotal),474,y+6,77,9,false,'right');
    y+=height;
  }
  closeTable();
  box(40,650,300,26);text('Thank you for your business!',45,659,290,9,false,'center');
  box(340,650,215,26);text('TOTAL',345,659,85,10,true);text(amount(invoice.grandTotal),435,659,115,10,true,'right');
  let ty=686;
  const totals=[['Taxable value',invoice.taxableAmount],['GST included',Number(invoice.cgst||0)+Number(invoice.sgst||0)+Number(invoice.igst||0)],['Discount',invoice.discount],['Round off',invoice.roundOff],['Received',invoice.amountReceived],['Balance due',invoice.balanceDue]];
  totals.forEach(([label,value])=>{text(label,340,ty,125,8);text(amount(value),470,ty,80,8,false,'right');ty+=13;});
  text('Amounts in INR. Unit prices include GST.',40,691,290,8);
  if(invoice.notes) text(invoice.notes,40,710,275,8);
  doc.end();
}
