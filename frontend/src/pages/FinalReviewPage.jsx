import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import "../styles/final-review.css";

function statusTone(status) {
  if (["APPROVED", "REVIEWED", "CONFIRMED", "READY_FOR_SIGNING", "READY_FOR_HUMAN_REVIEW", "FINALIZED"].includes(status)) {
    return "success";
  }
  if (["REJECTED", "NEEDS_REVISION", "NOT_READY", "NEEDS_WORK"].includes(status)) {
    return "danger";
  }
  return "warning";
}

function StatusBadge({ status }) {
  return (
    <span className={`final-status final-status--${statusTone(status)}`}>
      {String(status || "UNKNOWN").replaceAll("_", " ")}
    </span>
  );
}

export default function FinalReviewPage() {
  const { caseId } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setError("");
        const data = await api.getFinalReview(caseId);
        if (active) setReview(data);
      } catch (loadError) {
        if (active) setError(loadError.message || "Failed to load final review");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [caseId]);

  async function downloadPdf() {
    try {
      setError("");
      setDownloading(true);
      await api.downloadCasePdf(caseId);
    } catch (downloadError) {
      setError(downloadError.message || "Failed to download agreement PDF");
    } finally {
      setDownloading(false);
    }
  }

  async function confirmReview() {
    try {
      setError("");
      setSuccess("");
      setConfirming(true);
      const data = await api.confirmFinalReview(caseId);
      setReview(data);
      setSuccess(
        data.signing?.finalized
          ? "Both parties confirmed final review. The agreement is finalized."
          : "Your final review confirmation was recorded."
      );
    } catch (confirmError) {
      setError(confirmError.message || "Failed to confirm final review");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <div className="final-shell">Loading final review...</div>;

  return (
    <main className="final-shell">
      <section className="final-hero">
        <div>
          <Link to={`/cases/${caseId}`} className="final-back">← Back to agreement workspace</Link>
          <div className="final-eyebrow">Final agreement review</div>
          <h1>{review?.case?.title || "Agreement"}</h1>
          <p>Confirm every workflow requirement before exporting the agreement for signing.</p>
        </div>

        {review && (
          <div className="final-hero-status">
            <StatusBadge status={review.readiness} />
            <span>{review.blockers.length} blocker(s)</span>
          </div>
        )}
      </section>

      {error && <div className="final-alert final-alert--error">{error}</div>}
      {success && <div className="final-alert final-alert--success">{success}</div>}

      {review && (
        <>
          <section className={`final-readiness final-readiness--${review.readyForSigning ? "ready" : "blocked"}`}>
            <div>
              <h2>
                {review.signing?.finalized
                  ? "Agreement finalized"
                  : review.readyForSigning
                    ? "Ready for signing workflow"
                    : "Agreement is not ready"}
              </h2>
              <p>{review.disclaimer}</p>
            </div>
            <button
              type="button"
              className="final-button final-button--primary"
              disabled={!review.canExport || downloading}
              onClick={downloadPdf}
            >
              {downloading ? "Preparing PDF..." : "Download agreement PDF"}
            </button>
          </section>

          <section className="final-panel final-signing-panel">
            <div className="final-panel-header">
              <div>
                <h2>Final review confirmations</h2>
                <p className="final-muted">
                  Each party confirms that they reviewed the final agreement. This is a workflow acknowledgement, not a legally binding electronic signature.
                </p>
              </div>
              <span>{review.signing?.confirmedCount || 0}/2 confirmed</span>
            </div>

            <div className="final-confirmation-grid">
              {(review.signing?.confirmations || []).map((confirmation) => (
                <article
                  key={confirmation.role}
                  className={`final-confirmation-card ${confirmation.confirmed ? "final-confirmation-card--confirmed" : ""}`}
                >
                  <div>
                    <strong>{confirmation.role.replace("_", " ")}</strong>
                    <span>{confirmation.confirmed ? "Confirmed" : "Waiting for confirmation"}</span>
                  </div>
                  <StatusBadge status={confirmation.confirmed ? "CONFIRMED" : "PENDING"} />
                  {confirmation.confirmedAt && (
                    <time>{new Date(confirmation.confirmedAt).toLocaleString()}</time>
                  )}
                </article>
              ))}
            </div>

            <div className="final-signing-actions">
              {review.signing?.finalized ? (
                <div className="final-ok">
                  Finalized {review.signing.finalizedAt ? new Date(review.signing.finalizedAt).toLocaleString() : ""}
                </div>
              ) : review.signing?.currentUserConfirmed ? (
                <div className="final-ok">Your confirmation has been recorded.</div>
              ) : (
                <button
                  type="button"
                  className="final-button final-button--primary"
                  disabled={!review.signing?.canConfirm || confirming}
                  onClick={confirmReview}
                >
                  {confirming ? "Recording confirmation..." : "Confirm I reviewed the final agreement"}
                </button>
              )}
            </div>
          </section>

          <section className="final-summary-grid">
            <div className="final-summary-card">
              <span>Parties</span>
              <strong>{review.summary.partyCount}/2</strong>
            </div>
            <div className="final-summary-card">
              <span>Guided intake</span>
              <strong>{review.summary.intakeComplete ? "Complete" : "Incomplete"}</strong>
            </div>
            <div className="final-summary-card">
              <span>Clause approvals</span>
              <strong>{review.summary.approvedCount}/{review.summary.clauseCount}</strong>
            </div>
            <div className="final-summary-card">
              <span>Moderator reviewed</span>
              <strong>{review.summary.moderatorReviewedCount}/{review.summary.clauseCount}</strong>
            </div>
          </section>

          <section className="final-grid">
            <div className="final-panel">
              <div className="final-panel-header">
                <h2>Readiness blockers</h2>
                <span>{review.blockers.length}</span>
              </div>
              {review.blockers.length ? (
                <div className="final-blocker-list">
                  {review.blockers.map((blocker) => (
                    <article key={blocker.code} className="final-blocker">
                      <strong>{blocker.title}</strong>
                      <p>{blocker.message}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="final-ok">All workflow checks have passed.</div>
              )}
            </div>

            <div className="final-panel">
              <div className="final-panel-header">
                <h2>Latest AI review</h2>
              </div>
              {review.latestAiReview ? (
                <div className="final-ai-summary">
                  <StatusBadge status={review.latestAiReview.readiness} />
                  <dl>
                    <div><dt>Issues</dt><dd>{review.latestAiReview.issueCount}</dd></div>
                    <div><dt>Provider</dt><dd>{review.latestAiReview.provider}</dd></div>
                    <div><dt>Current</dt><dd>{review.latestAiReview.current ? "Yes" : "No"}</dd></div>
                    <div><dt>Generated</dt><dd>{new Date(review.latestAiReview.createdAt).toLocaleString()}</dd></div>
                  </dl>
                </div>
              ) : (
                <p className="final-muted">No AI agreement review has been recorded.</p>
              )}
            </div>
          </section>

          {review.warnings?.length > 0 && (
            <section className="final-panel final-advisory-panel">
              <div className="final-panel-header">
                <h2>Advisory warnings</h2>
                <span>{review.warnings.length}</span>
              </div>
              <div className="final-advisory-list">
                {review.warnings.map((warning) => (
                  <article key={warning.code} className="final-advisory">
                    <strong>{warning.title}</strong>
                    <p>{warning.message}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="final-panel final-clause-panel">
            <div className="final-panel-header">
              <h2>Clause review matrix</h2>
              <span>{review.summary.clauseCount} clauses</span>
            </div>
            <div className="final-table-wrap">
              <table className="final-table">
                <thead>
                  <tr>
                    <th>Clause</th>
                    <th>Party A</th>
                    <th>Party B</th>
                    <th>Overall</th>
                    <th>Moderator</th>
                  </tr>
                </thead>
                <tbody>
                  {review.clauses.map((clause) => (
                    <tr key={clause.clauseId}>
                      <td><strong>{clause.title}</strong><span>{clause.category}</span></td>
                      <td><StatusBadge status={clause.partyAStatus} /></td>
                      <td><StatusBadge status={clause.partyBStatus} /></td>
                      <td><StatusBadge status={clause.overallStatus} /></td>
                      <td><StatusBadge status={clause.moderatorStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {review.completeness?.warnings?.length > 0 && (
            <section className="final-panel">
              <div className="final-panel-header"><h2>Drafting completeness warnings</h2></div>
              <ul className="final-warning-list">
                {review.completeness.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
