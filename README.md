# DivorceFlow

DivorceFlow is a web application for collaboratively drafting, reviewing, approving, and exporting a divorce agreement. Two parties work clause by clause while an administrator performs moderator review. Gemini provides optional drafting assistance and an advisory agreement review.

AI output is drafting assistance only. It is not legal advice and does not replace review by a qualified legal professional.

## Web features

- User registration and JWT authentication
- Case creation, email invitation, and invite-code joining
- Guided intake and intake-based clause recommendations
- Jurisdiction-aware clause templates
- Clause editing, comments, version history, approval, and rejection
- Workflow states from `DRAFT` through `FINALIZED`
- Gemini clause rewriting and full-agreement drafting review
- Administrator analytics, template review, and clause review
- Final review, confirmation by both parties, and PDF export
- Audit trail and backend authorization controls

Messaging belongs to the planned mobile application and is not part of the current web interface.

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- MongoDB Community Server
- Gemini API key for real AI features
- Optional SMTP account for email invitations

## Backend setup

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env`, then replace the placeholder values. Never commit `backend/.env`.

Start MongoDB and the API:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Verify it at `http://localhost:5000/health`.

Run the backend test suite:

```bash
npm test
```

## Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The web application runs at `http://localhost:5173` by default.

Run frontend verification:

```bash
npm run lint
npm run build
```

The frontend calls `http://localhost:5000` unless `VITE_API_BASE` is set in `frontend/.env`.

## Administrator account

Register a normal account, then update its role using MongoDB Shell:

```javascript
use divorceflow
db.users.updateOne(
  { email: "admin@test.com" },
  { $set: { role: "ADMIN" } }
)
```

Log out and sign in again so the new JWT contains the administrator role.

## Manual test flow

1. Register Party A and create a case.
2. Complete the guided intake and add the recommended clauses.
3. Register Party B and join with the case ID and invite code.
4. Edit, comment on, approve, and reject clauses.
5. Run Gemini clause rewriting and agreement review.
6. Sign in as the administrator and review every clause.
7. Approve every clause as both parties.
8. Open final review and confirm as both parties.
9. Download the finalized PDF from the final-review page.

AI findings remain advisory. Current AI findings display a warning but do not block finalization after both parties and the moderator complete their required review.

## Workflow states

| Status | Meaning |
| --- | --- |
| `DRAFT` | A party or clause is missing |
| `NEGOTIATING` | Both parties and clauses exist, but review has not started |
| `REVIEW` | Party approval or rejection activity has started |
| `REVISION` | A party rejected a clause or the moderator requested revision |
| `APPROVAL` | Both parties approved every clause, but final readiness work remains |
| `READY` | Intake, approvals, moderator review, completeness, and current AI review are complete |
| `FINALIZED` | Both parties confirmed the current final review |
| `EXPORTED` | Reserved for an exported terminal record |

## Email invitations

SMTP configuration is optional for local testing. Without it, Party A can manually share the case ID and invite code with Party B.

For Gmail, use an app password rather than the normal account password.

## Troubleshooting

- API connection failure: verify MongoDB and the backend are running.
- CORS error: ensure `CORS_ORIGIN` matches the frontend URL.
- Gemini configuration error: verify `GEMINI_API_KEY` and `GEMINI_MODEL`, then restart the backend.
- Invitation error: verify the SMTP variables or share the invite code manually.
- Administrator pages blocked: verify the database role and sign in again.
