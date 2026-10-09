import { Scene } from "../engine/Scene";
import { Renderer } from "../engine/Renderer";
import { Input } from "../engine/Input";
import { SoundManager } from "../managers/SoundManager";
import { StorageManager } from "../managers/StorageManager";
import { BackgroundRenderer } from "../effects/BackgroundRenderer";
import { KEY_ENTER, KEY_SPACE } from "../config/InputConfig";
import { GAME_WIDTH, GAME_HEIGHT, STORAGE_HIGH_SCORE_KEY } from "../config/GameConfig";

interface MenuCoin {
  x: number;
  y: number;
  speed: number;
  radius: number;
  color: string;
  strokeColor: string;
  rotation: number;
  phase: number;
  wobble: number;
}

export class MenuScene extends Scene {
  private readonly background: BackgroundRenderer;
  private readonly soundManager: SoundManager;
  private readonly onStartGame: () => Promise<void>;
  private readonly onInstallApp: (() => void) | null;
  private elapsed: number = 0;
  private highScore: number;
  private readonly menuCoins: MenuCoin[] = [];

  // Start button
  private readonly btnX: number;
  private readonly btnY: number;
  private readonly btnW: number = 260;
  private readonly btnH: number = 56;
  private btnHover: boolean = false;

  // Install button (below start button)
  private readonly installBtnX: number;
  private readonly installBtnY: number;
  private readonly installBtnW: number = 200;
  private readonly installBtnH: number = 40;
  private installBtnHover: boolean = false;
  private showInstallBtn: boolean = false;

  constructor(soundManager: SoundManager, onStartGame: () => Promise<void>, onInstallApp: (() => void) | null = null) {
    super();
    this.background = new BackgroundRenderer(50);
    this.soundManager = soundManager;
    this.onStartGame = onStartGame;
    this.onInstallApp = onInstallApp;
    this.highScore = StorageManager.getNumber(STORAGE_HIGH_SCORE_KEY, 0);
    this.btnX = GAME_WIDTH / 2 - 130;
    this.btnY = GAME_HEIGHT / 2 + 50;
    this.installBtnX = GAME_WIDTH / 2 - this.installBtnW / 2;
    this.installBtnY = this.btnY + this.btnH + 16;

    // Spawn decorative falling coins across the screen
    const colors = [
      { c: "#facc15", s: "#a16207" },
      { c: "#e2e8f0", s: "#64748b" },
      { c: "#f97316", s: "#c2410c" },
      { c: "#facc15", s: "#a16207" },
      { c: "#facc15", s: "#a16207" },
      { c: "#facc15", s: "#a16207" },
      { c: "#e2e8f0", s: "#64748b" },
      { c: "#f97316", s: "#c2410c" },
    ];
    for (let i = 0; i < 8; i++) {
      const col = colors[i % colors.length];
      this.menuCoins.push({
        x: 60 + i * 95,
        y: -40 - i * 70,
        speed: 55 + i * 12,
        radius: i % 3 === 0 ? 18 : i % 3 === 1 ? 13 : 10,
        color: col.c,
        strokeColor: col.s,
        rotation: 0,
        phase: (i / 8) * Math.PI * 2,
        wobble: 0,
      });
    }
  }

  /** Called from main.ts when beforeinstallprompt fires */
  public setInstallAvailable(available: boolean): void {
    this.showInstallBtn = available;
  }

  /** Force show install button (for testing or fallback) */
  public forceShowInstall(): void {
    this.showInstallBtn = true;
  }

  public enter(): void {
    this.elapsed = 0;
    this.highScore = StorageManager.getNumber(STORAGE_HIGH_SCORE_KEY, 0);
    // Reset coin positions so they fall fresh each visit
    for (let i = 0; i < this.menuCoins.length; i++) {
      this.menuCoins[i].y = -40 - i * 70;
    }
  }

