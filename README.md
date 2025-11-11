# TradingView Chart Capture

An Apify Actor that captures TradingView charts with custom indicators and settings as PNG screenshots. The actor opens TradingView charts using Playwright, applies specified indicators, and saves high-quality screenshots.

## Features

- 📊 Capture TradingView charts with custom symbols and timeframes
- 📈 Add multiple technical indicators (RSI, EMA, MACD, etc.)
- 🎨 Support for dark/light themes
- 🖼️ High-resolution PNG screenshots
- 🔒 Optional login support for private charts
- 🎯 Hide UI elements for clean screenshots
- ☁️ Fully compatible with Apify platform
- 🚀 Can run locally or in the cloud

## Prerequisites

- Node.js 18+ (for local development)
- Apify account (for cloud deployment)
- Git (for version control)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Locally

You can run the actor locally using Apify CLI:

```bash
# Install Apify CLI globally (if not already installed)
npm install -g apify-cli

# Run the actor with default input
npx apify run

# Or run with custom input
npx apify run --input input.json
```

### 3. Test Input Example

Create an `input.json` file in the project root:

```json
{
  "symbol": "BINANCE:BTCUSDT",
  "interval": "1h",
  "indicators": ["RSI", "EMA 20", "EMA 50"],
  "theme": "dark",
  "width": 1280,
  "height": 720,
  "hideUi": true
}
```

Then run:
```bash
npx apify run --input input.json
```

## Input Schema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `symbol` | string | `"BINANCE:BTCUSDT"` | TradingView symbol (e.g., `BINANCE:BTCUSDT`, `NASDAQ:AAPL`) |
| `interval` | string | `"1h"` | Chart timeframe (`1m`, `5m`, `15m`, `1h`, `4h`, `1D`, etc.) |
| `indicators` | array | `["RSI", "EMA 20", "EMA 50"]` | List of indicators to add |
| `theme` | enum | `"dark"` | Chart theme: `"dark"` or `"light"` |
| `width` | integer | `1280` | Screenshot width in pixels (800-3840) |
| `height` | integer | `720` | Screenshot height in pixels (600-2160) |
| `hideUi` | boolean | `true` | Hide toolbars and watermarks |
| `loginUsername` | string | `null` | Optional: TradingView username or email for login |
| `loginPassword` | string | `null` | Optional: TradingView password for login |
| `outputFileName` | string | `null` | Custom filename (auto-generated if not provided) |

## Output

The actor saves:
- **Screenshot**: PNG image in Apify Key-Value store
- **Metadata**: JSON record in Apify Dataset with:
  - Symbol, interval, indicators, theme
  - **`screenshotBase64`**: Base64 encoded image string (ready to use)
  - **`screenshotDataUrl`**: Data URL format (`data:image/png;base64,...`)
  - Screenshot URL and key (for direct access)
  - Timestamp

**Example output:**
```json
{
  "symbol": "BINANCE:BTCUSDT",
  "interval": "1h",
  "indicators": ["RSI", "EMA 20", "EMA 50"],
  "theme": "dark",
  "width": 1280,
  "height": 720,
  "screenshotBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "screenshotDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "screenshotUrl": "https://api.apify.com/v2/key-value-stores/.../chart_BINANCE_BTCUSDT_2024-01-01T12-00-00.png",
  "screenshotKey": "chart_BINANCE_BTCUSDT_2024-01-01T12-00-00.png",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## GitHub Setup & Deployment

### 1. Initialize Git Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: TradingView chart capture actor"
```

### 2. Push to GitHub

```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/tradingview-chart-capture.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Apify

#### Option A: Deploy from GitHub (Recommended)

1. Go to [Apify Console](https://console.apify.com/)
2. Click **"Create new"** → **"Actor"**
3. Select **"Deploy from GitHub"**
4. Connect your GitHub account
5. Select the repository: `tradingview-chart-capture`
6. Apify will automatically build and deploy your actor

#### Option B: Deploy via CLI

```bash
# Login to Apify
npx apify login

# Build the actor
npx apify build

# Push to Apify
npx apify push
```

### 4. Configure GitHub Actions (Optional)

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically:
- Installs dependencies
- Builds the actor
- Pushes to Apify on every push to `main` branch

**Setup:**
1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add a new secret named `APIFY_TOKEN` with your Apify API token
4. Get your token from: [Apify Settings → Integrations](https://console.apify.com/account/integrations)

## Project Structure

```
tradingview-chart-capture/
├── main.js              # Main actor logic
├── package.json         # Node.js dependencies
├── apify.json          # Apify actor configuration
├── INPUT_SCHEMA.json   # Input schema definition
├── Dockerfile          # Docker image for Apify
├── .gitignore         # Git ignore rules
├── README.md          # This file
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions CI/CD
```

## How It Works

1. **Launch Browser**: Opens Chromium headless via Playwright
2. **Navigate**: Goes to TradingView chart URL with specified symbol
3. **Login** (optional): Authenticates if credentials provided
4. **Configure Chart**: 
   - Sets theme (dark/light)
   - Changes timeframe/interval
5. **Add Indicators**: 
   - Uses keyboard shortcuts (Shift+I)
   - Types indicator name and selects from dropdown
6. **Hide UI** (optional): Removes toolbars and watermarks via CSS
7. **Capture**: Takes PNG screenshot
8. **Save**: Stores screenshot in Key-Value store and metadata in Dataset

## Troubleshooting

### Chart Not Loading
- Increase timeout values in `main.js`
- Check if TradingView is accessible from your network
- Verify the symbol format is correct

### Indicators Not Adding
- Ensure indicator names match TradingView's exact naming
- Some indicators may require different input formats
- Check browser console for errors

### Login Issues
- TradingView may require CAPTCHA or 2FA
- Consider using session cookies instead of username/password

### Screenshot Quality
- Increase `width` and `height` for higher resolution
- Ensure `hideUi` is `true` for cleaner screenshots

## License

ISC

## Support

For issues and questions:
- Check [Apify Documentation](https://docs.apify.com/)
- Visit [Apify Community](https://forum.apify.com/)
- Review [TradingView Terms of Service](https://www.tradingview.com/policies/)

---

**Note**: This actor is for educational and personal use. Ensure compliance with TradingView's Terms of Service when using this tool.

