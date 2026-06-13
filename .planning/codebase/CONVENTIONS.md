# Coding Conventions

**Analysis Date:** 2026-06-13

## Naming Patterns

**Files:**
- React component files: PascalCase (`SignupForm.tsx`, `UsersClient.tsx`, `DashboardShell.tsx`)
- Non-component TypeScript: camelCase (`stateMachine.ts`, `registrationService.ts`, `behaviorScore.ts`, `fleetHealth.ts`)
- API routes: kebab-case directories with `route.ts` (`app/api/alerts/resolve/route.ts`, `app/api/users/create/route.ts`)
- Test files: mirror source name with `.test.ts` or `.test.tsx` suffix (e.g. `stateMachine.test.ts`, `Button.test.tsx`)
- E2E spec files: `*.spec.ts` suffix (`assets.spec.ts`, `login.spec.ts`)
- Page object files: PascalCase with `Page` suffix (`AssetsPage.ts`, `LoginPage.ts`, `DriversPage.ts`)

**Functions:**
- Regular functions: camelCase (`calcBehaviorScore`, `normalizeCredential`, `makeSupabaseMock`, `handleCreate`)
- React component functions (default export): PascalCase (`SignupForm`, `LoginPage`)
- Factory helpers in tests: `make*` prefix (`makeSupabaseMock`, `makeProbe`, `makeVault`, `makeRequest`)
- Event handlers: `handle*` prefix (`handleSignup`, `handleCreate`)
- Helper utilities in E2E: descriptive camelCase (`createTestVehicle`, `deleteTestVehicle`, `ephemeralEmail`, `uniqueEmail`)

**Variables:**
- Constants: SCREAMING_SNAKE_CASE for module-level (`TENANT_STATES`, `INITIAL_TENANT_STATE`, `BYODB_ENGINES`, `TRANSITIONS`, `VALID_STRUCTURED_INPUT`)
- Regular variables: camelCase (`supabase`, `router`, `loading`, `callOrder`)
- Boolean states: `is*` or descriptive noun (`loading`, `showPassword`, `showForm`)

**Types/Interfaces:**
- Interfaces: PascalCase, descriptive (`BehaviorScore`, `FleetHealth`, `ButtonProps`, `E2EFixtures`, `RegistrationResult`)
- Type aliases: PascalCase (`TenantState`, `BYODBEngine`, `BYODBCredentialInput`)
- Custom error classes: PascalCase ending in `Error` (`InvalidStateTransitionError`, `ConnectivityError`, `CredentialValidationError`, `ProvisioningRollbackError`, `VaultStorageError`, `AuthSessionError`, `TenantAccessError`)

## Code Style

**Formatting:**
- No Prettier config file found; formatting enforced via ESLint
- Single quotes for string literals throughout TypeScript source
- 2-space indentation
- Semicolons present in most files (not enforced by config, consistent in practice)
- Trailing commas used on multi-line structures

**Linting:**
- Config: `eslint.config.mjs` — extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- `@typescript-eslint/no-explicit-any` is disabled for `test/**` and `e2e/**` files only
- `react-hooks/rules-of-hooks` disabled for E2E fixture files (Playwright `use` function is not a React hook)
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)

## Import Organization

