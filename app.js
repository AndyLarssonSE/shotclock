// === Element refs ===
const UI = {
  clock: document.getElementById('clock'),
  toast: document.getElementById('toast'),

  race: document.getElementById('raceTo'),
  p1Score: document.getElementById('p1Score'),
  p2Score: document.getElementById('p2Score'),

  p1Name: document.getElementById('p1Name'),
  p2Name: document.getElementById('p2Name'),

  p1StateBtn: document.getElementById('p1StateBtn'),
  p2StateBtn: document.getElementById('p2StateBtn'),
  p1StateImg: document.getElementById('p1StateImg'),
  p2StateImg: document.getElementById('p2StateImg'),

  p1PointBtn: document.getElementById('p1PointBtn'),
  p2PointBtn: document.getElementById('p2PointBtn'),
  p1PointImg: document.getElementById('p1PointImg'),
  p2PointImg: document.getElementById('p2PointImg'),

  p1ExtBtn: document.getElementById('p1ExtBtn'),
  p2ExtBtn: document.getElementById('p2ExtBtn'),
  p1ExtImg: document.getElementById('p1ExtImg'),
  p2ExtImg: document.getElementById('p2ExtImg'),

  p1EditNameBtn: document.getElementById('p1EditNameBtn'),
  p2EditNameBtn: document.getElementById('p2EditNameBtn'),
  editRaceBtn: document.getElementById('editRaceBtn'),

  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  resetClockBtn: document.getElementById('resetClockBtn'),

  resetScoreBtn: document.getElementById('resetScoreBtn'),
};

// === Asset paths (absolute to site root) ===
const ASSETS = {
  waiting: '/assets/waiting-button.png',
  playing: '/assets/playing-button.png',
  start:   '/assets/start-clock-button.png',
  pause:   '/assets/pause-clock-button.png',
  running: '/assets/clock-running-button.png',
  paused:  '/assets/clock-paused-button.png',
  pointStd:'/assets/point-standard-button.png',
  pointHit:'/assets/point-pushed-button.png',
  ext:     '/assets/extension-button.png',
  extCalled:'/assets/extension-called-button.png',
  reset:   '/assets/reset-clock-button.png',
  divider: '/assets/divider.png'
};

// === State ===
const S = {
  raceTo: 8,
  p1: { name: 'PLAYER1', score:0, playing:false, extUsed:false },
  p2: { name: 'PLAYER2', score:0, playing:false, extUsed:false },
  time: 30,
  interval: null,
  running: false,
};

// === Audio ===
let audioCtx;
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
function beep(freq=880, dur=100, type='sine', gain=0.05){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = gain;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); setTimeout(()=>o.stop(), dur);
}
function buzzer(){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type='square'; o.frequency.value=120; g.gain.value=0.08;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); setTimeout(()=>o.stop(), 650);
}

