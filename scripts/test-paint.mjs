import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 900, height: 640 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// click the Pintura card (🎨) — find by text
const card = page.locator('.app-card', { hasText: 'Pintura' });
await card.click();
await page.waitForTimeout(600);

// draw a stroke + place a stamp programmatically for a richer screenshot
await page.mouse.move(200, 300);
await page.mouse.down();
await page.mouse.move(400, 320, { steps: 20 });
await page.mouse.up();

await page.screenshot({ path: '_shots/paint_app.png' });

// also capture the toolbar buttons presence
const title = await page.textContent('.paint-title');
const stamps = await page.locator('.paint-stamp').count();
const colors = await page.locator('.paint-color').count();
console.log(JSON.stringify({ title, stamps, colors }));

await b.close();
