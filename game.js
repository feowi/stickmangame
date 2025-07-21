const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("main-menu");
const bgm = document.getElementById("bgm");
let keys = {};

const spriteSources = {
  stickman1: {
    idle: 'data:image/png;base64,...', // Base64 sprites to be inserted here
    walk: 'data:image/png;base64,...',
    attack: 'data:image/png;base64,...',
    hit: 'data:image/png;base64,...',
  }
};

class Player {
  constructor(x, controls) {
    this.x = x;
    this.y = 400;
    this.health = 100;
    this.frame = 0;
    this.action = "idle";
    this.flip = controls.flip;
    this.controls = controls;
  }

  update() {
    if (keys[this.controls.left]) this.x -= 3;
    if (keys[this.controls.right]) this.x += 3;
    if (keys[this.controls.attack]) this.attack();
    this.frame = (this.frame + 1) % 4;
  }

  attack() {
    this.action = "attack";
    setTimeout(() => this.action = "idle", 300);
  }

  draw() {
    const img = new Image();
    img.src = spriteSources.stickman1[this.action];
    img.onload = () => {
      ctx.save();
      if (this.flip) {
        ctx.scale(-1, 1);
        ctx.drawImage(img, this.frame * 64, 0, 64, 64, -this.x - 64, this.y, 64, 64);
      } else {
        ctx.drawImage(img, this.frame * 64, 0, 64, 64, this.x, this.y, 64, 64);
      }
      ctx.restore();
    }
  }
}

let players = [
  new Player(200, { left: "a", right: "d", attack: " " }),
  new Player(700, { left: "ArrowLeft", right: "ArrowRight", attack: "Enter", flip: true })
];

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  players.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(gameLoop);
}

function startGame() {
  menu.style.display = "none";
  canvas.style.display = "block";
  gameLoop();
}

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);