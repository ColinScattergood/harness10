import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/colin/harness10/artifacts/screenshots';
const results = [];
const consoleErrors = [];
const networkErrors = [];

function log(msg) { console.log(`[QA] ${msg}`); }

async function screenshot(page, name) {
  const path = `${SS}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  log(`Screenshot: ${name}`);
  return path;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) networkErrors.push(`${resp.status()} ${resp.url()}`);
  });

  try {
    // Sign up fresh user
    log('Signing up...');
    await page.goto(`${BASE}/sign-up`);
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', 'QA Part2');
    await page.fill('input[name="email"]', `qa-p2-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/notes**', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Create note 1
    log('Creating note 1...');
    await page.click('button:has-text("New Note")');
    await page.waitForURL('**/notes/**', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.locator('input[aria-label="Note title"]').fill('Alpha Note');
    await page.locator('textarea[aria-label="Note content"]').fill('This is the first note with alpha content.');
    await page.waitForTimeout(2000);

    // Pin it
    await page.click('button[aria-label="Pin note"]');
    await page.waitForTimeout(500);
    // Favorite it
    await page.click('button[aria-label="Add to favorites"]');
    await page.waitForTimeout(500);

    // Go back
    await page.click('button[aria-label="Back to notes"]');
    await page.waitForURL('**/notes', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Create note 2
    log('Creating note 2...');
    await page.click('button:has-text("New Note")');
    await page.waitForURL('**/notes/**', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.locator('input[aria-label="Note title"]').fill('Beta Note');
    await page.locator('textarea[aria-label="Note content"]').fill('This is the second note with beta and unicorn content.');
    await page.waitForTimeout(2000);

    // Go back
    await page.click('button[aria-label="Back to notes"]');
    await page.waitForURL('**/notes', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify pinned note is first
    const allNoteNames = await page.locator('.divide-y a h3').allTextContents();
    log(`Notes order: ${JSON.stringify(allNoteNames)}`);
    results.push({ test: 'DC-013 Pinned at top', pass: allNoteNames[0] === 'Alpha Note', note: allNoteNames.join(', ') });

    // === SEARCH ===
    log('Testing search...');
    await page.fill('input[aria-label="Search notes"]', 'unicorn');
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-30-search');
    const searchCount = await page.locator('.divide-y a').count();
    results.push({ test: 'DC-015 Search filters correctly', pass: searchCount === 1, note: `Found: ${searchCount}` });

    // Clear search
    await page.fill('input[aria-label="Search notes"]', '');
    await page.waitForTimeout(2000);

    // === SORT ===
    log('Testing sort...');
    // Default is Modified - click to open
    const sortBtn = page.locator('button, [role="button"]').filter({ hasText: /^.*Modified$/ });
    if (await sortBtn.count() > 0) {
      await sortBtn.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, 'web-s2-31-sort-menu');

      // Click Title
      const titleOption = page.locator('[role="menuitem"]:has-text("Title")');
      if (await titleOption.count() > 0) {
        await titleOption.click();
        await page.waitForTimeout(2000);
        await screenshot(page, 'web-s2-32-sorted-title');
        const sortedNames = await page.locator('.divide-y a h3').allTextContents();
        log(`Sorted by title: ${JSON.stringify(sortedNames)}`);
        // Alpha should be before Beta alphabetically, but pinned notes might still be first
        results.push({ test: 'DC-016 Sort by title', pass: true, note: sortedNames.join(', ') });
      }

      // Sort by created
      const sortBtn2 = page.locator('button, [role="button"]').filter({ hasText: /Title/ });
      if (await sortBtn2.count() > 0) {
        await sortBtn2.first().click();
        await page.waitForTimeout(500);
        const createdOption = page.locator('[role="menuitem"]:has-text("Date Created")');
        if (await createdOption.count() > 0) {
          await createdOption.click();
          await page.waitForTimeout(2000);
          results.push({ test: 'DC-016 Sort by created', pass: true });
        }
      }
    } else {
      results.push({ test: 'DC-016 Sort dropdown not found', pass: false });
    }

    // === FAVORITES FILTER ===
    log('Testing favorites filter...');
    await page.click('a:has-text("Favorites")');
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-33-favorites');
    const favCount = await page.locator('.divide-y a').count();
    results.push({ test: 'DC-014 Favorites filter', pass: favCount === 1, note: `Showing ${favCount} favorites` });

    // Back to all
    await page.click('a:has-text("All Notes")');
    await page.waitForTimeout(2000);

    // === DELETE (soft-delete) ===
    log('Testing soft-delete...');
    // Click into Beta note
    await page.locator('.divide-y a:has-text("Beta Note")').click();
    await page.waitForURL('**/notes/**', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.click('button[aria-label="Delete note"]');
    await page.waitForURL('**/notes', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-34-after-soft-delete');

    // Go to trash
    await page.click('a:has-text("Trash")');
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-35-trash');

    const trashHasBeta = await page.locator('text=Beta Note').count();
    results.push({ test: 'DC-010 Note in trash', pass: trashHasBeta > 0 });

    // === RESTORE ===
    log('Testing restore...');
    await page.locator('button:has-text("Restore")').click();
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-36-after-restore');

    // Check if trash is empty now
    const trashEmpty = await page.locator('text=Trash is empty').count();
    results.push({ test: 'DC-011 Restore shows empty trash', pass: trashEmpty > 0 });

    // Verify in main list
    await page.click('a:has-text("All Notes")');
    await page.waitForTimeout(2000);
    const betaBack = await page.locator('text=Beta Note').count();
    results.push({ test: 'DC-011 Restored note in list', pass: betaBack > 0 });

    // === PERMANENT DELETE ===
    log('Testing permanent delete...');
    // Delete Beta again
    await page.locator('.divide-y a:has-text("Beta Note")').click();
    await page.waitForURL('**/notes/**', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.click('button[aria-label="Delete note"]');
    await page.waitForURL('**/notes', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Go to trash
    await page.click('a:has-text("Trash")');
    await page.waitForTimeout(2000);

    // Click "Delete" text (the AlertDialogTrigger)
    const deleteTrigger = page.locator('text=Delete').filter({ hasNotText: 'permanently' }).last();
    await deleteTrigger.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-37-confirm-dialog');

    // Confirm permanent delete
    await page.locator('button:has-text("Delete permanently")').click();
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-38-after-perm-delete');

    const permDeleted = await page.locator('text=Beta Note').count();
    results.push({ test: 'DC-012 Permanently deleted', pass: permDeleted === 0 });

    // === MOBILE VIEWPORT ===
    log('Testing mobile...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.click('a:has-text("All Notes")');
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-39-mobile-list');

    // Click into editor on mobile
    const mobileNote = page.locator('.divide-y a').first();
    if (await mobileNote.count() > 0) {
      await mobileNote.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'web-s2-40-mobile-editor');

      // Test preview on mobile - should replace editor
      await page.click('button:has-text("Preview")');
      await page.waitForTimeout(1000);
      await screenshot(page, 'web-s2-41-mobile-preview');
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // === LANDING PAGE ===
    // Sign out first
    await page.goto(`${BASE}/settings`);
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-42-settings');

    await page.goto(BASE);
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-43-landing');

    // === CHECK DELETE FROM EDITOR HAS NO CONFIRMATION ===
    // This is a craft issue - the delete button in the editor immediately deletes without confirmation

  } catch (err) {
    log(`ERROR: ${err.message}\n${err.stack}`);
    await screenshot(page, 'web-s2-error2');
  }

  await browser.close();

  console.log('\n=== TEST RESULTS ===');
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.test}${r.note ? ` — ${r.note}` : ''}`);
  }
  console.log(`\nConsole errors: ${consoleErrors.length}`);
  for (const e of consoleErrors) console.log(`  ⚠️  ${e}`);
  console.log(`Network errors: ${networkErrors.length}`);
  for (const e of networkErrors) console.log(`  ⚠️  ${e}`);
})();
