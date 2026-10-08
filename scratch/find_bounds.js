const fs = require('fs');
const xml = fs.readFileSync('scratch/window_dump.xml', 'utf8');
const parts = xml.split('<node ');
for (const p of parts) {
  if (p.includes('91321') || (p.includes('clickable="true"') && p.includes('bounds='))) {
    const boundsMatch = p.match(/bounds="([^"]+)"/);
    const descMatch = p.match(/content-desc="([^"]*)"/);
    const textMatch = p.match(/text="([^"]*)"/);
    console.log({
      text: textMatch ? textMatch[1] : '',
      desc: descMatch ? descMatch[1] : '',
      bounds: boundsMatch ? boundsMatch[1] : ''
    });
  }
}