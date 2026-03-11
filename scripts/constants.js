const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const REGIONAL_DIR = path.join(ROOT, 'regional');
const DIST_BASE = path.join(ROOT, 'dist');
const BUILD_DIR = path.join(DIST_BASE, '_build');
const PULL_TEMP = path.join(DIST_BASE, '.pull-temp');

const SKIP_COPY = ['scripts', 'styles', 'assets'];

module.exports = {
  ROOT,
  SRC_DIR,
  REGIONAL_DIR,
  DIST_BASE,
  BUILD_DIR,
  PULL_TEMP,
  SKIP_COPY,
};
