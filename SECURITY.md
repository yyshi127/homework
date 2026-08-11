# Security Policy

Little Growth Planet may process child profiles, homework images, reading records, habit records, and third-party AI credentials. Please handle all security reports responsibly and avoid exposing family data in public issues.

## Supported Version

Security fixes are applied to the latest code on the `main` branch. Older snapshots and third-party deployments may not receive fixes.

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting page:

<https://github.com/yyshi127/homework/security/advisories/new>

Please include:

- The affected component and commit or version.
- Reproduction steps or a minimal proof of concept.
- The potential impact.
- Suggested remediation, if available.

Remove all real child data, homework images, access tokens, API keys, and server addresses from the report. The maintainer will review the report and coordinate disclosure after a fix is available.

## Current Security Boundary

The current application uses a single-family data model and does not include built-in user authentication or tenant isolation. A self-hosted instance must not be exposed to the public Internet without an authentication layer or equivalent access control.

## Secrets

- Store AI credentials only in the server configuration or protected environment variables.
- Never commit `.env` files, SQLite databases, uploaded homework images, or production configuration.
- Rotate a credential immediately if it is accidentally disclosed.

---

# 安全政策

“小小成长星球”可能处理儿童资料、作业图片、阅读和习惯记录以及第三方 AI 凭据。请勿通过公开 Issue 披露漏洞或真实家庭数据，应使用上面的 GitHub 私密漏洞报告入口。

当前版本采用单家庭数据模型，未内置用户认证和租户隔离。自托管实例在没有认证层或同等访问控制时，不应直接暴露在公网。
