# Repository instructions for coding agents

## Project context

Vericar is a proprietary React Native application for vehicle ownership. It uses Expo SDK 54, React Native 0.81, React 19, strict TypeScript, React Navigation, Supabase, RevenueCat, Sentry, `react-i18next`, SQLite, and AsyncStorage. The Expo New Architecture is enabled.

Before making changes, read the relevant implementation, nearby tests, and configuration. `README.md` describes the product and setup. For AI work, also read `AI_ROADMAP.md`, `ai.todo`, the relevant `AI_STAGE_*.md`, and `AI_EVALS.md` when model quality is involved.

## Common commands

Use npm; `package-lock.json` is authoritative.

```bash
npm install
npm start
npm run ios
npm run android
npm run typecheck
npm run lint
npm test -- --runInBand
npm run precheck
```

Run the narrowest relevant test first. Before handing off a non-trivial change, run `npm run typecheck`, `npm run lint`, and the affected tests. Use `npm run precheck` when the full suite is proportionate.

The root TypeScript configuration excludes `supabase/` and `src/__tests__/`. Passing `npm run typecheck` therefore does not validate Edge Functions or test files. Verify those through their focused tests and, when available, the appropriate Deno/Supabase tooling.

## Repository structure

- `src/app/`: bootstrapping, providers, hooks, and typed root navigation.
- `src/screens/`: screen-level UI. Register stack routes in `src/app/navigation/RootNavigator.tsx`.
- `src/ui/` and `src/layouts/`: shared themed components and screen shells.
- `src/services/`: repositories and external integrations. Keep network and persistence access out of presentation components.
- `src/types/`: shared domain types.
- `src/i18n/resources/`: English and Polish translations.
- `src/__tests__/`: Jest tests, grouped by feature or boundary.
- `src/test/`: shared test helpers, including the Supabase mock.
- `supabase/migrations/`: incremental PostgreSQL migrations.
- `supabase/functions/`: Deno Edge Functions and shared server-side helpers.
- `shared/`: code shared with backend workflows, currently payment identifiers.

## Implementation principles

- Follow the style and architecture of the surrounding code. Prefer the smallest complete change.
- Keep strict, explicit types. Avoid `any`, double assertions, and casts that merely silence the compiler.
- Reuse existing services, layouts, UI components, theme tokens, prompts, and test helpers before adding abstractions.
- Prefer functional components and hooks. Keep state close to its owner and derive values instead of duplicating state.
- Validate all external input and responses at runtime. TypeScript types alone are not boundary validation.
- Handle expected loading, empty, error, cancellation, and cleanup paths.
- Do not introduce a dependency, SDK upgrade, global state library, or generalized framework without a concrete need and explicit explanation.
- Avoid unrelated refactors, broad formatting changes, and changes to generated files.

## Design and code quality

- **KISS:** choose the simplest design that completely solves the current problem. Prefer direct, readable control flow over cleverness, indirection, or pattern-heavy code.
- **YAGNI:** do not add extension points, configuration, generic frameworks, fallback paths, or abstractions for hypothetical future requirements. Build them when a concrete use case exists.
- **DRY:** remove duplicated business rules and knowledge, not every repeated line. A small amount of local duplication is preferable to a premature abstraction that couples unrelated features.
- **SOLID:** use the principles as design heuristics, not targets that require more files, classes, or interfaces:
  - keep modules, components, hooks, and functions focused on one cohesive responsibility;
  - extend stable boundaries when a real variant is needed instead of repeatedly modifying unrelated callers;
  - preserve behavioral contracts in implementations, adapters, and test doubles;
  - prefer narrow props, interfaces, and dependency surfaces;
  - inject external dependencies at meaningful boundaries when it improves testing or separates infrastructure, without introducing a DI framework.
- Prefer composition over inheritance and plain functions over classes unless stateful object behavior is clearly justified.
- Use intention-revealing, searchable names. Names should describe domain meaning rather than implementation mechanics.
- Keep functions cohesive and at a consistent abstraction level. Extract helpers when they clarify intent, isolate a boundary, or remove stable duplication—not to satisfy an arbitrary line count.
- Make side effects visible. Keep network, storage, navigation, logging, and mutation at clear boundaries instead of hiding them in seemingly pure helpers.
- Use comments to explain constraints, trade-offs, or non-obvious reasons. Do not narrate code that can be made self-explanatory through naming and structure.
- Prefer explicit error handling and typed state transitions over sentinel values, silent fallbacks, or swallowed errors.
- Apply ecosystem best practices in the context of the installed versions and repository conventions. Do not rewrite working code merely to follow a generic recommendation.
- Optimize only for a demonstrated constraint or measured bottleneck. Preserve correctness and readability before micro-optimizing.
- Leave touched code clearer than before, but keep cleanup proportional to the requested change.

