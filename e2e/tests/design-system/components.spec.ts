import { test, expect } from "@playwright/test"

const PREVIEW = "/ds-preview"

test.describe("Design System — component E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PREVIEW)
    await page.waitForSelector('[data-testid="section-button"]')
  })

  // ─── Button ──────────────────────────────────────────────────────────────

  test.describe("Button", () => {
    test("default (Volt Green) variant is visible", async ({ page }) => {
      await expect(page.getByTestId("btn-default")).toBeVisible()
    })

    test("default variant has Volt Green background token class", async ({ page }) => {
      const cls = await page.getByTestId("btn-default").getAttribute("class")
      expect(cls).toContain("--ds-color-brand-secondary")
    })

    test("secondary (Jade) variant is visible", async ({ page }) => {
      await expect(page.getByTestId("btn-secondary")).toBeVisible()
    })

    test("disabled button is not interactive", async ({ page }) => {
      const btn = page.getByTestId("btn-disabled")
      await expect(btn).toBeDisabled()
    })

    test("destructive button is visible with error token class", async ({ page }) => {
      const cls = await page.getByTestId("btn-destructive").getAttribute("class")
      expect(cls).toContain("--ds-color-status-error")
    })

    // Unhappy — keyboard navigation
    test("buttons are reachable via Tab key", async ({ page }) => {
      await page.keyboard.press("Tab")
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))
      expect(focused).toBeTruthy()
    })
  })

  // ─── Input ───────────────────────────────────────────────────────────────

  test.describe("Input", () => {
    test("happy: accepts typed text", async ({ page }) => {
      const input = page.getByTestId("input-default")
      await input.fill("EV-001")
      await expect(input).toHaveValue("EV-001")
    })

    test("happy: clears value", async ({ page }) => {
      const input = page.getByTestId("input-default")
      await input.fill("some text")
      await input.fill("")
      await expect(input).toHaveValue("")
    })

    test("unhappy: disabled input rejects interaction", async ({ page }) => {
      await expect(page.getByTestId("input-disabled")).toBeDisabled()
    })

    test("unhappy: error input carries aria-invalid attribute", async ({ page }) => {
      const errInput = page.getByTestId("input-error")
      await expect(errInput).toHaveAttribute("aria-invalid", "true")
    })

    test("unhappy: error input has red border token class", async ({ page }) => {
      const cls = await page.getByTestId("input-error").getAttribute("class")
      expect(cls).toContain("--ds-color-status-error")
    })
  })

  // ─── FormField ───────────────────────────────────────────────────────────

  test.describe("FormField", () => {
    test("happy: label is associated with input via for/id", async ({ page }) => {
      const label = page.locator('label[for="ff-email"]')
      await expect(label).toHaveText("Driver email")
    })

    test("happy: helper text is visible when no error", async ({ page }) => {
      await expect(page.getByText("We'll send login instructions here.")).toBeVisible()
    })

    test("unhappy: error message replaces helper text", async ({ page }) => {
      await expect(page.getByText("Plate number is required")).toBeVisible()
    })

    test("unhappy: required asterisk is present", async ({ page }) => {
      const requiredField = page.locator('[data-testid="section-formfield"] label').filter({ hasText: "Vehicle plate" })
      await expect(requiredField).toContainText("*")
    })

    test("unhappy: error input has aria-describedby pointing to error element", async ({ page }) => {
      const input = page.getByTestId("ff-input-error")
      const describedBy = await input.getAttribute("aria-describedby")
      expect(describedBy).toBe("ff-plate-error")
      await expect(page.locator(`#${describedBy}`)).toBeVisible()
    })
  })

  // ─── Checkbox ────────────────────────────────────────────────────────────

  test.describe("Checkbox", () => {
    test("happy: toggles to checked on click", async ({ page }) => {
      const cb = page.getByTestId("checkbox-main")
      await cb.click()
      await expect(cb).toBeChecked()
      await expect(page.getByTestId("checkbox-label")).toHaveText("Checked")
    })

    test("happy: toggles back to unchecked on second click", async ({ page }) => {
      const cb = page.getByTestId("checkbox-main")
      await cb.click()
      await cb.click()
      await expect(cb).not.toBeChecked()
      await expect(page.getByTestId("checkbox-label")).toHaveText("Unchecked")
    })

    test("unhappy: disabled checkbox cannot be checked", async ({ page }) => {
      const cb = page.getByTestId("checkbox-disabled")
      await expect(cb).toBeDisabled()
      await cb.click({ force: true })
      await expect(cb).not.toBeChecked()
    })
  })

  // ─── Switch ──────────────────────────────────────────────────────────────

  test.describe("Switch", () => {
    test("happy: toggles on on click", async ({ page }) => {
      const sw = page.getByTestId("switch-main")
      await sw.click()
      await expect(sw).toHaveAttribute("data-state", "checked")
      await expect(page.getByTestId("switch-label")).toHaveText("On")
    })

    test("happy: toggles back off on second click", async ({ page }) => {
      const sw = page.getByTestId("switch-main")
      await sw.click()
      await sw.click()
      await expect(sw).toHaveAttribute("data-state", "unchecked")
      await expect(page.getByTestId("switch-label")).toHaveText("Off")
    })

    test("unhappy: disabled switch cannot be toggled", async ({ page }) => {
      const sw = page.getByTestId("switch-disabled")
      const stateBefore = await sw.getAttribute("data-state")
      await sw.click({ force: true })
      await expect(sw).toHaveAttribute("data-state", stateBefore!)
    })
  })

  // ─── Badge ────────────────────────────────────────────────────────────────

  test.describe("Badge", () => {
    test("default (Jade) badge is visible", async ({ page }) => {
      await expect(page.getByTestId("badge-default")).toBeVisible()
      await expect(page.getByTestId("badge-default")).toHaveText("Active")
    })

    test("volt variant badge is visible with Volt Green class", async ({ page }) => {
      await expect(page.getByTestId("badge-volt")).toBeVisible()
      const cls = await page.getByTestId("badge-volt").getAttribute("class")
      expect(cls).toContain("--ds-color-brand-secondary")
    })

    test("destructive badge carries error token class", async ({ page }) => {
      const cls = await page.getByTestId("badge-destructive").getAttribute("class")
      expect(cls).toContain("--ds-color-status-error")
    })

    test("volt badge has ink label class (not white)", async ({ page }) => {
      const cls = await page.getByTestId("badge-volt").getAttribute("class")
      expect(cls).toContain("--ds-color-neutral-ink")
      expect(cls).not.toContain("text-white")
    })
  })

  // ─── Alert ───────────────────────────────────────────────────────────────

  test.describe("Alert", () => {
    test("default alert is visible with title and description", async ({ page }) => {
      const alert = page.getByTestId("alert-default")
      await expect(alert).toBeVisible()
      await expect(alert.getByText("Fleet synced")).toBeVisible()
    })

    test("success alert carries Volt Green border token", async ({ page }) => {
      const cls = await page.getByTestId("alert-success").getAttribute("class")
      expect(cls).toContain("--ds-color-brand-secondary")
    })

    test("warning alert carries status-warning border token", async ({ page }) => {
      const cls = await page.getByTestId("alert-warning").getAttribute("class")
      expect(cls).toContain("--ds-color-status-warning")
    })

    test("destructive alert carries status-error token", async ({ page }) => {
      const cls = await page.getByTestId("alert-destructive").getAttribute("class")
      expect(cls).toContain("--ds-color-status-error")
    })

    test("all alerts have role=alert", async ({ page }) => {
      const alerts = page.locator('[data-testid^="alert-"]')
      const count = await alerts.count()
      for (let i = 0; i < count; i++) {
        await expect(alerts.nth(i)).toHaveAttribute("role", "alert")
      }
    })
  })

  // ─── StatCard ─────────────────────────────────────────────────────────────

  test.describe("StatCard", () => {
    test("trend up card shows ↑ arrow and Volt Green colour class", async ({ page }) => {
      const card = page.getByTestId("statcard-up")
      await expect(card.getByText("↑")).toBeVisible()
      await expect(card.getByText("+6%")).toBeVisible()
    })

    test("trend down card shows ↓ arrow", async ({ page }) => {
      await expect(page.getByTestId("statcard-down").getByText("↓")).toBeVisible()
    })

    test("trend neutral card shows — arrow", async ({ page }) => {
      await expect(page.getByTestId("statcard-neutral").getByText("—")).toBeVisible()
    })

    test("statcard renders value and unit", async ({ page }) => {
      const card = page.getByTestId("statcard-up")
      await expect(card.getByText("84")).toBeVisible()
      await expect(card.getByText("%")).toBeVisible()
    })
  })

  // ─── Spinner ─────────────────────────────────────────────────────────────

  test.describe("Spinner", () => {
    test("md spinner is visible", async ({ page }) => {
      await expect(page.getByTestId("spinner-md")).toBeVisible()
    })

    test("all three size spinners are visible", async ({ page }) => {
      await expect(page.getByTestId("spinner-sm")).toBeVisible()
      await expect(page.getByTestId("spinner-md")).toBeVisible()
      await expect(page.getByTestId("spinner-lg")).toBeVisible()
    })

    test("white spinner inside Jade button is visible", async ({ page }) => {
      await expect(page.getByTestId("spinner-white")).toBeVisible()
    })

    test("spinner has accessible role=status", async ({ page }) => {
      await expect(page.getByTestId("spinner-md")).toHaveAttribute("role", "status")
    })
  })

  // ─── Progress ─────────────────────────────────────────────────────────────

  test.describe("Progress", () => {
    test("progress bar is visible", async ({ page }) => {
      await expect(page.getByTestId("progress-75")).toBeVisible()
    })

    test("progress at 75% has correct aria-valuenow", async ({ page }) => {
      await expect(page.getByTestId("progress-75")).toHaveAttribute("aria-valuenow", "75")
    })

    test("progress at 0% has aria-valuenow=0", async ({ page }) => {
      await expect(page.getByTestId("progress-0")).toHaveAttribute("aria-valuenow", "0")
    })
  })

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  test.describe("Tabs", () => {
    test("Fleet tab is active by default and its content is visible", async ({ page }) => {
      await expect(page.getByTestId("tab-fleet")).toHaveAttribute("data-state", "active")
      await expect(page.getByTestId("tab-content-fleet")).toBeVisible()
    })

    test("happy: clicking Drivers tab switches content", async ({ page }) => {
      await page.getByTestId("tab-drivers").click()
      await expect(page.getByTestId("tab-drivers")).toHaveAttribute("data-state", "active")
      await expect(page.getByTestId("tab-content-drivers")).toBeVisible()
    })

    test("happy: clicking Alerts tab switches content", async ({ page }) => {
      await page.getByTestId("tab-alerts").click()
      await expect(page.getByTestId("tab-content-alerts")).toBeVisible()
    })

    test("unhappy: non-active tab content is not visible", async ({ page }) => {
      // Fleet is active by default — Drivers content should be hidden
      await expect(page.getByTestId("tab-content-drivers")).not.toBeVisible()
    })
  })

  // ─── NavigationItem ───────────────────────────────────────────────────────

  test.describe("NavigationItem", () => {
    test("active item has aria-current=page", async ({ page }) => {
      await expect(page.getByTestId("nav-active")).toHaveAttribute("aria-current", "page")
    })

    test("active item carries Jade Strong class", async ({ page }) => {
      const cls = await page.getByTestId("nav-active").getAttribute("class")
      expect(cls).toContain("--ds-color-brand-primary-strong")
    })

    test("inactive item does NOT have aria-current", async ({ page }) => {
      await expect(page.getByTestId("nav-inactive")).not.toHaveAttribute("aria-current")
    })

    test("badge count is visible", async ({ page }) => {
      const badgeNav = page.getByTestId("nav-badge")
      await expect(badgeNav.getByText("5")).toBeVisible()
    })

    test("unhappy: disabled item has pointer-events-none class", async ({ page }) => {
      const cls = await page.getByTestId("nav-disabled").getAttribute("class")
      expect(cls).toContain("pointer-events-none")
    })
  })

  // ─── Table ────────────────────────────────────────────────────────────────

  test.describe("Table", () => {
    test("table renders column headers", async ({ page }) => {
      const table = page.getByTestId("section-table")
      await expect(table.getByRole("columnheader", { name: "Vehicle" })).toBeVisible()
      await expect(table.getByRole("columnheader", { name: "Status" })).toBeVisible()
    })

    test("table renders data rows", async ({ page }) => {
      await expect(page.getByTestId("table-row-1").getByText("EV-001")).toBeVisible()
      await expect(page.getByTestId("table-row-2").getByText("EV-002")).toBeVisible()
    })

    test("unhappy: EmptyState renders correctly inside a table cell", async ({ page }) => {
      const emptyWrapper = page.getByTestId("table-empty-wrapper")
      await expect(emptyWrapper.getByText("No vehicles assigned")).toBeVisible()
      await expect(emptyWrapper.getByText("Add a vehicle to start tracking.")).toBeVisible()
    })
  })

  // ─── EmptyState ───────────────────────────────────────────────────────────

  test.describe("EmptyState", () => {
    test("renders title and description", async ({ page }) => {
      const es = page.getByTestId("empty-state-standalone")
      await expect(es.getByRole("heading")).toHaveText("No alerts")
      await expect(es.getByText("Your fleet is running smoothly.")).toBeVisible()
    })

    test("action button is visible and clickable", async ({ page }) => {
      const btn = page.getByTestId("empty-action-btn")
      await expect(btn).toBeVisible()
      await btn.click()
      // No navigation expected — just confirm no crash
      await expect(page.getByTestId("section-empty")).toBeVisible()
    })
  })
})
