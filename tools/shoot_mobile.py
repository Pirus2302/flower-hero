# -*- coding: utf-8 -*-
import asyncio, sys
from playwright.async_api import async_playwright


async def main(slugs):
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        ctx = await browser.new_context(viewport={"width": 390, "height": 844},
                                        device_scale_factor=2, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        for slug in slugs:
            await page.goto(f"http://localhost:3141/{slug}/", wait_until="load")
            await page.wait_for_timeout(8000)
            await page.screenshot(path=f"assets/src/m_{slug}.jpg", type="jpeg", quality=80,
                                  timeout=90000, animations="disabled")
            print("mobile", slug)
        await browser.close()

asyncio.run(main(sys.argv[1:]))
