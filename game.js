// Stickman Fighting Game - Basis met uitbreidingen

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
    keysDown[e.key] = true;
    // Prevent scrolling arrows
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
});

window.addEventListener('keyup', e => {
    keysDown[e.key] = false;
});

// Player config
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 90;
const GRAVITY = 0.8;
const FLOOR_Y = HEIGHT - 100;
const ATTACK_DURATION = 15;
const POWERUP_SIZE = 40;
const MAX_HEALTH = 100;

// UI Elements
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

// Arena backgrounds (simple colored rect with text)
const arenaColors = ['#2a2a2a', '#3a2b1a'];
const arenaNames = ['Arena 1', 'Arena 2'];

// Players and powerups
let players = [];
let powerups = [];

let currentArena = 0;
let winner = null;

// Combo system timing
const COMBO_RESET_TIME = 120; // 2 seconds at 60fps

// Leaderboard localStorage key
const LEADERBOARD_KEY = 'stickman_fighting_leaderboard';

// Player class
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
        this.facing = id === 1 ? 1 : -1; // Player 1 faces right, player 2 faces left
        this.controls = controls;
        this.character = character;
        this.strengthBoost = 0;
        this.speedBoost = 0;
    }

    update() {
        // Movement
        if (keysDown[this.controls.left]) {
            this.vx = -5 - this.speedBoost;
            this.facing = -1;
        } else if (keysDown[this.controls.right]) {
            this.vx = 5 + this.speedBoost;
            this.facing = 1;
        } else {
            this.vx = 0;
        }
        if (keysDown[this.controls.jump] && this.isOnGround) {
            this.vy = -15;
            this.isOnGround = false;
        }

        // Attack
        if (keysDown[this.controls.attack] && !this.isAttacking) {
            this.attack();
        }

        this.x += this.vx;
        this.y += this.vy;

        // Gravity
        if (!this.isOnGround) {
            this.vy += GRAVITY;
        }
        if (this.y > FLOOR_Y - this.height) {
            this.y = FLOOR_Y - this.height;
            this.vy = 0;
            this.isOnGround = true;
        }

        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > WIDTH) this.x = WIDTH - this.width;

        // Attack timer
        if (this.isAttacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer--;
        } else {
            this.combo = 0;
        }
    }

    attack() {
        this.isAttacking = true;
        this.attackTimer = ATTACK_DURATION;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;

        // Increase combo count
        this.combo++;
        this.comboTimer = COMBO_RESET_TIME;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.facing, 1);
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));

        // Draw simple stickman
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;

        // Head
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 20, 15, 0, 2 * Math.PI);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + 35);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 20);
        ctx.stroke();

        // Arms (if attacking show raised arms)
        ctx.beginPath();
        if (this.isAttacking) {
            // Raised arms (attack pose)
            ctx.moveTo(this.x + this.width / 2, this.y + 50);
            ctx.lineTo(this.x + this.width / 2 - 30, this.y + 20);
            ctx.moveTo(this.x + this.width / 2, this.y + 50);
            ctx.lineTo(this.x + this.width / 2 + 30, this.y + 20);
        } else {
            // Normal arms
            ctx.moveTo(this.x + this.width / 2, this.y + 50);
            ctx.lineTo(this.x + this.width / 2 - 30, this.y + 80);
            ctx.moveTo(this.x + this.width / 2, this.y + 50);
            ctx.lineTo(this.x + this.width / 2 + 30, this.y + 80);
        }
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height - 20);
        ctx.lineTo(this.x + this.width / 2 - 30, this.y + this.height);
        ctx.moveTo(this.x + this.width / 2, this.y + this.height - 20);
        ctx.lineTo(this.x + this.width / 2 + 30, this.y + this.height);
        ctx.stroke();

        ctx.restore();
    }
}

// Powerup class
class Powerup {
    constructor(type, x, y) {
        this.type = type; // 'health' or 'strength'
        this.x = x;
        this.y = y;
        this.size = POWERUP_SIZE;
        this.duration = 300; // frames on screen
    }

    update() {
        this.duration--;
    }

