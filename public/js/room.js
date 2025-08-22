const qs = new URLSearchParams(location.search);
const roomId = qs.get('room');
const statusEl = document.getElementById('status') || document.createElement('span');
const heading = document.getElementById('roomHeading');
const roomIdEl = document.getElementById('roomId');
const grid = document.getElementById('videoGrid');
// Main stage elements
const mainWrapper = document.getElementById('mainWrapper');
const mainVideo = document.getElementById('mainVideo');
const mainLabel = document.getElementById('mainLabel');
const mainStatus = document.getElementById('mainStatus');
let selectedId = 'me';
const toggleMicBtn = document.getElementById('toggleMic');
const toggleCamBtn = document.getElementById('toggleCam');
const shareScreenBtn = document.getElementById('shareScreen');
const micBtnIcon = toggleMicBtn?.querySelector('.ms-icon');
const camBtnIcon = toggleCamBtn?.querySelector('.ms-icon');
const screenBtnIcon = shareScreenBtn?.querySelector('.ms-icon');
const copyLinkBtn = document.getElementById('copyLink');
const togglePanelBtn = document.getElementById('togglePanel');
const sidepanelEl = document.querySelector('.sidepanel');
const togglePanelIcon = togglePanelBtn?.querySelector('.ms-icon');
const stageEl = document.querySelector('main.stage');
// closeSidepanel removed from markup
// Quick menu elements
const quickMenu = document.getElementById('quickMenu');
const quickCopyLink = document.getElementById('quickCopyLink');
const quickParticipants = document.getElementById('quickParticipants');
const openChatQuick = document.getElementById('openChatQuick');
const toggleThumbsBtn = document.getElementById('toggleThumbs');
const thumbStripEl = document.getElementById('thumbStrip');
const toggleThumbsIcon = toggleThumbsBtn?.querySelector('.ms-icon');
const themeToggleBtn = document.getElementById('themeToggle');
const themeToggleIcon = themeToggleBtn?.querySelector('.ms-icon');
const quickThemeSystem = document.getElementById('quickThemeSystem');
const quickThemeDark = document.getElementById('quickThemeDark');
const quickThemeLight = document.getElementById('quickThemeLight');

// Side panel and chat
const tabParticipants = document.getElementById('tabParticipants');
const tabChat = document.getElementById('tabChat');
const panelParticipants = document.getElementById('panelParticipants');
const panelChat = document.getElementById('panelChat');
const participantsList = document.getElementById('participants');
const chatLog = document.getElementById('chatLog');
const chatText = document.getElementById('chatText');
const sendChatBtn = document.getElementById('sendChat');

// Left: show Room ID
if (roomIdEl) roomIdEl.textContent = `Room: ${roomId || 'Unknown'}`;
// Right heading: show only Person count
heading.textContent = `1 Person`;

// Connection status border for room heading
function setHeadingConnection(connected) {
  if (!heading) return;
  heading.classList.toggle('room-ok', !!connected);
  heading.classList.toggle('room-bad', !connected);
}
// Initial: assume disconnected until socket connects
setHeadingConnection(false);

// Theme handling (light/dark/system)
let currentTheme = 'system';
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(mode) {
  currentTheme = mode;
  const root = document.documentElement;
  const effective = mode === 'system' ? (mqDark.matches ? 'dark' : 'light') : mode;
  if (effective === 'dark') {
    root.setAttribute('data-theme', 'dark');
    if (themeToggleIcon) themeToggleIcon.textContent = 'dark_mode';
  } else {
    root.removeAttribute('data-theme');
    if (themeToggleIcon) themeToggleIcon.textContent = 'light_mode';
  }
  updateThemeButtons();
}

const savedTheme = localStorage.getItem('theme') || 'system';
applyTheme(savedTheme);

// React to OS changes only when using system theme
mqDark.addEventListener?.('change', () => { if (currentTheme === 'system') applyTheme('system'); });

// Keep legacy themeToggle button working if present (toggles between dark/light)
themeToggleBtn?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

// Quick theme buttons
quickThemeSystem?.addEventListener('click', () => {
  localStorage.setItem('theme', 'system');
  applyTheme('system');
});
quickThemeDark?.addEventListener('click', () => {
  localStorage.setItem('theme', 'dark');
  applyTheme('dark');
});
quickThemeLight?.addEventListener('click', () => {
  localStorage.setItem('theme', 'light');
  applyTheme('light');
});

function updateThemeButtons() {
  const eff = currentTheme === 'system' ? (mqDark.matches ? 'dark' : 'light') : currentTheme;
  const setActive = (btn, on) => {
    if (!btn) return;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(!!on));
  };
  setActive(quickThemeSystem, currentTheme === 'system');
  setActive(quickThemeDark, currentTheme !== 'system' && eff === 'dark');
  setActive(quickThemeLight, currentTheme !== 'system' && eff === 'light');
}