// === Helpers ===
function showToast(txt, ms=1000){
  UI.toast.textContent = txt;
  UI.toast.classList.add('show');
  setTimeout(()=>UI.toast.classList.remove('show'), ms);
}
function updateHeader(){
  UI.race.textContent = S.raceTo;
  UI.p1Score.textContent = S.p1.score;
  UI.p2Score.textContent = S.p2.score;
  UI.p1Name.textContent = S.p1.name.toUpperCase();
  UI.p2Name.textContent = S.p2.name.toUpperCase();
}
function setClockDisplay(sec){
  function setClockDisplay(sec){
  const v = Math.max(0, Math.ceil(sec));
  UI.clock.textContent = v;
  UI.clock.classList.toggle('red', v > 0 && v <= 20); // red from 9 → 1
}
function resetClock(to=30){ S.time = to; setClockDisplay(S.time); }
function stopTimer(){
  if(S.interval){ clearInterval(S.interval); S.interval = null; }
  S.running = false;
}
function startTimer(delay=1000){
  if(S.running) return;
  const active = S.p1.playing ? 'p1' : (S.p2.playing ? 'p2' : null);
  if(!active){ showToast('Choose who is playing first.', 3000); return; }
  showToast('Starting clock', 1000);

  setTimeout(()=>{
    if(S.running) return;
    S.running = true;
    S.interval = setInterval(()=>{
      S.time -= 1;
      setClockDisplay(S.time);

      if(S.time === 5) beep(880,110);
      if(S.time > 0 && S.time <= 5) beep(880,90);

      if(S.time <= 0){
        setClockDisplay(0);
        buzzer();
        stopTimer();
      }
    }, 1000);
  }, delay);
}

function renderStates(){
  UI.p1StateImg.src = S.p1.playing ? ASSETS.playing : ASSETS.waiting;
  UI.p2StateImg.src = S.p2.playing ? ASSETS.playing : ASSETS.waiting;
}
function renderExtButtons(){
  UI.p1ExtImg.src = S.p1.extUsed ? ASSETS.extCalled : ASSETS.ext;
  UI.p2ExtImg.src = S.p2.extUsed ? ASSETS.extCalled : ASSETS.ext;
}

// === Core actions ===
function choosePlayer(side){
  if(!S[side].playing){
    S.p1.playing = (side === 'p1');
    S.p2.playing = (side === 'p2');
    stopTimer(); resetClock(30);
    renderStates();
  }
}

function addPoint(side){
  // press effect
  const img = side==='p1' ? UI.p1PointImg : UI.p2PointImg;
  img.src = ASSETS.pointHit; setTimeout(()=>img.src = ASSETS.pointStd, 250);

  stopTimer();
  S[side].score += 1;
  // re-enable both extensions after any point
  S.p1.extUsed = false; S.p2.extUsed = false;
  renderExtButtons();
  updateHeader();

  if(S[side].score >= S.raceTo){
    showToast(`${S[side].name} - Winner`, 5000);
    stopTimer(); resetClock(30);
  }
}

function callExtension(side){
  if(S.time <= 0) return;        // must be before 0
  if(!S[side].playing) return;   // only active player
  if(S[side].extUsed) return;    // once per frame until a point

  S[side].extUsed = true;
  renderExtButtons();

  stopTimer();
  resetClock(30);
  startTimer(1000);              // auto-restart with 1s delay
}

function start(){ startTimer(1000); }
function pause(){ stopTimer(); }
function resetClockOnly(){ stopTimer(); resetClock(30); }
function editName(side){
  const val = prompt('Enter name:', S[side].name);
  if(typeof val === 'string' && val.trim()) { S[side].name = val.trim(); updateHeader(); }
}
function editRace(){
  const v = prompt('Race to (number):', S.raceTo);
  if(v===null) return;
  const n = parseInt(v,10);
  if(Number.isFinite(n) && n>0){ S.raceTo = n; updateHeader(); }
}
function resetScores(){
  S.p1.score = 0; S.p2.score = 0;
  stopTimer(); resetClock(30); updateHeader();
}

// === Events ===
UI.p1StateBtn.addEventListener('click', ()=>choosePlayer('p1'));
UI.p2StateBtn.addEventListener('click', ()=>choosePlayer('p2'));
UI.p1PointBtn.addEventListener('click', ()=>addPoint('p1'));
UI.p2PointBtn.addEventListener('click', ()=>addPoint('p2'));
UI.p1ExtBtn.addEventListener('click', ()=>callExtension('p1'));
UI.p2ExtBtn.addEventListener('click', ()=>callExtension('p2'));
UI.p1EditNameBtn.addEventListener('click', ()=>editName('p1'));
UI.p2EditNameBtn.addEventListener('click', ()=>editName('p2'));
UI.editRaceBtn.addEventListener('click', editRace);
UI.startBtn.addEventListener('click', start);
UI.pauseBtn.addEventListener('click', pause);
UI.resetClockBtn.addEventListener('click', resetClockOnly);
UI.resetScoreBtn.addEventListener('click', resetScores);

// === Init ===
(function init(){
  updateHeader();
  renderStates();
  renderExtButtons();
  resetClock(30);
})();
