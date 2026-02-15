let multiavatarFn: ((seed: string, sansEnv?: boolean) => string) | null = null;

const loadMultiavatar = async () => {
  if (multiavatarFn) return multiavatarFn;
  const mod = await import("@multiavatar/multiavatar/esm");
  multiavatarFn = mod.default;
  return multiavatarFn;
};

// Pre-warm the import so subsequent calls are synchronous
void loadMultiavatar();

const svgCache = new Map<string, string>();

export const buildAvatarSvg = (seed: string): string => {
  const trimmed = seed.trim();
  if (!trimmed) {
    throw new Error("Avatar seed is required.");
  }
  const cached = svgCache.get(trimmed);
  if (cached) return cached;
  if (!multiavatarFn) {
    // Fallback: return a placeholder SVG while the module loads
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#888"/></svg>`;
  }
  const svg = multiavatarFn(trimmed, true);
  svgCache.set(trimmed, svg);
  return svg;
};

export const buildAvatarDataUrl = (seed: string): string => {
  const svg = buildAvatarSvg(seed);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Ensures multiavatar module is loaded. Call this early (e.g. on connection)
 * so that subsequent synchronous buildAvatarSvg calls have the module ready.
 */
export const ensureMultiavatarLoaded = (): Promise<void> =>
  loadMultiavatar().then(() => {});
