import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("market workspace, curve, chart context and event evidence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Market explorer." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Futures curve", exact: true })
    .click();
  await expect(
    page.getByText("Backwardation", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Price chart", exact: true }).click();
  await page.getByRole("button", { name: "15m", exact: true }).click();
  await page.getByLabel("Fast average period").fill("9");
  await page.getByLabel("Slow average period").fill("21");
  await page.getByRole("button", { name: "Create average rule" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Fast period 1")).toHaveValue("9");
  await page.getByText("Evaluation & alert behavior").click();
  await expect(page.getByLabel("Saved calculation timeframe")).toHaveValue(
    "15m",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.locator(".event-item").first().click();
  await expect(page.getByRole("dialog")).toContainText("Condition diagnostics");
  await expect(errors).toEqual([]);
});
test("create, invalid fields, replay, edit immutable version and persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page.getByLabel("Rule name", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByText("Name this rule so it is recognizable"),
  ).toBeVisible();
  await page
    .getByLabel("Rule name", { exact: true })
    .fill("Browser test breakout");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Rules & alerts." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run replay for Browser test breakout" })
    .click();
  await page.getByRole("button", { name: "Run replay", exact: true }).click();
  await expect(
    page.getByText("Trigger periods", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Edit Browser test breakout", exact: true })
    .click();
  await page
    .getByLabel("Rule name", { exact: true })
    .fill("Browser test revised");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByRole("button", { name: "Browser test revised v2" }).click();
  await expect(page.getByRole("dialog")).toContainText("Version 1");
  await expect(page.getByRole("dialog")).toContainText("Version 2");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Browser test revised v2" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!),
  );
  expect(
    saved.rules.filter((r: { name: string }) =>
      r.name.startsWith("Browser test"),
    ),
  ).toHaveLength(2);
});
test("ambiguous description, search empty state, cancel and data health", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page
    .getByLabel("Market condition in plain English")
    .fill("Brent rises 2%");
  await page.getByRole("button", { name: "Build from description" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await page.getByRole("link", { name: "Rules & alerts" }).click();
  await page.getByLabel("Search saved rules").fill("no-such-rule");
  await expect(page.getByText("No matching rules")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page
    .getByRole("button", { name: "Run replay for Brent breaks $82.50" })
    .click();
  await page.getByRole("button", { name: "Run replay", exact: true }).click();
  await page.getByRole("button", { name: "Cancel replay" }).click();
  await expect(
    page.getByText("Replay canceled. No report was saved."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Workspace settings" }).click();
  await page.getByLabel("Demo data health").selectOption("stale");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("link", { name: "Market explorer" }).click();
  await expect(page.getByText("Quotes are stale")).toBeVisible();
  await page.getByRole("button", { name: "Restore demo data" }).click();
});
test("option chain, strategy and volatility data remain interactive", async ({
  page,
}) => {
  await page.goto("/?view=options");
  await expect(
    page.getByRole("heading", { name: "Options lab." }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Options ladder & volatility" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/evidence/options-desktop.png",
    fullPage: true,
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        reason: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});
test("desktop and narrow keyboard-accessible workspace", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({
    path: "docs/evidence/market-desktop.png",
    fullPage: true,
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        reason: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: "docs/evidence/market-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
