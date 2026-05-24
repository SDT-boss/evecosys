# Testing

Run unit tests with Vitest. Tests use `jsdom` and `@testing-library/react`.

Install dev dependencies first (use legacy peer deps to avoid conflicts):

```bash
npm install --legacy-peer-deps
```

Run tests:

```bash
npm run test
```

Helpers and stubs
- `test/utils/supabaseMock.ts` - small factory that produces jest/vitest-friendly mocks for `createClient()` (used across unit tests).
- `test/utils/supabaseStub.ts` - an in-memory supabase-like stub useful for integration-style tests. It exposes a simple `from(table)` API and `auth` helpers.

Integration tests
- Integration-style tests should import the stub and `vi.mock('@/lib/supabase/client', () => ({ createClient: () => stub }))` to replace the client. See `test/integration/auth.integration.test.tsx` for an example of the reset-password flow.

Notes
- The test helpers are intentionally lightweight. For full integration tests consider running against a local Supabase emulator or a real testing project with isolated data.
