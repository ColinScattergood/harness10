import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/colin/harness10/artifacts/screenshots';

function log(msg) { console.log(`[QA] ${msg}`); }

async function screenshot(page, name) {
  const path = `${SS}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  log(`Screenshot: ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // === MOBILE TESTS ===
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mpage = await mobileCtx.newPage();

  log('Mobile: signing up...');
  await mpage.goto(`${BASE}/sign-up`);
  await mpage.waitForTimeout(1000);
  await mpage.fill('input[name="name"]', 'QA Mobile');
  await mpage.fill('input[name="email"]', `qa-mob-${Date.now()}@test.com`);
  await mpage.fill('input[name="password"]', 'TestPass123!');
  await mpage.click('button[type="submit"]');
  await mpage.waitForURL('**/notes**', { timeout: 10000 });
  await mpage.waitForTimeout(1000);
  await screenshot(mpage, 'web-s2-39-mobile-notes-empty');

  // Create a note on mobile
  await mpage.click('button:has-text("New Note")');
  await mpage.waitForURL('**/notes/**', { timeout: 10000 });
  await mpage.waitForTimeout(1000);
  await mpage.locator('input[aria-label="Note title"]').fill('Mobile Test Note');
  await mpage.locator('textarea[aria-label="Note content"]').fill('# Mobile\n\nTesting on mobile viewport.');
  await mpage.waitForTimeout(2000);
  await screenshot(mpage, 'web-s2-40-mobile-editor');

  // Preview on mobile
  await mpage.click('button:has-text("Preview")');
  await mpage.waitForTimeout(1000);
  await screenshot(mpage, 'web-s2-41-mobile-preview');

  // Check if editor is hidden on mobile when preview is shown
  const editorVisible = await mpage.locator('textarea[aria-label="Note content"]').isVisible();
  log(`Editor visible during preview on mobile: ${editorVisible}`);
  // Spec says preview should replace editor on mobile

  // Go back
  await mpage.click('button[aria-label="Back to notes"]');
  await mpage.waitForTimeout(2000);
  await screenshot(mpage, 'web-s2-42-mobile-list-with-note');

  // Check hamburger menu for sidebar
  const hamburger = mpage.locator('button[aria-label*="menu"], button[aria-label*="Menu"], button[aria-label*="sidebar"], button[aria-label*="Sidebar"]');
  log(`Hamburger buttons found: ${await hamburger.count()}`);
  if (await hamburger.count() > 0) {
    await hamburger.first().click();
    await mpage.waitForTimeout(500);
    await screenshot(mpage, 'web-s2-43-mobile-sidebar-open');
  }

  // === DESKTOP - LANDING & AUTH PAGES ===
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dpage = await desktopCtx.newPage();

  await dpage.goto(BASE);
  await dpage.waitForTimeout(1000);
  await screenshot(dpage, 'web-s2-44-landing');

  await dpage.goto(`${BASE}/sign-in`);
  await dpage.waitForTimeout(1000);
  await screenshot(dpage, 'web-s2-45-signin');

  await dpage.goto(`${BASE}/sign-up`);
  await dpage.waitForTimeout(1000);
  await screenshot(dpage, 'web-s2-46-signup');

  // === LIGHT MODE TEST ===
  // Sign in and check light mode
  await dpage.fill('input[name="name"]', 'QA Light');
  await dpage.fill('input[name="email"]', `qa-light-${Date.now()}@test.com`);
  await dpage.fill('input[name="password"]', 'TestPass123!');
  await dpage.click('button[type="submit"]');
  await dpage.waitForURL('**/notes**', { timeout: 10000 });
  await dpage.waitForTimeout(1000);

  // Find theme toggle
  const themeBtn = dpage.locator('button[aria-label*="light"], button[aria-label*="theme"], button[aria-label*="Switch"]');
  log(`Theme toggle buttons: ${await themeBtn.count()}`);
  if (await themeBtn.count() > 0) {
    await themeBtn.first().click();
    await dpage.waitForTimeout(1000);
    await screenshot(dpage, 'web-s2-47-light-mode');
  }

  // Settings page
  await dpage.goto(`${BASE}/settings`);
  await dpage.waitForTimeout(1000);
  await screenshot(dpage, 'web-s2-48-settings');

  await browser.close();
  log('Done!');
})();
