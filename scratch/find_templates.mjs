const API_URL = 'https://partnersv1.pinbot.ai/v3/1303340612865892/messages';
const API_KEY = '2731e63f-a853-11f1-afb3-02c8a5e042bd';

const potentialNames = [
  'google_review',
  'google_reviews',
  'feedback_link',
  'googlee_review',
  'feedback',
  'review',
  'google_feedback',
  'valuable_feedback'
];

async function check(name) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '919069176176',
        type: 'template',
        template: {
          name: name,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: 'https://stiny.in/SPHOMEO/kphb' }]
            }
          ]
        }
      }),
    });
    const data = await res.json();
    console.log(`[${name}] Status ${res.status}:`, JSON.stringify(data));
  } catch (e) {
    console.error(`[${name}] Err:`, e.message);
  }
}

async function run() {
  for (const name of potentialNames) {
    await check(name);
  }
}

run();
