import {
  STAMP_HARDWARE_FILES,
  setStampHardwareDataProvider,
  type StampHardwarePart,
} from "@stamp-generator/geometry-core";

let hardwareReady: Promise<void> | null = null;

/** Fetch the bundled handle/base STL assets once and register them with geometry-core. */
export function ensureStampHardwareLoaded(): Promise<void> {
  if (!hardwareReady) {
    hardwareReady = (async () => {
      const entries = await Promise.all(
        (Object.keys(STAMP_HARDWARE_FILES) as StampHardwarePart[]).map(
          async (part) => {
            const response = await fetch(`/stls/${STAMP_HARDWARE_FILES[part]}`);
            if (!response.ok) {
              throw new Error(
                `Failed to load stamp hardware ${part}: ${response.status}`,
              );
            }
            const buffer = await response.arrayBuffer();
            return [part, buffer] as const;
          },
        ),
      );
      const buffers = new Map(entries);
      setStampHardwareDataProvider((part) => {
        const buffer = buffers.get(part);
        if (!buffer) {
          throw new Error(`Unknown stamp hardware part: ${part}`);
        }
        return buffer;
      });
    })();
  }
  return hardwareReady;
}
