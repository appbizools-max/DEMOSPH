import { sendInvoiceWhatsAppNotification } from '../packages/shared/src/whatsapp/leonasService';

async function testLiveFlow() {
  console.log('--- Triggering Live WhatsApp Invoice Flow to 8374062188 ---');
  
  const testPayload = {
    patientName: 'Mahesh babu',
    phone: '8374062188',
    invoiceId: 'INV-T9T56E',
    totalPaid: 658,
    paymentMode: 'UPI',
    branch: 'Nallagandla Branch',
    doctorName: 'Dr. Prashanth K Vaidya',
    items: [
      { description: 'Consultation & Clinical Evaluation', amount: 350 },
      { description: 'Homeopathy Medicine Dispensation (1 Month)', amount: 308 }
    ]
  };

  const result = await sendInvoiceWhatsAppNotification(testPayload);
  console.log('Live Flow Finished with Result:', JSON.stringify(result, null, 2));
}

testLiveFlow().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
