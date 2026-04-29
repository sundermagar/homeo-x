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
    patientName: string;
    regid: number;
    potencies: any[];
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        
        // Pipe the document explicitly to the writable response stream
        doc.pipe(res);

        // Header
        doc.font('Helvetica-Bold').fontSize(16).text(data.clinicName, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Prescription', { align: 'center' });
        doc.moveDown(1);

        // Patient details
        doc.fontSize(10).text(`Patient: ${data.patientName}          RegID: ${data.regid}`);
        doc.moveDown(1);

        // Remedies table header
        const widths = [140, 90, 90, 50, 80];
        let y = doc.y;
        doc.font('Helvetica-Bold');
        const headers = ['Medicine', 'Potency', 'Frequency', 'Days', 'Date'];
        let x = 50;
        headers.forEach((h, i) => {
          doc.text(h, x, y, { width: widths[i]!, align: 'left' });
          x += widths[i]!;
        });
        y += 18;
        doc.moveTo(50, y).lineTo(540, y).stroke();
        y += 6;

        // Potencies rows
        doc.font('Helvetica');
        data.potencies.forEach((p) => {
          if (y > 740) { doc.addPage(); y = 50; }
          x = 50;
          [
            p.medicine || '', 
            p.potency || '', 
            p.frequency || '', 
            String(p.days || ''), 
            p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : ''
          ].forEach((cell, i) => {
            doc.text(cell, x, y, { width: widths[i]!, align: 'left' });
            x += widths[i]!;
          });
          y += 16;
        });

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
