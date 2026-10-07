// 用 node --test 验证接龙复制成功、拒绝与不支持时的行为，原始空格和换行必须保持不变
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// 提供最小 DOM 与可控剪贴板，在真实脚本中检查文本和失败后的选择行为
function boot(clipboard) {
    const file = path.join(__dirname, '../assets/js/copy-checkin-raw.js');
    assert.ok(fs.existsSync(file), '应提供原始接龙复制脚本');
    const code = { textContent: '2026-10-04\n1. 阿豪  学习 <Go> & C++\n\n2. 昵称🙂  运动\n' };
    const status = { textContent: '' };
    const button = { hidden: true, disabled: false, addEventListener(type, callback) { this.click = callback; } };
    const selection = { removeAllRanges() {}, addRange(range) { this.selected = range.selected; } };
    const selectors = { '[data-copy-raw]': button, '.checkin-raw code': code, '.raw-copy-status': status };
    const document = {
        querySelectorAll() { return [{ querySelector(selector) { return selectors[selector]; } }]; },
        createRange() { return { selectNodeContents(node) { this.selected = node; } }; },
    };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
        document, navigator: { clipboard }, window: { getSelection() { return selection; } },
    });
    return { code, status, button, selection };
}

test('复制原文保留中文、特殊字符、空行和末尾换行', async () => {
    let copied;
    const state = boot({ async writeText(text) { copied = text; } });
    assert.equal(state.button.hidden, false);
    const pending = state.button.click();
    assert.equal(state.button.disabled, true);
    await pending;
    assert.equal(copied, state.code.textContent);
    assert.equal(state.status.textContent, '已复制原文');
    assert.equal(state.button.disabled, false);
    assert.equal(state.selection.selected, undefined);
});

test('剪贴板拒绝时选中原文并提示手动复制，不显示成功', async () => {
    const state = boot({ async writeText() { throw new Error('denied'); } });
    await state.button.click();
    assert.equal(state.selection.selected, state.code);
    assert.match(state.status.textContent, /手动复制/);
    assert.equal(state.button.disabled, false);
});

test('浏览器不提供剪贴板接口时仍可选中原文手动复制', async () => {
    const state = boot(undefined);
    await state.button.click();
    assert.equal(state.selection.selected, state.code);
    assert.match(state.status.textContent, /手动复制/);
    assert.equal(state.button.disabled, false);
});
