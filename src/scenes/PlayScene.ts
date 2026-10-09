import { Scene } from "../engine/Scene";
import { Renderer } from "../engine/Renderer";
import { Input } from "../engine/Input";
import { EventBus } from "../engine/EventBus";
import { Player } from "../entities/Player";
import { SpawnManager } from "../managers/SpawnManager";
import { ScoreManager, EVT_GAME_OVER } from "../managers/ScoreManager";
import { DifficultyManager } from "../managers/DifficultyManager";
import { GameStateManager } from "../managers/GameStateManager";
import { ComboManager } from "../managers/ComboManager";
import { SoundManager } from "../managers/SoundManager";
import { ParticleEmitter } from "../particles/ParticleEmitter";
import { BackgroundRenderer } from "../effects/BackgroundRenderer";
import { FloatingTextManager } from "../effects/FloatingTextManager";
import { ScreenShake } from "../effects/ScreenShake";
import { StageAnnouncement } from "../effects/StageAnnouncement";
import { hideAds, showAds } from "../main";
import { HUD } from "../ui/HUD";
import { PauseOverlay } from "../ui/PauseOverlay";
import { MobileControls } from "../ui/MobileControls";
import { KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN, KEY_W, KEY_A, KEY_S, KEY_D, KEY_PAUSE, KEY_PAUSE_ALT, KEY_MUTE } from "../config/InputConfig";
import { DEBUG_ENABLED, DEBUG_INFO_COLOR, DEBUG_FONT } from "../config/DebugConfig";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  MAX_LIVES,
  GAME_DURATION,
} from "../config/GameConfig";

export type GameOverCause = "misses";

export interface GameOverPayload {
  result: ReturnType<ScoreManager["finishGame"]>;
  cause: GameOverCause;
}

export class PlayScene extends Scene {
  private readonly player: Player;
  private readonly hud: HUD;
  private readonly pauseOverlay: PauseOverlay;
  private readonly spawnManager: SpawnManager;
  private readonly scoreManager: ScoreManager;
  private readonly difficulty: DifficultyManager;
  private readonly combo: ComboManager;
  private readonly stateManager: GameStateManager;
  private readonly soundManager: SoundManager;
  private readonly particles: ParticleEmitter;
  private readonly background: BackgroundRenderer;
  private readonly floatingText: FloatingTextManager;
  private readonly screenShake: ScreenShake;
  private readonly stageAnnouncement: StageAnnouncement;
  private readonly mobileControls: MobileControls;
  private readonly eventBus: EventBus;
  private static readonly MISSES_TO_GAME_OVER = 50;
  private lives: number = MAX_LIVES;
  private missedCoins: number = 0;
  private timeLeft: number = GAME_DURATION;
  private elapsed: number = 0;
  private gameOverFired: boolean = false;

  constructor(eventBus: EventBus, soundManager: SoundManager) {
    super();
    this.player = new Player(
      GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      GAME_HEIGHT - 60,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      PLAYER_SPEED,
    );
    this.hud = new HUD();
    this.pauseOverlay = new PauseOverlay();
    this.difficulty = new DifficultyManager();
    this.combo = new ComboManager();
    this.spawnManager = new SpawnManager(30, this.difficulty);
    this.scoreManager = new ScoreManager(eventBus);
    this.stateManager = new GameStateManager();
    this.eventBus = eventBus;
    this.soundManager = soundManager;
    this.particles = new ParticleEmitter();
    this.background = new BackgroundRenderer();
    this.floatingText = new FloatingTextManager();
    this.screenShake = new ScreenShake();
    this.stageAnnouncement = new StageAnnouncement();
    this.mobileControls = new MobileControls();
  }

  public enter(): void {
    // Hide ads during gameplay — prevent overlays covering canvas
    hideAds();
    this.player.reset(GAME_WIDTH / 2 - PLAYER_WIDTH / 2);
    this.spawnManager.reset();
    this.scoreManager.reset();
    this.difficulty.reset();
    this.combo.reset();
    this.stateManager.setState("PLAYING");
    this.particles.clear();
    this.floatingText.clear();
    this.stageAnnouncement.clear();
    this.lives = MAX_LIVES;
    this.missedCoins = 0;
    this.timeLeft = GAME_DURATION;
    this.elapsed = 0;
    this.gameOverFired = false;
    this.soundManager.startMusic();
  }

  public exit(): void {
    this.soundManager.stopMusic();
    // Show ads again when leaving play scene (game over / back to menu)
    showAds();
  }

