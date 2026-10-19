// 验证图表只在浏览器内重排，保持昵称与天数配对、并列名单顺序和原始 Markdown
// 使用 node --test tests/chart-sorting.test.cjs 执行，无需额外依赖
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const root = process.env.CHART_BLOG_ROOT || path.resolve(__dirname, '..');

// loadSorter 从真实模板加载排序函数，空图表页面不启动浏览器渲染器
async function loadSorter() {
  const template = fs.readFileSync(path.join(root, 'layouts/partials/weekly-mermaid.html'), 'utf8');
  const script = template.split('<script type="module">')[1].split('</script>')[0];
  const sorter = await vm.runInNewContext(`(async () => {${script}\nreturn typeof sortChartSource === 'function' ? sortChartSource : undefined;})()`, {
    document: {querySelectorAll: () => []}, console
  });
  assert.equal(typeof sorter, 'function', '缺少浏览器图表排序函数');
  return sorter;
}

// chartSource 构造与 Go 输出一致的图表，保留配置和其他坐标轴设置
function chartSource(names, days) {
  return '---\nconfig:\n  xyChart:\n    width: 900\n---\nxychart-beta\n'
    + `    x-axis ${JSON.stringify(names)}\n    y-axis "打卡天数" 0 --> 7\n    bar ${JSON.stringify(days)}\n`;
}

// readPairs 读取图表的昵称和天数，用于核验排序结果与原始名单的配对
function readPairs(source) {
  const names = JSON.parse(source.match(/^\s*x-axis (\[[^\r\n]*\])/m)[1]);
  const days = JSON.parse(source.match(/^\s*bar (\[[^\r\n]*\])/m)[1]);
  return names.map((name, i) => [name, days[i]]);
}

test('默认名单源码不变，天数降序时并列成员保持名单顺序，零天成员保留', async () => {
  const sort = await loadSorter();
  const source = chartSource(['甲', '乙', '丙', '丁', '戊'], [2, 7, 2, 0, 7]);
  assert.equal(sort(source, 'name'), source);
  assert.deepEqual(readPairs(sort(source, 'days')), [['乙', 7], ['戊', 7], ['甲', 2], ['丙', 2], ['丁', 0]]);
  assert.equal(sort(source, 'name'), source);
  assert.equal(sort(source, 'days'), sort(source, 'days'));
});

test('特殊昵称、单人和全零数据不会丢失或串位', async () => {
  const sort = await loadSorter();
  const names = ['甲], bar [#34;#92;#60;#38;', '乙, [甲]', '丙$&'];
  assert.deepEqual(readPairs(sort(chartSource(names, [1, 3, 1]), 'days')), [[names[1], 3], [names[0], 1], [names[2], 1]]);
  for (const [labels, days] of [[['甲'], [0]], [names, [0, 0, 0]], [[], []]]) {
    const source = chartSource(labels, days);
    assert.deepEqual(readPairs(sort(source, 'days')), readPairs(source));
  }
});

test('不匹配的成员数和非法天数停止排序，不猜测或丢弃数据', async () => {
  const sort = await loadSorter();
  for (const source of [chartSource(['甲'], []), chartSource(['甲'], [1.5]), chartSource(['甲'], [-1]), 'xychart-beta']) {
    assert.throws(() => sort(source, 'days'), /图表/);
  }
});

// markdownFiles 递归读取两个群的已发布文档，不依赖当前名单重新计算统计
function markdownFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? markdownFiles(file) : file.endsWith('.md') ? [file] : [];
  });
}

test('全部历史周月年图表排序后昵称天数配对不变，非数据行保持原样', async () => {
  const sort = await loadSorter();
  let count = 0;
  for (const group of ['group-1', 'group-2']) {
    for (const file of markdownFiles(path.join(root, 'content', group))) {
      const markdown = fs.readFileSync(file, 'utf8');
      for (const match of markdown.matchAll(/```mermaid\r?\n([\s\S]*?)\r?\n```/g)) {
        const source = match[1];
        const original = readPairs(source);
        const expected = original.map((pair, index) => ({pair, index})).sort((a, b) => b.pair[1] - a.pair[1] || a.index - b.index).map(item => item.pair);
        const sorted = sort(source, 'days');
        assert.deepEqual(readPairs(sorted), expected, file);
        const withoutData = text => text.replace(/^[ \t]*(?:x-axis|bar)[ \t]+\[[^\r\n]*\][ \t]*$/gm, '');
        assert.equal(withoutData(sorted), withoutData(source), file);
        assert.equal(sort(source, 'name'), source, file);
        count++;
      }
      assert.equal(fs.readFileSync(file, 'utf8'), markdown, file);
    }
  }
  assert.ok(count > 0, '应覆盖已有图表');
  console.log(`已核验 ${count} 张真实图表`);
});
