import { Renderer } from "../engine/Renderer";
import { GAME_WIDTH, MAX_LIVES, GAME_DURATION } from "../config/GameConfig";

export interface HUDState {
  score: number;
  highScore: number;
  lives: number;
  timeLeft: number;
  /** Seconds of play so far (keeps counting after the countdown reaches 0). */
  elapsed: number;
  difficultyStage: string;
  stageProgress: number;
  combo: number;
  comboMultiplier: number;
  muted: boolean;
}

export class HUD {
  // Cache ctx reference so helpers can use it
  private ctx!: CanvasRenderingContext2D;

  public render(renderer: Renderer, state: HUDState): void {
    this.ctx = renderer.getContext();
    const ctx = this.ctx;

    // ── Top bar backdrop ──────────────────────────────────────
    const barGrad = ctx.createLinearGradient(0, 0, 0, 72);
    barGrad.addColorStop(0, "rgba(5,5,20,0.88)");
    barGrad.addColorStop(1, "rgba(5,5,20,0.0)");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, 72);

    // Bottom separator line
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 68);
    ctx.lineTo(GAME_WIDTH, 68);
    ctx.stroke();

    // ── LEFT: Score panel ─────────────────────────────────────
    this.drawPanel(ctx, 8, 6, 140, 58);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 11px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("SCORE", 78, 22);
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(74,222,128,0.6)";
    ctx.shadowBlur = 8;
    ctx.fillText(String(state.score), 78, 50);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Best score below
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "11px Arial";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`🏆 ${state.highScore}`, 78, 65);
    ctx.restore();

    // ── CENTER: Timer ─────────────────────────────────────────
    // The countdown runs 60s -> 0s. The run does NOT end at 0 (only 50 misses do), so after
    // that the panel switches to a count-up of survived time instead of sticking on "0s".
    const survival = state.timeLeft <= 0;
    const urgent = !survival && state.timeLeft <= 10;
    const timerColor = survival
      ? "#4ade80"
      : urgent
        ? (Math.floor(Date.now() / 350) % 2 === 0 ? "#ff6b6b" : "#ff9999")   // blink when low
        : "#ffd93d";

    this.drawPanel(ctx, GAME_WIDTH / 2 - 70, 6, 140, 58);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 11px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(survival ? "SURVIVED" : "TIME", GAME_WIDTH / 2, 22);
    ctx.font = `bold 28px Arial`;
    ctx.fillStyle = timerColor;
    if (urgent) {
      ctx.shadowColor = "#ff6b6b";
      ctx.shadowBlur = 12;
    }
    ctx.fillText(
      survival ? this.formatClock(state.elapsed) : `${state.timeLeft}s`,
      GAME_WIDTH / 2,
      52,
    );
    ctx.shadowBlur = 0;
    ctx.restore();

    // Timer progress bar underneath center panel
    const barW = 120;
    const barX = GAME_WIDTH / 2 - barW / 2;
    const barY = 63;
    const progress = survival ? 1 : Math.min(1, state.timeLeft / GAME_DURATION);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    this.roundRectFill(ctx, barX, barY, barW, 4, 2);
    const barColor = survival ? "#4ade80" : urgent ? "#ff6b6b" : "#ffd93d";
    ctx.fillStyle = barColor;
    this.roundRectFill(ctx, barX, barY, barW * progress, 4, 2);

    // ── RIGHT: Lives + Stage ──────────────────────────────────
    this.drawPanel(ctx, GAME_WIDTH - 148, 6, 140, 58);

    // Hearts
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 11px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("LIVES", GAME_WIDTH - 78, 22);
    ctx.restore();

    const heartStr = this.buildHearts(state.lives);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = state.lives <= 1 ? "bold 22px Arial" : "bold 20px Arial";
    ctx.fillStyle = state.lives <= 1 ? "#ff6b6b" : "#fc8888";
    if (state.lives <= 1) {
      ctx.shadowColor = "#ff6b6b";
      ctx.shadowBlur = 10;
    }
    ctx.fillText(heartStr, GAME_WIDTH - 78, 50);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Stage badge bottom-right
    const stageBarW = 80;
    const stageX = GAME_WIDTH - 148 + 30;
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 11px Arial";
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(state.difficultyStage, stageX, 65);
    ctx.restore();
    ctx.fillStyle = "rgba(125,211,252,0.15)";
    this.roundRectFill(ctx, stageX, 66, stageBarW, 3, 2);
    ctx.fillStyle = "#7dd3fc";
    this.roundRectFill(ctx, stageX, 66, stageBarW * state.stageProgress, 3, 2);

    // ── COMBO BANNER ──────────────────────────────────────────
    if (state.combo >= 2) {
      const comboY = 84;
      const isHot = state.comboMultiplier >= 3;
      const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 140);
      const comboText = `🔥 COMBO ×${state.combo}  (${state.comboMultiplier}x pts)`;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `bold ${Math.round(15 * pulse)}px Arial`;
      ctx.fillStyle = isHot ? "#f97316" : "#fbbf24";
      ctx.shadowColor = isHot ? "#f97316" : "#fbbf24";
      ctx.shadowBlur = isHot ? 14 : 8;
      ctx.fillText(comboText, GAME_WIDTH / 2, comboY);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── MUTE ICON (top-right corner) ──────────────────────────
    if (state.muted) {
      ctx.save();
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#64748b";
      ctx.fillText("🔇 muted", GAME_WIDTH - 8, 12);
      ctx.restore();
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private drawPanel(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
  ): void {
    ctx.save();
    ctx.beginPath();
    this.roundRectPath(ctx, x, y, w, h, 8);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /** Seconds -> "m:ss" (e.g. 65 -> "1:05"). */
  private formatClock(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  private buildHearts(lives: number): string {
    const max = Math.min(MAX_LIVES, 5);
    let s = "";
    for (let i = 0; i < max; i++) {
      s += i < lives ? "♥" : "♡";
    }
    return s;
  }

  private roundRectFill(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    if (w <= 0) return;
    ctx.beginPath();
    this.roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
  }

  private roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    const cr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + cr, y);
    ctx.lineTo(x + w - cr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + cr);
    ctx.lineTo(x + w, y + h - cr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
    ctx.lineTo(x + cr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - cr);
    ctx.lineTo(x, y + cr);
    ctx.quadraticCurveTo(x, y, x + cr, y);
    ctx.closePath();
  }
}
