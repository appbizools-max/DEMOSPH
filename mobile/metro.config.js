const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');
const sharedPkgPath = path.resolve(monorepoRoot, 'packages/shared');

const config = getDefaultConfig(projectRoot);

// Watch the shared package
config.watchFolders = [
  sharedPkgPath,
];

// Explicitly alias @app/shared so Metro finds it without resolution failures
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@app/shared': sharedPkgPath,
};

// Resolve dependencies from mobile first,
// then the hoisted monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;