  public update(deltaTime: number, input: Input): void {
    if (input.isKeyPressed(KEY_PAUSE) || input.isKeyPressed(KEY_PAUSE_ALT)) {
      this.stateManager.togglePause();
      this.soundManager.play("pause");
      if (this.stateManager.isPaused()) {
        this.soundManager.stopMusic();
      } else {
        this.soundManager.startMusic();
      }
    }

    // Mobile pause button tap
    if (input.isTouchPressed() && this.mobileControls.isPausePressed()) {
      this.stateManager.togglePause();
      this.soundManager.play("pause");
      if (this.stateManager.isPaused()) {
        this.soundManager.stopMusic();
      } else {
        this.soundManager.startMusic();
      }
    }

    if (input.isKeyPressed(KEY_MUTE)) {
      this.soundManager.toggleMuted();
      this.soundManager.play("uiClick");
    }

    this.background.update(deltaTime);
    this.stageAnnouncement.update(deltaTime);
    this.screenShake.update(deltaTime);

    // Update mobile on-screen controls
    this.mobileControls.update(
      input.isTouchActive(),
      input.getTouchX(),
      input.getTouchY(),
    );

    if (this.stateManager.isPaused()) {
      return;
    }

    // ── Horizontal movement ───────────────────────────────────
    const goLeft  = input.isKeyDown(KEY_LEFT)  || input.isKeyDown(KEY_A) || this.mobileControls.isLeftPressed();
    const goRight = input.isKeyDown(KEY_RIGHT) || input.isKeyDown(KEY_D) || this.mobileControls.isRightPressed();

    if (goLeft)       this.player.moveLeft();
    else if (goRight) this.player.moveRight();
    else              this.player.stopX();

    // ── Vertical movement ─────────────────────────────────────
    const goUp   = input.isKeyDown(KEY_UP)   || input.isKeyDown(KEY_W) || this.mobileControls.isUpPressed();
    const goDown = input.isKeyDown(KEY_DOWN) || input.isKeyDown(KEY_S) || this.mobileControls.isDownPressed();

    if (goUp)       this.player.moveUp();
    else if (goDown) this.player.moveDown();
    else             this.player.stopY();

    // Touch drag (only if NOT on a d-pad button)
    if (input.isTouchActive() && !this.mobileControls.isTouchOnButton(input.getTouchX(), input.getTouchY())) {
      this.player.moveToward(input.getTouchX());
    }

    this.player.update(deltaTime);
    this.player.clampToScreen(GAME_WIDTH);

    this.difficulty.update(deltaTime);

    if (this.difficulty.checkAndAcknowledgeStageChange()) {
      this.stageAnnouncement.show(this.difficulty.getStageName());
      this.soundManager.play("stageUp");
    }

    this.spawnManager.update(deltaTime);

    const result = this.spawnManager.checkCollisions(this.player.rect);
    for (const coin of result.collected) {
      const comboCount = this.combo.increment();
      this.scoreManager.setMaxCombo(comboCount);
      const multiplier = this.combo.getMultiplier();
      const points = coin.getValue() * multiplier;
      this.scoreManager.add(points);
      this.player.triggerCatchFlash();   // basket flashes on collect

      if (coin.coinType === "bonus") {
        this.soundManager.play("bonusCoin");
        this.particles.bonusSparkle(coin.x, coin.y);
      } else {
        this.soundManager.play("coin");
        this.particles.coinSparkle(coin.x, coin.y);
      }

      if (multiplier > 1) {
        this.soundManager.play("combo");
        this.particles.comboBurst(coin.x, coin.y);
      }

      const label = multiplier > 1 ? `+${points} (${multiplier}x)` : `+${points}`;
      this.floatingText.spawn(coin.x, coin.y - 10, label, coin.getColor());
    }

    if (result.missed > 0) {
      this.combo.break();
      this.missedCoins += result.missed;
      this.scoreManager.recordMiss(result.missed);
      this.lives = Math.max(0, this.lives - result.missed);
      this.soundManager.play("lifeLost");
      this.screenShake.trigger(8, 0.3);
      this.particles.lifeLost(this.player.rect.centerX, this.player.rect.top);
      if (this.missedCoins >= PlayScene.MISSES_TO_GAME_OVER) {
        this.handleGameOver("misses");
        return;
      }
    }

    this.particles.update(deltaTime);
    this.floatingText.update(deltaTime);

    this.elapsed += deltaTime;
    this.timeLeft = Math.max(0, GAME_DURATION - Math.floor(this.elapsed));

    // The game continues after the timer reaches zero. Only 50 missed coins end the run.
  }

  public render(renderer: Renderer): void {
    const ctx = renderer.getContext();
    // Cache shake offset once per frame — getOffset() is random, calling it twice would differ.
    const shake = this.screenShake.getOffset();

    this.background.render(renderer);

    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.spawnManager.render(renderer);
    this.particles.render(renderer);
    this.player.render(renderer);
    this.floatingText.render(renderer);
    this.stageAnnouncement.render(renderer);

    ctx.restore();

    this.hud.render(renderer, {
      score: this.scoreManager.getScore(),
      highScore: this.scoreManager.getHighScore(),
      lives: this.lives,
      timeLeft: this.timeLeft,
      difficultyStage: this.difficulty.getStageName(),
      stageProgress: this.difficulty.getStageProgress(),
      combo: this.combo.getCombo(),
      comboMultiplier: this.combo.getMultiplier(),
      muted: this.soundManager.isMuted(),
    });

    // Mobile on-screen d-pad buttons
    this.mobileControls.render(renderer);

    if (this.stateManager.isPaused()) {
      this.pauseOverlay.render(renderer, { muted: this.soundManager.isMuted() });
    }

    if (DEBUG_ENABLED) {
      renderer.fillText(
        `Player X: ${this.player.rect.x.toFixed(0)}  Y: ${this.player.rect.y.toFixed(0)}  ` +
          `VelX: ${this.player.getVelocityX().toFixed(0)}  ` +
          `Coins: ${this.spawnManager.getActiveCoins()}  ` +
          `Combo: ${this.combo.getCombo()}  ` +
          `Stage: ${this.difficulty.getStageName()}`,
        12,
        88,
        { color: DEBUG_INFO_COLOR, font: DEBUG_FONT },
      );
    }
  }

  private handleGameOver(cause: GameOverCause): void {
    if (this.gameOverFired) {
      return;
    }
    this.gameOverFired = true;

    const result = this.scoreManager.finishGame(this.elapsed);
    this.soundManager.play("gameOver");
    this.screenShake.trigger(12, 0.4);
    this.particles.gameOver(this.player.rect.centerX, this.player.rect.centerY);
    this.eventBus.emit(EVT_GAME_OVER, { result, cause } satisfies GameOverPayload);
    this.switchTo("gameover");
  }
}
