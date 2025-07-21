const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game states
const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    STORY: 'story',
    GAMEOVER: 'gameover',
};

let gameState = GAME_STATE.MENU;

// Key input
const keysDown = {};

window.addEventListener('keydown', e => {
    keysDown[e.key.toLowerCase()] = true;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
});

window.addEventListener('keyup', e => {
    keysDown[e.key.toLowerCase()] = false;
});

// Assets
const spriteSources = {
    stickman1: {
        idle: 'https://i.imgur.com/F9fOgX6.png', // voorbeeld idle sprite sheet
        walk: 'https://i.imgur.com/fH6rEJq.png',
        attack: 'https://i.imgur.com/WezNme5.png',
        hit: 'https://i.imgur.com/XGpGCV3.png',
    },
    stickman2: {
        idle: 'https://i.imgur.com/yxM2npY.png',
        walk: 'https://i.imgur.com/O6vZ6x5.png',
        attack: 'https://i.imgur.com/0QaJ8su.png',
        hit: 'https://i.imgur.com/MqVK9r7.png',
    }
};

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 90;
const FLOOR_Y = HEIGHT - 100;
const GRAVITY = 0.8;
const ATTACK_DURATION = 15;
const MAX_HEALTH = 250;

const player1HealthBar = document.getElementById('player1-health');
const player2HealthBar = document.getElementById('player2-health');
const player1ComboText = document.getElementById('player1-combo');
const player2ComboText = document.getElementById('player2-combo');

