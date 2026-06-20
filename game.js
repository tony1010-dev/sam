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
const menuButtons = document.querySelectorAll(".game-menu__button");
const isaemGameScreen = document.querySelector("#isaemGame");
const breakoutGameScreen = document.querySelector("#breakoutGame");
const gameDescription = document.querySelector("#gameDescription");
const footerHint = document.querySelector("#footerHint");

let activeGame = "isaem";
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
let isaemSession = 0;
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
  if (!running) return;
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
  if (!running || activeGame !== "isaem") return;
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
  const session = ++isaemSession;
  startPanel.classList.remove("panel--visible");
  gameOverPanel.classList.remove("panel--visible");
  player.classList.remove("caught");
  clearObstacles();
  score = 0;
  scoreEl.textContent = "0000";
  setPlayerX(gameArea.clientWidth / 2);
  await countdown();
  if (session !== isaemSession || activeGame !== "isaem") {
    countdownEl.classList.remove("countdown--show");
    return;
  }
  running = true;
  lastTime = performance.now();
  lastSpawn = lastTime - 500;
  animationId = requestAnimationFrame(update);
}

function setKey(direction, pressed) {
  keys[direction] = pressed;
  if (activeGame === "isaem" && pressed && !running && gameOverPanel.classList.contains("panel--visible")) {
    startGame();
  }
}

