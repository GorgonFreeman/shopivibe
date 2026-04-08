#!/usr/bin/env node

import path from 'path';
import { build } from 'vite';
import chalk from 'chalk';
import {
  DIST,
  chooseStores, askQuestion, assembleStore,
  shopifyFlags, shopifySpawn, logAssembly,
} from './lib.js';

const stores = await chooseStores();
const themeName = await askQuestion('\nTheme name for new unpublished theme: ');
if (!themeName) throw new Error('Theme name cannot be empty');

console.log(chalk.gray('\nRunning Vite build...\n'));
await build();

for (const storeId of stores) {
  const result = assembleStore(storeId);
  logAssembly(storeId, result);
}

console.log(chalk.cyan(`\nDeploying "${ themeName }" to ${ stores.join(', ') }...\n`));

for (const storeId of stores) {
  console.log(chalk.cyan(`--- ${ storeId } ---`));
  await shopifySpawn([
    'theme', 'push',
    '--path', path.join(DIST, storeId),
    '--unpublished',
    '--theme', themeName,
    ...shopifyFlags(storeId),
  ]);
  console.log(chalk.green(`Done: ${ storeId }\n`));
}

console.log(chalk.green('All stores deployed.'));
