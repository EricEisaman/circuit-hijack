import { ASSETS } from '../config/assets';
import { CONFIG } from '../config/game_config';
import { LOCAL_DEV_DEBUG } from '../config/local_dev';

import type { Environment } from '../types/environment';

/**
 * Environments shown in the settings dropdown. Circuit Hijack mode limits to
 * {@link CONFIG.CIRCUIT_HIJACK.VISIBLE_ENVIRONMENTS} unless `?debug=` is present.
 */
export function getVisibleEnvironments(): readonly Environment[] {
  const filter = CONFIG.CIRCUIT_HIJACK.VISIBLE_ENVIRONMENTS;
  if (!CONFIG.CIRCUIT_HIJACK.ENABLED || !filter) {
    return ASSETS.ENVIRONMENTS;
  }
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const debugActive =
    LOCAL_DEV_DEBUG.enabled &&
    (!LOCAL_DEV_DEBUG.requireDebugParam || params.has(LOCAL_DEV_DEBUG.paramName));
  if (debugActive) {
    return ASSETS.ENVIRONMENTS;
  }
  return ASSETS.ENVIRONMENTS.filter((env) => filter.includes(env.name));
}
