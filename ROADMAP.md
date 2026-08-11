# Roadmap

Little Growth Planet is currently a self-hosted, single-family application. The roadmap prioritizes privacy, reliability, accessibility, and sustainable family use before broader platform features.

This roadmap describes direction rather than guaranteed delivery dates. Please open an issue before starting a large change.

## Shipped in v1.0.0

- Daily, date-range, and temporary task check-ins.
- Monthly overview and formatted monthly or annual Excel exports.
- Points, configurable rewards, and redemption history.
- Reading plans with editable daily page ranges and long-term records.
- Optional AI-assisted homework review and mistake collection.
- SQLite persistence, state validation, versioned writes, and multi-tab update notifications.
- Public documentation, automated tests, CI, and an AGPL-3.0-or-later license.

## Near Term: v1.0.x

- Add a documented authentication reference for Internet-facing self-hosted deployments.
- Add a guided database backup, validation, and restore workflow.
- Expand regression tests for Excel export, reading schedules, and points calculations.
- Improve keyboard navigation, visible focus states, and accessible labels.
- Verify responsive layouts at common desktop, tablet, and mobile sizes.

## Mid Term: v1.1

- Introduce optional guardian accounts without weakening local-first use.
- Add import and export for portable family backups.
- Separate large page components to make contributions and testing easier.
- Add an internationalization foundation while keeping Chinese as the primary interface.
- Provide an optional offline-capable installation path for supported browsers.

## Security Before Multi-family Hosting

The current data model uses one shared family state. Before any multi-family public service is offered, the project must add authentication, tenant isolation, guardian consent, audit logging, and data export and deletion controls.

## Non-goals

- Public child leaderboards or social comparison.
- Behavioral profiling or advertising based on child data.
- Mandatory cloud accounts or mandatory AI services.
- Committing real family data, homework images, or provider credentials.

## Contributing

Roadmap work is tracked through [GitHub Issues](https://github.com/yyshi127/homework/issues). Small, focused pull requests with tests are preferred. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 中文摘要

当前版本定位为单家庭自托管应用。近期重点是访问保护、备份恢复、导出与积分测试、键盘无障碍和多尺寸适配。任何多家庭公网服务都必须先完成登录、租户隔离、监护人同意、审计记录以及数据导出和删除能力。
