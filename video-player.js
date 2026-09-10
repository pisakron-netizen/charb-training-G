// Keep the same iframe in place: moving or recreating it interrupts playback.
let expandedVideo = null;
let videoReturnFocus = null;
let videoScrollY = 0;
let videoBodyStyle = '';

// A real <video> is placed straight into the page: its own play button is the
// single tap, and `preload="none"` keeps the topic free until that tap.
// Embeds cannot be driven from here, so they keep a cover that loads on tap.
function wrapVideoPlayer(player, options) {
  const opts = options || {};
  const wrapClass = opts.wrapClass ? ' ' + opts.wrapClass : '';
  const shellClass = opts.shellClass ? ' ' + opts.shellClass : '';
  const poster = opts.poster ? ' style="background-image:url(&quot;' + opts.poster + '&quot;)"' : '';
  const stage = opts.deferred === false
    ? player
    : '<button type="button" class="video-facade" aria-label="เล่นวิดีโอ"' + poster + '>' +
        '<span class="video-facade-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M8 5.5v13l11-6.5z"/></svg></span>' +
      '</button>' +
      '<template class="video-source">' + player + '</template>';

  return '<section class="video-shell' + shellClass + '" aria-label="วิดีโอการตรวจ">' +
    '<div class="yt-wrap video-stage' + wrapClass + '">' + stage + '</div>' +
    '<div class="video-toolbar">' +
    '<button type="button" class="video-expand" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>ขยายเต็มจอ</button>' +
    '<button type="button" class="video-reload">โหลดวิดีโอใหม่</button>' +
    '<button type="button" class="video-close">ปิดจอขยาย</button>' +
    '</div></section>';
}

// Swap the facade for the real player. Runs inside the tap so browsers accept play().
function activateVideo(shell) {
  const stage = shell.querySelector('.video-stage');
  const template = stage && stage.querySelector('template.video-source');
  if (!stage || !template) return false;

  const facade = stage.querySelector('.video-facade');
  stage.appendChild(template.content.cloneNode(true));
  template.remove();
  if (facade) facade.remove();
  shell.classList.add('is-loaded');

  const video = stage.querySelector('video');
  if (video) {
    // Metadata is only worth fetching once the viewer has committed to watching.
    video.preload = 'auto';
    const started = video.play();
    if (started && started.catch) started.catch(() => {});
  }
  return true;
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
  const expandButton = shell.querySelector('.video-expand');
  if (expandButton) expandButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('video-expanded');
  document.body.style.cssText = videoBodyStyle;
  window.scrollTo(0, videoScrollY);
  if (videoReturnFocus && videoReturnFocus.isConnected) videoReturnFocus.focus({preventScroll: true});
}

function expandVideo(shell, trigger) {
  if (expandedVideo) return;
  videoReturnFocus = trigger && trigger.isConnected ? trigger : shell.querySelector('.video-expand');
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
  const expandButton = shell.querySelector('.video-expand');
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
  const facade = event.target.closest('.video-facade');
  if (facade) {
    // Play in place. Full screen stays a separate, deliberate choice.
    activateVideo(facade.closest('.video-shell'));
    return;
  }

  const button = event.target.closest('.video-toolbar button');
  if (!button) return;
  const shell = button.closest('.video-shell');
  if (button.classList.contains('video-expand')) {
    activateVideo(shell);
    expandVideo(shell, button);
  }
  if (button.classList.contains('video-close')) closeExpandedVideo();
  if (button.classList.contains('video-reload')) {
    if (activateVideo(shell)) return;
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
