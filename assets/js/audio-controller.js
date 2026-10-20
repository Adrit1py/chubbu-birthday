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
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('autoplay', '');
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

    // Check saved mute state (default to false if not set so audio plays)
    const savedMuted = sessionStorage.getItem('bgMusicMuted');
    bgVideo.muted = savedMuted === 'true';

    // Check if on landing page (index.html or root /)
    const pathname = window.location.pathname.toLowerCase();
    const isLandingPage = pathname.endsWith('index.html') || pathname === '/' || pathname.endsWith('/');

    if (isLandingPage) {
      // Landing page: always start video from the beginning (0s)
      bgVideo.currentTime = 0;
      sessionStorage.setItem('bgMusicTime', '0');
      bgVideo.addEventListener('loadedmetadata', () => {
        bgVideo.currentTime = 0;
      }, { once: true });
    } else {
      // Subsequent pages (memorylane, cake, letter): continue from saved playback time
      const savedTime = parseFloat(sessionStorage.getItem('bgMusicTime') || '0');
      if (!isNaN(savedTime) && savedTime > 0) {
        bgVideo.currentTime = savedTime;
      }
    }

    // Save playback position
    bgVideo.addEventListener('timeupdate', () => {
      try {
        sessionStorage.setItem('bgMusicTime', bgVideo.currentTime.toString());
      } catch (e) {}
    });

    // Make Zehnaseeb video play by default on opening site
    const attemptAutoplay = () => {
      const playPromise = bgVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            sessionStorage.setItem('bgMusicPlaying', 'true');
            updateButtonUI(true);
          })
          .catch((err) => {
            console.info('Unmuted autoplay blocked by browser policy; starting muted video first:', err);
            // Browser restricted unmuted autoplay; play video muted so it runs by default
            bgVideo.muted = true;
            bgVideo.play()
              .then(() => {
                sessionStorage.setItem('bgMusicPlaying', 'true');
                updateButtonUI(false);
              })
              .catch((e) => {
                console.warn('Muted autoplay also blocked:', e);
              });

            // Automatically unmute audio on the very first tap or click anywhere on the page
            const enableAudioOnInteraction = () => {
              if (bgVideo) {
                bgVideo.muted = false;
                bgVideo.volume = TARGET_VOLUME;
                sessionStorage.setItem('bgMusicMuted', 'false');
                sessionStorage.setItem('bgMusicPlaying', 'true');
                bgVideo.play().catch(() => {});
                updateButtonUI(true);
              }
              window.removeEventListener('click', enableAudioOnInteraction);
              window.removeEventListener('touchstart', enableAudioOnInteraction);
              window.removeEventListener('keydown', enableAudioOnInteraction);
            };

            window.addEventListener('click', enableAudioOnInteraction, { once: true });
            window.addEventListener('touchstart', enableAudioOnInteraction, { once: true });
            window.addEventListener('keydown', enableAudioOnInteraction, { once: true });
          });
      }
    };

    attemptAutoplay();
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
    bgVideo.muted = false;
    sessionStorage.setItem('bgMusicMuted', 'false');

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

  // Soft Romantic Heart Cursor Sparks (Desktop only, throttled & lightweight)
  function initHeartCursorTrail() {
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;

    const heartSymbols = ['❤️', '💖', '✨', '💕', '🌸', '💫'];
    let lastTime = 0;
    let lastX = 0;
    let lastY = 0;

    const style = document.createElement('style');
    style.textContent = `
      .cursor-heart-particle {
        position: fixed;
        pointer-events: none;
        z-index: 99999;
        font-size: 14px;
        user-select: none;
        transform: translate(-50%, -50%) scale(1);
        animation: cursorHeartFloat 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        will-change: transform, opacity;
      }
      @keyframes cursorHeartFloat {
        0% {
          opacity: 0.9;
          transform: translate(-50%, -50%) scale(0.6) rotate(0deg);
        }
        50% {
          opacity: 0.8;
          transform: translate(calc(-50% + var(--dx, 0px)), calc(-50% - 24px)) scale(1.1) rotate(var(--rot, 15deg));
        }
        100% {
          opacity: 0;
          transform: translate(calc(-50% + var(--dx, 0px)), calc(-50% - 48px)) scale(0.4) rotate(var(--rot, 30deg));
        }
      }
    `;
    document.head.appendChild(style);

    window.addEventListener('mousemove', (e) => {
      const now = performance.now();
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      if (now - lastTime < 75 && dist < 22) return;
      lastTime = now;
      lastX = e.clientX;
      lastY = e.clientY;

      const heart = document.createElement('span');
      heart.className = 'cursor-heart-particle';
      heart.textContent = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
      heart.style.left = `${e.clientX}px`;
      heart.style.top = `${e.clientY}px`;
      heart.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
      heart.style.setProperty('--rot', `${(Math.random() - 0.5) * 50}deg`);
      if (Math.random() > 0.5) {
        heart.style.fontSize = `${10 + Math.random() * 8}px`;
      }

      document.body.appendChild(heart);
      setTimeout(() => {
        if (heart.parentNode) heart.parentNode.removeChild(heart);
      }, 1150);
    }, { passive: true });
  }

  // Reset video & audio to beginning (0s)
  function resetToStart() {
    if (bgVideo) {
      bgVideo.currentTime = 0;
      sessionStorage.setItem('bgMusicTime', '0');
    }
  }

  // Export methods globally
  window.BgMusicController = {
    start: startMedia,
    resetToStart: resetToStart,
    toggleMute: toggleMute,
    fadeDown: fadeDownMedia,
    resume: resumeMedia,
    getVideo: () => bgVideo,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMedia();
      initHeartCursorTrail();
    });
  } else {
    initMedia();
    initHeartCursorTrail();
  }
})();
