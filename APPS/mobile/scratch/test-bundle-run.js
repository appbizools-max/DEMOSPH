const { getDefaultConfig } = require('@expo/metro-config');
const Metro = require('metro');
const path = require('path');

async function run() {
  const projectRoot = path.resolve(__dirname, '..');
  const config = require('../metro.config.js');
  
  console.log('Project root:', projectRoot);
  try {
    const { code, map } = await Metro.runBuild(config, {
      entry: 'index.js',
      platform: 'android',
      minify: false,
      dev: true,
    });
    console.log('Bundle success! Code length:', code.length);
  } catch (err) {
    console.error('BUNDLE ERROR DETECTED:');
    console.error(err);
  }
}
run();
