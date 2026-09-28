# 博客与群打卡历史

使用 Hugo extended 和 Stack 主题，首页提供两个群的打卡历史与 kernel 链接。

## 内容目录

- [长期主义交流打卡搭子](content/group-1/_index.md)：周报及 2026、2025、2024 年腾讯文档链接
- [杭州-健身-enjoy your life](content/group-2/_index.md)：周报，只统计本周实际打卡成员
- [kernel](content/page/kernel/index.md)：内核官网、源码和文档链接

周报保存在 `content/group-N/年份/YYYYMMDD-YYYYMMDD.md`，每群每周一个文件。年份取周一所在年份，日期来自接龙正文。群入口由模板自动按年份、周次倒序列出，无需手动添加链接。

## 生成周报

工具位于相邻仓库的 [Record_study_check-ins](../Talk_is_cheap_Show_me_the_code/language_go/src/Record_study_check-ins/README.md)，默认博客路径为 `/Volumes/forcode/codes/WenHao-Liang.github.io`。

在工具目录运行：

```bash
./publish-checkins.sh group-1
./publish-checkins.sh group-2
./publish-checkins.sh group-2 /绝对路径/本周接龙.txt --dry-run
./publish-checkins.sh group-1 --commit
```

默认先生成和构建验证，再同步本周唯一页面，不提交、不推送。群二自动先提取名单再统计。重复输入不产生新文件或新提交；已收录日期减少、目标被手工修改或暂存区非空时停止。周报末尾用 text 代码块保留完整接龙原文，修正数据后应重新生成页面。

## 预览与部署

```bash
hugo server
```

首次重建和模板修改审阅后，在博客仓库手动推送 `master`。GitHub Actions 构建后发布到 `gh-pages`；仓库 Pages 应使用该分支根目录。后续每周可在工具目录运行 `./publish-checkins.sh group-1 --push` 或 `./publish-checkins.sh group-2 --push`。该选项会提交并推送，若待推送历史含非周报修改则停止。

推送成功仍需等待 Actions 部署成功才会更新线上页面。腾讯文档直接在新标签页打开，由腾讯文档处理登录和访问权限。
