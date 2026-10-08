import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// 1. Read SH_LOGO_BASE64 from logoBase64.ts
const logoFileContent = fs.readFileSync('d:/NEW SPH FRESH/Version/app/app/APPS/mobile/src/utils/logoBase64.ts', 'utf8');
const logoMatch = logoFileContent.match(/export const SH_LOGO_BASE64 = "(.*?)";/);
const SH_LOGO_BASE64 = logoMatch ? logoMatch[1] : '';

const BUCKET = 'spiritual-homeopathy-3b552.firebasestorage.app';
const API_URL = 'https://partnersv1.pinbot.ai/v3/1303340612865892/messages';
const API_KEY = '2731e63f-a853-11f1-afb3-02c8a5e042bd';
const TO = '918374062188';

const patientName = 'Mahesh babu';
const patientPhone = '8374062188';
const docName = 'Dr. Prashanth K Vaidya';
const branchName = 'Nallagandla Branch';
const invCode = 'INV-T9T56E';
const totalAmount = '658.00';
const currentDate = '29-09-2026';
const currentTime = '03:30 PM';

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px 24px; color: #0f172a; margin: 0; background: #fff; line-height: 1.5; box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; margin-bottom: 4px; }
    .brand-title { color: #0284c7; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
    .brand-sub { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 600; }
    .lime-bar { height: 5px; background: #99cc00; width: 100%; margin: 8px 0 16px 0; border-radius: 3px; }
    .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .receipt-title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
    .receipt-badge { background: #e0f2fe; color: #0284c7; padding: 4px 14px; border-radius: 16px; font-weight: 800; font-size: 11px; letter-spacing: 0.5px; }
    .section-head { font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 10px; letter-spacing: 0.8px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; margin-bottom: 18px; font-size: 13px; }
    .grid-cell { border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.4px; }
    .val { font-weight: 800; color: #0f172a; font-size: 13.5px; }
    .pay-box { background: #e6f7ed; border: 2px dashed #86efac; border-radius: 12px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .pay-amt { font-size: 28px; font-weight: 900; color: #15803d; margin-top: 2px; }
    .paid-badge { background: #22c55e; color: #fff; padding: 5px 16px; border-radius: 16px; font-weight: 800; font-size: 12px; display: inline-block; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px; }
    th { background: #f8fafc; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 800; border-bottom: 1.5px solid #cbd5e1; color: #475569; letter-spacing: 0.4px; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
    .meta-info { font-size: 10.5px; color: #64748b; line-height: 1.5; margin-bottom: 16px; margin-top: 10px; }
    .footer-bar { background: #99cc00; color: #fff; padding: 8px 14px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 800; margin-top: 18px; flex-wrap: wrap; gap: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <img src="data:image/png;base64,${SH_LOGO_BASE64}" width="240" height="48" style="height: 48px; width: 240px; object-fit: contain; display: block;" alt="SPIRITUAL HOMEOPATHY" />
    </div>
    <div style="text-align: right; font-size: 10.5px; font-weight: 700; color: #334155; line-height: 1.4;">
      <div>spiritualhomeoclinic.com</div>
      <div style="color: #64748b; font-weight: 500;">support@spiritualhomeoclinic.com</div>
    </div>
  </div>
  <div class="lime-bar"></div>
  <div class="title-row">
    <h1 class="receipt-title">PAYMENT RECEIPT</h1>
    <span class="receipt-badge">RECEIPT</span>
  </div>
  <div class="section-head">PATIENT DETAILS</div>
  <div class="grid">
    <div class="grid-cell"><div class="label">PATIENT NAME</div><div class="val">${patientName}</div></div>
    <div class="grid-cell"><div class="label">PHONE NUMBER</div><div class="val">+91 ${patientPhone}</div></div>
    <div class="grid-cell"><div class="label">CONSULTANT DOCTOR</div><div class="val">${docName}</div></div>
    <div class="grid-cell"><div class="label">CLINIC BRANCH</div><div class="val">${branchName}</div></div>
    <div class="grid-cell"><div class="label">APPOINTMENT SCHEDULE</div><div class="val">${currentDate} at ${currentTime}</div></div>
    <div class="grid-cell"><div class="label">SPECIALTY</div><div class="val">Homeopathy</div></div>
  </div>
  <div class="section-head">PAYMENT INFORMATION</div>
  <div class="pay-box">
    <div>
      <div class="label" style="color: #166534;">TOTAL AMOUNT PAID</div>
      <div class="pay-amt">₹${totalAmount}</div>
    </div>
    <div style="text-align: right;">
      <span class="paid-badge">PAID ✓</span>
      <div style="font-size: 10.5px; font-weight: 800; color: #166534; margin-top: 4px; text-transform: uppercase;">VIA UPI</div>
    </div>
  </div>
  <div class="section-head">FEE BREAKDOWN</div>
  <table>
    <thead><tr><th>DESCRIPTION</th><th style="text-align: right;">AMOUNT (₹)</th></tr></thead>
    <tbody>
      <tr><td>Consultation Fee</td><td style="text-align: right; font-weight: 700;">₹350.00</td></tr>
      <tr><td>Medicine Fee (1 Month)</td><td style="text-align: right; font-weight: 700;">₹308.00</td></tr>
      <tr style="font-weight: 800;"><td>Payment Mode (UPI)</td><td style="text-align: right;">₹${totalAmount}</td></tr>
    </tbody>
  </table>
  <div class="meta-info">
    <div>Payment ID: WALKIN_UPI</div>
    <div>Issued At: ${currentDate}, ${currentTime}</div>
    <div style="text-align: center; margin-top: 10px; color: #94a3b8;">This is a computer generated bill. No signature is required.</div>
  </div>
  <div class="footer-bar">
    <div style="white-space: nowrap;">📞 9069 176 176</div>
    <div style="white-space: nowrap;">✉️ support@spiritualhomeoclinic.com</div>
    <div style="white-space: nowrap;">🌐 spiritualhomeoclinic.com</div>
    <div style="white-space: nowrap;">📍 ${branchName.toUpperCase()}</div>
  </div>
</body>
</html>
`;

async function main() {
  const htmlPath = path.resolve('d:/NEW SPH FRESH/Version/app/app/APPS/scratch/official_invoice_test.html');
  const pdfPath = path.resolve('d:/NEW SPH FRESH/Version/app/app/APPS/scratch/official_invoice_test.pdf');
  
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('Saved official HTML to:', htmlPath);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  console.log('Rendering high-res official PDF with Edge...');
  execSync(cmd);
  console.log('Rendered PDF successfully to:', pdfPath);

  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log('PDF Size bytes:', pdfBuffer.length);

  // Upload to Firebase Storage
  const filename = `Official_Invoice_${invCode}.pdf`;
  const encodedName = encodeURIComponent(`invoices/${filename}`);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${encodedName}`;

  console.log('Uploading official PDF to Firebase Storage...');
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: pdfBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Firebase upload failed: ${uploadRes.status} ${errText}`);
  }

  const data = await uploadRes.json();
  const token = data.downloadTokens || '';
  const publicPdfUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedName}?alt=media&token=${token}`;
  console.log('Uploaded Official PDF URL:', publicPdfUrl);

  // Send WhatsApp invoice_pdf
  console.log('Sending invoice_pdf WhatsApp message...');
  const waRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TO,
      type: 'template',
      template: {
        name: 'invoice_pdf',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  link: publicPdfUrl,
                  filename: `SPH_Invoice_${invCode}.pdf`
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: patientName }
            ]
          }
        ]
      }
    })
  });

  const waData = await waRes.json();
  console.log('WhatsApp Delivery Result:', JSON.stringify(waData, null, 2));
}

main().catch(console.error);
