const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static assets
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Helper to generate a simple room ID (e.g., 6 chars alphanumeric)
function makeRoomId(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Create room endpoint
app.post('/api/create-room', (req, res) => {
  let id = makeRoomId();
  // Ensure uniqueness among current rooms
  const rooms = io.sockets.adapter.rooms;
  while (rooms.get(id)) id = makeRoomId();
  res.json({ roomId: id });
});

// Fallback to index.html (simple SPA-like routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, profile }) => {
    socket.data.profile = profile || { name: 'Guest' };
    socket.data.roomId = roomId;
    socket.join(roomId);

    // Send existing users (id + profile) to the new user
    const room = io.sockets.adapter.rooms.get(roomId) || new Set();
    const otherUsers = Array.from(room)
      .filter((id) => id !== socket.id)
      .map((id) => {
        const s = io.sockets.sockets.get(id);
        return { id, profile: s?.data?.profile || { name: 'Guest' } };
      });
    socket.emit('all-users', otherUsers);

    // Inform others a new user joined (with profile)
    socket.to(roomId).emit('user-joined', { id: socket.id, profile: socket.data.profile });

    // Relay offers/answers/candidates
    socket.on('offer', ({ to, sdp }) => {
      io.to(to).emit('offer', { from: socket.id, sdp });
    });

    socket.on('answer', ({ to, sdp }) => {
      io.to(to).emit('answer', { from: socket.id, sdp });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    socket.on('chat-message', ({ text }) => {
      const when = Date.now();
      io.to(roomId).emit('chat-message', { from: socket.id, profile: socket.data.profile, text, when });
    });

    socket.on('update-profile', (profileUpdate) => {
      socket.data.profile = { ...(socket.data.profile || {}), ...(profileUpdate || {}) };
      io.to(roomId).emit('profile-updated', { id: socket.id, profile: socket.data.profile });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-left', socket.id);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