const messageDiv = document.getElementById('message');
const menuDiv = document.getElementById('menu');
const storyDiv = document.getElementById('story-mode');
const storyTextP = document.getElementById('story-text');
const startStoryBtn = document.getElementById('start-story-btn');
const exitStoryBtn = document.getElementById('exit-story-btn');
const leaderboardDiv = document.getElementById('leaderboard');
const leaderboardList = document.getElementById('leaderboard-list');
const clearLeaderboardBtn = document.getElementById('clear-leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

const startGameBtn = document.getElementById('start-game-btn');
const storyModeBtn = document.getElementById('story-mode-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const characterButtons = document.querySelectorAll('.character-btn');

let selectedCharacterP1 = 'stickman1';
let selectedCharacterP2 = 'stickman2';

// Sprite class
class Sprite {
    constructor(imageSrc, frameCount, frameWidth, frameHeight, frameSpeed = 8) {
        this.image = new Image();
        this.image.src = imageSrc;
        this.frameCount = frameCount;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameSpeed = frameSpeed;
        this.currentFrame = 0;
        this.tickCount = 0;
    }
    update() {
        this.tickCount++;
        if(this.tickCount > this.frameSpeed){
            this.tickCount = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        }
    }
    draw(ctx, x, y, scale=1, flip=false){
        ctx.save();
        if(flip){
            ctx.translate(x + this.frameWidth*scale, y);
            ctx.scale(-1,1);
            ctx.drawImage(this.image, this.currentFrame * this.frameWidth, 0, this.frameWidth, this.frameHeight, 0, 0, this.frameWidth*scale, this.frameHeight*scale);
        } else {
            ctx.drawImage(this.image, this.currentFrame * this.frameWidth, 0, this.frameWidth, this.frameHeight, x, y, this.frameWidth*scale, this.frameHeight*scale);
        }
        ctx.restore();
    }
}

// Player class met animaties
class Player {
    constructor(id, x, color, controls, character='stickman1') {
        this.id = id;
        this.x = x;
        this.y = FLOOR_Y - PLAYER_HEIGHT;
        this.vx = 0;
        this.vy = 0;
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.color = color;
        this.health = MAX_HEALTH;
        this.isOnGround = true;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.facing = id === 1 ? 1 : -1;
        this.controls = controls;
        this.character = character;
        this.strengthBoost = 0;
        this.speedBoost = 0;

        // Animaties laden
        this.sprites = {
            idle: new Sprite(spriteSources[character].idle, 4, 64, 64, 10),
            walk: new Sprite(spriteSources[character].walk, 6, 64, 64, 8),
            attack: new Sprite(spriteSources[character].attack, 4, 64, 64, 6),
            hit: new Sprite(spriteSources[character].hit, 2, 64, 64, 12),
        };
        this.currentAnimation = 'idle';
    }

    update() {
        // Beweging
        if (keysDown[this.controls.left]) {
            this.vx = -5 - this.speedBoost;
            this.facing = -1;
            if(!this.isAttacking) this.currentAnimation = 'walk';
        } else if (keysDown[this.controls.right]) {
            this.vx = 5 + this.speedBoost;
            this.facing = 1;
            if(!this.isAttacking) this.currentAnimation = 'walk';
        } else {
            this.vx = 0;
            if(!this.isAttacking) this.currentAnimation = 'idle';
        }

        if (keysDown[this.controls.jump] && this.isOnGround) {
            this.vy = -15;
            this.isOnGround = false;
            playSound('jump');
        }

        if (keysDown[this.controls.attack] && !this.isAttacking) {
            this.attack();
        }

        this.x += this.vx;
        this.y += this.vy;

        if (!this.isOnGround) {
            this.vy += GRAVITY;
        }

        if (this.y > FLOOR_Y - this.height) {
            this.y = FLOOR_Y - this.height;
            this.vy = 0;
            this.isOnGround = true;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > WIDTH) this.x = WIDTH - this.width;

        // Attack timer
        if (this.isAttacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.currentAnimation = 'idle';
            }
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
        } else {
            this.combo = 0;
        }

        // Update animatie
        this.sprites[this.currentAnimation].update();
    }

    attack() {
        this.isAttacking = true;
        this.attackTimer = ATTACK_DURATION;
        this.currentAnimation = 'attack';
        playSound('attack');
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;

        this.combo++;
        this.comboTimer = 120;

        this.currentAnimation = 'hit';
        setTimeout(() => {
            if(!this.isAttacking) this.currentAnimation = 'idle';
        }, 300);
        playSound('hit');
        screenShake(8, 100);
    }

    draw(ctx) {
        this.sprites[this.currentAnimation].draw(ctx, this.x, this.y + (PLAYER_HEIGHT - 64), 1, this.facing === -1);
    }
}

// Sound effects
const sounds = {
    jump: new Audio('https://freesound.org/data/previews/331/331912_3248244-lq.mp3'),
    attack: new Audio('https://freesound.org/data/previews/20/20137_27194-lq.mp3'),
    hit: new Audio('https://freesound.org/data/previews/131/131661_2398402-lq.mp3'),
};

function playSound(name) {
    const s = sounds[name];
    if (!s) return;
    s.currentTime = 0;
    s.volume = 0.5;
    s.play();
}

// Screen shake
let shakeDuration = 0;
let shakeMagnitude = 0;

function screenShake(magnitude, duration) {
    shakeMagnitude = magnitude;
    shakeDuration = duration;
}

function applyScreenShake() {
    if (shakeDuration > 0) {
        shakeDuration--;
        const dx = (Math.random() - 0.5) * shakeMagnitude;
        const dy = (Math.random() - 0.5) * shakeMagnitude;
        ctx.setTransform(1, 0, 0, 1, dx, dy);
    } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

// Powerup class
class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.type = 'strength';
        this.duration = 480; // 8 seconden (60fps)
        this.active = true;
        this.sprite = new Image();
        this.sprite.src = 'https://i.imgur.com/j8FQo9X.png'; // voorbeeld powerup sprite
    }
    update() {
        // powerup kan pulseren of animatie hebben
    }
    draw(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y, this.size, this.size);
    }
}

class GameClass {
    constructor() {
        this.players = [
            new Player(1, 150, 'cyan', { left: 'a', right: 'd', jump: 'w', attack: 's' }, selectedCharacterP1),
            new Player(2, WIDTH - 200, 'orange', { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: 'arrowdown' }, selectedCharacterP2)
        ];
        this.powerups = [];
        this.powerupSpawnTimer = 0;
    }

