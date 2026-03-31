import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "Test User";

let browser, context, page;
let passed = 0;
let failed = 0;
const failures = [];

async function assert(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS: ${label}`);
  } catch (err) {
    failed++;
    failures.push({ label, error: err.message });
    console.log(`  FAIL: ${label} -- ${err.message}`);
  }
}

/** Click the New Note button. It triggers a server action that does redirect().
 *  Playwright sometimes sees DOM detachment during the redirect.
 *  Strategy: click with force to skip actionability checks, then wait for navigation. */
async function clickNewNote(p) {
  const btn = p.locator('button:has-text("New Note")');
  await btn.waitFor({ state: "visible", timeout: 5000 });
  // Use force click to avoid "element detached" retries during server action redirect
  await btn.click({ force: true, noWaitAfter: true });
  await p.waitForURL("**/notes/**", { timeout: 15000 });
}

async function run() {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();
  page.setDefaultTimeout(10000);

  // ===== 1. SIGN UP =====
  console.log("\n--- Sign Up ---");

  await page.goto(`${BASE}/sign-up`);
  await assert("Sign-up page loads", async () => {
    await page.waitForSelector("text=Create an account");
  });

  await assert("Sign-up form has name, email, password fields", async () => {
    await page.locator("#name").waitFor();
    await page.locator("#email").waitFor();
    await page.locator("#password").waitFor();
  });

  await assert("Sign up with valid credentials", async () => {
    await page.fill("#name", TEST_NAME);
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/notes**", { timeout: 10000 });
  });

  // ===== 2. NOTES LIST (EMPTY STATE) =====
  console.log("\n--- Notes List (empty) ---");

  await assert("Empty state shows 'No notes yet'", async () => {
    await page.waitForSelector("text=No notes yet");
  });

  await assert("Sidebar visible with All Notes, Favorites, Trash", async () => {
    await page.waitForSelector("text=All Notes");
    await page.waitForSelector("text=Favorites");
    await page.waitForSelector("text=Trash");
  });

  await assert("Search input is visible", async () => {
    await page.waitForSelector('input[aria-label="Search notes"]');
  });

  await assert("Sort dropdown is visible", async () => {
    await page.waitForSelector("text=Modified");
  });

  // ===== 3. CREATE A NOTE =====
  console.log("\n--- Create Note ---");

  await assert("'New Note' button creates a note", async () => {
    await clickNewNote(page);
    await page.waitForSelector('input[aria-label="Note title"]');
  });

  // ===== 4. NOTE EDITOR =====
  console.log("\n--- Note Editor ---");

  await assert("Editor has title input", async () => {
    await page.waitForSelector('input[aria-label="Note title"]');
  });

  await assert("Editor has body textarea", async () => {
    await page.waitForSelector('textarea[aria-label="Note content"]');
  });

  await assert("Editor has back button", async () => {
    await page.waitForSelector('button[aria-label="Back to notes"]');
  });

  await assert("Editor has pin button", async () => {
    const btn = page.locator('button[aria-label="Pin note"], button[aria-label="Unpin note"]');
    await btn.first().waitFor();
  });

  await assert("Editor has favorite button", async () => {
    const btn = page.locator('button[aria-label="Add to favorites"], button[aria-label="Remove from favorites"]');
    await btn.first().waitFor();
  });

  await assert("Editor has delete button", async () => {
    await page.waitForSelector('button[aria-label="Delete note"]');
  });

  await assert("Editor has preview toggle", async () => {
    await page.waitForSelector("text=Preview");
  });

  await assert("Editor shows save status", async () => {
    await page.waitForSelector("text=Saved");
  });

  await assert("Editor shows word count", async () => {
    await page.waitForSelector("text=0 words");
  });

  // ===== 5. EDIT NOTE CONTENT =====
  console.log("\n--- Edit Note ---");

  await assert("Type a title", async () => {
    await page.fill('input[aria-label="Note title"]', "My First Note");
    await page.waitForTimeout(1500);
    const val = await page.inputValue('input[aria-label="Note title"]');
    if (val !== "My First Note") throw new Error(`Title is '${val}'`);
  });

  await assert("Type markdown body", async () => {
    const body = "# Hello World\n\nThis is a **test** note with some markdown content.";
    await page.fill('textarea[aria-label="Note content"]', body);
    await page.waitForTimeout(1500);
  });

  await assert("Word count updates after typing", async () => {
    await page.waitForFunction(() => {
      const spans = document.querySelectorAll("span");
      for (const s of spans) {
        if (s.textContent && /\d+ words/.test(s.textContent) && !s.textContent.includes("0 words")) {
          return true;
        }
      }
      return false;
    }, { timeout: 5000 });
  });

  await assert("Preview toggle shows rendered markdown", async () => {
    await page.click("text=Preview");
    await page.waitForSelector("h1:has-text('Hello World')");
  });

  await assert("Toggle preview off", async () => {
    await page.click("text=Preview");
    await page.waitForSelector('textarea[aria-label="Note content"]');
  });

  // ===== 6. PIN & FAVORITE =====
  console.log("\n--- Pin & Favorite ---");

  await assert("Toggle pin on", async () => {
    await page.locator('button[aria-label="Pin note"]').click();
    await page.waitForSelector('button[aria-label="Unpin note"]');
  });

  await assert("Toggle favorite on", async () => {
    await page.locator('button[aria-label="Add to favorites"]').click();
    await page.waitForSelector('button[aria-label="Remove from favorites"]');
  });

  // ===== 7. NAVIGATE BACK & VERIFY LIST =====
  console.log("\n--- Notes List (with note) ---");

  await assert("Navigate back to notes list", async () => {
    await page.click('button[aria-label="Back to notes"]');
    await page.waitForURL("**/notes", { timeout: 10000 });
  });

  await assert("Note appears in list with correct title", async () => {
    await page.waitForSelector("text=My First Note");
  });

  await assert("Note shows pinned indicator", async () => {
    await page.waitForSelector('[aria-label="Pinned"]');
  });

  await assert("Note shows favorited indicator", async () => {
    await page.waitForSelector('[aria-label="Favorited"]');
  });

  // ===== 8. CREATE SECOND NOTE =====
  console.log("\n--- Second Note ---");

  await assert("Create second note", async () => {
    await clickNewNote(page);
    await page.waitForSelector('input[aria-label="Note title"]');
    await page.fill('input[aria-label="Note title"]', "Second Note");
    await page.fill('textarea[aria-label="Note content"]', "Some content for sorting and searching.");
    await page.waitForTimeout(1500); // wait for autosave
  });

  await assert("Navigate back after creating second note", async () => {
    await page.click('button[aria-label="Back to notes"]');
    await page.waitForURL("**/notes", { timeout: 10000 });
  });

  await assert("Both notes appear in list", async () => {
    await page.waitForSelector("text=My First Note");
    await page.waitForSelector("text=Second Note");
  });

  // ===== 9. SEARCH =====
  console.log("\n--- Search ---");

  await assert("Search filters notes", async () => {
    await page.fill('input[aria-label="Search notes"]', "Second");
    await page.waitForTimeout(2000);
    await page.waitForSelector("text=Second Note");
    const firstVisible = await page.locator("text=My First Note").isVisible().catch(() => false);
    if (firstVisible) throw new Error("My First Note should be filtered out");
  });

  await assert("Clear search shows all notes", async () => {
    await page.fill('input[aria-label="Search notes"]', "");
    await page.waitForTimeout(2000);
    await page.waitForSelector("text=My First Note");
    await page.waitForSelector("text=Second Note");
  });

  // ===== 10. SORT =====
  console.log("\n--- Sort ---");

  await assert("Sort dropdown opens and has options", async () => {
    const sortBtn = page.locator("button:has-text('Modified'), button:has-text('Created'), button:has-text('Title')").first();
    await sortBtn.click();
    await page.waitForSelector("text=Date Modified");
    await page.waitForSelector("text=Date Created");
  });

  await assert("Sort by title", async () => {
    await page.locator('[role="menuitem"]:has-text("Title")').click();
    await page.waitForTimeout(1000);
  });

  // ===== 11. FAVORITES FILTER =====
  console.log("\n--- Favorites ---");

  await assert("Navigate to favorites", async () => {
    await page.click("text=Favorites");
    await page.waitForTimeout(1500);
  });

  await assert("Only favorited notes shown in favorites", async () => {
    await page.waitForSelector("text=My First Note");
    const secondVisible = await page.locator("text=Second Note").isVisible().catch(() => false);
    if (secondVisible) throw new Error("Second Note should not appear in favorites");
  });

  // ===== 12. DELETE NOTE (soft delete) =====
  console.log("\n--- Delete Note ---");

  await assert("Navigate to All Notes", async () => {
    await page.click("text=All Notes");
    await page.waitForTimeout(1500);
  });

  await assert("Delete second note via editor", async () => {
    await page.click("text=Second Note");
    await page.waitForURL("**/notes/**");
    await page.waitForSelector('button[aria-label="Delete note"]');
    await page.click('button[aria-label="Delete note"]');
    await page.waitForURL("**/notes", { timeout: 10000 });
  });

  await assert("Deleted note no longer in main list", async () => {
    await page.waitForTimeout(500);
    const visible = await page.locator("text=Second Note").isVisible().catch(() => false);
    if (visible) throw new Error("Second Note should be deleted from list");
  });

  // ===== 13. TRASH =====
  console.log("\n--- Trash ---");

  await assert("Navigate to trash", async () => {
    await page.click("text=Trash");
    await page.waitForTimeout(1500);
  });

  await assert("Deleted note appears in trash", async () => {
    await page.waitForSelector("text=Second Note");
  });

  await assert("Trash has Restore button", async () => {
    const btn = page.locator('button:has-text("Restore")');
    const count = await btn.count();
    if (count === 0) throw new Error("No Restore button found in trash");
  });

  await assert("Trash has Delete trigger for permanent deletion", async () => {
    // The permanent delete trigger is an AlertDialogTrigger with text "Delete" and destructive styling
    const hasDelete = await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="destructive"]');
      for (const el of els) {
        if (el.textContent && el.textContent.trim() === "Delete") return true;
      }
      return false;
    });
    if (!hasDelete) throw new Error("No Delete trigger found in trash");
  });

  await assert("Restore note from trash", async () => {
    await page.locator('button:has-text("Restore")').first().click();
    await page.waitForTimeout(1500);
    const stillVisible = await page.locator("text=Second Note").isVisible().catch(() => false);
    if (stillVisible) throw new Error("Note should be removed from trash after restore");
  });

  await assert("Restored note appears back in All Notes", async () => {
    await page.click("text=All Notes");
    await page.waitForTimeout(1500);
    await page.waitForSelector("text=Second Note");
  });

  // ===== 14. PERMANENT DELETE =====
  console.log("\n--- Permanent Delete ---");

  await assert("Delete second note again for permanent delete test", async () => {
    await page.click("text=Second Note");
    await page.waitForURL("**/notes/**");
    await page.click('button[aria-label="Delete note"]');
    await page.waitForURL("**/notes", { timeout: 10000 });
  });

  await assert("Go to trash and permanently delete", async () => {
    await page.click("text=Trash");
    await page.waitForTimeout(1500);
    await page.waitForSelector("text=Second Note");
    // Click the Delete trigger (AlertDialogTrigger with destructive class)
    await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="destructive"]');
      for (const el of els) {
        if (el.textContent && el.textContent.trim() === "Delete") {
          el.click();
          return;
        }
      }
    });
    await page.waitForSelector("text=Permanently delete note?", { timeout: 5000 });
    await page.locator('button:has-text("Delete permanently")').click();
    await page.waitForTimeout(1500);
  });

  await assert("Permanently deleted note is gone from trash", async () => {
    const visible = await page.locator("text=Second Note").isVisible().catch(() => false);
    if (visible) throw new Error("Note should be permanently gone");
  });

  // ===== 15. THEME TOGGLE =====
  console.log("\n--- Theme Toggle ---");

  await assert("Theme toggle button exists in sidebar", async () => {
    await page.click("text=All Notes");
    await page.waitForTimeout(500);
    const toggle = page.locator('button[aria-label*="heme"], button[aria-label*="mode"], button[aria-label*="dark"], button[aria-label*="light"]');
    const count = await toggle.count();
    if (count === 0) throw new Error("No theme toggle button found");
  });

  // ===== 16. SIGN OUT & SIGN IN =====
  console.log("\n--- Sign Out & Sign In ---");

  await assert("Sign out via sidebar button", async () => {
    await page.locator('button[aria-label="Sign out"]').click();
    await page.waitForURL("**/sign-in**", { timeout: 10000 });
  });

  await assert("Sign-in page loads with welcome message", async () => {
    await page.waitForSelector("text=Welcome back");
  });

  await assert("Sign in with existing credentials", async () => {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/notes**", { timeout: 10000 });
  });

  await assert("Previously created note persists after sign-in", async () => {
    await page.waitForSelector("text=My First Note");
  });

  // ===== 17. VALIDATION =====
  console.log("\n--- Validation ---");

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  page2.setDefaultTimeout(10000);

  await assert("Sign-in with wrong password shows error", async () => {
    await page2.goto(`${BASE}/sign-in`);
    await page2.fill("#email", TEST_EMAIL);
    await page2.fill("#password", "WrongPassword99!");
    await page2.click('button[type="submit"]');
    await page2.waitForSelector('[role="alert"]', { timeout: 5000 });
  });

  await assert("Sign-up with duplicate email shows error", async () => {
    await page2.goto(`${BASE}/sign-up`);
    await page2.fill("#name", "Dup User");
    await page2.fill("#email", TEST_EMAIL);
    await page2.fill("#password", TEST_PASSWORD);
    await page2.click('button[type="submit"]');
    await page2.waitForSelector('[role="alert"]', { timeout: 5000 });
  });

  await page2.close();
  await ctx2.close();

  // ===== 18. AUTH GUARDS =====
  console.log("\n--- Auth Guards ---");

  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  page3.setDefaultTimeout(10000);

  await assert("Unauthenticated /notes redirects to sign-in", async () => {
    await page3.goto(`${BASE}/notes`);
    await page3.waitForURL("**/sign-in**", { timeout: 10000 });
  });

  await page3.close();
  await ctx3.close();

  // ===== SUMMARY =====
  console.log("\n========================================");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================");
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  - ${f.label}: ${f.error}`);
    }
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  browser?.close();
  process.exit(1);
});
