import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

// Minimal valid PDF structure
const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 124 >>
stream
BT
/F1 18 Tf
50 720 Td
(Spiritual Homeopathy Clinics - Official Receipt) Tj
/F1 12 Tf
0 -30 Td
(Thank you for your visit. Helpline: 9069 176 176) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000419 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
490
%%EOF`;

async function run() {
  try {
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    const fileRef = ref(storage, 'invoices/SPH_Official_Receipt_Sample.pdf');
    const buffer = Buffer.from(minimalPdf, 'utf-8');
    
    await uploadBytes(fileRef, buffer, { contentType: 'application/pdf' });
    const downloadUrl = await getDownloadURL(fileRef);
    console.log('UPLOAD SUCCESS! Public PDF URL:');
    console.log(downloadUrl);
  } catch (err) {
    console.error('Upload failed:', err);
  }
}

run();