// Initial sync once DOM references exist
updateThemeButtons();

if (!roomId) {
  statusEl.textContent = 'No room ID provided.';
  throw new Error('Missing room');
}

function updateHeaderInfo() {
  // total = others + self
  const total = profiles.size + 1;
  heading.textContent = `${total} Person`;
}

function updateMainStatus({ camOn, micOn } = {}) {
  if (!mainStatus) return;
  const cam = mainStatus.querySelector('.cam-icon');
  const mic = mainStatus.querySelector('.mic-icon');
  if (camOn !== undefined && cam) {
    cam.classList.toggle('on', !!camOn);
    cam.classList.toggle('off', !camOn);
    cam.title = camOn ? 'Camera on' : 'Camera off';
    cam.textContent = camOn ? 'videocam' : 'videocam_off';
  }
  if (micOn !== undefined && mic) {
    mic.classList.toggle('on', !!micOn);
    mic.classList.toggle('off', !micOn);
    mic.title = micOn ? 'Mic on' : 'Mic off';
    mic.textContent = micOn ? 'mic' : 'mic_off';
  }
}

function setMainSelected(id, { force = false } = {}) {
  if (!force && selectedId === id) return;
  selectedId = id;
  // Highlight selected thumbnail
  document.querySelectorAll('.thumbs .tile').forEach(w => w.classList.remove('selected'));
  const selectedWrapper = document.querySelector(`.thumbs .tile[data-id="${id}"]`);
  if (selectedWrapper) selectedWrapper.classList.add('selected');

  // Set label
  const isLocal = id === 'me';
  const profile = isLocal ? getSelfProfile() : (profiles.get(id) || {});
  if (mainLabel) mainLabel.textContent = isLocal ? `${profile.name || 'You'} (You)` : (profile.name || id.slice(0,6));

  // Attach stream to main video or show placeholder
  let stream = isLocal ? localStream : streams.get(id);
  if (mainVideo) {
    if (stream) {
      mainVideo.srcObject = stream;
      mainVideo.muted = isLocal;
      mainVideo.play().catch(() => {});
      // Placeholder visibility in main
      const hasVideo = !!stream.getVideoTracks && stream.getVideoTracks().length > 0;
      if (hasVideo) hidePlaceholderIn(mainWrapper); else addOrUpdatePlaceholder(mainWrapper, id, isLocal);
    } else {
      mainVideo.srcObject = null;
      addOrUpdatePlaceholder(mainWrapper, id, isLocal);
    }
  }
  // Update main status icons based on current state
  const micOn = isLocal ? !!localStream?.getAudioTracks?.()[0]?.enabled : !!streams.get(id)?.getAudioTracks?.()[0]?.enabled;
  const camOn = isLocal ? !!localStream?.getVideoTracks?.()[0]?.enabled : !!streams.get(id)?.getVideoTracks?.()[0]?.enabled;
  updateMainStatus({ micOn, camOn });
}

const socket = io();
const peers = new Map(); // peerId -> RTCPeerConnection
const streams = new Map(); // peerId -> MediaStream
const profiles = new Map(); // peerId -> {name, avatar}

// Perfect negotiation state
const makingOffer = new Map();   // peerId -> bool
const ignoreOffer = new Map();   // peerId -> bool
const polite = new Map();        // peerId -> bool

let localStream;
// Load persisted mic/cam state (default to true if not set)
const persistedMic = localStorage.getItem('micEnabled');
const persistedCam = localStorage.getItem('camEnabled');
let micEnabled = persistedMic === null ? true : persistedMic === 'true';
let camEnabled = persistedCam === null ? true : persistedCam === 'true';

