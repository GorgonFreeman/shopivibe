import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

const scriptsDir = path.join(projectRoot, 'src/scripts');
const scriptEntries = fs.existsSync(scriptsDir)
  ? Object.fromEntries(
      fs.readdirSync(scriptsDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.js'))
        .map((e) => [ e.name.replace(/\.js$/, ''), path.join(scriptsDir, e.name) ])
    )
  : {};

const stylesDir = path.join(projectRoot, 'src/styles');
const styleEntries = fs.existsSync(stylesDir)
  ? Object.fromEntries(
      fs.readdirSync(stylesDir, { withFileTypes: true })
        .filter((e) => e.isFile() && /\.(css|scss|sass)$/i.test(e.name))
        .map((e) => [ `style_${ e.name.replace(/\.[^.]+$/, '') }`, path.join(stylesDir, e.name) ])
    )
  : {};

export default {
  plugins: [ tailwindcss() ],
  root: projectRoot,
  build: {
    outDir: 'build/assets',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        ...styleEntries,
        ...scriptEntries,
      },
    },
  },
};
