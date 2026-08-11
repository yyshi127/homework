# Contributing to Little Growth Planet

Thank you for helping improve Little Growth Planet. Contributions that make daily planning, reading follow-up, accessibility, privacy, reliability, or documentation better for families are welcome.

## Before You Start

- Search existing issues before opening a new one.
- Use an issue to discuss large behavioral or data-model changes before implementation.
- Never include real child profiles, homework photos, API credentials, database files, or production addresses in an issue, test, screenshot, or commit.
- Security vulnerabilities must be reported through the private process in [SECURITY.md](SECURITY.md).

## Development Setup

```bash
npm install
npm run server
npm run dev
```

The development proxy points to the local API at `http://127.0.0.1:8090`.

Before submitting a pull request, run:

```bash
npm test
npm run build
```

## Pull Requests

- Keep each pull request focused on one problem.
- Explain the user-facing behavior before and after the change.
- Add or update tests when changing shared state, calculations, validation, or API behavior.
- Include desktop and mobile evidence for visible interface changes.
- Preserve existing data when changing storage keys or persisted structures.
- Do not commit generated `dist/` files, databases, local archives, or AI credentials.

## Code Style

- Follow the existing React and CSS patterns.
- Prefer small, direct changes over unrelated refactors.
- Use clear names and add comments only where behavior is not self-explanatory.
- Keep all user-facing text accessible and avoid controls that depend only on color.

## License

By contributing, you agree that your contribution will be licensed under the GNU Affero General Public License v3.0 or later.

---

# 参与贡献

感谢你帮助完善“小小成长星球”。欢迎围绕家庭计划执行、阅读跟进、无障碍体验、隐私保护、稳定性和文档提交贡献。

## 开始之前

- 提交新 Issue 前请先搜索是否已有相关问题。
- 较大的行为或数据结构改动，请先通过 Issue 讨论。
- 不要在 Issue、测试、截图或提交中加入真实儿童资料、作业照片、API 密钥、数据库或生产服务器地址。
- 安全漏洞请按照 [SECURITY.md](SECURITY.md) 私下报告。

## 提交要求

- 每个 Pull Request 只解决一个明确问题。
- 说明修改前后的用户行为。
- 修改共享状态、计算规则、校验或 API 时，应补充或更新测试。
- 可见界面调整需要检查桌面端和移动端。
- 修改持久化结构或存储键时必须兼容已有数据。
- 不要提交构建产物、数据库、本地压缩包或 AI 密钥。

提交前请运行：

```bash
npm test
npm run build
```

提交贡献即表示你同意以 GNU Affero General Public License v3.0 或更高版本发布该贡献。
