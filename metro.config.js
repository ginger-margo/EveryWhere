// metro.config.js
const { getDefaultConfig } = require('@react-native/metro-config');
// or require('metro-config') if you’re not using RN 0.73+:

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);

  // push 'ttf' into assetExts if not already there
  defaultConfig.resolver.assetExts.push('ttf');

  return defaultConfig;
})();