**Order (observed pattern):**
1. `'use client'` directive (when required) — always first line
2. Framework/external packages (`react`, `next/navigation`, `lucide-react`, `@playwright/test`)
3. Internal aliases (`@/lib/...`, `@/components/...`, `@/design-system/...`, `@/types`)
4. Relative imports (avoided — prefer `@/` alias)

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json` and `vitest.config.mts`)
- Examples: `@/lib/supabase/server`, `@/lib/tenant/types`, `@/components/layout/DashboardShell`, `@/design-system/components/Button`
- Do NOT import design-system components via relative paths — always use `@/design-system/components/...` or `@evecosys/design-system`

**Design System Imports:**
- App code should import from `@evecosys/design-system` (workspace package)
- Test code imports directly from `@/design-system/components/[ComponentName]` for isolation
- Some legacy app code still imports from `@/components/ui/Badge` (pre-graduation location) — prefer the design-system package

## Error Handling

**Patterns:**
- Domain errors are typed custom classes extending `Error` with `this.name` set in constructor (see `lib/tenant/types.ts`)
- Each error class carries typed public fields for programmatic access (e.g. `InvalidStateTransitionError.from`, `InvalidStateTransitionError.to`)
- API routes use `NextResponse.json({ error: '...' }, { status: N })` for all error responses; no exception propagation
- Service/library code throws typed errors; callers catch and decide whether to surface them
- Client components use local `error` state + inline `setError(...)` for user-facing error display
- Catch blocks in client code: `err instanceof Error ? err.message : 'Network error'` pattern for safe message extraction
- Dual-failure pattern: `ProvisioningRollbackError` wraps both original and rollback errors when a cleanup also fails

**API Route Pattern:**
```typescript
// Guard early, return typed errors immediately
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const { alertId } = await req.json()
if (!alertId) return NextResponse.json({ error: 'Missing alertId' }, { status: 400 })
```

## Logging

**Framework:** None — no logging library detected

**Patterns:**
- No `console.log` calls in production source code
- Error messages are embedded in thrown Error objects, not logged separately
- Credentials are explicitly never logged (documented in `BYODBRegistrationService` JSDoc)

## Comments

**When to Comment:**
- JSDoc block comments on service classes and complex functions (`BYODBRegistrationService`, `Button`, `design-system/components/index.ts`)
- Inline step comments in multi-step workflows (`// Step 1 — state guard`, `// Step 2 — normalise + validate`)
- Testability notes in E2E page objects (e.g. `AssetsPage.ts` documents missing `data-testid` attributes)
- Test requirement IDs as inline comments (`// ROLLBACK-01`, `// SEC-02/TEST-03`)
- Section separators using `// ─── Section Name ──` within large describe blocks and component files

**JSDoc/TSDoc:**
- JSDoc used on public API of design-system components and service classes
- Parameter/return types documented inline via TypeScript, not JSDoc `@param`/`@returns`

## Function Design

**Size:** Functions are generally small and focused; complex orchestration (e.g. `register` in `registrationService.ts`) is broken into numbered steps with comments.

**Parameters:**
- Dependency injection via constructor for services (`BYODBRegistrationService(probe, vault)`)
- React components receive typed props interfaces (e.g. `ButtonProps`, `SignupFormProps`)
- Factory functions use `overrides` pattern for test data (`driverPayload(overrides)`)

**Return Values:**
- Pure functions return typed interfaces (`BehaviorScore`, `FleetHealth`, `RegistrationResult`)
- Async functions return `Promise<T>` where T is a typed result interface
- State-transition functions (`transitionTenant`) return NEW objects; input is never mutated

## Module Design

**Exports:**
- Named exports preferred in library and component code
- Default exports used only for Next.js page/layout components
- Barrel file at `design-system/components/index.ts` with organized exports by atomic design tier (atoms → molecules → organisms)

**Barrel Files:**
- Design system has a single barrel: `design-system/components/index.ts`
- `lib/tenant/` uses per-file named exports; no barrel
- Components under `components/` have no barrel — imported directly by path

## CSS / Styling

**Tokens:**
- All colours, spacing, and radii use `var(--ds-*)` CSS custom properties from the design token system
- Token source: `design-system/tokens/variables.css` (generated from `tokens.json` via Style Dictionary)
- Hardcoded hex values (`#7cc242`, `#5a9e2f`) exist in legacy code (`SignupForm.tsx`, `behaviorScore.ts`, `fleetHealth.ts`) — these are a known violation of the convention

**Tailwind:**
- Tailwind utility classes are used for layout (`flex`, `grid`, spacing utilities)
- For colours that need tokens: `bg-[var(--ds-color-...)]` syntax rather than direct Tailwind colour utilities
- `class-variance-authority` (CVA) is the pattern for variant-based component styling in the design system

---

*Convention analysis: 2026-06-13*
