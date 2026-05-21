import PDFDocument from 'pdfkit';
import { createLogger } from '../../shared/logger.js';
import type { Writable } from 'stream';
import path from 'path';
import fs from 'fs';

const logger = createLogger('pdfkit-service');

export class PdfkitServiceAdapter {
  /**
   * Generates a basic PDF buffer or pipe it directly to a response stream.
   * @param res The Express response stream (Writable)
   * @param data Any data to inject
   */
  private async drawHeader(doc: any, data: {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    clinicWebsite?: string;
    clinicLogo?: string;
    clinicTagline?: string;
    clinicRegistration?: string;
    clinicTiming?: string;
  }) {
    const headerY = doc.y;
    const leftPadding = 40;
    const contentWidth = 515;

    // 1. Logo & Clinic Identity (Left Side)
    let logoOffset = 0;
    if (data.clinicLogo) {
      try {
        let logoPath = data.clinicLogo;
        if (logoPath.startsWith('/uploads')) {
          logoPath = path.join(process.cwd(), logoPath);
        }
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, leftPadding, headerY, { height: 50 });
          logoOffset = 65;
        }
      } catch (err) {
        logger.warn(`Failed to load logo: ${data.clinicLogo}`);
      }
    }

    const nameX = leftPadding + logoOffset;
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0F172A').text(data.clinicName.toUpperCase(), nameX, headerY, { lineGap: -2 });

    if (data.clinicTagline) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6366F1').text(data.clinicTagline, nameX, doc.y);
    }

    if (data.clinicRegistration) {
      const badgeY = doc.y + 4;
      const badgeText = data.clinicRegistration.toUpperCase();
      const badgeWidth = doc.widthOfString(badgeText) + 12;

      doc.roundedRect(nameX, badgeY, badgeWidth, 12, 3).fill('#F0FDF4');
      doc.fillColor('#15803D').font('Helvetica-Bold').fontSize(6).text(badgeText, nameX + 6, badgeY + 3.5);
      doc.y = badgeY + 15;
    }

    // 2. Contact Section (Right Side)
    const contactX = 400;
    const dividerX = contactX - 15;

    let rightY = headerY;
    doc.fontSize(8).font('Helvetica').fillColor('#334155');

    if (data.clinicAddress) {
      doc.text(data.clinicAddress, contactX, rightY, { width: 155, align: 'left' });
      rightY = doc.y + 3;
    }

    if (data.clinicPhone) {
      doc.font('Helvetica-Bold').text(`Ph: ${data.clinicPhone}`, contactX, rightY, { width: 155, align: 'left' });
      rightY = doc.y + 3;
    }

    if (data.clinicTiming) {
      doc.font('Helvetica').text(`Hours: ${data.clinicTiming}`, contactX, rightY, { width: 155, align: 'left' });
    }

    doc.y = Math.max(doc.y, headerY + 70);

    doc.moveDown(1.5);
  }

  async generatePrescription(res: Writable, data: {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    clinicWebsite?: string;
    clinicLogo?: string;
    clinicTagline?: string;
    clinicRegistration?: string;
    clinicTiming?: string;
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    patientPhone?: string;
    patientAddress?: string;
    diagnosis?: string;
    followUpNote?: string;
    regid: number;
    potencies: any[];
    settings?: any;
  }): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        // ─── Header (Letterhead Identity Designer Format) ───
        await this.drawHeader(doc, data);

        // ─── Patient & Date Reference Blocks ───
        const leftPadding = 40;
        const blockY = doc.y;

        // Left Block: Patient Details
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#94A3B8').text('PATIENT DETAILS', leftPadding, blockY);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E293B').text(data.patientName.toUpperCase(), leftPadding, doc.y + 2);
        doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`${data.patientAge || '??'} Yrs / ${data.patientGender || 'Unspecified'}`, leftPadding, doc.y + 1);

        // Right Block: Date & Reference
        const refX = 400;
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#94A3B8').text('DATE & REFERENCE', refX, blockY, { align: 'right', width: 155 });
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E293B').text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), refX, doc.y + 2, { align: 'right', width: 155 });
        doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`REF: #RX-${data.regid}-${new Date().getTime().toString().slice(-4)}`, refX, doc.y + 1, { align: 'right', width: 155 });

        doc.y = Math.max(doc.y, blockY + 45);
        doc.moveDown(2);

        // ─── Diagnosis Section (if present) ───
        if (data.diagnosis) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B').text('DIAGNOSIS:', leftPadding, doc.y, { continued: true });
          doc.font('Helvetica').text(` ${data.diagnosis.toUpperCase()}`);
          doc.moveDown(1);
        }

        // ─── Rx Section ───
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#CBD5E1').text('Rx', leftPadding);
        doc.moveDown(0.5);
        doc.moveDown(0.5);

        // ─── Remedies Table ───
        const widths = [180, 100, 100, 60, 75];
        let y = doc.y;

        // Table Header Background
        doc.rect(40, y, 515, 20).fill('#F1F5F9');
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9);

        const headers = ['MEDICINE / REMEDY', 'POTENCY', 'FREQUENCY', 'DAYS', 'DATE'];
        let x = 45;
        headers.forEach((h, i) => {
          doc.text(h, x, y + 6, { width: widths[i]!, align: 'left' });
          x += widths[i]!;
        });

        y += 26;
        doc.font('Helvetica').fontSize(10).fillColor('#1E293B');

        // Rows
        data.potencies.forEach((p, index) => {
          if (y > 740) {
            doc.addPage();
            y = 50;
            // Redraw header on new page if needed or just continue
          }

          // Alternating row background
          if (index % 2 === 0) {
            doc.rect(40, y - 4, 515, 20).fill('#FBFCFE');
          }

          doc.fillColor('#1E293B');
          x = 45;
          const rowData = [
            p.medicine || p.remedyName || '—',
            p.potency || p.potencyName || '—',
            p.frequency || p.frequencyTitle || '—',
            String(p.days || '—'),
            p.createdAt ? new Date(p.createdAt).toLocaleDateString() : (p.dateval || '—')
          ];

          rowData.forEach((cell, i) => {
            doc.text(cell, x, y, { width: widths[i]!, align: 'left' });
            x += widths[i]!;
          });

          y += 20;
          doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#F1F5F9').lineWidth(0.5).stroke();
        });

        // ─── Follow-up & Advice Section ───
        if (data.followUpNote) {
          doc.moveDown(2);
          const currentY = doc.y;
          if (currentY > 700) doc.addPage();

          doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E1B4B').text('FOLLOW-UP NOTES / ADVICE:');
          doc.moveTo(40, doc.y).lineTo(200, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(10).fillColor('#334155').text(data.followUpNote, { width: 515, align: 'left', lineGap: 2 });
        }

        // ─── Footer ───
        const pageHeight = doc.page.height;
        doc.fontSize(8).fillColor('#94A3B8').text('This is a computer generated prescription.', 40, pageHeight - 60, { align: 'center' });

        doc.end();

        res.on('finish', resolve);
        res.on('error', reject);
      } catch (err: any) {
        logger.error(`Failed to generate prescription PDF: ${err.message}`);
        reject(err);
      }
    });
  }

  async generateClinicalSummary(res: Writable, data: {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    clinicWebsite?: string;
    clinicLogo?: string;
    clinicTagline?: string;
    clinicRegistration?: string;
    clinicTiming?: string;
    patient: any;
    vitals: any[];
    homeo: any;
    notes: any[];
    prescriptions: any[];
    investigations: any[];
  }): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        // Header
        await this.drawHeader(doc, data);
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#6366F1').text('Clinical Case Summary', { align: 'center' });
        doc.moveDown(1);

        // Patient Info Section
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Patient Information');
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10).fillColor('#334155');
        doc.text(`Name: ${data.patient.name} (${data.patient.regid})`);
        doc.text(`Age/Gender: ${data.patient.age || ''} / ${data.patient.gender || ''}`);
        doc.text(`Phone: ${data.patient.phone || ''}`);
        doc.moveDown(1);

        // Latest Vitals
        if (data.vitals && data.vitals.length > 0) {
          const v = data.vitals[0];
          doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Latest Vitals');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(10).fillColor('#334155');
          doc.text(`BP: ${v.systolicBp || '-'}/${v.diastolicBp || '-'} mmHg  |  Pulse: ${v.pulseRate || '-'} bpm  |  Temp: ${v.temperatureF || '-'} F`);
          doc.text(`BMI: ${v.bmi || '-'} (Weight: ${v.weightKg || '-'} kg, Height: ${v.heightCm || '-'} cm)`);
          doc.moveDown(1);
        }

        // Homeo Evaluation
        if (data.homeo) {
          doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Homeopathic Evaluation');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(10).fillColor('#334155');
          doc.text(`Thermal: ${data.homeo.thermal || '-'}`);
          doc.text(`Constitutional: ${data.homeo.constitutional || '-'}`);
          doc.moveDown(1);
        }

        // Recent Follow-up History
        if (data.notes && data.notes.length > 0) {
          doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Recent Follow-up Notes');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(9).fillColor('#334155');
          data.notes.slice(0, 5).forEach(n => {
            doc.font('Helvetica-Bold').text(`${n.dateval || 'N/A'}:`, { continued: true });
            doc.font('Helvetica').text(` ${n.notes}`);
          });
          doc.moveDown(1);
        }

        // Active Prescriptions
        if (data.prescriptions && data.prescriptions.length > 0) {
          doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Active Prescriptions');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(9).fillColor('#334155');
          data.prescriptions.slice(0, 10).forEach(p => {
            doc.text(`${p.medicine || 'Remedy'} ${p.potency || ''} — ${p.frequency || ''} for ${p.days || '0'} days`);
          });
          doc.moveDown(1);
        }

        doc.end();
        res.on('finish', resolve);
        res.on('error', reject);
      } catch (err: any) {
        logger.error(`Failed to generate Clinical Summary PDF: ${err.message}`);
        reject(err);
      }
    });
  }

  async generateBill(res: Writable, data: {
    clinicName: string;
    patientName: string;
    regid: number;
    billNo: string | number;
    charges: number | string;
    received: number | string;
    balance: number | string;
    paymentMode: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        // Header
        doc.font('Helvetica-Bold').fontSize(16).text(data.clinicName, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Invoice / Receipt', { align: 'center' });
        doc.moveDown(2);

        // Bill Info
        doc.fontSize(10);
        doc.text(`Bill No: ${data.billNo}          Date: ${new Date().toISOString().split('T')[0]}`);
        doc.moveDown(0.5);
        doc.text(`Patient: ${data.patientName}          RegID: ${data.regid}`);
        doc.moveDown(1.5);

        // Financials Table
        doc.font('Helvetica-Bold').text('Description', 50, doc.y, { continued: true });
        doc.text('Amount', { align: 'right' });
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.font('Helvetica');
        doc.text('Consultation / Treatment Charges', 50, doc.y, { continued: true });
        doc.text(`Rs. ${data.charges}`, { align: 'right' });
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold');
        doc.text('Summary', 350, doc.y);
        doc.moveTo(350, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica');
        doc.text('Total Charges:', 350, doc.y, { continued: true });
        doc.text(`Rs. ${data.charges}`, { align: 'right' });
        doc.text('Received Amount:', 350, doc.y, { continued: true });
        doc.text(`Rs. ${data.received}`, { align: 'right' });
        doc.font('Helvetica-Bold');
        doc.text('Balance Due:', 350, doc.y, { continued: true });
        doc.text(`Rs. ${data.balance}`, { align: 'right' });
        doc.moveDown(1);

        doc.font('Helvetica-Oblique').fontSize(9).text(`Payment Mode: ${data.paymentMode}`, 50, doc.y);

        doc.moveDown(4);
        doc.font('Helvetica').fontSize(10).text('Authorized Signatory', { align: 'right' });

        doc.end();
        res.on('finish', resolve);
        res.on('error', reject);
      } catch (err: any) {
        logger.error(`Failed to generate Bill PDF: ${err.message}`);
        reject(err);
      }
    });
  }
}