async function initMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    attachStream('me', localStream, true);
    statusEl.textContent = 'Local media started.';
    // Apply persisted states to tracks
    const aTrack = localStream.getAudioTracks()[0];
    if (aTrack) aTrack.enabled = micEnabled;
    const vTrack = localStream.getVideoTracks()[0];
    if (vTrack) vTrack.enabled = camEnabled;

    // If camera was previously off, stop/remove it to match UI expectations
    if (!camEnabled) {
      stopCamera();
    }

    // Initialize local status icons based on (possibly updated) track states
    const micOn = !!localStream.getAudioTracks()[0]?.enabled;
    const camOn = !!localStream.getVideoTracks()[0]?.enabled;
    updateTileStatus('me', { micOn, camOn });
    // Sync control button states (icons/labels)
    toggleMicBtn?.setAttribute('aria-label', micOn ? 'Mute microphone' : 'Unmute microphone');
    toggleMicBtn && (toggleMicBtn.title = micOn ? 'Mute microphone' : 'Unmute microphone');
    toggleMicBtn?.classList.toggle('off', !micOn);
    if (micBtnIcon) micBtnIcon.textContent = micOn ? 'mic' : 'mic_off';
    toggleCamBtn?.setAttribute('aria-label', camOn ? 'Stop video' : 'Start video');
    toggleCamBtn && (toggleCamBtn.title = camOn ? 'Stop video' : 'Start video');
    toggleCamBtn?.classList.toggle('off', !camOn);
    if (camBtnIcon) camBtnIcon.textContent = camOn ? 'videocam' : 'videocam_off';
  } catch (e) {
    console.error('getUserMedia error', e);
    // Fallbacks: try audio-only, then proceed without local media
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      attachStream('me', localStream, true);
      updateTileStatus('me', { micOn: true, camOn: false });
      statusEl.textContent = 'Camera busy/unavailable. Joined with microphone only.';
      // Set control states for audio-only
      toggleMicBtn?.setAttribute('aria-label', 'Mute microphone');
      toggleMicBtn && (toggleMicBtn.title = 'Mute microphone');
      toggleMicBtn?.classList.remove('off');
      if (micBtnIcon) micBtnIcon.textContent = 'mic';
      toggleCamBtn?.setAttribute('aria-label', 'Start video');
      toggleCamBtn && (toggleCamBtn.title = 'Start video');
      toggleCamBtn?.classList.add('off');
      if (camBtnIcon) camBtnIcon.textContent = 'videocam_off';
    } catch (e2) {
      console.warn('Audio-only failed', e2);
      statusEl.textContent = 'No local media available. You can still receive remote video/audio.';
      // Disable controls as there is no local media
      toggleMicBtn.disabled = true;
      toggleCamBtn.disabled = true;
      // Ensure self tile exists as placeholder
      ensureTile('me', true);
      updateTileStatus('me', { micOn: false, camOn: false });
      // Reflect disabled state
      toggleMicBtn?.setAttribute('aria-label', 'Microphone unavailable');
      toggleCamBtn?.setAttribute('aria-label', 'Camera unavailable');
      if (micBtnIcon) micBtnIcon.textContent = 'mic_off';
      if (camBtnIcon) camBtnIcon.textContent = 'videocam_off';
    }
  }
}

function attachStream(id, stream, isLocal = false) {
  let video = document.querySelector(`video[data-id="${id}"]`);
  if (!video) {
    video = ensureTile(id, isLocal);
  }
  video.srcObject = stream;
  // Ensure playback (handle autoplay restrictions)
  video.play().catch(() => {
    // Show a simple overlay to request user gesture
    let overlay = video.parentElement.querySelector('.click-to-play');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'click-to-play';
      overlay.textContent = 'Click to start video';
      overlay.addEventListener('click', () => {
        video.play().then(() => overlay.remove()).catch(() => {});
      });
      video.parentElement.appendChild(overlay);
    }
  });
  // Toggle placeholder visibility based on whether stream has video
  const hasVideo = !!stream.getVideoTracks && stream.getVideoTracks().length > 0;
  if (hasVideo) hidePlaceholder(id); else addOrUpdatePlaceholder(video.parentElement, id, isLocal);

  // Update main stage if this id is selected
  if (selectedId === id) {
    setMainSelected(id, { force: true });
  }
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function ensureTile(id, isLocal = false) {
  let video = document.querySelector(`video[data-id="${id}"]`);
  if (video) return video;
  const wrapper = document.createElement('div');
  wrapper.className = 'tile';
  wrapper.dataset.id = id;
  video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = isLocal; // avoid echo for local
  video.dataset.id = id;
  wrapper.appendChild(video);
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = isLocal ? (getSelfProfile().name || 'You') : (profiles.get(id)?.name || id.slice(0, 6));
  wrapper.appendChild(label);
  // status icons (camera/mic)
  const status = document.createElement('div');
  status.className = 'status-icons';
  const cam = document.createElement('span'); cam.className = 'material-symbols-outlined icon cam-icon off'; cam.title = 'Camera off'; cam.textContent = 'videocam_off';
  const mic = document.createElement('span'); mic.className = 'material-symbols-outlined icon mic-icon off'; mic.title = 'Mic off'; mic.textContent = 'mic_off';
  status.appendChild(cam); status.appendChild(mic);
  wrapper.appendChild(status);
  grid.appendChild(wrapper);
  // Click to select into main stage
  wrapper.addEventListener('click', () => setMainSelected(id));
  // add placeholder initially (no stream yet)
  addOrUpdatePlaceholder(wrapper, id, isLocal);
  return video;
}

