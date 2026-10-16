
const W = 800;
const H = 600;
const WORLD_W = 2000;
const WORLD_H = 1500;

let player;
let cursors;
let keys;
let obstacles;
let crystals;
let enemies;
let guardian;
let hud;
let message;
let inventoryPanel;
let sceneRef;

let health = 100;
let crystalCount = 0;
let coins = 0;
let potions = 2;
let questStarted = false;
let questComplete = false;
let inventoryOpen = false;
let lastAttack = 0;
let lastDamage = 0;
let facingX = 1;
let facingY = 0;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#83d878",

  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },

  scene: {
    create,
    update
  }
});

function create() {
  sceneRef = this;

  health = 100;
  crystalCount = 0;
  coins = 0;
  potions = 2;
  questStarted = false;
  questComplete = false;
  inventoryOpen = false;

  this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

  // Texturas geradas pelo próprio Phaser
  makeTextures(this);

  // Fundo
  this.add.rectangle(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W,
    WORLD_H,
    0x83d878
  );

  // Grama decorativa
  for (let i = 0; i < 350; i++) {
    this.add.circle(
      Phaser.Math.Between(10, WORLD_W - 10),
      Phaser.Math.Between(10, WORLD_H - 10),
      Phaser.Math.Between(2, 5),
      i % 2 ? 0x69c765 : 0xa1e58b,
      0.65
    );
  }

  // Caminho da ilha
  const path = this.add.graphics();
  path.lineStyle(75, 0xd8b77c, 1);
  path.beginPath();
  path.moveTo(200, 200);
  path.lineTo(450, 350);
  path.lineTo(750, 300);
  path.lineTo(950, 550);
  path.lineTo(1300, 650);
  path.lineTo(1550, 900);
  path.lineTo(1750, 1200);
  path.strokePath();

  // Lago
  this.add.ellipse(1650, 280, 400, 270, 0x45c8ed);
  this.add.ellipse(1650, 280, 345, 215, 0x8ce6fa);

  // Obstáculos
  obstacles = this.physics.add.staticGroup();

  for (let i = 0; i < 65; i++) {
    const x = Phaser.Math.Between(70, WORLD_W - 70);
    const y = Phaser.Math.Between(90, WORLD_H - 70);

    if (
      Phaser.Math.Distance.Between(x, y, 200, 200) < 130
    ) continue;

    const inLake =
      ((x - 1650) / 200) ** 2 +
      ((y - 280) / 135) ** 2 < 1;

    if (inLake) continue;

    const tree = obstacles.create(x, y, "tree");
    tree.setDepth(y);
    tree.body.setSize(24, 20);
    tree.body.setOffset(18, 39);
    tree.refreshBody();
  }

  // Personagem: textura válida, criada antes do sprite
  player = this.physics.add.sprite(200, 200, "player");

  player.setDepth(210);
  player.setCollideWorldBounds(true);
  player.body.setSize(22, 20);
  player.body.setOffset(9, 28);

  this.physics.add.collider(player, obstacles);

  // Guardião
  guardian = this.physics.add.staticImage(450, 340, "guardian");
  guardian.setDepth(guardian.y);
  guardian.refreshBody();

  this.physics.add.collider(player, guardian);

  // Cristais
  crystals = this.physics.add.staticGroup();

  const crystalPositions = [
    [350, 150], [600, 450], [800, 200],
    [1000, 400], [1250, 300], [1450, 600],
    [300, 800], [600, 1000], [900, 850],
    [1200, 1100], [1550, 1250], [1800, 950]
  ];

  crystalPositions.forEach(([x, y]) => {
    const crystal = crystals.create(x, y, "crystal");
    crystal.setDepth(y);
    crystal.refreshBody();
  });

  this.physics.add.overlap(
    player,
    crystals,
    collectCrystal,
    null,
    this
  );

  // Inimigos
  enemies = this.physics.add.group();

  const enemyPositions = [
    [700, 550], [1100, 750], [1400, 450],
    [1700, 1000], [450, 1200]
  ];

  enemyPositions.forEach(([x, y]) => {
    const enemy = enemies.create(x, y, "slime");
    enemy.setDepth(y);
    enemy.setCollideWorldBounds(true);
    enemy.body.setSize(30, 20);
    enemy.health = 3;
  });

  this.physics.add.collider(enemies, obstacles);
  this.physics.add.collider(player, enemies);
  this.physics.add.overlap(player, enemies, damagePlayer, null, this);

  // Câmera
  this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
  this.cameras.main.startFollow(player, true, 0.1, 0.1);

  // Teclado
  cursors = this.input.keyboard.createCursorKeys();

  keys = this.input.keyboard.addKeys({
    W: Phaser.Input.Keyboard.KeyCodes.W,
    A: Phaser.Input.Keyboard.KeyCodes.A,
    S: Phaser.Input.Keyboard.KeyCodes.S,
    D: Phaser.Input.Keyboard.KeyCodes.D,
    SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    F: Phaser.Input.Keyboard.KeyCodes.F,
    E: Phaser.Input.Keyboard.KeyCodes.E,
    I: Phaser.Input.Keyboard.KeyCodes.I,
    H: Phaser.Input.Keyboard.KeyCodes.H
  });

  // Interface
  hud = this.add.text(14, 14, "", {
    fontFamily: "Arial",
    fontSize: "17px",
    color: "#173c29",
    backgroundColor: "#ffffffdd",
    padding: { x: 10, y: 8 },
    lineSpacing: 4
  }).setScrollFactor(0).setDepth(1000);

  message = this.add.text(W / 2, H - 30, "", {
    fontFamily: "Arial",
    fontSize: "15px",
    color: "#ffffff",
    backgroundColor: "#294d3a",
    padding: { x: 12, y: 8 },
    align: "center"
  }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

  inventoryPanel = this.add.text(W / 2, H / 2, "", {
    fontFamily: "Arial",
    fontSize: "23px",
    color: "#ffffff",
    backgroundColor: "#294d3a",
    padding: 25,
    align: "center"
  }).setOrigin(0.5).setScrollFactor(0)
    .setDepth(1100).setVisible(false);

  keys.F.on("down", attack);
  keys.E.on("down", talkToGuardian);

  keys.I.on("down", () => {
    inventoryOpen = !inventoryOpen;
    inventoryPanel.setVisible(inventoryOpen);
    updateHUD();
  });

  keys.H.on("down", usePotion);

  showMessage("Explore a ilha! WASD ou setas para andar.");
  updateHUD();
}

// ======================================
// TEXTURAS: SEM ARQUIVOS DE IMAGEM
// ======================================

function makeTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 });

  // Personagem
  g.fillStyle(0x345ac4);
  g.fillRoundedRect(9, 29, 10, 16, 3);
  g.fillRoundedRect(22, 29, 10, 16, 3);

  g.fillStyle(0x80502e);
  g.fillRoundedRect(7, 40, 13, 7, 3);
  g.fillRoundedRect(21, 40, 13, 7, 3);

  g.fillStyle(0x2f68d0);
  g.fillRoundedRect(5, 18, 31, 19, 6);

  g.fillStyle(0xf3bd8c);
  g.fillRoundedRect(8, 3, 26, 23, 8);

  g.fillStyle(0x583622);
  g.fillRoundedRect(6, 1, 30, 10, 5);

  g.fillStyle(0xf28d42);
  g.fillRoundedRect(4, 0, 34, 7, 3);

  g.fillStyle(0x222222);
  g.fillCircle(15, 15, 2);
  g.fillCircle(27, 15, 2);

  g.generateTexture("player", 42, 50);
  g.clear();

  // Árvore
  g.fillStyle(0x80502e);
  g.fillRoundedRect(23, 32, 14, 35, 4);
  g.fillStyle(0x27894b);
  g.fillCircle(30, 23, 25);
  g.fillCircle(13, 32, 16);
  g.fillCircle(46, 32, 16);
  g.fillStyle(0x4ac96b);
  g.fillCircle(21, 15, 13);

  g.generateTexture("tree", 60, 70);
  g.clear();

  // Cristal
  g.fillStyle(0x9c65ff);
  g.fillPoints([
    { x: 12, y: 0 },
    { x: 24, y: 12 },
    { x: 12, y: 28 },
    { x: 0, y: 12 }
  ], true);

  g.fillStyle(0xe5d4ff);
  g.fillPoints([
    { x: 12, y: 3 },
    { x: 12, y: 22 },
    { x: 5, y: 12 }
  ], true);

  g.generateTexture("crystal", 24, 28);
  g.clear();

  // Monstro
  g.fillStyle(0x48bb68);
  g.fillEllipse(21, 21, 39, 26);
  g.fillStyle(0x9af0a0);
  g.fillEllipse(14, 13, 13, 8);
  g.fillStyle(0x173c29);
  g.fillCircle(15, 20, 2);
  g.fillCircle(27, 20, 2);

  g.generateTexture("slime", 42, 34);
  g.clear();

  // Guardião
  g.fillStyle(0x279b98);
  g.fillRoundedRect(6, 20, 28, 25, 6);
  g.fillStyle(0xf2c18d);
  g.fillCircle(20, 15, 13);
  g.fillStyle(0x61402b);
  g.fillRoundedRect(7, 3, 26, 9, 4);
  g.fillStyle(0xf2d29b);
  g.fillRoundedRect(4, 1, 32, 5, 3);
  g.fillStyle(0x222222);
  g.fillCircle(16, 15, 2);
  g.fillCircle(24, 15, 2);

  g.generateTexture("guardian", 40, 48);
  g.destroy();
}

