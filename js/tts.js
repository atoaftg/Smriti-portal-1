/* Read-aloud player with progress bar, seek, skip and speed.
 *
 * Uses the browser's built-in speech synthesis (free, works offline, no key). It prefers an
 * English (India) voice: on Windows/Edge install "Microsoft Neerja / Prabhat Online (Natural)",
 * on Android/Chrome pick "English (India)" in Text-to-speech settings, on iOS add "Rishi"/"Veena"
 * under Accessibility > Spoken Content > Voices. Quality is therefore device-dependent.
 * For ONE consistent studio-quality Indian voice for everyone, pre-generate MP3s with a neural TTS
 * service (e.g. Azure en-IN Neerja/Prabhat, Google en-IN Neural2) and set asset.audio (README).
 */
(function (w) {
  const synth = w.speechSynthesis;
  const CPS = 15;                       // ~ characters spoken per second at 1x (about 150 wpm)
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  let active = null;                    // only one reader speaks at a time

  function voices() { return synth ? synth.getVoices() : []; }
  function pick(list, savedName) {
    if (savedName) { const v = list.find((x) => x.name === savedName); if (v) return v; }
    const score = (v) => {
      let s = 0; const n = v.name.toLowerCase(), l = (v.lang || '').replace('_', '-').toLowerCase();
      if (l === 'en-in') s += 100; else if (l.startsWith('en')) s += 10;
      if (/neerja|prabhat|heera|ravi|veena|rishi|aditi|raveena|kajal/.test(n)) s += 30;
      if (/natural|neural|online|google|enhanced|premium/.test(n)) s += 20;
      if (/india/.test(n)) s += 15;
      return s;
    };
    return list.slice().sort((a, b) => score(b) - score(a))[0] || null;
  }
  const hasIndian = (v) => v && (/en[-_]in/i.test(v.lang) || /india/i.test(v.name));

  function Reader(mount, text, opts = {}) {
    const self = this;
    this.text = text; this.rate = +(localStorage.getItem('smriti_rate') || 1);
    this.pos = 0; this.playing = false; this.tok = 0; this.total = text.length;
    mount.innerHTML = `
      <div class="reader" role="group" aria-label="Read aloud">
        <div class="rd-row">
          <button class="btn sm ghost" data-a="back" title="Back 10 seconds" aria-label="Back 10 seconds">⏪ 10s</button>
          <button class="btn sm primary rd-play" data-a="play" aria-label="Play">▶ Listen</button>
          <button class="btn sm ghost" data-a="fwd" title="Forward 10 seconds" aria-label="Forward 10 seconds">10s ⏩</button>
          <label class="rd-speed">Speed
            <select aria-label="Speed">${[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => `<option value="${r}" ${r === self.rate ? 'selected' : ''}>${r}x</option>`).join('')}</select>
          </label>
          <button class="btn sm ghost" data-a="stop" aria-label="Stop" title="Stop">■</button>
        </div>
        <input class="rd-bar" type="range" min="0" max="1000" value="0" aria-label="Reading progress">
        <div class="rd-meta"><span class="rd-cur">0:00</span><span class="rd-voice muted"></span><span class="rd-tot">0:00</span></div>
        <div class="rd-note muted" hidden></div>
      </div>`;
    this.el = mount.firstElementChild;
    this.bar = this.el.querySelector('.rd-bar');
    this.btn = this.el.querySelector('.rd-play');
    this.sel = this.el.querySelector('select');
    this.curEl = this.el.querySelector('.rd-cur'); this.totEl = this.el.querySelector('.rd-tot');
    this.vEl = this.el.querySelector('.rd-voice'); this.noteEl = this.el.querySelector('.rd-note');

    if (!synth) { this.noteEl.hidden = false; this.noteEl.textContent = 'Read-aloud is not supported in this browser. Try Chrome, Edge or Safari.'; this.btn.disabled = true; return; }

    this.voice = null;
    const setVoice = () => {
      this.voice = pick(voices(), localStorage.getItem('smriti_voice'));
      this.vEl.textContent = this.voice ? this.voice.name.replace(/^Microsoft |^Google /, '') : 'default voice';
      if (this.voice && !hasIndian(this.voice)) {
        this.noteEl.hidden = false;
        this.noteEl.textContent = 'No English (India) voice found on this device. Add one in your device\'s text-to-speech settings for a natural Indian accent.';
      } else this.noteEl.hidden = true;
    };
    setVoice();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', setVoice);

    this.el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'play') self.toggle();
      else if (a === 'stop') self.stop(true);
      else if (a === 'back') self.seekBy(-10);
      else if (a === 'fwd') self.seekBy(10);
    });
    this.sel.addEventListener('change', () => {
      self.rate = +self.sel.value; localStorage.setItem('smriti_rate', self.rate);
      if (self.playing) self.speakFrom(self.pos); else self.paint();
    });
    this.bar.addEventListener('input', () => { self.pos = (self.bar.value / 1000) * self.total; self.paint(true); });
    this.bar.addEventListener('change', () => { self.pos = (self.bar.value / 1000) * self.total; if (self.playing) self.speakFrom(self.pos); });
    this.paint();
  }

  Reader.prototype.paint = function (fromBar) {
    if (!fromBar) this.bar.value = this.total ? Math.round((this.pos / this.total) * 1000) : 0;
    const cps = CPS * this.rate;
    this.curEl.textContent = fmt(this.pos / cps); this.totEl.textContent = fmt(this.total / cps);
    this.btn.textContent = this.playing ? '⏸ Pause' : (this.pos > 1 && this.pos < this.total - 1 ? '▶ Resume' : '▶ Listen');
    this.btn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
  };

  Reader.prototype.setText = function (text) { this.stop(true); this.text = text; this.total = text.length; this.pos = 0; this.paint(); };

  Reader.prototype.chunkAt = function (pos) {
    // speak sentence by sentence (long utterances get cut off by some browsers)
    const t = this.text; let start = Math.max(0, Math.min(pos, t.length));
    while (start > 0 && start < t.length && !/\s/.test(t[start - 1])) start++;   // snap to a word start
    const m = /[.!?]["')\]]?(\s|$)/g; m.lastIndex = start;
    let end = t.length; const r = m.exec(t); if (r) end = r.index + r[0].length;
    return { start, end };
  };

  Reader.prototype.speakFrom = function (pos) {
    const self = this; synth.cancel();
    const tok = ++this.tok; this.playing = true; active = this;
    if (pos >= this.total - 1) pos = 0;
    this.pos = pos;
    const next = (p) => {
      if (tok !== self.tok) return;
      if (p >= self.total - 1) { self.playing = false; self.pos = 0; self.paint(); return; }
      const { start, end } = self.chunkAt(p);
      const seg = self.text.slice(start, end);
      if (!seg.trim()) { next(end + 1); return; }
      const u = new SpeechSynthesisUtterance(seg);
      if (self.voice) { u.voice = self.voice; u.lang = self.voice.lang; } else u.lang = 'en-IN';
      u.rate = self.rate; u.pitch = 1;
      u.onboundary = (e) => { if (tok === self.tok) { self.pos = start + (e.charIndex || 0); self.paint(); } };
      u.onstart = () => { if (tok === self.tok) { self.pos = start; self.paint(); } };
      u.onend = () => { if (tok === self.tok) next(end); };
      u.onerror = (e) => { if (tok === self.tok && e.error !== 'canceled' && e.error !== 'interrupted') { self.playing = false; self.paint(); } };
      synth.speak(u);
    };
    this.paint(); next(pos);
  };

  Reader.prototype.toggle = function () {
    if (active && active !== this) active.stop(false);
    if (this.playing) { this.tok++; synth.cancel(); this.playing = false; this.paint(); }
    else this.speakFrom(this.pos);
  };
  Reader.prototype.stop = function (reset) {
    this.tok++; if (synth) synth.cancel(); this.playing = false; if (reset) this.pos = 0; if (this.el) this.paint();
    if (active === this) active = null;
  };
  Reader.prototype.seekBy = function (sec) {
    this.pos = Math.max(0, Math.min(this.total - 2, this.pos + sec * CPS * this.rate));
    if (this.playing) this.speakFrom(this.pos); else this.paint();
  };

  w.TTS = { Reader, stopAll: () => { if (active) active.stop(false); else if (synth) synth.cancel(); }, fmt };
})(window);