window.addEventListener("keydown", (event) => {
  if (activeGame !== "isaem") return;
  if (["ArrowLeft", "a", "A"].includes(event.key)) {
    setKey("left", true);
    event.preventDefault();
  }
  if (["ArrowRight", "d", "D"].includes(event.key)) {
    setKey("right", true);
    event.preventDefault();
  }
  if (event.key === " " || event.key === "Enter") {
    if (!running) startGame();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (activeGame !== "isaem") return;
  if (["ArrowLeft", "a", "A"].includes(event.key)) setKey("left", false);
  if (["ArrowRight", "d", "D"].includes(event.key)) setKey("right", false);
});

function moveToPointer(event) {
  if (activeGame !== "isaem" || !dragging || !running) return;
  const rect = gameArea.getBoundingClientRect();
  setPlayerX(event.clientX - rect.left);
}

gameArea.addEventListener("pointerdown", (event) => {
  if (activeGame !== "isaem") return;
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

// 벽돌깨기
const breakoutCanvas = document.querySelector("#breakoutCanvas");
const breakoutContext = breakoutCanvas.getContext("2d");
const breakoutScoreEl = document.querySelector("#breakoutScore");
const breakoutBestEl = document.querySelector("#breakoutBest");
const breakoutStartPanel = document.querySelector("#breakoutStartPanel");
const breakoutOverPanel = document.querySelector("#breakoutOverPanel");
const breakoutStartButton = document.querySelector("#breakoutStartButton");
const breakoutRestartButton = document.querySelector("#breakoutRestartButton");
const breakoutFinalScore = document.querySelector("#breakoutFinalScore");
const breakoutMessage = document.querySelector("#breakoutMessage");
const breakoutResultSticker = document.querySelector("#breakoutResultSticker");
const breakoutResultTitle = document.querySelector("#breakoutResultTitle");
const breakoutLeftButton = document.querySelector("#breakoutLeftButton");
const breakoutRightButton = document.querySelector("#breakoutRightButton");
const lifeEls = [document.querySelector("#life1"), document.querySelector("#life2"), document.querySelector("#life3")];
const breakoutBallImage = new Image();
breakoutBallImage.src = "./assets/isaem.jpg";
breakoutBallImage.addEventListener("load", () => drawBreakout());

const breakout = {
  width: breakoutCanvas.width,
  height: breakoutCanvas.height,
  running: false,
  animationId: 0,
  lastTime: 0,
  score: 0,
  best: Number(localStorage.getItem("breakout-best") || 0),
  lives: 3,
  level: 1,
  keys: { left: false, right: false },
  paddle: { x: 216, y: 523, width: 120, height: 14, speed: 420 },
  ball: { x: 276, y: 500, radius: 23, vx: 225, vy: -250, stuck: true, angle: 0 },
  bricks: [],
};

breakoutBestEl.textContent = String(breakout.best).padStart(4, "0");

function createBricks() {
  const rows = Math.min(7, 5 + breakout.level - 1);
  const columns = 8;
  const gap = 7;
  const side = 22;
  const top = 55;
  const brickWidth = (breakout.width - side * 2 - gap * (columns - 1)) / columns;
  const colors = ["#ff5c35", "#ff9f43", "#ffd84d", "#54d5d0", "#62a8ff", "#9b6cff", "#f06bd8"];
  breakout.bricks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      breakout.bricks.push({
        x: side + column * (brickWidth + gap),
        y: top + row * 29,
        width: brickWidth,
        height: 20,
        color: colors[row % colors.length],
        alive: true,
      });
    }
  }
}

function updateLives() {
  lifeEls.forEach((element, index) => {
    element.classList.toggle("life--lost", index >= breakout.lives);
  });
}

function resetBall(stuck = true) {
  breakout.paddle.x = (breakout.width - breakout.paddle.width) / 2;
  breakout.ball.x = breakout.width / 2;
  breakout.ball.y = breakout.paddle.y - breakout.ball.radius - 3;
  const direction = Math.random() > 0.5 ? 1 : -1;
  const speedBoost = (breakout.level - 1) * 22;
  breakout.ball.vx = direction * (210 + speedBoost);
  breakout.ball.vy = -(245 + speedBoost);
  breakout.ball.stuck = stuck;
  breakout.ball.angle = 0;
}

function drawRoundedRect(x, y, width, height, radius, fill, shadow = null) {
  breakoutContext.save();
  if (shadow) {
    breakoutContext.shadowColor = shadow;
    breakoutContext.shadowBlur = 12;
  }
  breakoutContext.fillStyle = fill;
  breakoutContext.beginPath();
  breakoutContext.roundRect(x, y, width, height, radius);
  breakoutContext.fill();
  breakoutContext.restore();
}

function drawBreakout() {
  breakoutContext.clearRect(0, 0, breakout.width, breakout.height);

  breakoutContext.strokeStyle = "rgba(98, 215, 255, 0.09)";
  breakoutContext.lineWidth = 1;
  for (let x = 0; x < breakout.width; x += 28) {
    breakoutContext.beginPath();
    breakoutContext.moveTo(x, 0);
    breakoutContext.lineTo(x, breakout.height);
    breakoutContext.stroke();
  }
  for (let y = 0; y < breakout.height; y += 28) {
    breakoutContext.beginPath();
    breakoutContext.moveTo(0, y);
    breakoutContext.lineTo(breakout.width, y);
    breakoutContext.stroke();
  }

  breakout.bricks.forEach((brick) => {
    if (!brick.alive) return;
    drawRoundedRect(brick.x, brick.y, brick.width, brick.height, 4, brick.color, brick.color);
    breakoutContext.fillStyle = "rgba(255,255,255,.38)";
    breakoutContext.fillRect(brick.x + 5, brick.y + 4, brick.width - 10, 3);
  });

  drawRoundedRect(
    breakout.paddle.x,
    breakout.paddle.y,
    breakout.paddle.width,
    breakout.paddle.height,
    8,
    "#f5f7ff",
    "#62d7ff",
  );
  breakoutContext.fillStyle = "#62d7ff";
  breakoutContext.fillRect(breakout.paddle.x + 20, breakout.paddle.y + 4, breakout.paddle.width - 40, 3);

  const ball = breakout.ball;
  breakoutContext.save();
  breakoutContext.shadowColor = "#ffd84d";
  breakoutContext.shadowBlur = 14;
  breakoutContext.fillStyle = "#fff6b0";
  breakoutContext.beginPath();
  breakoutContext.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  breakoutContext.fill();
  breakoutContext.restore();

  if (breakoutBallImage.complete && breakoutBallImage.naturalWidth) {
    breakoutContext.save();
    breakoutContext.translate(ball.x, ball.y);
    breakoutContext.rotate(ball.angle);
    breakoutContext.beginPath();
    breakoutContext.arc(0, 0, ball.radius - 2, 0, Math.PI * 2);
    breakoutContext.clip();

    const sourceSize = Math.min(breakoutBallImage.naturalWidth, breakoutBallImage.naturalHeight);
    const sourceX = (breakoutBallImage.naturalWidth - sourceSize) / 2;
    const sourceY = Math.max(0, (breakoutBallImage.naturalHeight - sourceSize) * 0.28);
    breakoutContext.drawImage(
      breakoutBallImage,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      -ball.radius + 2,
      -ball.radius + 2,
      ball.radius * 2 - 4,
      ball.radius * 2 - 4,
    );
    breakoutContext.restore();

    breakoutContext.save();
    breakoutContext.strokeStyle = "#fff";
    breakoutContext.lineWidth = 3;
    breakoutContext.beginPath();
    breakoutContext.arc(ball.x, ball.y, ball.radius - 1.5, 0, Math.PI * 2);
    breakoutContext.stroke();
    breakoutContext.restore();
  }

  if (ball.stuck && breakout.running) {
    breakoutContext.fillStyle = "rgba(255,255,255,.76)";
    breakoutContext.textAlign = "center";
    breakoutContext.font = "18px Jua";
    breakoutContext.fillText("스페이스 또는 화면을 눌러 발사!", breakout.width / 2, 345);
  }

  breakoutContext.fillStyle = "rgba(255,255,255,.45)";
  breakoutContext.textAlign = "center";
  breakoutContext.font = "12px Jua";
  breakoutContext.fillText(`LEVEL ${breakout.level}`, breakout.width / 2, 28);
}

function hitBrick(brick) {
  const ball = breakout.ball;
  return (
    ball.x + ball.radius > brick.x &&
    ball.x - ball.radius < brick.x + brick.width &&
    ball.y + ball.radius > brick.y &&
    ball.y - ball.radius < brick.y + brick.height
  );
}

function finishBreakout(won) {
  breakout.running = false;
  cancelAnimationFrame(breakout.animationId);
  breakoutFinalScore.textContent = `${breakout.score}점`;

  if (breakout.score > breakout.best) {
    breakout.best = breakout.score;
    localStorage.setItem("breakout-best", String(breakout.best));
    breakoutBestEl.textContent = String(breakout.best).padStart(4, "0");
  }

  breakoutResultSticker.textContent = won ? "ALL CLEAR!" : "GAME OVER";
  breakoutResultTitle.innerHTML = won ? "모든 벽돌을<br /><span>깨버렸다!</span>" : "공을 전부<br /><span>놓쳤다!</span>";
  breakoutMessage.textContent = won ? "완벽해! 벽돌깨기 챔피언!" : "공의 방향을 보고 미리 움직여 보자!";
  breakoutOverPanel.classList.add("panel--visible");
  tone(won ? 880 : 120, won ? 0.35 : 0.45, won ? "sine" : "sawtooth", 0.07);
}

function nextBreakoutLevel() {
  breakout.level += 1;
  if (breakout.level > 3) {
    finishBreakout(true);
    return;
  }
  createBricks();
  resetBall(true);
  tone(840, 0.18, "sine", 0.06);
}

function updateBreakout(time) {
  if (!breakout.running || activeGame !== "breakout") return;
  const delta = Math.min((time - breakout.lastTime) / 1000, 0.025);
  breakout.lastTime = time;

  if (breakout.keys.left) breakout.paddle.x -= breakout.paddle.speed * delta;
  if (breakout.keys.right) breakout.paddle.x += breakout.paddle.speed * delta;
  breakout.paddle.x = Math.max(0, Math.min(breakout.width - breakout.paddle.width, breakout.paddle.x));

  if (breakout.ball.stuck) {
    breakout.ball.x = breakout.paddle.x + breakout.paddle.width / 2;
    breakout.ball.y = breakout.paddle.y - breakout.ball.radius - 3;
  } else {
    const ball = breakout.ball;
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    ball.angle += delta * 5.5 * (ball.vx >= 0 ? 1 : -1);

    if (ball.x - ball.radius <= 0 && ball.vx < 0) {
      ball.x = ball.radius;
      ball.vx *= -1;
      tone(310, 0.025, "square", 0.018);
    }
    if (ball.x + ball.radius >= breakout.width && ball.vx > 0) {
      ball.x = breakout.width - ball.radius;
      ball.vx *= -1;
      tone(310, 0.025, "square", 0.018);
    }
    if (ball.y - ball.radius <= 0 && ball.vy < 0) {
      ball.y = ball.radius;
      ball.vy *= -1;
      tone(360, 0.025, "square", 0.018);
    }

    const paddle = breakout.paddle;
    if (
      ball.vy > 0 &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.width
    ) {
      ball.y = paddle.y - ball.radius;
      const hitPosition = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      const speed = Math.min(470, Math.hypot(ball.vx, ball.vy) * 1.025);
      ball.vx = speed * hitPosition * 0.92;
      ball.vy = -Math.sqrt(Math.max(10000, speed * speed - ball.vx * ball.vx));
      tone(520, 0.035, "square", 0.035);
    }

    for (const brick of breakout.bricks) {
      if (!brick.alive || !hitBrick(brick)) continue;
      brick.alive = false;
      breakout.score += 10 * breakout.level;
      breakoutScoreEl.textContent = String(breakout.score).padStart(4, "0");
      ball.vy *= -1;
      tone(620 + breakout.score, 0.04, "square", 0.03);
      break;
    }

    if (breakout.bricks.every((brick) => !brick.alive)) nextBreakoutLevel();

    if (ball.y - ball.radius > breakout.height) {
      breakout.lives -= 1;
      updateLives();
      tone(110, 0.28, "sawtooth", 0.06);
      if (breakout.lives <= 0) finishBreakout(false);
      else resetBall(true);
    }
  }

  drawBreakout();
  breakout.animationId = requestAnimationFrame(updateBreakout);
}

function launchBreakoutBall() {
  if (activeGame === "breakout" && breakout.running && breakout.ball.stuck) {
    breakout.ball.stuck = false;
    tone(440, 0.06, "square", 0.035);
  }
}

function startBreakout() {
  breakoutStartPanel.classList.remove("panel--visible");
  breakoutOverPanel.classList.remove("panel--visible");
  breakout.score = 0;
  breakout.lives = 3;
  breakout.level = 1;
  breakoutScoreEl.textContent = "0000";
  updateLives();
  createBricks();
  resetBall(true);
  breakout.running = true;
  breakout.lastTime = performance.now();
  drawBreakout();
  breakout.animationId = requestAnimationFrame(updateBreakout);
}

function moveBreakoutPaddle(clientX) {
  const rect = breakoutCanvas.getBoundingClientRect();
  const logicalX = ((clientX - rect.left) / rect.width) * breakout.width;
  breakout.paddle.x = Math.max(0, Math.min(breakout.width - breakout.paddle.width, logicalX - breakout.paddle.width / 2));
}

breakoutCanvas.addEventListener("pointerdown", (event) => {
  if (activeGame !== "breakout") return;
  event.preventDefault();
  moveBreakoutPaddle(event.clientX);
  launchBreakoutBall();
});
breakoutCanvas.addEventListener("pointermove", (event) => {
  if (activeGame === "breakout" && (event.pointerType === "mouse" || event.buttons > 0)) {
    moveBreakoutPaddle(event.clientX);
  }
});

window.addEventListener("keydown", (event) => {
  if (activeGame !== "breakout") return;
  if (["ArrowLeft", "a", "A"].includes(event.key)) breakout.keys.left = true;
  if (["ArrowRight", "d", "D"].includes(event.key)) breakout.keys.right = true;
  if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D", " ", "Enter"].includes(event.key)) event.preventDefault();
  if (event.key === " " || event.key === "Enter") {
    if (!breakout.running) startBreakout();
    else launchBreakoutBall();
  }
});
window.addEventListener("keyup", (event) => {
  if (["ArrowLeft", "a", "A"].includes(event.key)) breakout.keys.left = false;
  if (["ArrowRight", "d", "D"].includes(event.key)) breakout.keys.right = false;
});

function bindBreakoutHold(button, direction) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    breakout.keys[direction] = true;
    launchBreakoutBall();
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
    button.addEventListener(eventName, () => (breakout.keys[direction] = false));
  });
}

