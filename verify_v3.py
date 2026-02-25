
import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Assume server is running on 5174 (from previous traces)
        url = 'http://localhost:5174'
        try:
            await page.goto(url)
        except:
            print("Server not found on 5174, trying 5173")
            await page.goto('http://localhost:5173')

        await page.wait_for_timeout(2000)

        # Check App Menu (left)
        await page.click('button[aria-label="App-Menü"]')
        await page.wait_for_timeout(500)
        await page.screenshot(path='v3_desktop_menu.png')

        # Go to Settings
        await page.click('button:has-text("Einstellungen")')
        await page.wait_for_timeout(500)
        await page.screenshot(path='v3_desktop_settings.png')

        # Go back to Planner
        await page.click('button:has-text("Zurück zum Planer")')
        await page.wait_for_timeout(500)

        # Open Planner
        await page.click('button[aria-label="Planer öffnen"]')
        await page.wait_for_timeout(500)
        await page.screenshot(path='v3_desktop_planner.png')

        # Test mobile view
        mobile_context = await browser.new_context(viewport={'width': 375, 'height': 667}, is_mobile=True)
        mobile_page = await mobile_context.new_page()
        await mobile_page.goto(url)
        await mobile_page.wait_for_timeout(2000)
        await mobile_page.screenshot(path='v3_mobile_initial.png')

        # Open Menu on mobile
        await mobile_page.click('button[aria-label="App-Menü"]')
        await mobile_page.wait_for_timeout(500)
        await mobile_page.screenshot(path='v3_mobile_menu.png')

        await browser.close()

if __name__ == "__main__":
    if not os.path.exists('verification'):
        os.makedirs('verification')
    os.chdir('verification')
    asyncio.run(verify())
