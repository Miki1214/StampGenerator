import {
  BUNDLED_FONT_FILES,
  type BundledFontId,
  setBundledFontDataProvider,
} from "@stamp-generator/geometry-core";

let fontsReady: Promise<void> | null = null;

/** Fetch bundled TTFs once and register them with geometry-core. */
export function ensureBundledFontsLoaded(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      const entries = await Promise.all(
        (Object.keys(BUNDLED_FONT_FILES) as BundledFontId[]).map(
          async (fontId) => {
            const response = await fetch(`/fonts/${BUNDLED_FONT_FILES[fontId]}`);
            if (!response.ok) {
              throw new Error(
                `Failed to load bundled font ${fontId}: ${response.status}`,
              );
            }
            const buffer = await response.arrayBuffer();
            return [fontId, buffer] as const;
          },
        ),
      );
      const buffers = new Map(entries);
      setBundledFontDataProvider((fontId) => {
        const buffer = buffers.get(fontId);
        if (!buffer) {
          throw new Error(`Unknown bundled font id: ${fontId}`);
        }
        return buffer;
      });
    })();
  }
  return fontsReady;
}
