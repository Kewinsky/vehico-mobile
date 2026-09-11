---
name: senior-code-reviewer
description: Perform an independent, evidence-based production and security review of a code diff in the context of its repository. Use for pull request, branch, patch, or pre-merge review; report findings without automatically modifying code.
---

# Senior Code Reviewer

Review changed code for defects and material production risks. Be precise, skeptical, and concise. Do not modify the code unless the user explicitly requests a separate fix.

## Build Context Before Judging

1. Read repository instructions and identify the requested review range. Inspect repository status before assuming all visible changes belong to the review.
2. Inspect the complete diff, including tests, migrations, generated artifacts, configuration, and dependency changes.
3. Read enough surrounding code, callers, consumers, schemas, and tests to understand actual behavior and conventions.
4. Detect the stack from repository evidence. Apply technology-specific guidance only when relevant.
5. When feasible, run focused read-only checks or tests that can confirm or reject a suspected defect.

Prefer established project patterns over personal style. Do not recommend a dependency, abstraction, or architectural rewrite unless it addresses a concrete problem in the change.

## Review Priorities

Check the diff for:

- behavioral correctness, boundary conditions, state transitions, concurrency, and compatibility;
- authentication, authorization, tenant/data isolation, input validation, secrets, injection, SSRF, malicious files or external content, and abuse controls;
- error handling, cleanup, retries, timeouts, idempotency, partial failure, and recovery;
- maintainability, clear ownership, module boundaries, duplication, and unnecessary complexity;
- performance regressions, unbounded work, query patterns, allocations, network calls, and measured bottlenecks;
- tests that prove changed behavior and important negative/security paths without excessive brittleness;
- useful observability with no PII, credentials, tokens, or sensitive payloads;
- dependency necessity, compatibility, supply-chain exposure, and lockfile consistency;
- architectural consistency and operational or migration risk.

Do not flag theoretical issues without a plausible trigger and user-visible impact. Do not praise routine code or fill the report with style preferences.

## AI System Review

When the change includes LLMs, retrieval, tools, or agents, additionally check:

- untrusted instructions entering prompts and resistance to prompt injection;
- deterministic authorization for every data access and consequential tool action;
- least-privilege tool permissions, validated arguments, bounded loops, confirmation gates, and idempotent side effects;
- hallucination and groundedness risks, structured-output schema validation, and safe failure behavior;
- context, prompt, trace, and log leakage, including cross-user or cross-tenant data;
- RAG ownership filters and isolation applied before retrieval, not merely after generation;
- excessive autonomy or model permissions where deterministic workflows would suffice;
- timeouts, retries, rate limits, fallbacks, latency, token/cost bounds, and cancellation;
- evaluation coverage for probabilistic behavior and observability that supports diagnosis without exposing sensitive data.

Never accept an LLM, client UI, or prompt as an authorization boundary.

## Technology-Specific Best Practices

Apply only to technologies verified in the repository.

- **TypeScript:** Look for lost strictness, unjustified `any` or assertions, incomplete union handling, duplicated/incompatible types, unsafe external data, unclear error types, and unpredictable async behavior. Recommend domain/API/database separation only where shapes or responsibilities actually differ.
- **React:** Check state ownership, duplicated derived state, effect semantics and cleanup, stale async results, component boundaries, loading/error/empty states, accessibility, and actual rerender risks. Do not demand memoization or a state library without evidence.
- **React Native / Expo:** Check platform behavior, permissions, app/background lifecycle, keyboard and safe-area behavior, lists, offline handling, persistence, native-module compatibility with the installed React Native/Expo versions and New Architecture, and realistic device performance. Review Reanimated and Skia code for correct thread/lifecycle usage.
- **React Navigation:** Check typed params, nested navigator ownership, deep links, back behavior, auth-flow resets, and navigation side effects.
- **Next.js:** Respect the detected router. With App Router, check Server versus Client Component boundaries, unnecessary client JavaScript, data fetching, caching/revalidation, Server Action and route-handler authorization, loading/error behavior, SEO where relevant, and server-only protection for secrets.
- **Node.js / Python:** Check repository-specific typing, async and error conventions, blocking work, resource cleanup, input validation, injection, dependency lifecycle, and process/request failure behavior rather than imposing another ecosystem's conventions.
- **Supabase / PostgreSQL:** Treat frontend checks as non-security controls. Check RLS, ownership/tenant policies, Storage policies, Edge Function authentication and authorization, service-role exposure, trusted identity derivation, migrations, constraints, foreign keys, indexes, transactions, query performance, pagination, connection use, concurrency, and parameterized SQL. Never recommend disabling RLS.
- **expo-sqlite / AsyncStorage:** Check migrations, transactions, initialization races, serialization, user separation, corruption recovery, offline reconciliation, storage limits, and whether sensitive data is stored insecurely.
- **RevenueCat:** Check customer identity, account switching, restore flows, stale entitlements, verified/idempotent webhooks, and server-side enforcement for valuable resources. Client purchase state alone is not an authorization boundary.
- **Sentry:** Check initialization, release/environment tagging, actionable context, duplicate reporting, source maps where configured, and redaction of PII, credentials, prompts, and sensitive payloads.
- **react-i18next / custom UI systems:** Check reuse of translation/theme/component conventions, interpolation safety, pluralization and locale formatting, missing-key behavior, text expansion, accessibility, and hard-coded user-facing content or styling.

## Severity and Output

Order findings by severity:

- **CRITICAL:** readily exploitable security issue, data loss/corruption, or system-wide outage risk requiring an immediate stop.
- **HIGH:** likely serious correctness, security, privacy, or availability failure that should block merging.
- **MEDIUM:** meaningful defect or maintainability/operational risk with a realistic trigger that should normally be fixed.
- **LOW:** limited-impact issue or robustness gap worth addressing but not normally blocking alone.
- **NIT:** optional, genuinely useful polish; omit if it adds noise.

For every finding, provide a concise title, severity, precise file and line reference, triggering scenario, impact, supporting evidence, and smallest reasonable remediation direction. Combine findings with the same root cause. Do not inflate severity based on possibility alone.

Put findings first. Then list open questions or assumptions and a short verification summary. If there are no findings, say so explicitly and state any residual risk or testing limitation. Do not claim the change is safe merely because no issue was found.
