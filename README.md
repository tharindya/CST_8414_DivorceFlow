# CST_8414_DivorceFlow
Secure, collaborative platform for couples to draft, negotiate, and finalize divorce agreements clause-by-clause with approval workflows, comments, AI suggestions, and PDF export. Built with Scrum methodology in Azure DevOps for CST8414 group project.


# DivorceFlow – Collaborative Divorce Agreement Builder

**DivorceFlow** is a secure, two-party web platform that enables separating couples to collaboratively draft, negotiate, edit, and finalize divorce agreements clause-by-clause. Each user can propose changes, comment, approve, or reject individual sections until mutual agreement is reached, with final export to a downloadable legal document (PDF/Word).

Built as part of **CST8414 – Agile Project Management** Assignment 2 at Algonquin College (Winter 2026), following Scrum practices with Azure DevOps for backlog, epics, features, user stories, tasks, story points, and sprint planning.

## Project Goal

Create a user-friendly, secure digital tool that simplifies the emotionally challenging process of negotiating divorce terms. By breaking agreements into editable clauses with real-time collaboration, version control, comments, and approval workflows, DivorceFlow reduces miscommunication, minimizes lawyer involvement for simple cases, and produces a clean, exportable final document ready for legal review.

## Core Features

- **Two-Party Secure Login** — Separate authenticated accounts for each party with role-based access (Party A / Party B).
- **Clause-by-Clause Editor** — Agreements structured into sections (e.g., asset division, child custody, spousal support) using customizable legal templates.
- **Real-time Collaboration & Editing** — Both users can edit clauses simultaneously (or near real-time), with conflict highlighting.
- **Approval / Rejection / Comment Workflow** — Per-clause buttons to Approve, Reject (with mandatory comment), or Request Changes.
- **AI Legal Suggestions** (Mock) — Basic placeholder suggestions for fair wording or missing clauses (simulated via prompt or rule-based).
- **Version History** — Track changes, view diffs, and restore previous clause versions.
- **Final Agreement Export** — When both parties approve all clauses, generate and download PDF/Word document with signatures (digital placeholder).
- **Private In-App Messaging** — Secure chat for discussing terms outside clauses.

(Nice-to-have planned: Jurisdiction-specific templates, lawyer referral directory)

## Tech Stack

- **Frontend**: React.js (with TypeScript) + Next.js 14/15 (for SSR, API routes, and responsive UI)
- **UI Library**: Tailwind CSS + shadcn/ui (for clean, accessible components)
- **Backend**: Node.js + Express.js (RESTful API)
- **Database**: MongoDB (via MongoDB Atlas – flexible schema for clauses, versions, comments)
- **Authentication**: JWT-based (with refresh tokens) or NextAuth.js / Clerk (for easy secure login)
- **Real-time Features**: Socket.io (for live editing indicators, comments, approvals)
- **Document Generation**: pdf-lib or docx (for final PDF/Word export)
- **State Management**: Zustand or Redux Toolkit (frontend)
- **Deployment (future)**: Vercel (frontend) + Render / Railway (backend)
- **Planning & CI/CD**: Azure DevOps (Boards for backlog/sprints, Repos for Git, optional Pipelines)

## Azure DevOps Setup

Project planning and tracking completed in Azure DevOps:

- **Product Backlog**: Epics (e.g., User Authentication, Agreement Editor), Features, User Stories with acceptance criteria, story points (Fibonacci), priorities.
- **Sprints**: 2-week iterations with sprint goals, committed sprint backlog, daily stand-ups (simulated).
- **Boards**: Customized columns showing Work Item Type, Title, Story Points, State, Assigned To, Original Estimate.

## How to Run Locally

### Prerequisites
- Node.js v18+ 
- MongoDB (local or Atlas free tier)
- Git

### Steps
1. Clone the repo:
   ```bash
