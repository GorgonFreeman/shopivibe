#!/usr/bin/env node

import { build } from 'vite';
import chalk from 'chalk';
import { chooseStores, assembleStore, logAssembly } from './lib.js';

const stores = await chooseStores();

console.log(chalk.gray('\nRunning Vite build...\n'));
await build();

for (const storeId of stores) {
  const result = assembleStore(storeId);
  logAssembly(storeId, result);
}

console.log(chalk.green('\nBuild complete.\n'));
