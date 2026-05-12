import { format } from 'date-fns';
import type { BillWithPatient, Organization } from '@mmc/types';

export interface PrintOptions {
  template?: 'standard' | 'pharmacy' | 'package' | 'comprehensive';
  showLetterhead?: boolean;
}

export const printBill = (bill: BillWithPatient, org: Organization, options: PrintOptions = {}) => {
  const effectiveTemplate = options.template ?? (
    bill.billType === 'Package'       ? 'package'       :
    bill.billType === 'Custom'        ? 'comprehensive' :
    'standard'
  );
  const { template = effectiveTemplate, showLetterhead = true } = { ...options, template: effectiveTemplate };
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
      <tr><td class="label amount" style="color:${balance > 0 ? 'var(--pp-danger-fg)' : '#10b981'}">Balance Due:</td>
          <td class="right amount" style="color:${balance > 0 ? 'var(--pp-danger-fg)' : '#10b981'}">₹${balance.toLocaleString()}</td></tr>`;
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
          .clinic-tagline { font-size: 14px; color: var(--pp-blue); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
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
            <button onclick="window.print()" style="padding: 10px 20px; background: var(--pp-blue); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 13px;">Confirm Print</button>
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
                <p style="font-size: 14px; font-weight: 800; color: ${isPaid ? 'var(--pp-success-fg)' : 'var(--pp-danger-fg)'}">${isPaid ? 'NOMINALLY SETTLED' : 'PARTIAL SETTLEMENT'}</p>
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
          .clinic-tagline { font-size: 14px; color: var(--pp-blue); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
          .clinic-details { font-size: 12px; color: #64748b; font-weight: 500; }
          .logo { width: 80px; height: 80px; border-radius: 12px; object-fit: contain; }
          
          .patient-bar { background: #f8fafc; padding: 20px; border-radius: 16px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 20px; margin-bottom: 40px; border: 1px solid #f1f5f9; }
          .p-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
          .p-value { font-size: 14px; font-weight: 700; color: #1e293b; }
          
          .rx-symbol { font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 20px; font-style: italic; }
          .content-section { margin-bottom: 30px; }
          .section-title { font-size: 12px; font-weight: 800; color: var(--pp-blue); text-transform: uppercase; margin-bottom: 12px; border-left: 3px solid var(--pp-blue); padding-left: 10px; }
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

export const printAppointmentSlip = (appointment: {
  patientName: string;
  phone: string;
  doctorName: string;
  bookingDate: string;
  bookingTime: string;
  consultationFee: string;
  visitType: string;
  tokenNo?: number;
  regid?: number;
  notes?: string;
}, org: {
  name: string;
  tagLine?: string;
  address?: string;
  address2?: string;
  phone?: string;
  email?: string;
  registration?: string;
  timing?: string;
  logo?: string;
  website?: string;
}) => {
  const formattedDate = appointment.bookingDate
    ? format(new Date(appointment.bookingDate + 'T00:00:00'), 'EEEE, dd MMMM yyyy')
    : 'N/A';

  const html = `
    <html>
      <head>
        <title>Appointment Slip - ${appointment.patientName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; font-family: 'Inter', sans-serif; }
          body { padding: 20px; color: #1e293b; line-height: 1.4; font-size: 13px; }
          .container { max-width: 100%; margin: auto; }

          .letterhead { position: relative; padding: 14px 4px 10px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
          .letterhead-band { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #2563EB 0%, #60A5FA 70%, #BFDBFE 100%); border-radius: 0 0 2px 2px; }
          .letterhead-row { display: flex; align-items: center; gap: 14px; padding-top: 14px; }
          .letterhead-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; flex-shrink: 0; }
          .letterhead-logo-fallback { width: 64px; height: 64px; border-radius: 8px; background: #2563EB; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; flex-shrink: 0; }
          .letterhead-title { flex: 1; }
          .clinic-name { font-size: 22px; font-weight: 800; color: #2563EB; letter-spacing: 0.3px; line-height: 1.1; text-transform: uppercase; margin: 0; }
          .clinic-tagline { font-size: 10.5px; color: #4a4a4a; font-style: italic; margin-top: 3px; letter-spacing: 0.2px; }
          .clinic-ids { font-size: 9.5px; color: #64748b; margin-top: 4px; font-family: monospace; }
          .letterhead-contact { display: flex; flex-wrap: wrap; gap: 4px 0; font-size: 10px; color: #4a4a4a; margin-top: 8px; padding-top: 64px; border-top: 1px dashed #e2e8f0; }

          .slip-label-wrap { text-align: center; margin-bottom: 15px; }
          .slip-label { display: inline-block; padding: 6px 20px; background: #0f172a; color: #fff; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }

          .patient-bar { background: #f8fafc; padding: 12px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border: 1px solid #f1f5f9; }
          .p-name { font-size: 14px; font-weight: 800; color: #0f172a; }
          .p-sub { font-size: 11px; color: #64748b; margin-top: 1px; font-weight: 500; }
          .token-box { text-align: right; }
          .token-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
          .token-value { font-size: 24px; font-weight: 800; color: var(--pp-blue); line-height: 1; margin-top: 2px; font-family: monospace; }

          .details-grid { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 15px; }
          .detail-row { display: flex; border-bottom: 1px solid #f1f5f9; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { width: 120px; padding: 10px 16px; background: #f8fafc; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }
          .detail-value { flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0f172a; display: flex; align-items: center; }

          .fee-bar { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
          .fee-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
          .fee-value { font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1; }
          .fee-sub { font-size: 10px; color: #64748b; margin-top: 2px; font-weight: 500; }

          .visit-badge { background: var(--pp-blue); color: white; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

          .instructions { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px 16px; margin-bottom: 15px; }
          .instructions-title { font-size: 10px; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 4px; }
          .instructions-text { font-size: 11px; color: #92400e; line-height: 1.4; font-weight: 500; }

          .footer { margin-top: 15px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 12px; }
          .footer-text { font-size: 10px; color: #94a3b8; font-weight: 600; }
          .footer-note { font-size: 9px; color: #cbd5e1; margin-top: 4px; }

          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
            @page { margin: 1cm; size: A5; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 13px;">Confirm Print</button>
          </div>

          <div class="letterhead">
            <div class="letterhead-band"></div>
            <div class="letterhead-row">
              ${org.logo 
                ? `<img src="${org.logo}" alt="" class="letterhead-logo" onerror="this.style.display='none'" />` 
                : `<div class="letterhead-logo-fallback">${(org.name || 'C').charAt(0).toUpperCase()}</div>`
              }
              <div class="letterhead-title">
                <div class="clinic-name">${org.name}</div>
                ${org.tagLine ? `<div class="clinic-tagline">${org.tagLine}</div>` : ''}
                <div class="clinic-ids">
                  ${org.registration ? `Reg: ${org.registration}` : ''}
                </div>
              </div>
            </div>
            <div class="letterhead-contact">
              ${org.address ? `<span>${org.address}</span>` : ''}
              ${org.address2 ? `<span>&nbsp;·&nbsp;${org.address2}</span>` : ''}
              ${org.phone ? `<span>&nbsp;·&nbsp;📞 ${org.phone}</span>` : ''}
              ${org.email ? `<span>&nbsp;·&nbsp;✉ ${org.email}</span>` : ''}
              ${org.website ? `<span>&nbsp;·&nbsp;🌐 ${org.website}</span>` : ''}
              ${org.timing ? `<span>&nbsp;·&nbsp;⏰ ${org.timing}</span>` : ''}
            </div>

          </div>

          <div class="slip-label-wrap">
            <span class="slip-label">Appointment Confirmation Slip</span>
          </div>

          <div class="patient-bar">
            <div>
              <p class="p-name">${appointment.patientName || 'Patient'}</p>
              <p class="p-sub">${appointment.phone ? `+91 ${appointment.phone}` : ''} ${appointment.regid ? `| Reg ID: #${appointment.regid}` : ''}</p>
            </div>
            ${appointment.tokenNo ? `
            <div class="token-box">
              <p class="token-label">Token No.</p>
              <p class="token-value">${String(appointment.tokenNo).padStart(2, '0')}</p>
            </div>` : ''}
          </div>

          <div class="details-grid">
            <div class="detail-row">
              <div class="detail-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Practitioner
              </div>
              <div class="detail-value">Dr. ${appointment.doctorName || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Date
              </div>
              <div class="detail-value">${formattedDate}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Time
              </div>
              <div class="detail-value">${appointment.bookingTime || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Visit Type
              </div>
              <div class="detail-value"><span class="visit-badge">${appointment.visitType === 'New' ? 'New Case' : 'Follow Up'}</span></div>
            </div>
          </div>

          ${appointment.consultationFee ? `
          <div class="fee-bar">
            <div>
              <p class="fee-label">Consultation Fee</p>
              <p class="fee-sub">To be paid at the clinic</p>
            </div>
            <div>
              <p class="fee-value">₹${Number(appointment.consultationFee).toLocaleString()}</p>
            </div>
          </div>` : ''}

          ${appointment.notes ? `
          <div style="margin-bottom: 15px;">
            <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Booking Notes</p>
            <div style="background: #f8fafc; padding: 12px; border-radius: 10px; font-size: 12px; color: #334155; border: 1px solid #f1f5f9; white-space: pre-wrap;">${appointment.notes}</div>
          </div>` : ''}

          <div class="instructions">
            <p class="instructions-title">Patient Instructions</p>
            <p class="instructions-text">
              • Please arrive 10 minutes before your scheduled appointment.<br>
              • Carry this slip or show the appointment confirmation on your phone.<br>
              • For cancellations or rescheduling, please contact the clinic at least 2 hours in advance.
            </p>
          </div>

          <div class="footer">
            <p class="footer-text">This is a computer-generated appointment slip. No signature required.</p>
            <p class="footer-note">Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')} | HomeoX Clinical Systems</p>
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

