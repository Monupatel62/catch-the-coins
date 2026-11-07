import { GameLoop } from "./GameLoop";
import { Renderer } from "./Renderer";
import { Input } from "./Input";
import { SceneManager } from "./SceneManager";
import { Scene } from "./Scene";
import { DebugOverlay } from "../debug/DebugOverlay";
import { EventBus } from "./EventBus";
import { GAME_WIDTH, GAME_HEIGHT, FIXED_DELTA_TIME } from "../config/GameConfig";
import { KEY_DEBUG } from "../config/InputConfig";

export class Game {
  private readonly renderer: Renderer;
  private readonly input: Input;
  private readonly sceneManager: SceneManager;
  private readonly gameLoop: GameLoop;
  private readonly eventBus: EventBus;
  private readonly debugOverlay: DebugOverlay;
  private readonly canvas: HTMLCanvasElement;
  private readonly resizeObserver: ResizeObserver;
  private debugMode: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // Initial size — will be updated by handleResize immediately
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager();
    this.debugOverlay = new DebugOverlay();
    this.gameLoop = new GameLoop(this.update, this.render, FIXED_DELTA_TIME);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("orientationchange", this.handleResize);
    document.addEventListener("fullscreenchange", this.handleResize);
    window.addEventListener("keydown", this.handleDebugKey);
  }

  public registerScene(name: string, scene: Scene): void {
    this.sceneManager.add(name, scene);
  }

  public startScene(name: string): void {
    this.sceneManager.switchTo(name);
  }

  public getEventBus(): EventBus {
    return this.eventBus;
  }

  public getRenderer(): Renderer {
    return this.renderer;
  }

  public start(): void {
    this.handleResize(); // apply correct size immediately
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();
    this.resizeObserver.disconnect();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("orientationchange", this.handleResize);
    document.removeEventListener("fullscreenchange", this.handleResize);
    window.removeEventListener("keydown", this.handleDebugKey);
    this.input.dispose();
  }

  public isDebugMode(): boolean {
    return this.debugMode;
  }

  private handleResize = (): void => {
    const isFullscreen = !!document.fullscreenElement;
    const host = this.canvas.parentElement;
    const hostRect = host?.getBoundingClientRect();

    // Use the actual game container, not the top-level window. This also
    // handles the game when it is embedded in the Coin Catcher landing page.
    const availW = Math.max(0, isFullscreen ? window.innerWidth : (hostRect?.width ?? window.innerWidth));
    const availH = Math.max(0, isFullscreen ? window.innerHeight : (hostRect?.height ?? window.innerHeight));

    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.renderer.resize(GAME_WIDTH, GAME_HEIGHT);

    const scale = Math.min(availW / GAME_WIDTH, availH / GAME_HEIGHT);
    const drawW = Math.max(1, Math.floor(GAME_WIDTH * scale));
    const drawH = Math.max(1, Math.floor(GAME_HEIGHT * scale));

    this.canvas.style.width = `${drawW}px`;
    this.canvas.style.height = `${drawH}px`;

    if (isFullscreen) {
      this.canvas.style.position = "fixed";
      this.canvas.style.top = "0";
      this.canvas.style.left = "0";
    } else {
      this.canvas.style.position = "relative";
      this.canvas.style.top = "";
      this.canvas.style.left = "";
    }
  };

  private handleDebugKey = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() === KEY_DEBUG) {
      this.debugMode = !this.debugMode;
    }
  };

  private update = (fixedDeltaTime: number): void => {
    this.sceneManager.update(fixedDeltaTime, this.input);
    this.input.endFrame();
  };

  private render = (): void => {
    this.renderer.clear();
    this.sceneManager.render(this.renderer);

    if (this.debugMode) {
      this.debugOverlay.render(this.renderer, this.gameLoop.getTime());
    }
  };
}
