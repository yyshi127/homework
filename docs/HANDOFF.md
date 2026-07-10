# 暑假作业打卡系统交接文档

本文用于新会话或新开发者无缝接手当前项目。当前项目是一个 React + Vite 前端、Node/Express + SQLite 后端的暑假作业打卡系统，已部署到云服务器并推送到 GitHub。

## 1. 基本信息

- 本地项目路径：`C:\Users\Administrator\Desktop\暑假作业`
- GitHub 仓库：`git@github.com:yyshi127/homework.git`
- 当前主分支：`main`
- 服务器 IP：`43.165.169.90`
- SSH 用户：`ubuntu`
- SSH 私钥路径：`E:\YYSHI\Learning\openclaw\东京3-afterclass\afterclassserver`
- 线上访问地址：`http://43.165.169.90:8088/`
- 前端部署目录：`/home/ubuntu/project/homework/dist`
- 服务端项目目录：`/home/ubuntu/project/homework`
- SQLite 数据库：`/home/ubuntu/project/homework-data/homework.sqlite`
- API 服务：`homework-api.service`
- 健康检查：`http://43.165.169.90:8088/api/health`
- Nginx 配置：`/etc/nginx/sites-available/homework`

## 2. 连接服务器

在 PowerShell 中连接：

```powershell
ssh -i "E:\YYSHI\Learning\openclaw\东京3-afterclass\afterclassserver" -o StrictHostKeyChecking=no ubuntu@43.165.169.90
```

常用服务器检查命令：

```bash
systemctl status homework-api.service
journalctl -u homework-api.service -n 100 --no-pager
curl -s http://127.0.0.1:8088/api/health
ls -lah /home/ubuntu/project/homework
ls -lah /home/ubuntu/project/homework-data
```

线上 API 健康检查正常时会返回类似：

```json
{"ok":true,"dbPath":"/home/ubuntu/project/homework-data/homework.sqlite"}
```

## 3. 本地开发

安装依赖：

```powershell
npm.cmd install
```

启动前端开发服务：

```powershell
npm.cmd run dev
```

启动后端 API：

```powershell
npm.cmd run server
```

构建前端：

```powershell
npm.cmd run build
```

本项目脚本见 `package.json`：

- `npm.cmd run dev`：启动 Vite 本地前端
- `npm.cmd run build`：生成 `dist/`
- `npm.cmd run preview`：本地预览构建产物
- `npm.cmd run server`：启动 Node API，默认监听 `127.0.0.1:8090`

## 4. 代码结构

- `src/App.jsx`：主要业务逻辑和页面渲染，大多数功能都在这里。
- `src/styles.css`：全局样式和响应式样式。
- `src/assets/`：前端图片资源。
- `src/assets/growth-tree/`：成长树 6 阶段透明 PNG。
- `server/index.js`：Express API、SQLite 读写、AI 批改接口。
- `dist/`：构建产物，不提交 Git。
- `data/`、`data-test*`：本地数据库数据，不提交 Git。
- `archives/`：历史备份目录，不提交 Git。

注意：`.gitignore` 会忽略根目录的 `*.md`，所以项目交接文档放在 `docs/` 下。`.gitignore` 也会忽略图片文件，`src/assets/growth-tree/*.png` 这类嵌套图片如果新增，需要用 `git add -f` 强制加入，或先调整 `.gitignore`。

## 5. 当前已实现的主要功能

### 今日打卡

- 今日打卡和本月打卡两个视图。
- 支持查看和切换不同日期的今日打卡页。
- 今日打卡按分类折叠：语文、数学、英语、阅读、好习惯等。
- 每类任务内部区分每日任务、阶段任务、临时任务。
- 每日任务、阶段任务的颜色继承所属分类色系。
- 阶段任务默认折叠，可展开操作。
- 今日概览显示：今日积分、今日任务、已打卡、未打卡。
- 未打卡统计会突出必打卡数量，并可跳转到第一个未打卡必打卡任务。
- 今日备注在移动端默认折叠。
- 今日页支持添加临时任务：
  - 保存后初始状态为未打卡。
  - 标题显示任务内容。
  - 备注只保存备注内容。
  - 临时任务只能在今日页打卡。
  - 月表只读同步临时任务状态和备注。
  - 今日页可删除临时任务，并同步清除月表对应单元格。

