import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { DEMO_ONLY } from "./deployment";
import { instruments } from "./fixtures";
import {
  PILOT_ENGINE_VERSION,
  PILOT_FIELD_SPECS,
  evaluatePilotRule,
  makeDefaultSeedPilotRule,
  runControlledScenarioTests,
  summarizePilotRule,
  validateObservationInput,
  validatePilotRuleDraft,
  type PilotCondition,
  type PilotConditionDiagnostic,
  type PilotDataMode,
  type PilotEmissionPolicy,
  type PilotEvalOutcome,
  type PilotFieldId,
  type PilotNotificationState,
  type PilotObservation,
  type PilotOperator,
  type PilotRuleDefinition,
  type PilotTestSuiteResult,
} from "./pilotDomain";
import { Empty, Modal, getLocalTzLabel, timestamp } from "./ui";

interface PilotRuleVersionRecord {
  id: string;
  version: number;
  definition: PilotRuleDefinition;
  summary: string;
  mode: PilotDataMode;
  scheduleSeconds: number;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface PilotRuleRecord {
  id: string;
  name: string;
  scenario: string;
  instrument: string;
  status: string;
  latestVersion: number;
  activeVersion: number | null;
  owner: string;
  updatedAt: string;
  versions: PilotRuleVersionRecord[];
  latestEvaluation: {
    id: string;
    ruleVersion: number;
    evaluatedAt: string;
    outcome: PilotEvalOutcome;
    shouldEmit: boolean;
    reason: string;
    engineVersion: string;
    diagnostics: PilotConditionDiagnostic[];
  } | null;
}

interface PilotNotificationItem {
  id: string;
  recipient: string;
  state: PilotNotificationState;
  attemptsCount: number;
  lastError: string | null;
  updatedAt: string;
  attempts: {
    attempt_no: number;
    started_at: string;
    completed_at: string;
    state: string;
    provider_reference: string | null;
    safe_error: string | null;
  }[];
}

interface PilotEventRecord {
  id: string;
  evaluationId: string;
  ruleId: string;
  ruleVersion: number;
  ruleName: string;
  instrument: string;
  triggeredAt: string;
  mode: PilotDataMode;
  evidence: {
    ruleId: string;
    ruleName: string;
    scenario: string;
    ruleVersion: number;
    summary: string;
    instrument: string;
    mode: PilotDataMode;
    engineVersion: string;
    evaluatedAt: string;
    diagnostics: PilotConditionDiagnostic[];
  };
  notifications: PilotNotificationItem[];
}

interface PilotOverviewPayload {
  success: boolean;
  service: string;
  engineVersion: string;
  mode: PilotDataMode;
  smtpConfigured: boolean;
  defaultRecipient: string;
  worker: {
    status: string;
    lastHeartbeatAt: string | null;
    lastEvaluationAt: string | null;
    lastError: string | null;
    missedIntervals: number;
    startedAt: string | null;
  };
  activeRulesCount: number;
  outboxAttentionCount: number;
  unknownNotificationsCount: number;
  rules: PilotRuleRecord[];
  observations: PilotObservation[];
  events: PilotEventRecord[];
  evaluations: {
    id: string;
    ruleId: string;
    ruleVersion: number;
    evaluatedAt: string;
    outcome: PilotEvalOutcome;
    shouldEmit: boolean;
    reason: string;
    engineVersion: string;
  }[];
  audit: {
    id: string;
    actor: string;
    role: string;
    action: string;
    target: string;
    outcome: string;
    details: string;
    createdAt: string;
  }[];
}

function buildLocalSeedOverview(): PilotOverviewPayload {
  const now = new Date().toISOString();
  const obsIso = new Date(Date.now() - 120_000).toISOString();
  const def = makeDefaultSeedPilotRule();
  const summary = summarizePilotRule(def);
  return {
    success: true,
    service: "HedgeSignal Pilot (Local sample session)",
    engineVersion: PILOT_ENGINE_VERSION,
    mode: "SYNTHETIC",
    smtpConfigured: false,
    defaultRecipient: "pilot-alerts@example.com",
    worker: {
      status: "BROWSER_SANDBOX",
      lastHeartbeatAt: now,
      lastEvaluationAt: null,
      lastError: null,
      missedIntervals: 0,
      startedAt: now,
    },
    activeRulesCount: 0,
    outboxAttentionCount: 0,
    unknownNotificationsCount: 0,
    rules: [
      {
        id: "pilot-rule-br-ex-01",
        name: def.scenario,
        scenario: def.scenario,
        instrument: def.instrument,
        status: "VALIDATED",
        latestVersion: 1,
        activeVersion: null,
        owner: "trading-pilot",
        updatedAt: now,
        versions: [
          {
            id: "pilot-rule-br-ex-01:v1",
            version: 1,
            definition: def,
            summary,
            mode: def.mode,
            scheduleSeconds: def.scheduleSeconds,
            createdBy: "team-member",
            approvedBy: null,
            approvedAt: null,
            createdAt: now,
          },
        ],
        latestEvaluation: null,
      },
    ],
    observations: [
      {
        id: "seed-obs-1",
        sourceId: "synthetic-seed-fixture",
        instrument: "brent-dec26",
        fieldId: "reference_price",
        specialization: "MARKET",
        valueDecimal: "75.00",
        unit: "USD/bbl",
        observedAt: obsIso,
        receivedAt: now,
        mode: "SYNTHETIC",
        quality: "VALID",
        quarantineReason: null,
      },
    ],
    events: [],
    evaluations: [],
    audit: [
      {
        id: "seed-audit-1",
        actor: "system-seed",
        role: "system",
        action: "SEED_PILOT_BASELINE",
        target: "pilot-rule-br-ex-01:v1",
        outcome: "ALLOWED",
        details: "Initialised BR-EX-01 synthetic scenario in browser sandbox.",
        createdAt: now,
      },
    ],
  };
}

function outcomeBadgeClass(outcome: string): string {
  if (outcome === "TRUE" || outcome === "ACCEPTED" || outcome === "ALLOWED")
    return "badge badge-green";
  if (
    outcome === "NOT_EVALUABLE" ||
    outcome === "HELD" ||
    outcome === "UNKNOWN" ||
    outcome === "PAUSED" ||
    outcome === "QUARANTINED"
  )
    return "badge badge-amber";
  if (outcome === "ACTIVE" || outcome === "VALIDATED")
    return "badge badge-purple";
  return "badge";
}

function formatDualTime(
  iso: string | null | undefined,
  tzMode: "UTC" | "LOCAL_AND_UTC",
): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const utc = `${timestamp(ms, "UTC")} UTC`;
  if (tzMode === "UTC") return utc;
  return `${timestamp(ms, "local")} ${getLocalTzLabel()} (${utc})`;
}

