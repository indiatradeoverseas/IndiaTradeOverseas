/**
 * PDF / Print Tax Invoice Generator with 5% GST calculation for India Trade Overseas
 */
export function generateInvoicePDF(orderData) {
  const {
    invoiceNo = `INV-${Date.now().toString().slice(-6)}`,
    date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    customerName = 'Valued Customer',
    customerEmail = 'customer@example.com',
    city = 'New Delhi',
    state = 'Delhi',
    productName = 'Tea / Commercial Sourcing',
    grade = 'Standard Grade',
    quantity = 200,
    quantityUnit = 'Kg',
    unitPrice = 200,
    subtotal = 0,
    gstAmount = 0,
    totalAmount = 0,
    paymentMode = 'ONLINE', // 'ONLINE' or 'COD'
    paymentStatus = '',
    paymentId = `PAY-${Date.now().toString().slice(-8)}`
  } = orderData;

  const calcSubtotal = subtotal || (quantity * unitPrice);
  const calcGst = gstAmount || Math.round(calcSubtotal * 0.05);
  const calcTotal = totalAmount || (calcSubtotal + calcGst);

  const isCod = paymentMode === 'COD';
  const badgeStyle = isCod 
    ? 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;'
    : 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;';
  const badgeText = isCod ? '📦 CASH ON DELIVERY (PENDING)' : '✔ ONLINE PAID & CONFIRMED';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${invoiceNo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #1e293b; padding: 30px; font-size: 13px; line-height: 1.5; }
        .invoice-card { max-width: 750px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 35px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #004b3b; padding-bottom: 20px; margin-bottom: 25px; }
        .company-name { font-size: 24px; font-weight: 900; color: #004b3b; letter-spacing: 0.5px; text-transform: uppercase; }
        .company-tag { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 3px; }
        .status-badge { ${badgeStyle} padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
        .box-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .box-content strong { color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th { background: #004b3b; color: #ffffff; text-align: left; padding: 12px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        td { padding: 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .summary-container { display: flex; justify-content: flex-end; margin-bottom: 30px; }
        .summary-box { width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
        .summary-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; font-size: 13px; }
        .summary-row.gst-row { color: #2563eb; font-weight: 700; }
        .summary-row.total-row { border-top: 2px solid #004b3b; margin-top: 8px; padding-top: 10px; font-size: 15px; font-weight: 900; color: #004b3b; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px; }
        @media print {
          body { padding: 0; }
          .invoice-card { border: none; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="header">
          <div>
            <div class="company-name">INDIA TRADE OVERSEAS</div>
            <div class="company-tag">Official GST Tax Invoice & Sourcing Receipt</div>
          </div>
          <div class="status-badge">${badgeText}</div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="box-title">Customer Details</div>
            <div class="box-content">
              <div><strong>Name:</strong> ${customerName}</div>
              <div><strong>Email:</strong> ${customerEmail}</div>
              <div><strong>Location:</strong> ${city}${state ? `, ${state}` : ''}</div>
            </div>
          </div>
          <div class="info-box">
            <div class="box-title">Invoice Information</div>
            <div class="box-content">
              <div><strong>Invoice No:</strong> ${invoiceNo}</div>
              <div><strong>Date:</strong> ${date}</div>
              <div><strong>Payment Mode:</strong> ${isCod ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}</div>
              <div><strong>Status:</strong> ${paymentStatus || (isCod ? 'Pending Cash Collection' : 'Paid Online')}</div>
              <div><strong>Payment Ref:</strong> ${paymentId}</div>
              <div><strong>GSTIN:</strong> 19AAACI2938K1ZB</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item / Product Description</th>
              <th>Grade / Spec</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Base Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${productName}</strong></td>
              <td>${grade || 'Standard Grade'}</td>
              <td style="text-align: right;">${quantity.toLocaleString()} ${quantityUnit}</td>
              <td style="text-align: right;">₹${Number(unitPrice).toLocaleString()}</td>
              <td style="text-align: right;">₹${Number(calcSubtotal).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-container">
          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>₹${Number(calcSubtotal).toLocaleString()}</span>
            </div>
            <div class="summary-row gst-row">
              <span>GST (5%):</span>
              <span>₹${Number(calcGst).toLocaleString()}</span>
            </div>
            <div class="summary-row total-row">
              <span>Total Payable:</span>
              <span>₹${Number(calcTotal).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for placing your order with <strong>India Trade Overseas</strong>.</p>
          <p>This is an automated GST Tax Invoice generated for your commercial procurement.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Trigger HTML download file
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice_${invoiceNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Also open print window for instant PDF saving/printing
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  } catch (err) {
    console.warn('Pop-up blocked for print window, file downloaded instead.');
  }
}
