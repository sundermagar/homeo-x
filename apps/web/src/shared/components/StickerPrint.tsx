import React from 'react';

interface StickerPrintProps {
  patientName: string;
  regid: string;
  age?: string;
  gender?: string;
  date: string;
  consultationFee?: string;
  tokenNo?: number;
  clinicName?: string;
}

export const StickerPrint = React.forwardRef<HTMLDivElement, StickerPrintProps>((props, ref) => {
  const {
    patientName,
    regid,
    age,
    gender,
    date,
    consultationFee,
    tokenNo,
    clinicName = 'Homoeo Home'
  } = props;

  return (
    <div style={{ display: 'none' }}>
      <div ref={ref} className="sticker-print-container">
        <style>{`
          @media print {
            @page {
              size: 50mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
            .sticker-print-container {
              width: 50mm;
              height: 25mm;
              padding: 1mm 2mm;
              box-sizing: border-box;
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: white;
            }
            .sticker-header {
              font-size: 8pt;
              font-weight: bold;
              text-align: center;
              border-bottom: 0.2mm solid #000;
              padding-bottom: 0.5mm;
              margin-bottom: 0.5mm;
              text-transform: uppercase;
            }
            .sticker-body {
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              gap: 0.2mm;
            }
            .sticker-row {
              display: flex;
              justify-content: space-between;
              font-size: 7pt;
              line-height: 1.1;
            }
            .sticker-patient-name {
              font-size: 8pt;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .sticker-footer {
              display: flex;
              justify-content: space-between;
              font-size: 6pt;
              border-top: 0.1mm solid #eee;
              padding-top: 0.3mm;
              margin-top: 0.3mm;
            }
            .token-badge {
              font-weight: bold;
              font-size: 9pt;
            }
          }
        `}</style>
        
        <div className="sticker-header">{clinicName}</div>
        
        <div className="sticker-body">
          <div className="sticker-patient-name">{patientName}</div>
          <div className="sticker-row">
            <span>ID: {regid}</span>
            <span>{gender}/{age}</span>
          </div>
          <div className="sticker-row">
            <span>Date: {date}</span>
            {consultationFee && <span>Fee: ₹{consultationFee}</span>}
          </div>
        </div>

        <div className="sticker-footer">
          <span>Status: Waiting</span>
          {tokenNo && <span className="token-badge">Token: #{tokenNo}</span>}
        </div>
      </div>
    </div>
  );
});

StickerPrint.displayName = 'StickerPrint';
