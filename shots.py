# -*- coding: utf-8 -*-
"""Preview shots for the switcher page: each variant, opened by a swept cursor."""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = "http://localhost:3141"
SHOTS = [
    ("a", "assets/previews/a.jpg"),
    ("b", "assets/previews/b.jpg"),
    ("c", "assets/previews/c.jpg"),
]
FLAGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


async def sweep(page, cx, cy, rx, ry, n=70, step=0.02):
    import math
    for i in range(n):
        await page.mouse.move(cx + math.sin(i / 6) * rx, cy + math.cos(i / 5) * ry)
        await page.wait_for_timeout(int(step * 1000))


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=FLAGS)
        page = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        for slug, out in SHOTS:
            await page.goto(f"{BASE}/{slug}/", wait_until="load")
            await page.wait_for_timeout(6000)          # let the curtain finish
            await sweep(page, 720, 470, 320, 200)
            await page.wait_for_timeout(700)
            await page.screenshot(path=out, type="jpeg", quality=82)
            print("shot", out)
        await browser.close()

asyncio.run(main())
