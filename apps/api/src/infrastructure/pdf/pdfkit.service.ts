import PDFDocument from 'pdfkit';
import { createLogger } from '../../shared/logger';
import type { Writable } from 'stream';

const logger = createLogger('pdfkit-service');

export class PdfkitServiceAdapter {
  /**
   * Generates a basic PDF buffer or pipe it directly to a response stream.
   * @param res The Express response stream (Writable)
   * @param data Any data to inject
   */
  async generatePrescription(res: Writable, data: {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    regid: number;
    potencies: any[];
    settings?: any;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        // ─── Header (Letterhead Format) ───
        doc.font('Helvetica-Bold').fontSize(22).fillColor('#1E1B4B').text(data.clinicName, { align: 'center' });
        
        if (data.clinicAddress || data.clinicPhone) {
          doc.fontSize(10).font('Helvetica').fillColor('#4B5563').text(`${data.clinicAddress || ''}${data.clinicAddress && data.clinicPhone ? ' | ' : ''}${data.clinicPhone || ''}`, { align: 'center' });
        }
        
        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
        doc.moveDown(1.5);

        // ─── Patient Details Info Bar ───
        doc.rect(40, doc.y, 515, 25).fill('#F8FAFC');
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(10);
        
        const infoY = doc.y + 7;
        doc.text('PATIENT:', 50, infoY, { continued: true });
        doc.font('Helvetica').text(` ${data.patientName}`, { continued: true });
        
        doc.font('Helvetica-Bold').text('   |   AGE/GENDER:', { continued: true });
        doc.font('Helvetica').text(` ${data.patientAge || '—'} / ${data.patientGender || '—'}`, { continued: true });
        
        doc.font('Helvetica-Bold').text('   |   REG ID:', { continued: true });
        doc.font('Helvetica').text(` ${data.regid}`);
        
        doc.moveDown(2);

        // ─── Rx Symbol ───
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#1E1B4B').text('Rx', 40, doc.y);
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
    patient: any;
    vitals: any[];
    homeo: any;
    notes: any[];
    prescriptions: any[];
    investigations: any[];
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        // Header
        doc.font('Helvetica-Bold').fontSize(16).text(data.clinicName, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Clinical Case Summary', { align: 'center' });
        doc.moveDown(1);

        // Patient Info Section
        doc.font('Helvetica-Bold').fontSize(12).text('Patient Information');
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Name: ${data.patient.name} (${data.patient.regid})`);
        doc.text(`Age/Gender: ${data.patient.age || ''} / ${data.patient.gender || ''}`);
        doc.text(`Phone: ${data.patient.phone || ''}`);
        doc.moveDown(1);

        // Latest Vitals
        if (data.vitals && data.vitals.length > 0) {
          const v = data.vitals[0];
          doc.font('Helvetica-Bold').fontSize(12).text('Latest Vitals');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(10);
          doc.text(`BP: ${v.systolicBp || '-'}/${v.diastolicBp || '-'} mmHg  |  Pulse: ${v.pulseRate || '-'} bpm  |  Temp: ${v.temperatureF || '-'} F`);
          doc.text(`BMI: ${v.bmi || '-'} (Weight: ${v.weightKg || '-'} kg, Height: ${v.heightCm || '-'} cm)`);
          doc.moveDown(1);
        }

        // Homeo Evaluation
        if (data.homeo) {
          doc.font('Helvetica-Bold').fontSize(12).text('Homeopathic Evaluation');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(10);
          doc.text(`Thermal: ${data.homeo.thermal || '-'}`);
          doc.text(`Constitutional: ${data.homeo.constitutional || '-'}`);
          doc.moveDown(1);
        }

        // Recent Follow-up History
        if (data.notes && data.notes.length > 0) {
          doc.font('Helvetica-Bold').fontSize(12).text('Recent Follow-up Notes');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(9);
          data.notes.slice(0, 5).forEach(n => {
            doc.font('Helvetica-Bold').text(`${n.dateval || 'N/A'}:`, { continued: true });
            doc.font('Helvetica').text(` ${n.notes}`);
          });
          doc.moveDown(1);
        }

        // Active Prescriptions
        if (data.prescriptions && data.prescriptions.length > 0) {
          doc.font('Helvetica-Bold').fontSize(12).text('Active Prescriptions');
          doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(9);
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
