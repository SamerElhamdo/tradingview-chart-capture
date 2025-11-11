import { Actor } from 'apify';
import { chromium } from 'playwright';

/**
 * Main function to capture TradingView charts
 */
await Actor.init();

try {
    // Get input configuration
    const input = await Actor.getInput();
    const {
        symbol = 'BINANCE:BTCUSDT',
        interval = '1h',
        indicators = ['RSI', 'EMA 20', 'EMA 50'],
        theme = 'dark',
        width = 1280,
        height = 720,
        hideUi = true,
        loginUsername = null,
        loginPassword = null,
        outputFileName = null,
    } = input;

    Actor.log.info('Starting TradingView chart capture', {
        symbol,
        interval,
        indicators,
        theme,
        dimensions: `${width}x${height}`,
    });

    // Launch browser
    const browser = await chromium.launch({
        headless: true,
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
        Actor.log.info(`Navigating to: ${chartUrl}`);
        
        await page.goto(chartUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        // Wait for chart to load - try multiple selectors
        Actor.log.info('Waiting for chart to load...');
        try {
            await page.waitForSelector('canvas', { timeout: 30000 });
            Actor.log.info('Chart canvas found');
        } catch (error) {
            Actor.log.warning('Canvas not found, trying alternative selector...');
        }

        // Wait a bit more for chart to fully render
        await page.waitForTimeout(5000);
        Actor.log.info('Chart loaded successfully');

        // Optional: Login if credentials provided
        if (loginUsername && loginPassword) {
            Actor.log.info('Attempting to login...');
            try {
                // Look for sign in button/link
                const signInButton = await page.$('text=/sign in/i').catch(() => null);
                if (signInButton) {
                    await signInButton.click();
                    await page.waitForTimeout(2000);

                    // Fill login form
                    const usernameInput = await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 5000 });
                    await usernameInput.fill(loginUsername);
                    await page.waitForTimeout(500);

                    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
                    await passwordInput.fill(loginPassword);
                    await page.waitForTimeout(500);

                    // Submit form
                    const submitButton = await page.$('button[type="submit"], button:has-text("Sign in")');
                    if (submitButton) {
                        await submitButton.click();
                        await page.waitForTimeout(5000);
                        Actor.log.info('Login completed');
                    }
                }
            } catch (error) {
                Actor.log.warning('Login failed or not needed', { error: error.message });
            }
        }

        // Change theme if needed
        if (theme === 'light') {
            Actor.log.info('Switching to light theme...');
            try {
                // Try keyboard shortcut: Alt + T to toggle theme
                await page.keyboard.press('Alt+t');
                await page.waitForTimeout(1000);
            } catch (error) {
                Actor.log.warning('Theme toggle failed', { error: error.message });
            }
        }

        // Change timeframe/interval
        Actor.log.info(`Setting timeframe to: ${interval}`);
        try {
            // TradingView uses keyboard shortcuts for timeframes
            // Press the interval key (e.g., '1' for 1m, 'h' for 1h, 'D' for 1D)
            const intervalKey = interval.toLowerCase().replace(/\d+/, '');
            const intervalNumber = interval.match(/\d+/)?.[0] || '';
            
            // For intervals like "1h", we need to press the number then the letter
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
            Actor.log.warning('Timeframe change may have failed', { error: error.message });
        }

        // Wait for chart to update
        await page.waitForTimeout(2000);

        // Add indicators
        Actor.log.info(`Adding ${indicators.length} indicator(s)...`);
        for (const indicator of indicators) {
            try {
                Actor.log.info(`Adding indicator: ${indicator}`);
                
                // Open indicator search: Shift + I
                await page.keyboard.press('Shift+I');
                await page.waitForTimeout(1000);

                // Type indicator name
                await page.keyboard.type(indicator, { delay: 100 });
                await page.waitForTimeout(1500);

                // Press Enter to select first result
                await page.keyboard.press('Enter');
                await page.waitForTimeout(2000);

                Actor.log.info(`Indicator "${indicator}" added successfully`);
            } catch (error) {
                Actor.log.warning(`Failed to add indicator: ${indicator}`, { error: error.message });
            }
        }

        // Wait for all indicators to render
        await page.waitForTimeout(3000);

        // Hide UI elements if requested
        if (hideUi) {
            Actor.log.info('Hiding UI elements...');
            try {
                // Hide toolbars and watermarks using CSS
                await page.evaluate(() => {
                    // Hide top toolbar
                    const topToolbar = document.querySelector('[data-name="header-chart-panel"]');
                    if (topToolbar) topToolbar.style.display = 'none';

                    // Hide left toolbar
                    const leftToolbar = document.querySelector('[data-name="toolbar"]');
                    if (leftToolbar) leftToolbar.style.display = 'none';

                    // Hide watermark
                    const watermark = document.querySelector('[data-name="watermark"]');
                    if (watermark) watermark.style.display = 'none';

                    // Hide legend if it's too prominent
                    const legend = document.querySelector('[data-name="legend-source-item"]');
                    if (legend) {
                        const legendContainer = legend.closest('[class*="legend"]');
                        if (legendContainer) legendContainer.style.opacity = '0.7';
                    }

                    // Hide any popups/modals
                    const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="dialog"]');
                    modals.forEach(modal => {
                        if (modal.style.display !== 'none') {
                            modal.style.display = 'none';
                        }
                    });
                });
                await page.waitForTimeout(1000);
            } catch (error) {
                Actor.log.warning('Failed to hide some UI elements', { error: error.message });
            }
        }

        // Take screenshot
        Actor.log.info('Capturing screenshot...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const safeSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = outputFileName || `chart_${safeSymbol}_${timestamp}`;
        const screenshotPath = `${fileName}.png`;

        let screenshot;
        try {
            screenshot = await page.screenshot({
                type: 'png',
                fullPage: false,
            });
            Actor.log.info(`Screenshot captured, size: ${screenshot.length} bytes`);
        } catch (error) {
            Actor.log.exception(error, 'Failed to capture screenshot');
            throw error;
        }

        // Convert screenshot to base64
        const screenshotBase64 = screenshot.toString('base64');
        const screenshotDataUrl = `data:image/png;base64,${screenshotBase64}`;
        Actor.log.info(`Base64 conversion complete, length: ${screenshotBase64.length} characters`);
        
        // Check if base64 is too large (Apify Dataset has limits)
        const MAX_BASE64_SIZE = 9000000; // ~9MB limit for Dataset records
        if (screenshotBase64.length > MAX_BASE64_SIZE) {
            Actor.log.warning(`Base64 size (${screenshotBase64.length}) exceeds recommended limit. Consider reducing image quality.`);
        }

        // Save to Apify Key-Value store
        try {
            await Actor.setValue(screenshotPath, screenshot, { contentType: 'image/png' });
            Actor.log.info(`Screenshot saved to Key-Value store: ${screenshotPath}`);
        } catch (error) {
            Actor.log.warning('Failed to save screenshot to Key-Value store', { error: error.message });
        }

        // Get public URL
        let screenshotUrl = '';
        try {
            screenshotUrl = await Actor.getPublicUrl(screenshotPath);
            Actor.log.info(`Public URL: ${screenshotUrl}`);
        } catch (error) {
            Actor.log.warning('Failed to get public URL', { error: error.message });
        }

        // Push metadata to dataset with base64 image
        const result = {
            symbol,
            interval,
            indicators,
            theme,
            width,
            height,
            screenshotBase64: screenshotBase64,
            screenshotDataUrl: screenshotDataUrl,
            screenshotUrl: screenshotUrl,
            screenshotKey: screenshotPath,
            timestamp: new Date().toISOString(),
        };

        try {
            await Actor.pushData(result);
            Actor.log.info('✅ Metadata pushed to dataset successfully', {
                symbol,
                screenshotSize: screenshot.length,
                base64Length: screenshotBase64.length,
            });
        } catch (error) {
            Actor.log.exception(error, 'Failed to push data to dataset');
            // Try to push without base64 if it's too large
            try {
                const resultWithoutBase64 = {
                    ...result,
                    screenshotBase64: `[Base64 data too large: ${screenshotBase64.length} chars]`,
                    screenshotDataUrl: `[Data URL too large: ${screenshotDataUrl.length} chars]`,
                };
                await Actor.pushData(resultWithoutBase64);
                Actor.log.info('Pushed data without base64 (too large)');
            } catch (error2) {
                Actor.log.exception(error2, 'Failed to push data even without base64');
                throw error2;
            }
        }

    } finally {
        await browser.close();
    }

    Actor.log.info('Chart capture completed successfully');

} catch (error) {
    Actor.log.exception(error, 'Failed to capture chart');
    throw error;
} finally {
    await Actor.exit();
}

