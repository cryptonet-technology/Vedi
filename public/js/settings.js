function loadProfile() {
  const name = localStorage.getItem('profileName') || '';
  const avatar = localStorage.getItem('profileAvatar') || '';
  const micOn = localStorage.getItem('permMic') !== 'off';
  const camOn = localStorage.getItem('permCam') !== 'off';
  return { name, avatar, micOn, camOn };
}

function saveProfile({ name, avatar, micOn, camOn }) {
  localStorage.setItem('profileName', name || '');
  if (avatar) localStorage.setItem('profileAvatar', avatar); else localStorage.removeItem('profileAvatar');
  localStorage.setItem('permMic', micOn ? 'on' : 'off');
  localStorage.setItem('permCam', camOn ? 'on' : 'off');
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('name');
  const avatarFile = document.getElementById('avatarFile');
  const avatarPreview = document.getElementById('avatarPreview');
  const clearAvatar = document.getElementById('clearAvatar');
  const permMic = document.getElementById('permMic');
  const permCam = document.getElementById('permCam');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  const profile = loadProfile();
  nameEl.value = profile.name;
  
  // Update avatar preview
  const updateAvatarPreview = (avatarUrl) => {
    const iconEl = avatarPreview.querySelector('.material-symbols-outlined');
    if (avatarUrl) {
      // If we have an avatar URL, replace the icon with an image
      avatarPreview.innerHTML = ''; // Clear the icon
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = 'Profile picture';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      avatarPreview.appendChild(img);
    } else {
      // If no avatar, ensure the icon is shown
      avatarPreview.innerHTML = '<span class="material-symbols-outlined" style="font-size: 40px; opacity: 0.7;">account_circle</span>';
    }
  };
  
  updateAvatarPreview(profile.avatar);
  permMic.checked = profile.micOn;
  permCam.checked = profile.camOn;

  avatarFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await toDataUrl(file);
      updateAvatarPreview(dataUrl);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  });

  clearAvatar.addEventListener('click', () => {
    updateAvatarPreview('');
    avatarFile.value = '';
  });

  saveBtn.addEventListener('click', () => {
    const avatar = avatarPreview.src || '';
    saveProfile({ name: nameEl.value.trim(), avatar, micOn: permMic.checked, camOn: permCam.checked });
    saveStatus.textContent = 'Saved!';
    setTimeout(() => saveStatus.textContent = '', 1500);
  });
});
