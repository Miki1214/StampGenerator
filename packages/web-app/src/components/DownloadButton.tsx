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
      className="border border-accent text-accent font-mono text-sm px-6 py-3 rounded hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      Download STL
    </button>
  );
}
