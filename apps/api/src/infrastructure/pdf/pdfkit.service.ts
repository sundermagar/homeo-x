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
    // 1. Draw Top Colored Band
    const pageWidth = doc.page.width;
    let grad = doc.linearGradient(0, 0, pageWidth, 0);
    grad.stop(0, '#2563EB').stop(0.7, '#60A5FA').stop(1, '#BFDBFE');
    doc.rect(0, 0, pageWidth, 6).fill(grad);

    const headerY = 40;
    const leftPadding = 40;

    let logoOffset = 0;
    let logoImage: Buffer | string | null = null;

    if (data.clinicLogo) {
      try {
        let logoPath = data.clinicLogo;
        if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
          const response = await fetch(logoPath);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            logoImage = Buffer.from(arrayBuffer);
          }
        } else if (logoPath.startsWith('/uploads')) {
          const localPath = path.join(process.cwd(), logoPath);
          if (fs.existsSync(localPath)) logoImage = localPath;
        } else if (fs.existsSync(logoPath)) {
          logoImage = logoPath;
        }

        if (logoImage) {
          // Draw logo with 64x64 size
          doc.image(logoImage, leftPadding, headerY, { width: 64, height: 64, fit: [64, 64], align: 'center', valign: 'center' });
          logoOffset = 80;
        }
      } catch (err) {
        logger.warn(`Failed to load logo: ${data.clinicLogo}`);
      }
    }

    if (!logoImage && data.clinicName) {
      // Fallback logo block
      doc.roundedRect(leftPadding, headerY, 64, 64, 8).fill('#2563EB');
      doc.font('Helvetica-Bold').fontSize(28).fillColor('#FFFFFF')
         .text(data.clinicName.charAt(0).toUpperCase(), leftPadding, headerY + 18, { width: 64, align: 'center' });
      logoOffset = 80;
    }

    const nameX = leftPadding + logoOffset;
    let currentY = headerY + 8;
    
    // Clinic Name
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#2563EB').text(data.clinicName.toUpperCase(), nameX, currentY, { lineGap: -2 });
    currentY = doc.y;

    if (data.clinicTagline) {
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#64748B').text(data.clinicTagline, nameX, currentY);
      currentY = doc.y;
    }

    if (data.clinicRegistration) {
      doc.moveDown(0.2);
      const badgeY = doc.y;
      const badgeText = data.clinicRegistration.toUpperCase();
      const badgeWidth = doc.widthOfString(badgeText) + 16;
      doc.roundedRect(nameX, badgeY, badgeWidth, 14, 4).fill('#EFF6FF');
      doc.fillColor('#3B82F6').font('Helvetica-Bold').fontSize(7).text(badgeText, nameX + 8, badgeY + 4);
      doc.y = badgeY + 16;
    }

    // Right Side: Contact info
    const contactX = 350;
    let rightY = headerY + 8;
    
    doc.fontSize(9).font('Helvetica').fillColor('#475569');

    if (data.clinicAddress) {
      doc.text(data.clinicAddress, contactX, rightY, { width: 205, align: 'right' });
      rightY = doc.y + 4;
    }
    if (data.clinicPhone) {
      doc.font('Helvetica-Bold').fillColor('#1E293B').text(`Ph: ${data.clinicPhone}`, contactX, rightY, { width: 205, align: 'right' });
      rightY = doc.y + 4;
    }
    if (data.clinicEmail) {
      doc.font('Helvetica').fillColor('#3B82F6').text(data.clinicEmail, contactX, rightY, { width: 205, align: 'right' });
      rightY = doc.y + 4;
    }
    if (data.clinicWebsite) {
      doc.font('Helvetica').fillColor('#3B82F6').text(data.clinicWebsite, contactX, rightY, { width: 205, align: 'right' });
    }

    doc.y = Math.max(doc.y, headerY + 80);
    
    // Draw a subtle divider
    doc.moveTo(leftPadding, doc.y).lineTo(555, doc.y).lineWidth(1).strokeColor('#E2E8F0').stroke();
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
    doctorName?: string;
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
        
        let detailsText = `${data.patientAge || '??'} Yrs / ${data.patientGender || 'Unspecified'}`;
        if (data.patientPhone) detailsText += ` | Ph: ${data.patientPhone}`;
        doc.fontSize(8).font('Helvetica').fillColor('#475569').text(detailsText, leftPadding, doc.y + 1);

        if (data.doctorName && data.doctorName !== '—') {
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#16A34A').text(`Assigned Doctor: Dr. ${data.doctorName}`, leftPadding, doc.y + 2);
        }

        // Right Block: Date
        const refX = 400;
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#94A3B8').text('DATE', refX, blockY, { align: 'right', width: 155 });
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E293B').text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), refX, doc.y + 2, { align: 'right', width: 155 });

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
        
        // Document Title
        doc.rect(40, doc.y, 515, 24).fill('#F1F5F9');
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#3B82F6').text('CLINICAL CASE SUMMARY', 40, doc.y - 17, { align: 'center', width: 515 });
        doc.moveDown(1.5);

        // Patient Info Block
        const startY = doc.y;
        doc.rect(40, startY, 515, 45).fill('#FAFAF9');
        doc.moveTo(40, startY).lineTo(555, startY).strokeColor('#E2E8F0').lineWidth(1).stroke();
        doc.moveTo(40, startY + 45).lineTo(555, startY + 45).strokeColor('#E2E8F0').lineWidth(1).stroke();

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#94A3B8').text('PATIENT INFO', 50, startY + 8);
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text(`${data.patient.name.toUpperCase()} (ID: ${data.patient.regid})`, 50, startY + 20);
        
        doc.font('Helvetica').fontSize(9).fillColor('#475569');
        doc.text(`Age/Gender: ${data.patient.age || 'N/A'} / ${data.patient.gender || 'N/A'}`, 250, startY + 22);
        doc.text(`Phone: ${data.patient.phone || 'N/A'}`, 400, startY + 22);
        
        doc.y = startY + 65;

        // Latest Vitals
        if (data.vitals && data.vitals.length > 0) {
          const v = data.vitals[0];
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#2563EB').text('LATEST VITALS', 40, doc.y);
          doc.moveDown(0.3);
          doc.rect(40, doc.y, 515, 24).fill('#EFF6FF');
          doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
          doc.text(`BP: ${v.systolicBp || '-'}/${v.diastolicBp || '-'} mmHg   |   Pulse: ${v.pulseRate || '-'} bpm   |   Temp: ${v.temperatureF || '-'} °F   |   Weight: ${v.weightKg || '-'} kg`, 50, doc.y - 16);
          doc.y += 15;
        }

        // Homeo Evaluation
        if (data.homeo) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#2563EB').text('HOMEOPATHIC EVALUATION', 40, doc.y);
          doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
          doc.moveDown(0.5);
          
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text('Thermal: ', { continued: true });
          doc.font('Helvetica').fillColor('#1E293B').text(`${data.homeo.thermal || 'Not Specified'}`);
          
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text('Constitutional: ', { continued: true });
          doc.font('Helvetica').fillColor('#1E293B').text(`${data.homeo.constitutional || 'Not Specified'}`);
          
          doc.moveDown(1);
        }

        // Recent Follow-up Notes
        if (data.notes && data.notes.length > 0) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#2563EB').text('RECENT FOLLOW-UP NOTES', 40, doc.y);
          doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
          doc.moveDown(0.5);
          
          data.notes.slice(0, 5).forEach(n => {
            const yBefore = doc.y;
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#94A3B8').text(n.dateval || 'Date N/A', 40, doc.y);
            doc.font('Helvetica').fontSize(9).fillColor('#334155').text(n.notes, 120, yBefore, { width: 435 });
            doc.moveDown(0.5);
          });
          doc.moveDown(1);
        }

        // Active Prescriptions Table
        if (data.prescriptions && data.prescriptions.length > 0) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#2563EB').text('ACTIVE PRESCRIPTIONS', 40, doc.y);
          doc.moveDown(0.5);

          let y = doc.y;
          doc.rect(40, y, 515, 20).fill('#F1F5F9');
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
          doc.text('MEDICINE / REMEDY', 45, y + 6, { width: 200 });
          doc.text('POTENCY', 250, y + 6, { width: 100 });
          doc.text('FREQUENCY', 350, y + 6, { width: 100 });
          doc.text('DAYS', 450, y + 6, { width: 60 });
          
          y += 24;
          doc.font('Helvetica').fontSize(9).fillColor('#1E293B');

          data.prescriptions.slice(0, 10).forEach((p, idx) => {
            if (idx % 2 !== 0) {
              doc.rect(40, y - 4, 515, 20).fill('#F8FAFC');
              doc.fillColor('#1E293B');
            }
            doc.text(p.medicine || '—', 45, y, { width: 200 });
            doc.text(p.potency || '—', 250, y, { width: 100 });
            doc.text(p.frequency || '—', 350, y, { width: 100 });
            doc.text(String(p.days || '—'), 450, y, { width: 60 });
            
            y += 20;
          });
          
          doc.y = y + 10;
        }

        // Footer
        const pageHeight = doc.page.height;
        doc.fontSize(8).fillColor('#94A3B8').text('This is a computer generated clinical summary.', 40, pageHeight - 40, { align: 'center' });

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
