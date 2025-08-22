function getProfile() {
  const name = localStorage.getItem('profileName') || 'Guest';
  const avatar = localStorage.getItem('profileAvatar') || '';
  return { name, avatar };
}

function setChip() {
  const { name, avatar } = getProfile();
  const nameEl = document.getElementById('chipName');
  const avEl = document.getElementById('chipAvatar');
  const iconEl = avEl?.querySelector('.material-symbols-outlined');
  
  if (nameEl) nameEl.textContent = name;
  
  if (avEl && iconEl) {
    if (avatar) {
      // If we have an avatar URL, replace the icon with an image
      avEl.innerHTML = ''; // Clear the icon
      const img = document.createElement('img');
      img.src = avatar;
      img.alt = name + "'s avatar";
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      avEl.appendChild(img);
    } else {
      // If no avatar, ensure the icon is shown
      avEl.innerHTML = '<span class="material-symbols-outlined">account_circle</span>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setChip();

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
      window.location.href = `/room.html?room=${encodeURIComponent(id)}`;
    } catch (e) {
      console.error(e);
      newRoomOut.textContent = 'Failed to create room.';
    }
  });

  function extractRoomId(input) {
    const val = input.trim();
    try {
      const url = new URL(val);
      const r = new URLSearchParams(url.search).get('room');
      if (r) return r;
    } catch {}
    return val;
  }

  joinBtn?.addEventListener('click', () => {
    const id = extractRoomId(roomInput?.value || '');
    if (!id) { roomInput?.focus(); return; }
    window.location.href = `/room.html?room=${encodeURIComponent(id)}`;
  });
});
