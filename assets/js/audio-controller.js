/**
 * Background Media Controller for Birthday Surprise
 * Plays "Zehnaseeb.mp4" video & audio looping cleanly in the background
 * with NO pink tint, soft volume (0.4), and floating mute control.
 */

(function () {
  const VIDEO_SRC = 'assets/audio/Zehnaseeb.mp4';
  const TARGET_VOLUME = 0.4;
  let bgVideo = null;
  let fadeInterval = null;
  let wasPlayingBeforeVideo = false;

  // Inject Background Video DOM & Styles automatically if not present
  function ensureBackgroundVideoElement() {
    let video = document.getElementById('bg-video');
    if (!video) {
      const wrapper = document.createElement('div');
      wrapper.className = 'bg-video-wrapper';
      wrapper.id = 'bg-video-wrapper';

      video = document.createElement('video');
      video.id = 'bg-video';
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.preload = 'auto';

      const source = document.createElement('source');
      source.src = VIDEO_SRC;
      source.type = 'video/mp4';
      video.appendChild(source);

      const overlay = document.createElement('div');
      overlay.className = 'bg-video-overlay';

      wrapper.appendChild(video);
      wrapper.appendChild(overlay);

      if (document.body.firstChild) {
        document.body.insertBefore(wrapper, document.body.firstChild);
      } else {
        document.body.appendChild(wrapper);
      }
    }

    // Ensure CSS styles without any pink wash over the video
    if (!document.getElementById('bg-video-injected-styles')) {
      const style = document.createElement('style');
      style.id = 'bg-video-injected-styles';
      style.textContent = `
        /* Remove pink background tints from body */
        body {
          background: #0d0814 !important;
          color: #ffffff;
        }
        .bg-video-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }
        #bg-video {
          position: absolute;
          top: 50%;
          left: 50%;
          min-width: 100%;
          min-height: 100%;
          width: auto;
          height: auto;
          transform: translate(-50%, -50%);
          object-fit: cover;
          opacity: 0.52;
          filter: saturate(1.15) contrast(1.05);
          transition: opacity 0.8s ease;
          pointer-events: none;
        }
        /* Neutral soft vignette so text pops without pink cast */
        .bg-video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at center, rgba(0, 0, 0, 0.15) 0%, rgba(13, 8, 20, 0.55) 100%);
          pointer-events: none;
        }
        /* Ensure main page content containers stay above video */
        .container, .memory-lane-container, .cake-container, .nav-buttons, .navigation-buttons, .scroll-wrapper {
          position: relative;
          z-index: 10;
        }
        /* Modals and Overlays must always stay fixed on top of viewport */
        .entry-overlay, .wish-message, .modal-overlay, .song-video-modal-overlay, .download-toast {
          position: fixed !important;
          z-index: 10001 !important;
        }
        .scrapbook-bg {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    return video;
  }

  // Initialize Media Controller
  function initMedia() {
    bgVideo = ensureBackgroundVideoElement();
    if (!bgVideo) return;

    bgVideo.volume = TARGET_VOLUME;

    // Check saved mute state
    const isMuted = sessionStorage.getItem('bgMusicMuted') === 'true';
    bgVideo.muted = isMuted;

    // Restore saved playback time
    const savedTime = parseFloat(sessionStorage.getItem('bgMusicTime') || '0');
    if (!isNaN(savedTime) && savedTime > 0) {
      bgVideo.currentTime = savedTime;
    }

    // Save playback position
    bgVideo.addEventListener('timeupdate', () => {
      try {
        sessionStorage.setItem('bgMusicTime', bgVideo.currentTime.toString());
      } catch (e) {}
    });

    // Check if previously playing
    const shouldPlay = sessionStorage.getItem('bgMusicPlaying') === 'true';
    if (shouldPlay) {
      bgVideo
        .play()
        .then(() => {
          updateButtonUI(true);
        })
        .catch(() => {
          updateButtonUI(false);
        });
    }

    createFloatingMuteButton();
  }

  // Save state on unload
  window.addEventListener('beforeunload', () => {
    if (bgVideo) {
      try {
        sessionStorage.setItem('bgMusicTime', bgVideo.currentTime.toString());
        sessionStorage.setItem(
          'bgMusicPlaying',
          (!bgVideo.paused && !bgVideo.ended).toString()
        );
      } catch (e) {}
    }
  });

  // Start video & audio
  function startMedia() {
    if (!bgVideo) {
      bgVideo = ensureBackgroundVideoElement();
    }
    if (!bgVideo) return;

    bgVideo.volume = TARGET_VOLUME;
    bgVideo.muted = sessionStorage.getItem('bgMusicMuted') === 'true';

    bgVideo
      .play()
      .then(() => {
        sessionStorage.setItem('bgMusicPlaying', 'true');
        updateButtonUI(true);
      })
      .catch((err) => {
        console.warn('Video playback interaction required:', err);
      });
  }

  // Toggle mute
  function toggleMute() {
    if (!bgVideo) return;

    if (bgVideo.paused) {
      startMedia();
      return;
    }

    bgVideo.muted = !bgVideo.muted;
    sessionStorage.setItem('bgMusicMuted', bgVideo.muted.toString());
    updateButtonUI(!bgVideo.muted);
  }

  // Fade down or pause when a song video modal opens
  function fadeDownMedia() {
    if (!bgVideo) return;
    wasPlayingBeforeVideo = !bgVideo.paused;
    if (!wasPlayingBeforeVideo) return;

    clearInterval(fadeInterval);
    const step = bgVideo.volume / 10;
    fadeInterval = setInterval(() => {
      if (bgVideo.volume > 0.05) {
        bgVideo.volume = Math.max(0, bgVideo.volume - step);
      } else {
        clearInterval(fadeInterval);
        bgVideo.pause();
      }
    }, 40);
  }

  // Fade in or resume when a song video modal closes
  function resumeMedia() {
    if (!bgVideo || !wasPlayingBeforeVideo) return;

    clearInterval(fadeInterval);
    bgVideo.volume = 0;
    bgVideo
      .play()
      .then(() => {
        sessionStorage.setItem('bgMusicPlaying', 'true');
        updateButtonUI(true);
        const step = TARGET_VOLUME / 10;
        fadeInterval = setInterval(() => {
          if (bgVideo.volume < TARGET_VOLUME - 0.05) {
            bgVideo.volume = Math.min(TARGET_VOLUME, bgVideo.volume + step);
          } else {
            bgVideo.volume = TARGET_VOLUME;
            clearInterval(fadeInterval);
          }
        }, 50);
      })
      .catch((err) => console.log('Resume error:', err));
  }

  // Floating button
  function createFloatingMuteButton() {
    if (document.getElementById('floating-music-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'floating-music-btn';
    btn.setAttribute('aria-label', 'Toggle Background Video & Audio');
    btn.title = 'Zehnaseeb Background Video';

    btn.innerHTML = `
      <span class="music-wave" id="music-wave-bars">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </span>
      <span id="music-btn-icon">🎵</span>
    `;

    const style = document.createElement('style');
    style.id = 'floating-music-btn-styles';
    style.textContent = `
      #floating-music-btn {
        position: fixed;
        bottom: 22px;
        right: 22px;
        z-index: 9999;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(255, 105, 180, 0.95), rgba(138, 43, 226, 0.95));
        border: 2px solid rgba(255, 255, 255, 0.9);
        color: white;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 18px rgba(255, 20, 147, 0.5), 0 0 12px rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        outline: none;
        padding: 0;
      }
      #floating-music-btn:hover {
        transform: scale(1.12);
        box-shadow: 0 6px 24px rgba(255, 20, 147, 0.7), 0 0 15px rgba(255, 255, 255, 0.7);
      }
      #floating-music-btn:active {
        transform: scale(0.95);
      }
      #music-btn-icon {
        font-size: 1.25rem;
        line-height: 1;
        transition: transform 0.3s ease;
      }
      .music-wave {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 2px;
        height: 10px;
        margin-bottom: 2px;
      }
      .music-wave .bar {
        width: 2.5px;
        height: 100%;
        background-color: white;
        border-radius: 2px;
        animation: musicWave 1.2s ease-in-out infinite alternate;
      }
      .music-wave .bar:nth-child(2) {
        animation-delay: 0.25s;
        height: 70%;
      }
      .music-wave .bar:nth-child(3) {
        animation-delay: 0.5s;
        height: 40%;
      }
      .music-muted .music-wave {
        display: none !important;
      }
      .music-muted #music-btn-icon {
        opacity: 0.7;
      }
      @keyframes musicWave {
        0% { height: 20%; }
        50% { height: 100%; }
        100% { height: 40%; }
      }
      @media (max-width: 480px) {
        #floating-music-btn {
          bottom: 16px;
          right: 16px;
          width: 46px;
          height: 46px;
        }
        #music-btn-icon {
          font-size: 1.1rem;
        }
      }
    `;
    document.head.appendChild(style);

    btn.addEventListener('click', toggleMute);
    document.body.appendChild(btn);

    const isPlaying = bgVideo && !bgVideo.paused && !bgVideo.muted;
    updateButtonUI(isPlaying);
  }

  function updateButtonUI(isPlaying) {
    const btn = document.getElementById('floating-music-btn');
    if (!btn) return;
    const icon = document.getElementById('music-btn-icon');
    const wave = document.getElementById('music-wave-bars');

    if (bgVideo && bgVideo.muted) {
      btn.classList.add('music-muted');
      if (icon) icon.textContent = '🔇';
      if (wave) wave.style.display = 'none';
    } else if (isPlaying) {
      btn.classList.remove('music-muted');
      if (icon) icon.textContent = '🎵';
      if (wave) wave.style.display = 'flex';
    } else {
      btn.classList.add('music-muted');
      if (icon) icon.textContent = '▶️';
      if (wave) wave.style.display = 'none';
    }
  }

  // Export methods globally
  window.BgMusicController = {
    start: startMedia,
    toggleMute: toggleMute,
    fadeDown: fadeDownMedia,
    resume: resumeMedia,
    getVideo: () => bgVideo,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMedia);
  } else {
    initMedia();
  }
})();
