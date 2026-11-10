import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import {
  options,
  bars,
  firstExpiry,
  secondExpiry,
  thirdExpiry,
} from "./market-fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: "Provider unavailable." },
    }),
  );
});

test("provider failure is unavailable until sample data is selected explicitly", async ({
  page,
}) => {
  await page.goto("/?view=market");
  await expect(
    page.getByRole("combobox", { name: "Market data", exact: true }),
  ).toHaveValue("yahoo");
  await expect(
    page.getByRole("heading", { name: "Market data unavailable", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Chart provenance")).toContainText(
    "Yahoo data unavailable",
  );
  await expect(page.locator(".quote-value")).toHaveText("—USD/bbl");
  await expect(
    page.getByRole("button", { name: "Export chart data", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".chart-canvas")).toHaveCount(0);
  await page.screenshot({
    path: "docs/evidence/data-unavailable-desktop.png",
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
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("combobox", { name: "Market data", exact: true })
    .selectOption("demo");
  await expect(page.locator(".chart-canvas")).toBeVisible();
  await expect(page.getByLabel("Chart provenance")).toContainText(
    "Sample sample · synthetic",
  );
});

test("observed bars show source time separately from fetch time and hide sample event overlays", async ({
  page,
}) => {
  await page.route("**/api/bars?**", (route) =>
    route.fulfill({ json: bars() }),
  );
  await page.goto("/?view=market");
  await expect(page.locator(".chart-canvas")).toBeVisible();
  const provenance = page.getByLabel("Chart provenance");
  await expect(provenance).toContainText("Yahoo Finance snapshot");
  await expect(provenance).toContainText("19 Oct");
  await expect(provenance).toContainText("Fetched 20 Oct");
  await expect(provenance).toContainText("Delay unverified");
  await expect(page.locator(".chart-note")).toContainText("Delay unverified");
  await page.getByRole("button", { name: "1D", exact: true }).click();
  await expect(page.locator(".chart-canvas")).toBeVisible();
  await page.getByRole("button", { name: "View data", exact: true }).click();
  await expect(page.locator(".chart-data tbody tr")).toHaveCount(20);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export chart data", exact: true })
    .click();
  const download = await downloadPromise;
  const csv = await readFile((await download.path())!, "utf-8");
  expect(csv.split("\n")).toHaveLength(81);
  expect(csv).toContain("source,symbol,observed_at_utc,fetched_at_utc");
  expect(csv).toContain("yahoo,BZZ26.NYM");
  expect(csv).toContain("81.123456");
  await page.getByRole("link", { name: "Rules & alerts" }).click();
  await expect(
    page
      .getByText("Rule tests and monitoring use synthetic samples", {
        exact: false,
      })
      .first(),
  ).toBeVisible();
});

test("refreshing a snapshot preserves same-source strategy edits", async ({
  page,
}) => {
  let requests = 0;
  let refreshed = false;
  await page.route("**/api/options?**", (route) => {
    requests++;
    return route.fulfill({
      json: options(firstExpiry, refreshed ? 2.1 : 1.1),
    });
  });
  await page.goto("/?view=options");
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("1.20");
  await page
    .getByRole("button", { name: "Build strategy", exact: true })
    .click();
  await page.getByLabel("Quantity", { exact: true }).nth(0).fill("2");
  await page.getByLabel("Quantity", { exact: true }).nth(1).fill("2");
  const initialRequests = requests;
  refreshed = true;
  await page
    .getByRole("button", { name: "Refresh options snapshot", exact: true })
    .click();
  await expect(page.getByLabel("Quantity", { exact: true }).nth(0)).toHaveValue(
    "2",
  );
  await expect(page.getByLabel("Quantity", { exact: true }).nth(1)).toHaveValue(
    "2",
  );
  await page
    .getByRole("button", { name: "Options ladder", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("2.20");
  expect(requests).toBeGreaterThan(initialRequests);
});

test("expiry changes request the selected chain and drafts retain actual fund identity and units", async ({
  page,
}) => {
  const requested: string[] = [];
  await page.route("**/api/options?**", (route) => {
    const expiry =
      new URL(route.request().url()).searchParams.get("date") ?? firstExpiry;
    requested.push(expiry);
    return route.fulfill({
      json: options(expiry, expiry === secondExpiry ? 9.1 : 1.1),
    });
  });
  await page.goto("/?view=options");
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("1.20");
  await page
    .getByRole("combobox", { name: "Option expiry", exact: true })
    .selectOption(secondExpiry);
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("9.20");
  expect(requested).toContain(secondExpiry);
  await expect(page.getByLabel("Options provenance")).toContainText(
    "Yahoo Finance snapshot",
  );
  await page
    .getByRole("button", { name: "Create 67 call mark rule", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await expect(
    editor.getByRole("combobox", { name: "Option underlying", exact: true }),
  ).toHaveValue("BNO");
  await expect(
    editor.getByLabel("Threshold (USD/share)", { exact: true }),
  ).toHaveValue("9.2");
  await expect(editor.locator(".notice")).toContainText(secondExpiry);
  await editor
    .getByLabel("Rule name", { exact: true })
    .fill("Observed fund rule");
  await editor.getByRole("button", { name: "Save rule", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Observed fund rule v1", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!).rules.at(-1),
  );
  expect(saved.conditions[0]).toMatchObject({
    optionUnderlying: "BNO",
    optionExpiry: secondExpiry,
    unit: "USD/share",
    threshold: 9.2,
  });
});

test("missing live prices and Greeks stay unavailable; a term surface is not fabricated", async ({
  page,
}) => {
  const payload = options();
  payload.quotes[2] = {
    ...payload.quotes[2],
    bid: null,
    ask: null,
    mark: null,
    iv: null,
  } as (typeof payload.quotes)[number];
  await page.route("**/api/options?**", (route) =>
    route.fulfill({ json: payload }),
  );
  await page.goto("/?view=options");
  await expect(
    page.getByRole("button", { name: "Create 67 call mark rule", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Rule price field", exact: true })
    .selectOption("last");
  await expect(
    page.getByRole("button", { name: "Create 67 call last rule", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Show Greeks (Δ, IV)", exact: true })
    .click();
  await expect(page.getByText("Gamma / $1", { exact: true })).toBeVisible();
  await expect(page.locator(".option-quote-detail")).not.toContainText("NaN");
  await page.getByRole("button", { name: "IV surface", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Selected expiry IV · 20 Nov 2026",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".surface-plot")).toHaveCount(0);
  await page.screenshot({
    path: "docs/evidence/observed-options-iv.png",
    fullPage: true,
  });
});

test("late expiry responses cannot replace the current selection", async ({
  page,
}) => {
  let release: (() => Promise<void>) | undefined;
  let arrived: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/api/options?**", async (route) => {
    const expiry =
      new URL(route.request().url()).searchParams.get("date") ?? firstExpiry;
    if (expiry === secondExpiry) {
      release = async () => {
        await route
          .fulfill({ json: options(secondExpiry, 9.1) })
          .catch(() => {});
      };
      arrived();
      return;
    }
    await route.fulfill({
      json: options(expiry, expiry === thirdExpiry ? 4.1 : 1.1),
    });
  });
  await page.goto("/?view=options");
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("1.20");
  await page
    .getByRole("combobox", { name: "Option expiry", exact: true })
    .selectOption(secondExpiry);
  await pending;
  await expect(
    page.getByRole("button", { name: "Create 67 call mark rule", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Option expiry", exact: true })
    .selectOption(thirdExpiry);
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("4.20");
  await release?.();
  await expect(
    page.getByRole("combobox", { name: "Option expiry", exact: true }),
  ).toHaveValue(thirdExpiry);
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("4.20");
});

test("failed expiry loads clear prior prices and retry the selected expiry", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/options?**", (route) => {
    const expiry =
      new URL(route.request().url()).searchParams.get("date") ?? firstExpiry;
    return expiry === secondExpiry && fail
      ? route.fulfill({
          status: 503,
          json: { success: false, error: "Expiry unavailable." },
        })
      : route.fulfill({ json: options(expiry, 5.1) });
  });
  await page.goto("/?view=options");
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("5.20");
  await page
    .getByRole("combobox", { name: "Option expiry", exact: true })
    .selectOption(secondExpiry);
  await expect(
    page.getByRole("heading", {
      name: "Options data unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".options-reference")).not.toContainText("67.12");
  await expect(page.locator(".options-reference")).not.toContainText("NaN");
  fail = false;
  await page
    .getByRole("button", { name: "Retry options data", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect 67 call quote", exact: true }),
  ).toHaveText("5.20");
  await expect(
    page.getByRole("combobox", { name: "Option expiry", exact: true }),
  ).toHaveValue(secondExpiry);
});
