// 为周报原始接龙添加复制入口，保留代码文本；浏览器拒绝时选中原文供手动复制
(function setupRawCopy() {
    document.querySelectorAll('.checkin-raw-details').forEach((wrapper) => {
        const button = wrapper.querySelector('[data-copy-raw]');
        const code = wrapper.querySelector('.checkin-raw code');
        const status = wrapper.querySelector('.raw-copy-status');
        if (!button || !code || !status) return;
        button.hidden = false;

        // 仅在用户点击时访问剪贴板，不裁剪空白，失败后不能误报复制成功
        button.addEventListener('click', async function copyRawText() {
            button.disabled = true;
            status.textContent = '正在复制…';
            try {
                await navigator.clipboard.writeText(code.textContent);
                status.textContent = '已复制原文';
            } catch {
                const range = document.createRange();
                range.selectNodeContents(code);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                status.textContent = '无法自动复制，请手动复制已选中的原文';
            } finally {
                button.disabled = false;
            }
        });
    });
})();
