import { test, expect } from '@playwright/test';

test('Track and stats are cleared when waypoints are removed', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/brouter**', async route => {
    requestCount++;
    // Delay the response to simulate slow network and potential race condition
    await new Promise(resolve => setTimeout(resolve, 1000));

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

  // Using port 3000 as per existing verify_ui.spec.js
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Add two points by clicking on the map
  await page.mouse.click(400, 400);
  await page.wait_for_timeout?.(100) || await new Promise(r => setTimeout(r, 100));
  await page.mouse.click(500, 500);

  // Wait for the request to be triggered
  await page.waitForTimeout(500);

  // Clear route while fetch is ongoing
  const clearBtn = page.getByRole('button', { name: 'Route Löschen' });
  page.once('dialog', dialog => dialog.accept());
  await clearBtn.click();

  // Wait for the slow fetch to complete
  await page.waitForTimeout(2000);

  // Check if waypoints are gone
  const waypoints = page.locator('.waypoint-marker');
  await expect(waypoints).toHaveCount(0);

  // Check if route details show the empty state message
  await expect(page.getByText('Erzeuge eine Route, um Distanz- und Höhendetails zu sehen.')).toBeVisible();

  // Verify that route stats (like Distance) did NOT appear
  const distanceStat = page.getByText('Distanz: 1.0 km');
  await expect(distanceStat).not.toBeVisible();
});
