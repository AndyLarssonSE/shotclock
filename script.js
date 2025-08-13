(() => {
  let p1 = { name: 'Player1', score: 0, extUsed: false };
  let p2 = { name: 'Player2', score: 0, extUsed: false };
  let raceTo = 8;
  let timeLeft = 30;
  let ticking = false;
  let tickInterval = null;
  let startDelayTimer = null;
  let gameOver = false;

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

  let toastTimer = null;
  function showToast(msg, ms = 1500) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
  }

  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  function tone(freq, dur, type, gain) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  const softBeep = () => tone(880, 0.12, 'sine', 0.05);
  const buzzer = () => { tone(220, 0.25, 'square', 0.07); setTimeout(() => tone(140, 0.25, 'square', 0.07), 110); };

  const cx = els.confetti.getContext('2d');
  let confettiPieces = [];
  function resizeCanvas() { els.confetti.width = window.innerWidth; els.confetti.height = window.innerHeight; }
  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();
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
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot += 0.08);
      cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); cx.restore();
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
    }
    confettiPieces = confettiPieces.filter(p => p.life > 0 && p.y < els.confetti.height + 40);
    requestAnimationFrame(animateConfetti);
  }

  function activeSide() {
    if (els.p1Playing.classList.contains('active')) return 'p1';
    if (els.p2Playing.classList.contains('active')) return 'p2';
    return null;
  }
  function updateUI() {
    els.p1Name.textContent = p1.name; els.p2Name.textContent = p2.name;
    els.p1Score.textContent = p1.score; els.p2Score.textContent = p2.score;
    els.clock.textContent = timeLeft.toString();
    if (timeLeft <= 10) els.clock.classList.add('red'); else els.clock.classList.remove('red');
    els.raceTo.textContent = raceTo;
    els.start.disabled = gameOver || ticking || timeLeft <= 0;
    const side = activeSide();
    els.p1Ext.disabled = gameOver || timeLeft <= 0 || side !== 'p1' || p1.extUsed;
    els.p2Ext.disabled = gameOver || timeLeft <= 0 || side !== 'p2' || p2.extUsed;
  }
  function stopTick() {
    ticking = false; clearInterval(tickInterval); tickInterval = null; clearTimeout(startDelayTimer); startDelayTimer = null; updateUI();
  }
  function startAfterDelay(delayMs = 1000) {
    ticking = true; updateUI();
    showToast('Starting clock', 1000);
    startDelayTimer = setTimeout(() => {
      if (gameOver) { stopTick(); return; }
      tickInterval = setInterval(() => {
        if (timeLeft > 0) {
          timeLeft--;
          if (timeLeft <= 10 && timeLeft > 0) softBeep();
          if (timeLeft === 0) { buzzer(); stopTick(); }
          updateUI();
        } else { stopTick(); }
      }, 1000);
    }, delayMs);
  }
  function resetColors() { els.p1Name.classList.remove('win', 'lose'); els.p2Name.classList.remove('win', 'lose'); }
  function declareWinner(w) {
    gameOver = true;
    if (w === 'p1') { els.p1Name.classList.add('win'); els.p2Name.classList.add('lose'); }
    else { els.p2Name.classList.add('win'); els.p1Name.classList.add('lose'); }
    fireConfetti();
    stopTick();
  }
  function checkWinner() {
    if (p1.score >= raceTo) declareWinner('p1');
    else if (p2.score >= raceTo) declareWinner('p2');
  }
  function score(forWho) {
    if (gameOver) return;
    if (forWho === 'p1') p1.score++; else p2.score++;
    p1.extUsed = false; p2.extUsed = false;
    stopTick();
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
    if (which === 'p1') p1.name = s; else p2.name = s; updateUI();
  }

  document.addEventListener('touchstart', ensureAudio, { once: true });
  document.addEventListener('mousedown', ensureAudio, { once: true });

  els.p1Playing.addEventListener('click', () => { els.p1Playing.classList.add('active'); els.p2Playing.classList.remove('active'); timeLeft = 30; stopTick(); updateUI(); });
  els.p2Playing.addEventListener('click', () => { els.p2Playing.classList.add('active'); els.p1Playing.classList.remove('active'); timeLeft = 30; stopTick(); updateUI(); });

  els.start.addEventListener('click', () => {
    if (ticking || timeLeft <= 0 || gameOver) return;
    const side = activeSide();
    if (!side) { showToast('Choose who is playing first.', 3000); return; }
    startAfterDelay(1000);
  });

  els.pause.addEventListener('click', () => stopTick());

  els.resetClock.addEventListener('click', () => { stopTick(); timeLeft = 30; updateUI(); });

  function handleExtension(sideBtn) {
    if (timeLeft <= 0 || gameOver) return;
    if (sideBtn === 'p1') {
      if (p1.extUsed) { showToast('Extension already been used for this frame.', 3000); return; }
      p1.extUsed = true;
    }
    if (sideBtn === 'p2') {
      if (p2.extUsed) { showToast('Extension already been used for this frame.', 3000); return; }
      p2.extUsed = true;
    }
    stopTick(); timeLeft = 30; updateUI(); startAfterDelay(1000);
  }
  els.p1Ext.addEventListener('click', () => handleExtension('p1'));
  els.p2Ext.addEventListener('click', () => handleExtension('p2'));

  els.p1Plus.addEventListener('click', () => score('p1'));
  els.p2Plus.addEventListener('click', () => score('p2'));

  els.editP1.addEventListener('click', () => setName('p1'));
  els.editP2.addEventListener('click', () => setName('p2'));
  els.editRace.addEventListener('click', setRace);

  els.resetScore.addEventListener('click', () => {
    p1.score = 0; p2.score = 0; gameOver = false; p1.extUsed = false; p2.extUsed = false; resetColors(); timeLeft = 30; updateUI();
  });

  updateUI();
})();
