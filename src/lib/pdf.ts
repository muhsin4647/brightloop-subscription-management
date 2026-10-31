import { jsPDF } from 'jspdf';
import { Invoice, InvoiceLine } from '../types/index.ts';

export function generateInvoicePDF(invoice: Invoice, lines: InvoiceLine[], customerDetails?: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background bar
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company Brand
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('BRIGHTLOOP', 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subscription Billing & Revenue Automation', 15, 26);

  // Invoice Title on right
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 15, 22, { align: 'right' });

  // Invoice Details & Customer Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', 15, 48);

  doc.setFont('helvetica', 'normal');
  const custName = customerDetails?.name || invoice.customer_name || 'Customer';
  const custCompany = customerDetails?.company || invoice.customer_company || '';
  const custEmail = customerDetails?.email || invoice.customer_email || '';
  const custAddress = customerDetails?.billing_address || 'Registered Business Address';
  const custTax = customerDetails?.tax_id || invoice.customer_tax_id || '';

  doc.text(custName, 15, 55);
  if (custCompany) doc.text(custCompany, 15, 61);
  doc.text(custEmail, 15, 67);
  doc.text(custAddress, 15, 73, { maxWidth: 80 });
  if (custTax) doc.text(`GSTIN/Tax ID: ${custTax}`, 15, 81);

  // Meta box on right
  const rightX = pageWidth - 75;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', rightX, 48);
  doc.text('Invoice Date:', rightX, 55);
  doc.text('Due Date:', rightX, 62);
  doc.text('Status:', rightX, 69);
  if (invoice.subscription_number) {
    doc.text('Subscription:', rightX, 76);
  }

  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, pageWidth - 15, 48, { align: 'right' });
  doc.text(invoice.issue_date, pageWidth - 15, 55, { align: 'right' });
  doc.text(invoice.due_date, pageWidth - 15, 62, { align: 'right' });
  doc.text(invoice.status.toUpperCase(), pageWidth - 15, 69, { align: 'right' });
  if (invoice.subscription_number) {
    doc.text(invoice.subscription_number, pageWidth - 15, 76, { align: 'right' });
  }

  // Items Table Header
  const tableY = 95;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(15, tableY, pageWidth - 30, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Description', 18, tableY + 5.5);
  doc.text('Qty', 115, tableY + 5.5, { align: 'center' });
  doc.text('Unit Price', 138, tableY + 5.5, { align: 'right' });
  doc.text('Tax', 160, tableY + 5.5, { align: 'right' });
  doc.text('Total', pageWidth - 18, tableY + 5.5, { align: 'right' });

  // Items
  let curY = tableY + 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  for (const item of lines) {
    doc.text(item.description, 18, curY, { maxWidth: 90 });
    doc.text(String(item.quantity), 115, curY, { align: 'center' });
    doc.text(`INR ${item.unit_price.toFixed(2)}`, 138, curY, { align: 'right' });
    doc.text(`${item.tax_rate}%`, 160, curY, { align: 'right' });
    doc.text(`INR ${item.line_total.toFixed(2)}`, pageWidth - 18, curY, { align: 'right' });

    // underline row
    doc.setDrawColor(226, 232, 240);
    doc.line(15, curY + 4, pageWidth - 15, curY + 4);
    curY += 10;
  }

  // Summary Table
  const sumY = curY + 6;
  const sumLabelX = pageWidth - 80;
  const sumValX = pageWidth - 18;

  doc.setFontSize(9);
  doc.text('Subtotal:', sumLabelX, sumY);
  doc.text(`INR ${invoice.subtotal.toFixed(2)}`, sumValX, sumY, { align: 'right' });

  if (invoice.discount_amount > 0) {
    doc.text('Discounts:', sumLabelX, sumY + 6);
    doc.text(`- INR ${invoice.discount_amount.toFixed(2)}`, sumValX, sumY + 6, { align: 'right' });
  }

  doc.text('GST (18%):', sumLabelX, sumY + 12);
  doc.text(`INR ${invoice.tax_amount.toFixed(2)}`, sumValX, sumY + 12, { align: 'right' });

  doc.setLineWidth(0.5);
  doc.line(sumLabelX - 5, sumY + 16, pageWidth - 15, sumY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Grand Total:', sumLabelX, sumY + 22);
  doc.text(`INR ${invoice.total_amount.toFixed(2)}`, sumValX, sumY + 22, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('Amount Paid:', sumLabelX, sumY + 29);
  doc.text(`INR ${invoice.amount_paid.toFixed(2)}`, sumValX, sumY + 29, { align: 'right' });

  doc.setTextColor(185, 28, 28); // red-700
  doc.text('Outstanding Balance:', sumLabelX, sumY + 36);
  doc.text(`INR ${invoice.outstanding_amount.toFixed(2)}`, sumValX, sumY + 36, { align: 'right' });

  // Payment Instructions
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Remittance & Payment Instructions:', 15, sumY + 15);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Account Name: Brightloop Software Private Limited', 15, sumY + 22);
  doc.text('Bank: HDFC Bank Ltd, Cyber City Branch', 15, sumY + 27);
  doc.text('Account Number: 50200088991122 | IFSC: HDFC0001234', 15, sumY + 32);
  doc.text('UPI ID: billing@brightloop | Support: billing@brightloop.io', 15, sumY + 37);

  // Footer notes
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Thank you for your business. Computer generated invoice; no physical signature required under IT Act 2000.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 12,
    { align: 'center' }
  );

  doc.save(`${invoice.invoice_number}_Brightloop.pdf`);
}
