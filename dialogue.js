// Standard SA dialogue, shared by the topic page (index.html) and the PDF (topic-pdf.js).
// Lines are written in the male voice; voiceText() switches them to the female voice.
// Markers: ___ = blank to fill in, *text* = bold, [text] = stage direction.
(function() {
  const URGENCY = {
    now: {
      label: 'ต้องทำวันนี้',
      line: 'ข้อนี้เป็นเรื่องที่*ต้องทำวันนี้*ครับ ไม่แนะนำให้ใช้รถต่อทั้งที่ยังไม่ซ่อมครับ',
      price: 'ข้อนี้เป็นรายการที่ต้องทำวันนี้ครับ'
    },
    soon: {
      label: 'ควรทำรอบนี้',
      line: 'ข้อนี้*ควรทำในรอบนี้*ครับ ถ้าปล่อยไว้ ความเสียหายจะลามและค่าซ่อมจะสูงขึ้นครับ',
      price: 'ข้อนี้ควรทำในรอบนี้ครับ'
    },
    later: {
      label: 'ติดตามรอบหน้า',
      line: 'ข้อนี้*ยังไม่เร่งด่วน*ครับ แต่ควรติดตามในรอบหน้าครับ',
      price: 'ข้อนี้รอรอบหน้าได้ครับ'
    }
  };

  function parts(s) {
    const u = !s.noQuote && URGENCY[s.urgency] ? s.urgency : null;
    const main = [
      'คุณลูกค้าครับ นี่คือคลิปที่ช่างตรวจรถของคุณลูกค้าครับ [เปิดคลิปให้ดู]',
      u ? URGENCY[u].line : '',
      s.explain,
      s.risk,
      s.noQuote
        ? 'ศูนย์ของเรา' + s.recommend + 'ทุกครั้งครับ'
        : 'ผมแนะนำให้' + s.recommend + 'ครับ ใช้เวลาประมาณ ___ ค่าใช้จ่ายประมาณ ___ ครับ',
      s.close || 'ให้ผมแจ้งช่างเริ่มงานเลยไหมครับ'
    ].filter(Boolean);

    const replies = [];
    if (Array.isArray(s.objection) && s.objection[0] && s.objection[1]) replies.push(s.objection);
    if (!s.noQuote) {
      replies.push(
        ['ต้องถามเจ้าของรถก่อน',
         'ได้ครับ ผมส่งคลิปนี้ให้เจ้าของรถทาง LINE ได้เลย จะได้เห็นเหมือนที่เราเห็นครับ ขอเบอร์หรือไลน์เจ้าของรถได้ไหมครับ'],
        ['แพงไป / ร้านข้างนอกถูกกว่า',
         'ผมแยกราคาให้ดูทีละรายการได้ครับ ว่ารายการไหนต้องทำวันนี้ รายการไหนรอรอบหน้าได้' + (u ? ' ' + URGENCY[u].price : '')],
        ['รถต้องออกวิ่งงาน รอไม่ได้',
         'งานนี้ใช้เวลาประมาณ ___ ครับ ถ้าวันนี้ไม่สะดวก ผมนัดวันที่ ___ ให้ได้ครับ' +
         (u === 'now' ? ' แต่ข้อนี้ไม่แนะนำให้ใช้รถต่อทั้งที่ยังไม่ซ่อมครับ' : '')],
        ['ยังไม่ซ่อม',
         'ได้ครับ รบกวนเซ็นรับทราบในใบสั่งงานว่าเราแจ้งเรื่องนี้แล้ว และผมขอนัดตรวจอีกครั้งวันที่ ___ ครับ']
      );
    }
    return { urgency: u, main: main, replies: replies };
  }

  function voiceText(text, voice) {
    if (voice !== 'f') return text;
    return text
      .replace(/คุณลูกค้าครับ/g, 'คุณลูกค้าคะ')
      .replace(/นะครับ/g, 'นะคะ')
      .replace(/(ไหม|หรือเปล่า|หรือยัง|อะไร|ไหน|ยังไง|เท่าไหร่)ครับ/g, '$1คะ')
      .replace(/ครับ/g, 'ค่ะ')
      .replace(/ผม/g, 'ดิฉัน');
  }

  function toHtml(text, voice) {
    return String(voiceText(text || '', voice))
      .replace(/[&<>"']/g, function(ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      })
      .replace(/___/g, '<span class="script-blank">______</span>')
      .replace(/\*([^*]+)\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]/g, '<span class="script-act">($1)</span>');
  }

  // Remember the SA's choice on this device only.
  function getVoice() {
    try { return localStorage.getItem('charb-voice') === 'f' ? 'f' : 'm'; } catch (e) { return 'm'; }
  }
  function setVoice(v) {
    try { localStorage.setItem('charb-voice', v); } catch (e) {}
  }

  window.Dialogue = { URGENCY: URGENCY, parts: parts, toHtml: toHtml, getVoice: getVoice, setVoice: setVoice };
})();
