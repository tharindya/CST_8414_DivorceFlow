# DivorceFlow Frontend

React and Vite frontend for the DivorceFlow web application.

## Setup

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5173` and calls `http://localhost:5000` by default.

To use another API address, copy `.env.example` to `.env` and update `VITE_API_BASE`.

## Verification

```bash
npm run lint
npm run build
```

Do not commit `.env`, `dist`, or `node_modules`.
