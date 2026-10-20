# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chart-viewport.spec.ts >> manual snapshot refresh updates prices and appends bars without moving an inspected chart
- Location: tests\chart-viewport.spec.ts:78:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 1
Received:   0

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "Skip to workspace" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - complementary [ref=e5]:
      - link "algotriggers RESEARCH TERMINAL" [ref=e6] [cursor=pointer]:
        - /url: "?view=market"
        - generic [ref=e11]:
          - text: algotriggers
          - generic [ref=e12]: RESEARCH TERMINAL
      - generic [ref=e13]: WORKSPACE
      - navigation "Main navigation" [ref=e14]:
        - link "Market explorer" [ref=e15] [cursor=pointer]:
          - /url: "?view=market"
        - link "Rules & alerts 3" [ref=e21] [cursor=pointer]:
          - /url: "?view=rules"
          - text: Rules & alerts
          - generic [ref=e23]: "3"
        - link "Options lab" [ref=e24] [cursor=pointer]:
          - /url: "?view=options"
        - link "Event history" [ref=e27] [cursor=pointer]:
          - /url: "?view=history"
      - generic [ref=e33]: YOUR RESEARCH
      - generic [ref=e36]:
        - text: Brent crude oil
        - generic [ref=e37]: Futures & options
      - generic [ref=e38]:
        - generic [ref=e39]:
          - strong [ref=e43]: Market snapshots
          - paragraph [ref=e44]: Yahoo observations or explicitly selected demo samples. Rule tests and monitoring use synthetic data.
          - generic [ref=e45]: No automatic trading
        - button "Workspace guide" [ref=e46] [cursor=pointer]
        - generic [ref=e53]:
          - generic [ref=e54]: AS
          - generic [ref=e55]:
            - text: Analyst workspace
            - generic [ref=e56]: Saved on this browser
          - button "Workspace settings" [ref=e57] [cursor=pointer]
    - generic [ref=e61]:
      - banner [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]: Research workspace
          - strong [ref=e67]: Brent crude
        - generic [ref=e68]:
          - generic [ref=e69]:
            - text: Market data
            - combobox "Market data" [ref=e70] [cursor=pointer]:
              - option "Yahoo snapshots" [selected]
              - option "Demo samples"
          - button "Open event history" [ref=e71] [cursor=pointer]
      - main [ref=e76]:
        - generic [ref=e77]:
          - generic [ref=e78]:
            - generic [ref=e79]: BRENT RESEARCH · SNAPSHOTS & DEMO
            - heading "Market explorer." [level=1] [ref=e80]
            - paragraph [ref=e81]: Explore the market. Find a pattern. Make it a rule.
          - button "Create rule" [ref=e82] [cursor=pointer]
        - generic [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e87]: B
              - text: Brent · Dec 2026
              - generic [ref=e88]: Futures
            - generic [ref=e89]:
              - text: $81.91
              - generic [ref=e90]: USD/bbl
              - generic [ref=e91]:
                - text: "+0.79"
                - generic [ref=e95]: (0.97%)
          - generic [ref=e96]:
            - generic [ref=e97]: Displayed high
            - strong [ref=e98]: "82.79"
          - generic [ref=e99]:
            - generic [ref=e100]: Displayed low
            - strong [ref=e101]: "80.00"
          - generic [ref=e102]:
            - generic [ref=e103]: Data source
            - strong [ref=e104]: Yahoo snapshot
            - generic [ref=e105]: BZZ26.NYM
        - note "Chart provenance" [ref=e106]:
          - strong [ref=e107]: Yahoo Finance snapshot
          - generic [ref=e108]: "BZZ26.NYM · Quote/bar time: 19 Oct, 16:35 UTC · Fetched 20 Oct, 10:00 UTC · Delay unverified · Quote/bar age: 580 min"
        - generic [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]:
              - generic "Market view" [ref=e112]:
                - button "Price chart" [pressed] [ref=e113] [cursor=pointer]
                - button "Futures curve" [ref=e114] [cursor=pointer]
              - generic [ref=e115]:
                - button "Refresh market snapshot" [ref=e116] [cursor=pointer]
                - button "Export chart data" [ref=e122] [cursor=pointer]
            - generic [ref=e126]:
              - generic [ref=e127]: Futures contract
              - combobox "Futures contract" [ref=e128] [cursor=pointer]:
                - option "Brent · Dec 2026" [selected]
                - option "Brent · Jan 2027"
                - option "Brent · Feb 2027"
              - generic "Chart timeframe" [ref=e129]:
                - button "5m" [pressed] [ref=e130] [cursor=pointer]
                - button "15m" [ref=e131] [cursor=pointer]
                - button "1h" [ref=e132] [cursor=pointer]
              - generic [ref=e133]: Price display
              - combobox "Price display" [ref=e134] [cursor=pointer]:
                - option "Candlesticks" [selected]
                - option "Line"
              - generic [ref=e135]:
                - button "1D" [ref=e136] [cursor=pointer]
                - button "5D" [pressed] [ref=e137] [cursor=pointer]
            - generic [ref=e138]:
              - generic [ref=e139]:
                - button "Moving averages" [pressed] [ref=e140] [cursor=pointer]
                - group [ref=e142]:
                  - generic "Indicator settings · SMA 20/50" [ref=e143] [cursor=pointer]
                  - option "SMA" [selected]
                  - option "EMA"
              - generic [ref=e144]:
                - group "Chart timezone" [ref=e145]:
                  - button "UTC" [ref=e146] [cursor=pointer]
                  - button "Local (UTC+8)" [pressed] [ref=e147] [cursor=pointer]
                - generic [ref=e148]:
                  - button "Zoom out chart" [ref=e149] [cursor=pointer]
                  - button "Zoom in chart" [ref=e151] [cursor=pointer]
                  - button "Fit" [ref=e153] [cursor=pointer]
            - generic [ref=e154]:
              - generic [ref=e155]: 20 Oct, 00:35 UTC+8
              - generic [ref=e156]: O 81.79
              - generic [ref=e157]: H 82.79
              - generic [ref=e158]: L 80.79
              - generic [ref=e159]: C 81.91
              - generic [ref=e160]:
                - generic [ref=e161]: SMA20
                - text: "81.818456"
              - generic [ref=e162]:
                - generic [ref=e163]: SMA50
                - text: "81.668456"
            - region "Yahoo snapshot Brent price chart. Inspect the equivalent data table below." [ref=e164]:
              - table [ref=e166]:
                - row [ref=e167]:
                  - cell
                  - cell [ref=e168]:
                    - link "Charting by TradingView" [ref=e172] [cursor=pointer]:
                      - /url: https://www.tradingview.com/?utm_medium=lwc-link&utm_campaign=lwc-chart&utm_source=127.0.0.1/
                  - cell [ref=e177]
                - row [ref=e181]:
                  - cell
                  - cell [ref=e182]
                  - cell [ref=e186]
            - generic [ref=e189]:
              - generic [ref=e190]:
                - text: Rule events
                - generic [ref=e192]: /
                - generic [ref=e193]: Local time (UTC+8) · Delay unverified · indicators use valid returned bars · USD/bbl
              - button "View data" [ref=e194] [cursor=pointer]
              - button "Create average rule" [ref=e197] [cursor=pointer]
          - complementary [ref=e201]:
            - generic [ref=e202]:
              - text: FROM INSIGHT TO SIGNAL
              - heading "A market move. Your next rule." [level=2] [ref=e206]: A market move.Your next rule.
              - paragraph [ref=e207]: Give your idea a clear condition. We’ll help you test when it would have happened.
              - generic [ref=e208]:
                - generic [ref=e209]: IF
                - generic [ref=e210]:
                  - text: Brent crosses above
                  - strong [ref=e211]: $82.50 /bbl
                - generic [ref=e212]: THEN
                - generic [ref=e213]: Record an alert
              - button "Build a rule" [ref=e214] [cursor=pointer]
              - generic [ref=e217]: No code. No automatic trades.
            - generic [ref=e218]:
              - strong [ref=e227]: 2 demo rules enabled
              - paragraph [ref=e228]: Step through a sample bar and inspect what your rules detect.
              - button "Advance demo bar" [ref=e229] [cursor=pointer]
              - generic [ref=e232]: Manual playback · browser only
        - generic [ref=e233]:
          - generic [ref=e234]:
            - generic [ref=e235]:
              - generic [ref=e236]:
                - heading "Saved rules 3" [level=2] [ref=e237]
                - paragraph [ref=e238]: Your ideas, ready to test.
              - button "View all" [ref=e239] [cursor=pointer]
            - table [ref=e243]:
              - caption [ref=e244]: Saved rule versions and demo monitoring status
              - rowgroup [ref=e245]:
                - row [ref=e246]:
                  - columnheader "Rule & condition" [ref=e247]
                  - columnheader "Status" [ref=e248]
                  - columnheader "Actions" [ref=e249]
              - rowgroup [ref=e250]:
                - row [ref=e251]:
                  - cell "Brent breaks $82.50 v1 Close crosses above 82.5 USD/bbl Dec 26 · 5m · 30m cooldown" [ref=e252]:
                    - button "Brent breaks $82.50 v1" [ref=e253] [cursor=pointer]:
                      - text: Brent breaks $82.50
                      - generic [ref=e254]: v1
                    - paragraph [ref=e255]: Close crosses above 82.5 USD/bbl
                    - generic [ref=e256]: Dec 26 · 5m · 30m cooldown
                  - cell "Demo monitoring" [ref=e257]
                  - cell [ref=e260]:
                    - group "Actions for Brent breaks $82.50" [ref=e261]:
                      - generic [ref=e262]:
                        - 'button "Test rule: Brent breaks $82.50" [ref=e263] [cursor=pointer]': Test rule
                        - button "Pause Brent breaks $82.50" [ref=e266] [cursor=pointer]: Pause
                - row [ref=e270]:
                  - cell "Momentum turns higher v1 SMA(9) crosses above SMA(21) Dec 26 · 5m · 60m cooldown" [ref=e271]:
                    - button "Momentum turns higher v1" [ref=e272] [cursor=pointer]:
                      - text: Momentum turns higher
                      - generic [ref=e273]: v1
                    - paragraph [ref=e274]: SMA(9) crosses above SMA(21)
                    - generic [ref=e275]: Dec 26 · 5m · 60m cooldown
                  - cell "Demo monitoring" [ref=e276]
                  - cell [ref=e279]:
                    - group "Actions for Momentum turns higher" [ref=e280]:
                      - generic [ref=e281]:
                        - 'button "Test rule: Momentum turns higher" [ref=e282] [cursor=pointer]': Test rule
                        - button "Pause Momentum turns higher" [ref=e285] [cursor=pointer]: Pause
                - row [ref=e289]:
                  - cell "January pullback watch v1 12-bar close change below -0.5% Jan 27 · 5m · 60m cooldown" [ref=e290]:
                    - button "January pullback watch v1" [ref=e291] [cursor=pointer]:
                      - text: January pullback watch
                      - generic [ref=e292]: v1
                    - paragraph [ref=e293]: 12-bar close change below -0.5%
                    - generic [ref=e294]: Jan 27 · 5m · 60m cooldown
                  - cell "Draft" [ref=e295]
                  - cell [ref=e298]:
                    - group "Actions for January pullback watch" [ref=e299]:
                      - generic [ref=e300]:
                        - 'button "Test rule: January pullback watch" [ref=e301] [cursor=pointer]': Test rule
                        - button "Start demo monitoring for January pullback watch" [ref=e304] [cursor=pointer]: Monitor demo
          - generic [ref=e311]:
            - generic [ref=e312]:
              - generic [ref=e313]:
                - heading "Recent signals" [level=2] [ref=e314]
                - paragraph [ref=e315]: Historical evidence from sample data.
              - button "View all event history" [ref=e316] [cursor=pointer]
            - generic [ref=e320]:
              - button "Brent breaks $82.50 Historical replay · v1 · $82.54/bbl 16 Oct, 18:55" [ref=e321] [cursor=pointer]:
                - generic [ref=e325]:
                  - strong [ref=e326]: Brent breaks $82.50
                  - generic [ref=e327]: Historical replay · v1 · $82.54/bbl
                - generic [ref=e328]: 16 Oct, 18:55
              - button "Momentum turns higher Historical replay · v1 · $81.94/bbl 16 Oct, 18:00" [ref=e332] [cursor=pointer]:
                - generic [ref=e336]:
                  - strong [ref=e337]: Momentum turns higher
                  - generic [ref=e338]: Historical replay · v1 · $81.94/bbl
                - generic [ref=e339]: 16 Oct, 18:00
              - button "Momentum turns higher Historical replay · v1 · $82.03/bbl 16 Oct, 15:20" [ref=e343] [cursor=pointer]:
                - generic [ref=e347]:
                  - strong [ref=e348]: Momentum turns higher
                  - generic [ref=e349]: Historical replay · v1 · $82.03/bbl
                - generic [ref=e350]: 16 Oct, 15:20
              - button "January pullback watch Historical replay · v1 · $82.56/bbl 16 Oct, 12:30" [ref=e354] [cursor=pointer]:
                - generic [ref=e358]:
                  - strong [ref=e359]: January pullback watch
                  - generic [ref=e360]: Historical replay · v1 · $82.56/bbl
                - generic [ref=e361]: 16 Oct, 12:30
        - generic [ref=e365]:
          - generic [ref=e366]: Research workspace · rule tests and monitoring use synthetic samples · no order execution
          - button "Data & methodology" [ref=e369] [cursor=pointer]
  - generic [ref=e375]:
    - generic [ref=e376]: "[plugin:vite:react-babel] C:\\Users\\soleh\\Documents\\Codex\\2026-10-19\\my-team-ask-me-to-help-2\\outputs\\Algo-Triggers\\src\\PriceChart.tsx: Unexpected token (318:7) 321 | framedEvent.current !== selectedEvent.id &&"
    - generic [ref=e377]: C:/Users/soleh/Documents/Codex/2026-10-19/my-team-ask-me-to-help-2/outputs/Algo-Triggers/src/PriceChart.tsx:318:7
    - generic [ref=e378]: "316 | text: selectedEvent?.id === e.id ? \"Selected event\" : \"\", 317 | })), 318 | )),); | ^ 319 | if ( 320 | selectedEvent &&"
    - generic [ref=e379]: at constructor (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:369:19) at TypeScriptParserMixin.raise (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:6622:19) at TypeScriptParserMixin.unexpected (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:6642:16) at TypeScriptParserMixin.parseExprAtom (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11473:22) at TypeScriptParserMixin.parseExprAtom (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:4782:20) at TypeScriptParserMixin.parseExprSubscripts (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11107:23) at TypeScriptParserMixin.parseUpdate (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11092:21) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11072:23) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:9860:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10925:61) at TypeScriptParserMixin.parseExprOps (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10930:23) at TypeScriptParserMixin.parseMaybeConditional (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10907:23) at TypeScriptParserMixin.parseMaybeAssign (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10857:21) at TypeScriptParserMixin.parseMaybeAssign (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:9809:20) at TypeScriptParserMixin.parseExpressionBase (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10815:36) at C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10806:39 at TypeScriptParserMixin.allowInAnd (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12455:16) at TypeScriptParserMixin.parseExpression (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10806:17) at TypeScriptParserMixin.parseStatementContent (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12929:23) at TypeScriptParserMixin.parseStatementContent (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:9531:18) at TypeScriptParserMixin.parseStatementLike (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12801:17) at TypeScriptParserMixin.parseStatementListItem (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12781:17) at TypeScriptParserMixin.parseBlockOrModuleBlockBody (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:13350:61) at TypeScriptParserMixin.parseBlockBody (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:13343:10) at TypeScriptParserMixin.parseBlock (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:13331:10) at TypeScriptParserMixin.parseFunctionBody (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12134:24) at TypeScriptParserMixin.parseArrowExpression (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12109:10) at TypeScriptParserMixin.parseParenAndDistinguishExpression (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11718:12) at TypeScriptParserMixin.parseExprAtom (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11362:23) at TypeScriptParserMixin.parseExprAtom (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:4782:20) at TypeScriptParserMixin.parseExprSubscripts (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11107:23) at TypeScriptParserMixin.parseUpdate (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11092:21) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11072:23) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:9860:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10925:61) at TypeScriptParserMixin.parseExprOps (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10930:23) at TypeScriptParserMixin.parseMaybeConditional (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10907:23) at TypeScriptParserMixin.parseMaybeAssign (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10857:21) at TypeScriptParserMixin.parseMaybeAssign (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:9809:20) at C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10826:39 at TypeScriptParserMixin.allowInAnd (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12460:12) at TypeScriptParserMixin.parseMaybeAssignAllowIn (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:10826:17) at TypeScriptParserMixin.parseMaybeAssignAllowInOrVoidPattern (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12527:17) at TypeScriptParserMixin.parseExprListItem (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:12209:18) at TypeScriptParserMixin.parseCallExpressionArguments (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11283:22) at TypeScriptParserMixin.parseCoverCallAndAsyncArrowHead (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11217:29) at TypeScriptParserMixin.parseSubscript (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11146:19) at TypeScriptParserMixin.parseSubscript (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:9295:18) at TypeScriptParserMixin.parseSubscripts (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11120:19) at TypeScriptParserMixin.parseExprSubscripts (C:\Users\soleh\Documents\Codex\2026-10-19\my-team-ask-me-to-help-2\outputs\Algo-Triggers\node_modules\@babel\parser\lib\index.js:11111:17)
    - generic [ref=e380]:
      - text: Click outside, press Esc key, or fix the code to dismiss.You can also disable this overlay by setting
      - code [ref=e381]: server.hmr.overlay
      - text: to
      - code [ref=e382]: "false"
      - text: in
      - code [ref=e383]: vite.config.ts
      - text: .
