const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable verbose logging for better error visibility
config.reporter = {
  update(event) {
    if (event.type === 'bundle_build_started') {
      console.log('Building bundle...');
    }
    if (event.type === 'bundle_build_failed') {
      console.error('Bundle build failed:', event.error);
    }
    if (event.type === 'bundle_build_done') {
      console.log('Bundle build completed');
    }
  }
};

module.exports = config;