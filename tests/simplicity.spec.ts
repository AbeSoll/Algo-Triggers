import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("algo-triggers-market-source", "demo"),
  );
  await page.route("**/api/**", (route) =>
    route.fulfill({ json: { success: false } }),
  );
});

test("a rule can be saved from a template without a description or advanced settings", async ({
  page,
}) => {
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(
    editor.getByLabel("Market condition in plain English"),
  ).toBeHidden();
  await expect(editor.getByLabel("Cooldown (minutes)")).toBeHidden();
  await editor
    .getByRole("button", { name: "Percentage move", exact: true })
    .click();
  await editor.getByLabel("Rule name", { exact: true }).fill("Simple momentum");
  await editor.getByLabel("Threshold (%)", { exact: true }).fill("2");
  await editor.getByLabel("Lookback bars count").fill("8");
  await expect(editor.locator(".rule-live-card")).toContainText(
    "8-bar close change above 2%",
  );
  await expect(editor.locator(".rule-live-card")).toContainText("5m bars");
  await expect(editor.locator(".rule-live-card")).toContainText(
    "30 min cooldown",
  );
  await page.screenshot({
    path: "docs/evidence/simple-rule-desktop.png",
    fullPage: true,
  });
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await editor.getByRole("button", { name: "Save rule", exact: true }).click();
  const row = page.getByRole("row").filter({
    has: page.getByRole("button", {
      name: "Simple momentum v1",
      exact: true,
    }),
  });
  await expect(
    row.getByRole("button", {
      name: "Test rule: Simple momentum",
      exact: true,
    }),
  ).toBeVisible();
  await row
    .getByRole("button", { name: "Test rule: Simple momentum", exact: true })
    .click();
  await page.getByRole("button", { name: "Run test", exact: true }).click();
  await expect(page.locator(".replay-answer")).toContainText(/\d+ alerts?/);
  await expect(page.getByText("Eligible bars", { exact: true })).toBeHidden();
});

test("templates and optional descriptions preserve extra conditions and advanced errors remain reachable", async ({
  page,
}) => {
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByText("Advanced settings", { exact: true }).click();
  await editor
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await editor.getByLabel("Join conditions").selectOption("OR");
  await editor
    .getByLabel("Threshold (USD/bbl)", { exact: true })
    .nth(1)
    .fill("123");
  await editor
    .getByRole("button", { name: "Percentage move", exact: true })
    .click();
  await expect(editor.locator(".condition-block")).toHaveCount(2);
  await expect(
    editor.getByLabel("Threshold (USD/bbl)", { exact: true }),
  ).toHaveValue("123");
  await editor.getByLabel("Alert frequency").selectOption("once");
  await editor.getByLabel("Cooldown (minutes)").fill("45");
  await editor
    .getByText("Describe your idea (optional)", { exact: true })
    .click();
  await editor
    .getByLabel("Market condition in plain English")
    .fill("SMA 9 crosses above SMA 21");
  await editor
    .getByRole("button", { name: "Build from description", exact: true })
    .click();
  await expect(editor.getByLabel("Fast period 1")).toHaveValue("9");
  await expect(
    editor.getByLabel("Threshold (USD/bbl)", { exact: true }),
  ).toHaveValue("123");
  await expect(editor.getByLabel("Join conditions")).toHaveValue("OR");
  await expect(editor.getByLabel("Alert frequency")).toHaveValue("once");
  await expect(editor.getByLabel("Cooldown (minutes)")).toHaveValue("45");
  await editor.getByLabel("Cooldown (minutes)").fill("-1");
  await editor.getByText("Advanced settings", { exact: true }).click();
  await editor.getByRole("button", { name: "Save rule", exact: true }).click();
  await expect(editor.getByLabel("Cooldown (minutes)")).toBeFocused();
  await expect(
    editor.getByText("Cooldown must be zero or more minutes.", { exact: true }),
  ).toBeVisible();
  await editor.getByLabel("Cooldown (minutes)").fill("45");
  await editor.getByRole("button", { name: "Save rule", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!).rules.at(-1),
  );
  expect(saved.join).toBe("OR");
  expect(saved.conditions).toHaveLength(2);
  expect(saved.conditions[1].threshold).toBe(123);
  expect(saved.cooldownMinutes).toBe(45);
});

test("Options Lab focuses one task and retains strategy edits when switching views", async ({
  page,
}) => {
  await page.goto("/?view=options");
  await expect(page.locator(".options-chain-scroll")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Strategy builder", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Gamma / $1", { exact: true })).toBeHidden();
  await page
    .getByRole("button", { name: "Build strategy", exact: true })
    .click();
  await expect(page.locator(".options-chain-scroll")).toHaveCount(0);
  await page.getByLabel("Quantity", { exact: true }).nth(0).fill("3");
  await page.getByRole("button", { name: "IV surface", exact: true }).click();
  await expect(page.locator(".surface-plot")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Strategy builder", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Build strategy", exact: true })
    .click();
  await expect(page.getByLabel("Quantity", { exact: true }).nth(0)).toHaveValue(
    "3",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "docs/evidence/simple-options-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Options ladder", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "docs/evidence/simple-options-desktop.png",
    fullPage: true,
  });
});
