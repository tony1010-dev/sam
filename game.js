const gameArea = document.querySelector("#gameArea");
const player = document.querySelector("#player");
const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#bestScore");
const finalScoreEl = document.querySelector("#finalScore");
const resultMessage = document.querySelector("#resultMessage");
const startPanel = document.querySelector("#startPanel");
const gameOverPanel = document.querySelector("#gameOverPanel");
const countdownEl = document.querySelector("#countdown");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const leftButton = document.querySelector("#leftButton");
const rightButton = document.querySelector("#rightButton");
const soundButton = document.querySelector("#soundButton");

let running = false;
let playerX = 0;
let score = 0;
let bestScore = Number(localStorage.getItem("isaem-best") || 0);
let obstacles = [];
let lastTime = 0;
let lastSpawn = 0;
let animationId = 0;
let soundOn = true;
let audioContext = null;
let dragging = false;
const keys = { left: false, right: false };

bestScoreEl.textContent = String(bestScore).padStart(4, "0");

function getBounds() {
  return {
    width: gameArea.clientWidth,
    height: gameArea.clientHeight,
    playerWidth: player.offsetWidth,
  };
}

function setPlayerX(nextX) {
  const { width, playerWidth } = getBounds();
  const half = playerWidth / 2;
  playerX = Math.max(half + 6, Math.min(width - half - 6, nextX));
  player.style.left = `${playerX}px`;
}

