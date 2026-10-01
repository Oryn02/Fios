/**
 * Mobile proof screenshots for theme-ui crash-fix (v4.1.1).
 * Viewport: 390×844 — dismiss cookies + onboarding first.
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = '/cursor/stores/bc-e8c68391-f2ce-4403-8916-dfd33f862bcb/media/theme-ui-fix';
const ART = '/opt/cursor/artifacts/screenshots';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

async function save(page, name) {
  const dest1 = path.join(OUT, name);
  const dest2 = path.join(ART, name);
  await page.screenshot({ path: dest1, fullPage: false });
  fs.copyFileSync(dest1, dest2);
  console.log('saved', name, fs.statSync(dest1).size);
}

async function dismissChrome(page) {
  // Cookie consent
  const accept = page.getByRole('button', { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(500);
  }
  const essential = page.getByRole('button', { name: /essential only/i }).first();
  if (await essential.isVisible().catch(() => false)) {
    await essential.click();
    await page.waitForTimeout(500);
  }
  // Onboarding skip
  const skip = page.getByRole('button', { name: /skip for now|skip/i }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(600);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  // Prefill demo + unlock liquid frost before first paint
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('fios_demo', '1');
      localStorage.setItem(
        'fios_cookie_consent',
        JSON.stringify({ accepted: true, essential: true, preferences: true, at: new Date().toISOString() })
      );
      localStorage.setItem('fios_onboarding_v41_done', '1');
      const rewards = ['theme:liquid-frost', 'liquid-frost', 'theme:terminal-matrix', 'terminal-matrix'];
      localStorage.setItem('fios_unlocked_rewards', JSON.stringify(rewards));
      localStorage.setItem('fios_accent', 'liquid-frost');
    } catch {}
  });

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Demo CTA if still on landing
  const demoBtn = page.getByRole('button', { name: /demo|try|explore/i }).first();
  if (await demoBtn.isVisible().catch(() => false)) {
    await demoBtn.click();
    await page.waitForTimeout(1200);
  }
  await dismissChrome(page);
  await page.waitForTimeout(500);

  await save(page, 'mobile-nav-declutter.png');
  await save(page, 'mobile-glass.png');

  // Sidebar
  const menu = page.getByRole('button', { name: /open navigation menu/i }).first();
  await menu.click();
  await page.waitForTimeout(700);
  await save(page, 'mobile-sidebar-purged.png');
  // Close via Overview
  const overview = page.locator('#fios-mobile-drawer').getByRole('button', { name: /^Overview$/i }).first();
  if (await overview.isVisible().catch(() => false)) await overview.click();
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Modules
  await page.getByRole('navigation', { name: /mobile shortcuts/i }).getByRole('button', { name: /Modules/i }).click();
  await page.waitForTimeout(900);
  await dismissChrome(page);
  await save(page, 'mobile-modules.png');

  // Studio
  await page.getByRole('navigation', { name: /mobile shortcuts/i }).getByRole('button', { name: /Studio/i }).click();
  await page.waitForTimeout(900);
  await save(page, 'mobile-studio-heading.png');

  // Profile
  await page.getByRole('button', { name: /open user profile/i }).click();
  await page.waitForTimeout(800);
  await save(page, 'mobile-profile-scroll.png');

  // Also alias sidebar-purged without mobile- prefix for the explicit ask
  fs.copyFileSync(path.join(OUT, 'mobile-sidebar-purged.png'), path.join(OUT, 'sidebar-purged.png'));
  fs.copyFileSync(path.join(OUT, 'mobile-sidebar-purged.png'), path.join(ART, 'sidebar-purged.png'));

  console.log('files:', fs.readdirSync(OUT));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
