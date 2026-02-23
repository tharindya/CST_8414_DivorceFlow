// backend/src/index.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const { setupWSConnection } = require('y-websocket');  // ← Correct import (no /bin/utils)

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = 'your-super-secret-key-change-this-in-real-project'; // change this!!

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

//Data Folders
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
fs.ensureDirSync(ROOMS_DIR);

//Mock Users (in real app, use DB)
const users = {
  'partyA@example.com': { password: 'passwordA', name: 'Party A' },
  'partyB@example.com': { password: 'passwordB', name: 'Party B' }
};

// Login route - returns JWT token
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { email, name: user.name },
    JWT_SECRET, 
    { expiresIn: '24h' }
  );

  res.json({ token, user: { email, name: user.name } });
});

//Create a new Agreeement - returns RoomId
app.post('/create-agreement', authenticateToken, (req, res) => {
  const roomId = uuidv4();
  const roomPath = path.join(ROOMS_DIR, `${roomId}.json`);

  // initialize empty Yjs state file for this room
  fs.writeJsonSync(roomPath, Y.encodeStateAsUpdate(new Y.Doc())); // create empty Yjs document
  res.json({ roomId, message: 'Agreement created successfully' });
});


// Get all rooms for Users (stub - later filter by ownership)
app.get('/agreements', authenticateToken, (req, res) => {
  const files = fs.readdirSync(ROOMS_DIR);
  const rooms = files.map(file => file.replace('.json', ''));
  res.json({ rooms });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No Token Provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {  
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; 
    next();
  });
}

//websocket server for Yjs real-time collaboration
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('New WS connection from:', req.socket.remoteAddress);

    //parse roomId from query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const room = url.searchParams.get('room');

    if (!token || !room) {
      ws.close(1008, 'Missing token or room');
      return;
    }

    //verify token
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        ws.close(1008, 'Invalid token');
        return;
      }

      //load or create Y.doc for this room
      const roomPath = path.join(ROOMS_DIR, `${room}.json`);
      let ydoc = new Y.Doc();

      if (fs.existsSync(roomPath)) {
        const data = fs.readFileSync(roomPath);
        Y.applyUpdate(ydoc, update);
      }

      //Handle sync
      setupWSConnection(ws, req, {
        gc: true,
      });

      //Save state on interval and on close
      const saveInterval = setInterval(() => {
        const state = Y.encodeStateAsUpdate(ydoc);
        fs.writeFileSync(roomPath, state);
      }, 10000); // every 10 seconds

      ws.on('close', () => {
        clearInterval(saveInterval);
        const finalState = Y.encodeStateAsUpdate(ydoc);
        fs.writeFileSync(roomPath, finalState);
        console.log(`Room ${room} saved and connection closed`);
      });
    });
  });

/* Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend alive' });
});

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
});*/

// Start server
server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`WebSocket ready at ws://localhost:${port}`);
});