  public update(deltaTime: number, input: Input): void {
    this.elapsed += deltaTime;
    this.background.update(deltaTime);

    // Update decorative coins
    for (const coin of this.menuCoins) {
      coin.y += coin.speed * deltaTime;
      coin.rotation += deltaTime * 3.5;
      coin.wobble += deltaTime;
      if (coin.y > GAME_HEIGHT + 30) {
        coin.y = -30;
      }
    }

    // Hover detection
    const mx = input.getMouseX();
    const my = input.getMouseY();
    this.btnHover =
      mx >= this.btnX && mx <= this.btnX + this.btnW &&
      my >= this.btnY && my <= this.btnY + this.btnH;

    this.installBtnHover = this.showInstallBtn &&
      mx >= this.installBtnX && mx <= this.installBtnX + this.installBtnW &&
      my >= this.installBtnY && my <= this.installBtnY + this.installBtnH;

    // Install button click (mouse or touch)
    if (this.showInstallBtn && this.onInstallApp) {
      if (input.isMousePressed() && this.installBtnHover) {
        this.onInstallApp();
        return;
      }
      if (input.isTouchPressed()) {
        const tx = input.getTouchX();
        const ty = input.getTouchY();
        if (tx >= this.installBtnX && tx <= this.installBtnX + this.installBtnW &&
            ty >= this.installBtnY && ty <= this.installBtnY + this.installBtnH) {
          this.onInstallApp();
          return;
        }
      }
    }

    // Start game triggers
    if (input.isKeyPressed(KEY_ENTER) || input.isKeyPressed(KEY_SPACE)) {
      this.startGame();
      return;
    }

    if (input.isMousePressed()) {
      this.startGame();
      return;
    }

    if (input.isTouchPressed()) {
      this.startGame();
    }
  }

  private startGame(): void {
    this.soundManager.play("uiClick");
    // Request fullscreen on mobile, then switch scene
    this.onStartGame().finally(() => {
      this.switchTo("play");
    });
  }

  public render(renderer: Renderer): void {
    const ctx = renderer.getContext();
    this.background.render(renderer);

    // Decorative falling coins (behind UI)
    for (const coin of this.menuCoins) {
      const squash = 0.75 + 0.25 * Math.abs(Math.cos(coin.rotation));
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(coin.x, coin.y, coin.radius * squash, coin.radius, 0, 0, Math.PI * 2);
      ctx.fillStyle = coin.color;
      ctx.fill();
      ctx.strokeStyle = coin.strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Specular highlight
      ctx.beginPath();
      ctx.ellipse(
        coin.x - coin.radius * squash * 0.25,
        coin.y - coin.radius * 0.2,
        coin.radius * squash * 0.15,
        coin.radius * 0.12,
        -0.4, 0, Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fill();
      ctx.restore();
    }

    // ── LOGO / TITLE ──────────────────────────────────────────
    const titleBob = Math.sin(this.elapsed * 1.8) * 5;
    const titleY = GAME_HEIGHT / 2 - 155 + titleBob;

    // Logo backing pill
    const logoW = 520;
    const logoH = 72;
    const logoX = GAME_WIDTH / 2 - logoW / 2;
    const logoY = titleY - 52;
    const lgrad = ctx.createLinearGradient(logoX, logoY, logoX, logoY + logoH);
    lgrad.addColorStop(0, "rgba(250,204,21,0.22)");
    lgrad.addColorStop(1, "rgba(250,204,21,0.06)");
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, logoX, logoY, logoW, logoH, 16);
    ctx.fillStyle = lgrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(250,204,21,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Coin icon left of title
    ctx.save();
    const iconX = GAME_WIDTH / 2 - 220;
    const iconY = titleY - 18;
    const iconR = 22;
    const coinIcGrad = ctx.createRadialGradient(iconX - 4, iconY - 4, 2, iconX, iconY, iconR);
    coinIcGrad.addColorStop(0, "#ffe566");
    coinIcGrad.addColorStop(0.6, "#facc15");
    coinIcGrad.addColorStop(1, "#a16207");
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
    ctx.fillStyle = coinIcGrad;
    ctx.fill();
    ctx.strokeStyle = "#78490a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#78490a";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", iconX, iconY + 1);
    ctx.restore();

    // Title text with shadow
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 46px Arial";
    ctx.shadowColor = "rgba(250,204,21,0.7)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#fef08a";
    ctx.fillText("CATCH THE COIN", GAME_WIDTH / 2 + 14, titleY);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Subtitle
    renderer.fillText("★  Arcade Edition  ★", GAME_WIDTH / 2, titleY + 30, {
      color: "rgba(250,204,21,0.75)",
      font: "15px Arial",
      align: "center",
    });

    // ── HIGH SCORE BADGE ──────────────────────────────────────
    if (this.highScore > 0) {
      const badgeY = GAME_HEIGHT / 2 - 72;
      ctx.save();
      const bw = 220; const bh = 34;
      const bx = GAME_WIDTH / 2 - bw / 2;
      const by = badgeY - 24;
      ctx.beginPath();
      this.roundRect(ctx, bx, by, bw, bh, 17);
      ctx.fillStyle = "rgba(255,215,0,0.14)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,215,0,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      renderer.fillText(`🏆  Best Score: ${this.highScore}`, GAME_WIDTH / 2, badgeY, {
        color: "#ffd93d",
        font: "bold 17px Arial",
        align: "center",
      });
    }

