// ============================================================================
// HUD MANAGER
// ============================================================================

import { CONFIG } from '../config/game_config';
import { NEUROCHEMISTRY_CONFIG } from '../config/neurochemistry_config';

import { CollectiblesManager } from './collectibles_manager';
import { NeurochemistryManager } from './neurochemistry_manager';

import type { CharacterController } from '../controllers/character_controller';

export class HUDManager {
  private static hudContainer: HTMLDivElement | null = null;
  private static hudElements = new Map<string, HTMLDivElement>();
  private static hudValueElements = new Map<string, HTMLSpanElement>();
  private static hudBarFills = new Map<string, HTMLDivElement>();
  private static hungerVignette: HTMLDivElement | null = null;
  private static elementVisibility = new Map<string, boolean>();
  private static scene: BABYLON.Scene | null = null;
  private static characterController: CharacterController | null = null;
  private static startTime = 0;
  private static fpsCounter = 0;
  private static fpsLastTime = 0;
  private static currentFPS = 0;
  private static lastCoordinates: BABYLON.Vector3 | null = null;
  /** Throttles DOM-heavy HUD fields (coordinates, time, state, boost, credits); FPS still samples every frame. */
  private static lastHudHeavyUpdate = 0;
  private static isMobile = false;
  private static isIPadWithKeyboard = false;
  private static activeHudConfig: {
    readonly SHOW_COORDINATES: boolean;
    readonly SHOW_TIME: boolean;
    readonly SHOW_FPS: boolean;
    readonly SHOW_STATE: boolean;
    readonly SHOW_BOOST_STATUS: boolean;
    readonly SHOW_CREDITS: boolean;
    readonly SHOW_NEURO_METERS: boolean;
    readonly SHOW_D1_D2: boolean;
    readonly SHOW_RPE_PULSE: boolean;
    readonly SHOW_DRUG_HUNGER: boolean;
    readonly SHOW_INSULA_ACC_COUPLING: boolean;
    readonly SHOW_HABIT_ENCODING: boolean;
  };

  /**
   * Initializes the HUD with a scene and character controller
   */
  public static initialize(scene: BABYLON.Scene, characterController: CharacterController): void {
    // Clean up any existing HUD before creating a new one
    this.dispose();

    this.scene = scene;
    this.characterController = characterController;
    this.startTime = Date.now();
    this.activeHudConfig = CONFIG.HUD;

    // Detect device type once at initialization
    this.isIPadWithKeyboard = navigator.userAgent.includes('iPad') && navigator.maxTouchPoints > 0;
    this.isMobile =
      !this.isIPadWithKeyboard &&
      (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0);

    this.createHUD();

    // Set initial visibility for all HUD elements based on device type
    this.activeHudConfig = this.isIPadWithKeyboard
      ? CONFIG.HUD.IPadWithKeyboard
      : this.isMobile
        ? CONFIG.HUD.MOBILE
        : CONFIG.HUD;
    this.setElementVisibility('coordinates', this.activeHudConfig.SHOW_COORDINATES);
    this.setElementVisibility('time', this.activeHudConfig.SHOW_TIME);
    this.setElementVisibility('fps', this.activeHudConfig.SHOW_FPS);
    this.setElementVisibility('state', this.activeHudConfig.SHOW_STATE);
    this.setElementVisibility('boost', this.activeHudConfig.SHOW_BOOST_STATUS);
    this.setElementVisibility('credits', this.activeHudConfig.SHOW_CREDITS);
    this.setElementVisibility('d1', this.activeHudConfig.SHOW_D1_D2);
    this.setElementVisibility('d2', this.activeHudConfig.SHOW_D1_D2);
    this.setElementVisibility('rpe', this.activeHudConfig.SHOW_RPE_PULSE);
    this.setElementVisibility('hunger', this.activeHudConfig.SHOW_DRUG_HUNGER);
    this.setElementVisibility('coupling', this.activeHudConfig.SHOW_INSULA_ACC_COUPLING);
    this.setElementVisibility('habit', this.activeHudConfig.SHOW_HABIT_ENCODING);

    // Start the update loop
    this.startUpdateLoop();
  }