function addOrUpdatePlaceholder(wrapper, id, isLocal = false) {
  let ph = wrapper.querySelector('.placeholder');
  if (!ph) {
    ph = document.createElement('div');
    ph.className = 'placeholder';
    const face = document.createElement('div');
    face.className = 'placeholder-face';
    const p = isLocal ? getSelfProfile() : (profiles.get(id) || {});
    if (p.avatar) {
      const img = document.createElement('img');
      img.src = p.avatar;
      img.className = 'avatar-lg';
      face.appendChild(img);
    } else {
      face.textContent = initials(p.name || (isLocal ? 'You' : ''));
    }
    ph.appendChild(face);
    wrapper.appendChild(ph);
  }
  ph.style.display = '';
}

function hidePlaceholder(id) {
  const video = document.querySelector(`video[data-id="${id}"]`);
  const ph = video?.parentElement?.querySelector('.placeholder');
  if (ph) ph.style.display = 'none';
}

function hidePlaceholderIn(wrapper) {
  const ph = wrapper?.querySelector('.placeholder');
  if (ph) ph.style.display = 'none';
}

function updateTileStatus(id, { camOn, micOn } = {}) {
  const video = document.querySelector(`video[data-id="${id}"]`);
  const wrapper = video?.parentElement || null;
  if (!wrapper) return;
  const cam = wrapper.querySelector('.cam-icon');
  const mic = wrapper.querySelector('.mic-icon');
  if (camOn !== undefined && cam) {
    cam.classList.toggle('on', !!camOn);
    cam.classList.toggle('off', !camOn);
    cam.title = camOn ? 'Camera on' : 'Camera off';
    cam.textContent = camOn ? 'videocam' : 'videocam_off';
  }
  if (micOn !== undefined && mic) {
    mic.classList.toggle('on', !!micOn);
    mic.classList.toggle('off', !micOn);
    mic.title = micOn ? 'Mic on' : 'Mic off';
    mic.textContent = micOn ? 'mic' : 'mic_off';
  }
}

function removePeer(id) {
  const v = document.querySelector(`video[data-id="${id}"]`);
  if (v && v.parentElement) v.parentElement.remove();
  const pc = peers.get(id);
  if (pc) pc.close();
  peers.delete(id);
  streams.delete(id);
}

function createPeerConnection(peerId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302'
    ] }]
  });

  // Pre-create transceivers to make negotiation robust even without local tracks
  try {
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('audio', { direction: 'sendrecv' });
  } catch {}

  // Add existing local tracks (if any)
  if (localStream) {
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('ice-candidate', { to: peerId, candidate: e.candidate });
    }
  };

  // Keep main stage synced if selected is this peer
  if (selectedId === peerId) setMainSelected(peerId, { force: true });

  pc.ontrack = (e) => {
    let stream = streams.get(peerId);
    if (!stream) {
      stream = new MediaStream();
      streams.set(peerId, stream);
      attachStream(peerId, stream, false);
    }
    stream.addTrack(e.track);
    if (e.track.kind === 'video') hidePlaceholder(peerId);
    // React to remote camera off/on and ended
    if (e.track.kind === 'video') {
      e.track.onmute = () => {
        const wrap = document.querySelector(`video[data-id="${peerId}"]`)?.parentElement;
        addOrUpdatePlaceholder(wrap, peerId, false);
        updateTileStatus(peerId, { camOn: false });
        if (selectedId === peerId) {
          addOrUpdatePlaceholder(mainWrapper, peerId, false);
          updateMainStatus({ camOn: false });
        }
      };
      e.track.onunmute = () => {
        hidePlaceholder(peerId);
        updateTileStatus(peerId, { camOn: true });
        if (selectedId === peerId) {
          hidePlaceholderIn(mainWrapper);
          updateMainStatus({ camOn: true });
        }
      };
      e.track.onended = () => {
        const wrap = document.querySelector(`video[data-id="${peerId}"]`)?.parentElement;
        addOrUpdatePlaceholder(wrap, peerId, false);
        updateTileStatus(peerId, { camOn: false });
        if (selectedId === peerId) {
          addOrUpdatePlaceholder(mainWrapper, peerId, false);
          updateMainStatus({ camOn: false });
        }
      };
    }
    if (e.track.kind === 'audio') {
      // Update mic icon based on mute/unmute
      e.track.onmute = () => {
        updateTileStatus(peerId, { micOn: false });
        if (selectedId === peerId) updateMainStatus({ micOn: false });
      };
      e.track.onunmute = () => {
        updateTileStatus(peerId, { micOn: true });
        if (selectedId === peerId) updateMainStatus({ micOn: true });
      };
      e.track.onended = () => {
        updateTileStatus(peerId, { micOn: false });
        if (selectedId === peerId) updateMainStatus({ micOn: false });
      };
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
      removePeer(peerId);
    }
  };

  peers.set(peerId, pc);

  // Auto-renegotiate when needed (e.g., camera starts later or screen share)
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer.set(peerId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: peerId, sdp: pc.localDescription });
    } catch (e) {
      console.warn('onnegotiationneeded failed', e);
    } finally {
      makingOffer.set(peerId, false);
    }
  };
  return pc;
}