// ======================================
// MOVIMENTAÇÃO
// ======================================

function update() {
  if (!player || !player.body) return;

  if (inventoryOpen) {
    player.setVelocity(0, 0);
    return;
  }

  let dx = 0;
  let dy = 0;

  if (cursors.left.isDown || keys.A.isDown) dx--;
  if (cursors.right.isDown || keys.D.isDown) dx++;
  if (cursors.up.isDown || keys.W.isDown) dy--;
  if (cursors.down.isDown || keys.S.isDown) dy++;

  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  const speed = keys.SHIFT.isDown ? 260 : 180;

  player.setVelocity(dx * speed, dy * speed);

  if (dx !== 0 || dy !== 0) {
    facingX = dx;
    facingY = dy;
  }

  player.setDepth(player.y + 100);

  enemies.getChildren().forEach(enemy => {
    if (!enemy.active) return;

    const distance = Phaser.Math.Distance.Between(
      player.x, player.y, enemy.x, enemy.y
    );

    if (distance < 240 && distance > 40) {
      const angle = Phaser.Math.Angle.Between(
        enemy.x, enemy.y, player.x, player.y
      );

      enemy.setVelocity(
        Math.cos(angle) * 65,
        Math.sin(angle) * 65
      );
    } else {
      enemy.setVelocity(0, 0);
    }

    enemy.setDepth(enemy.y + 20);
  });
}

