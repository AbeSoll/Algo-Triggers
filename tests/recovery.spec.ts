import { test, expect } from "@playwright/test";

test("corrupt local data has an explicit reset recovery", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("injected")) {
      localStorage.setItem("algo-triggers-demo-v1", "{invalid");
      sessionStorage.setItem("injected", "yes");
    }
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("could not be read");
  await page
    .getByRole("button", { name: "Reset local demo data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
});

test("storage write failure preserves the unsaved draft", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Test quota", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page
    .getByLabel("Rule name", { exact: true })
    .fill("Preserve my research");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Rule name", { exact: true })).toHaveValue(
    "Preserve my research",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Could not save locally",
  );
});

test("a new one-shot monitor starts at activation, not historical fixture start", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page
    .getByLabel("Rule name", { exact: true })
    .fill("One-shot above zero");
  await page
    .getByRole("combobox", { name: "Condition", exact: true })
    .selectOption("above");
  await page.getByLabel("Threshold (USD/bbl)", { exact: true }).fill("0");
  await page.getByText("Evaluation & alert behavior").click();
  await page
    .getByRole("combobox", { name: "Frequency", exact: true })
    .selectOption("once");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Start demo monitoring for One-shot above zero",
    })
    .click();
  await page
    .getByRole("button", { name: "Advance demo bar", exact: true })
    .click();
  const first = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!).events.filter(
        (e: { ruleName: string; mode: string }) =>
          e.ruleName === "One-shot above zero" && e.mode === "demo",
      ).length,
  );
  expect(first).toBe(1);
  await page
    .getByRole("button", { name: "Advance demo bar", exact: true })
    .click();
  const second = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!).events.filter(
        (e: { ruleName: string; mode: string }) =>
          e.ruleName === "One-shot above zero" && e.mode === "demo",
      ).length,
  );
  expect(second).toBe(1);
  await page
    .getByRole("button", { name: "Pause One-shot above zero", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Start demo monitoring for One-shot above zero",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("already fired");
});

test("EMA values retain full warm-up when the visible range changes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Average method", { exact: true }).selectOption("EMA");
  const fiveDay = await page.getByTestId("ma-value-0").innerText();
  await page.getByRole("button", { name: "1D", exact: true }).click();
  await expect(page.getByTestId("ma-value-0")).toHaveText(fiveDay);
});

test("resume preserves cooldown measured from an actual emission", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page
    .getByLabel("Rule name", { exact: true })
    .fill("Cooldown stays intact");
  await page
    .getByRole("combobox", { name: "Condition", exact: true })
    .selectOption("above");
  await page.getByLabel("Threshold (USD/bbl)", { exact: true }).fill("0");
  await page.getByText("Evaluation & alert behavior").click();
  await page
    .getByRole("combobox", { name: "Frequency", exact: true })
    .selectOption("bar");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Start demo monitoring for Cooldown stays intact",
    })
    .click();
  await page
    .getByRole("button", { name: "Advance demo bar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause Cooldown stays intact", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Start demo monitoring for Cooldown stays intact",
    })
    .click();
  await page
    .getByRole("button", { name: "Advance demo bar", exact: true })
    .click();
  const count = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("algo-triggers-demo-v1")!,
        ).events.filter(
          (e: { ruleName: string; mode: string }) =>
            e.ruleName === "Cooldown stays intact" && e.mode === "demo",
        ).length,
    );
  expect(await count()).toBe(1);
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Advance demo bar", exact: true })
      .click();
  expect(await count()).toBe(2);
});

test("malformed stored event evidence recovers without crashing", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Advance demo bar", exact: true })
    .click();
  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem("algo-triggers-demo-v1")!);
    value.events = [{}];
    localStorage.setItem("algo-triggers-demo-v1", JSON.stringify(value));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Market explorer." }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("incompatible format");
});

test("stored report opens its original snapshot after chart timeframe changes", async ({
  page,
}) => {
  await page.goto("/?view=rules");
  await page
    .getByRole("button", { name: "Run replay for Brent breaks $82.50" })
    .click();
  await page.getByLabel("Start date · UTC").fill("2026-10-14");
  await page.getByRole("button", { name: "Run replay", exact: true }).click();
  await expect(
    page.getByText("Trigger periods", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("link", { name: "Market explorer" }).click();
  await page.getByRole("button", { name: "1h", exact: true }).click();
  await page.getByRole("link", { name: "Rules & alerts" }).click();
  await page.getByRole("button", { name: "View saved report" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "2026-10-14 – 2026-10-16 · 5m",
  );
});