bindBreakoutHold(breakoutLeftButton, "left");
bindBreakoutHold(breakoutRightButton, "right");
breakoutStartButton.addEventListener("click", startBreakout);
breakoutRestartButton.addEventListener("click", startBreakout);
createBricks();
resetBall(true);
drawBreakout();

function switchGame(gameName) {
  if (gameName === activeGame) return;

  running = false;
  isaemSession += 1;
  cancelAnimationFrame(animationId);
  countdownEl.classList.remove("countdown--show");
  keys.left = false;
  keys.right = false;

  breakout.running = false;
  cancelAnimationFrame(breakout.animationId);
  breakout.keys.left = false;
  breakout.keys.right = false;

  activeGame = gameName;
  isaemGameScreen.classList.toggle("game-screen--active", gameName === "isaem");
  breakoutGameScreen.classList.toggle("game-screen--active", gameName === "breakout");
  menuButtons.forEach((button) => {
    button.classList.toggle("game-menu__button--active", button.dataset.game === gameName);
  });

  if (gameName === "isaem") {
    gameDescription.textContent = "수업 종이 울렸다. 복도에서 이샘을 마주치지 마!";
    footerHint.textContent = "오래 버틸수록 점수가 올라가요";
    startPanel.classList.add("panel--visible");
    clearObstacles();
    setPlayerX(gameArea.clientWidth / 2);
  } else {
    gameDescription.textContent = "공을 놓치지 말고 알록달록한 벽돌을 전부 깨자!";
    footerHint.textContent = "바의 옆부분으로 받을수록 공의 각도가 크게 바뀌어요";
    breakoutStartPanel.classList.add("panel--visible");
    breakoutOverPanel.classList.remove("panel--visible");
    drawBreakout();
  }
}

menuButtons.forEach((button) => {
  button.addEventListener("click", () => switchGame(button.dataset.game));
});

document.querySelectorAll(".game-menu, .game-card").forEach((element) => {
  element.addEventListener("contextmenu", (event) => event.preventDefault());
  element.addEventListener("selectstart", (event) => event.preventDefault());
  element.addEventListener("dragstart", (event) => event.preventDefault());
});
