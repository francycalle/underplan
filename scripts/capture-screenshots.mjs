import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { DEMO_CHANNELS } from '../src/data/demoLayout.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const screenshotsDir = path.join(rootDir, 'docs', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function run() {
  const url = 'http://localhost:5173';
  console.log(`🌐 Connecting to app at ${url}...`);

  console.log('📱 Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 2, // HiDPI / Retina crispness
    });

    console.log('🔗 Navigating to app...');
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Populate localStorage with DEMO_CHANNELS if needed
    console.log('📦 Setting demo layout in localStorage...');
    await page.evaluate((channels) => {
      localStorage.setItem('underplan_channels', JSON.stringify(channels));
    }, DEMO_CHANNELS);

    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Capture Main Overview
    console.log('📸 Capturing 01-overview.png...');
    const heroPath = path.join(screenshotsDir, '01-overview.png');
    await page.screenshot({ path: heroPath });
    console.log(`✅ Saved: ${heroPath}`);

    // 2. Select Channel for Inspector View
    console.log('🔍 Selecting channel for inspector view...');
    const channelEl = await page.$('#channel-group-chan-figma-pwr-y');
    if (channelEl) {
      await channelEl.click();
      await new Promise((r) => setTimeout(r, 700));
    }
    console.log('📸 Capturing 02-channel-inspector.png...');
    const inspectorPath = path.join(screenshotsDir, '02-channel-inspector.png');
    await page.screenshot({ path: inspectorPath });
    console.log(`✅ Saved: ${inspectorPath}`);

    // Close Inspector
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 400));

    // 3. Open Surface & Platform Setup Modal
    console.log('📐 Opening Surface & Platform Setup Modal...');
    const buttons = await page.$$('header button');
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes('My Setup') || text.includes('Multiboard')) {
        await b.click();
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
    }

    const cfgBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('Configure Surface & Dimensions'));
    });

    if (cfgBtn) {
      await cfgBtn.click();
      await new Promise((r) => setTimeout(r, 800));
    }

    console.log('📸 Capturing 03-grid-setup.png...');
    const setupPath = path.join(screenshotsDir, '03-grid-setup.png');
    const legacyPalettePath = path.join(screenshotsDir, '03-channel-palette.png');
    await page.screenshot({ path: setupPath });
    // Also copy to legacy filename for backwards compatibility
    fs.copyFileSync(setupPath, legacyPalettePath);
    console.log(`✅ Saved: ${setupPath} and ${legacyPalettePath}`);

    // Close Setup Modal
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // 4. Open BOM Drawer / Modal
    console.log('📋 Opening BOM drawer modal...');
    const headerButtons = await page.$$('header button');
    for (const b of headerButtons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.trim() === 'BOM') {
        await b.click();
        await new Promise((r) => setTimeout(r, 700));
        break;
      }
    }
    console.log('📸 Capturing 04-bom-modal.png...');
    const bomPath = path.join(screenshotsDir, '04-bom-modal.png');
    await page.screenshot({ path: bomPath });
    console.log(`✅ Saved: ${bomPath}`);

    console.log('🎉 All screenshots captured successfully in Retina quality!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
