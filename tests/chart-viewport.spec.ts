import { expect, test, type Locator, type Page } from "@playwright/test";
import { bars } from "./market-fixtures";

type Snapshot = ReturnType<typeof bars>;
type Viewport = {
  from: number;
  to: number;
  first: number;
  last: number;
  count: number;
};

async function mockMarket(page: Page, snapshot: () => Snapshot) {
  await page.addInitScript(() =>
    localStorage.setItem("algo-triggers-market-source", "yahoo"),
  );
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 503, json: { success: false } }),
  );
  await page.route("**/api/bars?**", (route) =>
    route.fulfill({ json: snapshot() }),
  );
}

async function viewport(chart: Locator): Promise<Viewport> {
  await expect(chart).toHaveAttribute("data-visible-from", /-?\d/);
  return chart.evaluate((element) => ({
    from: Number(element.getAttribute("data-visible-from")),
    to: Number(element.getAttribute("data-visible-to")),
    first: Number(element.getAttribute("data-first-time")),
    last: Number(element.getAttribute("data-last-time")),
    count: Number(element.getAttribute("data-bars-count")),
  }));
}

async function expectRange(chart: Locator, expected: Viewport, shift = 0) {
  await expect
    .poll(async () => {
      const actual = await viewport(chart);
      return Math.max(
        Math.abs(actual.from - expected.from - shift),
        Math.abs(actual.to - expected.to - shift),
      );
    })
    .toBeLessThan(0.05);
}

async function zoomAndPan(page: Page, chart: Locator) {
  const fitted = await viewport(chart);
  await page
    .getByRole("button", { name: "Zoom in chart", exact: true })
    .click();
  try {
    await page.clock.runFor(50);
  } catch {}
  await page
    .getByRole("button", { name: "Zoom in chart", exact: true })
    .click();
  try {
    await page.clock.runFor(50);
  } catch {}
  await expect
    .poll(async () => {
      try {
        await page.clock.runFor(50);
      } catch {}
      const value = await viewport(chart);
      return value.to - value.from;
    })
    .toBeLessThan((fitted.to - fitted.from) * 0.6);
  const beforePan = await viewport(chart);
  const bounds = await chart.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width * 0.45;
  const y = bounds!.y + bounds!.height * 0.45;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 12 });
  await page.mouse.up();
  await page.mouse.move(bounds!.x + 5, bounds!.y - 5);
  await expect
    .poll(async () => {
      try {
        await page.clock.runFor(50);
      } catch {}
      return Math.abs((await viewport(chart)).from - beforePan.from);
    })
    .toBeGreaterThan(1);
  return viewport(chart);
}

test("manual snapshot refresh updates prices and appends bars without moving an inspected chart", async ({
  page,
}) => {
  let payload = bars();
  let requests = 0;
  await mockMarket(page, () => {
    requests++;
    return payload;
  });
  await page.goto("/");
  const chart = page.locator(".chart-canvas");
  await expect(chart).toHaveAttribute("data-bars-count", "80");
  const originalCanvas = await chart.locator("canvas").first().elementHandle();
  const inspected = await zoomAndPan(page, chart);
  const initialRequests = requests;

  payload = structuredClone(payload);
  payload.bars[79].close = 81.654321;
  await page.getByRole("button", { name: "Refresh market snapshot" }).click();
  await expect.poll(() => requests).toBeGreaterThan(initialRequests);
  await page.getByRole("button", { name: "View data", exact: true }).click();
  await expect(page.locator(".chart-data tbody tr").last()).toContainText(
    "81.65",
  );
  await expectRange(chart, inspected);
  expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Hide data", exact: true }).click();
  await expectRange(chart, inspected);
  await page.screenshot({
    path: "docs/evidence/chart-preserved-viewport.png",
    fullPage: true,
  });

  const last = payload.bars.at(-1)!;
  payload = {
    ...payload,
    bars: [...payload.bars, { ...last, time: last.time + 300000 }],
  };
  await page.getByRole("button", { name: "Refresh market snapshot" }).click();
  await expect(chart).toHaveAttribute("data-bars-count", "81");
  await expect(chart).toHaveAttribute(
    "data-last-time",
    String(last.time + 300000),
  );
  await expectRange(chart, inspected);
  expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
    true,
  );
});

