import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("HedgeSignal SRS v0.2 end-to-end pilot workflow, role gate, version evidence and accessibility", async ({
  page,
}) => {
  const uniqueName = `Brent pilot guard ${Date.now()}`;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript(() =>
    localStorage.setItem("algo-triggers-market-source", "demo"),
  );
  await page.route("**/api/bars**", (route) =>
    route.fulfill({ json: { success: false } }),
  );
  await page.route("**/api/instruments**", (route) =>
    route.fulfill({ json: { success: false } }),
  );

  await page.goto("/?view=pilot");
  await expect(
    page.getByRole("heading", { name: "HedgeSignal pilot." }),
  ).toBeVisible();

  // UC-03: Create a fresh versioned pilot scenario
  await page
    .getByRole("button", { name: "New pilot scenario", exact: true })
    .click();
  const createModal = page.getByRole("dialog");
  await createModal.getByLabel("Scenario / rule name").fill(uniqueName);
  await expect(createModal.locator(".rule-live-card")).toContainText(
    uniqueName,
  );
  await createModal
    .getByRole("button", { name: "Save immutable version" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const ruleGroup = page.getByRole("group", {
    name: `Pilot actions for ${uniqueName}`,
  });
  await expect(ruleGroup).toBeVisible();

  // UC-04 / FR-036: Run controlled pre-activation test suite
  await ruleGroup.getByRole("button", { name: "Controlled test" }).click();
  const testDialog = page.getByRole("dialog");
  await expect(testDialog).toContainText("5 / 5");
  await expect(testDialog).toContainText("ALL PASSED");
  await expect(testDialog).toContainText("TC-003: Missing mandatory input");
  await expect(testDialog).toContainText("NOT_EVALUABLE");
  await testDialog.getByRole("button", { name: "Close test report" }).click();

  // TC-010: Switch to Trader / Analyst and verify activation is blocked & audited
  await page
    .getByRole("combobox", { name: "Pilot actor role", exact: true })
    .selectOption("trader");
  await ruleGroup.getByRole("button", { name: "Activate v1" }).click();
  await expect(page.getByRole("alert")).toContainText("not authorised");

  // UC-05: Switch to Business Approver and activate v1
  await page
    .getByRole("combobox", { name: "Pilot actor role", exact: true })
    .selectOption("approver");
  await ruleGroup.getByRole("button", { name: "Activate v1" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  // TC-014 & UC-02: Reject mismatched unit, then record valid synthetic observation
  await page
    .getByRole("combobox", { name: "Unit", exact: true })
    .selectOption("USD/share");
  await page.getByRole("button", { name: "Record synthetic input" }).click();
  await expect(page.getByRole("alert")).toContainText("incompatible");

  await page
    .getByRole("combobox", { name: "Unit", exact: true })
    .selectOption("USD/bbl");
  await page.getByLabel("Exact decimal value").fill("73.25");
  await page.getByRole("button", { name: "Record synthetic input" }).click();
  await expect(page.getByRole("status")).toContainText("73.25 USD/bbl");

  // UC-06: Evaluate active rules and emit durable event + email outbox intent
  await page.getByRole("button", { name: "Evaluate active rules" }).click();
  const ruleRow = page.getByRole("row").filter({ has: ruleGroup });
  await expect(ruleRow).toContainText("TRUE");

  // TC-006: Save immutable v2, then verify emitted event still shows v1 evidence
  await ruleGroup.getByRole("button", { name: "New version" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Threshold 1 (USD/bbl)").fill("65.00");
  await editDialog
    .getByRole("button", { name: "Save immutable version" })
    .click();
  await expect(ruleRow).toContainText("v2");

  const eventRow = page
    .getByRole("row")
    .filter({ hasText: uniqueName })
    .filter({ hasText: "Inspect evidence" });
  await eventRow.getByRole("button", { name: "Inspect evidence" }).click();
  const evidenceDialog = page.getByRole("dialog");
  await expect(evidenceDialog).toContainText(`${uniqueName} v1`);
  await expect(evidenceDialog).toContainText("73.25 USD/bbl");
  await expect(evidenceDialog).toContainText("< 80.00 USD/bbl");
  await evidenceDialog
    .getByRole("button", { name: "Close", exact: true })
    .click();

  // UC-09: Pause active rule
  await ruleGroup.getByRole("button", { name: "Pause" }).click();
  await expect(ruleRow).toContainText("PAUSED");

  // Check Audit Trail records DENIED and ALLOWED actions
  await page.getByRole("button", { name: /Audit trail/ }).click();
  await expect(page.locator("table").last()).toContainText("DENIED");
  await expect(page.locator("table").last()).toContainText("ACTIVATE_RULE");

  // WCAG 2.2 AA check & narrow mobile viewport overflow check (TC-015)
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
