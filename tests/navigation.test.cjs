// 用真实 Hugo 渲染验证文集导航和按发布日期归档，不调用 Git 或修改正式内容
// 入口为 node --test tests/navigation.test.cjs，需要 Hugo extended 和已缓存的 Stack 模块
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

// 写入隔离内容树，日期故意跨年并与更新时间不同，避免只能验证现有同日页面
function writePage(content, relative, text) {
    const filename = path.join(content, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, text);
}

// 从最终 HTML 中读取锚点目标，测试公开链接而不是模板源码
function links(html) {
    return Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/g), (match) => match[1]);
}

// 真实构建同时检查侧边、主页和归档，所有临时文件集中于仓库 tmp-for-codex
test('文集自动收录，归档按发布日期排序且每群只出现一次', () => {
    const temporaryRoot = path.join(root, 'tmp-for-codex');
    fs.mkdirSync(temporaryRoot, { recursive: true });
    const temporary = fs.mkdtempSync(path.join(temporaryRoot, 'navigation-test-'));
    const content = path.join(temporary, 'content');
    try {
        for (const relative of ['_index.md', 'group-1/_index.md', 'group-2/_index.md',
            'page/kernel/index.md', 'page/archives/index.md']) {
            writePage(content, relative, fs.readFileSync(path.join(root, 'content', relative), 'utf8'));
        }
        writePage(content, 'post/new.md', '---\ntitle: 新文章\nslug: new\ndate: 2027-01-05\n---\n正文\n');
        writePage(content, 'post/old.md', '---\ntitle: 旧文章\nslug: old\ndate: 2025-02-01\nlastmod: 2028-01-01\n---\n正文\n');
        writePage(content, 'post/hidden.md', '---\ntitle: 隐藏文章\ndate: 2026-09-30\nhidden: true\n---\n');
        writePage(content, 'post/excluded.md', '---\ntitle: 不归档文章\ndate: 2026-09-29\narchive: false\n---\n');
        writePage(content, 'new-collection/_index.md', '---\ntitle: 新增文集\ncollection: true\nweight: 40\n---\n');
        writePage(content, 'group-1/2026/20260921-20260927.md',
            '---\ntitle: 测试周打卡\ndate: 2026-09-21\nlayout: weekly\ngroup_id: group-1\narchive: true\n---\n');
        writePage(content, 'group-2/summary/2026.md',
            '---\ntitle: 测试月度汇总\ndate: 2026-10-01\nlayout: history-summary\ngroup_id: group-2\narchive: true\n---\n');
        const build = spawnSync('hugo', ['--source', root, '--buildFuture', '--contentDir', content,
            '--destination', path.join(temporary, 'site'), '--cacheDir',
            process.env.HUGO_TEST_CACHE || path.join(root, 'tmp-for-codex/checkins-publish/cache')],
        { encoding: 'utf8', env: { ...process.env, GOPROXY: 'off' } });
        assert.equal(build.status, 0, build.stdout + build.stderr);
        const home = fs.readFileSync(path.join(temporary, 'site/index.html'), 'utf8');
        const archive = fs.readFileSync(path.join(temporary, 'site/archives/index.html'), 'utf8');
        const menu = home.match(/<ol class="menu" id="main-menu">([\s\S]*?)<li class="menu-bottom-section">/)[1];
        assert.deepEqual(links(menu), ['/', '/archives/']);
        assert.match(menu, /文集分类/);
        assert.match(menu, /时间归档/);
        assert.match(home, /<h1[^>]*>文集分类<\/h1>/);
        const homeMain = home.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
        assert.deepEqual(links(homeMain).filter((url) => url.startsWith('/') && url !== '/'),
            ['/group-1/', '/group-2/', '/kernel/', '/new-collection/']);
        const archiveMain = archive.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
        const archiveLinks = links(archiveMain).filter((url) => url.startsWith('/') && url !== '/' && !url.includes('#'));
        assert.equal(archiveLinks.length, 5, archiveLinks.join(', ') + build.stdout + build.stderr);
        assert.equal(archiveLinks.filter((url) => url === '/group-1/').length, 1);
        assert.equal(archiveLinks.filter((url) => url === '/group-2/').length, 1);
        assert.ok(!archiveLinks.some((url) => /20260921|summary|hidden/.test(url)));
        assert.ok(archiveLinks.indexOf('/p/new/') < archiveLinks.indexOf('/group-1/'));
        assert.ok(archiveLinks.indexOf('/group-1/') < archiveLinks.indexOf('/p/old/'));
        assert.match(archiveMain, /2026-09-28/);
        assert.match(archiveMain, /2025-02-01/);
        assert.doesNotMatch(archiveMain, /2028/);
        for (const group of ['group-1', 'group-2']) {
            const html = fs.readFileSync(path.join(temporary, `site/${group}/index.html`), 'utf8');
            assert.match(html, /返回文集分类/);
        }
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
});