// ======================================
// CRISTAIS
// ======================================

function collectCrystal(player, crystal) {
  if (!crystal.active) return;

  crystal.destroy();
  crystalCount++;
  coins += 3;

  showMessage("Cristal encontrado! +3 moedas.");
  updateHUD();

  if (crystalCount >= 12) {
    showMessage("Você encontrou todos os cristais! Volte ao guardião.");
  }
}

// ======================================
// COMBATE
// ======================================

function attack() {
  const now = Date.now();

  if (now - lastAttack < 400) return;
  lastAttack = now;

  let hit = false;

  enemies.getChildren().forEach(enemy => {
    if (!enemy.active) return;

    const distance = Phaser.Math.Distance.Between(
      player.x, player.y, enemy.x, enemy.y
    );

    const angle = Phaser.Math.Angle.Between(
      player.x, player.y, enemy.x, enemy.y
    );

    const difference = Math.abs(
      Phaser.Math.Angle.Wrap(
        angle - Math.atan2(facingY, facingX)
      )
    );

    if (distance < 85 && difference < 1.5) {
      enemy.health--;
      hit = true;

      const knockback = Phaser.Math.Angle.Between(
        player.x, player.y, enemy.x, enemy.y
      );

      enemy.setVelocity(
        Math.cos(knockback) * 180,
        Math.sin(knockback) * 180
      );

      if (enemy.health <= 0) {
        enemy.destroy();

        const reward = Phaser.Math.Between(2, 6);
        coins += reward;

        if (Math.random() < 0.25) potions++;

        showMessage(`Monstro derrotado! +${reward} moedas.`);
        updateHUD();
      }
    }
  });

  if (!hit) showMessage("Chegue perto do monstro e olhe na direção dele!");
}

