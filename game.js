
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");
let menu = document.getElementById("menu");
let bgMusic = document.getElementById("bgMusic");

function startGame() {
  menu.style.display = "none";
  canvas.style.display = "block";
  gameLoop();
}

class Stickman {
  constructor(x, color, controls) {
    this.x = x;
    this.y = 300;
    this.width = 50;
    this.height = 100;
    this.color = color;
    this.health = 100;
    this.controls = controls;
    this.velocity = 0;
    this.isAttacking = false;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
    if (this.isAttacking) {
      ctx.fillStyle = "red";
      ctx.fillRect(this.x + (this.width * (this.velocity >= 0 ? 1 : -0.5)), this.y - 50, 10, 10);
    }
  }

  update(keys) {
    if (keys[this.controls.left]) this.x -= 3;
    if (keys[this.controls.right]) this.x += 3;
    this.isAttacking = keys[this.controls.attack];
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health < 0) this.health = 0;
  }
}

const keys = {};
document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

const player1 = new Stickman(100, "cyan", { left: "a", right: "d", attack: "w" });
const player2 = new Stickman(600, "magenta", { left: "ArrowLeft", right: "ArrowRight", attack: "ArrowUp" });

function drawHealthBars() {
  ctx.fillStyle = "cyan";
  ctx.fillRect(20, 20, player1.health * 2, 20);
  ctx.fillStyle = "magenta";
  ctx.fillRect(560, 20, player2.health * 2, 20);
}

function detectHit(p1, p2) {
  if (p1.isAttacking && Math.abs(p1.x - p2.x) < 60) {
    p2.takeDamage(1);
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player1.update(keys);
  player2.update(keys);

  detectHit(player1, player2);
  detectHit(player2, player1);

  player1.draw();
  player2.draw();

  drawHealthBars();

  requestAnimationFrame(gameLoop);
}
