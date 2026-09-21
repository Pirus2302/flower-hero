# -*- coding: utf-8 -*-
"""Variant A renders in software here, so grab the frame through CDP instead of
waiting for Playwright's stability check, which never settles."""
import asyncio, base64, math
from playwright.async_api import async_playwright

FLAGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=FLAGS)
        page = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        await page.goto("http://localhost:3141/a/?flat", wait_until="load")
        await page.wait_for_timeout(9000)
        for i in range(70):
            await page.mouse.move(720 + math.sin(i / 5) * 420, 470 + math.cos(i / 4) * 250)
            await page.wait_for_timeout(60)
        await page.wait_for_timeout(1500)
        cdp = await page.context.new_cdp_session(page)
        shot = await cdp.send("Page.captureScreenshot", {"format": "jpeg", "quality": 82})
        open("assets/previews/a.jpg", "wb").write(base64.b64decode(shot["data"]))
        print("shot a")
        await browser.close()

asyncio.run(main())
