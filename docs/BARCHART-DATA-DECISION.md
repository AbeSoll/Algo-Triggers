### Barchart website acquisition decision (10 November 2026)

The team intends website scripting rather than an existing OnDemand subscription. Barchart's published terms prohibit data-mining/robot extraction tools and describe download/RAM permissions in a personal, non-commercial context. Treat department automation as requiring permission or a suitable data agreement; do not assume no persistence makes it permitted. Website extraction is not enabled in this release.

Official chart help lists futures/forex delays of 10-15 minutes. That article is dated July 2020 and is not a guarantee for every current product, option field or account. Verify the exact page and its observation timestamp. A new fetch time does not mean a new quote, and polling cannot remove source delay. Greeks may update on a different schedule from the underlying price.

**Proposed low-storage pipeline, conditional on authorised access:** poll within permitted limits; parse explicit contract/expiry/strike/side, field/unit and as-of time; validate; replace the latest in-memory snapshot; evaluate an eligible rule; emit a deduplicated alert. Do not append every quote to a historical database. Retain a bounded RAM buffer only where a crossing, moving average or chart window needs history. A latest-value-only feed cannot reconstruct earlier candles or reliably detect a crossing without previous state.

**Persistence choice:** keep rule configuration and minimum trigger/email evidence if permitted. Storing a triggering value is still storing market data, even if the entire feed is not archived. Strict zero-market-data persistence must omit operand values from database, email and logs and loses numeric replay/audit evidence. Emailing a value is another disclosure/persistence path. This is an open team/provider decision, not an implemented change to the existing database. Existing records are preserved.

**Restart and failure:** clear in-memory quotes at restart; warm up dependent rules before evaluation; show unavailable until a valid observation arrives. Persisting cooldown/event IDs can prevent duplicate alerts without a quote archive. Define whether a first observed TRUE emits or waits for a new transition. Use observation age, not fetch age, for freshness. If delayed data exceeds a rule's maximum age, return NOT_EVALUABLE; never silently relax freshness to make a delayed feed pass.

**Sources:**

- [Barchart terms](https://www.barchart.com/terms)
- [Barchart chart timing help](https://help.barchart.com/support/solutions/articles/242750-are-barchart-com-charts-in-real-time-)
- [Authorised chart-history interface](https://www.barchart.com/ondemand/api/getHistory)
- [Authorised futures-options interface](https://www.barchart.com/ondemand/api/getFuturesOptions)