    // ── HOW TO PLAY (coin type hints) ─────────────────────────
    const hintY = GAME_HEIGHT / 2 - 32;
    this.drawCoinSample(ctx, GAME_WIDTH / 2 - 120, hintY + 2, 10, "#facc15", "#a16207");
    renderer.fillText("+10", GAME_WIDTH / 2 - 104, hintY + 6, { color: "#facc15", font: "bold 13px Arial" });
    this.drawCoinSample(ctx, GAME_WIDTH / 2 - 54, hintY + 2, 10, "#e2e8f0", "#64748b");
    renderer.fillText("+5", GAME_WIDTH / 2 - 38, hintY + 6, { color: "#c0c8d8", font: "bold 13px Arial" });
    this.drawCoinSample(ctx, GAME_WIDTH / 2 + 12, hintY + 2, 10, "#f97316", "#c2410c");
    renderer.fillText("★+25", GAME_WIDTH / 2 + 28, hintY + 6, { color: "#fb923c", font: "bold 13px Arial" });
    renderer.fillText("Combo ×4!", GAME_WIDTH / 2 + 105, hintY + 6, { color: "#a78bfa", font: "bold 13px Arial" });

    // ── START BUTTON ──────────────────────────────────────────
    this.drawStartButton(ctx);

    // ── INSTALL BUTTON (when available) ───────────────────────
    if (this.showInstallBtn) {
      this.drawInstallButton(ctx);
    }

    // ── CONTROLS ROW ──────────────────────────────────────────
    const ctrlY = this.showInstallBtn
      ? this.installBtnY + this.installBtnH + 14
      : this.btnY + this.btnH + 38;
    this.drawKeyBadge(ctx, GAME_WIDTH / 2 - 140, ctrlY, "←");
    this.drawKeyBadge(ctx, GAME_WIDTH / 2 - 98, ctrlY, "→");
    this.drawKeyBadge(ctx, GAME_WIDTH / 2 - 56, ctrlY, "↑");
    this.drawKeyBadge(ctx, GAME_WIDTH / 2 - 14, ctrlY, "↓");
    renderer.fillText("Move", GAME_WIDTH / 2 - 77, ctrlY + 30, { color: "#94a3b8", font: "12px Arial", align: "center" });

    this.drawKeyBadge(ctx, GAME_WIDTH / 2 + 36, ctrlY, "ESC");
    renderer.fillText("Pause", GAME_WIDTH / 2 + 36, ctrlY + 30, { color: "#94a3b8", font: "12px Arial", align: "center" });

    this.drawKeyBadge(ctx, GAME_WIDTH / 2 + 92, ctrlY, "M");
    renderer.fillText("Mute", GAME_WIDTH / 2 + 92, ctrlY + 30, { color: "#94a3b8", font: "12px Arial", align: "center" });

