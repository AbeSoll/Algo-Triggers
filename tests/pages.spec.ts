import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("hosted demo works under its repository path without any backend", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.includes("/api/"))
      apiRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("algo-triggers-market-source", "yahoo"),
  );
  await page.goto("./");
  await expect(
    page.getByLabel("Presentation demo", { exact: true }),
  ).toContainText("synthetic data");
  const source = page.getByRole("combobox", {
    name: "Market data",
    exact: true,
  });
  await expect(source).toHaveValue("demo");
  await expect(source).toBeDisabled();
  await expect(page.locator(".chart-canvas canvas").first()).toBeVisible();
  await page.screenshot({
    path: "docs/evidence/pages-demo-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page
    .getByLabel("Rule name", { exact: true })
    .fill("Hosted demo example");
  await page.getByRole("button", { name: "Save rule", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Send test email", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Check prices now", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Test rule: Brent breaks $82.50",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Run test", exact: true }).click();
  await expect(page.locator(".replay-answer")).toContainText(/\d+ alerts?/);
  await page
    .getByRole("button", { name: "Inspect event", exact: false })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Why this alert happened",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Start demo monitoring for Hosted demo example",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("No email is sent");
  await page
    .getByRole("button", { name: "Advance demo bar", exact: true })
    .click();
  await page.getByRole("link", { name: "Options lab", exact: true }).click();
  await expect(page.locator(".options-chain-scroll")).toBeVisible();
  await page.getByRole("button", { name: "IV surface", exact: true }).click();
  await expect(page.locator(".surface-plot")).toBeVisible();
  await page.reload();
  await expect(source).toHaveValue("demo");
  await page
    .getByRole("link", { name: "Rules & alerts", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Hosted demo example v1", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: "docs/evidence/pages-demo-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});
