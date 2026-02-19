// backend/src/index.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const { setupWSConnection } = require('y-websocket');  // ← Correct import (no /bin/utils)

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend alive' });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle upgrade requests
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Y.js connection handler
wss.on('connection', (ws, req) => {
  console.log('New WS connection from:', req.socket.remoteAddress);

  // Use the official setup function from y-websocket
  setupWSConnection(ws, req, {
    gc: true, // garbage collection
  });
});

// Start server
server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`WebSocket ready at ws://localhost:${port}`);
});