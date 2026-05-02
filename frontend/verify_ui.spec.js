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
  const details = await page.innerText('body');
  expect(details).toContain('Anstieg: 150 m');
  expect(details).toContain('Abstieg: 100 m');

  // Verify Header Download button
  const downloadBtn = page.locator('header button').filter({ has: page.locator('svg') }).first();
  await expect(downloadBtn).toBeVisible();
});

test('Verify privacy and impressum markdown rendering', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Open App Menu
  await page.getByLabel('App-Menü').click();

  // Go to Privacy Policy
  await page.getByRole('button', { name: 'Datenschutz' }).click();

  // Verify privacy content (from public/privacy.md)
  await expect(page.locator('h2').first()).toContainText('Datenschutzerklärung');
  await expect(page.locator('article')).toContainText('We are committed to protecting your privacy');

  // Open App Menu again
  await page.getByLabel('App-Menü').click();

  // Go to Impressum
  await page.getByRole('button', { name: 'Impressum' }).click();

  // Verify impressum content (from public/impressum.md)
  await expect(page.locator('h2').first()).toContainText('Impressum');
  await expect(page.locator('article')).toContainText('Contact');
});
