/**
 * Test script to run the actor locally
 * This simulates Apify environment for local testing
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple logger
const log = {
    info: (msg, data) => console.log(`ℹ️  ${msg}`, data || ''),
    warning: (msg, data) => console.warn(`⚠️  ${msg}`, data || ''),
    exception: (error, msg) => console.error(`❌ ${msg}:`, error.message),
};

// Load input
let input = {};
try {
    const inputFile = readFileSync(join(__dirname, 'input.json'), 'utf-8');
    input = JSON.parse(inputFile);
    log.info('Loaded input from input.json');
} catch (error) {
    log.warning('No input.json found, using defaults');
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

const {
    symbol = 'BINANCE:BTCUSDT',
    interval = '1h',
    indicators = ['RSI', 'EMA 20', 'EMA 50'],
    theme = 'dark',
    width = 1280,
    height = 720,
    hideUi = true,
    login = null,
    outputFileName = null,
} = input;

log.info('Starting TradingView chart capture', {
    symbol,
    interval,
    indicators,
    theme,
    dimensions: `${width}x${height}`,
});

(async () => {
    const browser = await chromium.launch({
        headless: false, // Show browser for testing
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
        viewport: { width, height },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    try {
        // Navigate to TradingView chart
        const chartUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
        log.info(`Navigating to: ${chartUrl}`);
        
        await page.goto(chartUrl, {
            waitUntil: 'networkidle',
            timeout: 60000,
        });

        // Wait for chart to load
        await page.waitForSelector('[data-name="legend-source-item"]', { timeout: 30000 });
        log.info('Chart loaded successfully');

        // Optional: Login if credentials provided
        if (login && login.username && login.password) {
            log.info('Attempting to login...');
            try {
                const signInButton = await page.$('text=/sign in/i').catch(() => null);
                if (signInButton) {
                    await signInButton.click();
                    await page.waitForTimeout(2000);

                    const usernameInput = await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 5000 });
                    await usernameInput.fill(login.username);
                    await page.waitForTimeout(500);

                    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
                    await passwordInput.fill(login.password);
                    await page.waitForTimeout(500);

                    const submitButton = await page.$('button[type="submit"], button:has-text("Sign in")');
                    if (submitButton) {
                        await submitButton.click();
                        await page.waitForTimeout(5000);
                        log.info('Login completed');
                    }
                }
            } catch (error) {
                log.warning('Login failed or not needed', { error: error.message });
            }
        }

        // Change theme if needed
        if (theme === 'light') {
            log.info('Switching to light theme...');
            try {
                await page.keyboard.press('Alt+t');
                await page.waitForTimeout(1000);
            } catch (error) {
                log.warning('Theme toggle failed', { error: error.message });
            }
        }

        // Change timeframe/interval
        log.info(`Setting timeframe to: ${interval}`);
        try {
            const intervalKey = interval.toLowerCase().replace(/\d+/, '');
            const intervalNumber = interval.match(/\d+/)?.[0] || '';
            
            if (intervalNumber) {
                for (const digit of intervalNumber) {
                    await page.keyboard.press(digit);
                    await page.waitForTimeout(200);
                }
            }
            if (intervalKey) {
                await page.keyboard.press(intervalKey);
                await page.waitForTimeout(1000);
            }
        } catch (error) {
            log.warning('Timeframe change may have failed', { error: error.message });
        }

        await page.waitForTimeout(2000);

        // Add indicators
        log.info(`Adding ${indicators.length} indicator(s)...`);
        for (const indicator of indicators) {
            try {
                log.info(`Adding indicator: ${indicator}`);
                
                await page.keyboard.press('Shift+I');
                await page.waitForTimeout(1000);

                await page.keyboard.type(indicator, { delay: 100 });
                await page.waitForTimeout(1500);

                await page.keyboard.press('Enter');
                await page.waitForTimeout(2000);

                log.info(`Indicator "${indicator}" added successfully`);
            } catch (error) {
                log.warning(`Failed to add indicator: ${indicator}`, { error: error.message });
            }
        }

        await page.waitForTimeout(3000);

        // Hide UI elements if requested
        if (hideUi) {
            log.info('Hiding UI elements...');
            try {
                await page.evaluate(() => {
                    const topToolbar = document.querySelector('[data-name="header-chart-panel"]');
                    if (topToolbar) topToolbar.style.display = 'none';

                    const leftToolbar = document.querySelector('[data-name="toolbar"]');
                    if (leftToolbar) leftToolbar.style.display = 'none';

                    const watermark = document.querySelector('[data-name="watermark"]');
                    if (watermark) watermark.style.display = 'none';

                    const legend = document.querySelector('[data-name="legend-source-item"]');
                    if (legend) {
                        const legendContainer = legend.closest('[class*="legend"]');
                        if (legendContainer) legendContainer.style.opacity = '0.7';
                    }

                    const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="dialog"]');
                    modals.forEach(modal => {
                        if (modal.style.display !== 'none') {
                            modal.style.display = 'none';
                        }
                    });
                });
                await page.waitForTimeout(1000);
            } catch (error) {
                log.warning('Failed to hide some UI elements', { error: error.message });
            }
        }

        // Take screenshot
        log.info('Capturing screenshot...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const safeSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = outputFileName || `chart_${safeSymbol}_${timestamp}`;
        const screenshotPath = join(__dirname, `${fileName}.png`);

        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false,
            path: screenshotPath,
        });

        // Convert to base64
        const screenshotBase64 = screenshot.toString('base64');
        const screenshotDataUrl = `data:image/png;base64,${screenshotBase64}`;

        log.info(`✅ Screenshot saved: ${screenshotPath}`);

        // Save result to JSON
        const result = {
            symbol,
            interval,
            indicators,
            theme,
            width,
            height,
            screenshotBase64: screenshotBase64.substring(0, 100) + '...', // Truncate for display
            screenshotDataUrl: screenshotDataUrl.substring(0, 100) + '...',
            screenshotPath: screenshotPath,
            timestamp: new Date().toISOString(),
        };

        const resultPath = join(__dirname, 'result.json');
        writeFileSync(resultPath, JSON.stringify(result, null, 2));
        log.info(`✅ Result saved to: ${resultPath}`);

        console.log('\n📊 Result Summary:');
        console.log(JSON.stringify({
            ...result,
            screenshotBase64: `[${screenshotBase64.length} characters]`,
            screenshotDataUrl: `[${screenshotDataUrl.length} characters]`,
        }, null, 2));

        // Keep browser open for 5 seconds to see the result
        log.info('Keeping browser open for 5 seconds...');
        await page.waitForTimeout(5000);

    } catch (error) {
        log.exception(error, 'Failed to capture chart');
        throw error;
    } finally {
        await browser.close();
        log.info('✅ Chart capture completed successfully');
    }
})();