    draw(ctx) {
        ctx.save();
        if (this.type === 'health') {
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(this.x + this.size / 2, this.y + this.size / 4);
            ctx.lineTo(this.x + this.size / 2, this.y + 3 * this.size / 4);
            ctx.moveTo(this.x + this.size / 4, this.y + this.size / 2);
            ctx.lineTo(this.x + 3 * this.size / 4, this.y + this.size / 2);
            ctx.stroke();
        } else if (this.type === 'strength') {
            ctx.fillStyle = '#ff5722';
            ctx.beginPath();
            ctx.moveTo(this.x + this.size / 2, this.y + 5);
            ctx.lineTo(this.x + this.size - 5, this.y + this.size - 5);
            ctx.lineTo(this.x + 5, this.y + this.size - 5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.restore();
    }
}

// Game object
const Game = {
    players: [],
    powerups: [],
    arenaIndex: 0,
    arenaName: '',
    winner: null,
    storyStage: 0,
    storyActive: false,

    init() {
        this.arenaIndex = 0;
        this.arenaName = arenaNames[this.arenaIndex];
        this.winner = null;
        this.storyStage = 0;
        this.storyActive = false;
        this.powerups = [];

        // Setup players
        this.players = [
            new Player(1, 100, 'cyan', {left:'a', right:'d', jump:'w', attack:'s'}, selectedCharacterP1),
            new Player(2, WIDTH - 150, 'magenta', {left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:'ArrowDown'}, selectedCharacterP2)
        ];

        updateUI();
        messageDiv.classList.add('hidden');
        menuDiv.style.display = 'none';
        storyDiv.classList.add('hidden');
        leaderboardDiv.classList.add('hidden');
    },

    update() {
        if (gameState !== GAME_STATE.PLAYING) return;

        this.players.forEach(p => p.update());

        this.checkAttacks();

        this.spawnPowerups();

        this.updatePowerups();

        this.checkPowerupPickups();

        this.checkGameOver();

        updateUI();
    },

    draw() {
        // Draw arena background
        ctx.fillStyle = arenaColors[this.arenaIndex];
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw arena name top-left
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(this.arenaName, 10, 30);

        // Draw floor
        ctx.fillStyle = '#654321';
        ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

        // Draw powerups
        this.powerups.forEach(pu => pu.draw(ctx));

        // Draw players
        this.players.forEach(p => p.draw(ctx));
    },

    checkAttacks() {
        const p1 = this.players[0];
        const p2 = this.players[1];

        // Check if p1 attacks p2
        if (p1.isAttacking && this.collides(p1, p2)) {
            const damage = 5 + p1.strengthBoost;
            p2.takeDamage(damage);
        }
        // Check if p2 attacks p1
        if (p2.isAttacking && this.collides(p2, p1)) {
            const damage = 5 + p2.strengthBoost;
            p1.takeDamage(damage);
        }
    },

    collides(p1, p2) {
        // Simple rectangle collision for attack range (front side)
        // Attack hitbox: a rectangle in front of attacker
        let attackRange = 40;
        let attackBox = {
            x: p1.facing === 1 ? p1.x + p1.width : p1.x - attackRange,
            y: p1.y + 20,
            width: attackRange,
            height: p1.height - 40
        };
        let targetBox = {
            x: p2.x,
            y: p2.y,
            width: p2.width,
            height: p2.height
        };

        return !(
            attackBox.x > targetBox.x + targetBox.width ||
            attackBox.x + attackBox.width < targetBox.x ||
            attackBox.y > targetBox.y + targetBox.height ||
            attackBox.y + attackBox.height < targetBox.y
        );
    },

    spawnPowerups() {
        if (this.powerups.length >= 2) return;

        if (Math.random() < 0.005) {
            // Spawn random powerup at random position on floor
            const types = ['health', 'strength'];
            const type = types[Math.floor(Math.random() * types.length)];
            const x = Math.random() * (WIDTH - POWERUP_SIZE);
            const y = FLOOR_Y - POWERUP_SIZE;
            this.powerups.push(new Powerup(type, x, y));
        }
    },

    updatePowerups() {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            this.powerups[i].update();
            if (this.powerups[i].duration <= 0) {
                this.powerups.splice(i, 1);
            }
        }
    },

    checkPowerupPickups() {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pu = this.powerups[i];
            this.players.forEach(p => {
                if (this.collideRects(p, pu)) {
                    this.applyPowerup(p, pu.type);
                    this.powerups.splice(i, 1);
                }
            });
        }
    },

    collideRects(a, b) {
        return !(
            a.x > b.x + b.size ||
            a.x + a.width < b.x ||
            a.y > b.y + b.size ||
            a.y + a.height < b.y
        );
    },

    applyPowerup(player, type) {
        if (type === 'health') {
            player.health += 20;
            if (player.health > MAX_HEALTH) player.health = MAX_HEALTH;
        } else if (type === 'strength') {
            player.strengthBoost = 3;
            // Reset after 5 seconds
            setTimeout(() => {
                player.strengthBoost = 0;
            }, 5000);
        }
    },

