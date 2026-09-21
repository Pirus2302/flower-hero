# -*- coding: utf-8 -*-
"""Preview shots: each variant, opened by a swept cursor."""
import asyncio, math, sys
from playwright.async_api import async_playwright

BASE = "http://localhost:3141"
FLAGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


async def sweep(page, n=110):
    for i in range(n):
        await page.mouse.move(880 + math.sin(i / 5) * 420, 470 + math.cos(i / 4) * 250)
        await page.wait_for_timeout(14)


async def main(slugs):
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=FLAGS)
        page = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        for slug in slugs:
            await page.goto(f"{BASE}/{slug}/", wait_until="load")
            await page.wait_for_timeout(6500)
            await sweep(page)
            await page.wait_for_timeout(500)
            await page.screenshot(path=f"assets/previews/{slug}.jpg", type="jpeg",
                                  quality=82, timeout=120000, animations="disabled")
            print("shot", slug)
        await browser.close()

asyncio.run(main(sys.argv[1:] or ["a", "b", "c"]))
