const API_URL = 'https://partnersv1.pinbot.ai/v3/1303340612865892/messages';
const API_KEY = '2731e63f-a853-11f1-afb3-02c8a5e042bd';
const TO = '918374062188';

async function sendTemplate(name, components) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: TO,
    type: 'template',
    template: {
      name,
      language: { code: 'en' },
      components: components && components.length > 0 ? components : undefined
    }
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log(`[${name}] Status ${res.status}:`, JSON.stringify(data));
  return { ok: res.ok, data };
}

async function run() {
  const patient = 'Mahesh babu';
  const amountStr = '658';
  const invCode = 'T9T56E';
  const todayDate = '29-09-2026';
  const branch = 'Nallagandla Branch';

  console.log('--- Step 1: Sending payement_receipt ---');
  await sendTemplate('payement_receipt', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: patient },
        { type: 'text', text: amountStr },
        { type: 'text', text: `INV-${invCode}` },
        { type: 'text', text: todayDate },
        { type: 'text', text: branch }
      ]
    }
  ]);

  console.log('--- Step 2: Sending invoice_pdf (with attached PDF) ---');
  await sendTemplate('invoice_pdf', [
    {
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: {
            link: 'https://pdfobject.com/pdf/sample.pdf',
            filename: `Invoice_INV-${invCode}.pdf`
          }
        }
      ]
    },
    {
      type: 'body',
      parameters: [
        { type: 'text', text: patient }
      ]
    }
  ]);

  console.log('--- Step 3: Sending exp_link (Interactive Feedback: Good / Can be better / Bad) ---');
  await sendTemplate('exp_link', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: patient }
      ]
    }
  ]);

  console.log('\nAll 3 post-payment messages triggered successfully!');
}

run();
