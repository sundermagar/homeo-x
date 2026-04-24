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

  async generateBill(res: Writable, data: {
    clinicName: string;
    patientName: string;
    regid: number;
    billNo: number;
    charges: number;
    received: number;
    balance: number;
    paymentMode: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        // Header
        doc.font('Helvetica-Bold').fontSize(16).text(data.clinicName, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Bill / Receipt', { align: 'center' });
        doc.moveDown(1);

        // Details
        doc.text(`Bill No: ${data.billNo}          Patient: ${data.patientName}`);
        doc.text(`RegID: ${data.regid}`);
        doc.moveDown(1);

        doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, doc.y, { continued: true, width: 250 });
        doc.text('Amount', { align: 'right' });
        
        doc.moveDown(0.3);
        doc.font('Helvetica');
        doc.text('Total Charges', 50, doc.y, { continued: true, width: 250 });
        doc.text(String(data.charges), { align: 'right' });
        
        doc.text('Received Amount', 50, doc.y, { continued: true, width: 250 });
        doc.text(String(data.received), { align: 'right' });
        
        doc.text('Balance Due', 50, doc.y, { continued: true, width: 250 });
        doc.text(String(data.balance), { align: 'right' });

        doc.moveDown(1);
        doc.text(`Payment Mode: ${data.paymentMode}`);

        doc.moveTo(50, doc.y).lineTo(540, doc.y).stroke();

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