    checkGameOver() {
        this.players.forEach(p => {
            if (p.health <= 0) {
                winner = this.players.find(pl => pl !== p);
                gameState = GAME_STATE.GAMEOVER;
                showMessage(`${winner.id === 1 ? 'Speler 1' : 'Speler 2'} wint!`);
                this.addLeaderboardEntry(winner.id);
            }
        });
    },

    addLeaderboardEntry(playerId) {
        let leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
        leaderboard.push({player: playerId, date: new Date().toISOString()});
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    },

    loadLeaderboard() {
        return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    },

    nextArena() {
        this.arenaIndex = (this.arenaIndex + 1) % arenaColors.length;
        this.arenaName = arenaNames[this.arenaIndex];
    },

    startStory() {
        this.storyActive = true;
        this.storyStage = 0;
        gameState = GAME_STATE.STORY;
        storyDiv.classList.remove('hidden');
        menuDiv.style.display = 'none';
        messageDiv.classList.add('hidden');
        leaderboardDiv.classList.add('hidden');
        this.showStoryText();
    },

    showStoryText() {
        const texts = [
            "Welkom bij de Stickman Story Mode!",
            "Je vecht tegen steeds sterkere tegenstanders.",
            "Win om door te gaan naar het volgende level.",
            "Succes!"
        ];
        if(this.storyStage < texts.length) {
            storyTextP.textContent = texts[this.storyStage];
        } else {
            // Start level 1 fight
            storyDiv.classList.add('hidden');
            gameState = GAME_STATE.PLAYING;
            this.init();
        }
    },

    advanceStory() {
        this.storyStage++;
        this.showStoryText();
    },

    exitStory() {
        this.storyActive = false;
        storyDiv.classList.add('hidden');
        menuDiv.style.display = 'block';
        gameState = GAME_STATE.MENU;
    },

    showLeaderboard() {
        leaderboardDiv.classList.remove('hidden');
        menuDiv.style.display = 'none';
        messageDiv.classList.add('hidden');
        storyDiv.classList.add('hidden');

        // Load leaderboard and display
        let leaderboard = this.loadLeaderboard();
        leaderboardList.innerHTML = '';
        if(leaderboard.length === 0) {
            leaderboardList.innerHTML = '<li>Geen scores gevonden.</li>';
            return;
        }
        // Count wins per player
        let countWins = {1:0, 2:0};
        leaderboard.forEach(e => {
            if(e.player === 1) countWins[1]++;
            else if(e.player === 2) countWins[2]++;
        });

        leaderboardList.innerHTML = `
            <li>Speler 1 wins: ${countWins[1]}</li>
            <li>Speler 2 wins: ${countWins[2]}</li>
            <li>Totaal gespeelde wedstrijden: ${leaderboard.length}</li>
        `;
    },

    clearLeaderboard() {
        localStorage.removeItem(LEADERBOARD_KEY);
        this.showLeaderboard();
    }
};

// Update health bars and combo UI
function updateUI() {
    if(!Game.players.length) return;
    player1HealthBar.style.width = Game.players[0].health + '%';
    player2HealthBar.style.width = Game.players[1].health + '%';

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

// Game loop
function loop() {
    if (gameState === GAME_STATE.PLAYING) {
        Game.update();
        Game.draw();
    }
    requestAnimationFrame(loop);
}

// Button event listeners
startGameBtn.addEventListener('click', () => {
    Game.init();
    gameState = GAME_STATE.PLAYING;
});

storyModeBtn.addEventListener('click', () => {
    Game.startStory();
});

startStoryBtn.addEventListener('click', () => {
    Game.advanceStory();
});

exitStoryBtn.addEventListener('click', () => {
    Game.exitStory();
});

leaderboardBtn.addEventListener('click', () => {
    Game.showLeaderboard();
});

clearLeaderboardBtn.addEventListener('click', () => {
    Game.clearLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardDiv.classList.add('hidden');
    menuDiv.style.display = 'block';
});

characterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        characterButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (!document.getElementById('menu').contains(btn)) return;
        // For simplicity: first selected = player 1, second = player 2
        // but here we toggle selection for player 1 only
        selectedCharacterP1 = btn.dataset.character;
    });
});

// Initialize with Player 1's default selection
document.querySelector('.character-btn[data-character="stickman1"]').classList.add('selected');

// Start loop
loop();
