// Keep the same iframe in place: moving or recreating it interrupts playback.
let expandedVideo = null;
let videoReturnFocus = null;
let videoScrollY = 0;
let videoBodyStyle = '';

function wrapVideoPlayer(player, extraClass) {
  return '<section class="video-shell ' + (extraClass || '') + '" aria-label="วิดีโอการตรวจ">' + player +
    '<div class="video-toolbar">' +
    '<button type="button" class="video-expand" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>ขยายเต็มจอ</button>' +
    '<button type="button" class="video-reload">โหลดวิดีโอใหม่</button>' +
    '<button type="button" class="video-close">ปิดจอขยาย</button>' +
    '</div></section>';
}

function closeExpandedVideo() {
  if (!expandedVideo) return;
  const shell = expandedVideo;
  expandedVideo = null;
  const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
  if (fullscreenElement === shell) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) {
      try { const result = exit.call(document); if (result && result.catch) result.catch(() => {}); } catch (_) {}
    }
  }
  shell.classList.remove('is-expanded');
  shell.removeAttribute('role');
  shell.removeAttribute('aria-modal');
  shell.querySelector('.video-expand').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('video-expanded');
  document.body.style.cssText = videoBodyStyle;
  window.scrollTo(0, videoScrollY);
  if (videoReturnFocus && videoReturnFocus.isConnected) videoReturnFocus.focus({preventScroll: true});
}

function expandVideo(shell, trigger) {
  if (expandedVideo) return;
  videoReturnFocus = trigger;
  videoScrollY = window.scrollY;
  videoBodyStyle = document.body.style.cssText;
  expandedVideo = shell;
  // Viewport mode works even when the browser has no Fullscreen API or rejects it.
  document.body.style.position = 'fixed';
  document.body.style.top = '-' + videoScrollY + 'px';
  document.body.style.width = '100%';
  document.body.classList.add('video-expanded');
  shell.classList.add('is-expanded');
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'true');
  trigger.setAttribute('aria-expanded', 'true');
  shell.querySelector('.video-close').focus({preventScroll: true});
  const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
  if (request) {
    try {
      const result = request.call(shell);
      if (result && result.then) result.then(() => {
        // A user can close the viewer while the browser is still entering fullscreen.
        if (expandedVideo !== shell && (document.fullscreenElement || document.webkitFullscreenElement) === shell) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) { const pending = exit.call(document); if (pending && pending.catch) pending.catch(() => {}); }
        }
      }).catch(() => {});
    } catch (_) { /* The viewport mode above remains usable. */ }
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('.video-toolbar button');
  if (!button) return;
  const shell = button.closest('.video-shell');
  if (button.classList.contains('video-expand')) expandVideo(shell, button);
  if (button.classList.contains('video-close')) closeExpandedVideo();
  if (button.classList.contains('video-reload')) {
    const frame = shell.querySelector('iframe');
    const video = shell.querySelector('video');
    if (frame) frame.src = frame.src;
    if (video) video.load();
  }
});

document.addEventListener('keydown', event => {
  if (!expandedVideo) return;
  if (event.key === 'Escape') closeExpandedVideo();
  if (event.key === 'Tab') {
    const controls = Array.from(expandedVideo.querySelectorAll('iframe, video, button')).filter(el => el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

let videoWasNativeFullscreen = false;
function syncVideoFullscreen() {
  const current = document.fullscreenElement || document.webkitFullscreenElement;
  if (expandedVideo && current === expandedVideo) videoWasNativeFullscreen = true;
  else if (!current && videoWasNativeFullscreen) {
    videoWasNativeFullscreen = false;
    closeExpandedVideo();
  }
}
document.addEventListener('fullscreenchange', syncVideoFullscreen);
document.addEventListener('webkitfullscreenchange', syncVideoFullscreen);
