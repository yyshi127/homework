# 小小成长星球 | Little Growth Planet

[English](#english-version) | [中文](#中文说明)

[![CI](https://github.com/yyshi127/homework/actions/workflows/ci.yml/badge.svg)](https://github.com/yyshi127/homework/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## English Version

Little Growth Planet is a homework, reading, and habit-building system designed for families with primary-school children. Parents can arrange daily tasks, assess completion quality, manage reading plans, build a positive feedback loop through points and rewards, and review long-term progress through monthly records and Excel exports.

The frontend is built with React and Vite. A Node.js and Express API handles application services, while SQLite stores the data. The project also includes optional AI-assisted homework review and mistake collection.

## Project Value

### Make daily execution easier than planning

Many families already have homework lists and habit plans. The real challenge is following them consistently every day. The system brings study, reading, and daily-life tasks into one clear view. Children complete tasks one by one, while parents only need to confirm the completion quality and add notes when necessary, reducing repeated reminders and fragmented record keeping.

### Replace constant reminders with positive feedback

The system connects task completion, quality assessment, points, and reward redemption into a complete feedback loop. Children can see how each effort contributes to their points and visible growth, while parents can define rewards that fit their own family.

### Turn reading goals into trackable plans

The reading module records more than whether a child has read today. It manages books, planned dates, daily page ranges, actual progress, and completion rewards. Parents can identify delays early, and children can look back on the books they have completed over time.

### Preserve progress for long-term review

Unlike paper charts and scattered spreadsheets, the system stores daily status, completion quality, notes, reading records, points, and reward redemptions in one place. Monthly overviews and formatted Excel exports help parents identify which routines are sustainable, where interruptions occur, and how the next plan should be adjusted.

### Cover study, reading, and daily-life habits together

The system is not limited to homework. It can also track organization, routines, chores, and other daily habits. A shared task and points model avoids the need to maintain several separate sheets or applications.

### Keep data under your control

The project supports self-hosting and local SQLite storage, allowing families to retain control of their check-in and reading data. AI homework review is optional. Daily check-ins, rewards, reading management, and exports remain available without an external AI service.

## Core Features

### Daily Check-in

- Organizes daily tasks by Chinese, Mathematics, English, Reading, Good Habits, and custom categories.
- Supports recurring daily tasks, date-range tasks, and temporary tasks that appear only on a selected date.
- Records four states for standard tasks: not checked in, completed, excellent, and outstanding.
- Supports task-specific habit points and daily notes.
- Shows total tasks, completed tasks, incomplete tasks, and points earned today.
- Displays a growth tree stage based on the day's completion progress.

### Monthly Overview

- Presents each task and day in a monthly matrix.
- Distinguishes recurring, date-range, reading, and temporary tasks.
- Displays daily points and cumulative monthly points.
- Supports controlled correction and saving of historical records.

### Points and Rewards

- Summarizes today's, monthly, cumulative, and available points.
- Allows point values to be configured for excellent work, outstanding work, habits, and reading completion.
- Includes multiple reward categories and supports creating, editing, and deleting rewards.
- Redeems rewards with points and preserves the complete redemption history.

### Reading Plans

- Manages monthly reading plans and a long-term personal library.
- Stores book category, total pages, planned dates, and reward points.
- Defines daily page ranges and records actual reading progress.
- Filters books by reading, completed, and not started.
- Awards points after a reading plan is completed and keeps historical reading records.

### Learning Tools

- Uploads homework images for AI-assisted review in Chinese, Mathematics, or English.
- Displays a score, review summary, learning suggestions, mistakes, and explanations.
- Shows question-level annotations on the original image.
- Adds mistakes to a mistake book with filtering, mastery status, deletion, and printable worksheets.
- Supports Alibaba Cloud Model Studio and Baidu Intelligent Homework Review, with an OpenAI-compatible fallback configured through environment variables.

### Settings

- Manages monthly goals, task categories, colors, and active date ranges.
- Configures standard tasks, required tasks, date-range tasks, and habit points.
- Saves recurring monthly tasks as templates and uses templates to create new months quickly.
- Edits the child's avatar, name, gender, birthday, grade, and school.

### Excel Export

- Exports records by month or year.
- Creates one worksheet per month for annual exports.
- Filters tasks by all, completed, or incomplete status.
- Lists category, task, status, completion quality, and notes separately for each day.
- Arranges dates horizontally by calendar week and applies the configured category colors for clear viewing and printing.

## Technology Stack

- React
- Vite
- Node.js
- Express
- SQLite / better-sqlite3
- Lucide React

## Project Structure

```text
.
├── src/
│   ├── App.jsx                 # Pages, state, and core business logic
│   ├── styles.css              # Global and responsive styles
│   └── assets/                 # Growth tree, reward, and UI assets
├── server/
│   └── index.js                # API, SQLite, and AI review services
├── docs/
│   └── DEPLOYMENT.md           # Public self-hosting and deployment guide
├── test/                       # State and API regression tests
├── data/                       # Local runtime data; not committed
├── index.html
├── vite.config.js
└── package.json
```

## Local Development

### Requirements

- Node.js 20 or later
- npm

### Install Dependencies

```bash
npm install
```

On Windows PowerShell, you can also use:

```powershell
npm.cmd install
```

### Start the API

```bash
npm run server
```

The API listens on `127.0.0.1:8090` by default. The default SQLite database is stored at `data/homework.sqlite`.

### Start the Frontend

```bash
npm run dev
```

Open the local URL printed by Vite.

> The `/api` proxy target in `vite.config.js` must match the API environment you intend to use. For fully local development, set the proxy target to `http://127.0.0.1:8090` to avoid writing development data to another environment.

### Build

```bash
npm run build
```

Production assets are generated in `dist/`.

## Server Configuration

The API supports the following environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8090` | API listening port |
| `DATA_DIR` | `./data` | Runtime data directory |
| `DB_PATH` | `./data/homework.sqlite` | SQLite database path |
| `OPENAI_API_KEY` | Empty | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model name |

Alibaba Cloud and Baidu homework-review settings can be maintained through the application's AI configuration interface. Sensitive keys are stored by the server and are never returned to the frontend in full.

## API Overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/state` | Load application state |
| `PUT` | `/api/state` | Save application state |
| `GET` | `/api/ai-config` | Read AI configuration status |
| `PUT` | `/api/ai-config` | Save AI configuration |
| `POST` | `/api/grade-homework` | Review a homework image |

## Data and Security

- The current version uses a single-family data model. Application state and AI configuration use the fixed `main` data key.
- The repository does not currently include user authentication, family tenant isolation, or public Internet access control.
- Do not expose the service publicly without authentication or reverse-proxy access protection.
- Databases, AI credentials, child profiles, and uploaded homework images must not be committed to Git.
- Before turning the project into a multi-family online service, implement authentication, tenant isolation, guardian consent, and data export and deletion controls.

## Documentation

See the [deployment guide](docs/DEPLOYMENT.md) for self-hosting, database backup, and release guidance.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing and report security problems through the process described in [SECURITY.md](SECURITY.md).

## License

Copyright (c) 2026 yyshi127 and contributors.

This project is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). You may use, modify, and redistribute it, including commercially, provided that you comply with the license. Modified versions offered over a network must also make their corresponding source code available under the same license.

---

## 中文说明

一套面向小学生家庭的作业、阅读与习惯培养系统。家长可以安排每日任务、记录完成质量、管理阅读计划，通过积分和奖励建立持续反馈，并使用月度记录与 Excel 导出回顾孩子的成长过程。

项目采用 React + Vite 构建前端，Node.js + Express 提供 API，SQLite 保存业务数据，同时支持 AI 作业批改和错题整理。

## 项目价值

### 让每天的执行比制定计划更简单

很多家庭并不缺少作业表和习惯计划，真正困难的是每天持续执行。系统把当天需要完成的学习、阅读和生活任务集中到一个页面，孩子按项完成，家长只需确认完成质量和必要备注，减少反复询问、口头催促和重复记录。

### 用正向反馈替代单纯催促

系统将“完成任务、评价质量、获得积分、兑换奖励”连接成完整闭环。孩子能够看到每次努力带来的积分和成长变化，家长也可以根据家庭实际情况设置奖励，让抽象的坚持变成清晰、可感知的进步。

### 让阅读从一句要求变成可跟进的计划

阅读模块不仅记录“今天读过”，还管理书目、计划日期、每日页码范围、实际进度和读完奖励。家长可以及时发现阅读计划是否滞后，孩子读完后也能回顾一本本书积累起来的阅读足迹。

### 长期保存成长记录，方便复盘

相比纸质表格和零散 Excel，系统将每日状态、完成质量、备注、阅读记录、积分和奖励兑换统一保存。月度总览和专业 Excel 导出可以帮助家长回顾哪些任务容易坚持、哪些环节经常中断，并据此调整下一阶段计划。

### 同时覆盖学习、阅读与生活习惯

系统不把孩子的成长局限在作业完成情况，还可以持续记录整理、作息、家务等生活习惯。统一的任务和积分规则让家长不必在多个表格或应用之间反复切换。

### 数据自主可控

项目支持自托管和本地 SQLite 存储，家庭可以掌握自己的打卡与阅读数据。AI 作业批改属于可选能力；不配置外部 AI 服务时，日常打卡、积分奖励、阅读管理和数据导出仍可独立使用。

## 核心功能

### 今日打卡

- 按语文、数学、英语、阅读、好习惯等分类展示当天任务。
- 支持每日任务、阶段任务和仅在指定日期出现的临时任务。
- 普通任务可记录未打卡、已完成、优秀和非常优秀四种状态。
- 好习惯可配置独立积分，任务支持填写每日备注。
- 展示今日任务数、完成数、未完成数及当日积分。
- 根据当天完成进度展示不同阶段的成长树。

### 本月打卡

- 通过月度矩阵查看每天、每项任务的完成情况。
- 区分普通任务、阶段任务、阅读任务和临时任务。
- 展示每日积分和月度累计积分。
- 支持受控的历史记录补录和保存。

### 积分奖励

- 汇总今日、本月、累计及可用积分。
- 自定义优秀、非常优秀、好习惯和阅读奖励分值。
- 内置多种奖励分类，支持新增、编辑和删除奖励。
- 使用积分兑换奖励并长期保存兑换记录。

### 阅读书单

- 管理本月阅读计划和长期图书馆。
- 记录图书分类、总页数、计划日期和阅读奖励。
- 按天设置阅读页码范围，并记录实际阅读进度。
- 查看正在读、已读完和未开始的图书。
- 完成阅读计划后领取积分，保留历史阅读记录。

### 学习工具

- 上传作业图片并调用 AI 进行语文、数学或英语作业批改。
- 显示评分、批改总结、学习建议、错题及解题说明。
- 在原图上展示题目级标注。
- 将错题收录到错题集，支持筛选、标记掌握、删除和打印练习卷。
- 支持阿里云百炼、百度智能作业批改，也可通过环境变量接入 OpenAI 兼容流程。

### 设置中心

- 管理月份目标、任务分类、分类颜色和任务日期范围。
- 设置普通任务、必打卡任务、阶段任务和好习惯积分。
- 将月度固定任务保存为模板，并使用模板快速创建新月份。
- 编辑儿童头像、姓名、性别、生日、年级和学校信息。

### Excel 导出

- 可按月份或年份导出打卡记录。
- 年度导出时，每个月对应一个独立工作表。
- 支持按全部、已完成和未完成状态筛选。
- 每天独立列出分类、任务、状态、完成质量和备注。
- 按自然周横向排版，并使用系统分类颜色生成便于查看和打印的表格。

## 技术栈

- React
- Vite
- Node.js
- Express
- SQLite / better-sqlite3
- Lucide React

## 项目结构

```text
.
├── src/
│   ├── App.jsx                 # 页面、状态与主要业务逻辑
│   ├── styles.css              # 全局及响应式样式
│   └── assets/                 # 成长树、奖励等前端资源
├── server/
│   └── index.js                # API、SQLite 与 AI 批改服务
├── docs/
│   └── DEPLOYMENT.md           # 公开的自托管与部署指南
├── test/                       # 状态与 API 回归测试
├── data/                       # 本地运行数据，不提交仓库
├── index.html
├── vite.config.js
└── package.json
```

## 本地运行

### 环境要求

- Node.js 20 或更高版本
- npm

### 安装依赖

```bash
npm install
```

Windows PowerShell 也可以使用：

```powershell
npm.cmd install
```

### 启动后端

```bash
npm run server
```

后端默认监听 `127.0.0.1:8090`，SQLite 数据库默认保存在 `data/homework.sqlite`。

### 启动前端

```bash
npm run dev
```

打开 Vite 输出的本地地址即可访问。

> `vite.config.js` 中的 `/api` 代理目标应与实际 API 地址保持一致。若需要完全本地联调，请将代理目标设置为 `http://127.0.0.1:8090`，避免把开发数据写入其他环境。

### 构建

```bash
npm run build
```

构建产物生成在 `dist/` 目录。

## 服务端配置

服务端支持以下环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8090` | API 监听端口 |
| `DATA_DIR` | `./data` | 数据目录 |
| `DB_PATH` | `./data/homework.sqlite` | SQLite 文件路径 |
| `OPENAI_API_KEY` | 空 | OpenAI API 密钥 |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI 模型名称 |

阿里云百炼和百度智能作业批改的配置可在系统 AI 配置界面中维护。敏感密钥由服务端保存，读取配置时不会将完整密钥返回前端。

## API 概览

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 服务健康检查 |
| `GET` | `/api/state` | 读取应用状态 |
| `PUT` | `/api/state` | 保存应用状态 |
| `GET` | `/api/ai-config` | 读取 AI 配置状态 |
| `PUT` | `/api/ai-config` | 保存 AI 配置 |
| `POST` | `/api/grade-homework` | 批改作业图片 |

## 数据与安全说明

- 当前版本采用单家庭数据模型，应用状态和 AI 配置均使用固定的 `main` 数据键。
- 当前代码未包含用户登录、家庭租户隔离和公开互联网访问控制。
- 请勿在没有身份认证或反向代理访问保护的情况下直接公开部署。
- 数据库、AI 密钥、儿童资料及上传的作业图片均不应提交到 Git 仓库。
- 如需改造成多家庭在线服务，应先实现账号认证、租户数据隔离、监护人同意、数据导出与删除机制。

## 文档

自托管、数据库备份和发布说明请参阅[部署文档](docs/DEPLOYMENT.md)。

## 参与贡献

欢迎提交 Issue 和 Pull Request。参与前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，安全问题请按照 [SECURITY.md](SECURITY.md) 中的流程私下报告。

## 许可

Copyright (c) 2026 yyshi127 及项目贡献者。

本项目采用 [GNU Affero General Public License v3.0 或更高版本](LICENSE)开源。允许使用、修改、再分发和商业使用，但必须遵守许可证；通过网络提供修改版服务时，也需要以相同许可证公开对应源代码。