## React Native and UI

- Preserve typed React Navigation parameters in `AppStackParamList`.
- Reuse the app's layout shells and `ThemeProvider`; do not hard-code screen colors or duplicate established components.
- Put all user-facing copy in both `src/i18n/resources/en.ts` and `src/i18n/resources/pl.ts`.
- Account for safe areas, keyboard behavior, Dynamic Type, dark mode, screen readers, and touch targets of at least 44 points.
- Use virtualized lists for potentially large collections and stable keys for list items.
- Respect `.ios.tsx`, `.android.tsx`, and shared-file conventions when platform behavior differs.
- Do not run destructive native regeneration such as `expo prebuild --clean` unless the user explicitly requests it. Generated `ios/` and `android/` directories are ignored.
- The project includes `expo-dev-client`. For physical iOS testing, prefer a development build; the App Store version of Expo Go may not support this repository's SDK version.

## Data, Supabase, and security

- Make database changes through a new migration. Do not edit an already-applied migration to change production behavior.
- Preserve and test RLS, ownership checks, tenant isolation, constraints, and Storage policies. Never disable them to make a feature work.
- Derive user identity from a verified Supabase session. Do not trust client-provided user IDs or vehicle ownership claims.
- Keep service-role keys, OpenAI keys, webhook secrets, and other privileged credentials server-side. Never put secrets in `EXPO_PUBLIC_*`, source code, logs, tests, or responses.
- Treat the Supabase publishable/anon key as public configuration, not authorization or abuse protection.
- Keep structured durable local data in the existing SQLite layer and small preferences in the existing AsyncStorage providers. Do not create a parallel persistence mechanism.
- Documents and attachments are currently local-first. Do not assume Edge Functions can access them.
- Do not deploy Edge Functions, apply remote migrations, change production secrets, or run store/EAS submissions unless explicitly requested.

## AI assistant changes

- Implement AI roadmap stages in order unless the user explicitly changes the plan. Keep `ai.todo` and the relevant stage documentation accurate.
- Keep prompts reviewable and versioned. Preserve structured-output schemas when application code depends on them.
- Treat prompts, model output, retrieved content, tool output, and streamed events as untrusted data.
- Enforce authentication, authorization, ownership, cost limits, and side-effect approval in deterministic backend code, never in model instructions.
- Keep API keys in Supabase secrets. The mobile client must call the Edge Function rather than OpenAI directly.
- Bound input size, output tokens, duration, retries, tool calls, and stored conversation context.
- Handle provider errors, timeouts, incomplete output, malformed structured output, cancellation, and partial streams explicitly.
- Do not send vehicle data, service history, or documents to a model until backend ownership checks for that data are implemented.
- Use deterministic tests for contracts, orchestration, permissions, parsing, and failures. Use eval datasets for semantic quality and safety; do not replace one with the other.
- Never tune a prompt to one example while silently regressing the documented evaluation set.
- Avoid logging message content, VINs, documents, API keys, authorization headers, or raw provider responses.

## Testing expectations

- Match existing Jest and `@testing-library/react-native` conventions.
- Test observable behavior and contracts rather than implementation details.
- Reuse `src/test/supabaseMock.ts` for Supabase client tests and reset mocks between cases.
- Cover important success, validation, failure, timeout, cancellation, and authorization paths appropriate to the change.
- For Edge Functions, mock paid or unreliable providers in deterministic tests. Use a small number of deliberate smoke tests for the real integration.
- Do not update snapshots or weaken assertions merely to make a failing test pass.

## Working tree and handoff

- Preserve unrelated user changes in a dirty worktree. Do not reset, overwrite, or reformat them.
- Do not commit, push, merge, rebase, or create a deployment unless explicitly requested.
- Never use destructive Git commands unless the user clearly authorizes the exact operation.
- At handoff, summarize behavior changed, files changed, verification performed, and any remaining risk or untested platform path.
