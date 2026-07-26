import { triggerDownload } from "../lib/trigger-download";
import type { PipelineState } from "../hooks/useStampPipeline";

export type { PipelineState };

export interface DownloadButtonProps {
  state: PipelineState;
  onDownload: () => Uint8Array | Promise<Uint8Array | null> | null;
  disabled?: boolean;
}

export function DownloadButton({
  state,
  onDownload,
  disabled: disabledOverride,
}: DownloadButtonProps) {
  const disabled = disabledOverride ?? state.status !== "ready";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void Promise.resolve(onDownload()).then((bytes) => {
          if (!bytes || bytes.length === 0) {
            return;
          }
          triggerDownload(bytes, "stamp.stl");
        });
      }}
      className="border border-accent text-accent font-mono text-sm px-6 py-3 rounded hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      Download STL
    </button>
  );
}
