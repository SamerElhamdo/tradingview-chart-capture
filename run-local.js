/**
 * Script to run the actor locally without Apify CLI
 * Usage: node run-local.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set Apify environment variables for local development
process.env.APIFY_LOCAL_STORAGE_DIR = join(__dirname, 'apify_storage');
process.env.APIFY_TOKEN = process.env.APIFY_TOKEN || '';

// Load input from input.json
let input = {};
try {
    const inputFile = readFileSync(join(__dirname, 'input.json'), 'utf-8');
    input = JSON.parse(inputFile);
    console.log('📥 Loaded input from input.json:', input);
} catch (error) {
    console.log('⚠️  No input.json found, using default values');
    input = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        indicators: ['RSI', 'EMA 20', 'EMA 50'],
        theme: 'dark',
        width: 1280,
        height: 720,
        hideUi: true,
    };
}

// Import and run main
import('./main.js').catch((error) => {
    console.error('❌ Error running actor:', error);
    process.exit(1);
});

