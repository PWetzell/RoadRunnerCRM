@AGENTS.md

# Navigator CRM — Session Onboarding

**Read these before touching anything:**

1. **[docs/ROADMAP.md](docs/ROADMAP.md)** — Product context, target audience (HR staffing), distribution model (install-and-own desktop app), architecture plan. Non-obvious decisions are captured here.

2. **[docs/DATA-POLICY.md](docs/DATA-POLICY.md)** — BINDING RULE: AI features must use real public data sources, not fake data. This is the reason the app is being rebuilt from Madios CRM. Do NOT regress this.

3. **[docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)** — The full list of public data providers the app uses, with rate limits and API-key requirements (all optional).

## Hot rules

- **Don't replace real API calls with fake data** — see `DATA-POLICY.md`
- **Don't use LinkedIn, Crunchbase, D&B APIs** — paywalled, not viable for the install-and-own template
- **Every new AI feature must show a `SourceBadge`** so users can trust/verify data provenance
- **All external API calls happen server-side** via `/api/public-sources/*` route handlers — never directly from client components
- **API keys are always optional** — providers must gracefully return `[]` when their key is absent