### 本月打卡表

- 原“全月表”已改名为“本月打卡”。
- 月表支持分类行、任务行、日期列。
- 周六、周日表头用橙色区分。
- 阶段任务在阶段范围内可打卡。
- 阶段任务在月表中使用更深一点的同色系背景。
- 类型标签“每日”“阶段”“临时”使用不同深浅的类型色。
- 月表补录逻辑：
  - 今日页自动保存。
  - 本月打卡页不自动保存。
  - 必须点击“补录”并二次确认后，才能修改过去日期。
  - 保存后退出补录状态。
- 月表角标备注使用自定义漂亮 tooltip，避免原生 title 样式。

### 积分规则

当前默认积分：

- 优秀：`2` 分
- 非常优秀：`5` 分
- 好习惯默认：`5` 分
- 读完一本书默认：`20` 分

说明：

- 普通“完成”默认 `0` 分。
- 好习惯如果单项手动设置了积分，以单项积分为准，不用默认值。
- 阅读书籍的积分口径已同步到新的默认值。
- 本月积分含已兑换阅读奖励。
- 累计积分按历史实际累计计算，不是永远等于本月积分。

### 奖励模块

- 顶部包含积分配置、新增奖励、已兑换奖励统计。
- 奖励分类已规划并内置：
  - 文具用品、图书阅读、玩具礼物、美食零食、娱乐时间、户外活动、亲子陪伴、家庭特权、学习成长、运动健康、创意手工、旅行出游、惊喜盲盒、现金储蓄、荣誉成就、自定义。
- 每个分类有 lucide 图标。
- 奖励列表支持按类型筛选，并显示分类数量。
- 奖励卡显示图标、类型、名称、积分、说明、兑换按钮。
- 奖励可编辑、删除，按钮默认隐藏，鼠标悬停出现。
- “已兑奖 X 次”提示现在放在兑换按钮正上方。
- 积分配置弹窗用于修改基础积分默认值。
- 奖励所需积分已按“10 分约等于 1 元”的原则重估。

### 阅读书单

- 移动端底部菜单：今日、阅读、工具、奖励、设置。
- 书单即“阅读”模块。
- 阅读模块有“本月书单”和“我的图书馆”逻辑。
- 我的图书馆：
  - 显示所有书单、书籍种类、已读书单、未读书单。
  - 色块统计，移动端 2 列。
  - 分类栏支持内置分类和维护分类。
  - 支持卡片/列表显示。
  - 卡片包含类别、名称、页数、积分、阅读历史、编辑和删除。
  - 刷新后应停留在图书馆页。
- 本月书单：
  - 支持月份切换。
  - 只有安排了对应阅读任务的书才出现在对应月份。
  - 阅读计划默认折叠，可展开编辑。
  - 计划列表按第 1 天、第 2 天展示。
  - 阅读范围未设置时可快速设置，并同步到今日打卡对应阅读任务备注。
  - 已读、未开始、计划异常有状态提示。
  - 读完后可兑换阅读积分。

### 学习工具与 AI 批改

- 学习工具包含 AI 作业批改和错题集。
- AI 配置支持：
  - 阿里：`qwen3-vl-plus`
  - 百度：智能作业批改
- 当前服务端配置接口：
  - `GET /api/ai-config`
  - `PUT /api/ai-config`
- 批改接口：
  - `POST /api/grade-homework`
- 目前 AI 批改逻辑在 `server/index.js`：
  - activeProvider 为 `baidu` 时调用百度智能作业批改。
  - activeProvider 为 `aliyun` 时调用阿里百炼 qwen3-vl-plus。
  - 若阿里启用且百度 key 也存在，会尝试用百度补几何坐标，再和阿里结果合并。
  - 若没有配置 key，会返回 demo 批改结果。