async function callPeer(peerId) {
  const pc = createPeerConnection(peerId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('offer', { to: peerId, sdp: offer });
}

function getVideoTrack() {
  return localStream?.getVideoTracks?.()[0] || null;
}

async function startCamera() {
  // Acquire video track and attach to localStream
  try {
    const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const newTrack = camStream.getVideoTracks()[0];

    if (!localStream) {
      localStream = new MediaStream();
      // keep audio if exists in camStream (some browsers add audio=false)
    }
    localStream.addTrack(newTrack);
    attachStream('me', localStream, true);

    // Replace existing sender or add new and renegotiate
    await ensureVideoToAllPeers(newTrack);
    camEnabled = true;
    toggleCamBtn.setAttribute('aria-label', 'Stop video');
    toggleCamBtn.title = 'Stop video';
    toggleCamBtn.classList.remove('off');
    if (camBtnIcon) camBtnIcon.textContent = 'videocam';
    statusEl.textContent = '';
    updateTileStatus('me', { camOn: true });
  } catch (e) {
    console.error('Failed to start camera', e);
    statusEl.textContent = 'Unable to start camera.';
  }
}

function stopCamera() {
  const v = getVideoTrack();
  if (v) {
    v.stop();
    localStream.removeTrack(v);
  }
  // Show placeholder for self when no video
  addOrUpdatePlaceholder(document.querySelector(`video[data-id="me"]`)?.parentElement || ensureTile('me', true).parentElement, 'me', true);
  camEnabled = false;
  toggleCamBtn.setAttribute('aria-label', 'Start video');
  toggleCamBtn.title = 'Start video';
  toggleCamBtn.classList.add('off');
  if (camBtnIcon) camBtnIcon.textContent = 'videocam_off';
  updateTileStatus('me', { camOn: false });
  if (selectedId === 'me') {
    addOrUpdatePlaceholder(mainWrapper, 'me', true);
    updateMainStatus({ camOn: false });
  }
}

async function ensureVideoToAllPeers(newTrack) {
  // Try to replace existing video sender; if none, addTrack and renegotiate
  for (const [, pc] of peers) {
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender) {
      try { await sender.replaceTrack(newTrack); } catch (e) { console.warn('replaceTrack failed', e); }
    } else {
      try { pc.addTrack(newTrack, localStream); } catch {}
      // Rely on onnegotiationneeded to trigger a safe offer
    }
  }
}

function getSelfProfile() {
  return {
    name: localStorage.getItem('profileName') || 'Guest',
    avatar: localStorage.getItem('profileAvatar') || ''
  };
}

socket.on('connect', async () => {
  await initMedia();
  if (roomIdEl) roomIdEl.textContent = `Room: ${roomId}`;
  socket.emit('join-room', { roomId, profile: getSelfProfile() });
  statusEl.textContent = 'Connected. Waiting for peers...';
  // Default selection to self
  setMainSelected('me', { force: true });
  updateHeaderInfo();
  // Mark connected (green border)
  setHeadingConnection(true);
});

// Mark disconnected (red border) and show status
socket.on('disconnect', () => {
  setHeadingConnection(false);
  statusEl.textContent = 'Disconnected. Reconnecting...';
});

socket.on('connect_error', () => {
  setHeadingConnection(false);
  statusEl.textContent = 'Connection error. Retrying...';
});

// Quick menu toggle via Menu button
function setQuickMenuVisible(show) {
  if (!quickMenu) return;
  quickMenu.classList.toggle('hidden', !show);
  quickMenu.setAttribute('aria-hidden', String(!show));
  if (togglePanelBtn && togglePanelIcon) {
    togglePanelIcon.textContent = show ? 'close' : 'menu';
    togglePanelBtn.setAttribute('aria-expanded', String(show));
  }
}

togglePanelBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const willShow = quickMenu?.classList.contains('hidden');
  setQuickMenuVisible(!!willShow);
});

