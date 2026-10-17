from html.parser import HTMLParser
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text(encoding='utf-8')
        cls.page = Page(cls.html)
        cls.ids = [a['id'] for _, a in cls.page.tags if 'id' in a]

    def assert_local_file(self, url):
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc or not parsed.path:
            return
        relative = unquote(parsed.path).lstrip('/')
        candidate = ROOT / relative
        self.assertTrue(candidate.is_file(), f'Missing local asset or download: {url}')
        self.assertGreater(candidate.stat().st_size, 0, url)
        # Check exact casing even on Windows, so Linux deployments stay valid.
        folder = ROOT
        for part in Path(relative).parts:
            self.assertIn(part, [p.name for p in folder.iterdir()], f'Wrong path case: {url}')
            folder = folder / part

    def test_local_media_styles_scripts_and_downloads_exist(self):
        checked = 0
        for _, attrs in self.page.tags:
            for name in ['src', 'href', 'poster', 'data-src', 'data-video', 'data-poster']:
                if attrs.get(name):
                    self.assert_local_file(attrs[name])
                    checked += 1
        self.assertGreater(checked, 20)

    def test_css_assets_exist(self):
        css = (ROOT / 'style.css').read_text(encoding='utf-8')
        for match in re.finditer(r'url\(\s*[\"\']?([^\)\"\']+)[\"\']?\s*\)', css):
            self.assert_local_file(match.group(1).strip())

    def test_section_links_and_ids_are_valid(self):
        self.assertEqual(len(self.ids), len(set(self.ids)), 'Duplicate HTML ids')
        for _, attrs in self.page.tags:
            href = attrs.get('href', '')
            if href.startswith('#') and len(href) > 1:
                self.assertIn(unquote(href[1:]), self.ids, f'Broken section link: {href}')

    def test_javascript_hooks_and_media_controls_are_present(self):
        js = (ROOT / 'app.js').read_text(encoding='utf-8')
        hooks = re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js)
        self.assertGreater(len(hooks), 10)
        for hook in hooks:
            self.assertIn(hook, self.ids, f'Missing JavaScript element: {hook}')
        self.assertTrue(any(t == 'dialog' and a.get('id') == 'viewer' for t, a in self.page.tags))
        self.assertTrue(any(t == 'dialog' and a.get('id') == 'film-viewer' for t, a in self.page.tags))
        self.assertTrue(any(t == 'script' and a.get('src') == 'app.js' for t, a in self.page.tags))
        self.assertIn('prefers-reduced-motion', js)

if __name__ == '__main__':
    unittest.main()
