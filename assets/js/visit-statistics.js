// 在正式 HTTPS 域名异步加载不蒜子；数字返回前及加载失败时隐藏统计，不请求本地预览
// 入口由 footer/custom 模板加载，站点地址来自 Hugo baseurl
(function loadVisitStatistics() {
    const loader = document.currentScript;
    if (!loader || location.protocol !== "https:" ||
        location.hostname !== new URL(loader.dataset.siteUrl).hostname) {
        return;
    }
    const rows = Array.from(document.querySelectorAll("[data-visit-statistics]"));
    if (!rows.length) return;

    // refresh 只在一行所需数字都返回后显示该行，接受服务返回的零计数
    function refresh() {
        for (const row of rows) {
            const values = Array.from(row.querySelectorAll('[id^="busuanzi_value_"]'));
            row.hidden = !values.length || !values.every((value) => /^\d+$/.test(value.textContent.trim()));
        }
        if (rows.every((row) => !row.hidden)) observer.disconnect();
    }
    const observer = new MutationObserver(refresh);
    for (const row of rows) {
        observer.observe(row, { childList: true, subtree: true, characterData: true });
    }
    const script = document.createElement("script");
    script.src = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
    script.async = true;
    // hideFailedCounters 保持网络失败时的页面整洁，不用零替代未知计数
    script.onerror = function hideFailedCounters() {
        observer.disconnect();
        for (const row of rows) row.hidden = true;
    };
    document.head.appendChild(script);
}());
