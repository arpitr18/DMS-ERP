import PDFDocument from "pdfkit";

const inr = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

export function streamInvoicePdf(invoice, res) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const fileName = `${invoice.invoiceNumber}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  doc.pipe(res);

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(invoice.businessNameSnapshot || "Distribution Management", {
      align: "center",
    });
  doc
    .moveDown(0.25)
    .fontSize(9)
    .font("Helvetica")
    .text(invoice.businessAddressSnapshot || "", { align: "center" });
  if (invoice.businessGstinSnapshot)
    doc.text(`GSTIN: ${invoice.businessGstinSnapshot}`, { align: "center" });
  if (invoice.businessPhoneSnapshot)
    doc.text(`Phone: ${invoice.businessPhoneSnapshot}`, { align: "center" });
  doc
    .moveDown()
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("TAX INVOICE", { align: "center" });
  doc.moveDown();

  const y = doc.y;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`Invoice: ${invoice.invoiceNumber}`, 40, y);
  doc
    .font("Helvetica")
    .text(
      `Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}`,
      360,
      y,
      { align: "right", width: 190 },
    );
  doc.moveDown(1.2);

  doc.font("Helvetica-Bold").text("Bill To");
  doc.font("Helvetica").text(invoice.retailerNameSnapshot);
  if (invoice.retailerAddressSnapshot)
    doc.text(invoice.retailerAddressSnapshot);
  if (invoice.retailerGstinSnapshot)
    doc.text(`GSTIN: ${invoice.retailerGstinSnapshot}`);
  if (invoice.retailerStateSnapshot)
    doc.text(`State: ${invoice.retailerStateSnapshot}`);
  doc.moveDown();

  const cols = [40, 78, 260, 310, 365, 420, 485];
  const widths = [38, 182, 50, 55, 55, 65];
  const tableTop = doc.y;
  doc.rect(40, tableTop - 4, 510, 22).fill("#f1f5f9");
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(8);
  ["Code", "Product", "Qty", "Rate", "GST%", "Amount"].forEach((h, i) =>
    doc.text(h, cols[i], tableTop + 2, { width: widths[i] }),
  );
  doc.y = tableTop + 24;

  doc.font("Helvetica").fontSize(8);
  for (const item of invoice.items) {
    if (doc.y > 720) {
      doc.addPage();
      doc.y = 50;
    }
    const rowY = doc.y;
    doc.text(item.productCodeSnapshot, cols[0], rowY, { width: widths[0] });
    doc.text(item.productNameSnapshot, cols[1], rowY, { width: widths[1] });
    doc.text(Number(item.quantity).toFixed(2), cols[2], rowY, {
      width: widths[2],
    });
    doc.text(inr(item.rate), cols[3], rowY, { width: widths[3] });
    doc.text(Number(item.gstRate).toFixed(2), cols[4], rowY, {
      width: widths[4],
    });
    doc.text(inr(item.lineTotal), cols[5], rowY, {
      width: widths[5],
      align: "right",
    });
    doc.moveDown(1.4);
    doc
      .moveTo(40, doc.y - 3)
      .lineTo(550, doc.y - 3)
      .strokeColor("#e5e7eb")
      .stroke();
  }

  doc.moveDown();
  const totalsX = 340;
  const valueX = 460;
  const totalLine = (label, value, bold = false) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 10 : 9)
      .text(label, totalsX, doc.y, { width: 115 });
    doc.text(inr(value), valueX, doc.y - (bold ? 12 : 10), {
      width: 90,
      align: "right",
    });
    doc.moveDown(0.35);
  };
  totalLine("Taxable", invoice.taxableAmount);
  if (Number(invoice.cgst)) totalLine("CGST", invoice.cgst);
  if (Number(invoice.sgst)) totalLine("SGST", invoice.sgst);
  if (Number(invoice.igst)) totalLine("IGST", invoice.igst);
  if (Number(invoice.roundOff)) totalLine("Round off", invoice.roundOff);
  totalLine("Grand Total", invoice.grandTotal, true);
  totalLine("Received", invoice.amountReceived);
  totalLine("Balance Due", invoice.balanceDue, true);

  doc
    .moveDown(1.5)
    .fontSize(8)
    .font("Helvetica")
    .text("This invoice was generated electronically from saved billing data.");
  doc.end();
}