// Close quick menu on outside click
document.addEventListener('click', (e) => {
  if (!quickMenu || quickMenu.classList.contains('hidden')) return;
  const within = quickMenu.contains(e.target) || togglePanelBtn.contains(e.target);
  if (!within) setQuickMenuVisible(false);
});

// Close quick menu on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setQuickMenuVisible(false);
});

// Quick actions
quickCopyLink?.addEventListener('click', () => {
  setQuickMenuVisible(false);
  const url = `${location.origin}/room.html?room=${encodeURIComponent(roomId)}`;
  navigator.clipboard.writeText(url).catch(() => {});
});

quickParticipants?.addEventListener('click', () => {
  setQuickMenuVisible(false);
  setSidepanelVisible(true, 'participants');
});

// Side panel toggle via Chat button
const openChatIcon = openChatQuick?.querySelector('.ms-icon');
function setSidepanelVisible(show, tab) {
  if (!sidepanelEl) return;
  sidepanelEl.classList.toggle('hidden', !show);
  openChatQuick?.setAttribute('aria-expanded', String(!!show));
  if (openChatIcon) openChatIcon.textContent = show ? 'close' : 'chat';
  if (show && tab) selectTab(tab);
  // On small screens, only one of stage or sidepanel is visible
  if (window.innerWidth < 800 && stageEl) {
    stageEl.classList.toggle('hidden', !!show);
  }
}

// Sync chat button icon/aria to current sidepanel visibility on load
const sidepanelShownInit = sidepanelEl && !sidepanelEl.classList.contains('hidden');
if (openChatQuick) openChatQuick.setAttribute('aria-expanded', String(!!sidepanelShownInit));
if (openChatIcon) openChatIcon.textContent = sidepanelShownInit ? 'close' : 'chat';

// Ensure correct visibility relationship on load and resize
function enforceResponsiveLayout() {
  if (!stageEl || !sidepanelEl) return;
  const isNarrow = window.innerWidth < 800;
  const sidepanelShown = !sidepanelEl.classList.contains('hidden');
  if (isNarrow) {
    // Only one visible: if sidepanel shown, hide stage; else show stage
    stageEl.classList.toggle('hidden', sidepanelShown);
  } else {
    // Wide: always show stage; keep sidepanel as is
    stageEl.classList.remove('hidden');
  }
}

window.addEventListener('resize', enforceResponsiveLayout);
// Run once after initial sync
enforceResponsiveLayout();

openChatQuick?.addEventListener('click', (e) => {
  e.stopPropagation();
  setQuickMenuVisible(false);
  const willShow = sidepanelEl?.classList.contains('hidden');
  setSidepanelVisible(!!willShow, 'chat');
});

// Close sidepanel on Escape when focus is in panel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidepanelEl && !sidepanelEl.classList.contains('hidden')) {
    setSidepanelVisible(false);
  }
});

// Thumbnails strip toggle
toggleThumbsBtn?.addEventListener('click', () => {
  if (!thumbStripEl) return;
  thumbStripEl.classList.toggle('hidden');
  const isHidden = thumbStripEl.classList.contains('hidden');
  toggleThumbsBtn.setAttribute('aria-expanded', String(!isHidden));
  toggleThumbsBtn.setAttribute('aria-label', isHidden ? 'Show thumbnails' : 'Hide thumbnails');
  if (toggleThumbsIcon) {
    toggleThumbsIcon.textContent = isHidden ? 'view_stream' : 'view_carousel';
  }
});

socket.on('all-users', async (users) => {
  users.forEach(u => { profiles.set(u.id, u.profile || {}); });
  // Create placeholder tiles for users without streams yet
  users.forEach(u => ensureTile(u.id, false));
  renderParticipants();
  updateHeaderInfo();
  for (const u of users) {
    await callPeer(u.id);
  }
});

socket.on('user-joined', ({ id, profile }) => {
  profiles.set(id, profile || {});
  // Ensure placeholder tile appears immediately
  ensureTile(id, false);
  renderParticipants();
  statusEl.textContent = `${profile?.name || 'Someone'} joined.`;
  updateHeaderInfo();
});

socket.on('offer', async ({ from, sdp }) => {
  let pc = peers.get(from);
  if (!pc) pc = createPeerConnection(from);
  // decide politeness deterministically by id
  if (!polite.has(from)) polite.set(from, (socket.id || '') < from);
  const isPolite = polite.get(from);
  const isMakingOffer = makingOffer.get(from);
  const offerCollision = sdp.type === 'offer' && (isMakingOffer || pc.signalingState !== 'stable');
  ignoreOffer.set(from, !isPolite && offerCollision);
  if (ignoreOffer.get(from)) return;
  try {
    if (offerCollision) {
      await pc.setLocalDescription({ type: 'rollback' });
    }
    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { to: from, sdp: pc.localDescription });
  } catch (e) {
    console.warn('Error handling offer', e);
  }
});