function tone(frequency, duration = 0.08, type = "square", volume = 0.04) {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function clearObstacles() {
  obstacles.forEach(({ element }) => element.remove());
  obstacles = [];
  document.querySelectorAll(".speed-line").forEach((line) => line.remove());
}

function spawnSpeedLine() {
  const line = document.createElement("i");
  line.className = "speed-line";
  line.style.left = `${Math.random() * 96}%`;
  line.style.top = `${Math.random() * 35}%`;
  gameArea.appendChild(line);
  line.addEventListener("animationend", () => line.remove());
}

function spawnTeacher() {
  const { width } = getBounds();
  const size = Math.max(66, Math.min(92, 76 + score / 130));
  const element = document.createElement("img");
  element.className = "teacher";
  element.src = "./assets/isaem.jpg";
  element.alt = "";
  element.draggable = false;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;

  const x = 8 + Math.random() * Math.max(1, width - size - 16);
  const y = -size - 12;
  element.style.left = `${x}px`;
  element.style.transform = `translateY(${y}px) rotate(0deg)`;
  gameArea.appendChild(element);

  obstacles.push({
    element,
    x,
    y,
    size,
    rotation: Math.random() * 20 - 10,
    rotationSpeed: (Math.random() - 0.5) * 25,
    speedBoost: Math.random() * 45,
  });

  if (score > 250 && Math.random() < 0.32) {
    setTimeout(() => running && spawnTeacher(), 170);
  }
}

function rectanglesOverlap(a, b, padding = 8) {
  return (
    a.left + padding < b.right - padding &&
    a.right - padding > b.left + padding &&
    a.top + padding < b.bottom - padding &&
    a.bottom - padding > b.top + padding
  );
}

function endGame() {
  running = false;
  cancelAnimationFrame(animationId);
  player.classList.add("caught");
  tone(145, 0.38, "sawtooth", 0.08);
  setTimeout(() => tone(95, 0.45, "square", 0.06), 160);

  const roundedScore = Math.floor(score);
  if (roundedScore > bestScore) {
    bestScore = roundedScore;
    localStorage.setItem("isaem-best", String(bestScore));
    bestScoreEl.textContent = String(bestScore).padStart(4, "0");
  }

  finalScoreEl.textContent = `${roundedScore}점`;
  if (roundedScore < 100) resultMessage.textContent = "발소리가 너무 컸나 봐… 다시 살금살금!";
  else if (roundedScore < 300) resultMessage.textContent = "오, 제법인데? 다음엔 더 멀리!";
  else if (roundedScore < 600) resultMessage.textContent = "복도 은신술이 상당한 수준이야!";
  else resultMessage.textContent = "전설의 복도 닌자 탄생!";

  setTimeout(() => gameOverPanel.classList.add("panel--visible"), 520);
}

function update(time) {
  if (!running) return;
  const delta = Math.min((time - lastTime) / 1000, 0.035);
  lastTime = time;
  score += delta * 18;

  const horizontalSpeed = 285 + Math.min(score, 600) * 0.12;
  if (keys.left) setPlayerX(playerX - horizontalSpeed * delta);
  if (keys.right) setPlayerX(playerX + horizontalSpeed * delta);

  const spawnInterval = Math.max(310, 920 - score * 0.82);
  if (time - lastSpawn > spawnInterval) {
    spawnTeacher();
    lastSpawn = time;
    if (Math.random() < 0.55) spawnSpeedLine();
  }

  const baseSpeed = 180 + Math.min(score * 0.55, 290);
  const playerRect = player.getBoundingClientRect();

  obstacles.forEach((obstacle) => {
    obstacle.y += (baseSpeed + obstacle.speedBoost) * delta;
    obstacle.rotation += obstacle.rotationSpeed * delta;
    obstacle.element.style.transform =
      `translateY(${obstacle.y}px) rotate(${obstacle.rotation}deg)`;

    const obstacleRect = obstacle.element.getBoundingClientRect();
    if (rectanglesOverlap(playerRect, obstacleRect, 10)) endGame();
  });

  obstacles = obstacles.filter((obstacle) => {
    if (obstacle.y > gameArea.clientHeight + obstacle.size) {
      obstacle.element.remove();
      tone(520, 0.035, "sine", 0.018);
      return false;
    }
    return true;
  });

  scoreEl.textContent = String(Math.floor(score)).padStart(4, "0");
  animationId = requestAnimationFrame(update);
}

async function countdown() {
  countdownEl.classList.add("countdown--show");
  for (const value of ["3", "2", "1", "GO!"]) {
    countdownEl.textContent = value;
    countdownEl.classList.remove("countdown--show");
    void countdownEl.offsetWidth;
    countdownEl.classList.add("countdown--show");
    tone(value === "GO!" ? 720 : 420, 0.09);
    await new Promise((resolve) => setTimeout(resolve, value === "GO!" ? 520 : 620));
  }
  countdownEl.classList.remove("countdown--show");
}

async function startGame() {
  startPanel.classList.remove("panel--visible");
  gameOverPanel.classList.remove("panel--visible");
  player.classList.remove("caught");
  clearObstacles();
  score = 0;
  scoreEl.textContent = "0000";
  setPlayerX(gameArea.clientWidth / 2);
  await countdown();
  running = true;
  lastTime = performance.now();
  lastSpawn = lastTime - 500;
  animationId = requestAnimationFrame(update);
}

function setKey(direction, pressed) {
  keys[direction] = pressed;
  if (pressed && !running && gameOverPanel.classList.contains("panel--visible")) {
    startGame();
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "a", "A"].includes(event.key)) setKey("left", true);
  if (["ArrowRight", "d", "D"].includes(event.key)) setKey("right", true);
  if (event.key === " " || event.key === "Enter") {
    if (!running) startGame();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (["ArrowLeft", "a", "A"].includes(event.key)) setKey("left", false);
  if (["ArrowRight", "d", "D"].includes(event.key)) setKey("right", false);
});

function moveToPointer(event) {
  if (!dragging || !running) return;
  const rect = gameArea.getBoundingClientRect();
  setPlayerX(event.clientX - rect.left);
}

gameArea.addEventListener("pointerdown", (event) => {
  dragging = true;
  gameArea.setPointerCapture(event.pointerId);
  moveToPointer(event);
});
gameArea.addEventListener("pointermove", moveToPointer);
gameArea.addEventListener("pointerup", () => (dragging = false));
gameArea.addEventListener("pointercancel", () => (dragging = false));

function bindHold(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    setKey(direction, true);
  });
  button.addEventListener("pointerup", () => setKey(direction, false));
  button.addEventListener("pointerleave", () => setKey(direction, false));
  button.addEventListener("pointercancel", () => setKey(direction, false));
}

bindHold(leftButton, "left");
bindHold(rightButton, "right");
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
  if (soundOn) tone(620, 0.08);
});

window.addEventListener("resize", () => {
  if (!playerX) setPlayerX(gameArea.clientWidth / 2);
  else setPlayerX(playerX);
});

setPlayerX(gameArea.clientWidth / 2);
