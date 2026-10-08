import fs from 'fs';

function generateInvoicePdf({
  patientName = 'Mahesh babu',
  phone = '8374062188',
  invoiceId = 'INV-T9T56E',
  date = '29-09-2026',
  branch = 'Nallagandla Branch',
  doctorName = 'Dr. Prashanth K Vaidya',
  totalPaid = 658,
  paymentMode = 'UPI',
  items = [
    { description: 'Consultation & Clinical Evaluation', amount: 350 },
    { description: 'Homeopathy Medicine Dispensation (1 Month)', amount: 308 }
  ]
}) {
  const content = [];
  
  // Header accent bar (green)
  content.push('0.6 0.8 0.0 rg'); // RGB for #99cc00
  content.push('40 760 532 6 re f'); // Top bar

  // Clinic Title & Subtitle
  content.push('0.008 0.518 0.780 rg'); // #0284c7 Primary blue
  content.push('BT');
  content.push('/F2 20 Tf');
  content.push('40 730 Td');
  content.push('(SPIRITUAL HOMEOPATHY CLINICS) Tj');
  content.push('ET');

  content.push('0.28 0.33 0.41 rg'); // Slate
  content.push('BT');
  content.push('/F1 10 Tf');
  content.push('40 714 Td');
  content.push('(Multi-Speciality Classical Homeopathy Clinics) Tj');
  content.push('ET');

  // Contact info right aligned
  content.push('BT');
  content.push('/F1 9 Tf');
  content.push('380 730 Td');
  content.push('(Helpline: 9069 176 176) Tj');
  content.push('0 -14 Td');
  content.push('(www.spiritualhomeoclinic.com) Tj');
  content.push('ET');

  // Horizontal divider
  content.push('0.85 0.88 0.92 rg');
  content.push('40 695 532 1 re f');

  // Title: PAYMENT RECEIPT
  content.push('0.06 0.09 0.16 rg');
  content.push('BT');
  content.push('/F2 16 Tf');
  content.push('40 665 Td');
  content.push('(OFFICIAL PAYMENT RECEIPT) Tj');
  content.push('ET');

  // PAID Badge
  content.push('0.13 0.77 0.37 rg'); // Green
  content.push('480 660 92 24 re f');
  content.push('1 1 1 rg'); // White text
  content.push('BT');
  content.push('/F2 11 Tf');
  content.push('506 667 Td');
  content.push('(PAID) Tj');
  content.push('ET');

  // Patient & Receipt Details Grid Box
  content.push('0.96 0.98 1.00 rg'); // Soft blue-gray bg
  content.push('40 550 532 95 re f');
  content.push('0.85 0.91 0.96 rg');
  content.push('40 550 532 95 re S');

  content.push('0.3 0.35 0.4 rg');
  content.push('BT');
  content.push('/F1 9 Tf');
  content.push('55 625 Td (PATIENT NAME) Tj');
  content.push('0 -22 Td (RECEIPT NO) Tj');
  content.push('0 -22 Td (CONSULTING DOCTOR) Tj');
  content.push('320 625 Td (DATE & TIME) Tj');
  content.push('0 -22 Td (PHONE NUMBER) Tj');
  content.push('0 -22 Td (CLINIC BRANCH) Tj');
  content.push('ET');

  content.push('0.06 0.09 0.16 rg');
  content.push('BT');
  content.push('/F2 11 Tf');
  content.push(`55 613 Td (${patientName}) Tj`);
  content.push(`0 -22 Td (${invoiceId}) Tj`);
  content.push(`0 -22 Td (${doctorName}) Tj`);
  content.push(`320 613 Td (${date}) Tj`);
  content.push(`0 -22 Td (+91 ${phone}) Tj`);
  content.push(`0 -22 Td (${branch}) Tj`);
  content.push('ET');

  // Table Header
  content.push('0.94 0.96 0.98 rg');
  content.push('40 505 532 25 re f');
  content.push('0.2 0.25 0.3 rg');
  content.push('BT');
  content.push('/F2 10 Tf');
  content.push('55 513 Td (DESCRIPTION / SERVICE) Tj');
  content.push('450 513 Td (AMOUNT (INR)) Tj');
  content.push('ET');

  // Table Items
  let y = 480;
  items.forEach((item, idx) => {
    content.push('0.1 0.15 0.2 rg');
    content.push('BT');
    content.push('/F1 10.5 Tf');
    content.push(`55 ${y} Td (${idx + 1}. ${item.description}) Tj`);
    content.push(`470 ${y} Td (Rs.${Number(item.amount).toFixed(2)}) Tj`);
    content.push('ET');
    
    // Light line
    content.push('0.9 0.92 0.95 rg');
    content.push(`40 ${y - 8} 532 0.5 re f`);
    y -= 25;
  });

  // Total Summary Box
  y -= 10;
  content.push('0.90 0.97 0.92 rg'); // Light green bg
  content.push(`40 ${y - 45} 532 45 re f`);
  content.push('0.52 0.93 0.67 rg');
  content.push(`40 ${y - 45} 532 45 re S`);

  content.push('0.08 0.5 0.24 rg');
  content.push('BT');
  content.push('/F2 11 Tf');
  content.push(`55 ${y - 22} Td (TOTAL PAID (${paymentMode})) Tj`);
  content.push('/F2 16 Tf');
  content.push(`440 ${y - 24} Td (Rs.${Number(totalPaid).toFixed(2)}) Tj`);
  content.push('ET');

  // Notes & Footer
  content.push('0.4 0.45 0.5 rg');
  content.push('BT');
  content.push('/F1 8.5 Tf');
  content.push('40 100 Td (1. This is a computer generated receipt from Spiritual Homeopathy Clinics. No signature required.) Tj');
  content.push('0 -14 Td (2. Keep this receipt for your records and medical follow-up consultations.) Tj');
  content.push('0 -14 Td (3. For assistance, appointment rescheduling or queries, call our helpline at 9069 176 176.) Tj');
  content.push('ET');

  // Bottom green bar
  content.push('0.6 0.8 0.0 rg');
  content.push('40 40 532 4 re f');

  const streamData = content.join('\n');
  const streamLength = Buffer.byteLength(streamData, 'utf-8');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /MediaBox [0 0 612 792]
   /Resources <<
     /Font <<
       /F1 4 0 R
       /F2 5 0 R
     >>
   >>
   /Contents 6 0 R
>>
endobj
4 0 obj
<< /Type /Font
   /Subtype /Type1
   /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Type /Font
   /Subtype /Type1
   /BaseFont /Helvetica-Bold
>>
endobj
6 0 obj
<< /Length ${streamLength} >>
stream
${streamData}
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000282 00000 n 
0000000361 00000 n 
0000000445 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
${520 + streamLength}
%%EOF`;

  return pdf;
}

const samplePdf = generateInvoicePdf({});
fs.writeFileSync('d:/NEW SPH FRESH/Version/app/app/APPS/scratch/test_invoice_sample.pdf', samplePdf);
console.log('PDF generated successfully! File size:', Buffer.byteLength(samplePdf), 'bytes');
