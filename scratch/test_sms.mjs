import fetch from 'node-fetch';

async function test() {
  const queryParams = [
    `username=SPHOMEO`,
    `apikey=b93e415cf967f949dfff`,
    `senderid=SPHMEO`,
    `mobile=919030176176`,
    `message=${encodeURIComponent('Your OTP is 1234. It is valid for 5 minutes. Please do not share this OTP with anyone.\n\nSpiritual Homeopathy Clinics')}`,
    `templateid=1777178867791586062`
  ].join('&');

  const url = `https://smslogin.co/v3/api.php?${queryParams}`;
  console.log('Fetching SMS Gateway...');
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('SMS Gateway Status:', res.status, 'Response:', text);
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
  process.exit(0);
}

test();
