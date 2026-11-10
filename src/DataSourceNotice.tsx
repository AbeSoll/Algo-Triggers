import type { DataMeta, MarketMode } from "./api";
import { useEffect, useState } from "react";
import { timestamp } from "./ui";

export default function DataSourceNotice({
  mode,
  meta,
  loading = false,
  label = "Market data",
}: {
  mode: MarketMode;
  meta?: DataMeta;
  loading?: boolean;
  label?: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const quoteAge = meta?.observedAt
    ? Date.now() - Date.parse(meta.observedAt)
    : null;
  const age =
    quoteAge === null
      ? "Unknown"
      : quoteAge < 0
        ? "Ahead of device clock"
        : quoteAge < 60000
          ? "Under 1 min"
          : `${Math.floor(quoteAge / 60000)} min`;
  return (
    <div
      className="data-source-notice"
      role="note"
      aria-label={`${label} provenance`}
    >
      <strong>
        {mode === "demo"
          ? "Sample sample · synthetic"
          : loading
            ? "Loading Yahoo snapshot…"
            : meta?.status === "available"
              ? "Yahoo Finance snapshot"
              : "Yahoo data unavailable"}
      </strong>
      <span>
        {mode === "demo" ? (
          "Illustrative fixtures · no market feed"
        ) : (
          <>
            {meta?.symbol && `${meta.symbol} · `}
            {label === "Options"
              ? "Underlying quote time"
              : "Quote/bar time"}:{" "}
            {meta?.observedAt
              ? `${timestamp(Date.parse(meta.observedAt))} UTC`
              : "Not supplied"}
            {meta?.fetchedAt &&
              ` · Fetched ${timestamp(Date.parse(meta.fetchedAt))} UTC`}{" "}
            · Delay unverified · Quote/bar age: {age}
          </>
        )}
      </span>
    </div>
  );
}
