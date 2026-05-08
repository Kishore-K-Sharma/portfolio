---
title: "FinTech CRM & Loan-Processing Modernization"
company: "Credenc Web Technologies"
role: "Software Engineer"
startDate: "2021-10"
endDate: "2023-05"
domain: "fintech"
summary: "Modernized legacy CRM and loan-processing platforms for a fintech client. Achieved a substantial reduction in manual processing effort, materially shortened loan approval cycle time, and significantly lifted deployment efficiency."
outcomes:
  - { label: "Manual effort", value: "Major reduction" }
  - { label: "Loan approval time", value: "Materially shorter" }
  - { label: "Deploy efficiency", value: "Significant lift" }
  - { label: "B2B/B2C apps shipped", value: "Multiple" }
stack:
  - "Node.js"
  - "NestJS"
  - "PostgreSQL"
  - "MongoDB"
  - "React.js"
  - "React Native"
  - "Angular"
  - "AWS"
  - "Docker"
---

## The mandate

The company had built a working loan-processing platform — but it was held together by manual steps, screenshots, and a CRM that the ops team had outgrown two years ago. Every loan application required someone to log into three systems, copy data between them, and chase approvals in email. The cost wasn't just time; it was *errors that nobody could trace*.

I was asked to lead the modernization. The goal: take the existing legacy stack and rebuild it as a coherent platform that the ops team could trust, the engineering team could extend, and the product team could iterate against.

## The architecture decision

The first call was the hardest: **how much do we rewrite vs. wrap?**

We didn't have the luxury of a six-month freeze. The business kept running. So we adopted a strangler-fig pattern: stand up a new NestJS service for each capability, route traffic incrementally, decommission the legacy module only when the new one was proven. This let us ship value every two weeks instead of waiting for a big-bang launch that would never come.

NestJS gave us the structure to make this scale. Decorators for validation, modules for capability boundaries, dependency injection that made testing painless. We kept React for the customer-facing apps, Angular for the heavier internal portals (it was already there and worked), and React Native for the field-ops mobile app.

The hard part was data. Legacy ran on tightly-coupled SQL with stored procedures full of business logic. We didn't try to rewrite the database overnight. Instead, we treated the database as a contract: the new services read and wrote the same tables, but only via well-defined queries that we could replace later. After eighteen months, the stored procedures were gone. Nobody noticed because the migration happened a slice at a time.

## What I shipped

- **Bank-statement analysis API** — automated a previously manual review step and meaningfully shortened per-application processing time
- **Loan-approval workflow service** — orchestrated the multi-step approval flow; approval cycles became materially shorter
- **Customer-facing B2C app** — React + React Native, with offline-first onboarding for spotty-connectivity field cases
- **Internal CRM modernization** — Angular front-end with a NestJS API; replaced the legacy stack incrementally
- **CI/CD on AWS** — CodeBuild + CodePipeline + ECR; deploys went from "manual, scary, hourly" to "automated, gated, many-times-a-day"

## What I learned

**Migrations are about who owns what, not what tool to pick.** The strangler-fig worked because we drew very clear lines around each capability and migrated *one capability fully* before starting the next. Every team that's failed at this kind of work, in my experience, tried to migrate horizontally — "let's port all the database tables first, then all the APIs, then all the UIs." That's a way to be in the middle of a migration forever.

**Idempotency at the integration boundary is non-negotiable.** Bank APIs are flaky. Government APIs are flakier. Your retry logic only works if your downstream-of-downstream is happy seeing the same request twice. Every external integration we built carried a request-id header from day one. The first time the network had a bad day — and one of our partners' APIs returned a 502 mid-request — our retry logic just worked. No duplicate charges. No duplicate rows. That hour saved us a quarter of incident work.

## What's next

I left this engagement with the platform stable, the team confident, and a documented migration path for the remaining legacy edge-cases. The patterns we built — the boundary-first integration approach, the idempotency-everywhere stance, the strangler-fig discipline — became the playbook the team uses today.
