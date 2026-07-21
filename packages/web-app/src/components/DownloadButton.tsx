import { triggerDownload } from "../lib/trigger-download";
import type { PipelineState } from "../hooks/useStampPipeline";

export type { PipelineState };

export interface DownloadButtonProps {
  state: PipelineState;
  onDownload: () => Uint8Array;
}

export function DownloadButton({ state, onDownload }: DownloadButtonProps) {
  const disabled = state.status !== "ready";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        const bytes = onDownload();
        triggerDownload(bytes, "stamp.stl");
      }}
    >
      Download STL
    </button>
  );
}
