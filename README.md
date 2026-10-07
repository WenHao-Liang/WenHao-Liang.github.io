# 博客与群打卡历史

使用 Hugo extended 和 Stack 主题，首页提供两个群的打卡历史与 kernel 链接。

## 内容目录

- [长期主义交流打卡搭子](content/group-1/_index.md)：周报及 2026、2025、2024 年腾讯文档链接
- [杭州-健身-enjoy your life](content/group-2/_index.md)：周报，只统计本周实际打卡成员
- [kernel](content/page/kernel/index.md)：内核官网、源码和文档链接

周报保存在 `content/group-N/年份/YYYYMMDD-YYYYMMDD.md`，每群每周一个文件。年份取周一所在年份，日期来自接龙正文。群入口由模板自动按年份、周次倒序列出，无需手动添加链接。

周报底部提供本群的“上一周／下一周”链接，按已收录周报的日期衔接，支持跨年；最早、最新及只有一个周报时省略不存在的链接，无需生成工具维护。

周报及月年汇总右下角提供“顶部／目录”入口，使用普通页面锚点，禁用 JavaScript 时仍可跳转，手机和深色模式沿用主题样式。

## 生成周报

工具位于相邻仓库的 [Record_study_check-ins](../Talk_is_cheap_Show_me_the_code/language_go/src/Record_study_check-ins/README.md)，默认博客路径为 `/Volumes/forcode/codes/WenHao-Liang.github.io`。

在工具目录运行：

```bash
./publish-checkins-group-1.sh
./publish-checkins-group-2.sh
./publish-checkins-group-2.sh /绝对路径/本周接龙.txt --dry-run
```

先生成和构建验证，再同步本周唯一页面；有待提交改动时询问是否自动 commit，默认 `[y/N]`，本周内容完整时建议输入 `y`。回车或输入 `n` 保留文件但不提交，脚本不会自动推送。群二自动先提取名单再统计。重复输入不产生新文件或新提交；已收录日期减少、目标被手工修改或暂存区非空时停止。周报末尾用 text 代码块保留完整接龙原文，修正数据后应重新生成页面。

## 预览与部署

```bash
hugo server
```

发布脚本结束时会打印下面的手动推送命令，不再提供 `--commit` 或 `--push` 参数。确认改动已提交后执行；未提交的文件不会上传。

```bash
cd /Volumes/forcode/codes/WenHao-Liang.github.io
git push origin master
```

GitHub Actions 构建后发布到 `gh-pages`；仓库 Pages 应使用该分支根目录。

推送成功仍需等待 Actions 部署成功才会更新线上页面。腾讯文档直接在新标签页打开，由腾讯文档处理登录和访问权限。

## 访问统计

使用[不蒜子](https://busuanzi.ibruce.info/)统计访问。全站页脚显示累计访问量和访客数，周报及月年汇总在标题下显示本页阅读量；数字加载失败或尚未返回时隐藏统计区域。

仅生产构建在 `baseurl` 对应的 HTTPS 域名加载统计服务。`hugo server`、开发构建，以及使用本地地址打开的生产文件都不会请求统计服务。需要关闭时，将 [params.toml](config/_default/params.toml) 的 `analytics.busuanzi` 设置为 `false`。

计数保存在外部服务中，不写入 Markdown 或 Git；重新生成同一 URL 的周报无需重置计数。统计从接入后开始，服务按自身口径计算访客数，网络限制或浏览器拦截可能导致漏计。

统计加载脚本的离线测试：

```bash
node --test tests/visit-statistics.test.cjs
```
