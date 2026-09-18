// Builds a printable A4 handout for one topic and saves it as a PDF.
// html2pdf is loaded on first use so it never slows down normal page loads.
(function() {
  const LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  let libPromise = null;

  function loadLib() {
    if (window.html2pdf) return Promise.resolve();
    if (!libPromise) {
      libPromise = new Promise(function(resolve, reject) {
        const s = document.createElement('script');
        s.src = LIB_URL;
        s.onload = resolve;
        s.onerror = function() { libPromise = null; reject(new Error('load failed')); };
        document.head.appendChild(s);
      });
    }
    return libPromise;
  }

  const STYLE = `
    .pdf-doc { width: 718px; padding: 0; color: #1D1D1B; background: #FFFFFF;
      font-family: 'IBM Plex Sans Thai', 'IBM Plex Sans', sans-serif; font-size: 13px; line-height: 1.6; }
    .pdf-doc * { box-sizing: border-box; }
    .pdf-head { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 3px solid #C8102E; }
    .pdf-head img { width: 120px; height: auto; }
    .pdf-head-org { font-size: 11px; color: #585854; line-height: 1.4; }
    .pdf-head-org b { display: block; color: #980C22; font-size: 12px; }
    .pdf-title { margin: 16px 0 6px; font-size: 22px; font-weight: 800; line-height: 1.35; }
    .pdf-cat { display: inline-block; padding: 2px 10px; border: 1px solid #E7C5CB; border-radius: 999px;
      color: #980C22; font-size: 11px; font-weight: 700; }
    .pdf-section { margin-top: 20px; }
    .pdf-bar { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 6px 6px 0 0;
      color: #FFFFFF; font-size: 15px; font-weight: 800; background: #B20E29; }
    .pdf-bar.tech { background: #3C3C38; }
    .pdf-bar-mark { padding: 1px 8px; border-radius: 4px; background: #FFFFFF; color: #980C22; font-size: 12px; }
    .pdf-bar.tech .pdf-bar-mark { color: #3C3C38; }
    .pdf-item { padding: 12px 14px; border: 1px solid #E3E3DF; border-top: 0; }
    .pdf-item-head { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; font-weight: 800; }
    .pdf-num { flex: 0 0 22px; height: 22px; border-radius: 4px; background: #C8102E; color: #FFFFFF;
      font-size: 11px; font-weight: 800; text-align: center; line-height: 22px; }
    .pdf-body { padding-left: 32px; }
    .pdf-label { margin: 8px 0 3px; color: #980C22; font-size: 11.5px; font-weight: 800; }
    .pdf-points { margin: 0; padding-left: 18px; }
    .pdf-points li { margin: 2px 0; }
    .pdf-grid { display: flex; gap: 10px; margin-top: 8px; }
    .pdf-box { flex: 1; padding: 8px 10px; border-radius: 5px; background: #F7F7F5; }
    .pdf-box.impact { background: #FFF4F5; }
    .pdf-box .pdf-label { margin-top: 0; }
    .pdf-box p, .pdf-text { margin: 0; }
    .pdf-imgs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .pdf-imgs figure { width: calc(50% - 4px); margin: 0; }
    .pdf-imgs img { display: block; width: 100%; max-height: 210px; object-fit: contain;
      border: 1px solid #E3E3DF; border-radius: 5px; background: #F4F4F2; }
    .pdf-imgs figcaption { margin-top: 3px; color: #585854; font-size: 10.5px; line-height: 1.4; }
    .pdf-foot { margin-top: 20px; padding-top: 10px; border-top: 1px solid #E3E3DF; color: #585854;
      font-size: 10.5px; line-height: 1.6; word-break: break-all; }
    .pdf-avoid { page-break-inside: avoid; break-inside: avoid; }
  `;

  function esc(v) { return window.escapeHtml ? window.escapeHtml(v) : String(v || ''); }

  function observationImages(item) {
    if (Array.isArray(item.images) && item.images.length) return item.images;
    return item.src ? [{ src: item.src, caption: item.caption || '' }] : [];
  }

  function buildDoc(t) {
    const issues = Array.isArray(t.issuesList) ? t.issuesList : [];
    const obs = Array.isArray(t.quickObservations) && t.quickObservations.length
      ? t.quickObservations : (t.observationPoints || []);
    const steps = Array.isArray(t.steps) ? t.steps : [];
    const rawVideo = ((window.trainingData.videoUrls || {})[t.id] || '').trim();
    const videoLink = rawVideo.replace(/\?embed$/, '');
    const pageLink = typeof buildShareUrl === 'function' ? buildShareUrl(t.id) : location.href;

    const saHtml = issues.map(function(iss, i) {
      const pts = Array.isArray(iss.talkingPoints) && iss.talkingPoints.length
        ? '<div class="pdf-label">ประเด็นคุยกับลูกค้า</div><ul class="pdf-points">' +
          iss.talkingPoints.map(function(p) { return '<li>' + p + '</li>'; }).join('') + '</ul>'
        : '';
      return '<div class="pdf-item pdf-avoid">' +
        '<div class="pdf-item-head"><span class="pdf-num">' + (i + 1) + '</span><span>' + iss.issue + '</span></div>' +
        '<div class="pdf-body">' + pts +
          '<div class="pdf-grid">' +
            '<div class="pdf-box"><div class="pdf-label">วิธีการแก้ไข</div><p>' + (iss.solution || '-') + '</p></div>' +
            '<div class="pdf-box impact"><div class="pdf-label">ผลกระทบหากไม่แก้ไข</div><p>' + (iss.fix || '-') + '</p></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    const techHtml = obs.length
      ? obs.map(function(item, i) {
          const imgs = observationImages(item);
          return '<div class="pdf-item pdf-avoid">' +
            '<div class="pdf-item-head"><span class="pdf-num">' + (i + 1) + '</span><span>' + item.title + '</span></div>' +
            '<div class="pdf-body">' +
              '<p class="pdf-text" style="margin-top:4px">' + (item.text || '') + '</p>' +
              (imgs.length ? '<div class="pdf-imgs">' + imgs.map(function(img) {
                return '<figure><img src="' + img.src + '" alt="">' +
                  (img.caption ? '<figcaption>' + img.caption + '</figcaption>' : '') + '</figure>';
              }).join('') + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('')
      : steps.map(function(step, i) {
          return '<div class="pdf-item pdf-avoid"><div class="pdf-item-head"><span class="pdf-num">' +
            (i + 1) + '</span><span>' + step + '</span></div></div>';
        }).join('');

    const el = document.createElement('div');
    el.innerHTML = '<style>' + STYLE + '</style>' +
      '<div class="pdf-doc">' +
        '<div class="pdf-head">' +
          '<img src="chairatchakarn-group-logo.png" alt="">' +
          '<div class="pdf-head-org"><b>ชัยรัชการ (กรุงเทพ) จำกัด</b>การฝึกอบรม · ตรวจเช็ก 117 รายการ</div>' +
        '</div>' +
        '<div class="pdf-title">' + esc(t.title) + '</div>' +
        '<span class="pdf-cat">' + esc(t.category) + '</span>' +
        (saHtml ? '<div class="pdf-section"><div class="pdf-bar"><span class="pdf-bar-mark">SA</span>ข้อมูลสำหรับแนะนำลูกค้า</div>' + saHtml + '</div>' : '') +
        (techHtml ? '<div class="pdf-section"><div class="pdf-bar tech"><span class="pdf-bar-mark">ช่าง</span>' +
          (obs.length ? 'จุดสังเกตในการตรวจ' : 'ขั้นตอนตรวจสอบ') + '</div>' + techHtml + '</div>' : '') +
        '<div class="pdf-foot pdf-avoid">' +
          'หน้าหัวข้อออนไลน์: ' + esc(pageLink) +
          (videoLink ? '<br>วิดีโอการตรวจ: ' + esc(videoLink) : '') +
        '</div>' +
      '</div>';
    return el;
  }

  window.downloadTopicPdf = async function(topicId, button) {
    const t = (window.trainingData.topics || []).find(function(x) { return x.id === topicId; });
    if (!t) return;
    const label = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'กำลังสร้าง PDF...'; }
    try {
      await loadLib();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const small = window.innerWidth < 700;
      await window.html2pdf().set({
        margin: [10, 10, 12, 10],
        filename: 'ตรวจเช็ก-' + t.id + '-' + t.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 60) + '.pdf',
        image: { type: 'jpeg', quality: 0.9 },
        html2canvas: { scale: small ? 1.5 : 2, useCORS: true, backgroundColor: '#FFFFFF' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.pdf-avoid' }
      }).from(buildDoc(t)).save();
    } catch (err) {
      alert('สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      if (button) { button.disabled = false; button.textContent = label; }
    }
  };
})();
