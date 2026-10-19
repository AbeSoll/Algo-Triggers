export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface Condition {
  id: string;
  metric:
    "price" | "percent_change" | "sma_cross" | "ema_cross" | "option_premium";
  operator: "crosses_above" | "crosses_below" | "above" | "below";
  threshold: number;
  period: number;
  slowPeriod: number;
  windowBars: number;
  optionType?: "call" | "put";
  strike?: number;
  priceField?: "bid" | "ask" | "last" | "mark";
  optionExpiry?: string;
  optionUnderlying?: string;
}
export interface Rule {
  id: string;
  version: number;
  name: string;
  instrument: string;
  join: "AND" | "OR";
  conditions: Condition[];
  cooldownMinutes: number;
  frequency: "crossing" | "bar" | "once";
  status: "draft" | "monitoring" | "paused";
  createdAt: string;
  timeframe?: "5m" | "15m" | "1h";
}
export interface TriggerEvent {
  id: string;
  ruleId: string;
  ruleVersion: number;
  ruleName: string;
  instrument: string;
  time: number;
  price: number;
  mode: "historical" | "demo";
  timeframe?: "5m" | "15m" | "1h";
  diagnostics: {
    label: string;
    actual: number | null;
    reference: number | null;
    met: boolean | null;
  }[];
}
export interface ReplayResult {
  events: TriggerEvent[];
  eligibleBars: number;
  totalBars: number;
  triggerPeriodPct: number;
  meanGapMinutes: number | null;
}