// ======================================
// DANO
// ======================================

function damagePlayer(player, enemy) {
  const now = Date.now();

  if (now - lastDamage < 1000) return;
  lastDamage = now;

  health = Math.max(0, health - 10);

  const angle = Phaser.Math.Angle.Between(
    enemy.x, enemy.y, player.x, player.y
  );

  player.setVelocity(
    Math.cos(angle) * 200,
    Math.sin(angle) * 200
  );

  if (health <= 0) {
    health = 100;
    crystalCount = Math.max(0, crystalCount - 1);
    player.setPosition(200, 200);

    showMessage("Você foi resgatado! Voltou ao início.");
  } else {
    showMessage("Você foi atingido! Use H para tomar uma poção.");
  }

  updateHUD();
}

// ======================================
// MISSÃO
// ======================================

function talkToGuardian() {
  const distance = Phaser.Math.Distance.Between(
    player.x, player.y, guardian.x, guardian.y
  );

  if (distance > 100) {
    showMessage("Chegue perto do guardião para conversar.");
    return;
  }

  if (!questStarted) {
    questStarted = true;
    showMessage("Guardião: encontre os 12 cristais mágicos!");
  } else if (crystalCount >= 12 && !questComplete) {
    questComplete = true;
    coins += 50;
    potions += 2;

    showMessage("Missão concluída! +50 moedas e 2 poções!");
  } else if (questComplete) {
    showMessage("Guardião: você salvou a ilha! Muito obrigado!");
  } else {
    showMessage(`Você encontrou ${crystalCount}/12 cristais.`);
  }

  updateHUD();
}

// ======================================
// POÇÕES
// ======================================

function usePotion() {
  if (potions <= 0) {
    showMessage("Você não tem poções!");
    return;
  }

  if (health >= 100) {
    showMessage("Sua vida já está cheia!");
    return;
  }

  potions--;
  health = Math.min(100, health + 40);

  showMessage("Poção usada! Você recuperou 40 de vida.");
  updateHUD();
}

// ======================================
// INTERFACE
// ======================================

function updateHUD() {
  if (!hud) return;

  hud.setText(
    `❤️ Vida: ${health}/100\n` +
    `💎 Cristais: ${crystalCount}/12\n` +
    `🪙 Moedas: ${coins}\n` +
    `🧪 Poções: ${potions}\n` +
    `🎯 ${questComplete ? "Missão concluída!" : questStarted ? "Encontre os cristais" : "Fale com o guardião"}`
  );

  if (inventoryPanel && inventoryOpen) {
    inventoryPanel.setText(
      "🎒 INVENTÁRIO\n\n" +
      `💎 Cristais: ${crystalCount}\n` +
      `🪙 Moedas: ${coins}\n` +
      `🧪 Poções: ${potions}\n\n` +
      "Pressione I para fechar"
    );
  }
}

function showMessage(text) {
  if (message) message.setText(text);
}