- 前端上传图片后会缓存当前图片引用，避免不同试卷串图的问题已有修复。
- 错题集目标是只收录错题，不收录正确题。

AI 批改仍是后续重点：用户对批改图片坐标、准确率、稳定性要求很高。当前实现可用，但不应承诺达到专业批改 App 的准确度。

### 顶部与侧边栏

- 顶部头像可点击打开小朋友信息设置：
  - 头像、姓名、性别、生日、学校、年级。
  - 保存最近 3 个头像。
  - 鼠标移动头像右下角出现编辑图标。
- 浏览器标题：`小小成长星球`。
- 左侧菜单：
  - 今日打卡、积分奖励、阅读书单、学习工具、设置中心。
  - 设置中心移动到最下边。
  - 当前激活菜单是正方形色块。
- 左侧上方有成长树：
  - 使用 `src/assets/growth-tree/` 的 6 阶段透明图。
  - 按今日完成率显示树的阶段。
  - “已浇水 X 天”按本月累计打卡天数计算：某一天只要有 1 次或以上打卡，就算浇水 1 天。
- 移动端今日页也有成长树卡片，当前用户认为移动端效果可以，不要随便改。

## 6. 数据存储和 API

服务端使用 SQLite，默认表：

- `app_state`：保存整个前端应用状态，key 为 `main`。
- `ai_config`：保存 AI 配置，key 为 `main`。

主要 API：

- `GET /api/health`：健康检查。
- `GET /api/state`：读取应用状态。
- `PUT /api/state`：保存应用状态。
- `GET /api/ai-config`：读取 AI 配置，敏感 key 不明文返回，只返回 configured。
- `PUT /api/ai-config`：保存 AI 配置。
- `POST /api/grade-homework`：AI 作业批改。

本地默认数据库：

```text
data/homework.sqlite
```

服务器数据库：

```text
/home/ubuntu/project/homework-data/homework.sqlite
```

## 7. 备份

发布前建议备份服务器代码和数据库，尤其涉及数据结构、保存逻辑、积分口径时。

服务器上备份：

```bash
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p /home/ubuntu/project/backups/$ts
cp -a /home/ubuntu/project/homework /home/ubuntu/project/backups/$ts/homework
cp -a /home/ubuntu/project/homework-data /home/ubuntu/project/backups/$ts/homework-data
```

从本地拉取数据库备份：

```powershell
scp -i "E:\YYSHI\Learning\openclaw\东京3-afterclass\afterclassserver" ubuntu@43.165.169.90:/home/ubuntu/project/homework-data/homework.sqlite ".\homework.sqlite.backup"
```

注意：当前系统不再每次保存都生成恢复点，因为用户明确说历史恢复记录已不再需要。

## 8. 发布流程

本地先构建：

```powershell
npm.cmd run build
```

推荐发布命令：

```powershell
$archive='dist-release.tgz'
if (Test-Path $archive) { Remove-Item $archive -Force }
tar -czf $archive -C dist .
scp -i "E:\YYSHI\Learning\openclaw\东京3-afterclass\afterclassserver" -o ConnectTimeout=60 -o StrictHostKeyChecking=no $archive ubuntu@43.165.169.90:/tmp/homework-dist.tgz
ssh -i "E:\YYSHI\Learning\openclaw\东京3-afterclass\afterclassserver" -o ConnectTimeout=60 -o StrictHostKeyChecking=no ubuntu@43.165.169.90 "rm -rf /tmp/homework-dist && mkdir -p /tmp/homework-dist && tar -xzf /tmp/homework-dist.tgz -C /tmp/homework-dist && sudo rsync -a --delete /tmp/homework-dist/ /home/ubuntu/project/homework/dist/ && curl -s http://127.0.0.1:8088/ | grep -oE 'index-[A-Za-z0-9_-]+\.(js|css)' && curl -s http://127.0.0.1:8088/api/health"
```

发布成功应看到新的 `index-*.js` / `index-*.css` hash 和健康检查 JSON。

