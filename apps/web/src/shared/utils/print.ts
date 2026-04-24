import { format } from 'date-fns';
import type { BillWithPatient, Organization } from '@mmc/types';

export interface PrintOptions {
  template?: 'standard' | 'pharmacy' | 'package' | 'comprehensive';
  showLetterhead?: boolean;
}

export const printBill = (bill: BillWithPatient, org: Organization, options: PrintOptions = {}) => {
  const { template = 'standard', showLetterhead = true } = options;
  const balance = bill.balance || 0;
  const isPaid = balance <= 0;

  const templateLabel = {
    standard: 'Standard Transaction Receipt',
    pharmacy: 'Pharmacy / Medicinal Bill',
    package: 'Clinical Program / Package',
    comprehensive: 'Statement of Account'
  }[template];

  let bodyRows = '';
  if (template === 'standard') {
    bodyRows = `
      <tr><td class="label">Consultation Charges:</td><td class="right amount">₹${bill.charges.toLocaleString()}</td></tr>
      <tr><td class="label">Received:</td><td class="right amount">₹${bill.received.toLocaleString()}</td></tr>`;
  } else if (template === 'pharmacy') {
    bodyRows = `
      <tr><td class="label">Medicines Charges:</td><td class="right amount">₹${bill.charges.toLocaleString()}</td></tr>
      <tr><td class="label">Received:</td><td class="right amount">₹${bill.received.toLocaleString()}</td></tr>`;
  } else if (template === 'package') {
    bodyRows = `
      <tr><td class="label">Package Charges:</td><td class="right amount">₹${bill.charges.toLocaleString()}</td></tr>
      <tr><td class="label">Period:</td><td class="right">${bill.fromDate ? format(new Date(bill.fromDate), 'dd-MM-yyyy') : ''} → ${bill.toDate ? format(new Date(bill.toDate), 'dd-MM-yyyy') : ''}</td></tr>
      <tr><td class="label">Received:</td><td class="right amount">₹${bill.received.toLocaleString()}</td></tr>`;
  } else {
    bodyRows = `
      <tr><td class="label">Total Charges:</td><td class="right amount">₹${bill.charges.toLocaleString()}</td></tr>
      <tr><td class="label">Amount Received:</td><td class="right amount">₹${bill.received.toLocaleString()}</td></tr>
      <tr><td class="label amount" style="color:${balance > 0 ? '#ef4444' : '#10b981'}">Balance Due:</td>
          <td class="right amount" style="color:${balance > 0 ? '#ef4444' : '#10b981'}">₹${balance.toLocaleString()}</td></tr>`;
  }

  const html = `
    <html>
      <head>
        <title>Invoice #${bill.billNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; font-family: 'Inter', sans-serif; }
          body { padding: 40px; color: #1e293b; line-height: 1.5; }
          .container { max-width: 800px; margin: auto; }
          
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; }
          .clinic-info { flex: 1; }
          .clinic-name { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
          .clinic-tagline { font-size: 14px; color: #3b82f6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
          .clinic-details { font-size: 12px; color: #64748b; font-weight: 500; }
          .logo { width: 80px; height: 80px; border-radius: 12px; object-fit: contain; }
          
          .bill-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .meta-box h4 { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
          .meta-value { font-size: 14px; font-weight: 700; color: #1e293b; }
          
          .invoice-label-wrap { text-align: center; margin-bottom: 30px; }
          .invoice-label { display: inline-block; padding: 6px 16px; background: #0f172a; color: #fff; border-radius: 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          td { padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
          .label { font-size: 13px; font-weight: 600; color: #64748b; }
          .right { text-align: right; font-weight: 700; color: #0f172a; }
          .amount { font-size: 18px; font-weight: 800; }
          
          .footer { margin-top: 60px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          .footer-text { font-size: 11px; color: #94a3b8; font-weight: 600; }
          
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 13px;">Confirm Print</button>
          </div>

          <div class="header">
            <div class="clinic-info">
              <h1 class="clinic-name">${org.name}</h1>
              <p class="clinic-tagline">${org.tagLine || 'Healthcare Excellence'}</p>
              <div class="clinic-details">
                ${org.address} ${org.address2 ? `<br>${org.address2}` : ''}<br>
                ${org.phone ? `Phone: ${org.phone}` : ''} ${org.email ? ` | Email: ${org.email}` : ''}<br>
                ${org.registration ? `Reg No: ${org.registration}` : ''}
                ${org.timing ? `<br>Hours: ${org.timing}` : ''}
              </div>
            </div>
            ${org.logo ? `<img src="${org.logo}" class="logo" />` : ''}
          </div>

          <div class="invoice-label-wrap">
            <span class="invoice-label">${templateLabel}</span>
          </div>

          <div class="bill-meta">
            <div class="meta-box">
              <h4>Invoice Identification</h4>
              <p class="meta-value">INV-${bill.billNo}</p>
              <p class="meta-value" style="font-size: 12px; margin-top: 4px;">Date: ${bill.billDate ? format(new Date(bill.billDate), 'PPPP') : 'N/A'}</p>
            </div>
            <div class="meta-box">
              <h4>Patient Nomenclature</h4>
              <p class="meta-value">${bill.patientName}</p>
              <p class="meta-value" style="font-size: 12px; margin-top: 4px;">Reg ID: #${bill.regid} | ${bill.phone || 'N/A'}</p>
            </div>
          </div>

          <table>
            ${bodyRows}
            <tr>
              <td class="label">Settlement Mode:</td>
              <td class="right">${bill.paymentMode || 'Cash'}</td>
            </tr>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 20px; borderRadius: 16px;">
             <div>
                <h4 style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Payment Status</h4>
                <p style="font-size: 14px; font-weight: 800; color: ${isPaid ? '#16a34a' : '#ef4444'}">${isPaid ? 'NOMINALLY SETTLED' : 'PARTIAL SETTLEMENT'}</p>
             </div>
             <div style="text-align: right;">
                <h4 style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Total Received</h4>
                <p style="font-size: 24px; font-weight: 800; color: #0f172a;">₹${bill.received.toLocaleString()}</p>
             </div>
          </div>

          <div class="footer">
            <p class="footer-text">This is a computer-generated invoice. No signature required.</p>
            <p class="footer-text" style="margin-top: 4px;">Thank you for choosing ${org.name}</p>
          </div>
        </div>
        <script>
          // Auto print if not in preview mode?
          // window.print();
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

export const printPrescription = (caseData: any, org: Organization) => {
  const html = `
    <html>
      <head>
        <title>Prescription - ${caseData.patientName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; font-family: 'Inter', sans-serif; }
          body { padding: 40px; color: #1e293b; line-height: 1.6; }
          .container { max-width: 800px; margin: auto; }
          
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; }
          .clinic-info { flex: 1; }
          .clinic-name { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
          .clinic-tagline { font-size: 14px; color: #3b82f6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
          .clinic-details { font-size: 12px; color: #64748b; font-weight: 500; }
          .logo { width: 80px; height: 80px; border-radius: 12px; object-fit: contain; }
          
          .patient-bar { background: #f8fafc; padding: 20px; border-radius: 16px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 20px; margin-bottom: 40px; border: 1px solid #f1f5f9; }
          .p-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
          .p-value { font-size: 14px; font-weight: 700; color: #1e293b; }
          
          .rx-symbol { font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 20px; font-style: italic; }
          .content-section { margin-bottom: 30px; }
          .section-title { font-size: 12px; font-weight: 800; color: #3b82f6; text-transform: uppercase; margin-bottom: 12px; border-left: 3px solid #3b82f6; padding-left: 10px; }
          .section-body { font-size: 14px; color: #334155; white-space: pre-wrap; padding-left: 13px; }
          
          .footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #f1f5f9; padding-top: 40px; }
          .signature-box { text-align: center; }
          .sig-line { width: 180px; border-top: 1px solid #cbd5e1; margin-bottom: 8px; }
          .sig-label { font-size: 11px; font-weight: 700; color: #64748b; }
          
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 800;">Print Clinical Record</button>
          </div>

          <div class="header">
            <div class="clinic-info">
              <h1 class="clinic-name">${org.name}</h1>
              <p class="clinic-tagline">${org.tagLine || 'Advanced Clinical Care'}</p>
              <div class="clinic-details">
                ${org.address} ${org.address2 ? `<br>${org.address2}` : ''}<br>
                ${org.phone ? `Phone: ${org.phone}` : ''} | Reg: ${org.registration || 'N/A'}
              </div>
            </div>
            ${org.logo ? `<img src="${org.logo}" class="logo" />` : ''}
          </div>

          <div class="patient-bar">
            <div>
              <p class="p-label">Patient Name</p>
              <p class="p-value">${caseData.patientName}</p>
            </div>
            <div>
              <p class="p-label">Patient ID</p>
              <p class="p-value">#${caseData.regid}</p>
            </div>
            <div style="text-align: right;">
              <p class="p-label">Date</p>
              <p class="p-value">${format(new Date(), 'dd MMM yyyy')}</p>
            </div>
          </div>

          <div class="rx-symbol">Rx</div>

          <div class="content-section">
            <h2 class="section-title">Clinical Presentation & Vitals</h2>
            <div class="section-body">${caseData.vitals || 'No vitals recorded.'}</div>
          </div>

          <div class="content-section">
            <h2 class="section-title">Diagnosis & Observations</h2>
            <div class="section-body">${caseData.diagnosis || 'Clinical evaluation in progress.'}</div>
          </div>

          <div class="content-section">
            <h2 class="section-title">Therapeutic Plan / Prescription</h2>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; font-size: 15px; font-weight: 600; min-height: 150px;">
              ${caseData.prescription || 'Await pharmacist instructions.'}
            </div>
          </div>

          <div class="footer">
            <div style="font-size: 10px; color: #94a3b8; font-weight: 600;">
              Electronically generated by HomeoX Clinical Systems<br>
              ${org.website || ''}
            </div>
            <div class="signature-box">
              <div class="sig-line"></div>
              <p class="sig-label">Authorized Signature / Stamp</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

