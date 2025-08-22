document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('createRoomBtn');
  const newRoomOut = document.getElementById('newRoomOut');
  const joinBtn = document.getElementById('joinBtn');
  const roomInput = document.getElementById('roomIdInput');

  createBtn?.addEventListener('click', async () => {
    newRoomOut.textContent = 'Creating room...';
    try {
      const res = await fetch('/api/create-room', { method: 'POST' });
      const data = await res.json();
      const id = data.roomId;
      newRoomOut.textContent = `Room created: ${id}`;
      window.location.href = `/room.html?room=${encodeURIComponent(id)}`;
    } catch (e) {
      console.error(e);
      newRoomOut.textContent = 'Failed to create room.';
    }
  });

  joinBtn?.addEventListener('click', () => {
    const id = (roomInput?.value || '').trim();
    if (!id) {
      roomInput?.focus();
      return;
    }
    window.location.href = `/room.html?room=${encodeURIComponent(id)}`;
  });
});
