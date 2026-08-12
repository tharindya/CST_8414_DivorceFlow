import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import "../styles/auth.css";

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const caseId = searchParams.get("caseId");
  const token = searchParams.get("token");

  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        const data = await api.getInvite(caseId, token);
        setInvite(data.invite);
      } catch (err) {
        setError(err.message || "Failed to load invitation");
      }
    }

    if (caseId && token) {
      loadInvite();
    } else {
      setError("Invalid invitation link");
    }
  }, [caseId, token]);

  async function acceptInvite() {
    if (!invite) return;

    try {
      setJoining(true);
      const data = await api.joinCase(caseId, { inviteCode: invite.inviteCode });
      navigate(`/cases/${data.case._id}`);
    } catch (err) {
      setError(err.message || "Failed to join case");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--wide">
        <div className="auth-eyebrow">Agreement invitation</div>
        <h1 className="auth-title">You’ve been invited to join an agreement</h1>
        <p className="auth-subtitle">
          Review the invitation details below and join the shared case to continue the agreement process.
        </p>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        {!invite && !error && (
          <div className="auth-loading">Loading invitation details...</div>
        )}

        {invite && (
          <div className="invite-summary">
            <div className="invite-panel">
              <div className="invite-grid">
                <div className="invite-item">
                  <span className="invite-label">Agreement</span>
                  <div className="invite-value">{invite.title}</div>
                </div>

                <div className="invite-item">
                  <span className="invite-label">Status</span>
                  <div className="invite-value">{invite.status}</div>
                </div>

                <div className="invite-item">
                  <span className="invite-label">Invite code</span>
                  <div className="invite-value">
                    <span className="invite-code">{invite.inviteCode}</span>
                  </div>
                </div>

                <div className="invite-item">
                  <span className="invite-label">Case reference</span>
                  <div className="invite-value">{caseId}</div>
                </div>
              </div>
            </div>

            <p className="invite-note">
              You must be signed in before joining this case. After joining, you can review clauses, comment, approve, or reject sections of the agreement.
            </p>

            <div className="invite-actions">
              <button
                type="button"
                onClick={acceptInvite}
                disabled={joining}
                className="auth-button"
              >
                {joining ? "Joining agreement..." : "Accept and join"}
              </button>

              <Link to="/login" className="invite-secondary">
                Go to login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}