from playwright.sync_api import sync_playwright

errors = []

def main():
    with sync_playwright() as p:
        browser = p.firefox.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()

        # Abort slow external CDN resources; page has CSS fallbacks
        page.route('**/*', lambda route: route.abort('aborted') if route.request.url.startswith(('https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://fonts.')) else route.continue_())

        page.on('console', lambda msg: print(f'[CONSOLE {msg.type}] {msg.text}'))
        page.on('pageerror', lambda err: errors.append(str(err)))

        # Test 1: Main page
        print('Opening main page...')
        page.goto('http://localhost:8080/nebula-chronicle.html', wait_until='domcontentloaded', timeout=60000)
        page.wait_for_timeout(500)

        # Click start button
        start_btn = page.locator('.start-btn')
        if start_btn.is_visible():
            start_btn.click()
            print('Clicked start button')
        page.wait_for_timeout(1500)

        # Click an anime node (index 14: 新世纪福音战士)
        node = page.locator('.anime-node[data-index="14"]')
        if node.is_visible():
            node.click()
            print('Clicked anime node 14')
        page.wait_for_timeout(500)

        # Check detail panel
        detail = page.locator('#detail-panel')
        play_btn = page.locator('#play-btn')
        if detail.is_visible():
            print('Detail panel visible')
        if play_btn.is_visible():
            text = play_btn.inner_text()
            print(f'Play button text: {text}')

        page.screenshot(path='/tmp/nebula-main.png', full_page=True)
        print('Saved screenshot /tmp/nebula-main.png')

        # Test 2: Watch page
        print('\nOpening watch page...')
        page2 = context.new_page()
        page2.on('console', lambda msg: print(f'[WATCH CONSOLE {msg.type}] {msg.text}'))
        page2.on('pageerror', lambda err: errors.append(str(err)))

        page2.goto('http://localhost:8080/watch.html?index=14', wait_until='domcontentloaded', timeout=60000)
        page2.wait_for_timeout(1500)

        title = page2.locator('#watch-title')
        if title.is_visible():
            print(f'Watch title: {title.inner_text()}')

        no_source = page2.locator('#no-source')
        if no_source.is_visible():
            print('No source placeholder visible (expected, no bilibili/videoUrl configured)')

        page2.screenshot(path='/tmp/nebula-watch.png', full_page=True)
        print('Saved screenshot /tmp/nebula-watch.png')

        browser.close()

    if errors:
        print('\n=== ERRORS ===')
        for e in errors:
            print(e)
    else:
        print('\nNo page errors detected.')

if __name__ == '__main__':
    main()