  /**
   * Creates the HUD elements
   */
  private static createHUD(): void {
    if (!this.scene) return;

    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    // Create HUD container
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'game-hud';
    this.hudContainer.style.cssText = this.getHUDContainerStyles();

    // Create HUD elements
    this.createHUDElement('coordinates', 'Coordinates');
    this.createHUDElement('time', 'Time');
    this.createHUDElement('fps', 'FPS');
    this.createHUDElement('state', 'State');
    this.createHUDElement('boost', 'Boost');
    this.createHUDElement('credits', 'Credits');
    this.createHUDBarElement('d1', 'D1 Accelerator', CONFIG.HUD.METER_D1_COLOR);
    this.createHUDBarElement('d2', 'D2 Brake', CONFIG.HUD.METER_D2_COLOR);
    this.createHUDBarElement('rpe', 'Dopamine Pulse', CONFIG.HUD.METER_RPE_COLOR);
    this.createHUDBarElement('hunger', 'Drug Hunger', CONFIG.HUD.METER_HUNGER_COLOR);
    this.createHUDBarElement('coupling', 'Insula–ACC', CONFIG.HUD.METER_COUPLING_COLOR);
    this.createHUDBarElement('habit', 'Habit Encoding', CONFIG.HUD.METER_HABIT_COLOR);

    this.createHungerVignette(canvas);

    // Add CSS animations
    this.addHUDAnimations();

    // Add HUD to canvas parent
    const canvasParent = canvas.parentElement;
    if (canvasParent) {
      canvasParent.appendChild(this.hudContainer);
    }

    // Initialize FPS counter baseline once; per-frame counting happens in updateFPS.
    this.fpsLastTime = Date.now();
  }

  /**
   * Gets the HUD container styles based on CONFIG.HUD.POSITION
   */
  private static getHUDContainerStyles(): string {
    const config = CONFIG.HUD;
    const position = config.POSITION;

    let positionStyles = '';
    switch (position) {
      case 'top':
        positionStyles =
          'top: 0; left: 0; right: 0; flex-direction: row; justify-content: space-between;';
        break;
      case 'bottom':
        positionStyles =
          'bottom: 0; left: 0; right: 0; flex-direction: row; justify-content: space-between;';
        break;
      case 'left':
        positionStyles =
          'top: 0; left: 0; bottom: 0; flex-direction: column; justify-content: flex-start;';
        break;
      case 'right':
        positionStyles =
          'top: 0; right: 0; bottom: 0; flex-direction: column; justify-content: flex-start;';
        break;
    }

    return `
            position: absolute;
            ${positionStyles}
            display: flex;
            padding: ${config.PADDING}px;
            font-family: ${config.FONT_FAMILY};
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            pointer-events: none;
        `;
  }

  /**
   * Creates a HUD element with proper styling
   */
  private static createHUDElement(id: string, label: string): void {
    if (!this.hudContainer) return;

    const element = document.createElement('div');
    element.id = `hud-${id}`;
    element.className = 'hud-element';
    element.style.cssText = this.getHUDElementStyles() + 'display: none;'; // Start hidden

    const labelSpan = document.createElement('span');
    labelSpan.className = 'hud-label';
    labelSpan.textContent = label;
    labelSpan.style.color = CONFIG.HUD.SECONDARY_COLOR;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'hud-value';
    valueSpan.id = `hud-${id}-value`;
    valueSpan.style.color = CONFIG.HUD.PRIMARY_COLOR;

    element.appendChild(labelSpan);
    // Add <br> for all elements to put value under title
    element.appendChild(document.createElement('br'));
    element.appendChild(valueSpan);

    this.hudContainer.appendChild(element);
    this.hudElements.set(id, element);
    this.hudValueElements.set(id, valueSpan);
    this.elementVisibility.set(id, false);
  }

  private static createHUDBarElement(id: string, label: string, barColor: string): void {
    if (!this.hudContainer) {
      return;
    }

    const element = document.createElement('div');
    element.id = `hud-${id}`;
    element.className = 'hud-element hud-bar-element';
    element.style.cssText =
      this.getHUDElementStyles() + 'display: none; min-width: 140px; text-align: left;';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'hud-label';
    labelSpan.textContent = label;
    labelSpan.style.color = CONFIG.HUD.SECONDARY_COLOR;
    labelSpan.style.display = 'block';
    labelSpan.style.marginBottom = '4px';

    const track = document.createElement('div');
    track.style.cssText =
      'width: 100%; height: 8px; background: rgba(255,255,255,0.15); border-radius: 4px; overflow: hidden;';

    const fill = document.createElement('div');
    fill.style.cssText = `height: 100%; width: 0%; background: ${barColor}; transition: width 0.15s ease;`;
    track.appendChild(fill);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'hud-value';
    valueSpan.id = `hud-${id}-value`;
    valueSpan.style.cssText = `display: block; margin-top: 4px; font-size: 11px; color: ${CONFIG.HUD.PRIMARY_COLOR};`;
    valueSpan.textContent = '0%';

    element.appendChild(labelSpan);
    element.appendChild(track);
    element.appendChild(valueSpan);

    this.hudContainer.appendChild(element);
    this.hudElements.set(id, element);
    this.hudValueElements.set(id, valueSpan);
    this.hudBarFills.set(id, fill);
    this.elementVisibility.set(id, false);
  }

