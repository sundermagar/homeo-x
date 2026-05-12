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
  /* ── Legacy header (kept for invoice/receipt templates that still use it) ── */
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
  .header .clinic-address { font-size: 10px; color: #555; margin-top: 2px; }
  .header .clinic-phone { font-size: 10px; color: #555; }

  /* ── Letterhead (prescription branding) ───────────────────────────── */
  .letterhead {
    position: relative;
    padding: 14px 4px 10px;
    margin-bottom: 12px;
  }
  .letterhead-band {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 6px;
    background: linear-gradient(90deg, var(--lh-accent, #2563EB) 0%, #60A5FA 70%, #BFDBFE 100%);
    border-radius: 0 0 2px 2px;
  }
  .letterhead-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-top: 14px;
  }
  .letterhead-logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: 8px;
    flex-shrink: 0;
    background: #fff;
  }
  .letterhead-logo-fallback {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    background: var(--lh-accent, #2563EB);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    flex-shrink: 0;
    letter-spacing: 0;
  }
  .letterhead-title { flex: 1; min-width: 0; }
  .letterhead-title .clinic-name {
    font-size: 22px;
    font-weight: 800;
    color: var(--lh-accent, #2563EB);
    letter-spacing: 0.3px;
    line-height: 1.1;
    text-transform: uppercase;
  }
  .letterhead-title .clinic-tagline {
    font-size: 10.5px;
    color: #4A4A47;
    font-style: italic;
    margin-top: 3px;
    letter-spacing: 0.2px;
  }
  .letterhead-title .clinic-ids {
    font-size: 9.5px;
    color: #6B7280;
    margin-top: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
  }
  .letterhead-contact {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 0;
    font-size: 10px;
    color: #4A4A47;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px dashed #E3E2DF;
    line-height: 1.5;
  }
  .letterhead-doctitle {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--lh-accent, #2563EB);
    margin-top: 8px;
    text-align: right;
  }
  .letterhead-rule {
    height: 2px;
    background: var(--lh-accent, #2563EB);
    margin-top: 8px;
    opacity: 0.85;
  }
  .letterhead-footer {
    position: fixed;
    left: 15mm; right: 15mm; bottom: 6mm;
    text-align: center;
    font-size: 8.5px;
    color: #888786;
    border-top: 1px solid #E3E2DF;
    padding-top: 4px;
    letter-spacing: 0.3px;
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

  /* ── Prescription Letterhead (editorial style — matches on-screen review) ── */
  .rx-page {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    color: #111827;
    font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif;
  }
  .rx-letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #111827;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .rx-lh-left { display: flex; flex-direction: column; gap: 6px; }
  .rx-clinic-name {
    font-size: 26px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.5px;
    color: #0F0F0E;
    line-height: 1;
  }
  .rx-clinic-tagline {
    font-size: 10px;
    color: #6B7280;
    font-style: italic;
    letter-spacing: 0.2px;
  }
  .rx-doctor-line {
    font-size: 11px;
    font-weight: 700;
    color: #1F2937;
    margin-top: 2px;
  }
  .rx-doctor-meta {
    font-size: 10px;
    color: #6B7280;
    font-weight: 500;
  }
  .rx-lh-right {
    text-align: right;
    font-size: 10px;
    font-weight: 700;
    color: #6B7280;
    line-height: 1.5;
  }
  .rx-lh-right .rx-date { color: #9CA3AF; }
  .rx-lh-contact {
    font-size: 9.5px;
    color: #6B7280;
    margin-top: 4px;
    font-weight: 500;
    letter-spacing: 0.1px;
  }

  .rx-section { margin-bottom: 14px; }
  .rx-section-label {
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--rx-accent, #2563EB);
    margin-bottom: 6px;
  }

  .rx-patient-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border: 1px solid #E5E7EB;
    background: #FAFAFA;
    border-radius: 2px;
    overflow: hidden;
  }
  .rx-patient-cell {
    padding: 8px 10px;
    border-right: 1px solid #E5E7EB;
  }
  .rx-patient-cell:last-child { border-right: none; }
  .rx-cell-label {
    display: block;
    font-size: 8px;
    font-weight: 700;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 3px;
  }
  .rx-cell-value {
    font-size: 12px;
    font-weight: 800;
    color: #111827;
    word-break: break-word;
  }
  .rx-cell-value.rx-allergy { color: #DC2626; }

  .rx-vitals-strip {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0;
    border: 1px solid #E5E7EB;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;
  }
  .rx-vitals-strip .rx-patient-cell {
    padding: 6px 8px;
  }

  .rx-narrative {
    font-size: 11px;
    color: #1F2937;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  .rx-diagnosis-text {
    font-size: 14px;
    font-weight: 800;
    color: #0F0F0E;
    line-height: 1.3;
  }
  .rx-diagnosis-icd {
    font-size: 10px;
    color: #6B7280;
    font-style: italic;
    margin-top: 2px;
  }

  .rx-meds-table {
    width: 100%;
    border-collapse: collapse;
    border-top: 2px solid #111827;
    border-bottom: 2px solid #111827;
  }
  .rx-meds-table thead th {
    text-align: left;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #9CA3AF;
    padding: 8px 6px;
    background: transparent;
    border-bottom: none;
  }
  .rx-meds-table tbody td {
    padding: 10px 6px;
    border-bottom: 1px solid #F3F4F6;
    font-size: 11px;
    vertical-align: top;
    color: #1F2937;
  }
  .rx-meds-table tbody tr:last-child td { border-bottom: none; }
  .rx-meds-table .rx-md-num {
    color: #9CA3AF;
    font-weight: 700;
    text-align: center;
  }
  .rx-meds-table .rx-md-name {
    font-weight: 900;
    color: #0F0F0E;
  }
  .rx-meds-table .rx-md-generic {
    display: block;
    font-size: 9px;
    font-weight: 500;
    color: #9CA3AF;
    margin-top: 1px;
  }
  .rx-meds-table .rx-md-instr {
    display: block;
    font-size: 9.5px;
    font-style: italic;
    color: #9CA3AF;
    margin-top: 2px;
  }
  .rx-meds-empty {
    padding: 22px 0;
    text-align: center;
    font-size: 11px;
    font-style: italic;
    color: #9CA3AF;
  }

  .rx-twocol {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    margin-top: 14px;
  }
  .rx-prose {
    font-size: 11px;
    color: #374151;
    line-height: 1.55;
    white-space: pre-wrap;
  }
  .rx-prose-em {
    font-size: 13px;
    font-weight: 800;
    color: #0F0F0E;
  }
  .rx-prose-meta {
    font-size: 9px;
    font-style: italic;
    font-weight: 700;
    color: #9CA3AF;
    margin-top: 3px;
  }

  .rx-additional {
    margin-top: 14px;
  }

  .rx-signature {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #E5E7EB;
    max-width: 260px;
  }
  .rx-sig-name {
    font-size: 12px;
    font-weight: 900;
    color: #0F0F0E;
  }
  .rx-sig-meta {
    font-size: 8.5px;
    font-weight: 700;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 3px;
    line-height: 1.5;
  }

  .rx-print-footer {
    margin-top: 24px;
    padding-top: 6px;
    border-top: 1px dashed #E5E7EB;
    font-size: 8.5px;
    color: #9CA3AF;
    text-align: center;
    letter-spacing: 0.3px;
  }
</style>
`;

// ─── Clinic Letterhead (shared across documents) ─────────────────────────

interface ClinicInfo {
  name: string;
  tagline?: string;
  /** Absolute URL or data: URL to the clinic logo. Embedded into the printed page. */
  logoUrl?: string;
  address?: string;
  address2?: string;
  phone?: string;
  timing?: string;
  email?: string;
  website?: string;
  /** Clinical registration / license / GSTIN — printed on the right band. */
  registrationNo?: string;
  gstin?: string;
  /** Custom footer line (e.g. "Generated electronically — valid without signature"). */
  footer?: string;
  /** Top accent colour for the letterhead band. Defaults to clinical blue. */
  accentColor?: string;
  headerHtml?: string;
  footerHtml?: string;
}

function renderClinicHeader(clinic: ClinicInfo, docTitle?: string): string {
  const accent = clinic.accentColor || '#2563EB';
  const safe = (s?: string) => (s ? escapeHtml(s) : '');

  const contactBits: string[] = [];
  if (clinic.address) contactBits.push(`<span>${safe(clinic.address)}</span>`);
  if (clinic.phone)   contactBits.push(`<span>📞 ${safe(clinic.phone)}</span>`);
  if (clinic.email)   contactBits.push(`<span>✉ ${safe(clinic.email)}</span>`);
  if (clinic.website) contactBits.push(`<span>🌐 ${safe(clinic.website)}</span>`);

  const idBits: string[] = [];
  if (clinic.registrationNo) idBits.push(`Reg: ${safe(clinic.registrationNo)}`);
  if (clinic.gstin)          idBits.push(`GSTIN: ${safe(clinic.gstin)}`);

  return `
    <div class="letterhead" style="--lh-accent:${accent};">
      <div class="letterhead-band"></div>
      <div class="letterhead-row">
        ${clinic.logoUrl
          ? `<img src="${escapeHtml(clinic.logoUrl)}" alt="" class="letterhead-logo" onerror="this.style.display='none'" />`
          : `<div class="letterhead-logo-fallback">${safe((clinic.name || 'C').charAt(0).toUpperCase())}</div>`
        }
        <div class="letterhead-title">
          <div class="clinic-name">${safe(clinic.name)}</div>
          ${clinic.tagline ? `<div class="clinic-tagline">${safe(clinic.tagline)}</div>` : ''}
          ${idBits.length ? `<div class="clinic-ids">${idBits.join(' &nbsp;·&nbsp; ')}</div>` : ''}
        </div>
      </div>
      ${contactBits.length ? `<div class="letterhead-contact">${contactBits.join(' &nbsp;·&nbsp; ')}</div>` : ''}
      ${docTitle ? `<div class="letterhead-doctitle">${safe(docTitle)}</div>` : ''}
      <div class="letterhead-rule"></div>
    </div>
  `;
}

/** HTML fragment to inject into the bottom of the printed page (fixed footer). */
function renderClinicFooter(clinic: ClinicInfo): string {
  const text = clinic.footer
    || `${clinic.name}${clinic.phone ? ` · ${clinic.phone}` : ''}${clinic.address ? ` · ${clinic.address}` : ''}`;
  return `<div class="letterhead-footer">${escapeHtml(text)}</div>`;
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
    date?: string;
  }>;
  labOrders?: string[];
  advice?: string;
  followUp?: string;
  prescriptionNotes?: string;
  /** Strategy determines column layout: REMEDY shows Potency/Form, TITRATION shows Current Dose/Titration Notes */
  prescriptionStrategy?: 'DOSAGE' | 'REMEDY' | 'TITRATION';
}

export function generatePrescriptionHtml(data: PrescriptionPrintData): string {
  const accent = data.clinic.accentColor || '#2563EB';
  const safe = (s?: string) => (s ? escapeHtml(s) : '');

  const formattedDate = new Date(data.visit.date || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const refNumber = data.visit.visitNumber || '—';

  const contactBits: string[] = [];
  if (data.clinic.address) contactBits.push(safe(data.clinic.address));
  if (data.clinic.phone)   contactBits.push(safe(data.clinic.phone));
  if (data.clinic.email)   contactBits.push(safe(data.clinic.email));
  if (data.clinic.website) contactBits.push(safe(data.clinic.website));

  const ageGender = [
    data.patient.age ? `${safe(data.patient.age)} yrs` : null,
    data.patient.gender ? safe(data.patient.gender).charAt(0).toUpperCase() : null,
  ].filter(Boolean).join(' · ') || '—';

  // Build SOAP narrative (subjective + objective combined)
  const narrative = [data.soap?.subjective, data.soap?.objective].filter(Boolean).join('\n\n');

  const followUpDate = data.followUp
    ? null
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

  const vitalsCells = renderVitalsCells(data.vitals);
  const medsHtml = renderMedicationsLetterhead(data.medications, data.prescriptionStrategy);
  const labsHtml = data.labOrders && data.labOrders.length > 0
    ? `
      <section class="rx-section">
        <h3 class="rx-section-label">Lab Orders</h3>
        <p class="rx-narrative">${data.labOrders.map(escapeHtml).join(', ')}</p>
      </section>`
    : '';

  // ─── Resolve Header ───
  let headerHtml = data.clinic.headerHtml;
  
  // Ignore legacy seed HTML so the new premium default layout activates
  if (headerHtml && headerHtml.includes('Kreed.health Clinical Prescription')) {
    headerHtml = undefined;
  }

  if (!headerHtml) {
    const mapPinIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
    const phoneIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
    const clockIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const mailIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
    const globeIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

    headerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:28px; margin-bottom:18px; gap:30px; padding:20px 22px; background:linear-gradient(135deg, #f8fbff 0%, #ffffff 60%); border-radius:12px; box-shadow:0 2px 12px rgba(22, 101, 228, 0.06), inset 0 -1px 0 rgba(22, 101, 228, 0.08);">
        <div style="display:flex; flex-direction:column; gap:14px; flex:1; min-width:0; align-items:flex-start;">
          <div style="height:70px; min-width:70px; max-width:160px; border-radius:10px; background:#fff; display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(22, 101, 228, 0.08), inset 0 1px 2px rgba(255,255,255,0.8); flex-shrink:0; padding:4px 8px;">
            ${data.clinic.logoUrl ? `<img src="${safe(data.clinic.logoUrl)}" style="height:100%; width:auto; max-width:100%; object-fit:contain;" />` : `<span style="font-size:24px; color:#9ca3af; font-weight:bold;">${safe(data.clinic.name?.charAt(0))}</span>`}
          </div>
          <div style="display:flex; flex-direction:column; justify-content:center; min-width:0; width:100%;">
            <h2 style="font-size:1.4rem; font-weight:900; color:#0f172a; margin:0; text-transform:uppercase; letter-spacing:-0.03em; line-height:1.15; overflow-wrap:break-word; font-family:Georgia, 'Times New Roman', serif;">${safe(data.clinic.name)}</h2>
            ${data.clinic.tagline ? `<p style="font-size:0.75rem; font-weight:700; background:linear-gradient(135deg, #16a1e4 0%, #6366f1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin:3px 0 0; letter-spacing:0.02em;">${safe(data.clinic.tagline)}</p>` : ''}
            ${data.clinic.registrationNo ? `<div style="display:inline-flex; align-items:center; gap:6px; margin:8px 0 0; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:999px; padding:3px 8px 3px 5px; max-width:fit-content;"><div style="width:6px; height:6px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 2px rgba(34,197,94,0.3);"></div><span style="font-size:0.55rem; font-weight:800; color:#374151; text-transform:uppercase; letter-spacing:0.06em;">${safe(data.clinic.registrationNo)}</span></div>` : ''}
          </div>
        </div>
        <div style="text-align:right; display:flex; flex-direction:column; gap:8px; border-left:1.5px solid #e2e8f0; padding-left:16px; min-width:140px; max-width:165px; flex-shrink:0;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="font-size:0.68rem; color:#334155; font-weight:700; display:flex; align-items:flex-start; gap:5px; justify-content:flex-end; line-height:1.35;">
              ${mapPinIcon}
              <span style="overflow-wrap:break-word;">${safe(data.clinic.address) || 'Clinic Address'}</span>
            </div>
            ${data.clinic.address2 ? `<div style="font-size:0.6rem; color:#64748b; font-weight:500; padding-right:16px;">${safe(data.clinic.address2)}</div>` : ''}
          </div>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="font-size:0.68rem; color:#334155; font-weight:700; display:flex; align-items:center; gap:5px; justify-content:flex-end;">
              ${phoneIcon}
              <span>${safe(data.clinic.phone) || 'Contact'}</span>
            </div>
            ${data.clinic.timing ? `
            <div style="font-size:0.68rem; color:#334155; font-weight:700; display:flex; align-items:center; gap:5px; justify-content:flex-end;">
              ${clockIcon}
              <span>${safe(data.clinic.timing)}</span>
            </div>` : ''}
            ${data.clinic.email ? `
            <div style="font-size:0.68rem; color:#334155; font-weight:700; display:flex; align-items:center; gap:5px; justify-content:flex-end;">
              ${mailIcon}
              <span>${safe(data.clinic.email)}</span>
            </div>` : ''}
            ${data.clinic.website ? `
            <div style="font-size:0.68rem; color:#334155; font-weight:700; display:flex; align-items:center; gap:5px; justify-content:flex-end;">
              ${globeIcon}
              <span>${safe(data.clinic.website)}</span>
            </div>` : ''}
          </div>
        </div>
      </div>
      <div style="width:100%; margin-bottom:20px;">
        <div style="height:3px; width:100%; background:linear-gradient(90deg, #16a1e4 0%, #6366f1 50%, #8b5cf6 100%); border-radius:3px; box-shadow:0 1px 4px rgba(22, 101, 228, 0.25);"></div>
        <div style="height:1px; width:100%; background:#f1f5f9; margin-top:3px;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <p style="font-size:11px; font-weight:700; color:#1F2937; margin:0;">Dr. ${safe(data.doctor.name)}${data.doctor.qualification ? ` — ${safe(data.doctor.qualification)}` : ''}</p>
          ${data.doctor.registrationNumber ? `<p style="font-size:10px; color:#6B7280; font-weight:500; margin:2px 0 0;">Reg. No. ${safe(data.doctor.registrationNumber)}</p>` : ''}
        </div>
        <div style="text-align:right;">
          <p style="font-size:10px; font-weight:700; color:#6B7280; margin:0;">Date: ${formattedDate}</p>
          <p style="font-size:10px; font-weight:700; color:#6B7280; margin:2px 0 0;">Ref #RX-${safe(refNumber)}</p>
        </div>
      </div>
    `;
  }

  // ─── Resolve Footer ───
  let footerHtml = data.clinic.footerHtml;
  if (!footerHtml) {
    footerHtml = `
      <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:flex-end; gap:16px;">
        <div style="display:flex; gap:30px; flex-wrap:wrap; flex:1;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-size:0.6rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em;">Website</span>
            <div style="font-size:0.7rem; color:#334155; font-weight:600;">${safe(data.clinic.website) || 'N/A'}</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-size:0.6rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em;">Inquiries</span>
            <div style="font-size:0.7rem; color:#334155; font-weight:600;">${safe(data.clinic.email) || 'N/A'}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.65rem; color:#475569; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Secure Clinical Engine</div>
          <div style="font-size:0.55rem; color:#94a3b8; font-weight:600; margin-top:2px;">Digitally Verified</div>
        </div>
      </div>
    `;
  }

  return `
${PRINT_STYLES}
<div class="rx-page" style="--rx-accent:${accent};">

  <header>
    ${headerHtml}
  </header>

  <section class="rx-section">
    <h3 class="rx-section-label">Patient Details</h3>
    <div class="rx-patient-grid">
      <div class="rx-patient-cell">
        <span class="rx-cell-label">Patient Name</span>
        <p class="rx-cell-value">${safe(data.patient.name) || '—'}</p>
      </div>
      <div class="rx-patient-cell">
        <span class="rx-cell-label">Age / Sex</span>
        <p class="rx-cell-value">${ageGender}</p>
      </div>
      <div class="rx-patient-cell">
        <span class="rx-cell-label">Patient ID</span>
        <p class="rx-cell-value">${safe(data.patient.mrn) || '—'}</p>
      </div>
      <div class="rx-patient-cell">
        <span class="rx-cell-label">Visit Date</span>
        <p class="rx-cell-value">${formattedDate}</p>
      </div>
    </div>
    ${vitalsCells}
  </section>

  ${narrative ? `
    <section class="rx-section">
      <h3 class="rx-section-label">Clinical Summary</h3>
      <p class="rx-narrative">${escapeHtml(narrative).replace(/\n/g, '<br>')}</p>
    </section>
  ` : ''}

  ${data.diagnosis && (data.diagnosis.assessment || (data.diagnosis.icdCodes && data.diagnosis.icdCodes.length > 0)) ? `
    <section class="rx-section">
      <h3 class="rx-section-label">Diagnosis</h3>
      ${data.diagnosis.assessment ? `<p class="rx-diagnosis-text">${safe(data.diagnosis.assessment)}</p>` : ''}
      ${data.diagnosis.icdCodes && data.diagnosis.icdCodes.length > 0
        ? `<p class="rx-diagnosis-icd">(ICD-10: ${data.diagnosis.icdCodes.map(escapeHtml).join(', ')})</p>`
        : ''}
    </section>
  ` : ''}

  <section class="rx-section">
    <h3 class="rx-section-label">${data.prescriptionStrategy === 'REMEDY' ? 'Remedies' : 'Medicines'}</h3>
    ${medsHtml}
  </section>

  ${labsHtml}

  ${(data.advice || data.followUp) ? `
    <div class="rx-twocol">
      ${data.advice ? `
        <section class="rx-section" style="margin-bottom:0;">
          <h3 class="rx-section-label">Advice / Instructions</h3>
          <p class="rx-prose">${escapeHtml(data.advice).replace(/\n/g, '<br>')}</p>
        </section>
      ` : '<div></div>'}
      
      ${data.followUp ? `
        <section class="rx-section" style="margin-bottom:0;">
          <h3 class="rx-section-label">Follow-up</h3>
          <p class="rx-prose-em">${safe(data.followUp)}</p>
          ${followUpDate ? `<p class="rx-prose-meta">Suggested: ${followUpDate}</p>` : ''}
        </section>
      ` : '<div></div>'}
    </div>
  ` : ''}

  ${data.prescriptionNotes ? `
    <section class="rx-section rx-additional">
      <h3 class="rx-section-label">Additional Advisory</h3>
      <p class="rx-prose">${escapeHtml(data.prescriptionNotes).replace(/\n/g, '<br>')}</p>
    </section>
  ` : ''}

  <footer class="rx-signature">
    <p class="rx-sig-name">Dr. ${safe(data.doctor.name)}</p>
    ${data.doctor.qualification ? `<p class="rx-sig-meta">${safe(data.doctor.qualification)}</p>` : ''}
    ${data.doctor.registrationNumber ? `<p class="rx-sig-meta">Reg. No. ${safe(data.doctor.registrationNumber)}</p>` : ''}
  </footer>

  <div class="rx-print-footer">
    ${safe(data.clinic.footer || `${data.clinic.name}${data.clinic.phone ? ` · ${data.clinic.phone}` : ''}`)}
    &nbsp;·&nbsp; Printed ${new Date().toLocaleString('en-IN')}
  </div>
</div>
  `;
}

function renderVitalsCells(vitals?: PrescriptionPrintData['vitals']): string {
  if (!vitals) return '';
  const cells: Array<{ label: string; value: string }> = [];
  if (vitals.heightCm) cells.push({ label: 'Height', value: `${vitals.heightCm} cm` });
  if (vitals.weightKg) cells.push({ label: 'Weight', value: `${vitals.weightKg} kg` });
  if (vitals.bmi) cells.push({ label: 'BMI', value: vitals.bmi.toFixed(1) });
  if (vitals.temperatureF) cells.push({ label: 'Temp', value: `${vitals.temperatureF}°F` });
  if (vitals.pulseRate) cells.push({ label: 'Pulse', value: `${vitals.pulseRate}/min` });
  if (vitals.systolicBp && vitals.diastolicBp) cells.push({ label: 'BP', value: `${vitals.systolicBp}/${vitals.diastolicBp}` });
  if (vitals.oxygenSaturation) cells.push({ label: 'SpO₂', value: `${vitals.oxygenSaturation}%` });
  if (cells.length === 0) return '';

  // Pad to 7 columns to keep grid even
  while (cells.length < 7) cells.push({ label: '', value: '' });

  return `
    <div class="rx-vitals-strip">
      ${cells.slice(0, 7).map(c => `
        <div class="rx-patient-cell">
          ${c.label ? `<span class="rx-cell-label">${escapeHtml(c.label)}</span>` : ''}
          <p class="rx-cell-value" style="font-size:11px;">${escapeHtml(c.value) || '&nbsp;'}</p>
        </div>
      `).join('')}
    </div>`;
}

function renderMedicationsLetterhead(meds: PrescriptionPrintData['medications'], strategy?: string): string {
  if (meds.length === 0) {
    return `<div class="rx-meds-table"><p class="rx-meds-empty">No medications prescribed.</p></div>`;
  }

  const isRemedy = strategy === 'REMEDY';
  const isTitration = strategy === 'TITRATION';

  const headers = isRemedy
    ? ['#', 'Date', 'Remedy', 'Potency', 'Frequency', 'Duration', 'Instructions']
    : isTitration
      ? ['#', 'Date', 'Medication', 'Current Dose', 'Frequency', 'Duration', 'Titration Notes']
      : ['#', 'Date', 'Medicine', 'Dose', 'Frequency', 'Duration', 'Instructions'];

  const rows = meds.map((med, i) => {
    const numCell = `<td class="rx-md-num">${i + 1}.</td>`;
    const dateStr = med.date ? new Date(med.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
    const dateCell = `<td style="white-space:nowrap; color:#6B7280; font-size:9.5px; font-weight:700;">${dateStr}</td>`;
    const nameCell = `
      <td class="rx-md-name">
        ${escapeHtml(med.name)}
        ${med.genericName ? `<span class="rx-md-generic">(${escapeHtml(med.genericName)})</span>` : ''}
        ${med.route && !isRemedy ? `<span class="rx-md-generic">via ${escapeHtml(med.route)}</span>` : ''}
      </td>`;

    if (isRemedy) {
      return `<tr>
        ${numCell}
        ${dateCell}
        ${nameCell}
        <td>${escapeHtml(med.dosage) || '—'}</td>
        <td>${escapeHtml(med.frequency) || '—'}</td>
        <td>${escapeHtml(med.duration) || '—'}</td>
        <td>${med.instructions ? escapeHtml(med.instructions) : '—'}</td>
      </tr>`;
    }

    return `<tr>
      ${numCell}
      ${dateCell}
      ${nameCell}
      <td>${escapeHtml(med.dosage) || '—'}</td>
      <td>${escapeHtml(med.frequency) || '—'}</td>
      <td>${escapeHtml(med.duration) || '—'}</td>
      <td>${med.instructions ? escapeHtml(med.instructions) : '—'}</td>
    </tr>`;
  }).join('');

  return `
    <table class="rx-meds-table">
      <thead>
        <tr>
          ${headers.map((h, i) => `<th${i === 0 ? ' style="width:32px;text-align:center;"' : ''}>${escapeHtml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
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
