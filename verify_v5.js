import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  // Check profiles
  const profiles = await page.locator('select').textContent();
  console.log('Available profiles:', profiles);

  // Check button text
  const downloadButton = page.locator('button:has-text("GPX herunterladen")');
  const buttonExists = await downloadButton.isVisible();
  console.log('Download button exists:', buttonExists);

  // Click map and then click marker
  await page.mouse.click(400, 400);
  await page.waitForTimeout(1000);
  const markersBefore = await page.locator('.waypoint-marker').count();
  console.log('Markers before:', markersBefore);

  if (markersBefore > 0) {
    await page.locator('.waypoint-marker').first().click();
    await page.waitForTimeout(500);
    const markersAfter = await page.locator('.waypoint-marker').count();
    console.log('Markers after removal:', markersAfter);
  }

  await browser.close();
})();