  private static createHungerVignette(canvas: HTMLCanvasElement): void {
    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }
    this.hungerVignette = document.createElement('div');
    this.hungerVignette.id = 'circuit-hijack-vignette';
    this.hungerVignette.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 900;
      opacity: 0;
      transition: opacity 0.4s ease;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(120, 20, 30, 0.55) 100%);
    `;
    parent.appendChild(this.hungerVignette);
  }

  /**
   * Gets the HUD element styles
   */
  private static getHUDElementStyles(): string {
    const config = CONFIG.HUD;
    return `
            background-color: ${config.BACKGROUND_COLOR};
            background-opacity: ${config.BACKGROUND_OPACITY};
            background: rgba(0, 0, 0, ${config.BACKGROUND_OPACITY});
            color: ${config.PRIMARY_COLOR};
            padding: 8px 12px;
            margin: 2px;
            border-radius: ${config.BORDER_RADIUS}px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(5px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            min-width: 80px;
            text-align: center;
            transition: all 0.2s ease;
        `;
  }

  /**
   * Adds CSS animations for HUD effects
   */
  private static addHUDAnimations(): void {
    const style = document.createElement('style');
    style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
                100% { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .hud-element {
                animation: fadeIn 0.3s ease-out;
            }
            .hud-element:hover {
                animation: pulse 0.5s ease-in-out;
            }
            .hud-boost-active {
                animation: pulse 0.5s ease-in-out infinite alternate;
            }
            .hud-element.faded-in {
                animation: none;
            }
            .hud-element.faded-in.hud-boost-active {
                animation: pulse 0.5s ease-in-out infinite alternate;
            }
        `;
    document.head.appendChild(style);
  }

  /**
   * Starts the HUD update loop
   */
  private static startUpdateLoop(): void {
    // Use Babylon.js scene observable instead of setInterval
    if (this.scene) {
      this.scene.onBeforeRenderObservable.add(() => {
        this.updateHUD();
      });
    }
  }

  /**
   * Updates all HUD elements
   */
  private static updateHUD(): void {
    if (!this.scene || !this.characterController) return;

    const now = performance.now();
    const throttleMs = CONFIG.HUD.UPDATE_INTERVAL;
    const doHeavyDom = now - this.lastHudHeavyUpdate >= throttleMs;
    if (doHeavyDom) {
      this.lastHudHeavyUpdate = now;
    }

    // Update coordinates
    if (this.activeHudConfig.SHOW_COORDINATES) {
      if (doHeavyDom) {
        this.updateCoordinates();
      }
      this.setElementVisibility('coordinates', true);
    } else {
      this.setElementVisibility('coordinates', false);
    }

    // Update time
    if (this.activeHudConfig.SHOW_TIME) {
      if (doHeavyDom) {
        this.updateTime();
      }
      this.setElementVisibility('time', true);
    } else {
      this.setElementVisibility('time', false);
    }

    // Update FPS (counter must run every frame; text updates inside updateFPS stay cheap)
    if (this.activeHudConfig.SHOW_FPS) {
      this.updateFPS();
      this.setElementVisibility('fps', true);
    } else {
      this.setElementVisibility('fps', false);
    }

    // Update state
    if (this.activeHudConfig.SHOW_STATE) {
      if (doHeavyDom) {
        this.updateState();
      }
      this.setElementVisibility('state', true);
    } else {
      this.setElementVisibility('state', false);
    }

    // Update boost status
    if (this.activeHudConfig.SHOW_BOOST_STATUS) {
      if (doHeavyDom) {
        this.updateBoostStatus();
      }
      this.setElementVisibility('boost', true);
    } else {
      this.setElementVisibility('boost', false);
    }

    // Update credits
    if (this.activeHudConfig.SHOW_CREDITS) {
      if (doHeavyDom) {
        this.updateCredits();
      }
      this.setElementVisibility('credits', true);
    } else {
      this.setElementVisibility('credits', false);
    }

    if (this.activeHudConfig.SHOW_NEURO_METERS) {
      if (doHeavyDom) {
        this.updateNeuroMeters();
      }
      this.setElementVisibility('d1', this.activeHudConfig.SHOW_D1_D2);
      this.setElementVisibility('d2', this.activeHudConfig.SHOW_D1_D2);
      this.setElementVisibility('rpe', this.activeHudConfig.SHOW_RPE_PULSE);
      this.setElementVisibility('hunger', this.activeHudConfig.SHOW_DRUG_HUNGER);
      this.setElementVisibility('coupling', this.activeHudConfig.SHOW_INSULA_ACC_COUPLING);
      this.setElementVisibility('habit', this.activeHudConfig.SHOW_HABIT_ENCODING);
    } else {
      this.setElementVisibility('d1', false);
      this.setElementVisibility('d2', false);
      this.setElementVisibility('rpe', false);
      this.setElementVisibility('hunger', false);
      this.setElementVisibility('coupling', false);
      this.setElementVisibility('habit', false);
    }
  }

  private static updateNeuroMeters(): void {
    const snap = NeurochemistryManager.getSnapshot();
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    this.setBar('d1', snap.d1, pct(snap.d1));
    this.setBar('d2', snap.d2, pct(snap.d2));
    this.setBar('rpe', snap.rpe, pct(snap.rpe));
    this.setBar('hunger', snap.drugHunger, pct(snap.drugHunger));
    this.setBar('coupling', snap.insulaAccCoupling, pct(snap.insulaAccCoupling));
    this.setBar('habit', snap.habitEncoding, pct(snap.habitEncoding));

    const reg = NEUROCHEMISTRY_CONFIG.REGULATION;
    if (this.hungerVignette) {
      const showVignette =
        snap.drugHunger > reg.highHungerThreshold && snap.accAwareness < reg.lowAccThreshold;
      this.hungerVignette.style.opacity = showVignette ? '1' : '0';
    }
  }

  private static setBar(id: string, value: number, label: string): void {
    const fill = this.hudBarFills.get(id);
    const valueEl = this.hudValueElements.get(id);
    const clamped = Math.max(0, Math.min(1, value));
    if (fill) {
      fill.style.width = `${clamped * 100}%`;
    }
    if (valueEl) {
      valueEl.textContent = label;
    }
  }

  /**
   * Updates the coordinates display
   */
  private static updateCoordinates(): void {
    const coordsValue = this.hudValueElements.get('coordinates');
    if (!coordsValue || !this.characterController) return;

    const position = this.characterController.getPosition();
    if (!this.lastCoordinates || !position.equals(this.lastCoordinates)) {
      coordsValue.textContent = `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`;
      this.lastCoordinates = position.clone();
    }
  }

  /**
   * Updates the time display
   */
  private static updateTime(): void {
    const timeValue = this.hudValueElements.get('time');
    if (!timeValue) return;

    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timeValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Updates the FPS display
   */
  private static updateFPS(): void {
    const fpsValue = this.hudValueElements.get('fps');
    if (!fpsValue || !this.scene) return;

    this.fpsCounter++;
    const currentTime = Date.now();

    if (currentTime - this.fpsLastTime >= 1000) {
      this.currentFPS = Math.round((this.fpsCounter * 1000) / (currentTime - this.fpsLastTime));
      this.fpsCounter = 0;
      this.fpsLastTime = currentTime;
    }

    fpsValue.textContent = this.currentFPS.toString();
    fpsValue.style.color = this.currentFPS < 30 ? '#ff4444' : CONFIG.HUD.PRIMARY_COLOR;
  }

  /**
   * Updates the character state display
   */
  private static updateState(): void {
    const stateValue = this.hudValueElements.get('state');
    if (!stateValue || !this.characterController) return;

    const state = this.characterController.getCurrentState();
    stateValue.textContent = state;
    stateValue.style.color = this.getStateColor(state);
  }

  /**
   * Updates the boost status display
   */
  private static updateBoostStatus(): void {
    const element = this.hudElements.get('boost');
    const boostValue = this.hudValueElements.get('boost');
    if (!element || !boostValue || !this.characterController) return;

    const isBoosting = this.characterController.isBoosting();
    if (isBoosting) {
      boostValue.textContent = 'ACTIVE';
      boostValue.style.color = '#44ff44';
      element.classList.add('hud-boost-active');
    } else {
      boostValue.textContent = 'Inactive';
      boostValue.style.color = '#ff4444';
      element.classList.remove('hud-boost-active');
    }
  }

  /**
   * Updates the credits display
   */
  private static updateCredits(): void {
    const creditsValue = this.hudValueElements.get('credits');
    if (!creditsValue) return;

    // Get credits from CollectiblesManager
    const credits = CollectiblesManager.getTotalCredits();
    creditsValue.textContent = credits.toString();
  }

  /**
   * Sets the visibility of a HUD element
   */
  private static setElementVisibility(elementId: string, visible: boolean): void {
    const element = this.hudElements.get(elementId);
    if (!element) {
      return;
    }

    const currentVisibility = this.elementVisibility.get(elementId);
    if (currentVisibility === visible) {
      return;
    }

    this.elementVisibility.set(elementId, visible);

    if (visible) {
      element.style.display = 'block';
      // Mark element as faded in after animation completes so it doesn't re-trigger
      if (!element.classList.contains('faded-in')) {
        const handleAnimationEnd = () => {
          if (element) {
            element.classList.add('faded-in');
          }
          element.removeEventListener('animationend', handleAnimationEnd);
        };
        element.addEventListener('animationend', handleAnimationEnd, { once: true });
      }
      return;
    }

    element.style.display = 'none';
  }

  /**
   * Triggers fade-in animation for all visible HUD elements
   * Called when the HUD container is toggled back on
   */
  public static triggerFadeIn(): void {
    this.hudElements.forEach((element) => {
      if (element.style.display !== 'none') {
        // Remove faded-in class to allow fadeIn animation to run again
        element.classList.remove('faded-in');
        // The CSS class will automatically trigger the fadeIn animation
        const handleAnimationEnd = () => {
          if (element) {
            element.classList.add('faded-in');
          }
          element.removeEventListener('animationend', handleAnimationEnd);
        };
        element.addEventListener('animationend', handleAnimationEnd, { once: true });
      }
    });
  }

  /**
   * Gets the color for a character state
   */
  private static getStateColor(state: string): string {
    switch (state.toLowerCase()) {
      case 'idle':
        return CONFIG.HUD.SECONDARY_COLOR;
      case 'walking':
        return '#4488ff';
      case 'running':
        return '#44ff88';
      case 'jumping':
        return '#ffaa44';
      case 'falling':
        return '#ff4444';
      default:
        return CONFIG.HUD.PRIMARY_COLOR;
    }
  }

  /**
   * Disposes of the HUD
   */
  public static dispose(): void {
    if (this.hudContainer) {
      this.hudContainer.remove();
      this.hudContainer = null;
    }

    this.hudElements.clear();
    this.hudValueElements.clear();
    this.hudBarFills.clear();
    if (this.hungerVignette) {
      this.hungerVignette.remove();
      this.hungerVignette = null;
    }
    this.elementVisibility.clear();
    this.scene = null;
    this.characterController = null;
  }

  /**
   * Global cleanup method to remove all HUD elements from DOM
   */
  public static cleanup(): void {
    // Remove any existing HUD containers
    const existingHUD = document.getElementById('game-hud');
    if (existingHUD) {
      existingHUD.remove();
    }
    const vignette = document.getElementById('circuit-hijack-vignette');
    if (vignette) {
      vignette.remove();
    }

    // Clear any existing HUD styles
    const existingStyles = document.querySelectorAll('style');
    existingStyles.forEach((style) => {
      if (
        style.textContent?.includes('hud-element') ||
        style.textContent?.includes('@keyframes pulse')
      ) {
        style.remove();
      }
    });

    // Reset static properties
    this.hudContainer = null;
    this.hudElements.clear();
    this.hudValueElements.clear();
    this.hudBarFills.clear();
    this.hungerVignette = null;
    this.elementVisibility.clear();
    this.scene = null;
    this.characterController = null;
    this.startTime = 0;
    this.fpsCounter = 0;
    this.fpsLastTime = 0;
    this.currentFPS = 0;
  }
}
