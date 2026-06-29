# Deferred Items — Phase 05 Storybook Coverage

## Plan 05-04 — Storybook Build Incompatibility (Next.js 16 + @storybook/nextjs 8.6.18)

**Status:** Pre-existing issue, unresolved

**Root cause:** `@storybook/builder-webpack5` creates webpack compiler instances that interact
with `Cache.shutdown` via a plugin hook API. Next.js 16's bundled webpack (`next/dist/compiled/webpack/bundle5.js`)
has a modified cache plugin interface that differs from the standalone webpack5.
The incompatibility manifests as:
```
SB_BUILDER-WEBPACK5_0002 (WebpackInvocationError): Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
  at Cache.shutdown (next/dist/compiled/webpack/bundle5.js)
```

**Confirmed pre-existing:** Build fails with zero story files (just base config). Was broken
from commit `49420ff` (first Storybook install, alongside Next.js 16.2.4).

**Partial fix applied (05-04):**
- Created `.storybook/next-config-stub.js` — fixes the `next/config` missing module error
  that was the first blocking failure
- Added `webpackFinal` alias in `.storybook/main.ts` to wire the stub

**Remaining fix needed:**
- Option A (recommended): Downgrade to Next.js 15.x (LTS) which @storybook/nextjs 8.6.18 fully supports
- Option B: Wait for @storybook/nextjs update with explicit Next.js 16 support
- Option C: Switch to @storybook/react-webpack5 + manually add next/navigation mocks

**Impact:** Story files are structurally correct and type-safe. Visual review in Storybook
is unavailable until the build is fixed. The story code itself does not need to change.
