const fs = require('fs');
const path = require('path');
const readline = require('readline');

const chalk = require('chalk');

const CREDS_PATH = path.join(__dirname, '..', '..', '.creds.yml');

function loadCreds() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error('.creds.yml not found');
  }
  const yaml = require('js-yaml');
  const content = fs.readFileSync(CREDS_PATH, 'utf8');
  const parsed = yaml.load(content);
  const shopify = parsed?.shopify;
  if (!shopify || typeof shopify !== 'object') {
    throw new Error('.creds.yml must have a shopify top-level key with store configs');
  }
  return Object.keys(shopify).filter((k) => typeof shopify[k] === 'object');
}

function promptStores(availableStores) {
  if (!process.stdin.isTTY) {
    return promptStoresFallback(availableStores);
  }
  return new Promise((resolve, reject) => {
    const selected = new Set();
    let resolving = false;

    function render() {
      process.stdout.write('\x1b[2J\x1b[H');
      console.log('\nSelect stores (press number to toggle, Enter to confirm):\n');
      availableStores.forEach((store, i) => {
        const num = String(i + 1);
        const line = `  [${ num }] ${ store }`;
        const styled = selected.has(store) ? chalk.cyan(line) : line;
        console.log(styled);
      });
      console.log('\n  Selected:', selected.size ? Array.from(selected).join(', ') : '(none)');
    }

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('keypress');
    }

    function finish() {
      if (resolving) return;
      resolving = true;
      cleanup();
      const result = Array.from(selected);
      if (result.length === 0) {
        console.error('\nNo stores selected. Select at least one.');
        reject(new Error('No stores selected'));
      } else {
        resolve(result);
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    readline.emitKeypressEvents(process.stdin);

    process.stdin.on('keypress', (str, key) => {
      if (!key) return;
      if (key.name === 'return' || key.name === 'enter') {
        finish();
        return;
      }
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(130);
      }
      const n = parseInt(str, 10);
      if (n >= 1 && n <= availableStores.length) {
        const store = availableStores[n - 1];
        if (selected.has(store)) {
          selected.delete(store);
        } else {
          selected.add(store);
        }
        render();
      }
    });

    render();
  });
}

function promptStoresFallback(availableStores) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nAvailable stores:', availableStores.join(', '));
    console.log('Enter store IDs (comma-separated, e.g. au,us,uk):');
    rl.question('> ', (answer) => {
      rl.close();
      const selected = answer
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && availableStores.includes(s));
      if (selected.length === 0) {
        reject(new Error('No valid stores selected. Use: ' + availableStores.join(', ')));
      } else {
        resolve(selected);
      }
    });
  });
}

function getStores() {
  const available = loadCreds();
  const envStores = process.env.STORES;
  if (envStores) {
    const selected = envStores
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && available.includes(s));
    if (selected.length > 0) return Promise.resolve(selected);
  }
  return promptStores(available);
}

function loadStoreCreds(storeId) {
  const yaml = require('js-yaml');
  const content = fs.readFileSync(CREDS_PATH, 'utf8');
  const parsed = yaml.load(content);
  return parsed?.shopify?.[storeId] || {};
}

function listThemes(storeId) {
  const { spawnSync } = require('child_process');
  const creds = loadStoreCreds(storeId);
  const storeUrl = creds.STORE_URL || storeId;
  const env = { ...process.env };
  if (creds.SHOPIFY_API_KEY) env.SHOPIFY_API_KEY = creds.SHOPIFY_API_KEY;

  const result = spawnSync('shopify', [ 'theme', 'list', '--store', storeUrl, '--json' ], {
    cwd: path.join(__dirname, '..', '..'),
    env,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`theme list failed: ${ result.stderr || result.error }`);
  }

  const data = JSON.parse(result.stdout);
  return Array.isArray(data) ? data : (data.themes || []);
}

function promptTheme(storeId, themes) {
  if (themes.length === 0) {
    throw new Error(`No themes found for store ${ storeId }`);
  }
  if (!process.stdin.isTTY) {
    return promptThemeFallback(themes);
  }
  return new Promise((resolve, reject) => {
    let selected = null;
    let resolving = false;

    function render() {
      process.stdout.write('\x1b[2J\x1b[H');
      console.log(`\nSelect theme for ${ storeId } (press number, Enter to confirm):\n`);
      themes.forEach((theme, i) => {
        const num = String(i + 1);
        const role = theme.role ? ` [${ theme.role }]` : '';
        const line = `  [${ num }] ${ theme.name } (${ theme.id })${ role }`;
        console.log(line);
      });
    }

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('keypress');
    }

    function finish() {
      if (resolving) return;
      resolving = true;
      cleanup();
      if (selected === null) {
        reject(new Error('No theme selected'));
      } else {
        resolve(themes[selected]);
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    readline.emitKeypressEvents(process.stdin);

    process.stdin.on('keypress', (str, key) => {
      if (!key) return;
      if (key.name === 'return' || key.name === 'enter') {
        finish();
        return;
      }
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(130);
      }
      const n = parseInt(str, 10);
      if (n >= 1 && n <= themes.length) {
        selected = n - 1;
        finish();
      }
    });

    render();
  });
}

function promptThemeFallback(themes) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nThemes:');
    themes.forEach((t, i) => console.log(`  ${ i + 1 }. ${ t.name } (${ t.id })`));
    console.log('Enter theme number:');
    rl.question('> ', (answer) => {
      rl.close();
      const n = parseInt(answer, 10);
      if (n >= 1 && n <= themes.length) {
        resolve(themes[n - 1]);
      } else {
        reject(new Error('Invalid theme selection'));
      }
    });
  });
}

function promptThemeName() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nTheme name for new theme:');
    rl.question('> ', (answer) => {
      rl.close();
      const name = answer.trim();
      if (!name) {
        reject(new Error('Theme name is required'));
      } else {
        resolve(name);
      }
    });
  });
}

module.exports = {
  loadCreds,
  getStores,
  loadStoreCreds,
  listThemes,
  promptTheme,
  promptThemeName,
};
