export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.setupScene();
    this.setupPhysics();
    this.setupControls();
    this.setupTimers();

    // Inicialización de power‑ups y flags de ataque
    this.gameState.playerPowerUp = null;
    this.gameState.opponentPowerUp = null;
    this.gameState.attackCooldown = false;
    this.gameState.opponentAttackCooldown = false;

    // Lanzamos la interfaz de usuario
    this.scene.launch("UIScene");

    // Programamos la comprobación de recogida de power‑ups cada 500 ms
    this.time.addEvent({
      delay: 500,
      callback: this.checkPowerUpCollections,
      callbackScope: this,
      loop: true,
    });
  }

  setupScene() {
    this.add
      .image(this.cameras.main.centerX, this.cameras.main.centerY, "track")
      .setDisplaySize(this.cameras.main.width, this.cameras.main.height);
    this.bgMusic = this.sound.add("bgMusic", { loop: true, volume: 0.5 });
    this.bgMusic.play();

    // Estado inicial del juego
    this.gameState = {
      playerHealth: 100,
      opponentHealth: 100,
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
    };
    this.gameOver = false;
  }

  setupPhysics() {
    // Jugador
    this.player = this.physics.add
      .sprite(this.cameras.main.centerX, this.cameras.main.height - 100, "mileiKart")
      .setScale(0.1)
      .setCollideWorldBounds(true)
      .setDrag(600, 600)
      .setMaxVelocity(300);

    // Oponente
    this.opponent = this.physics.add
      .sprite(this.cameras.main.centerX, 100, "opponentKart")
      .setScale(0.1)
      .setBounce(1, 0)
      .setCollideWorldBounds(true)
      .setVelocityX(100);

    // Los power‑ups se crean en un grupo (pero sin usar detección de colisiones de física)
    this.powerUps = this.physics.add.group();
  }

  setupControls() {
    this.setupJoystick();
    this.setupAttackButton();
  }

  setupJoystick() {
    const baseX = 100,
      baseY = this.cameras.main.height - 100;
    const radius = 50;

    // Botón ↑
    this.upButton = this.add
      .circle(baseX, baseY - 70, radius, 0x333333, 0.8)
      .setInteractive();
    this.add
      .text(baseX, baseY - 70, "↑", { fontSize: "32px", fill: "#fff" })
      .setOrigin(0.5);
    // Botón ←
    this.leftButton = this.add
      .circle(baseX - 70, baseY, radius, 0x333333, 0.8)
      .setInteractive();
    this.add
      .text(baseX - 70, baseY, "←", { fontSize: "32px", fill: "#fff" })
      .setOrigin(0.5);
    // Botón ↓
    this.downButton = this.add
      .circle(baseX, baseY + 70, radius, 0x333333, 0.8)
      .setInteractive();
    this.add
      .text(baseX, baseY + 70, "↓", { fontSize: "32px", fill: "#fff" })
      .setOrigin(0.5);
    // Botón →
    this.rightButton = this.add
      .circle(baseX + 70, baseY, radius, 0x333333, 0.8)
      .setInteractive();
    this.add
      .text(baseX + 70, baseY, "→", { fontSize: "32px", fill: "#fff" })
      .setOrigin(0.5);

    this.upButton.on("pointerdown", () => {
      this.gameState.moveUp = true;
    });
    this.upButton.on("pointerup", () => {
      this.gameState.moveUp = false;
    });
    this.upButton.on("pointerout", () => {
      this.gameState.moveUp = false;
    });
    this.downButton.on("pointerdown", () => {
      this.gameState.moveDown = true;
    });
    this.downButton.on("pointerup", () => {
      this.gameState.moveDown = false;
    });
    this.downButton.on("pointerout", () => {
      this.gameState.moveDown = false;
    });
    this.leftButton.on("pointerdown", () => {
      this.gameState.moveLeft = true;
    });
    this.leftButton.on("pointerup", () => {
      this.gameState.moveLeft = false;
    });
    this.leftButton.on("pointerout", () => {
      this.gameState.moveLeft = false;
    });
    this.rightButton.on("pointerdown", () => {
      this.gameState.moveRight = true;
    });
    this.rightButton.on("pointerup", () => {
      this.gameState.moveRight = false;
    });
    this.rightButton.on("pointerout", () => {
      this.gameState.moveRight = false;
    });
  }

  setupAttackButton() {
    const btnX = this.cameras.main.width - 100,
      btnY = this.cameras.main.height - 100;
    const radius = 60;
    this.attackButton = this.add
      .circle(btnX, btnY, radius, 0xff4444, 0.8)
      .setInteractive();
    this.add
      .text(btnX, btnY, "ATACAR", {
        fontSize: "20px",
        fill: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.attackButton.on("pointerdown", () => {
      this.tweens.add({
        targets: this.attackButton,
        scale: 0.9,
        duration: 100,
        ease: "Power1",
        onComplete: () => {
          this.handleAttack();
        },
      });
    });
    this.attackButton.on("pointerup", () => {
      this.tweens.add({
        targets: this.attackButton,
        scale: 1,
        duration: 100,
        ease: "Power1",
      });
    });
  }

  setupTimers() {
    // Spawn de power‑ups cada 5 segundos
    this.time.addEvent({
      delay: 5000,
      callback: this.spawnPowerUp,
      callbackScope: this,
      loop: true,
    });
  }

  update() {
    if (this.gameOver) return;

    const acceleration = 600;
    this.player.setAccelerationX(
      this.gameState.moveLeft
        ? -acceleration
        : this.gameState.moveRight
        ? acceleration
        : 0
    );
    this.player.setAccelerationY(
      this.gameState.moveUp
        ? -acceleration
        : this.gameState.moveDown
        ? acceleration
        : 0
    );

    this.opponentBehavior();

    if (this.gameState.playerHealth <= 0) this.endGame("opponent");
    if (this.gameState.opponentHealth <= 0) this.endGame("player");
  }

  // Método para disparar sin colisión: se calcula el tiempo de impacto
  fireBullet(user, target, options) {
    const source = user === "player" ? this.player : this.opponent;
    const bulletSpeed = options.speed;
    const distance = Phaser.Math.Distance.Between(source.x, source.y, target.x, target.y);
    const timeToHit = (distance / bulletSpeed) * 1000; // ms

    // Crear animación de la bala (visualmente se mueve de source a target)
    const bullet = this.add.sprite(source.x, source.y, options.texture || "bullet");
    bullet.setScale(0.4);
    this.tweens.add({
      targets: bullet,
      x: target.x,
      y: target.y,
      duration: timeToHit,
      ease: "Linear",
      onComplete: () => {
        bullet.destroy();
      },
    });

    // Programar la aplicación del daño cuando se "impacte"
    this.time.delayedCall(timeToHit, () => {
      this.applyDamage(target, options.damage);
    });
  }

  applyDamage(target, damage) {
    if (target === this.player) {
      this.gameState.playerHealth = Phaser.Math.Clamp(
        this.gameState.playerHealth - damage,
        0,
        100
      );
    } else {
      this.gameState.opponentHealth = Phaser.Math.Clamp(
        this.gameState.opponentHealth - damage,
        0,
        100
      );
    }
    this.registry.events.emit("updateHealth", {
      player: this.gameState.playerHealth,
      opponent: this.gameState.opponentHealth,
    });
    target.setTint(0xff0000);
    this.time.delayedCall(300, () => {
      target.clearTint();
    });
  }

  handleAttack() {
    if (this.gameState.attackCooldown || !this.gameState.playerPowerUp) return;
    this.gameState.attackCooldown = true;
    this.sound.play("attackSound");
    this.attackWithPowerUp("player", this.opponent, this.gameState.playerPowerUp.type);
    this.gameState.playerPowerUp = null;
    this.time.delayedCall(1000, () => {
      this.gameState.attackCooldown = false;
    });
  }

  opponentAttack() {
    if (this.gameState.opponentAttackCooldown || !this.gameState.opponentPowerUp) return;
    this.gameState.opponentAttackCooldown = true;
    this.sound.play("attackSound");
    this.attackWithPowerUp("opponent", this.player, this.gameState.opponentPowerUp.type);
    this.gameState.opponentPowerUp = null;
    this.time.delayedCall(1000, () => {
      this.gameState.opponentAttackCooldown = false;
    });
  }

  attackWithPowerUp(user, target, powerUpType) {
    switch (powerUpType) {
      case "powerUpDesinformation":
        this.fireBullet(user, target, { damage: 35, speed: 500, texture: powerUpType });
        break;
      case "powerUpRetuits":
        [-10, 0, 10].forEach(() => {
          this.fireBullet(user, target, { damage: 15, speed: 500, texture: powerUpType });
        });
        break;
      case "powerUpShield":
        this.activateShield(user);
        break;
      case "powerUpHostigamiento":
        this.fireBullet(user, target, { damage: 20, speed: 400, texture: powerUpType });
        break;
      default:
        this.fireBullet(user, target, { damage: 15, speed: 500, texture: powerUpType });
    }
  }

  activateShield(user) {
    const sprite = user === "player" ? this.player : this.opponent;
    if (user === "player") {
      this.gameState.playerInvulnerable = true;
    } else {
      this.gameState.opponentInvulnerable = true;
    }
    const shield = this.add.circle(sprite.x, sprite.y, 40, 0x00ffff, 0.3);
    this.tweens.add({
      targets: shield,
      alpha: 0,
      duration: 1000,
      ease: "Power1",
      onComplete: () => {
        shield.destroy();
        if (user === "player") {
          this.gameState.playerInvulnerable = false;
        } else {
          this.gameState.opponentInvulnerable = false;
        }
      },
    });
    this.showPowerUpMessage(
      user === "player"
        ? "¡EXCLUSIVO! ¡Escudo activado!"
        : "¡URGENTE! ¡Escudo del oponente activado!",
      sprite.x,
      sprite.y - 50
    );
  }

  checkPowerUpCollections() {
    const collectThreshold = 40;
    this.powerUps.getChildren().forEach((powerUp) => {
      if (!powerUp.active) return;
      let dPlayer = Phaser.Math.Distance.Between(powerUp.x, powerUp.y, this.player.x, this.player.y);
      if (dPlayer < collectThreshold && !this.gameState.playerPowerUp) {
        this.collectPowerUp(this.player, powerUp);
      }
      let dOpponent = Phaser.Math.Distance.Between(powerUp.x, powerUp.y, this.opponent.x, this.opponent.y);
      if (dOpponent < collectThreshold && !this.gameState.opponentPowerUp) {
        this.collectPowerUpForOpponent(this.opponent, powerUp);
      }
    });
  }

  collectPowerUp(sprite, powerUp) {
    if (sprite === this.player && !this.gameState.playerPowerUp) {
      const type = powerUp.texture.key;
      this.gameState.playerPowerUp = { type };
      this.showPowerUpMessage(this.getPowerUpMessage(type), sprite.x, sprite.y - 50);
      powerUp.destroy();
    }
  }

  collectPowerUpForOpponent(sprite, powerUp) {
    if (sprite === this.opponent && !this.gameState.opponentPowerUp) {
      const type = powerUp.texture.key;
      this.gameState.opponentPowerUp = { type };
      this.showPowerUpMessage(this.getPowerUpMessage(type), sprite.x, sprite.y - 50);
      powerUp.destroy();
    }
  }

  getPowerUpMessage(type) {
    const messages = {
      powerUpDesinformation: "¡EXCLUSIVO! ¡Desinformación activada!",
      powerUpRetuits: "¡URGENTE! ¡Retuits activados!",
      powerUpShield: "¡ALERTA! ¡Escudo activado!",
      powerUpHostigamiento: "¡IMPACTANTE! ¡Hostigamiento activado!",
    };
    return messages[type] || "¡POWERUP ACTIVADO!";
  }

  showPowerUpMessage(message, x, y) {
    const msg = this.add.text(x, y, message, {
      fontSize: "40px",
      fill: "#ffcc00",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: msg,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: "Power1",
      onComplete: () => msg.destroy(),
    });
  }

  endGame(winner) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.bgMusic.stop();
    this.scene.start("EndScene", { winner });
  }
}