socket.on('answer', async ({ from, sdp }) => {
  const pc = peers.get(from);
  if (!pc) return;
  try { await pc.setRemoteDescription(sdp); } catch (e) { console.warn('setRemoteDescription(answer) failed', e); }
});

socket.on('ice-candidate', async ({ from, candidate }) => {
  const pc = peers.get(from);
  if (!pc) return;
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error('Error adding ICE', e);
  }
});

socket.on('user-left', (id) => {
  removePeer(id);
  profiles.delete(id);
  renderParticipants();
  if (selectedId === id) {
    // Fallback to self or any other available
    const pick = 'me';
    setMainSelected(pick, { force: true });
  }
  updateHeaderInfo();
});

// Controls

toggleMicBtn.addEventListener('click', () => {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
  localStorage.setItem('micEnabled', String(micEnabled));
  toggleMicBtn.setAttribute('aria-label', micEnabled ? 'Mute microphone' : 'Unmute microphone');
  toggleMicBtn.title = micEnabled ? 'Mute microphone' : 'Unmute microphone';
  toggleMicBtn.classList.toggle('off', !micEnabled);
  if (micBtnIcon) micBtnIcon.textContent = micEnabled ? 'mic' : 'mic_off';
  updateTileStatus('me', { micOn: micEnabled });
  if (selectedId === 'me') updateMainStatus({ micOn: micEnabled });
});

toggleCamBtn.addEventListener('click', async () => {
  // If we have no video track, attempt to start camera now
  // If screen share is active, stop it first to keep only one source active
  if (screenStream) {
    await stopScreenShareRestore();
  }
  let videoTrack = getVideoTrack();
  if (!videoTrack) {
    await startCamera();
    // Persist that camera is now on
    camEnabled = true;
    localStorage.setItem('camEnabled', 'true');
    if (selectedId === 'me') {
      hidePlaceholderIn(mainWrapper);
      updateMainStatus({ camOn: true });
    }
    return;
  }
  camEnabled = !camEnabled;
  videoTrack.enabled = camEnabled;
  localStorage.setItem('camEnabled', String(camEnabled));
  toggleCamBtn.setAttribute('aria-label', camEnabled ? 'Stop video' : 'Start video');
  toggleCamBtn.title = camEnabled ? 'Stop video' : 'Start video';
  toggleCamBtn.classList.toggle('off', !camEnabled);
  if (camBtnIcon) camBtnIcon.textContent = camEnabled ? 'videocam' : 'videocam_off';
  if (camEnabled) hidePlaceholder('me'); else addOrUpdatePlaceholder(document.querySelector(`video[data-id="me"]`)?.parentElement || ensureTile('me', true).parentElement, 'me', true);
  updateTileStatus('me', { camOn: camEnabled });
  if (selectedId === 'me') {
    if (camEnabled) {
      hidePlaceholderIn(mainWrapper);
    } else {
      addOrUpdatePlaceholder(mainWrapper, 'me', true);
    }
    updateMainStatus({ camOn: camEnabled });
  }
});

// Screen share
let screenStream;
let prevCamTrack;

async function stopScreenShareRestore() {
  try {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
    }
    // Remove any existing video (screen) track from localStream
    const existing = localStream?.getVideoTracks?.()[0];
    if (existing && localStream) localStream.removeTrack(existing);
    // Do NOT auto-restore camera. Keep it off until user explicitly restarts.
    addOrUpdatePlaceholder(document.querySelector(`video[data-id="me"]`)?.parentElement || ensureTile('me', true).parentElement, 'me', true);
    updateTileStatus('me', { camOn: false });
    shareScreenBtn?.setAttribute('aria-label', 'Start screen share');
    shareScreenBtn && (shareScreenBtn.title = 'Start screen share');
    shareScreenBtn?.classList.remove('active');
    if (screenBtnIcon) screenBtnIcon.textContent = 'screen_share';
    if (selectedId === 'me') updateMainStatus({ camOn: false });
  } catch (e) {
    console.warn('Failed to restore after screen share', e);
  }
}

