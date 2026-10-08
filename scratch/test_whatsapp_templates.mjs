const API_URL = 'https://partnersv1.pinbot.ai/v3/1303340612865892/messages';
const API_KEY = '2731e63f-a853-11f1-afb3-02c8a5e042bd';

async function testTemplate(name, payload) {
  console.log(`\n--- Testing Template: ${name} ---`);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

async function run() {
  await testTemplate('exp_link', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '919069176176',
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
