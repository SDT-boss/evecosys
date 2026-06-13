# Requirements: EVE-145 Tenant Switcher & Workspace Context

**Defined:** 2026-06-13
**Core Value:** Platform admins can always see which tenant they're operating in and switch context without any cross-tenant data leakage or user confusion.

## v1 Requirements

### Auth & Roles

- [ ] **AUTH-01**: `platform_admin` role exists in DB schema with RLS policies that scope platform-admin queries to the active tenant context
- [ ] **AUTH-02**: `/platform` route enforces `platform_admin` role at layout level; non-platform-admins are redirected to `/login`
- [ ] **AUTH-03**: Board tenant settings route enforces `board` role scoped to the user's own tenant
- [ ] **AUTH-04**: RLS policies ensure platform admin data queries never surface data from a tenant other than the current active context

### Platform Admin

- [ ] **PADM-01**: Platform admin can view a list of all registered tenants with their provisioning status (Active, Pending, Suspended)
- [ ] **PADM-02**: Platform admin can switch active tenant context by selecting a tenant from the list
- [ ] **PADM-03**: Platform admin sees the active tenant name as a persistent indicator in the platform admin header
- [ ] **PADM-04**: Active tenant context persists across page navigations within the same platform admin session

### Switch Flow States

- [ ] **SWIT-01**: A loading state is displayed while a tenant context switch is in progress
- [ ] **SWIT-02**: A success state confirms the active workspace has changed after a successful switch
- [ ] **SWIT-03**: A failure/error state is shown gracefully if a context switch fails (network error, permissions)
- [ ] **SWIT-04**: A blocked/no-access state is shown if the platform admin navigates to a destination restricted in the current tenant context

### Board Tenant Settings

- [ ] **BSET-01**: Board member can configure tenant branding — logo upload, primary color, and tenant display name
- [ ] **BSET-02**: Board member can invite new managers and drivers to their tenant and remove existing users
- [ ] **BSET-03**: Board member can register a BYODB database connection using the existing `lib/tenant/` provisioning stack via API routes
- [ ] **BSET-04**: Board member can enable or disable platform feature toggles for their tenant

### Storybook

- [ ] **STRB-01**: All new shell components (TenantSwitcher, ActiveTenantIndicator, BoardSettingsTabs, switch state variants) have Storybook stories covering all key states

## v2 Requirements

### Platform Admin (deferred)

- **PADM-05**: Platform admin can create a new tenant from the admin area
- **PADM-06**: Platform admin can suspend or deprovision a tenant
- **PADM-07**: Platform admin can view audit logs of tenant-context switches

### Auth (deferred)

- **AUTH-05**: Third-party SSO for platform admin login (separate from tenant user auth)

### Board Settings (deferred)

- **BSET-05**: Real-time branding preview hot-reload during configuration

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile / responsive design | Web-first; tablet/mobile deferred to v2 |
| Real-time tenant data sync across concurrent sessions | Separate concern; deferred |
| Tenant creation / deletion flows | Platform Admin v2 scope |
| Third-party SSO for platform admins | Deferred; email/password sufficient for v1 |
| Branding preview hot-reload | Deferred |
| Cross-tenant impersonation (acting as a user within a tenant) | Not in scope; raises security complexity |

## Traceability

| Requirement | Phase | Phase Name | Status |
|-------------|-------|------------|--------|
| AUTH-01 | Phase 1 | Auth & Role Foundation | Pending |
| AUTH-02 | Phase 1 | Auth & Role Foundation | Pending |
| AUTH-03 | Phase 1 | Auth & Role Foundation | Pending |
| AUTH-04 | Phase 1 | Auth & Role Foundation | Pending |
| PADM-01 | Phase 2 | Platform Admin Shell | Pending |
| PADM-02 | Phase 2 | Platform Admin Shell | Pending |
| PADM-03 | Phase 2 | Platform Admin Shell | Pending |
| PADM-04 | Phase 2 | Platform Admin Shell | Pending |
| SWIT-01 | Phase 3 | Tenant Switcher States | Pending |
| SWIT-02 | Phase 3 | Tenant Switcher States | Pending |
| SWIT-03 | Phase 3 | Tenant Switcher States | Pending |
| SWIT-04 | Phase 3 | Tenant Switcher States | Pending |
| BSET-01 | Phase 4 | Board Tenant Settings | Pending |
| BSET-02 | Phase 4 | Board Tenant Settings | Pending |
| BSET-03 | Phase 4 | Board Tenant Settings | Pending |
| BSET-04 | Phase 4 | Board Tenant Settings | Pending |
| STRB-01 | Phase 5 | Storybook Coverage | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-13*
*Last updated: 2026-06-13 after roadmap creation — phase names confirmed*
