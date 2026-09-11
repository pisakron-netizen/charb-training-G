// Keep the same iframe in place: moving or recreating it interrupts playback.
let expandedVideo = null;
let videoReturnFocus = null;
let videoScrollY = 0;
let videoBodyStyle = '';

// Every player sits directly in the page: the clip's own play button is the
// only tap needed. Full screen stays a separate, deliberate choice.
function wrapVideoPlayer(player, options) {
  const opts = options || {};
  const wrapClass = opts.wrapClass ? ' ' + opts.wrapClass : '';
  const shellClass = opts.shellClass ? ' ' + opts.shellClass : '';

  return '<section class="video-shell' + shellClass + '" aria-label="วิดีโอการตรวจ">' +
    '<div class="yt-wrap video-stage' + wrapClass + '">' + player +
      '<button type="button" class="video-expand-float" aria-label="ขยายเต็มจอ" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></button>' +
    '</div>' +
    '<button type="button" class="video-close" aria-label="ปิดจอขยาย"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
  '</section>';
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
  const expandButton = shell.querySelector('.video-expand-float');
  if (expandButton) expandButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('video-expanded');
  document.body.style.cssText = videoBodyStyle;
  window.scrollTo(0, videoScrollY);
  if (videoReturnFocus && videoReturnFocus.isConnected) videoReturnFocus.focus({preventScroll: true});
}

function expandVideo(shell, trigger) {
  if (expandedVideo) return;
  videoReturnFocus = trigger && trigger.isConnected ? trigger : shell.querySelector('.video-expand-float');
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
  const expandButton = shell.querySelector('.video-expand-float');
  if (expandButton) expandButton.setAttribute('aria-expanded', 'true');
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
  const floating = event.target.closest('.video-expand-float');
  if (floating) {
    expandVideo(floating.closest('.video-shell'), floating);
    return;
  }
  if (event.target.closest('.video-close')) closeExpandedVideo();
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

// Some mobile and in-app browsers leave the native Fullscreen API as soon as
// the embedded Canva player receives focus. Keep the viewport-filling overlay
// active in that case; the visible close button remains the reliable exit.
