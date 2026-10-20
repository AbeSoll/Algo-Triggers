import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("algo-triggers-market-source", "demo"),
  );
  await page.route("**/api/**", (route) =>
    route.fulfill({ json: { success: false } }),
  );
});

test.beforeEach(async ({ page }) => {
  await page.goto("/?view=options");
  await expect(
    page.getByRole("heading", { name: "Explore options" }),
  ).toBeVisible();
});

test("option rule draft preserves expiry, actual underlying and chosen ask field", async ({
  page,
}) => {
  await page.getByLabel("Rule price field").selectOption("ask");
  await page
    .getByRole("button", { name: "Create 84 call ask rule", exact: true })
    .click();

  const editor = page.getByRole("dialog");
  await expect(
    editor.getByRole("combobox", { name: "Futures contract", exact: true }),
  ).toHaveValue("brent-jan27");
  await expect(
    editor.getByRole("combobox", { name: "Futures contract", exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("combobox", { name: "Indicator / Measure", exact: true }),
  ).toHaveValue("option_premium");
  await expect(editor.locator(".notice")).toContainText("CALL 84");
  await expect(editor.locator(".notice")).toContainText("2026-11-25");
  await expect(editor.locator(".notice")).toContainText(
    "ask · underlying brent-jan27",
  );
  await expect(editor.locator(".notice")).toContainText(
    "replay and monitoring are unavailable",
  );

  const threshold = Number(
    await editor
      .getByLabel("Threshold (USD/bbl)", { exact: true })
      .inputValue(),
  );
  expect(threshold).toBeGreaterThan(0);
  await editor
    .getByLabel("Rule name", { exact: true })
    .fill("Option ask identity test");
  await editor.getByRole("button", { name: "Save rule", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Rules & alerts." }),
  ).toBeVisible();

  const saved = await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!);
    return store.rules.find(
      (rule: { name: string }) => rule.name === "Option ask identity test",
    );
  });
  expect(saved).toMatchObject({
    status: "draft",
    instrument: "brent-jan27",
    conditions: [
      {
        metric: "option_premium",
        optionType: "call",
        strike: 84,
        optionExpiry: "2026-11-25",
        optionUnderlying: "brent-jan27",
        priceField: "ask",
        threshold,
      },
    ],
  });
});

test("a missing quote disables its selected-field action without fallback", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "Create 90 put mark rule", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Rule price field").selectOption("last");
  await expect(
    page.getByRole("button", { name: "Create 90 put last rule", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Rule price field").selectOption("bid");
  await expect(
    page.getByRole("button", { name: "Create 90 put bid rule", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Rule price field").selectOption("ask");
  await expect(
    page.getByRole("button", { name: "Create 90 put ask rule", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Inspect 90 put quote", exact: true })
    .click();
  await expect(page.locator(".option-quote-detail")).toContainText("90.00 Put");
  await expect(page.locator(".option-quote-detail")).toContainText(
    "Unavailable",
  );
  await expect(
    page.getByText("No silent price fallback.", { exact: false }),
  ).toBeVisible();
});

test("collar includes signed futures exposure and reconciles changing quantities", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Build strategy", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Long-futures collar", exact: true })
    .click();
  await expect(page.locator(".underlying-leg")).toContainText(
    "Long underlying futures",
  );
  await expect(page.locator(".underlying-leg")).toContainText("BRN Jan 2027");
  const netDelta = page
    .locator(".strategy-net-greeks > div")
    .filter({ has: page.getByText("Net delta", { exact: true }) })
    .locator("dd");
  await expect(netDelta).toHaveText("+0.500");
  const futuresBreakdown = page
    .locator(".strategy-breakdown tbody tr")
    .filter({ hasText: "BRN Jan 2027 futures" });
  await expect(futuresBreakdown).toContainText("Excluded");
  await expect(futuresBreakdown).toContainText("+1.000");

  await page.getByLabel("Futures units", { exact: true }).fill("2");
  await expect(page.locator(".strategy-error")).toContainText(
    "equal positive futures exposure",
  );
  await expect(page.locator(".strategy-premium")).toContainText("—");
  await page.getByLabel("Quantity", { exact: true }).nth(0).fill("2");
  await page.getByLabel("Quantity", { exact: true }).nth(1).fill("2");
  await expect(page.locator(".strategy-error")).toHaveCount(0);
  await expect(netDelta).toHaveText("+1.000");
  await expect(page.locator(".strategy-valuation")).toContainText(
    "Net delta includes the long futures exposure",
  );
  await expect(page.locator(".strategy-valuation")).toContainText(
    "Cash premium is unavailable",
  );
});

test("invalid put vertical shows validation and suppresses aggregate valuation", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Build strategy", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Leg 2 type", exact: true })
    .selectOption("call");
  await expect(page.locator(".strategy-error")).toContainText(
    "two put legs at different strikes",
  );
  await expect(page.locator(".premium-direction")).toHaveText(
    "Valuation unavailable",
  );
  await expect(page.locator(".strategy-total")).toContainText("Unavailable");
  await page
    .getByRole("button", { name: "Reset template", exact: true })
    .click();
  await expect(page.locator(".strategy-error")).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Leg 2 type", exact: true }),
  ).toHaveValue("put");

  await page.getByLabel("Leg 2 position", { exact: true }).selectOption("long");
  await expect(page.locator(".strategy-error")).toContainText(
    "equal and opposite quantities",
  );
  await page
    .getByLabel("Leg 2 position", { exact: true })
    .selectOption("short");
  await expect(page.locator(".strategy-error")).toHaveCount(0);
});

test("surface controls, point table, accessibility and narrow scroll ownership", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "IV surface", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "IV surface", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const rotation = page.getByRole("slider", { name: "Surface rotation" });
  await rotation.focus();
  await page.keyboard.press("End");
  await expect(rotation).toHaveValue("70");
  const zoom = page.getByRole("slider", { name: "Surface zoom" });
  await zoom.focus();
  await page.keyboard.press("End");
  await expect(zoom).toHaveValue("125");
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(rotation).toHaveValue("34");
  await expect(zoom).toHaveValue("100");

  await page
    .getByRole("combobox", { name: "Observed point", exact: true })
    .selectOption("1-7");
  await expect(page.locator(".surface-inspector")).toContainText(
    "BRN Feb 2027",
  );
  await expect(page.locator(".surface-inspector")).toContainText(
    "65 calendar days",
  );
  await expect(page.locator(".surface-inspector")).toContainText("90 call");
  await page.screenshot({
    path: "docs/evidence/surface-desktop.png",
    fullPage: true,
  });
  await page.locator(".surface-data-details summary").click();
  await expect(page.locator(".surface-data-details tbody tr")).toHaveCount(16);
  await page
    .getByRole("combobox", { name: "Surface expiries", exact: true })
    .selectOption("2026-12-23");
  await expect(page.locator(".surface-data-details tbody tr")).toHaveCount(8);

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Options ladder", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(
    await page
      .locator(".options-chain-scroll")
      .evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Create 84 call mark rule", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
