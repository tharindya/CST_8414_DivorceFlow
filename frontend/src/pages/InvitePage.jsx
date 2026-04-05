import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

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
    <div style={{ maxWidth: 700, margin: "24px auto", padding: 16 }}>
      <h2>Invitation</h2>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!invite && !error && <div>Loading invitation...</div>}

      {invite && (
        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Agreement:</strong> {invite.title}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Status:</strong> {invite.status}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Invite code:</strong> <code>{invite.inviteCode}</code>
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={acceptInvite} disabled={joining} style={{ padding: "10px 14px" }}>
              {joining ? "Joining..." : "Accept and Join"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}