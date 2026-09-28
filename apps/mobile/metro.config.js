// Metro must see ../../data so the app can bundle data/copy/en.json from the repository root (ADR-010).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../../data')];

module.exports = config;
