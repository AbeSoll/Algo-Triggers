# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chart-viewport.spec.ts >> indicator, timezone and price-display changes preserve the inspected viewport and chart instance
- Location: tests\chart-viewport.spec.ts:215:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('.chart-canvas')
Expected: "80"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" locator('.chart-canvas') with timeout 5000ms
  - waiting for locator('.chart-canvas')

```

```yaml
- text: "[plugin:vite:react-babel] C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\src\\PriceChart.tsx: Unexpected token (318:7) 321 | framedEvent.current !== selectedEvent.id && C:/Users/soleh/Documents/Codex/2026-10-19/my-team-ask-me-to-help-2/outputs/Algo-Triggers/src/PriceChart.tsx:318:7 316 | text: selectedEvent?.id === e.id ? \"Selected event\" : \"\", 317 | })), 318 | )),); | ^ 319 | if ( 320 | selectedEvent && at constructor (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:369:19) at TypeScriptParserMixin.raise (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:6622:19) at TypeScriptParserMixin.unexpected (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:6642:16) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11473:22) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:4782:20) at TypeScriptParserMixin.parseExprSubscripts (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11107:23) at TypeScriptParserMixin.parseUpdate (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11092:21) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11072:23) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:9860:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10925:61) at TypeScriptParserMixin.parseExprOps (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10930:23) at TypeScriptParserMixin.parseMaybeConditional (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10907:23) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10857:21) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:9809:20) at TypeScriptParserMixin.parseExpressionBase (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10815:36) at C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10806:39 at TypeScriptParserMixin.allowInAnd (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12455:16) at TypeScriptParserMixin.parseExpression (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10806:17) at TypeScriptParserMixin.parseStatementContent (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12929:23) at TypeScriptParserMixin.parseStatementContent (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:9531:18) at TypeScriptParserMixin.parseStatementLike (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12801:17) at TypeScriptParserMixin.parseStatementListItem (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12781:17) at TypeScriptParserMixin.parseBlockOrModuleBlockBody (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:13350:61) at TypeScriptParserMixin.parseBlockBody (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:13343:10) at TypeScriptParserMixin.parseBlock (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:13331:10) at TypeScriptParserMixin.parseFunctionBody (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12134:24) at TypeScriptParserMixin.parseArrowExpression (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12109:10) at TypeScriptParserMixin.parseParenAndDistinguishExpression (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11718:12) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11362:23) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:4782:20) at TypeScriptParserMixin.parseExprSubscripts (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11107:23) at TypeScriptParserMixin.parseUpdate (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11092:21) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11072:23) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:9860:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10925:61) at TypeScriptParserMixin.parseExprOps (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10930:23) at TypeScriptParserMixin.parseMaybeConditional (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10907:23) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10857:21) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:9809:20) at C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10826:39 at TypeScriptParserMixin.allowInAnd (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12460:12) at TypeScriptParserMixin.parseMaybeAssignAllowIn (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:10826:17) at TypeScriptParserMixin.parseMaybeAssignAllowInOrVoidPattern (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12527:17) at TypeScriptParserMixin.parseExprListItem (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:12209:18) at TypeScriptParserMixin.parseCallExpressionArguments (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11283:22) at TypeScriptParserMixin.parseCoverCallAndAsyncArrowHead (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11217:29) at TypeScriptParserMixin.parseSubscript (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11146:19) at TypeScriptParserMixin.parseSubscript (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:9295:18) at TypeScriptParserMixin.parseSubscripts (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11120:19) at TypeScriptParserMixin.parseExprSubscripts (C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\node_modules\\@babel\\parser\\lib\\index.js:11111:17) Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting"
- code: server.hmr.overlay
- text: to
- code: "false"
- text: in
- code: vite.config.ts
- text: .
```

# Test source

```ts
  121 |     "data-last-time",
  122 |     String(last.time + 300000),
  123 |   );
  124 |   await expectRange(chart, inspected);
  125 |   expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
  126 |     true,
  127 |   );
  128 | });
  129 | 
  130 | test("automatic polling retains the inspected timestamps when the provider window rolls forward", async ({
  131 |   page,
  132 | }) => {
  133 |   await page.clock.install({ time: new Date("2026-10-20T10:00:00Z") });
  134 |   await page.clock.pauseAt(new Date("2026-10-20T10:00:01Z"));
  135 |   let payload = bars();
  136 |   let requests = 0;
  137 |   let quoteRefreshed = false;
  138 |   await mockMarket(page, () => {
  139 |     requests++;
  140 |     return payload;
  141 |   });
  142 |   await page.route("**/api/instruments", (route) =>
  143 |     route.fulfill({
  144 |       json: {
  145 |         success: true,
  146 |         instruments: [
  147 |           {
  148 |             id: "brent-dec26",
  149 |             symbol: "BZZ26.NYM",
  150 |             label: quoteRefreshed
  151 |               ? "Brent · Dec 2026 · updated snapshot"
  152 |               : "Brent · Dec 2026",
  153 |             short: "Dec 26",
  154 |             price: quoteRefreshed ? 82.5 : 82,
  155 |             change: 0.5,
  156 |             changePercent: 0.6,
  157 |             high: 83,
  158 |             low: 81,
  159 |             volume: null,
  160 |             currency: "USD",
  161 |             meta: payload.meta,
  162 |           },
  163 |         ],
  164 |       },
  165 |     }),
  166 |   );
  167 |   await page.goto("/");
  168 |   const chart = page.locator(".chart-canvas");
  169 |   await expect(chart).toHaveAttribute("data-bars-count", "80");
  170 |   await page.clock.runFor(100);
  171 |   const originalCanvas = await chart.locator("canvas").first().elementHandle();
  172 |   const inspected = await zoomAndPan(page, chart);
  173 |   const initialRequests = requests;
  174 |   const last = payload.bars.at(-1)!;
  175 |   payload = {
  176 |     ...payload,
  177 |     bars: [...payload.bars.slice(1), { ...last, time: last.time + 300000 }],
  178 |   };
  179 | 
  180 |   await page.clock.fastForward(15000);
  181 |   await page.clock.runFor(100);
  182 |   await expect.poll(() => requests).toBeGreaterThan(initialRequests);
  183 |   await expect(chart).toHaveAttribute(
  184 |     "data-first-time",
  185 |     String(inspected.first + 300000),
  186 |   );
  187 |   await expectRange(chart, inspected, -1);
  188 |   const refreshed = await viewport(chart);
  189 |   // The logical index moves with the rolling window; the user's dates stay fixed.
  190 |   for (const edge of ["from", "to"] as const)
  191 |     expect(
  192 |       Math.abs(
  193 |         refreshed.first +
  194 |           refreshed[edge] * 300000 -
  195 |           (inspected.first + inspected[edge] * 300000),
  196 |       ),
  197 |     ).toBeLessThan(15000);
  198 |   expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
  199 |     true,
  200 |   );
  201 | 
  202 |   // The 20-second quote poll re-renders the parent without another bars refresh.
  203 |   const barRequests = requests;
  204 |   quoteRefreshed = true;
  205 |   await page.clock.fastForward(5000);
  206 |   await page.clock.runFor(100);
  207 |   await expect(page.locator(".quote-label")).toContainText("updated snapshot");
  208 |   expect(requests).toBe(barRequests);
  209 |   await expectRange(chart, refreshed);
  210 |   expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
  211 |     true,
  212 |   );
  213 | });
  214 | 
  215 | test("indicator, timezone and price-display changes preserve the inspected viewport and chart instance", async ({
  216 |   page,
  217 | }) => {
  218 |   await mockMarket(page, bars);
  219 |   await page.goto("/");
  220 |   const chart = page.locator(".chart-canvas");
> 221 |   await expect(chart).toHaveAttribute("data-bars-count", "80");
      |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
  222 |   const originalCanvas = await chart.locator("canvas").first().elementHandle();
  223 |   const inspected = await zoomAndPan(page, chart);
  224 | 
  225 |   await page.getByText("Indicator settings ·", { exact: false }).click();
  226 |   await page.getByLabel("Average method", { exact: true }).selectOption("EMA");
  227 |   await page.getByLabel("Fast average period", { exact: true }).fill("9");
  228 |   await page.getByLabel("Slow average period", { exact: true }).fill("21");
  229 |   await expectRange(chart, inspected);
  230 |   await page
  231 |     .getByRole("button", { name: "Moving averages", exact: true })
  232 |     .click();
  233 |   await expectRange(chart, inspected);
  234 |   await page
  235 |     .getByRole("button", { name: "Moving averages", exact: true })
  236 |     .click();
  237 |   await expectRange(chart, inspected);
  238 |   const timezone = page.getByRole("group", { name: "Chart timezone" });
  239 |   await timezone.getByRole("button", { name: "UTC", exact: true }).click();
  240 |   await expectRange(chart, inspected);
  241 |   await timezone.getByRole("button", { name: /^Local \(/ }).click();
  242 |   await expectRange(chart, inspected);
  243 |   await page
  244 |     .getByRole("combobox", { name: "Price display" })
  245 |     .selectOption("line");
  246 |   await expectRange(chart, inspected);
  247 |   await page
  248 |     .getByRole("combobox", { name: "Price display" })
  249 |     .selectOption("candles");
  250 |   await expectRange(chart, inspected);
  251 |   expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
  252 |     true,
  253 |   );
  254 | });
  255 | 
  256 | test("Fit and explicit market-context changes show the newly selected data extent", async ({
  257 |   page,
  258 | }) => {
  259 |   test.setTimeout(45000);
  260 |   await mockMarket(page, bars);
  261 |   await page.route("**/api/bars?**", (route) => {
  262 |     const query = new URL(route.request().url()).searchParams;
  263 |     const payload = bars();
  264 |     const count = query.get("range") === "1D" ? 24 : 80;
  265 |     const step = query.get("timeframe") === "15m" ? 900000 : 300000;
  266 |     const origin =
  267 |       payload.bars[0].time +
  268 |       (query.get("instrument") === "brent-jan27" ? 86400000 : 0);
  269 |     payload.bars = payload.bars.slice(0, count).map((bar, index) => ({
  270 |       ...bar,
  271 |       time: origin + index * step,
  272 |     }));
  273 |     return route.fulfill({ json: payload });
  274 |   });
  275 |   await page.goto("/");
  276 |   const chart = page.locator(".chart-canvas");
  277 |   await expect(chart).toHaveAttribute("data-bars-count", "80");
  278 |   const original = await viewport(chart);
  279 |   await zoomAndPan(page, chart);
  280 |   await page.getByRole("button", { name: "Fit", exact: true }).click();
  281 |   await expectRange(chart, original);
  282 | 
  283 |   const expectFullExtent = async (count: number) => {
  284 |     await expect(chart).toHaveAttribute("data-bars-count", String(count));
  285 |     await expect
  286 |       .poll(async () => {
  287 |         const current = await viewport(chart);
  288 |         return current.from <= 0.1 && current.to >= count - 1.1;
  289 |       })
  290 |       .toBe(true);
  291 |   };
  292 |   for (const range of ["1D", "5D"]) {
  293 |     await zoomAndPan(page, chart);
  294 |     await page.getByRole("button", { name: range, exact: true }).click();
  295 |     await expectFullExtent(range === "1D" ? 24 : 80);
  296 |   }
  297 |   await zoomAndPan(page, chart);
  298 |   await page.getByRole("button", { name: "15m", exact: true }).click();
  299 |   await expect(chart).toHaveAttribute(
  300 |     "data-last-time",
  301 |     String(original.first + 79 * 900000),
  302 |   );
  303 |   await expectFullExtent(80);
  304 |   await zoomAndPan(page, chart);
  305 |   await page
  306 |     .getByRole("combobox", { name: "Futures contract" })
  307 |     .selectOption("brent-jan27");
  308 |   await expect(chart).toHaveAttribute(
  309 |     "data-first-time",
  310 |     String(original.first + 86400000),
  311 |   );
  312 |   await expectFullExtent(80);
  313 |   await zoomAndPan(page, chart);
  314 |   await page
  315 |     .getByRole("combobox", { name: "Market data", exact: true })
  316 |     .selectOption("demo");
  317 |   await expect(page.getByLabel("Chart provenance")).toContainText(
  318 |     "Demo sample · synthetic",
  319 |   );
  320 |   await expectFullExtent(240);
  321 | });
```