如果只改前端，通常只需要覆盖 `/home/ubuntu/project/homework/dist/`。

如果改了 `server/index.js` 或依赖：

```powershell
scp -i "E:\YYSHI\Learning\openclaw\东京3-afterclass\afterclassserver" server/index.js ubuntu@43.165.169.90:/home/ubuntu/project/homework/server/index.js
ssh -i "E:\YYSHI\Learning\openclaw\东京3-afterclass\afterclassserver" ubuntu@43.165.169.90 "cd /home/ubuntu/project/homework && npm install --omit=dev && sudo systemctl restart homework-api.service && systemctl status homework-api.service --no-pager"
```

## 9. GitHub 提交流程

查看状态：

```powershell
git status --short
```

提交普通代码：

```powershell
git add src/App.jsx src/styles.css server/index.js docs/HANDOFF.md
git commit -m "你的提交说明"
```

如果新增嵌套图片资源，例如 `src/assets/growth-tree/*.png`，因为 `.gitignore` 会忽略图片，使用：

```powershell
git add -f src/assets/growth-tree/*.png
```

推送 GitHub。当前环境用 GitHub SSH 443 端口更稳定：

```powershell
git -c core.sshCommand="ssh -p 443 -o HostName=ssh.github.com -o StrictHostKeyChecking=no" push origin main
```

## 10. 修改建议和注意事项

- 前端大部分逻辑集中在 `src/App.jsx`，文件较大，修改前先用 `rg` 精确定位。
- 样式集中在 `src/styles.css`，有多处响应式覆盖。改桌面样式时要检查后面的 `@media` 是否覆盖。
- 用户对移动端体验很敏感，若用户说“移动端不要动”，只改桌面选择器或桌面断点。
- 用户对 UI 美观要求高，避免粗糙 demo 感：
  - 控件要和现有圆角、阴影、绿色主按钮风格一致。
  - 不要用浏览器原生 `confirm/alert`，应使用系统内自定义确认弹窗。
  - 不要随意增加解释性文案。
- 修改月表逻辑要特别小心：
  - 今日页自动保存。
  - 本月打卡页补录才允许改过去日期。
  - 临时任务在月表只读。
- 修改阅读逻辑要注意：
  - 计划页数未打卡完成前，不应计入阅读进度。
  - 阅读计划可设置范围，并同步今日阅读任务备注。
- 修改积分逻辑要同步：
  - 今日积分、本月积分、累计积分。
  - 阅读兑换积分。
  - 奖励可用积分。
  - 说明文案和积分配置弹窗。
- 修改 AI 批改要注意：
  - 上传图片不能复用旧图。
  - 只收录错题。
  - 输出要结构化。
  - 学科和作业标题要尽量从图片自动识别。
  - 批改图片坐标是薄弱点，不能依赖模型总是返回准确坐标。

## 11. 最近重要提交

当前最新几次提交：

- `f237c3b Count watered days cumulatively`：成长树浇水天数改为累计打卡天数。
- `9a3392a Move redeemed reward count above action`：奖励卡“已兑奖 X 次”移到按钮上方。
- `05729d1 Restore desktop rail menu spacing`：恢复电脑端左侧菜单位置。
- `5c98202 Adjust desktop growth tree rail placement`：调整电脑端成长树位置。
- `214415a Use growth tree stage images`：接入 6 阶段成长树图片。

## 12. 新会话接手建议

新会话开始后建议按这个顺序做：

1. 读取本文件：`docs/HANDOFF.md`。
2. 查看工作区状态：`git status --short`。
3. 查看最近提交：`git log --oneline -8`。
4. 如果要改功能，先定位相关代码：`rg -n "关键词" src/App.jsx src/styles.css server/index.js`。
5. 修改后执行：`npm.cmd run build`。
6. 发布到服务器并确认 `/api/health`。
7. `git add`、`git commit`、`git push`。

本项目已经多次迭代，最重要的是保持“只改用户当前要求的点”，不要顺手重构大文件，也不要回退用户已经确认过的功能。
