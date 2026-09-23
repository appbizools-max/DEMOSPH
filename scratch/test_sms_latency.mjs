const t0 = Date.now();
try {
  console.log('Testing smslogin.co gateway response time...');
  const res = await fetch('https://smslogin.co/v3/api.php?username=SPHOMEO&apikey=b93e415cf967f949dfff&senderid=SPHMEO&mobile=919030176176&message=test&templateid=1777178867791586062');
  const text = await res.text();
  console.log(`smslogin.co responded in ${Date.now() - t0}ms:`, text);
} catch (e) {
  console.log(`smslogin.co error in ${Date.now() - t0}ms:`, e.message);
}
process.exit(0);
