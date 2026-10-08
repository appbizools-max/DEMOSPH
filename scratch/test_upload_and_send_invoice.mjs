import fs from 'fs';

const BUCKET = 'spiritual-homeopathy-3b552.firebasestorage.app';
const API_URL = 'https://partnersv1.pinbot.ai/v3/1303340612865892/messages';
const API_KEY = '2731e63f-a853-11f1-afb3-02c8a5e042bd';
const TO = '918374062188';

async function uploadPdfToFirebaseStorage(pdfBuffer, filename) {
  const encodedName = encodeURIComponent(`invoices/${filename}`);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${encodedName}`;
  
  console.log('Uploading PDF to Firebase Storage:', uploadUrl);
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
    },
    body: pdfBuffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firebase upload failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const token = data.downloadTokens || '';
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedName}?alt=media&token=${token}`;
  console.log('Upload SUCCESS! Download URL:', publicUrl);
  return publicUrl;
}

async function sendInvoicePdfWhatsApp(patientName, publicPdfUrl, filename) {
  console.log('Sending invoice_pdf WhatsApp template...');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
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
                  filename: filename
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
    }),
  });

  const data = await res.json();
  console.log('WhatsApp Delivery Result:', JSON.stringify(data, null, 2));
}

async function run() {
  const pdfBuffer = fs.readFileSync('d:/NEW SPH FRESH/Version/app/app/APPS/scratch/test_invoice_sample.pdf');
  const filename = 'Invoice_INV-T9T56E.pdf';
  
  const publicPdfUrl = await uploadPdfToFirebaseStorage(pdfBuffer, filename);
  await sendInvoicePdfWhatsApp('Mahesh babu', publicPdfUrl, filename);
}

run().catch(console.error);
