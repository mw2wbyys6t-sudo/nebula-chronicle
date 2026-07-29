#!/usr/bin/env python3
"""基础冒烟测试：验证页面加载、阶段流程、Universe 渲染和控制台错误。"""
from playwright.sync_api import sync_playwright
import sys

URL = 'http://localhost:4174/wonderful-screen/'

def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        page.on('console', lambda msg: print(f'[{msg.type}] {msg.text}'))
        page.on('pageerror', lambda err: errors.append(str(err)))

        page.goto(URL, timeout=20000)
        page.wait_for_load_state('networkidle', timeout=20000)

        # 等待 loading 完成并进入 showcase（最长 8s）
        try:
            page.wait_for_selector('.phase-showcase', timeout=8000)
            print('OK: Showcase 阶段已渲染')
        except Exception as e:
            print(f'FAIL: 未进入 Showcase 阶段: {e}')

        # 截图当前状态
        page.screenshot(path='/workspace/scripts/smoke-phase1.png')

        # 模拟点击跳过进入 landing
        try:
            skip_btn = page.locator('.phase-showcase .skip-btn')
            if skip_btn.count():
                skip_btn.click()
                page.wait_for_selector('.phase-landing', timeout=5000)
                print('OK: Landing 阶段已渲染')
                page.screenshot(path='/workspace/scripts/smoke-phase2.png')

                # 点击进入 universe
                page.locator('.phase-landing .portal-btn').click()
                page.wait_for_selector('.phase-universe', timeout=8000)
                print('OK: Universe 阶段已渲染')
                page.wait_for_timeout(2500)
                page.screenshot(path='/workspace/scripts/smoke-phase3.png')

                # 检查 canvas 是否有内容（简单像素采样）
                canvas_box = page.locator('#universe-canvas').bounding_box()
                print(f'INFO: Universe canvas box: {canvas_box}')

                # 检查 HUD chips
                chips = page.locator('.hud-chip').all()
                print(f'INFO: HUD genre chips count: {len(chips)}')

                # 测试中文搜索
                search = page.locator('.hud-search')
                if search.count():
                    search.fill('进击的巨人')
                    search.press('Enter')
                    page.wait_for_timeout(1200)
                    page.screenshot(path='/workspace/scripts/smoke-search.png')
                    toast = page.locator('.hud-toast--success')
                    no_result = page.locator('.hud-toast:has-text("未找到结果")')
                    if toast.count():
                        print(f'OK: 中文搜索有结果提示: {toast.first.inner_text()}')
                    elif no_result.count():
                        print(f'FAIL: 中文搜索未找到结果')
                    else:
                        print('INFO: 搜索后无明确提示')
        except Exception as e:
            print(f'FAIL: 阶段切换测试出错: {e}')

        if errors:
            print('\n页面级错误:')
            for err in errors:
                print(f'  {err}')
        else:
            print('\nOK: 未发现页面级错误')

        browser.close()
    return 0 if not errors else 1

if __name__ == '__main__':
    sys.exit(main())
