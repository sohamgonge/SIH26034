"use client";

const FIELD_LABELS = {
  manufacturer_name: "Manufacturer name",
  manufacturer_address: "Manufacturer address",
  commodity_name: "Commodity name",
  net_quantity_value: "Net quantity value",
  net_quantity_unit: "Net quantity unit",
  mfg_month_year: "Mfg month/year",
  mrp: "MRP declaration",
  consumer_care: "Consumer care",
  sold_by: "Sold by",
  ocr_confidence: "OCR confidence"
};

export default function ReportView({ report, onReset }) {
  const extracted = report.extracted_data || {};
  const compliance = report.compliance_report || {};
  const results = compliance.results || [];

  const passedRules = results.filter((item) => item.passed === true);
  const failedRules = results.filter((item) => item.passed === false && item.severity !== "warning" && !item.manual_review);
  const warningRules = results.filter((item) => item.severity === "warning" && !item.manual_review);
  const manualRules = results.filter((item) => item.manual_review);

  return (
    <section
      style={{
        display: "grid",
        gap: "24px"
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "32px",
          boxShadow: "var(--shadow)",
          padding: "28px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.82rem" }}>
              Compliance Outcome
            </p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>{compliance.overall_status || "Unknown"}</h2>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: "700px" }}>
              {failedRules.length === 0
                ? "No hard-rule violations were found in this scan."
                : "The report below shows which statutory checks passed and which ones need correction."}
            </p>
          </div>
          <button onClick={onReset} style={{ ...secondaryChipStyle, alignSelf: "center" }}>
            Scan another label
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginTop: "22px" }}>
          <SummaryCard label="Passed" value={String(passedRules.length)} tone="ok" />
          <SummaryCard label="Failed" value={String(failedRules.length)} tone="danger" />
          <SummaryCard label="Warnings" value={String(warningRules.length)} tone="warn" />
          <SummaryCard label="Manual review" value={String(manualRules.length)} tone="ink" />
        </div>
      </div>

      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Extracted Fields</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <div key={key} style={fieldCardStyle}>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "8px" }}>{label}</div>
              <div style={{ lineHeight: 1.5 }}>{formatValue(extracted[key])}</div>
            </div>
          ))}
        </div>
      </div>

      <RuleList title="Rules Followed" items={passedRules} tone="ok" emptyMessage="No passing rules were captured." />
      <RuleList title="Rules Not Followed" items={failedRules} tone="danger" emptyMessage="No hard-rule failures." />
      <RuleList title="Warnings And Manual Review" items={[...warningRules, ...manualRules]} tone="warn" emptyMessage="No warnings or manual review items." />

      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Raw OCR Text</h3>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            color: "var(--muted)",
            background: "#faf7f1",
            border: "1px solid var(--line)",
            borderRadius: "18px",
            padding: "18px"
          }}
        >
          {report.ocr_debug?.raw_text || "No raw text returned."}
        </pre>
      </div>
    </section>
  );
}

function SummaryCard({ label, value, tone }) {
  const toneColor = {
    ok: "var(--ok)",
    danger: "var(--danger)",
    warn: "var(--warn)",
    ink: "var(--ink)"
  }[tone];

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "24px",
        padding: "18px",
        background: "#fcf8f1"
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: "0.84rem", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "2rem", color: toneColor }}>{value}</div>
    </div>
  );
}

function RuleList({ title, items, tone, emptyMessage }) {
  const accent = {
    ok: "rgba(36, 97, 61, 0.14)",
    danger: "rgba(166, 59, 50, 0.12)",
    warn: "rgba(154, 103, 0, 0.12)"
  }[tone];

  return (
    <div style={panelStyle}>
      <h3 style={panelTitleStyle}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ margin: 0, color: "var(--muted)" }}>{emptyMessage}</p>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {items.map((item) => (
            <article
              key={`${title}-${item.rule_id}-${item.field}`}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "22px",
                padding: "18px",
                background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.85))`
              }}
            >
              <div style={{ display: "flex", gap: "12px", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "6px" }}>{item.rule_id}</div>
                  <div style={{ fontSize: "1.08rem" }}>{item.source || "Legal Metrology Rule"}</div>
                </div>
                <div style={{ fontSize: "0.86rem", color: "var(--muted)" }}>{toTitle(item.field)}</div>
              </div>
              <p style={{ margin: "12px 0 0", lineHeight: 1.6 }}>
                {item.passed ? "Requirement satisfied." : item.message || "Requirement not satisfied."}
              </p>
              {item.note ? <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>{item.note}</p> : null}
              {item.value_found !== undefined ? (
                <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                  Value found: {formatValue(item.value_found)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not found";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  return String(value);
}

function toTitle(value) {
  if (!value) return "General";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const panelStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "32px",
  boxShadow: "var(--shadow)",
  padding: "28px"
};

const panelTitleStyle = {
  margin: "0 0 18px",
  fontSize: "1.45rem"
};

const fieldCardStyle = {
  border: "1px solid var(--line)",
  borderRadius: "22px",
  padding: "18px",
  background: "#fcf8f1"
};

const secondaryChipStyle = {
  border: "1px solid var(--line)",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "white",
  cursor: "pointer"
};
