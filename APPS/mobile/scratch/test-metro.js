const { getDefaultConfig } = require('@expo/metro-config');
const Metro = require('metro');

async function run() {
  const config = await getDefaultConfig(__dirname);
  console.log('Project root:', config.projectRoot);
  try {
    const metroServer = await Metro.runMetro(config);
    console.log('Metro initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('Metro failed:', err);
    process.exit(1);
  }
}
run();
