/**
 * Songs Configuration & Player for "Songs I recorded for you"
 * Store all your recorded songs here. You can paste normal Google Drive
 * share links (e.g. https://drive.google.com/file/d/XYZ/view?usp=sharing)
 * or just the raw file ID.
 */

// Edit this list to add, update, or remove your recorded songs
const recordedSongs = [
  // Example structure (will be populated with your actual songs):
  // {
  //   title: "Song Title",
  //   driveLink: "https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing",
  //   dedication: "A short dedication line for your girlfriend..."
  // }
];

/**
 * Converts any Google Drive link or file ID into an embed preview link:
 * https://drive.google.com/file/d/FILE_ID/preview
 */
function getDriveEmbedUrl(linkOrId) {
  if (!linkOrId) return '';
  const trimmed = linkOrId.trim();

  // Already preview link
  if (trimmed.includes('/preview')) {
    return trimmed;
  }

  // Matches /file/d/FILE_ID
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/file/d/${fileDMatch[1]}/preview`;
  }

  // Matches id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }

  // Direct alphanumeric ID (20+ chars)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return `https://drive.google.com/file/d/${trimmed}/preview`;
  }

  return trimmed;
}

/**
 * Initialize and render the "Songs I recorded for you" section
 */
function initRecordedSongs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!recordedSongs || recordedSongs.length === 0) {
    container.innerHTML = `
      <div class="songs-empty-state">
        <p>🎵 Recorded songs will appear here once configured.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="recorded-songs-grid">
      ${recordedSongs
        .map((song, index) => {
          const embedUrl = getDriveEmbedUrl(song.driveLink);
          return `
          <div class="song-card" data-index="${index}" onclick="openSongModal(${index})">
            <div class="song-card-badge">🎙️</div>
            <div class="song-card-content">
              <h3 class="song-card-title">${escapeHtml(song.title)}</h3>
              <p class="song-card-dedication">${escapeHtml(song.dedication)}</p>
            </div>
            <button class="song-card-play-btn" type="button" aria-label="Play ${escapeHtml(song.title)}">
              <span>▶ Play Video</span>
            </button>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

// Lightbox modal opener
function openSongModal(songIndex) {
  const song = recordedSongs[songIndex];
  if (!song) return;

  const embedUrl = getDriveEmbedUrl(song.driveLink);
  const modal = document.getElementById('song-video-modal');
  const iframe = document.getElementById('song-video-iframe');
  const titleEl = document.getElementById('song-modal-title');
  const dedicationEl = document.getElementById('song-modal-dedication');

  if (!modal || !iframe) return;

  if (titleEl) titleEl.textContent = song.title;
  if (dedicationEl) dedicationEl.textContent = song.dedication;

  // Set video source
  iframe.src = embedUrl;
  modal.classList.add('active');

  // Fade down background music automatically
  if (window.BgMusicController && typeof window.BgMusicController.fadeDown === 'function') {
    window.BgMusicController.fadeDown();
  }
}

// Lightbox modal closer
function closeSongModal() {
  const modal = document.getElementById('song-video-modal');
  const iframe = document.getElementById('song-video-iframe');

  if (!modal) return;

  modal.classList.remove('active');

  // Stop video by unsetting iframe src
  if (iframe) {
    iframe.src = 'about:blank';
  }

  // Resume background music automatically
  if (window.BgMusicController && typeof window.BgMusicController.resume === 'function') {
    window.BgMusicController.resume();
  }
}

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Setup keyboard and outside-click listeners for song modal
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('song-video-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSongModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSongModal();
    }
  });
});