    // Mobile touch hint
    const touchY = ctrlY + 52;
    renderer.fillText("📱  Mobile: D-pad (bottom-left) or tap to move", GAME_WIDTH / 2, touchY, {
      color: "#64748b",
      font: "13px Arial",
      align: "center",
    });

    // Current survival rules: five hearts, one heart lost per ten misses,
    // and Game Over at fifty missed coins. The timer only controls the first
    // sixty seconds of difficulty progression; it does not end the run.
    renderer.fillText("5 hearts  |  -1 heart per 10 missed coins  |  Game Over at 50 misses",
      GAME_WIDTH / 2, touchY + 20, {
        color: "#94a3b8",
        font: "12px Arial",
        align: "center",
      });
    renderer.fillText("3 difficulty stages in the first 60 seconds; then peak speed",
      GAME_WIDTH / 2, touchY + 36, {
        color: "#64748b",
        font: "11px Arial",
        align: "center",
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private drawInstallButton(ctx: CanvasRenderingContext2D): void {
    const x = this.installBtnX;
    const y = this.installBtnY;
    const w = this.installBtnW;
    const h = this.installBtnH;
    const r = 20;
    const pulse = 0.8 + 0.2 * Math.sin(this.elapsed * 2.5);
    const hov = this.installBtnHover;

    ctx.save();
    // Glow
    ctx.shadowColor = `rgba(99, 179, 237, ${0.4 * pulse})`;
    ctx.shadowBlur = hov ? 20 : 12;

    // Body
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, hov ? "#90cdf4" : "#63b3ed");
    grad.addColorStop(1, hov ? "#3182ce" : "#2b6cb0");
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();

    // Sheen
    const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    sheen.addColorStop(0, "rgba(255,255,255,0.25)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    this.roundRect(ctx, x + 2, y + 2, w - 4, h * 0.5, r - 2);
    ctx.fillStyle = sheen;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 4;
    ctx.fillText("📲  Install App", x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }

  private drawStartButton(ctx: CanvasRenderingContext2D): void {
    const x = this.btnX;
    const y = this.btnY;
    const w = this.btnW;
    const h = this.btnH;
    const r = 28;

    const pulse = 0.85 + 0.15 * Math.sin(this.elapsed * 3.5);
    const hoverScale = this.btnHover ? 1.03 : 1;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(hoverScale, hoverScale);
    ctx.translate(-cx, -cy);

    // Glow
    ctx.shadowColor = `rgba(74, 222, 128, ${0.5 * pulse})`;
    ctx.shadowBlur = this.btnHover ? 28 : 18;

    // Button body gradient
    const btnGrad = ctx.createLinearGradient(x, y, x, y + h);
    btnGrad.addColorStop(0, this.btnHover ? "#6ee7a0" : "#4ade80");
    btnGrad.addColorStop(1, this.btnHover ? "#22c55e" : "#16a34a");
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = btnGrad;
    ctx.fill();

    // Top sheen
    const sheenGrad = ctx.createLinearGradient(x, y, x, y + h * 0.45);
    sheenGrad.addColorStop(0, "rgba(255,255,255,0.28)");
    sheenGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    this.roundRect(ctx, x + 2, y + 2, w - 4, h * 0.45, r - 2);
    ctx.fillStyle = sheenGrad;
    ctx.fill();

    // Border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, r);
    ctx.stroke();

    ctx.restore();

    // Label
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 4;
    ctx.fillText("▶  START GAME", cx, cy + 1);
    ctx.restore();
  }

  private drawKeyBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, label: string): void {
    const w = label.length > 1 ? 42 : 32;
    const h = 26;
    const x = cx - w / 2;
    const y = cy - h / 2;
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, 5);
    ctx.fillStyle = "rgba(30, 40, 70, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Bottom shadow edge (keyboard depth effect)
    ctx.beginPath();
    this.roundRect(ctx, x + 1, y + h - 4, w - 2, 5, 3);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${label.length > 2 ? 11 : 13}px Arial`;
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(label, cx, cy - 1);
    ctx.restore();
  }

  private drawCoinSample(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number,
    color: string, stroke: string,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /** Polyfill for ctx.roundRect (not available in all browsers) */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
