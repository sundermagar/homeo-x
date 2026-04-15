// @ts-nocheck
/**
 * Print Templates — HTML generators for prescriptions, invoices, receipts
 * Outputs self-contained HTML with embedded CSS for A4 printing
 */

import { formatPrintDate, formatPrintCurrency } from './print';

// ─── Shared Print Styles ───────────────────────────────────────────────────

const PRINT_STYLES = `
<style>
  @page {
    size: A4;
    margin: 12mm 15mm;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #1a1a1a;
  }
  .page {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
  }
  .header {
    text-align: center;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .header .clinic-name {
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .header .clinic-address {
    font-size: 10px;
    color: #555;
    margin-top: 2px;
  }
  .header .clinic-phone {
    font-size: 10px;
    color: #555;
  }
  .doctor-info {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #ccc;
    margin-bottom: 8px;
  }
  .doctor-info .name {
    font-size: 13px;
    font-weight: 600;
  }
  .doctor-info .qual {
    font-size: 10px;
    color: #555;
  }
  .doctor-info .reg {
    font-size: 10px;
    color: #555;
  }
  .patient-info {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 20px;
    padding: 6px 0;
    border-bottom: 1px solid #ccc;
    margin-bottom: 10px;
    font-size: 11px;
  }
  .patient-info .field {
    display: inline-flex;
    gap: 4px;
  }
  .patient-info .label {
    font-weight: 600;
    color: #333;
  }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 10px;
    margin-bottom: 4px;
    padding-bottom: 2px;
    border-bottom: 1px solid #eee;
    color: #333;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0;
  }
  table th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: #555;
    padding: 4px 6px;
    border-bottom: 1px solid #999;
    background: #f5f5f5;
  }
  table td {
    padding: 4px 6px;
    border-bottom: 1px solid #eee;
    font-size: 11px;
    vertical-align: top;
  }
  table tr:last-child td {
    border-bottom: none;
  }
  .rx-symbol {
    font-size: 20px;
    font-weight: 700;
    font-style: italic;
    margin-bottom: 4px;
    display: block;
  }
  .soap-section {
    margin-bottom: 6px;
  }
  .soap-section .soap-label {
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    color: #666;
  }
  .soap-section .soap-text {
    font-size: 11px;
    padding-left: 8px;
    white-space: pre-wrap;
  }
  .advice-box {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 6px 8px;
    margin: 6px 0;
    font-size: 11px;
    background: #fafafa;
  }
  .follow-up {
    font-size: 11px;
    margin: 6px 0;
  }
  .follow-up strong {
    font-weight: 600;
  }
  .footer {
    margin-top: 30px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .footer .timestamp {
    font-size: 9px;
    color: #999;
  }
  .footer .signature {
    text-align: right;
  }
  .footer .signature .line {
    border-top: 1px solid #333;
    width: 160px;
    margin-bottom: 2px;
    margin-left: auto;
  }
  .footer .signature .name {
    font-size: 11px;
    font-weight: 600;
  }
  /* Invoice-specific */
  .invoice-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .invoice-meta .label {
    font-weight: 600;
    display: inline-block;
    width: 100px;
  }
  .invoice-meta {
    font-size: 11px;
  }
  .totals-table {
    width: auto;
    margin-left: auto;
    margin-top: 8px;
  }
  .totals-table td {
    padding: 3px 8px;
    border: none;
  }
  .totals-table .total-row td {
    font-weight: 700;
    font-size: 13px;
    border-top: 2px solid #333;
    padding-top: 6px;
  }
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .status-paid { background: #d4edda; color: #155724; }
  .status-partial { background: #fff3cd; color: #856404; }
  .status-issued { background: #cce5ff; color: #004085; }
  .status-draft { background: #f8f9fa; color: #6c757d; }
  .status-cancelled { background: #f8d7da; color: #721c24; }
  /* Receipt-specific */
  .receipt-box {
    border: 2px solid #333;
    border-radius: 4px;
    padding: 16px;
    margin: 10px 0;
  }
  .receipt-amount {
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    margin: 12px 0;
  }
  .receipt-details {
    font-size: 11px;
  }
  .receipt-details .row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    border-bottom: 1px dotted #ccc;
  }
  .receipt-details .row:last-child {
    border-bottom: none;
  }
  .watermark {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: #28a745;
    text-align: center;
    margin-top: 8px;
    letter-spacing: 2px;
  }
</style>
`;