    update() {
        this.players.forEach(p => p.update());

        // Check attack hit
        this.checkAttacks();

        // Spawn powerup max 1 tegelijk elke 15 seconden
        if (this.powerups.length === 0) {
            this.powerupSpawnTimer--;
            if (this.powerupSpawnTimer <= 0) {
                const x = Math.random() * (WIDTH - 40);
                const y = FLOOR_Y - 40;
                this.powerups.push(new Powerup(x, y));
                this.powerupSpawnTimer = 900; // 15 sec
            }
        } else {
            // powerup timeout
            this.powerups[0].duration--;
            if (this.powerups[0].duration <= 0) {
                this.powerups.shift();
            }
        }

        // Powerup collision
        this.powerups.forEach((p, i) => {
            this.players.forEach(player => {
                if(this.collides(player, p) && p.active){
                    p.active = false;
                    this.powerups.splice(i,1);
                    player.strengthBoost = 5; // extra 5 damage voor powerup
                    playSound('attack');
                }
            });
        });

    }

    collides(p, powerup) {
        return !(p.x > powerup.x + powerup.size || p.x + p.width < powerup.x || p.y > powerup.y + powerup.size || p.y + p.height < powerup.y);
    }

    checkAttacks() {
        const p1 = this.players[0];
        const p2 = this.players[1];
        if (p1.isAttacking && this.inAttackRange(p1, p2)) {
            p2.takeDamage(8 + p1.strengthBoost);
        }
        if (p2.isAttacking && this.inAttackRange(p2, p1)) {
            p1.takeDamage(8 + p2.strengthBoost);
        }
    }

    inAttackRange(attacker, target) {
        if (attacker.facing === 1) {
            return attacker.x + attacker.width + 15 >= target.x &&
                   attacker.x < target.x &&
                   Math.abs(attacker.y - target.y) < 40;
        } else {
            return attacker.x - 15 <= target.x + target.width &&
                   attacker.x > target.x &&
                   Math.abs(attacker.y - target.y) < 40;
        }
    }

    draw() {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Draw background (parallax kan later)
        ctx.fillStyle = '#222';
        ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

        this.powerups.forEach(p => p.draw(ctx));
        this.players.forEach(p => p.draw(ctx));

        applyScreenShake();
    }
}

let Game = new GameClass();

function updateUI() {
    player1HealthBar.style.width = (Game.players[0].health / MAX_HEALTH) * 100 + '%';
    player2HealthBar.style.width = (Game.players[1].health / MAX_HEALTH) * 100 + '%';

    player1ComboText.textContent = `Combo: ${Game.players[0].combo}`;
    player2ComboText.textContent = `Combo: ${Game.players[1].combo}`;
}

function showMessage(text) {
    messageDiv.textContent = text;
    messageDiv.classList.remove('hidden');
}

function hideMessage() {
    messageDiv.classList.add('hidden');
}

function resetGame() {
    Game = new GameClass();
}

startGameBtn.addEventListener('click', () => {
    resetGame();
    gameState = GAME_STATE.PLAYING;
    menuDiv.style.display = 'none';
    const music = document.getElementById('bg-music');
    music.volume = 0.3;
    music.play();
});

characterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        characterButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedCharacterP1 = btn.dataset.character;
    });
});

function loop() {
    if(gameState === GAME_STATE.PLAYING){
        Game.update();
        Game.draw();
        updateUI();

        if(Game.players[0].health <= 0 || Game.players[1].health <= 0){
            showMessage(Game.players[0].health <= 0 ? 'Speler 2 wint!' : 'Speler 1 wint!');
            gameState = GAME_STATE.MENU;
            menuDiv.style.display = 'block';
        }
    }
    requestAnimationFrame(loop);
}

loop();
