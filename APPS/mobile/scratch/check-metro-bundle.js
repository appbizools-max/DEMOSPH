const http = require('http');

http.get('http://localhost:8081/index.bundle?platform=android&dev=true', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Length:', data.length);
    if (res.statusCode !== 200) {
      console.log('Body snippet:', data.slice(0, 500));
    } else {
      console.log('Header snippet:', data.slice(0, 200));
      console.log('Footer snippet:', data.slice(-200));
    }
  });
}).on('error', (e) => {
  console.log('Metro not running on 8081:', e.message);
});
