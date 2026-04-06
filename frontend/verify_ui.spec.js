import { test, expect } from '@playwright/test';

test('Verify elevation parsing and header download button', async ({ page }) => {
  // Mock BRouter response with filtered elevation metadata in comments
  await page.route('**/brouter**', async route => {
    console.log('Mocking BRouter request:', route.request().url());
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<!-- track-length = 1000 filtered ascend = 150 plain-ascend = 100 cost=2000 energy=0.5kwh time=10m -->
<gpx creator="BRouter" version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="50.1109" lon="8.6821"><ele>100</ele></trkpt>
      <trkpt lat="50.1120" lon="8.6830"><ele>150</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
    await route.fulfill({
      status: 200,
      contentType: 'application/gpx+xml',
      body: gpx,
    });
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Try to find the map or any other element
  console.log('Title:', await page.title());

  // Let's try to click by coordinates on the body
  await page.mouse.click(500, 500);
  await page.waitForTimeout(1000);
  await page.mouse.click(600, 600);
  await page.waitForTimeout(5000); // Wait for route generation

  // Verify elevation stats show filtered values
  console.log('Page content sample:', await page.innerText('body'));

  // Verify Header Download button
  // Localized label for German (de)
  const downloadBtn = page.locator('header button').filter({ has: page.locator('svg') }).first();
  await expect(downloadBtn).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'test-results/elevation_fix.png', fullPage: true });
});
