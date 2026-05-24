// ============================================================================
// NEUROCHEMISTRY TYPE DEFINITIONS — Circuit Hijack (Volkow-model inspired)
// ============================================================================

export type NeuroAdjustTarget = 'd1' | 'd2' | 'drugHunger' | 'habitEncoding' | 'accAwareness';

export type NeuroPulseKind = 'rpe' | 'craving' | 'drug';

export type NeuroRole = 'drug' | 'cravingCue' | 'safeZone' | 'accAnchor' | 'pfcExercise';

export interface NeurochemistryState {
  readonly d1: number;
  readonly d2: number;
  readonly rpe: number;
  readonly expectedReward: number;
  readonly habitEncoding: number;
  readonly drugHunger: number;
  readonly accAwareness: number;
  readonly insulaAccCoupling: number;
}

export interface NeuroMovementModifiers {
  readonly speedMultiplier: number;
  readonly jumpDelayMultiplier: number;
}

export type NeuroOutcome = 'playing' | 'won' | 'lost';

export interface NeurochemistryInitialConfig {
  readonly d1: number;
  readonly d2: number;
  readonly expectedReward: number;
  readonly habitEncoding: number;
  readonly drugHunger: number;
  readonly accAwareness: number;
  readonly insulaAccCoupling: number;
}

export interface NeurochemistryDrugConfig {
  readonly d1UpregPerUse: number;
  readonly d2DownregPerUse: number;
  readonly rpeActualReward: number;
  readonly hungerRelief: number;
}

export interface NeurochemistryCueConfig {
  readonly rpeMagnitude: number;
  readonly actualReward: number;
}

export interface NeurochemistryDecayConfig {
  readonly rpeHalfLifeMs: number;
  readonly expectedRewardAlpha: number;
  readonly habitGainFromRpe: number;
  readonly hungerRisePerSecond: number;
  readonly hungerD2DeficitMultiplier: number;
  readonly d2RecoveryPerSecondInSafeZone: number;
  readonly couplingDecayPerSecond: number;
  readonly accAwarenessRisePerSecondWhileLabeling: number;
  readonly accAwarenessDecayPerSecond: number;
}

export interface NeurochemistryRegulationConfig {
  readonly lowD2Threshold: number;
  readonly highD1Threshold: number;
  readonly highHungerThreshold: number;
  readonly lowAccThreshold: number;
  readonly accAnchorCouplingPerTick: number;
  readonly safeZoneCouplingBoost: number;
  readonly hungerGrowthCouplingFactor: number;
}

export interface NeurochemistryLoseWinConfig {
  readonly habitEncodingLose: number;
  readonly habitEncodingWinMax: number;
  readonly winCouplingMin: number;
  readonly winRegulationSeconds: number;
}

export interface NeurochemistryThresholdEffectsConfig {
  readonly lowD2SpeedBoost: number;
  readonly highD1SpeedBoost: number;
  readonly lowD2JumpDelayFactor: number;
}

export interface NeurochemistryConfig {
  readonly INITIAL: NeurochemistryInitialConfig;
  readonly DRUG: NeurochemistryDrugConfig;
  readonly CUE: NeurochemistryCueConfig;
  readonly DECAY: NeurochemistryDecayConfig;
  readonly REGULATION: NeurochemistryRegulationConfig;
  readonly LOSE_WIN: NeurochemistryLoseWinConfig;
  readonly THRESHOLDS: NeurochemistryThresholdEffectsConfig;
}