export default function PilotDesk({
  onStatus,
}: {
  onStatus: (message: string) => void;
}) {
  const role = "team_member";
  const [screen, setScreen] = useState<"monitor" | "inputs" | "history">(
    "monitor",
  );
  const [tzMode, setTzMode] = useState<"UTC" | "LOCAL_AND_UTC">("UTC");
  const [overview, setOverview] = useState<PilotOverviewPayload>(
    buildLocalSeedOverview,
  );
  const [connected, setConnected] = useState(!DEMO_ONLY);
  const [loading, setLoading] = useState(!DEMO_ONLY);
  const [errorBanner, setErrorBanner] = useState("");
  const [subTab, setSubTab] = useState<"events" | "evaluations" | "audit">(
    "events",
  );
  const [notifFilter, setNotifFilter] = useState("ALL");

  // Observation capture state
  const [obsField, setObsField] = useState<PilotFieldId>("reference_price");
  const [obsValue, setObsValue] = useState("74.50");
  const [obsUnit, setObsUnit] = useState("USD/bbl");
  const [obsInstrument, setObsInstrument] = useState("brent-dec26");
  const [obsSource, setObsSource] = useState("synthetic-manual-entry");
  const [obsError, setObsError] = useState("");

  // Modals
  const [editingRule, setEditingRule] = useState<{
    ruleId?: string;
    name: string;
    definition: PilotRuleDefinition;
  } | null>(null);
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [testModal, setTestModal] = useState<{
    ruleName: string;
    version: number;
    suite: PilotTestSuiteResult;
  } | null>(null);
  const [eventModal, setEventModal] = useState<PilotEventRecord | null>(null);

  const actorHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "X-Pilot-Actor": `${role}-desk`,
    }),
    [role],
  );

  const loadOverview = useCallback(async () => {
    if (DEMO_ONLY) {
      setConnected(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/pilot/overview", {
        headers: actorHeaders,
      });
      const payload = await response.json();
      if (!response.ok || payload?.success !== true) {
        setConnected(false);
      } else {
        setOverview(payload);
        setConnected(true);
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [actorHeaders]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function callPilotApi<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: "POST",
      headers: actorHeaders,
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || payload?.success !== true) {
      throw new Error(payload?.error || "Operation failed.");
    }
    return payload as T;
  }

  function handleFieldSelect(nextField: PilotFieldId) {
    setObsField(nextField);
    setObsUnit(PILOT_FIELD_SPECS[nextField].allowedUnits[0]);
    setObsError("");
  }

  async function submitObservation(e: React.FormEvent) {
    e.preventDefault();
    setObsError("");
    const nowIso = new Date().toISOString();
    const spec = PILOT_FIELD_SPECS[obsField];
    const payload = {
      sourceId: obsSource,
      instrument: spec.requiresInstrument
        ? obsInstrument
        : obsInstrument || null,
      fieldId: obsField,
      valueDecimal: obsValue,
      unit: obsUnit,
      observedAt: nowIso,
      receivedAt: nowIso,
      mode: "SYNTHETIC" as const,
    };

    if (connected && !DEMO_ONLY) {
      try {
        await callPilotApi("/api/pilot/observations", payload);
        await loadOverview();
        onStatus(
          `Recorded synthetic ${obsField} observation (${obsValue} ${obsUnit}).`,
        );
      } catch (err) {
        setObsError(
          err instanceof Error ? err.message : "Invalid observation.",
        );
        await loadOverview();
      }
      return;
    }

    const validated = validateObservationInput(payload);
    if (!validated.valid || !validated.observation) {
      setObsError(validated.error ?? "Invalid observation.");
      return;
    }
    setOverview((prev) => ({
      ...prev,
      observations: [validated.observation!, ...prev.observations],
    }));
    onStatus(
      `Recorded local synthetic ${obsField} observation (${obsValue} ${obsUnit}).`,
    );
  }

  async function openControlledTests(rule: PilotRuleRecord) {
    const version = rule.activeVersion ?? rule.latestVersion;
    if (connected && !DEMO_ONLY) {
      try {
        const res = await callPilotApi<{
          version: number;
          suite: PilotTestSuiteResult;
        }>("/api/pilot/test-runs", {
          ruleId: rule.id,
          version,
        });
        setTestModal({
          ruleName: rule.name,
          version: res.version,
          suite: res.suite,
        });
        await loadOverview();
      } catch (err) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : "Could not run controlled tests.",
        );
      }
      return;
    }
    const targetVersion =
      rule.versions.find((v) => v.version === version) ?? rule.versions[0];
    const suite = runControlledScenarioTests(targetVersion.definition);
    setTestModal({
      ruleName: rule.name,
      version: targetVersion.version,
      suite,
    });
  }

  async function toggleRuleActivation(rule: PilotRuleRecord) {
    setErrorBanner("");
    const isActive = rule.status === "ACTIVE";
    if (connected && !DEMO_ONLY) {
      try {
        if (isActive) {
          const res = await callPilotApi<{ message: string }>(
            "/api/pilot/rules/pause",
            { ruleId: rule.id },
          );
          onStatus(res.message);
        } else {
          const res = await callPilotApi<{ message: string }>(
            "/api/pilot/rules/activate",
            { ruleId: rule.id, expectedVersion: rule.latestVersion },
          );
          onStatus(res.message);
        }
        await loadOverview();
      } catch (err) {
        setErrorBanner(
          err instanceof Error ? err.message : "Rule state transition denied.",
        );
        await loadOverview();
      }
      return;
    }

    setOverview((prev) => {
      const nextRules = prev.rules.map((r) =>
        r.id === rule.id
          ? {
              ...r,
              status: isActive ? "PAUSED" : "ACTIVE",
              activeVersion: isActive ? r.activeVersion : r.latestVersion,
            }
          : r,
      );
      return {
        ...prev,
        activeRulesCount: nextRules.filter((r) => r.status === "ACTIVE").length,
        rules: nextRules,
      };
    });
    onStatus(
      isActive
        ? `Paused local rule "${rule.name}".`
        : `Activated local rule "${rule.name}" · v${rule.latestVersion}.`,
    );
  }

  async function runActiveEvaluationsNow() {
    setErrorBanner("");
    if (connected && !DEMO_ONLY) {
      try {
        const res = await callPilotApi<{
          activeRulesChecked: number;
          emittedCount: number;
        }>("/api/pilot/evaluate", {});
        await loadOverview();
        onStatus(
          `Evaluated ${res.activeRulesChecked} active rule(s); ${res.emittedCount} event(s) emitted.`,
        );
      } catch (err) {
        setErrorBanner(
          err instanceof Error ? err.message : "Evaluation failed.",
        );
        await loadOverview();
      }
      return;
    }

    const nowIso = new Date().toISOString();
    let emitted = 0;
    setOverview((prev) => {
      const newEvents: PilotEventRecord[] = [];
      const newEvals = [...prev.evaluations];
      const nextRules = prev.rules.map((rule) => {
        if (rule.status !== "ACTIVE") return rule;
        const ver =
          rule.versions.find((v) => v.version === rule.activeVersion) ??
          rule.versions[0];
        const priorCount = prev.events.filter(
          (ev) => ev.ruleId === rule.id && ev.ruleVersion === ver.version,
        ).length;
        const result = evaluatePilotRule(ver.definition, prev.observations, {
          evaluationTimeIso: nowIso,
          previousOutcome: rule.latestEvaluation?.outcome ?? null,
          priorEmissionsCount: priorCount,
        });
        const evalId = `local-eval-${crypto.randomUUID().slice(0, 8)}`;
        newEvals.unshift({
          id: evalId,
          ruleId: rule.id,
          ruleVersion: ver.version,
          evaluatedAt: nowIso,
          outcome: result.outcome,
          shouldEmit: result.shouldEmit,
          reason: result.reason,
          engineVersion: result.engineVersion,
        });
        if (result.outcome === "TRUE" && result.shouldEmit) {
          emitted += 1;
          const eventId = `local-evt-${crypto.randomUUID().slice(0, 8)}`;
          newEvents.push({
            id: eventId,
            evaluationId: evalId,
            ruleId: rule.id,
            ruleVersion: ver.version,
            ruleName: rule.name,
            instrument: rule.instrument,
            triggeredAt: nowIso,
            mode: ver.mode,
            evidence: {
              ruleId: rule.id,
              ruleName: rule.name,
              scenario: rule.scenario,
              ruleVersion: ver.version,
              summary: ver.summary,
              instrument: rule.instrument,
              mode: ver.mode,
              engineVersion: result.engineVersion,
              evaluatedAt: nowIso,
              diagnostics: result.diagnostics,
            },
            notifications: ver.definition.recipients.map((rec, i) => ({
              id: `local-ntf-${eventId}-${i}`,
              recipient: rec,
              state: "HELD",
              attemptsCount: 1,
              lastError: "Browser sandbox mode: no external email sent.",
              updatedAt: nowIso,
              attempts: [],
            })),
          });
        }
        return {
          ...rule,
          latestEvaluation: {
            id: evalId,
            ruleVersion: ver.version,
            evaluatedAt: nowIso,
            outcome: result.outcome,
            shouldEmit: result.shouldEmit,
            reason: result.reason,
            engineVersion: result.engineVersion,
            diagnostics: result.diagnostics,
          },
        };
      });
      return {
        ...prev,
        rules: nextRules,
        evaluations: newEvals.slice(0, 25),
        events: [...newEvents, ...prev.events],
      };
    });
    onStatus(`Local pilot evaluation finished (${emitted} event(s) recorded).`);
  }

  async function saveEditorRule(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRule) return;
    const validation = validatePilotRuleDraft(editingRule.definition);
    if (!validation.valid) {
      setRuleErrors(validation.errors);
      return;
    }
    setRuleErrors([]);

    if (connected && !DEMO_ONLY) {
      try {
        const res = await callPilotApi<{ version: number }>(
          "/api/pilot/rules",
          {
            ruleId: editingRule.ruleId,
            name: editingRule.name,
            definition: editingRule.definition,
          },
        );
        setEditingRule(null);
        await loadOverview();
        onStatus(
          `Saved immutable rule "${editingRule.name}" · v${res.version}.`,
        );
      } catch (err) {
        setRuleErrors([
          err instanceof Error ? err.message : "Could not save rule version.",
        ]);
      }
      return;
    }

    const now = new Date().toISOString();
    const summary = summarizePilotRule(editingRule.definition);
    if (editingRule.ruleId) {
      setOverview((prev) => ({
        ...prev,
        rules: prev.rules.map((r) => {
          if (r.id !== editingRule.ruleId) return r;
          const nextVer = r.latestVersion + 1;
          return {
            ...r,
            name: editingRule.name,
            scenario: editingRule.definition.scenario,
            instrument: editingRule.definition.instrument,
            latestVersion: nextVer,
            updatedAt: now,
            versions: [
              {
                id: `${r.id}:v${nextVer}`,
                version: nextVer,
                definition: structuredClone(editingRule.definition),
                summary,
                mode: editingRule.definition.mode,
                scheduleSeconds: editingRule.definition.scheduleSeconds,
                createdBy: `${role}-desk`,
                approvedBy: null,
                approvedAt: null,
                createdAt: now,
              },
              ...r.versions,
            ],
          };
        }),
      }));
      onStatus(`Saved local draft version for "${editingRule.name}".`);
    } else {
      const newId = `local-rule-${crypto.randomUUID().slice(0, 6)}`;
      setOverview((prev) => ({
        ...prev,
        rules: [
          {
            id: newId,
            name: editingRule.name,
            scenario: editingRule.definition.scenario,
            instrument: editingRule.definition.instrument,
            status: "VALIDATED",
            latestVersion: 1,
            activeVersion: null,
            owner: `${role}-desk`,
            updatedAt: now,
            versions: [
              {
                id: `${newId}:v1`,
                version: 1,
                definition: structuredClone(editingRule.definition),
                summary,
                mode: editingRule.definition.mode,
                scheduleSeconds: editingRule.definition.scheduleSeconds,
                createdBy: `${role}-desk`,
                approvedBy: null,
                approvedAt: null,
                createdAt: now,
              },
            ],
            latestEvaluation: null,
          },
          ...prev.rules,
        ],
      }));
      onStatus(`Created local scenario "${editingRule.name}" · v1.`);
    }
    setEditingRule(null);
  }

  async function handleRetryNotification(intentId: string) {
    setErrorBanner("");
    try {
      const res = await callPilotApi<{ state: string }>(
        "/api/pilot/notifications/retry",
        { intentId },
      );
      await loadOverview();
      onStatus(`Notification retry completed with state ${res.state}.`);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Notification retry rejected.",
      );
      await loadOverview();
    }
  }

  async function handleReconcileNotification(
    intentId: string,
    resolution: "MARK_ACCEPTED" | "AUTHORISE_RETRY",
  ) {
    setErrorBanner("");
    try {
      const res = await callPilotApi<{ message: string }>(
        "/api/pilot/notifications/reconcile",
        {
          intentId,
          resolution,
          note: `Reconciled via HedgeSignal desk (${role}).`,
        },
      );
      await loadOverview();
      onStatus(res.message);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Reconciliation rejected.",
      );
      await loadOverview();
    }
  }

  const filteredEvents = useMemo(
    () =>
      overview.events.filter((ev) => {
        if (notifFilter === "ALL") return true;
        return ev.notifications.some((n) => n.state === notifFilter);
      }),
    [overview.events, notifFilter],
  );

  return (
    <div className="pilot-workspace">
      <aside className="data-source-notice" aria-label="HedgeSignal notice">
        <strong>
          HedgeSignal ·{" "}
          {connected ? "Monitoring service connected" : "Local sample session"}
        </strong>
        <span>
          {connected
            ? `Mode: ${overview.mode} · Engine ${overview.engineVersion} · SMTP ${overview.smtpConfigured ? "configured" : "outbox hold mode"}. Human review required; no orders are placed.`
            : "Service unavailable. This session uses synthetic inputs; changes are not saved to the server. Reconnect before scheduled monitoring or email delivery."}
        </span>
      </aside>

      {errorBanner && (
        <div className="error-message" role="alert">
          <AlertTriangle size={16} />
          <span>{errorBanner}</span>
        </div>
      )}

      <div className="research-summary">
        <div>
          <span className="small muted">SERVICE & WORKER</span>
          <strong>
            {overview.worker.status}
            <small>
              {overview.worker.missedIntervals > 0
                ? `${overview.worker.missedIntervals} gap(s) disclosed`
                : "heartbeat nominal"}
            </small>
          </strong>
        </div>
        <div>
          <span className="small muted">SCENARIOS</span>
          <strong>
            {overview.activeRulesCount}
            <small>active of {overview.rules.length}</small>
          </strong>
        </div>
        <div>
          <span className="small muted">EMAIL OUTBOX</span>
          <strong>
            {overview.outboxAttentionCount}
            <small>pending / held / failed</small>
          </strong>
        </div>
        <div className="pilot-controls-inline">
          <label className="field">
            Time display
            <select
              value={tzMode}
              onChange={(e) =>
                setTzMode(e.target.value as "UTC" | "LOCAL_AND_UTC")
              }
            >
              <option value="UTC">UTC only</option>
              <option value="LOCAL_AND_UTC">
                Local ({getLocalTzLabel()}) + UTC
              </option>
            </select>
          </label>
        </div>
      </div>

      <nav className="desk-actions" aria-label="Workspace sections">
        <button
          className="btn btn-outline"
          aria-pressed={screen === "monitor"}
          onClick={() => setScreen("monitor")}
        >
          Monitor
        </button>
        <button
          className="btn btn-outline"
          aria-pressed={screen === "inputs"}
          onClick={() => setScreen("inputs")}
        >
          Inputs
        </button>
        <button
          className="btn btn-outline"
          aria-pressed={screen === "history"}
          onClick={() => setScreen("history")}
        >
          History &amp; email
        </button>
      </nav>
      <p className="hint">
        One shared team workspace. Barchart data connection is not configured.
      </p>
      {/* Section 1: Pilot Rules & 4-Valued Evaluation Monitor */}
      <section className="panel" hidden={screen !== "monitor"}>
        <div className="panel-heading">
          <div>
            <h2>
              Versioned hedging scenarios{" "}
              <span className="count-label">{overview.rules.length}</span>
            </h2>
            <p>
              Configure a scenario, test its conditions, then start monitoring.
              Open the recorded result to see why it matched or could not be
              evaluated.
            </p>
          </div>
          <div className="desk-actions">
            <button
              className="btn btn-outline"
              onClick={() =>
                setEditingRule({
                  name: "Custom hedging scenario",
                  definition: {
                    ...makeDefaultSeedPilotRule(),
                    recipients: [overview.defaultRecipient],
                  },
                })
              }
            >
              <Plus size={15} /> New scenario
            </button>
            <button
              className="btn btn-primary"
              onClick={runActiveEvaluationsNow}
            >
              <Play size={14} /> Evaluate active rules
            </button>
            {!DEMO_ONLY && (
              <button
                className="icon-button"
                aria-label="Refresh monitoring status"
                onClick={() => void loadOverview()}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "spinner" : ""} />
              </button>
            )}
          </div>
        </div>

        <div
          className="table-wrap"
          role="region"
          aria-label="Versioned hedging scenarios table"
          tabIndex={0}
        >
          <table className="rules-table">
            <caption className="sr-only">
              HedgeSignal scenarios, evaluation outcomes and lifecycle controls
            </caption>
            <thead>
              <tr>
                <th>Scenario & version</th>
                <th>Lifecycle</th>
                <th>Latest 4-valued evaluation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview.rules.map((rule) => {
                const latestVer =
                  rule.versions.find((v) => v.version === rule.latestVersion) ??
                  rule.versions[0];
                const ev = rule.latestEvaluation;
                return (
                  <tr key={rule.id}>
                    <td>
                      <strong>
                        {rule.name} <small>v{rule.latestVersion}</small>
                      </strong>
                      <p className="rule-summary">{latestVer?.summary}</p>
                      <span className="table-meta">
                        Updated {formatDualTime(rule.updatedAt, tzMode)}
                        {latestVer?.approvedBy
                          ? ` · Activated by ${latestVer.approvedBy}`
                          : " · Not activated"}
                      </span>
                    </td>
                    <td>
                      <span className={outcomeBadgeClass(rule.status)}>
                        {rule.status}
                        {rule.activeVersion ? ` (v${rule.activeVersion})` : ""}
                      </span>
                    </td>
                    <td>
                      {ev ? (
                        <div>
                          <span className={outcomeBadgeClass(ev.outcome)}>
                            {ev.outcome}
                          </span>
                          <p className="rule-summary">{ev.reason}</p>
                          <span className="table-meta">
                            v{ev.ruleVersion} ·{" "}
                            {formatDualTime(ev.evaluatedAt, tzMode)}
                          </span>
                        </div>
                      ) : (
                        <span className="table-meta">
                          Not yet evaluated — run controlled test or activate
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        className="row-actions"
                        role="group"
                        aria-label={`Scenario actions for ${rule.name}`}
                      >
                        <div className="rule-primary-actions">
                          <button
                            className="btn btn-outline btn-small"
                            onClick={() => void openControlledTests(rule)}
                          >
                            <CheckCircle2 size={14} /> Controlled test
                          </button>
                          <button
                            className="btn btn-outline btn-small"
                            onClick={() => void toggleRuleActivation(rule)}
                          >
                            {rule.status === "ACTIVE" ? (
                              <>
                                <Pause size={14} /> Pause
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={14} /> Activate v
                                {rule.latestVersion}
                              </>
                            )}
                          </button>
                        </div>
                        <div className="rule-secondary-actions">
                          <button
                            className="text-button"
                            onClick={() =>
                              latestVer &&
                              setEditingRule({
                                ruleId: rule.id,
                                name: rule.name,
                                definition: structuredClone(
                                  latestVer.definition,
                                ),
                              })
                            }
                          >
                            <SlidersHorizontal size={14} /> New version
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Input Observations & Freshness Gate (UC-02, EERD) */}
      <section className="panel" hidden={screen !== "inputs"}>
        <div className="panel-heading">
          <div>
            <h2>
              Validated observations & freshness{" "}
              <span className="count-label">
                {overview.observations.length}
              </span>
            </h2>
            <p>
              Market and business inputs; invalid or future-dated inputs are
              rejected or quarantined, never converted to zero.
            </p>
          </div>
        </div>

        <form
          className="pilot-obs-form"
          onSubmit={submitObservation}
          noValidate
        >
          <label className="field">
            Candidate field
            <select
              value={obsField}
              onChange={(e) =>
                handleFieldSelect(e.target.value as PilotFieldId)
              }
            >
              {Object.values(PILOT_FIELD_SPECS).map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.id} ({spec.specialization})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Exact decimal value
            <input
              value={obsValue}
              onChange={(e) => setObsValue(e.target.value)}
              placeholder="e.g. 74.50"
            />
          </label>
          <label className="field">
            Unit
            <select
              value={obsUnit}
              onChange={(e) => setObsUnit(e.target.value)}
            >
              {PILOT_FIELD_SPECS[obsField].allowedUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              <option value="USD/share">USD/share</option>
            </select>
          </label>
          <label className="field">
            Contract / scope
            <select
              value={obsInstrument}
              onChange={(e) => setObsInstrument(e.target.value)}
            >
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.label}
                </option>
              ))}
              <option value="portfolio-hedge">Portfolio hedge scope</option>
            </select>
          </label>
          <label className="field">
            Provenance source ID
            <input
              value={obsSource}
              onChange={(e) => setObsSource(e.target.value)}
            />
          </label>
          <div className="pilot-obs-submit">
            <button type="submit" className="btn btn-outline">
              Record synthetic input
            </button>
          </div>
        </form>

        {obsError && (
          <div className="error-message" role="alert">
            {obsError}
          </div>
        )}

        <div
          className="table-wrap"
          role="region"
          aria-label="Recorded observations table"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">
              Recorded observations and quality status
            </caption>
            <thead>
              <tr>
                <th>Field & input category</th>
                <th>Value & unit</th>
                <th>Instrument / scope</th>
                <th>Provenance & mode</th>
                <th>Observed time</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {overview.observations.slice(0, 8).map((obs) => (
                <tr key={obs.id}>
                  <td>
                    <strong>{obs.fieldId}</strong>{" "}
                    <span className="badge">{obs.specialization}</span>
                  </td>
                  <td>
                    <code>
                      {obs.valueDecimal} {obs.unit}
                    </code>
                  </td>
                  <td>{obs.instrument ?? "Business scope"}</td>
                  <td>
                    {obs.sourceId} · <small>{obs.mode}</small>
                  </td>
                  <td>{formatDualTime(obs.observedAt, tzMode)}</td>
                  <td>
                    <span className={outcomeBadgeClass(obs.quality)}>
                      {obs.quality}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Events, Outbox Reconciliation, Evaluation Log & Audit Trail */}
      <section className="panel" hidden={screen !== "history"}>
        <div className="panel-heading">
          <div className="view-switch" aria-label="Evidence views">
            <button
              aria-pressed={subTab === "events"}
              className={subTab === "events" ? "active" : ""}
              onClick={() => setSubTab("events")}
            >
              Trigger events & email outbox ({overview.events.length})
            </button>
            <button
              aria-pressed={subTab === "evaluations"}
              className={subTab === "evaluations" ? "active" : ""}
              onClick={() => setSubTab("evaluations")}
            >
              Evaluation log ({overview.evaluations.length})
            </button>
            <button
              aria-pressed={subTab === "audit"}
              className={subTab === "audit" ? "active" : ""}
              onClick={() => setSubTab("audit")}
            >
              Audit trail ({overview.audit.length})
            </button>
          </div>
          {subTab === "events" && (
            <label className="filter-select">
              <span className="sr-only">Filter notification state</span>
              <select
                value={notifFilter}
                onChange={(e) => setNotifFilter(e.target.value)}
              >
                <option value="ALL">All email states</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="HELD">HELD (outbox)</option>
                <option value="FAILED">FAILED</option>
                <option value="UNKNOWN">UNKNOWN (reconcile)</option>
              </select>
            </label>
          )}
        </div>

        {subTab === "events" &&
          (filteredEvents.length ? (
            <div
              className="table-wrap"
              role="region"
              aria-label="Trigger events and email outbox table"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">
                  Recorded trigger events and email notification delivery
                  reconciliation
                </caption>
                <thead>
                  <tr>
                    <th>Trigger event</th>
                    <th>Triggered time</th>
                    <th>Email outbox status</th>
                    <th>Evidence & support actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td>
                        <strong>
                          {ev.ruleName} <small>v{ev.ruleVersion}</small>
                        </strong>
                        <span className="table-meta">
                          {ev.instrument} · {ev.mode} · {ev.id.slice(0, 14)}
                        </span>
                      </td>
                      <td>{formatDualTime(ev.triggeredAt, tzMode)}</td>
                      <td>
                        {ev.notifications.map((ntf) => (
                          <div key={ntf.id} className="pilot-ntf-row">
                            <span className={outcomeBadgeClass(ntf.state)}>
                              <Mail size={12} /> {ntf.state}
                            </span>
                            <small>
                              {ntf.recipient} ({ntf.attemptsCount} attempt
                              {ntf.attemptsCount === 1 ? "" : "s"})
                            </small>
                            {ntf.lastError && (
                              <span className="table-meta">
                                {ntf.lastError}
                              </span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn btn-outline btn-small"
                            onClick={() => setEventModal(ev)}
                          >
                            Inspect evidence <ArrowUpRight size={13} />
                          </button>
                          {connected &&
                            ev.notifications.map((ntf) => (
                              <span key={ntf.id} className="pilot-support-btns">
                                {(ntf.state === "FAILED" ||
                                  ntf.state === "HELD") && (
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      void handleRetryNotification(ntf.id)
                                    }
                                  >
                                    Retry email
                                  </button>
                                )}
                                {ntf.state === "UNKNOWN" && (
                                  <>
                                    <button
                                      className="text-button"
                                      onClick={() =>
                                        void handleReconcileNotification(
                                          ntf.id,
                                          "MARK_ACCEPTED",
                                        )
                                      }
                                    >
                                      Mark accepted
                                    </button>
                                    <button
                                      className="text-button"
                                      onClick={() =>
                                        void handleReconcileNotification(
                                          ntf.id,
                                          "AUTHORISE_RETRY",
                                        )
                                      }
                                    >
                                      Authorise retry
                                    </button>
                                  </>
                                )}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No trigger events recorded yet">
              Activate a validated scenario and press Evaluate active rules to
              record durable trigger evidence and email outbox intents.
            </Empty>
          ))}

        {subTab === "evaluations" &&
          (overview.evaluations.length ? (
            <div
              className="table-wrap"
              role="region"
              aria-label="Rule evaluations log table"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">
                  Recorded 4-valued rule evaluations
                </caption>
                <thead>
                  <tr>
                    <th>Evaluated time</th>
                    <th>Rule & version</th>
                    <th>Outcome</th>
                    <th>Emitted</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.evaluations.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDualTime(item.evaluatedAt, tzMode)}</td>
                      <td>
                        {item.ruleId} · v{item.ruleVersion}
                      </td>
                      <td>
                        <span className={outcomeBadgeClass(item.outcome)}>
                          {item.outcome}
                        </span>
                      </td>
                      <td>{item.shouldEmit ? "Yes" : "No"}</td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No evaluations logged yet">
              Run Evaluate active rules to log TRUE, FALSE, NOT_EVALUABLE or
              ERROR outcomes.
            </Empty>
          ))}

        {subTab === "audit" && (
          <div
            className="table-wrap"
            role="region"
            aria-label="Security and operational audit trail table"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">
                Append-only security and operational audit trail
              </caption>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Recorded by</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Outcome</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {overview.audit.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDualTime(entry.createdAt, tzMode)}</td>
                    <td>
                      <strong>{entry.actor}</strong>{" "}
                    </td>
                    <td>
                      <code>{entry.action}</code>
                    </td>
                    <td>{entry.target}</td>
                    <td>
                      <span className={outcomeBadgeClass(entry.outcome)}>
                        {entry.outcome}
                      </span>
                    </td>
                    <td>{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Controlled Scenario Test Suite Modal (FR-036, BR-EX-01, TC-001..TC-004) */}
      {testModal && (
        <Modal
          title="Controlled pre-activation test suite"
          onClose={() => setTestModal(null)}
          wide
        >
          <h3>
            {testModal.ruleName} · v{testModal.version}
          </h3>
          <p className="hint">{testModal.suite.ruleSummary}</p>
          <div className="result-stats">
            <div>
              <span>Passed cases</span>
              <strong>
                {testModal.suite.passedCount} / {testModal.suite.totalCount}
              </strong>
            </div>
            <div>
              <span>Suite status</span>
              <strong>
                {testModal.suite.allPassed ? "ALL PASSED" : "CHECK FAILURES"}
              </strong>
            </div>
            <div>
              <span>Engine</span>
              <strong>{testModal.suite.engineVersion}</strong>
            </div>
          </div>
          <div
            className="table-wrap"
            role="region"
            aria-label="Controlled scenario test results table"
            tabIndex={0}
          >
            <table>
              <caption>
                Actual versus expected outcomes on synthetic verification
                fixtures
              </caption>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Status</th>
                  <th>Diagnostic</th>
                </tr>
              </thead>
              <tbody>
                {testModal.suite.results.map((item) => (
                  <tr key={item.testCase.id}>
                    <td>
                      <strong>
                        {item.testCase.id}: {item.testCase.name}
                      </strong>
                      <span className="table-meta">
                        {item.testCase.description}
                      </span>
                    </td>
                    <td>
                      <span
                        className={outcomeBadgeClass(
                          item.testCase.expectedOutcome,
                        )}
                      >
                        {item.testCase.expectedOutcome}
                      </span>
                    </td>
                    <td>
                      <span className={outcomeBadgeClass(item.actualOutcome)}>
                        {item.actualOutcome}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          item.passed
                            ? "badge badge-green"
                            : "badge badge-amber"
                        }
                      >
                        {item.passed ? "PASS" : "MISMATCH"}
                      </span>
                    </td>
                    <td>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={() => setTestModal(null)}
            >
              Close test report
            </button>
          </div>
        </Modal>
      )}

      {/* Trigger Event Evidence & Notification Attempt Modal (FR-022, FR-029) */}
      {eventModal && (
        <Modal
          title="Versioned event & delivery evidence"
          onClose={() => setEventModal(null)}
          wide
        >
          <div className="evidence-heading">
            <span className="badge badge-purple">{eventModal.mode} MODE</span>
            <h3>
              {eventModal.ruleName} <small>v{eventModal.ruleVersion}</small>
            </h3>
            <p>
              Event ID: <code>{eventModal.id}</code> · Triggered{" "}
              {formatDualTime(eventModal.triggeredAt, tzMode)}
            </p>
          </div>
          <div className="rule-live-card evidence-explanation">
            <strong>Immutable rule version summary</strong>
            <p>{eventModal.evidence.summary}</p>
            <small>Engine: {eventModal.evidence.engineVersion}</small>
          </div>
          <div
            className="table-wrap"
            role="region"
            aria-label="Condition operands and provenance table"
            tabIndex={0}
          >
            <table>
              <caption>Recorded condition operands and provenance</caption>
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Observed decimal</th>
                  <th>Threshold</th>
                  <th>Source & observed UTC</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {eventModal.evidence.diagnostics.map((d) => (
                  <tr key={d.conditionId}>
                    <td>{d.fieldId}</td>
                    <td>
                      <code>
                        {d.observedDecimal ?? "MISSING"} {d.observedUnit ?? ""}
                      </code>
                    </td>
                    <td>
                      <code>
                        {d.operator} {d.thresholdDecimal} {d.unit}
                      </code>
                    </td>
                    <td>
                      {d.sourceId ?? "—"} ·{" "}
                      {formatDualTime(d.observedAt, tzMode)}
                    </td>
                    <td>
                      <span
                        className={
                          d.met ? "badge badge-green" : "badge badge-amber"
                        }
                      >
                        {d.met ? "TRUE" : "FALSE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="notice">
            Provider acceptance (ACCEPTED) means the mail service accepted the
            submission; it does not assert inbox receipt unless delivery
            confirmation exists.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={() => setEventModal(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Structured Pilot Scenario Editor Modal (FR-011..FR-014) */}
      {editingRule && (
        <Modal
          title={
            editingRule.ruleId
              ? "Save new rule version"
              : "Configure hedging scenario"
          }
          onClose={() => {
            setEditingRule(null);
            setRuleErrors([]);
          }}
          wide
        >
          <form
            className="pilot-rule-form"
            onSubmit={saveEditorRule}
            noValidate
          >
            {ruleErrors.length > 0 && (
              <div className="error-message" role="alert">
                {ruleErrors.join(" ")}
              </div>
            )}
            <div className="pilot-form-grid">
              <label className="field">
                Scenario / rule name
                <input
                  value={editingRule.name}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      name: e.target.value,
                      definition: {
                        ...editingRule.definition,
                        scenario: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="field">
                Primary contract / scope
                <select
                  value={editingRule.definition.instrument}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        instrument: e.target.value,
                      },
                    })
                  }
                >
                  {instruments.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.label}
                    </option>
                  ))}
                  <option value="portfolio-hedge">Portfolio hedge scope</option>
                </select>
              </label>
              <label className="field">
                Data mode
                <select
                  value={editingRule.definition.mode}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        mode: e.target.value as PilotDataMode,
                      },
                    })
                  }
                >
                  <option value="SYNTHETIC">Synthetic inputs</option>
                  <option value="REPLAY">REPLAY (controlled dataset)</option>
                  <option value="AUTHORISED_PILOT">Authorised inputs</option>
                </select>
              </label>
              <label className="field">
                Boolean join
                <select
                  value={editingRule.definition.join}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        join: e.target.value as "AND" | "OR",
                      },
                    })
                  }
                >
                  <option value="AND">AND (all conditions required)</option>
                  <option value="OR">OR (any condition matches)</option>
                </select>
              </label>
              <label className="field">
                Emission policy
                <select
                  value={editingRule.definition.triggerPolicy.emission}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        triggerPolicy: {
                          ...editingRule.definition.triggerPolicy,
                          emission: e.target.value as PilotEmissionPolicy,
                        },
                      },
                    })
                  }
                >
                  <option value="once_per_transition">
                    Once per transition
                  </option>
                  <option value="once">Once per activation</option>
                  <option value="cooldown">Repeat after cooldown</option>
                </select>
              </label>
              <label className="field">
                Cooldown (minutes)
                <input
                  type="number"
                  min={0}
                  value={editingRule.definition.triggerPolicy.cooldownMinutes}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        triggerPolicy: {
                          ...editingRule.definition.triggerPolicy,
                          cooldownMinutes: Number(e.target.value),
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="field">
                Schedule interval (seconds)
                <input
                  type="number"
                  min={10}
                  value={editingRule.definition.scheduleSeconds}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        scheduleSeconds: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label className="field">
                Recipient email(s) (comma-separated)
                <input
                  value={editingRule.definition.recipients.join(", ")}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        recipients: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </label>
            </div>

            <div className="pilot-conditions-section">
              <div className="pilot-conditions-header">
                <strong>Structured conditions</strong>
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  onClick={() => {
                    const nextCond: PilotCondition = {
                      id: `cond-${crypto.randomUUID().slice(0, 6)}`,
                      fieldId: "wapl",
                      operator: ">",
                      thresholdDecimal: "72.00",
                      unit: "USD/bbl",
                      maxAgeSeconds: 86_400,
                    };
                    setEditingRule({
                      ...editingRule,
                      definition: {
                        ...editingRule.definition,
                        conditions: [
                          ...editingRule.definition.conditions,
                          nextCond,
                        ],
                      },
                    });
                  }}
                >
                  <Plus size={14} /> Add condition
                </button>
              </div>
              {editingRule.definition.conditions.map((cond, index) => (
                <div key={cond.id} className="pilot-condition-row">
                  <label className="field">
                    Field {index + 1}
                    <select
                      value={cond.fieldId}
                      onChange={(e) => {
                        const fid = e.target.value as PilotFieldId;
                        const spec = PILOT_FIELD_SPECS[fid];
                        const updated = editingRule.definition.conditions.map(
                          (c) =>
                            c.id === cond.id
                              ? {
                                  ...c,
                                  fieldId: fid,
                                  unit: spec.allowedUnits[0],
                                  maxAgeSeconds: spec.defaultMaxAgeSeconds,
                                }
                              : c,
                        );
                        setEditingRule({
                          ...editingRule,
                          definition: {
                            ...editingRule.definition,
                            conditions: updated,
                          },
                        });
                      }}
                    >
                      {Object.values(PILOT_FIELD_SPECS).map((spec) => (
                        <option key={spec.id} value={spec.id}>
                          {spec.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Operator {index + 1}
                    <select
                      value={cond.operator}
                      onChange={(e) => {
                        const updated = editingRule.definition.conditions.map(
                          (c) =>
                            c.id === cond.id
                              ? {
                                  ...c,
                                  operator: e.target.value as PilotOperator,
                                }
                              : c,
                        );
                        setEditingRule({
                          ...editingRule,
                          definition: {
                            ...editingRule.definition,
                            conditions: updated,
                          },
                        });
                      }}
                    >
                      {(["<", "<=", ">", ">=", "==", "!="] as const).map(
                        (op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="field">
                    Threshold {index + 1} ({cond.unit})
                    <input
                      value={cond.thresholdDecimal}
                      onChange={(e) => {
                        const updated = editingRule.definition.conditions.map(
                          (c) =>
                            c.id === cond.id
                              ? { ...c, thresholdDecimal: e.target.value }
                              : c,
                        );
                        setEditingRule({
                          ...editingRule,
                          definition: {
                            ...editingRule.definition,
                            conditions: updated,
                          },
                        });
                      }}
                    />
                  </label>
                  <label className="field">
                    Max age {index + 1} (s)
                    <input
                      type="number"
                      min={1}
                      value={cond.maxAgeSeconds}
                      onChange={(e) => {
                        const updated = editingRule.definition.conditions.map(
                          (c) =>
                            c.id === cond.id
                              ? { ...c, maxAgeSeconds: Number(e.target.value) }
                              : c,
                        );
                        setEditingRule({
                          ...editingRule,
                          definition: {
                            ...editingRule.definition,
                            conditions: updated,
                          },
                        });
                      }}
                    />
                  </label>
                  {editingRule.definition.conditions.length > 1 && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove condition ${index + 1}`}
                      onClick={() =>
                        setEditingRule({
                          ...editingRule,
                          definition: {
                            ...editingRule.definition,
                            conditions:
                              editingRule.definition.conditions.filter(
                                (c) => c.id !== cond.id,
                              ),
                          },
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="rule-live-card">
              <strong>Readable rule preview</strong>
              <p>{summarizePilotRule(editingRule.definition)}</p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setEditingRule(null);
                  setRuleErrors([]);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Activity size={15} /> Save immutable version
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
