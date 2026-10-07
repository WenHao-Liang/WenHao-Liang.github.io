// 验证统计脚本的线上限制、异步显示和失败隐藏；使用 node --test 运行，不访问统计服务
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// boot 提供独立 DOM 样本执行真实脚本，记录第三方脚本加载和统计区域显示状态
function boot(hostname = "wenhao-liang.github.io", protocol = "https:") {
    const file = path.join(__dirname, "../assets/js/visit-statistics.js");
    assert.ok(fs.existsSync(file), "博客应提供统计加载脚本");
    const rows = [2, 1].map((size) => ({
        hidden: true,
        values: Array.from({ length: size }, () => ({ textContent: "" })),
        querySelectorAll() { return this.values; },
    }));
    const scripts = [];
    const observers = [];
    class Observer {
        constructor(callback) { this.callback = callback; observers.push(this); }
        observe() {}
        disconnect() { this.disconnected = true; }
    }
    const document = {
        currentScript: { dataset: { siteUrl: "https://WenHao-Liang.github.io/" } },
        querySelectorAll() { return rows; },
        createElement() { return {}; },
        head: { appendChild(script) { scripts.push(script); } },
    };
    vm.runInNewContext(fs.readFileSync(file, "utf8"), {
        document, location: { hostname, protocol }, URL, MutationObserver: Observer,
    });
    return { rows, scripts, observers };
}

test("本地、预览域名和 HTTP 页面不会请求统计服务", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "preview.example.com"]) {
        assert.equal(boot(host).scripts.length, 0);
    }
    assert.equal(boot("wenhao-liang.github.io", "http:").scripts.length, 0);
});

test("线上异步加载，数字返回后才分别显示站点和文章统计", () => {
    const { rows, scripts, observers } = boot();
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].async, true);
    assert.equal(scripts[0].src, "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js");
    assert.ok(rows.every((row) => row.hidden));
    rows[0].values[0].textContent = "123";
    observers[0].callback();
    assert.ok(rows[0].hidden);
    rows[0].values[1].textContent = "45";
    observers[0].callback();
    assert.equal(rows[0].hidden, false);
    assert.equal(rows[1].hidden, true);
    rows[1].values[0].textContent = "0";
    observers[0].callback();
    assert.equal(rows[1].hidden, false);
    assert.equal(observers[0].disconnected, true);
});

test("非数字和网络失败时保持隐藏", () => {
    const { rows, scripts, observers } = boot();
    rows[0].values.forEach((value) => { value.textContent = "NaN"; });
    observers[0].callback();
    assert.ok(rows.every((row) => row.hidden));
    scripts[0].onerror();
    assert.ok(rows.every((row) => row.hidden));
    assert.equal(observers[0].disconnected, true);
});
