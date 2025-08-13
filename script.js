(() => {
  // ---------- State ----------
  let p1 = { name: 'Player1', score: 0 };
  let p2 = { name: 'Player2', score: 0 };
  let raceTo = 8;              // default Race to
  let timeLeft = 30;           // countdown seconds
  let ticking = false;         // are we currently ticking?
  let tickInterval = null;     // setInterval handle
  let startDelayTimer = null;  // 1s delay before ticking
  let extensionUsed = { p1: false, p2: false }; // per-player extension usage (resets on +1)
  let gameOver = false;

  // ---------- DOM ----------
  const $ = sel => document.querySelector(sel);
  const els = {
    toast: $('#toast'),
    raceTo: $('#raceTo'),
    p1Name: $('#p1Name'), p2Name: $('#p2Name'),
    p1Score: $('#p1Score'), p2Score: $('#p2Score'),
    clock: $('#clock'),
    p1Playing: $('#p1Playing'), p2Playing: $('#p2Playing'),
    p1Plus: $('#p1Plus'), p2Plus: $('#p2Plus'),
    p1Ext: $('#p1Ext'), p2Ext: $('#p2Ext'),
    start: $('#startBtn'), resetClock: $('#resetClock'),
    pause: $('#pauseBtn'),
    editP1: $('#editP1'), editP2: $('#editP2'), editRace: $('#editRace'),
    resetScore: $('#resetScore'),
    confetti: $('#confetti')
  };

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg, ms = 1500) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
  }

  // ---------- Audio (generated) ----------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  function tone(freq = 880, dur = 0.11, type = 'sine', gain = 0.06) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  const softBeep = () => tone(880, 0.12, 'sine', 0.05);
  const buzzer   = () => { tone(220, 0.25, 'square', 0.07); setTimeout(() => tone(140, 0.25, 'square', 0.07), 110); };

  // ---------- Confetti ----------
  const cx = els.confetti.getContext('2d');
  let confettiPieces = [];
  function fitCanvas() {
    els.confetti.width = window.innerWidth;
    els.confetti.height = window.innerHeight;
  }
  window.addEventListener('resize', fitCanvas, { passive: true });
  fitCanvas();

  function fireConfetti() {
    confettiPieces = [];
    const colors = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#8338ec', '#ff9f1c', '#f7fff7'];
    for (let i = 0; i < 180; i++) {
      confettiPieces.push({
        x: Math.random() * els.confetti.width,
        y: -20 - Math.random() * 80,
        r: 2 + Math.random() * 5,
        c: colors[(Math.random() * colors.length) | 0],
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4 + (Math.random() * 2),
        life: 120 + Math.random() * 40,
        rot: Math.random() * Math.PI
      });
    }
    animateConfetti();
    setTimeout(() => { confettiPieces = []; cx.clearRect(0, 0, els.confetti.width, els.confetti.height); }, 3000);
  }
  function animateConfetti() {
    if (!confettiPieces.length) return;
    cx.clearRect(0, 0, els.confetti.width, els.confetti.height);
    for (const p of confettiPieces) {
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rot += 0.08);
      cx.fillStyle = p.c;
      cx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
      cx.restore();
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
    }
    confettiPieces = confettiPieces.filter(p => p.life > 0 && p.y < els.confetti.height + 40);
    requestAnimationFrame(animateConfetti);
  }

  // ---------- Helpers ----------
  function activeSide() {
    if (els.p1Playing.classList.contains('active')) return 'p1';
    if (els.p2Playing.classList.contains('active')) return 'p2';
    return null;
  }
  function resetColors() {
    els.p1Name.classList.remove('win', 'lose');
    els.p2Name.classList.remove('win', 'lose');
  }
  function declareWinner(winner) {
    gameOver = true;
    if (winner === 'p1') { els.p1Name.classList.add('win'); els.p2Name.classList.add('lose'); }
    else { els.p2Name.classList.add('win'); els.p1Name.classList.add('lose'); }
    fireConfetti();
    stopTick();
    updateUI();
  }
  function checkWinner() {
    if (p1.score >= raceTo) declareWinner('p1');
    else if (p2.score >= raceTo) declareWinner('p2');
  }
  function updateUI() {
    els.p1Name.textContent = p1.name;
    els.p2Name.textContent = p2.name;
    els.p1Score.textContent = p1.score;
    els.p2Score.textContent = p2.score;
    els.clock.textContent = timeLeft.toString();

    if (timeLeft <= 10) els.clock.classList.add('red');
    else els.clock.classList.remove('red');

    els.raceTo.textContent = raceTo;

    // Disable/enable by rules
    els.start.disabled = gameOver || ticking || timeLeft <= 0;

    const side = activeSide();
    els.p1Ext.disabled = gameOver || extensionUsed.p1 || timeLeft <= 0 || side !== 'p1';
    els.p2Ext.disabled = gameOver || extensionUsed.p2 || timeLeft <= 0 || side !== 'p2';
  }

  function stopTick() {
    ticking = false;
    clearInterval(tickInterval); tickInterval = null;
    clearTimeout(startDelayTimer); startDelayTimer = null;
    updateUI();
  }

  function startAfterDelay(delayMs = 1000) {
    ticking = true; updateUI();
    showToast('Starting clock', 1000);
    startDelayTimer = setTimeout(() => {
      if (gameOver) { stopTick(); return; }
      tickInterval = setInterval(() => {
        if (timeLeft > 0) {
          timeLeft--;
          if (timeLeft <= 10 && timeLeft > 0) softBeep();   // soft beep at 10..1
          if (timeLeft === 0) { buzzer(); stopTick(); }     // buzzer at 0
          updateUI();
        } else {
          stopTick();
        }
      }, 1000);
    }, delayMs);
  }

  function score(forWho) {
    if (gameOver) return;
    if (forWho === 'p1') p1.score++; else p2.score++;
    extensionUsed = { p1: false, p2: false }; // both get extension back after any point
    stopTick();                                // +1 pauses the clock
    updateUI(); checkWinner();
  }

  function setRace() {
    const v = prompt('Set "Race to" (number of frames to win):', raceTo);
    if (v === null) return;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1 || n > 999) { alert('Enter a whole number from 1 to 999.'); return; }
    raceTo = n; updateUI(); checkWinner();
  }

  function setName(which) {
    const current = which === 'p1' ? p1.name : p2.name;
    const v = prompt(`Enter ${which === 'p1' ? 'Player 1' : 'Player 2'} name:`, current ?? '');
    if (v === null) return;
    const s = v.trim().slice(0, 20); if (!s) return;
    if (which === 'p1') p1.name = s; else p2.name = s;
    updateUI();
  }

  // ---------- Wiring ----------
  // iOS: ensure audio can play after any gesture
  document.addEventListener('touchstart', ensureAudio, { once: true });
  document.addEventListener('mousedown', ensureAudio, { once: true });

  // PLAYING toggles (mutually exclusive) — also pause & reset to 30
  els.p1Playing.addEventListener('click', () => {
    els.p1Playing.classList.add('active');
    els.p2Playing.classList.remove('active');
    stopTick(); timeLeft = 30; updateUI();
  });
  els.p2Playing.addEventListener('click', () => {
    els.p2Playing.classList.add('active');
    els.p1Playing.classList.remove('active');
    stopTick(); timeLeft = 30; updateUI();
  });

  // START requires a playing side; 1s delay and toast
  els.start.addEventListener('click', () => {
    if (ticking || timeLeft <= 0 || gameOver) return;
    const side = activeSide();
    if (!side) { showToast('Choose who is playing first.', 3000); return; }
    startAfterDelay(1000);
  });

  // PAUSE
  els.pause.addEventListener('click', () => stopTick());

  // RESET CLOCK (doesn’t auto-start)
  els.resetClock.addEventListener('click', () => { stopTick(); timeLeft = 30; updateUI(); });

  // EXTENSION CALLED: only the active side; per-player once until a point
  function handleExtension(sideBtn) {
    if (timeLeft <= 0 || gameOver) return;
    const side = activeSide();
    if (!side || side !== sideBtn) return; // must be the active player
    if (extensionUsed[sideBtn]) {
      showToast('Extension already been used for this frame.', 3000);
      return;
    }
    extensionUsed[sideBtn] = true;
    stopTick(); timeLeft = 30; updateUI();
    startAfterDelay(1000); // 1s delay before countdown
  }
  els.p1Ext.addEventListener('click', () => handleExtension('p1'));
  els.p2Ext.addEventListener('click', () => handleExtension('p2'));

  // +1 POINT
  els.p1Plus.addEventListener('click', () => score('p1'));
  els.p2Plus.addEventListener('click', () => score('p2'));

  // Edit buttons
  els.editP1.addEventListener('click', () => setName('p1'));
  els.editP2.addEventListener('click', () => setName('p2'));
  els.editRace.addEventListener('click', setRace);

  // RESET SCORE also resets clock and colors; unlock extensions
  els.resetScore.addEventListener('click', () => {
    p1.score = 0; p2.score = 0;
    gameOver = false; extensionUsed = { p1: false, p2: false };
    resetColors();
    stopTick();
    timeLeft = 30;
    updateUI();
  });

  // Init
  updateUI();
})();
