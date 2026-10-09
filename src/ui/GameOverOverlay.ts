import { Renderer } from "../engine/Renderer";
import type { GameResult } from "../managers/ScoreManager";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/GameConfig";

export interface GameOverOverlayState {
  result: GameResult | null;
  cause: "misses";
  inputReady?: boolean;
}

export class GameOverOverlay {
  public render(renderer: Renderer, state: GameOverOverlayState): void {
    const ctx = renderer.getContext();
    const result = state.result;

    // ── Full-screen dim ───────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Result card ───────────────────────────────────────────
    const cardW = 420;
    const cardH = result ? 380 : 180;
    const cardX = GAME_WIDTH / 2 - cardW / 2;
    const cardY = GAME_HEIGHT / 2 - cardH / 2;

    // Card shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fillStyle = "rgba(10,10,30,0.96)";
    ctx.fill();
    ctx.restore();

    // Card border
    ctx.save();
    const heading = "50 COINS MISSED!";
    const accentColor = "#ff6b6b";
    const bgrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    bgrad.addColorStop(0, accentColor);
    bgrad.addColorStop(1, "rgba(255,255,255,0.08)");
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.strokeStyle = bgrad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Card top stripe
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, 52, 20);
    ctx.fillStyle = "rgba(239,68,68,0.22)";
    ctx.fill();
    ctx.restore();

    // ── Heading ───────────────────────────────────────────────
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 14;
    ctx.fillText(heading, GAME_WIDTH / 2, cardY + 28);
    ctx.shadowBlur = 0;
    ctx.restore();

    if (!result) {
      renderer.fillText("Tap or press ENTER to play again", GAME_WIDTH / 2, cardY + cardH / 2 + 20, {
        color: "#ffd93d",
        font: "20px Arial",
        align: "center",
      });
      return;
    }

    // ── Score ─────────────────────────────────────────────────
    let y = cardY + 80;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 42px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = 12;
    ctx.fillText(String(result.score), GAME_WIDTH / 2, y);
    ctx.shadowBlur = 0;
    ctx.font = "13px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("SCORE", GAME_WIDTH / 2, y + 16);
    ctx.restore();
    y += 46;

    // ── New high score / best time badges ─────────────────────
    if (result.isNewHighScore) {
      this.drawBadge(ctx, GAME_WIDTH / 2, y, "🏆  NEW HIGH SCORE!", "#ffd93d", "rgba(250,204,21,0.18)");
      y += 36;
    } else {
      renderer.fillText(`Best: ${result.highScore}`, GAME_WIDTH / 2, y, {
        color: "#fbbf24",
        font: "16px Arial",
        align: "center",
      });
      y += 26;
    }

    if (result.isNewBestTime) {
      this.drawBadge(ctx, GAME_WIDTH / 2, y, `⏱  NEW BEST TIME!  ${result.bestTime.toFixed(1)}s`, "#7dd3fc", "rgba(125,211,252,0.12)");
      y += 36;
    }

    // ── Stats row ─────────────────────────────────────────────
    y += 6;
    const statItems = [
      { label: "CAUGHT", value: String(result.coinsCaught), color: "#4ade80" },
      { label: "MISSED", value: String(result.coinsMissed), color: "#f87171" },
      {
        label: "ACCURACY",
        value: (() => {
          const total = result.coinsCaught + result.coinsMissed;
          return total > 0 ? `${Math.round((result.coinsCaught / total) * 100)}%` : "100%";
        })(),
        color: "#a78bfa",
      },
      { label: "COMBO", value: `×${result.maxCombo}`, color: "#fb923c" },
      { label: "TIME", value: `${result.timeSurvived.toFixed(1)}s`, color: "#7dd3fc" },
    ];

    const colW = cardW / statItems.length;
    for (let i = 0; i < statItems.length; i++) {
      const item = statItems[i];
      const sx = cardX + colW * i + colW / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = item.color;
      ctx.fillText(item.value, sx, y + 18);
      ctx.font = "10px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(item.label, sx, y + 34);
      ctx.restore();
    }
    y += 52;

    // ── Divider ───────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 24, y + 4);
    ctx.lineTo(cardX + cardW - 24, y + 4);
    ctx.stroke();
    y += 20;

    // ── Play again prompt ─────────────────────────────────────
    const btnW = 220; const btnH = 44;
    const btnX = GAME_WIDTH / 2 - btnW / 2;
    const btnY = y + 4;
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, "#4ade80");
    btnGrad.addColorStop(1, "#16a34a");
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 22);
    ctx.fillStyle = btnGrad;
    ctx.shadowColor = "rgba(74,222,128,0.5)";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText("▶  PLAY AGAIN", GAME_WIDTH / 2, btnY + btnH / 2);
    ctx.restore();

    // Sub-hint
    const hintText = state.inputReady === false
      ? "Get ready..."
      : "ENTER · SPACE · tap anywhere";
    renderer.fillText(hintText, GAME_WIDTH / 2, btnY + btnH + 18, {
      color: "rgba(255,255,255,0.28)",
      font: "12px Arial",
      align: "center",
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private drawBadge(
    ctx: CanvasRenderingContext2D,
    cx: number, y: number,
    text: string,
    textColor: string,
    bgColor: string,
  ): void {
    const w = 300; const h = 26;
    const x = cx - w / 2;
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y - 18, w, h, 13);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 13px Arial";
    ctx.fillStyle = textColor;
    ctx.fillText(text, cx, y - 18 + h / 2);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    const cr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
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
