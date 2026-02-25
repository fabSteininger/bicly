const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // 1. Verify Planner by default
  await page.screenshot({ path: 'planner_light.png' });
  console.log('Planner screenshot taken');

  // 2. Go to Settings and switch theme to Dark
  await page.click('button[aria-label="App-Menü"], button[aria-label="App menu"]');
  await page.click('button:has-text("Einstellungen"), button:has-text("Settings")');
  await page.waitForTimeout(1000);

  // Verify 100% width (implicitly by screenshot)
  await page.screenshot({ path: 'settings_light.png' });
  console.log('Settings (light) screenshot taken');

  // Change theme
  const themeSelect = await page.locator('select').nth(1);
  await themeSelect.selectOption('dark');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'settings_dark.png' });
  console.log('Settings (dark) screenshot taken');

  // 3. Verify Planner button in header
  const plannerBtn = page.locator('.topbar-controls button:has-text("Planer"), .topbar-controls button:has-text("Planner")');
  if (await plannerBtn.isVisible()) {
      console.log('Planner button visible in header on Settings page');
      await plannerBtn.click();
  } else {
      console.log('Planner button NOT visible in header on Settings page');
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'planner_dark.png' });
  console.log('Back to Planner (dark) screenshot taken');

  // 4. Verify Library width
  await page.click('button[aria-label="App-Menü"], button[aria-label="App menu"]');
  await page.click('button:has-text("Bibliothek"), button:has-text("Library")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'library_dark.png' });
  console.log('Library (dark) screenshot taken');

  await browser.close();
})();
