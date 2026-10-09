import { Scene } from "../engine/Scene";
import { Renderer } from "../engine/Renderer";
import { Input } from "../engine/Input";
import { EventBus } from "../engine/EventBus";
import { SoundManager } from "../managers/SoundManager";
import { BackgroundRenderer } from "../effects/BackgroundRenderer";
import { EVT_GAME_OVER, GameResult } from "../managers/ScoreManager";
import { KEY_ENTER, KEY_SPACE } from "../config/InputConfig";
import { GameOverOverlay } from "../ui/GameOverOverlay";
import { GameOverCause, GameOverPayload } from "./PlayScene";
import { enterFullscreen, triggerGameOverAd } from "../main";

export class GameOverScene extends Scene {
  private readonly overlay: GameOverOverlay;
  private readonly background: BackgroundRenderer;
  private readonly soundManager: SoundManager;
  private result: GameResult | null = null;
  private cause: GameOverCause = "misses";
  private readonly unsubscribeGameOver: () => void;

  private inputDelay: number = 0;
  private static readonly INPUT_DELAY = 0.6;

  constructor(eventBus: EventBus, soundManager: SoundManager) {
    super();
    this.overlay = new GameOverOverlay();
    this.background = new BackgroundRenderer(30);
    this.soundManager = soundManager;
    this.unsubscribeGameOver = eventBus.on(EVT_GAME_OVER, (payload: GameOverPayload) => {
      this.result = payload.result;
      this.cause = payload.cause;
    });
  }

  public enter(): void {
    this.inputDelay = GameOverScene.INPUT_DELAY;
    // Trigger ad on game over — vignette/interstitial
    triggerGameOverAd();
  }

  public exit(): void {}

  public destroy(): void {
    this.unsubscribeGameOver();
  }

  public update(deltaTime: number, input: Input): void {
    this.background.update(deltaTime);

    if (this.inputDelay > 0) {
      this.inputDelay -= deltaTime;
      return;
    }

    if (input.isKeyPressed(KEY_ENTER) || input.isKeyPressed(KEY_SPACE)) {
      this.restart();
      return;
    }

    if (input.isMousePressed()) {
      this.restart();
      return;
    }

    if (input.isTouchPressed()) {
      this.restart();
      return;
    }
  }

  public render(renderer: Renderer): void {
    this.background.render(renderer);
    this.overlay.render(renderer, {
      result: this.result,
      cause: this.cause,
      inputReady: this.inputDelay <= 0,
    });
  }

  private restart(): void {
    this.soundManager.play("uiClick");
    // Re-enter fullscreen if not already (e.g. user pressed ESC to exit)
    enterFullscreen().finally(() => {
      this.switchTo("play");
    });
  }
}
