const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../assets/SH logo.png');
const buf = fs.readFileSync(logoPath);
const iendIdx = buf.indexOf(Buffer.from('IEND'));

if (iendIdx !== -1) {
  const cleanBuf = buf.slice(0, iendIdx + 8);
  const b64 = cleanBuf.toString('base64');
  console.log('Original size:', buf.length, 'Clean PNG size:', cleanBuf.length, 'Base64 length:', b64.length);

  const fileContent = `export const SH_LOGO_BASE64 = "${b64}";\n`;
  
  // Update mobile logoBase64.ts
  fs.writeFileSync(path.join(__dirname, '../src/utils/logoBase64.ts'), fileContent, 'utf8');
  // Update web logoBase64.ts
  fs.writeFileSync(path.join(__dirname, '../../web/src/utils/logoBase64.ts'), fileContent, 'utf8');

  console.log('SUCCESSFULLY_UPDATED_BOTH_UTILS');
} else {
  console.log('IEND chunk not found!');
}
