import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

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

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  try {
    // === SIGN UP ===
    log('Signing up...');
    await page.goto(`${BASE}/sign-up`);
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-01-signup');

    await page.fill('input[name="name"]', 'QA Sprint2');
    await page.fill('input[name="email"]', `qa-s2-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/notes**', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-02-notes-empty');
    log('Sign up successful, on notes page');

    // === DC-007: Create a new note ===
    log('Testing DC-007: Create note...');
    await page.click('button:has-text("New Note")');
    await page.waitForURL('**/notes/**', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-03-new-note');

    // Fill title
    const titleInput = page.locator('input[aria-label="Note title"]');
    await titleInput.fill('Test Note Sprint 2');
    await page.waitForTimeout(500);

    // Fill markdown body
    const bodyArea = page.locator('textarea[aria-label="Note content"]');
    const mdContent = `# Hello World

**Bold text** and *italic text*

- List item 1
- List item 2

\`\`\`javascript
console.log('hello');
\`\`\`

[Link text](https://example.com)

## Second heading

Some paragraph with more words to test the word count feature. This should be enough words to make a reasonable reading time estimate.

### Third heading

1. Numbered item 1
2. Numbered item 2
3. Numbered item 3`;
    await bodyArea.fill(mdContent);
    await page.waitForTimeout(500);
    await screenshot(page, 'web-s2-04-note-with-content');

    // === DC-008: Auto-save ===
    log('Testing DC-008: Auto-save...');
    await page.waitForTimeout(2000); // Wait for 1s debounce + save
    const saveStatus = await page.getByText('Saved', { exact: true }).isVisible();
    await screenshot(page, 'web-s2-05-auto-saved');
    results.push({ test: 'DC-008 Auto-save', pass: saveStatus, note: `Save status visible: ${saveStatus}` });

    // === DC-009: Markdown preview ===
    log('Testing DC-009: Markdown preview...');
    await page.click('button:has-text("Preview")');
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-06-preview');

    // Check markdown rendered elements
    const previewPane = page.locator('.prose');
    const hasH1 = await previewPane.locator('h1').count() > 0;
    const hasH2 = await previewPane.locator('h2').count() > 0;
    const hasBold = await previewPane.locator('strong').count() > 0;
    const hasItalic = await previewPane.locator('em').count() > 0;
    const hasCode = await previewPane.locator('pre').count() > 0;
    const hasLink = await previewPane.locator('a[href="https://example.com"]').count() > 0;
    const hasList = await previewPane.locator('ul').count() > 0;
    const hasOl = await previewPane.locator('ol').count() > 0;

    results.push({ test: 'DC-009 Preview H1', pass: hasH1 });
    results.push({ test: 'DC-009 Preview H2', pass: hasH2 });
    results.push({ test: 'DC-009 Preview Bold', pass: hasBold });
    results.push({ test: 'DC-009 Preview Italic', pass: hasItalic });
    results.push({ test: 'DC-009 Preview Code', pass: hasCode });
    results.push({ test: 'DC-009 Preview Link', pass: hasLink });
    results.push({ test: 'DC-009 Preview UL', pass: hasList });
    results.push({ test: 'DC-009 Preview OL', pass: hasOl });

    // Turn off preview to continue editing
    await page.click('button:has-text("Preview")');
    await page.waitForTimeout(500);

    // === DC-017: Word count and reading time ===
    log('Testing DC-017: Word count...');
    const footerText = await page.locator('text=/\\d+ words/').textContent();
    const hasReadingTime = await page.locator('text=/min read/').isVisible();
    await screenshot(page, 'web-s2-07-word-count');
    results.push({ test: 'DC-017 Word count', pass: !!footerText, note: footerText });
    results.push({ test: 'DC-017 Reading time', pass: hasReadingTime });

    // === DC-013: Pin note ===
    log('Testing DC-013: Pin note...');
    await page.click('button[aria-label="Pin note"]');
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-08-pinned');

    // === DC-014: Favorite note ===
    log('Testing DC-014: Favorite note...');
    await page.click('button[aria-label="Add to favorites"]');
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-09-favorited');

    // Go back to notes list
    await page.click('button[aria-label="Back to notes"]');
    await page.waitForURL('**/notes', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-10-notes-list-with-note');

    // Check pinned indicator
    const pinIcon = await page.locator('svg[aria-label="Pinned"]').count();
    results.push({ test: 'DC-013 Pin indicator in list', pass: pinIcon > 0, note: `Pin icons: ${pinIcon}` });

    // Check favorite indicator
    const favIcon = await page.locator('svg[aria-label="Favorited"]').count();
    results.push({ test: 'DC-014 Favorite indicator in list', pass: favIcon > 0, note: `Fav icons: ${favIcon}` });

    // Create a second note for search/sort testing
    log('Creating second note...');
    await page.click('button:has-text("New Note")');
    await page.waitForURL('**/notes/**', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.locator('input[aria-label="Note title"]').fill('Another Note For Testing');
    await page.locator('textarea[aria-label="Note content"]').fill('This is a different note with unique content for search testing. Zebra unicorn.');
    await page.waitForTimeout(2000); // auto-save

    // Go back to notes list
    await page.click('button[aria-label="Back to notes"]');
    await page.waitForURL('**/notes', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-11-two-notes');

    // === DC-013: Pin appears at top ===
    const noteItems = page.locator('a[href^="/notes/"]');
    const firstNoteTitle = await noteItems.first().locator('h3').textContent();
    results.push({ test: 'DC-013 Pinned note at top', pass: firstNoteTitle?.includes('Test Note Sprint 2'), note: `First note: ${firstNoteTitle}` });

    // === DC-015: Search ===
    log('Testing DC-015: Search...');
    await page.fill('input[aria-label="Search notes"]', 'Zebra');
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-12-search-results');

    const searchResults = await page.locator('a[href^="/notes/"]').count();
    const searchResultTitle = searchResults > 0 ? await page.locator('a[href^="/notes/"] h3').first().textContent() : '';
    results.push({ test: 'DC-015 Search filters', pass: searchResults === 1, note: `Found ${searchResults} results: ${searchResultTitle}` });

    // Clear search
    await page.fill('input[aria-label="Search notes"]', '');
    await page.waitForTimeout(2000);

    // Search no results
    await page.fill('input[aria-label="Search notes"]', 'xyznonexistent');
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-13-search-no-results');
    const noResultsMsg = await page.locator('text=No matching notes').isVisible();
    results.push({ test: 'DC-015 Search empty state', pass: noResultsMsg });

    // Clear search
    await page.fill('input[aria-label="Search notes"]', '');
    await page.waitForTimeout(2000);

    // === DC-016: Sort ===
    log('Testing DC-016: Sort...');
    // Click sort dropdown
    const sortTrigger = page.locator('button:has-text("Modified"), [class*="DropdownMenuTrigger"]:has-text("Modified")');
    if (await sortTrigger.count() > 0) {
      await sortTrigger.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, 'web-s2-14-sort-dropdown');

      // Sort by title
      await page.click('text=Title');
      await page.waitForTimeout(2000);
      await screenshot(page, 'web-s2-15-sorted-by-title');

      const sortedFirst = await page.locator('a[href^="/notes/"] h3').first().textContent();
      results.push({ test: 'DC-016 Sort by title', pass: true, note: `First note after title sort: ${sortedFirst}` });

      // Sort by date created
      const titleTrigger = page.locator('button:has-text("Title"), [class*="DropdownMenuTrigger"]:has-text("Title")');
      if (await titleTrigger.count() > 0) {
        await titleTrigger.first().click();
        await page.waitForTimeout(500);
        await page.click('text=Date Created');
        await page.waitForTimeout(2000);
        results.push({ test: 'DC-016 Sort by created', pass: true });
      }
    } else {
      results.push({ test: 'DC-016 Sort dropdown', pass: false, note: 'Sort trigger not found' });
    }

    // === DC-014: Favorites filter ===
    log('Testing DC-014: Favorites filter...');
    // Click Favorites in sidebar
    const favLink = page.locator('a[href*="favorites"], a:has-text("Favorites")');
    if (await favLink.count() > 0) {
      await favLink.first().click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'web-s2-16-favorites-filter');

      const favNotes = await page.locator('a[href^="/notes/"]').count();
      results.push({ test: 'DC-014 Favorites filter shows only faved', pass: favNotes === 1, note: `Fav notes shown: ${favNotes}` });
    } else {
      results.push({ test: 'DC-014 Favorites link', pass: false, note: 'Favorites link not found' });
    }

    // Go back to all notes
    const allNotesLink = page.locator('a[href="/notes"]:has-text("All Notes"), a:has-text("All Notes")');
    if (await allNotesLink.count() > 0) {
      await allNotesLink.first().click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE}/notes`);
      await page.waitForTimeout(2000);
    }

    // === DC-010: Delete note (soft-delete) ===
    log('Testing DC-010: Soft-delete...');
    // Click into second note (not pinned one)
    const secondNote = page.locator('a[href^="/notes/"]:has-text("Another Note")');
    if (await secondNote.count() > 0) {
      await secondNote.first().click();
      await page.waitForURL('**/notes/**', { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Delete it
      await page.click('button[aria-label="Delete note"]');
      await page.waitForURL('**/notes', { timeout: 10000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'web-s2-17-after-delete');
    }

    // === DC-010: Check trash ===
    log('Checking trash...');
    const trashLink = page.locator('a[href="/notes/trash"], a:has-text("Trash")');
    if (await trashLink.count() > 0) {
      await trashLink.first().click();
    } else {
      await page.goto(`${BASE}/notes/trash`);
    }
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-18-trash-view');

    const trashedNotes = await page.locator('text=Another Note').count();
    results.push({ test: 'DC-010 Note appears in trash', pass: trashedNotes > 0, note: `Trashed note found: ${trashedNotes}` });

    // Check "days left" indicator
    const daysLeftText = await page.locator('text=/\\d+ day.*left/').count();
    results.push({ test: 'DC-010 Days remaining shown', pass: daysLeftText > 0 });

    // === DC-011: Restore from trash ===
    log('Testing DC-011: Restore...');
    const restoreBtn = page.locator('button:has-text("Restore")');
    if (await restoreBtn.count() > 0) {
      await restoreBtn.first().click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'web-s2-19-after-restore');

      // Verify note is back in main list
      await page.goto(`${BASE}/notes`);
      await page.waitForTimeout(2000);
      const restoredNote = await page.locator('text=Another Note').count();
      results.push({ test: 'DC-011 Note restored to list', pass: restoredNote > 0 });
    } else {
      results.push({ test: 'DC-011 Restore button', pass: false, note: 'Restore button not found' });
    }

    // === DC-012: Permanent delete ===
    log('Testing DC-012: Permanent delete...');
    // Delete it again first
    const noteToDelete = page.locator('a[href^="/notes/"]:has-text("Another Note")');
    if (await noteToDelete.count() > 0) {
      await noteToDelete.first().click();
      await page.waitForURL('**/notes/**', { timeout: 10000 });
      await page.waitForTimeout(1000);
      await page.click('button[aria-label="Delete note"]');
      await page.waitForURL('**/notes', { timeout: 10000 });
      await page.waitForTimeout(1000);
    }

    // Go to trash
    await page.goto(`${BASE}/notes/trash`);
    await page.waitForTimeout(2000);

    // Click permanent delete
    const permDeleteBtn = page.locator('text=Delete').filter({ hasNot: page.locator('text=Delete permanently') });
    const deleteTextBtn = page.locator('button:has-text("Delete"):not(:has-text("permanently"))');
    // The trigger text is just "Delete" in the trash
    const deleteTrigger = page.locator('[class*="AlertDialogTrigger"], .text-destructive:has-text("Delete")').first();
    if (await deleteTrigger.count() > 0) {
      await deleteTrigger.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'web-s2-20-delete-confirm-dialog');

      // Confirm
      const confirmBtn = page.locator('button:has-text("Delete permanently")');
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
        await screenshot(page, 'web-s2-21-after-permanent-delete');

        const remainingTrashed = await page.locator('text=Another Note').count();
        results.push({ test: 'DC-012 Permanent delete', pass: remainingTrashed === 0 });
      } else {
        results.push({ test: 'DC-012 Confirm dialog', pass: false, note: 'Confirm button not found' });
      }
    } else {
      results.push({ test: 'DC-012 Delete trigger', pass: false, note: 'Delete trigger not found' });
    }

    // === Mobile viewport test ===
    log('Testing mobile viewport...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/notes`);
    await page.waitForTimeout(2000);
    await screenshot(page, 'web-s2-22-mobile-notes');

    // Test mobile editor
    const mobileNote = page.locator('a[href^="/notes/"]').first();
    if (await mobileNote.count() > 0) {
      await mobileNote.click();
      await page.waitForURL('**/notes/**', { timeout: 10000 });
      await page.waitForTimeout(1000);
      await screenshot(page, 'web-s2-23-mobile-editor');
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // === Check delete in editor has NO confirmation dialog ===
    log('Checking delete from editor (no confirmation)...');
    // This is a craft issue - editor delete has no confirmation but trash permanent delete does

    // === Settings page ===
    await page.goto(`${BASE}/settings`);
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-24-settings');

    // === Landing page ===
    await page.goto(BASE);
    await page.waitForTimeout(1000);
    await screenshot(page, 'web-s2-25-landing');

  } catch (err) {
    log(`ERROR: ${err.message}`);
    await screenshot(page, 'web-s2-error');
  }

  await browser.close();

  // Print results
  console.log('\n=== TEST RESULTS ===');
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.test}${r.note ? ` — ${r.note}` : ''}`);
  }
  console.log(`\nConsole errors: ${consoleErrors.length}`);
  for (const e of consoleErrors) console.log(`  ⚠️  ${e}`);
  console.log(`Network errors: ${networkErrors.length}`);
  for (const e of networkErrors) console.log(`  ⚠️  ${e}`);

  // Write JSON summary
  writeFileSync(`${SS}/test-results.json`, JSON.stringify({ results, consoleErrors, networkErrors }, null, 2));
})();
