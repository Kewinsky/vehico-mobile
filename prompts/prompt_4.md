Perform a full end-to-end review of the Vehico application and refactor it to production-ready quality.

You must act as a senior/staff-level engineer and product-focused tech lead.
Your task is to audit, simplify, clean up, and harden the entire project.

This is NOT a feature expansion phase.
This is a quality, correctness, and maintainability phase.

---

## PRIMARY OBJECTIVES

1. Ensure the app is production-ready
2. Remove unused, redundant, or unfinished code
3. Simplify architecture where possible
4. Enforce best practices (React Native, Supabase, TypeScript)
5. Improve UX consistency and predictability
6. Reduce technical debt
7. Make the codebase easy to maintain by a solo founder

---

## SCOPE OF REVIEW

The review must include:

- Frontend (React Native / Expo)
- Backend (Supabase schema, RLS, functions)
- Navigation & UX flows
- Data models
- Error handling
- Loading states
- Permissions and security
- Naming conventions
- Folder and file structure

---

## CODEBASE CLEANUP (MANDATORY)

### 1. Remove Unused Code

- Identify and remove:
  - Unused components
  - Dead screens
  - Unused hooks
  - Unused services
  - Feature flags that are no longer needed
- If a feature is not reachable via UI, it should not exist in code

---

### 2. Simplify Architecture

- Remove unnecessary abstractions
- Inline logic where abstraction adds no value
- Avoid premature optimization
- Prefer clarity over cleverness

Rules:

- If something is used only once → do not abstract it
- If a service does only simple CRUD → simplify it

---

### 3. Naming & Consistency Audit

- Ensure consistent naming across:
  - Database
  - API
  - Frontend
- Use:
  - `make`, not `brand`
  - snake_case in database
  - camelCase in frontend
- Fix any mismatches or confusing names

---

## FRONTEND REVIEW (React Native)

### 4. Component Hygiene

- Components should:
  - Do one thing
  - Be predictable
  - Have clear props
- Remove prop drilling if unnecessary
- Avoid deeply nested component trees

---

### 5. State Management

- Ensure state is:
  - Local where possible
  - Lifted only when needed
- Remove unnecessary global state
- Avoid duplicated state

---

### 6. UX & Interaction Review

- Verify:
  - All screens are scrollable when keyboard is open
  - Keyboard dismisses on outside tap
  - No blocked interactions
- Remove:
  - Dead buttons
  - Placeholder interactions without feedback
- Ensure:
  - All actions provide feedback (loading, success, error)

---

### 7. Navigation Review

- Ensure navigation is:
  - Shallow
  - Predictable
  - Consistent
- Remove unnecessary nested navigators
- Ensure back navigation always works intuitively

---

## BACKEND REVIEW (SUPABASE)

### 8. Database Schema Review

- Review all tables and columns
- Remove unused columns
- Normalize only where it adds clarity
- Avoid over-normalization

---

### 9. Row Level Security (CRITICAL)

- Verify:
  - All tables have RLS enabled
  - Users can ONLY access their own data
  - Public pages are strictly read-only
- Remove overly complex RLS rules
- Prefer explicit policies over clever ones

---

### 10. Storage & Files

- Ensure:
  - No orphaned files
  - Deleting records deletes files
  - File access respects ownership
- Simplify storage structure if possible

---

## FEATURE AUDIT & REDUCTION

### 11. Feature Validation

For every existing feature:

- Confirm it:
  - Has a clear purpose
  - Is used in UI
  - Adds value to Vehico's core mission

If a feature:

- Is unused
- Is confusing
- Does not reinforce "proof of care"

→ Remove or simplify it.

---

### 12. Paid Feature Handling

- Ensure disabled features:
  - Do not execute backend logic
  - Do not leak implementation details
  - Show a calm informational message only
- Remove any premature monetization logic

---

## PERFORMANCE & RELIABILITY

### 13. Performance Pass

- Identify unnecessary re-renders
- Optimize lists (FlatList)
- Ensure image loading is efficient
- Avoid blocking UI threads

---

### 14. Error Handling

- Centralize error handling
- Replace console logs with user-safe messaging
- Ensure no crashes on:
  - Network failure
  - Empty data
  - Permission errors

---

## SECURITY & PRIVACY

### 15. Security Review

- Ensure:
  - No sensitive data in logs
  - No secrets in frontend
  - Proper permission checks everywhere
- Validate destructive actions require confirmation

---

### 16. Privacy & Compliance

- Verify:
  - User can delete all their data
  - Files and records are actually removed
  - Public links expose minimal data
- Ensure GDPR-friendly behavior

---

## DEVELOPER EXPERIENCE (DX)

### 17. Project Structure

- Ensure folder structure is:
  - Simple
  - Flat where possible
  - Predictable
- Remove unnecessary indirection

---

### 18. Documentation

- Add minimal inline comments where logic is non-obvious
- Remove redundant comments
- Ensure code is self-explanatory

---

## FINAL DELIVERABLE EXPECTATIONS

After this phase:

- Vehico should feel clean, stable, and intentional
- The codebase should be easy to understand after 1 day of reading
- There should be no unused features or code paths
- UX should feel calm, consistent, and trustworthy
- The app should be ready for beta users or store submission

This phase is about discipline, reduction, and excellence.
