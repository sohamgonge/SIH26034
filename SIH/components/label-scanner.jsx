"use client";

import { useMemo, useState } from "react";
import ReportView from "@/components/report-view";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function LabelScanner() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const fileSummary = useMemo(() => {
    if (!file) return "JPG, PNG, WebP, HEIC up to 10 MB";
    return `${file.name} • ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }, [file]);

  function resetScan() {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl("");
    setError("");
    setReport(null);
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0];
    setError("");
    setReport(null);

    if (!nextFile) {
      return;
    }

    if (!ACCEPTED_TYPES.includes((nextFile.type || "").toLowerCase())) {
      setError("Please upload a clear label image in JPG, PNG, WebP, or HEIC format.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setError("The image is larger than 10 MB. Please upload a smaller file.");
      return;
    }

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError("Choose a label image before running the compliance check.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setReport(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/check-compliance", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "The scan could not be completed.");
      }

      setReport(data);
    } catch (submissionError) {
      setError(submissionError.message || "The scan could not be completed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: "40px 20px 64px" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gap: "28px"
        }}
      >
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "32px",
            boxShadow: "var(--shadow)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: "28px 28px 18px",
              background:
                "linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(255, 253, 248, 0.9) 52%, rgba(166, 59, 50, 0.08))"
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(24, 32, 34, 0.1)",
                background: "rgba(255, 255, 255, 0.65)",
                fontSize: "0.8rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--brand-deep)"
              }}
            >
              Prototype Flow
            </div>
            <h1 style={{ margin: "16px 0 10px", fontSize: "clamp(2.2rem, 4vw, 4rem)", lineHeight: 1 }}>
              Scan a label, extract declarations, and see which rules pass.
            </h1>
            <p style={{ margin: 0, maxWidth: "760px", color: "var(--muted)", fontSize: "1.05rem", lineHeight: 1.6 }}>
              This version skips login, history, and Firebase. It sends the image to a server-side Gemini call,
              maps the extracted fields, runs the Legal Metrology checks, and returns a plain report with passed,
              failed, warning, and manual-review items.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)",
              gap: "24px",
              padding: "28px"
            }}
            className="scanner-grid"
          >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
              <label
                style={{
                  display: "grid",
                  gap: "14px",
                  border: "1px dashed var(--line)",
                  borderRadius: "28px",
                  padding: "24px",
                  background: "var(--surface-strong)",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: "0.88rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Label Image
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                <span style={{ fontSize: "1.15rem", lineHeight: 1.4 }}>
                  {file ? "Replace image" : "Choose or capture a product label"}
                </span>
                <span style={{ color: "var(--muted)" }}>{fileSummary}</span>
              </label>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={primaryButtonStyle}
                >
                  {isSubmitting ? "Checking compliance..." : "Run Compliance Check"}
                </button>
                <button
                  type="button"
                  onClick={resetScan}
                  disabled={isSubmitting && !report}
                  style={secondaryButtonStyle}
                >
                  Reset
                </button>
              </div>

              {error ? (
                <div style={errorBoxStyle}>{error}</div>
              ) : null}
            </form>

            <div
              style={{
                minHeight: "280px",
                border: "1px solid var(--line)",
                borderRadius: "28px",
                background: "#f7f2ea",
                display: "grid",
                placeItems: "center",
                padding: "18px",
                overflow: "hidden"
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected label preview"
                  style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "18px" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--muted)", maxWidth: "320px", lineHeight: 1.6 }}>
                  The image preview appears here before you send it to Gemini.
                </div>
              )}
            </div>
          </div>
        </section>

        {report ? <ReportView report={report} onReset={resetScan} /> : null}
      </div>
    </main>
  );
}

const primaryButtonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "14px 22px",
  background: "linear-gradient(135deg, var(--brand), var(--brand-deep))",
  color: "white",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  border: "1px solid var(--line)",
  borderRadius: "999px",
  padding: "14px 22px",
  background: "white",
  color: "var(--ink)",
  cursor: "pointer"
};

const errorBoxStyle = {
  border: "1px solid rgba(166, 59, 50, 0.25)",
  borderRadius: "20px",
  padding: "14px 16px",
  background: "rgba(166, 59, 50, 0.08)",
  color: "var(--danger)"
};