// ─── Clinic Header (shared across documents) ─────────────────────────────

interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
}

function renderClinicHeader(clinic: ClinicInfo, docTitle?: string): string {
  return `
    <div class="header">
      <div class="clinic-name">${escapeHtml(clinic.name)}</div>
      ${clinic.address ? `<div class="clinic-address">${escapeHtml(clinic.address)}</div>` : ''}
      ${clinic.phone ? `<div class="clinic-phone">Tel: ${escapeHtml(clinic.phone)}</div>` : ''}
      ${docTitle ? `<div style="font-size:12px;font-weight:600;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(docTitle)}</div>` : ''}
    </div>
  `;
}

// ─── Escape HTML ─────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Prescription Template ───────────────────────────────────────────────

export interface PrescriptionPrintData {
  clinic: ClinicInfo;
  doctor: {
    name: string;
    qualification?: string;
    registrationNumber?: string;
  };
  patient: {
    name: string;
    age?: string;
    gender?: string;
    mrn?: string;
    phone?: string;
  };
  visit: {
    visitNumber: string;
    date: string;
    specialty?: string;
    chiefComplaint?: string;
  };
  vitals?: {
    heightCm?: number;
    weightKg?: number;
    bmi?: number;
    temperatureF?: number;
    pulseRate?: number;
    systolicBp?: number;
    diastolicBp?: number;
    oxygenSaturation?: number;
  };
  diagnosis?: {
    icdCodes?: string[];
    assessment?: string;
  };
  soap?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  medications: Array<{
    name: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    duration: string;
    route?: string;
    instructions?: string;
    quantity?: number;
  }>;
  labOrders?: string[];
  advice?: string;
  followUp?: string;
  prescriptionNotes?: string;
  /** Strategy determines column layout: REMEDY shows Potency/Form, TITRATION shows Current Dose/Titration Notes */
  prescriptionStrategy?: 'DOSAGE' | 'REMEDY' | 'TITRATION';
}

export function generatePrescriptionHtml(data: PrescriptionPrintData): string {
  const vitalsHtml = data.vitals ? renderVitals(data.vitals) : '';
  const diagnosisHtml = data.diagnosis ? renderDiagnosis(data.diagnosis) : '';
  const soapHtml = data.soap ? renderSoap(data.soap) : '';
  const medsHtml = renderMedications(data.medications, data.prescriptionStrategy);
  const labsHtml = data.labOrders && data.labOrders.length > 0 ? renderLabOrders(data.labOrders) : '';

  return `
${PRINT_STYLES}
<div class="page">
  ${renderClinicHeader(data.clinic)}

  <div class="doctor-info">
    <div>
      <div class="name">Dr. ${escapeHtml(data.doctor.name)}</div>
      ${data.doctor.qualification ? `<div class="qual">${escapeHtml(data.doctor.qualification)}</div>` : ''}
    </div>
    <div style="text-align:right;">
      ${data.doctor.registrationNumber ? `<div class="reg">Reg. No: ${escapeHtml(data.doctor.registrationNumber)}</div>` : ''}
      ${data.visit.specialty ? `<div class="qual">${escapeHtml(data.visit.specialty)}</div>` : ''}
    </div>
  </div>

  <div class="patient-info">
    <div class="field"><span class="label">Patient:</span> ${escapeHtml(data.patient.name)}</div>
    ${data.patient.age ? `<div class="field"><span class="label">Age:</span> ${escapeHtml(data.patient.age)}</div>` : ''}
    ${data.patient.gender ? `<div class="field"><span class="label">Gender:</span> ${escapeHtml(data.patient.gender)}</div>` : ''}
    ${data.patient.mrn ? `<div class="field"><span class="label">MRN:</span> ${escapeHtml(data.patient.mrn)}</div>` : ''}
    <div class="field"><span class="label">Visit #:</span> ${escapeHtml(data.visit.visitNumber)}</div>
    <div class="field"><span class="label">Date:</span> ${formatPrintDate(data.visit.date)}</div>
    ${data.visit.chiefComplaint ? `<div class="field"><span class="label">C/C:</span> ${escapeHtml(data.visit.chiefComplaint)}</div>` : ''}
  </div>

  ${vitalsHtml}
  ${soapHtml}
  ${diagnosisHtml}

  ${medsHtml}

  ${labsHtml}

  ${data.advice ? `
    <div class="section-title">Advice & Management</div>
    <div class="advice-box">${escapeHtml(data.advice).replace(/\n/g, '<br>')}</div>
  ` : ''}

  ${data.followUp ? `
    <div class="follow-up"><strong>Follow-up:</strong> ${escapeHtml(data.followUp)}</div>
  ` : ''}

  ${data.prescriptionNotes ? `
    <div class="section-title">Additional Advisory</div>
    <div style="font-size:11px;color:#666;padding:2px 0;">${escapeHtml(data.prescriptionNotes).replace(/\n/g, '<br>')}</div>
  ` : ''}

  <div class="footer">
    <div class="timestamp">
      Printed: ${new Date().toLocaleString('en-IN')}<br>
      Visit #${escapeHtml(data.visit.visitNumber)}
    </div>
    <div class="signature">
      <div class="line"></div>
      <div class="name">Consulting Physician: Dr. ${escapeHtml(data.doctor.name)}</div>
      ${data.doctor.registrationNumber ? `<div style="font-size:9px;color:#666;">Reg. No: ${escapeHtml(data.doctor.registrationNumber)}</div>` : ''}
    </div>
  </div>
</div>
  `;
}

function renderVitals(vitals: NonNullable<PrescriptionPrintData['vitals']>): string {
  const items: string[] = [];
  if (vitals.heightCm) items.push(`Ht: ${vitals.heightCm} cm`);
  if (vitals.weightKg) items.push(`Wt: ${vitals.weightKg} kg`);
  if (vitals.bmi) items.push(`BMI: ${vitals.bmi.toFixed(1)}`);
  if (vitals.temperatureF) items.push(`Temp: ${vitals.temperatureF}\u00B0F`);
  if (vitals.pulseRate) items.push(`Pulse: ${vitals.pulseRate}/min`);
  if (vitals.systolicBp && vitals.diastolicBp) items.push(`BP: ${vitals.systolicBp}/${vitals.diastolicBp} mmHg`);
  if (vitals.oxygenSaturation) items.push(`SpO\u2082: ${vitals.oxygenSaturation}%`);

  if (items.length === 0) return '';

  return `
    <div style="font-size:10px;color:#555;padding:4px 0;border-bottom:1px solid #eee;margin-bottom:4px;">
      <strong>Vitals:</strong> ${items.join(' &nbsp;|&nbsp; ')}
    </div>
  `;
}

function renderSoap(soap: NonNullable<PrescriptionPrintData['soap']>): string {
  const sections: string[] = [];

  const combinedSummary = [soap.subjective, soap.objective].filter(Boolean).join('\n\n');

  if (combinedSummary) {
    sections.push(`
      <div class="soap-section" style="margin-bottom: 8px;">
        <div class="section-title" style="margin-bottom: 4px;">Clinical Summary</div>
        <div class="soap-text" style="padding-left: 0;">${escapeHtml(combinedSummary).replace(/\n/g, '<br>')}</div>
      </div>
    `);
  }

  // Note: We don't render Assessment here because renderDiagnosis already handles it below.
  // Note: The clinical notes section (objective/plan) has been explicitly disabled per user request.

  if (sections.length === 0) return '';

  return sections.join('');
}

function renderDiagnosis(diagnosis: NonNullable<PrescriptionPrintData['diagnosis']>): string {
  const parts: string[] = [];
  if (diagnosis.assessment) parts.push(escapeHtml(diagnosis.assessment));
  if (diagnosis.icdCodes && diagnosis.icdCodes.length > 0) {
    parts.push(`(${diagnosis.icdCodes.map(escapeHtml).join(', ')})`);
  }
  if (parts.length === 0) return '';

  return `
    <div class="section-title">Diagnosis</div>
    <div style="font-size:11px;padding:2px 0;">${parts.join(' ')}</div>
  `;
}

function renderMedications(meds: PrescriptionPrintData['medications'], strategy?: string): string {
  if (meds.length === 0) return '';

  if (strategy === 'REMEDY') {
    // Homeopathy: Potency in dosage field, Form in route field, Dose in instructions
    const rows = meds.map((med, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(med.name)}</strong></td>
        <td>${escapeHtml(med.dosage)}</td>
        <td>${med.route ? escapeHtml(med.route) : '—'}</td>
        <td>${med.instructions ? escapeHtml(med.instructions) : '—'}</td>
        <td>${escapeHtml(med.frequency)}</td>
        <td>${escapeHtml(med.duration)}</td>
      </tr>
    `).join('');

    return `
      <div class="section-title" style="margin-top: 10px;">Prescription</div>
      <table>
        <thead>
          <tr>
            <th style="width:24px;">#</th>
            <th>Remedy</th>
            <th>Potency</th>
            <th>Form</th>
            <th>Dose</th>
            <th>Frequency</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  if (strategy === 'TITRATION') {
    // Cardiac: includes titration notes in instructions
    const rows = meds.map((med, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${escapeHtml(med.name)}</strong>
          ${med.genericName ? `<br><span style="font-size:9px;color:#666;">(${escapeHtml(med.genericName)})</span>` : ''}
        </td>
        <td>${escapeHtml(med.dosage)}</td>
        <td>${escapeHtml(med.frequency)}</td>
        <td>${escapeHtml(med.duration)}</td>
        <td>${med.route ? escapeHtml(med.route) : 'Oral'}</td>
        <td>${med.instructions ? escapeHtml(med.instructions) : '—'}</td>
      </tr>
    `).join('');

    return `
      <div class="section-title" style="margin-top: 10px;">Prescription</div>
      <table>
        <thead>
          <tr>
            <th style="width:24px;">#</th>
            <th>Medication</th>
            <th>Current Dose</th>
            <th>Frequency</th>
            <th>Duration</th>
            <th>Route</th>
            <th>Titration Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // Default DOSAGE strategy (standard allopathy)
  const rows = meds.map((med, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <strong>${escapeHtml(med.name)}</strong>
        ${med.genericName ? `<br><span style="font-size:9px;color:#666;">(${escapeHtml(med.genericName)})</span>` : ''}
      </td>
      <td>${escapeHtml(med.dosage)}</td>
      <td>${escapeHtml(med.frequency)}</td>
      <td>${escapeHtml(med.duration)}</td>
      <td>${med.route ? escapeHtml(med.route) : 'Oral'}</td>
      <td>${med.instructions ? escapeHtml(med.instructions) : '—'}</td>
      <td>${med.quantity ?? '—'}</td>
    </tr>
  `).join('');

  return `
    <div class="section-title" style="margin-top: 10px;">Prescription</div>
    <table>
      <thead>
        <tr>
          <th style="width:24px;">#</th>
          <th>Medication</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Route</th>
          <th>Instructions</th>
          <th style="width:40px;">Qty</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderLabOrders(labs: string[]): string {
  return `
    <div class="section-title">Lab Orders</div>
    <div style="font-size:11px;padding:2px 0;">
      ${labs.map(escapeHtml).join(', ')}
    </div>
  `;
}

// ─── Invoice Template ────────────────────────────────────────────────────

export interface InvoicePrintData {
  clinic: ClinicInfo;
  invoice: {
    invoiceNumber: string;
    status: string;
    issuedAt?: string;
    dueDate?: string;
    createdAt: string;
    notes?: string;
  };
  patient: {
    name: string;
    mrn?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    description: string;
    itemType: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  totals: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
  };
  payments?: Array<{
    amount: number;
    method: string;
    paidAt: string;
    transactionId?: string;
  }>;
}

export function generateInvoiceHtml(data: InvoicePrintData): string {
  const statusClass = getStatusClass(data.invoice.status);
  const totalPaid = data.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const balanceDue = data.totals.totalAmount - totalPaid;

  const itemRows = data.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(item.description)}</td>
      <td style="text-transform:capitalize;">${escapeHtml(item.itemType.toLowerCase())}</td>
      <td style="text-align:right;">${item.quantity}</td>
      <td style="text-align:right;">${formatPrintCurrency(item.unitPrice)}</td>
      <td style="text-align:right;">${formatPrintCurrency(item.amount)}</td>
    </tr>
  `).join('');

  const paymentRows = data.payments && data.payments.length > 0
    ? data.payments.map(p => `
        <tr>
          <td>${formatPrintDate(p.paidAt)}</td>
          <td style="text-transform:capitalize;">${escapeHtml(p.method.toLowerCase())}</td>
          <td style="text-align:right;">${formatPrintCurrency(p.amount)}</td>
          <td>${p.transactionId ? escapeHtml(p.transactionId) : '—'}</td>
        </tr>
      `).join('')
    : '';

  return `
${PRINT_STYLES}
<div class="page">
  ${renderClinicHeader(data.clinic, 'Invoice')}

  <div class="invoice-header">
    <div class="invoice-meta">
      <div><span class="label">Invoice #:</span> ${escapeHtml(data.invoice.invoiceNumber)}</div>
      <div><span class="label">Status:</span> <span class="status-badge ${statusClass}">${escapeHtml(data.invoice.status)}</span></div>
      <div><span class="label">Issued:</span> ${formatPrintDate(data.invoice.issuedAt || data.invoice.createdAt)}</div>
      ${data.invoice.dueDate ? `<div><span class="label">Due Date:</span> ${formatPrintDate(data.invoice.dueDate)}</div>` : ''}
    </div>
    <div class="invoice-meta" style="text-align:right;">
      <div><span class="label">Patient:</span> ${escapeHtml(data.patient.name)}</div>
      ${data.patient.mrn ? `<div><span class="label">MRN:</span> ${escapeHtml(data.patient.mrn)}</div>` : ''}
      ${data.patient.phone ? `<div><span class="label">Phone:</span> ${escapeHtml(data.patient.phone)}</div>` : ''}
    </div>
  </div>

  <div class="section-title">Line Items</div>
  <table>
    <thead>
      <tr>
        <th style="width:24px;">#</th>
        <th>Description</th>
        <th>Type</th>
        <th style="text-align:right;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="totals-table">
    <tbody>
      <tr>
        <td style="text-align:right;">Subtotal:</td>
        <td style="text-align:right;">${formatPrintCurrency(data.totals.subtotal)}</td>
      </tr>
      ${data.totals.taxAmount > 0 ? `
        <tr>
          <td style="text-align:right;">Tax (${data.totals.taxRate}%):</td>
          <td style="text-align:right;">${formatPrintCurrency(data.totals.taxAmount)}</td>
        </tr>
      ` : ''}
      ${data.totals.discountAmount > 0 ? `
        <tr>
          <td style="text-align:right;">Discount:</td>
          <td style="text-align:right;">-${formatPrintCurrency(data.totals.discountAmount)}</td>
        </tr>
      ` : ''}
      <tr class="total-row">
        <td style="text-align:right;">Total:</td>
        <td style="text-align:right;">${formatPrintCurrency(data.totals.totalAmount)}</td>
      </tr>
      ${totalPaid > 0 ? `
        <tr>
          <td style="text-align:right;">Paid:</td>
          <td style="text-align:right;">${formatPrintCurrency(totalPaid)}</td>
        </tr>
        <tr>
          <td style="text-align:right;font-weight:600;">Balance Due:</td>
          <td style="text-align:right;font-weight:600;">${formatPrintCurrency(balanceDue)}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  ${paymentRows ? `
    <div class="section-title" style="margin-top:16px;">Payment History</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Method</th>
          <th style="text-align:right;">Amount</th>
          <th>Reference</th>
        </tr>
      </thead>
      <tbody>
        ${paymentRows}
      </tbody>
    </table>
  ` : ''}

  ${data.invoice.notes ? `
    <div style="margin-top:12px;font-size:10px;color:#666;">
      <strong>Notes:</strong> ${escapeHtml(data.invoice.notes)}
    </div>
  ` : ''}

  <div class="footer">
    <div class="timestamp">
      Printed: ${new Date().toLocaleString('en-IN')}<br>
      Invoice #${escapeHtml(data.invoice.invoiceNumber)}
    </div>
    <div class="signature">
      <div class="line"></div>
      <div class="name">Authorized Signature</div>
    </div>
  </div>
