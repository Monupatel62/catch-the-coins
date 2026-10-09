import { EventBus } from "../engine/EventBus";
import { StorageManager } from "./StorageManager";
import { STORAGE_HIGH_SCORE_KEY, STORAGE_BEST_TIME_KEY } from "../config/GameConfig";

export const EVT_SCORE_CHANGED = "scoreChanged";
export const EVT_COIN_COLLECTED = "coinCollected";
export const EVT_GAME_OVER = "gameOver";

export interface GameResult {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  /** All-time best survival time (seconds). */
  bestTime: number;
  isNewBestTime: boolean;
  /** Current session's survival time (seconds). */
  timeSurvived: number;
  coinsCaught: number;
  coinsMissed: number;
  maxCombo: number;
}

export class ScoreManager {
  private score: number = 0;
  private highScore: number;
  private bestTime: number;
  private coinsCaught: number = 0;
  private coinsMissed: number = 0;
  private maxCombo: number = 0;
  private readonly eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.highScore = StorageManager.getNumber(STORAGE_HIGH_SCORE_KEY, 0);
    this.bestTime = StorageManager.getNumber(STORAGE_BEST_TIME_KEY, 0);
  }

  public add(points: number): void {
    this.score += points;
    this.coinsCaught++;
    this.eventBus.emit(EVT_COIN_COLLECTED, { points });
    this.eventBus.emit(EVT_SCORE_CHANGED, { score: this.score });
  }

  public recordMiss(count: number = 1): void {
    this.coinsMissed += Math.max(0, Math.floor(count));
  }

  public setMaxCombo(combo: number): void {
    this.maxCombo = Math.max(this.maxCombo, combo);
  }

  public reset(): void {
    this.score = 0;
    this.coinsCaught = 0;
    this.coinsMissed = 0;
    this.maxCombo = 0;
    this.eventBus.emit(EVT_SCORE_CHANGED, { score: this.score });
  }

  public getScore(): number {
    return this.score;
  }

  public getHighScore(): number {
    return this.highScore;
  }

  public getBestTime(): number {
    return this.bestTime;
  }

  public finishGame(timeSurvived: number): GameResult {
    const isNewHighScore = this.score > this.highScore;
    if (isNewHighScore) {
      this.highScore = this.score;
      StorageManager.setNumber(STORAGE_HIGH_SCORE_KEY, this.highScore);
    }

    const isNewBestTime = timeSurvived > this.bestTime;
    if (isNewBestTime) {
      this.bestTime = timeSurvived;
      StorageManager.setNumber(STORAGE_BEST_TIME_KEY, this.bestTime);
    }

    return {
      score: this.score,
      highScore: this.highScore,
      isNewHighScore,
      bestTime: this.bestTime,
      isNewBestTime,
      timeSurvived,
      coinsCaught: this.coinsCaught,
      coinsMissed: this.coinsMissed,
      maxCombo: this.maxCombo,
    };
  }
}