test("automatic polling retains the inspected timestamps when the provider window rolls forward", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-20T10:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-20T10:00:01Z"));
  let payload = bars();
  let requests = 0;
  let quoteRefreshed = false;
  await mockMarket(page, () => {
    requests++;
    return payload;
  });
  await page.route("**/api/instruments", (route) =>
    route.fulfill({
      json: {
        success: true,
        instruments: [
          {
            id: "brent-dec26",
            symbol: "BZZ26.NYM",
            label: quoteRefreshed
              ? "Brent · Dec 2026 · updated snapshot"
              : "Brent · Dec 2026",
            short: "Dec 26",
            price: quoteRefreshed ? 82.5 : 82,
            change: 0.5,
            changePercent: 0.6,
            high: 83,
            low: 81,
            volume: null,
            currency: "USD",
            meta: payload.meta,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  const chart = page.locator(".chart-canvas");
  await expect(chart).toHaveAttribute("data-bars-count", "80");
  await page.clock.runFor(100);
  const originalCanvas = await chart.locator("canvas").first().elementHandle();
  const inspected = await zoomAndPan(page, chart);
  const initialRequests = requests;
  const last = payload.bars.at(-1)!;
  payload = {
    ...payload,
    bars: [...payload.bars.slice(1), { ...last, time: last.time + 300000 }],
  };

  await page.clock.fastForward(15000);
  await page.clock.runFor(100);
  await expect.poll(() => requests).toBeGreaterThan(initialRequests);
  await expect(chart).toHaveAttribute(
    "data-first-time",
    String(inspected.first + 300000),
  );
  await expectRange(chart, inspected, -1);
  const refreshed = await viewport(chart);
  // The logical index moves with the rolling window; the user's dates stay fixed.
  for (const edge of ["from", "to"] as const)
    expect(
      Math.abs(
        refreshed.first +
          refreshed[edge] * 300000 -
          (inspected.first + inspected[edge] * 300000),
      ),
    ).toBeLessThan(15000);
  expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
    true,
  );

  // The 20-second quote poll re-renders the parent without another bars refresh.
  const barRequests = requests;
  quoteRefreshed = true;
  await page.clock.fastForward(5000);
  await page.clock.runFor(100);
  await expect(page.locator(".quote-label")).toContainText("updated snapshot");
  expect(requests).toBe(barRequests);
  await expectRange(chart, refreshed);
  expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
    true,
  );
});

test("indicator, timezone and price-display changes preserve the inspected viewport and chart instance", async ({
  page,
}) => {
  await mockMarket(page, bars);
  await page.goto("/");
  const chart = page.locator(".chart-canvas");
  await expect(chart).toHaveAttribute("data-bars-count", "80");
  const originalCanvas = await chart.locator("canvas").first().elementHandle();
  const inspected = await zoomAndPan(page, chart);

  await page.getByText("Indicator settings ·", { exact: false }).click();
  await page.getByLabel("Average method", { exact: true }).selectOption("EMA");
  await page.getByLabel("Fast average period", { exact: true }).fill("9");
  await page.getByLabel("Slow average period", { exact: true }).fill("21");
  await expectRange(chart, inspected);
  await page
    .getByRole("button", { name: "Moving averages", exact: true })
    .click();
  await expectRange(chart, inspected);
  await page
    .getByRole("button", { name: "Moving averages", exact: true })
    .click();
  await expectRange(chart, inspected);
  const timezone = page.getByRole("group", { name: "Chart timezone" });
  await timezone.getByRole("button", { name: "UTC", exact: true }).click();
  await expectRange(chart, inspected);
  await timezone.getByRole("button", { name: /^Local \(/ }).click();
  await expectRange(chart, inspected);
  await page
    .getByRole("combobox", { name: "Price display" })
    .selectOption("line");
  await expectRange(chart, inspected);
  await page
    .getByRole("combobox", { name: "Price display" })
    .selectOption("candles");
  await expectRange(chart, inspected);
  expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
    true,
  );
});

test("Fit and explicit market-context changes show the newly selected data extent", async ({
  page,
}) => {
  test.setTimeout(45000);
  await mockMarket(page, bars);
  await page.route("**/api/bars?**", (route) => {
    const query = new URL(route.request().url()).searchParams;
    const payload = bars();
    const count = query.get("range") === "1D" ? 24 : 80;
    const step = query.get("timeframe") === "15m" ? 900000 : 300000;
    const origin =
      payload.bars[0].time +
      (query.get("instrument") === "brent-jan27" ? 86400000 : 0);
    payload.bars = payload.bars.slice(0, count).map((bar, index) => ({
      ...bar,
      time: origin + index * step,
    }));
    return route.fulfill({ json: payload });
  });
  await page.goto("/");
  const chart = page.locator(".chart-canvas");
  await expect(chart).toHaveAttribute("data-bars-count", "80");
  const original = await viewport(chart);
  await zoomAndPan(page, chart);
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await expectRange(chart, original);

  const expectFullExtent = async (count: number) => {
    await expect(chart).toHaveAttribute("data-bars-count", String(count));
    await expect
      .poll(async () => {
        const current = await viewport(chart);
        return current.from <= 0.1 && current.to >= count - 1.1;
      })
      .toBe(true);
  };
  for (const range of ["1D", "5D"]) {
    await zoomAndPan(page, chart);
    await page.getByRole("button", { name: range, exact: true }).click();
    await expectFullExtent(range === "1D" ? 24 : 80);
  }
  await zoomAndPan(page, chart);
  await page.getByRole("button", { name: "15m", exact: true }).click();
  await expect(chart).toHaveAttribute(
    "data-last-time",
    String(original.first + 79 * 900000),
  );
  await expectFullExtent(80);
  await zoomAndPan(page, chart);
  await page
    .getByRole("combobox", { name: "Futures contract" })
    .selectOption("brent-jan27");
  await expect(chart).toHaveAttribute(
    "data-first-time",
    String(original.first + 86400000),
  );
  await expectFullExtent(80);
  await zoomAndPan(page, chart);
  await page
    .getByRole("combobox", { name: "Market data", exact: true })
    .selectOption("demo");
  await expect(page.getByLabel("Chart provenance")).toContainText(
    "Demo sample · synthetic",
  );
  await expectFullExtent(240);
});