</div>
  `;
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'PAID': return 'status-paid';
    case 'PARTIAL_PAID': return 'status-partial';
    case 'ISSUED': return 'status-issued';
    case 'DRAFT': return 'status-draft';
    case 'CANCELLED':
    case 'REFUNDED': return 'status-cancelled';
    default: return 'status-draft';
  }
}

// ─── Receipt Template ────────────────────────────────────────────────────

export interface ReceiptPrintData {
  clinic: ClinicInfo;
  receipt: {
    receiptNumber: string;
    paymentDate: string;
    amount: number;
    method: string;
    transactionId?: string;
    notes?: string;
  };
  patient: {
    name: string;
    mrn?: string;
    phone?: string;
  };
  invoice?: {
    invoiceNumber: string;
    totalAmount: number;
    balanceDue: number;
  };
}

export function generateReceiptHtml(data: ReceiptPrintData): string {
  return `
${PRINT_STYLES}
<div class="page">
  ${renderClinicHeader(data.clinic, 'Payment Receipt')}

  <div class="receipt-box">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <div>
        <div style="font-size:10px;color:#666;">Receipt Number</div>
        <div style="font-size:14px;font-weight:700;">${escapeHtml(data.receipt.receiptNumber)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#666;">Date</div>
        <div style="font-size:12px;font-weight:600;">${formatPrintDate(data.receipt.paymentDate)}</div>
      </div>
    </div>

    <div class="receipt-amount">
      ${formatPrintCurrency(data.receipt.amount)}
    </div>
    <div class="watermark">PAID</div>

    <div class="receipt-details" style="margin-top:12px;">
      <div class="row">
        <span>Patient</span>
        <span>${escapeHtml(data.patient.name)}</span>
      </div>
      ${data.patient.mrn ? `
        <div class="row">
          <span>MRN</span>
          <span>${escapeHtml(data.patient.mrn)}</span>
        </div>
      ` : ''}
      <div class="row">
        <span>Payment Method</span>
        <span style="text-transform:capitalize;">${escapeHtml(data.receipt.method.toLowerCase())}</span>
      </div>
      ${data.receipt.transactionId ? `
        <div class="row">
          <span>Transaction ID</span>
          <span>${escapeHtml(data.receipt.transactionId)}</span>
        </div>
      ` : ''}
      ${data.invoice ? `
        <div class="row">
          <span>Invoice #</span>
          <span>${escapeHtml(data.invoice.invoiceNumber)}</span>
        </div>
        <div class="row">
          <span>Invoice Total</span>
          <span>${formatPrintCurrency(data.invoice.totalAmount)}</span>
        </div>
        ${data.invoice.balanceDue > 0 ? `
          <div class="row">
            <span style="font-weight:600;">Balance Due</span>
            <span style="font-weight:600;">${formatPrintCurrency(data.invoice.balanceDue)}</span>
          </div>
        ` : ''}
      ` : ''}
    </div>

    ${data.receipt.notes ? `
      <div style="margin-top:8px;font-size:10px;color:#666;">
        <strong>Notes:</strong> ${escapeHtml(data.receipt.notes)}
      </div>
    ` : ''}
  </div>

  <div class="footer">
    <div class="timestamp">
      Printed: ${new Date().toLocaleString('en-IN')}
    </div>
    <div class="signature">
      <div class="line"></div>
      <div class="name">Authorized Signature</div>
    </div>
  </div>
</div>
  `;
}
