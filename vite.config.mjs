import path from 'path';
import { fileURLToPath } from 'url';
import shopify from 'vite-plugin-shopify';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [
    tailwindcss(),
    shopify({
      themeRoot: path.join(__dirname, 'src'),
      sourceCodeDir: 'src',
      entrypointsDir: 'src/scripts',
      additionalEntrypoints: [ 'src/styles/*.css' ],
      snippetFile: 'vite-tag.liquid',
      themeHotReload: true,
    }),
  ],
};