```

# Test source

```ts
  1   | import { expect, test, type Locator, type Page } from "@playwright/test";
  2   | import { bars } from "./market-fixtures";
  3   | 
  4   | type Snapshot = ReturnType<typeof bars>;
  5   | type Viewport = {
  6   |   from: number;
  7   |   to: number;
  8   |   first: number;
  9   |   last: number;
  10  |   count: number;
  11  | };
  12  | 
  13  | async function mockMarket(page: Page, snapshot: () => Snapshot) {
  14  |   await page.addInitScript(() =>
  15  |     localStorage.setItem("algo-triggers-market-source", "yahoo"),
  16  |   );
  17  |   await page.route("**/api/**", (route) =>
  18  |     route.fulfill({ status: 503, json: { success: false } }),
  19  |   );
  20  |   await page.route("**/api/bars?**", (route) =>
  21  |     route.fulfill({ json: snapshot() }),
  22  |   );
  23  | }
  24  | 
  25  | async function viewport(chart: Locator): Promise<Viewport> {
  26  |   await expect(chart).toHaveAttribute("data-visible-from", /-?\d/);
  27  |   return chart.evaluate((element) => ({
  28  |     from: Number(element.getAttribute("data-visible-from")),
  29  |     to: Number(element.getAttribute("data-visible-to")),
  30  |     first: Number(element.getAttribute("data-first-time")),
  31  |     last: Number(element.getAttribute("data-last-time")),
  32  |     count: Number(element.getAttribute("data-bars-count")),
  33  |   }));
  34  | }
  35  | 
  36  | async function expectRange(chart: Locator, expected: Viewport, shift = 0) {
  37  |   await expect
  38  |     .poll(async () => {
  39  |       const actual = await viewport(chart);
  40  |       return Math.max(
  41  |         Math.abs(actual.from - expected.from - shift),
  42  |         Math.abs(actual.to - expected.to - shift),
  43  |       );
  44  |     })
  45  |     .toBeLessThan(0.05);
  46  | }
  47  | 
  48  | async function zoomAndPan(page: Page, chart: Locator) {
  49  |   const fitted = await viewport(chart);
  50  |   await page
  51  |     .getByRole("button", { name: "Zoom in chart", exact: true })
  52  |     .click();
  53  |   await page
  54  |     .getByRole("button", { name: "Zoom in chart", exact: true })
  55  |     .click();
  56  |   await expect
  57  |     .poll(async () => {
  58  |       const value = await viewport(chart);
  59  |       return value.to - value.from;
  60  |     })
  61  |     .toBeLessThan((fitted.to - fitted.from) * 0.6);
  62  |   const beforePan = await viewport(chart);
  63  |   const bounds = await chart.boundingBox();
  64  |   expect(bounds).not.toBeNull();
  65  |   const x = bounds!.x + bounds!.width * 0.45;
  66  |   const y = bounds!.y + bounds!.height * 0.45;
  67  |   await page.mouse.move(x, y);
  68  |   await page.mouse.down();
  69  |   await page.mouse.move(x + 100, y, { steps: 12 });
  70  |   await page.mouse.up();
  71  |   await page.mouse.move(bounds!.x + 5, bounds!.y - 5);
  72  |   await expect
  73  |     .poll(async () => Math.abs((await viewport(chart)).from - beforePan.from))
> 74  |     .toBeGreaterThan(1);
      |      ^ Error: expect(received).toBeGreaterThan(expected)
  75  |   return viewport(chart);
  76  | }
  77  | 
  78  | test("manual snapshot refresh updates prices and appends bars without moving an inspected chart", async ({
  79  |   page,
  80  | }) => {
  81  |   let payload = bars();
  82  |   let requests = 0;
  83  |   await mockMarket(page, () => {
  84  |     requests++;
  85  |     return payload;
  86  |   });
  87  |   await page.goto("/");
  88  |   const chart = page.locator(".chart-canvas");
  89  |   await expect(chart).toHaveAttribute("data-bars-count", "80");
  90  |   const originalCanvas = await chart.locator("canvas").first().elementHandle();
  91  |   const inspected = await zoomAndPan(page, chart);
  92  |   const initialRequests = requests;
  93  | 
  94  |   payload = structuredClone(payload);
  95  |   payload.bars[79].close = 81.654321;
  96  |   await page.getByRole("button", { name: "Refresh market snapshot" }).click();
  97  |   await expect.poll(() => requests).toBeGreaterThan(initialRequests);
  98  |   await page.getByRole("button", { name: "View data", exact: true }).click();
  99  |   await expect(page.locator(".chart-data tbody tr").last()).toContainText(
  100 |     "81.65",
  101 |   );
  102 |   await expectRange(chart, inspected);
  103 |   expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(
  104 |     true,
  105 |   );
  106 |   await page.getByRole("button", { name: "Hide data", exact: true }).click();
  107 |   await expectRange(chart, inspected);
  108 |   await page.screenshot({
  109 |     path: "docs/evidence/chart-preserved-viewport.png",
  110 |     fullPage: true,
  111 |   });
  112 | 
  113 |   const last = payload.bars.at(-1)!;
  114 |   payload = {
  115 |     ...payload,
  116 |     bars: [...payload.bars, { ...last, time: last.time + 300000 }],
  117 |   };
  118 |   await page.getByRole("button", { name: "Refresh market snapshot" }).click();
  119 |   await expect(chart).toHaveAttribute("data-bars-count", "81");
  120 |   await expect(chart).toHaveAttribute(
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
```