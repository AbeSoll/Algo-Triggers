import { test, expect } from "@playwright/test";

const ruleName = "Brent breaks $82.50";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("algo-triggers-market-source", "demo"),
  );
  await page.route("**/api/**", (route) =>
    route.fulfill({ json: { success: false } }),
  );
  await page.goto("/?view=rules");
});

test("rule actions stay discoverable and keyboard editing restores focus", async ({
  page,
}) => {
  const actions = page.getByRole("group", { name: `Actions for ${ruleName}` });
  const edit = actions.getByRole("button", {
    name: `Edit ${ruleName}`,
    exact: true,
  });
  const duplicate = actions.getByRole("button", {
    name: `Duplicate ${ruleName}`,
    exact: true,
  });
  await expect(edit).toBeVisible();
  await expect(duplicate).toBeVisible();
  await expect(actions.locator("details")).toHaveCount(0);
  const before = await actions.boundingBox();

  await actions
    .getByRole("button", { name: `Pause ${ruleName}`, exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(edit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(
    "Edit rule · new version",
  );
  await expect(page.getByLabel("Rule name", { exact: true })).toHaveValue(
    ruleName,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();
  const after = await actions.boundingBox();
  expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThan(8);
  expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(8);
  await page.keyboard.press("Tab");
  await expect(duplicate).toBeFocused();
  await page.screenshot({
    path: "docs/evidence/rule-actions-desktop.png",
    fullPage: true,
  });
});

test("duplicating a rule creates a separate draft and preserves the original", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: `Duplicate ${ruleName}`, exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByLabel("Rule name", { exact: true })).toHaveValue(
    `${ruleName} copy`,
  );
  await expect(
    editor.getByLabel("Threshold (USD/bbl)", { exact: true }),
  ).toHaveValue("82.5");
  await editor.getByRole("button", { name: "Save rule", exact: true }).click();

  const rules = await page.evaluate(
    () => JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!).rules,
  );
  const original = rules.find(
    (rule: { name: string }) => rule.name === ruleName,
  );
  const copy = rules.find(
    (rule: { name: string }) => rule.name === `${ruleName} copy`,
  );
  expect(rules).toHaveLength(4);
  expect(copy.id).not.toBe(original.id);
  expect(copy.version).toBe(1);
  expect(copy.status).toBe("draft");
  expect(original.version).toBe(1);
  expect(original.status).toBe("monitoring");
  expect(copy.conditions).toEqual(original.conditions);
  expect(copy.cooldownMinutes).toBe(original.cooldownMinutes);
  expect(copy.frequency).toBe(original.frequency);
  await page.reload();
  const copyRow = page.getByRole("row").filter({
    has: page.getByRole("button", { name: `${ruleName} copy v1`, exact: true }),
  });
  await expect(copyRow).toContainText("Draft");
  await expect(
    copyRow.getByRole("button", { name: `Edit ${ruleName} copy`, exact: true }),
  ).toBeVisible();
});

test("narrow rules table keeps actions reachable within its own scroll area", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const edit = page.getByRole("button", {
    name: `Edit ${ruleName}`,
    exact: true,
  });
  const row = page.getByRole("row").filter({ has: edit });
  const tableWrap = page.locator(".table-wrap").filter({ has: edit });
  await expect(row.locator(".rule-summary")).toHaveCSS("font-size", "11px");
  await expect(row.locator(".table-meta")).toHaveCSS("font-size", "10px");
  expect(
    await tableWrap.evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await edit.focus();
  await expect(edit).toBeInViewport({ ratio: 1 });
  expect(await tableWrap.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: `Duplicate ${ruleName}`, exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "docs/evidence/rule-actions-mobile.png",
    fullPage: true,
  });
});
