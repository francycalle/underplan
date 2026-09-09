import { preview } from 'vite';
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
  console.log('🚀 Starting Vite preview server...');
  const previewServer = await preview({
    root: rootDir,
    preview: {
      port: 5198,
      strictPort: true,
    },
  });

  const url = 'http://localhost:5198';
  console.log(`🌐 Server listening at ${url}`);

  console.log('📱 Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: true,
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

    // Populate localStorage with DEMO_CHANNELS
    console.log('📦 Setting demo layout in localStorage...');
    await page.evaluate((channels) => {
      localStorage.setItem('underplan_channels', JSON.stringify(channels));
    }, DEMO_CHANNELS);

    // Reload page to apply localStorage state cleanly
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    // 1. Capture Main Hero Overview
    console.log('📸 Capturing 01-overview.png...');
    const heroPath = path.join(screenshotsDir, '01-overview.png');
    await page.screenshot({ path: heroPath });
    console.log(`✅ Saved: ${heroPath}`);

    // 2. Click on a channel to show the Inspector Panel
    console.log('🔍 Selecting channel for inspector view...');
    const channelEl = await page.$('#channel-group-chan-demo-data-1');
    if (channelEl) {
      await channelEl.click();
      await new Promise((r) => setTimeout(r, 700));
    }
    console.log('📸 Capturing 02-channel-inspector.png...');
    const inspectorPath = path.join(screenshotsDir, '02-channel-inspector.png');
    await page.screenshot({ path: inspectorPath });
    console.log(`✅ Saved: ${inspectorPath}`);

    // 3. Scroll Tool Palette sidebar to showcase modular channel catalog
    console.log('🎨 Showcasing modular channel library in palette...');
    await page.keyboard.press('Escape');
    await page.keyboard.press('v');
    await page.evaluate(() => {
      const aside = document.querySelector('aside');
      if (aside) aside.scrollTop = 280;
    });
    await new Promise((r) => setTimeout(r, 500));
    console.log('📸 Capturing 03-channel-palette.png...');
    const palettePath = path.join(screenshotsDir, '03-channel-palette.png');
    await page.screenshot({ path: palettePath });
    console.log(`✅ Saved: ${palettePath}`);

    // 4. Open the BOM Drawer / Modal
    console.log('📋 Opening BOM drawer modal...');
    const bomButton = await page.$('button[title="Open complete Bill of Materials (BOM)"]');
    if (bomButton) {
      await bomButton.click();
      await new Promise((r) => setTimeout(r, 700));
    }
    console.log('📸 Capturing 04-bom-modal.png...');
    const bomPath = path.join(screenshotsDir, '04-bom-modal.png');
    await page.screenshot({ path: bomPath });
    console.log(`✅ Saved: ${bomPath}`);

    console.log('🎉 All 4 screenshots captured successfully!');
  } finally {
    await browser.close();
    await previewServer.close();
  }
}

run().catch((err) => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
