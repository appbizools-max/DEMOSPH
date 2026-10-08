const API_URL = 'https://partnersv1.pinbot.ai/v3/1303340612865892/messages';
const API_KEY = '2731e63f-a853-11f1-afb3-02c8a5e042bd';

const TEST_PHONE = '918374062188';

async function sendWhatsAppTemplate(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));
  return data;
}

async function run() {
  console.log(`Sending to ${TEST_PHONE}...`);

  // 1. Send invoice_pdf
  console.log('\n--- 1. Testing invoice_pdf ---');
  await sendWhatsAppTemplate({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: TEST_PHONE,
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
                link: 'https://pdfobject.com/pdf/sample.pdf',
                filename: 'Invoice_INV-T9T56E.pdf'
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Mahesh babu' }
          ]
        }
      ]
    }
  });

  // 2. Send exp_link (Interactive Feedback: Good / Can be better / Bad)
  console.log('\n--- 2. Testing exp_link (Experience Feedback) ---');
  await sendWhatsAppTemplate({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: TEST_PHONE,
    type: 'template',
    template: {
      name: 'exp_link',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Mahesh babu' }
          ]
        }
      ]
    }
  });
}

run();
