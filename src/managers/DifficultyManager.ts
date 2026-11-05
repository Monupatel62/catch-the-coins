import {
  DIFFICULTY_STAGES,
  DIFFICULTY_STAGE_DURATION,
  DifficultyStage,
} from "../config/GameConfig";

export class DifficultyManager {
  private elapsed: number = 0;
  private _prevStageIndex: number = 0;

  public reset(): void {
    this.elapsed = 0;
    this._prevStageIndex = 0;
  }

  public update(deltaTime: number): void {
    this.elapsed += deltaTime;
  }

  public getStageIndex(): number {
    const index = Math.floor(this.elapsed / DIFFICULTY_STAGE_DURATION);
    return Math.min(index, DIFFICULTY_STAGES.length - 1);
  }

  public getStage(): DifficultyStage {
    return DIFFICULTY_STAGES[this.getStageIndex()];
  }

  public getSpawnInterval(): number {
    return this.getStage().spawnInterval;
  }

  public getCoinSpeed(): number {
    return this.getStage().coinSpeed;
  }

  public getStageName(): string {
    return this.getStage().name;
  }

  /**
   * Returns true once when the stage has advanced.
   * Internally tracks the previous stage — no external index needed.
   */
  public checkAndAcknowledgeStageChange(): boolean {
    const current = this.getStageIndex();
    if (current !== this._prevStageIndex) {
      this._prevStageIndex = current;
      return true;
    }
    return false;
  }

  /** @deprecated Use checkAndAcknowledgeStageChange() instead. */
  public hasStageChanged(prevIndex: number): boolean {
    return this.getStageIndex() !== prevIndex;
  }

  public getStageProgress(): number {
    // Last stage never advances, so keep its bar full instead of wrapping back to empty.
    if (this.elapsed >= DIFFICULTY_STAGE_DURATION * DIFFICULTY_STAGES.length) {
      return 1;
    }
    const stageElapsed = this.elapsed % DIFFICULTY_STAGE_DURATION;
    return stageElapsed / DIFFICULTY_STAGE_DURATION;
  }
}