shareScreenBtn?.addEventListener('click', async () => {
  try {
    if (!screenStream) {
      // Save current camera track (do not stop it) to restore later
      prevCamTrack = getVideoTrack();

      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];

      // If camera was on, stop and remove it so it remains off after sharing
      if (prevCamTrack) {
        try { prevCamTrack.stop(); } catch {}
        if (localStream) {
          const vt = localStream.getVideoTracks();
          vt.forEach(t => localStream.removeTrack(t));
        }
        camEnabled = false;
        // Camera is off during screen share; keep camera icon off
        updateTileStatus('me', { camOn: false });
        toggleCamBtn.setAttribute('aria-label', 'Start video');
        toggleCamBtn.title = 'Start video';
        toggleCamBtn.classList.add('off');
        if (camBtnIcon) camBtnIcon.textContent = 'videocam_off';
      }

      // Replace outgoing video track for all peers
      await ensureVideoToAllPeers(screenTrack);

      // Replace local video in UI/localStream
      if (!localStream) localStream = new MediaStream();
      // Remove existing video tracks from localStream (camera) without stopping them
      localStream.getVideoTracks().forEach(t => localStream.removeTrack(t));
      localStream.addTrack(screenTrack);
      attachStream('me', localStream, true);
      hidePlaceholder('me');
      shareScreenBtn?.setAttribute('aria-label', 'Stop screen share');
      shareScreenBtn && (shareScreenBtn.title = 'Stop screen share');
      shareScreenBtn?.classList.add('active');
      if (screenBtnIcon) screenBtnIcon.textContent = 'stop_screen_share';

      screenTrack.onended = () => {
        // When user stops sharing from browser UI
        stopScreenShareRestore();
      };
    } else {
      await stopScreenShareRestore();
    }
  } catch (e) {
    console.error('Screen share error', e);
    statusEl.textContent = 'Screen share failed.';
  }
});

// Copy link
copyLinkBtn?.addEventListener('click', async () => {
  const url = `${location.origin}/room.html?room=${encodeURIComponent(roomId)}`;
  try { await navigator.clipboard.writeText(url); statusEl.textContent = 'Link copied!'; }
  catch { statusEl.textContent = url; }
  setTimeout(() => { if (statusEl.textContent === 'Link copied!') statusEl.textContent = ''; }, 1500);
});

// Tabs
function selectTab(tab) {
  if (tab === 'participants') {
    tabParticipants.classList.add('active');
    tabChat.classList.remove('active');
    panelParticipants.classList.remove('hidden');
    panelChat.classList.add('hidden');
  } else {
    tabParticipants.classList.remove('active');
    tabChat.classList.add('active');
    panelParticipants.classList.add('hidden');
    panelChat.classList.remove('hidden');
  }
}
tabParticipants?.addEventListener('click', () => selectTab('participants'));
tabChat?.addEventListener('click', () => selectTab('chat'));

// Participants rendering
function renderParticipants() {
  if (!participantsList) return;
  participantsList.innerHTML = '';
  // Self first
  const self = getSelfProfile();
  participantsList.appendChild(participantItem('me', self));
  // Others
  Array.from(profiles.entries()).forEach(([id, profile]) => {
    participantsList.appendChild(participantItem(id, profile));
  });
}

function participantItem(id, profile) {
  const li = document.createElement('li');
  li.className = 'list-item';
  const name = id === 'me' ? (profile?.name || 'You') : (profile?.name || 'Guest');
  let avatarEl;
  if (profile?.avatar) {
    avatarEl = document.createElement('img');
    avatarEl.className = 'avatar-sm';
    avatarEl.src = profile.avatar;
    avatarEl.alt = 'avatar';
  } else {
    avatarEl = document.createElement('span');
    avatarEl.className = 'avatar-sm avatar-fallback';
    const firstWord = (name || '').trim().split(/\s+/)[0] || '?';
    avatarEl.textContent = firstWord[0]?.toUpperCase() || '?';
    avatarEl.setAttribute('aria-hidden', 'true');
  }
  const span = document.createElement('span');
  span.textContent = id === 'me' ? `${name} (You)` : name;
  li.appendChild(avatarEl);
  li.appendChild(span);
  return li;
}

// Chat
function addChatMessage({ from, profile, text, when }) {
  if (!chatLog) return;
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg';
  const name = from === socket.id ? 'You' : (profile?.name || 'Guest');
  const time = new Date(when || Date.now()).toLocaleTimeString();
  wrap.innerHTML = `<div class="chat-meta"><strong>${name}</strong> <span class="muted small">${time}</span></div><div>${escapeHtml(text)}</div>`;
  chatLog.appendChild(wrap);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"]'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

sendChatBtn?.addEventListener('click', () => {
  const text = (chatText?.value || '').trim();
  if (!text) return;
  socket.emit('chat-message', { text });
  addChatMessage({ from: socket.id, profile: getSelfProfile(), text, when: Date.now() });
  chatText.value = '';
});

chatText?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatBtn?.click();
  }
});

socket.on('chat-message', (msg) => addChatMessage(msg));
socket.on('profile-updated', ({ id, profile }) => { profiles.set(id, profile || {}); renderParticipants(); });
