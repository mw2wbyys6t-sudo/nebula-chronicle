from playwright.sync_api import sync_playwright
import json
import sys

errors = []
warnings = []

def handle_console(msg):
    text = msg.text
    if msg.type == 'error':
        errors.append(text)
    elif msg.type == 'warning':
        warnings.append(text)
    # 也收集 WebGL/THREE 相关日志
    if 'WebGL' in text or 'THREE' in text or 'ERR_ABORTED' in text:
        if text not in errors and text not in warnings:
            errors.append(text)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    page.on('console', handle_console)
    page.on('pageerror', lambda err: errors.append(f'pageerror: {err}'))

    try:
        page.goto('http://localhost:5173/', wait_until='networkidle', timeout=30000)
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e), 'errors': errors, 'warnings': warnings}, ensure_ascii=False))
        browser.close()
        sys.exit(1)

    # 等待 Loading / Entrance 阶段，让 GalaxyPhase 有机会初始化
    page.wait_for_timeout(12000)

    screenshot_path = '/workspace/scripts/galaxy-smoke-screenshot.png'
    page.screenshot(path=screenshot_path, full_page=False)

    result = {
        'ok': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'screenshot': screenshot_path
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    browser.close()
