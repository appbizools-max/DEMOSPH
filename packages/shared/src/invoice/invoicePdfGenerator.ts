/**
 * Lightweight, zero-dependency PDF Invoice Generator & Cloud Uploader
 * Generates official Spiritual Homeopathy Clinics PDF receipts and uploads to Firebase Storage
 */

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface InvoicePdfParams {
  patientName?: string;
  phone?: string;
  invoiceId?: string;
  date?: string;
  branch?: string;
  doctorName?: string;
  totalPaid?: number;
  paymentMode?: string;
  items?: InvoiceItem[];
}

/**
 * Generates a valid standard PDF 1.4 binary Uint8Array representation of the invoice receipt
 */
export const generateInvoicePdfBytes = (params: InvoicePdfParams): Uint8Array => {
  const patient = String(params.patientName || 'Patient').replace(/[()]/g, '');
  const cleanPhone = String(params.phone || '').replace(/\D/g, '').slice(-10);
  const invCode = params.invoiceId ? String(params.invoiceId).substring(0, 10).toUpperCase() : 'RECEIPT';
  const receiptNo = invCode.startsWith('INV-') ? invCode : `INV-${invCode}`;
  const dateStr = params.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const branchName = String(params.branch || 'KPHB').replace(/[()]/g, '');
  let docName = String(params.doctorName || 'Dr. Prashanth K Vaidya').replace(/[()]/g, '').trim();
  if (!docName.toLowerCase().startsWith('dr')) {
    docName = `Dr. ${docName}`;
  }
  const totalAmount = Number(params.totalPaid || 0);
  const payMode = String(params.paymentMode || 'UPI').toUpperCase();

  const rawItems = params.items && params.items.length > 0 ? params.items : [
    { description: 'Consultation & Clinical Evaluation', amount: Math.min(totalAmount, 350) },
    ...(totalAmount > 350 ? [{ description: 'Homeopathy Medicine Dispensation & Care', amount: totalAmount - 350 }] : [])
  ];

  const content: string[] = [];

  // 1. Top Accent Lime-Green Bar
  content.push('0.6 0.8 0.0 rg');
  content.push('40 760 532 6 re f');

  // 2. Brand Title & Header
  content.push('0.008 0.518 0.780 rg'); // Primary Blue #0284c7
  content.push('BT');
  content.push('/F2 20 Tf');
  content.push('40 730 Td');
  content.push('(SPIRITUAL HOMEOPATHY CLINICS) Tj');
  content.push('ET');

  content.push('0.28 0.33 0.41 rg');
  content.push('BT');
  content.push('/F1 10 Tf');
  content.push('40 714 Td');
  content.push('(Multi-Speciality Classical Homeopathy Clinics) Tj');
  content.push('ET');

  // Contact Info (Right Aligned)
  content.push('BT');
  content.push('/F1 9 Tf');
  content.push('380 730 Td');
  content.push('(Helpline: 9069 176 176) Tj');
  content.push('0 -14 Td');
  content.push('(www.spiritualhomeoclinic.com) Tj');
  content.push('ET');

  // Divider Line
  content.push('0.85 0.88 0.92 rg');
  content.push('40 695 532 1 re f');

  // Title: OFFICIAL PAYMENT RECEIPT
  content.push('0.06 0.09 0.16 rg');
  content.push('BT');
  content.push('/F2 16 Tf');
  content.push('40 665 Td');
  content.push('(OFFICIAL PAYMENT RECEIPT) Tj');
  content.push('ET');

  // PAID Badge
  content.push('0.13 0.77 0.37 rg'); // Green
  content.push('480 660 92 24 re f');
  content.push('1 1 1 rg'); // White
  content.push('BT');
  content.push('/F2 11 Tf');
  content.push('506 667 Td');
  content.push('(PAID) Tj');
  content.push('ET');

  // Patient & Receipt Details Box
  content.push('0.96 0.98 1.00 rg');
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
  content.push(`55 613 Td (${patient}) Tj`);
  content.push(`0 -22 Td (${receiptNo}) Tj`);
  content.push(`0 -22 Td (${docName}) Tj`);
  content.push(`320 613 Td (${dateStr}) Tj`);
  content.push(`0 -22 Td (+91 ${cleanPhone}) Tj`);
  content.push(`0 -22 Td (${branchName}) Tj`);
  content.push('ET');

  // Line Items Table Header
  content.push('0.94 0.96 0.98 rg');
  content.push('40 505 532 25 re f');
  content.push('0.2 0.25 0.3 rg');
  content.push('BT');
  content.push('/F2 10 Tf');
  content.push('55 513 Td (DESCRIPTION / SERVICE) Tj');
  content.push('450 513 Td (AMOUNT (INR)) Tj');
  content.push('ET');

  // Line Items List
  let y = 480;
  rawItems.forEach((item, idx) => {
    const desc = String(item.description || 'Medical Service').replace(/[()]/g, '');
    const amt = Number(item.amount || 0).toFixed(2);
    content.push('0.1 0.15 0.2 rg');
    content.push('BT');
    content.push('/F1 10.5 Tf');
    content.push(`55 ${y} Td (${idx + 1}. ${desc}) Tj`);
    content.push(`470 ${y} Td (Rs.${amt}) Tj`);
    content.push('ET');

    content.push('0.9 0.92 0.95 rg');
    content.push(`40 ${y - 8} 532 0.5 re f`);
    y -= 25;
  });

  // Total Summary Box
  y -= 10;
  content.push('0.90 0.97 0.92 rg'); // Soft green bg
  content.push(`40 ${y - 45} 532 45 re f`);
  content.push('0.52 0.93 0.67 rg');
  content.push(`40 ${y - 45} 532 45 re S`);

  content.push('0.08 0.5 0.24 rg');
  content.push('BT');
  content.push('/F2 11 Tf');
  content.push(`55 ${y - 22} Td (TOTAL PAID (${payMode})) Tj`);
  content.push('/F2 16 Tf');
  content.push(`440 ${y - 24} Td (Rs.${totalAmount.toFixed(2)}) Tj`);
  content.push('ET');

  // Terms & Footer
  content.push('0.4 0.45 0.5 rg');
  content.push('BT');
  content.push('/F1 8.5 Tf');
  content.push('40 100 Td (1. This is a computer generated receipt from Spiritual Homeopathy Clinics. No signature required.) Tj');
  content.push('0 -14 Td (2. Keep this receipt for your records and medical follow-up consultations.) Tj');
  content.push('0 -14 Td (3. For assistance, appointment rescheduling or queries, call our helpline at 9069 176 176.) Tj');
  content.push('ET');

  // Bottom Green Accent Bar
  content.push('0.6 0.8 0.0 rg');
  content.push('40 40 532 4 re f');

  const streamData = content.join('\n');
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamData);
  const streamLength = streamBytes.length;

  const pdfText = `%PDF-1.4
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

  return encoder.encode(pdfText);
};

/**
 * Uploads generated invoice PDF to Firebase Storage and returns public HTTPS download URL
 */
export const uploadInvoicePdfToFirebaseStorage = async (
  pdfBytes: Uint8Array,
  filename: string
): Promise<string> => {
  const bucket = 'spiritual-homeopathy-3b552.firebasestorage.app';
  const encodedName = encodeURIComponent(`invoices/${filename}`);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodedName}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
    },
    body: pdfBytes as any,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firebase Storage upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const token = data.downloadTokens || '';
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media&token=${token}`;
};
