import type {
  PathShapeSet,
  ValidationIssue,
} from "@stamp-generator/geometry-core";

export type PipelineState =
  | { status: "idle" }
  | { status: "importing" }
  | { status: "validating" }
  | { status: "ready"; shapes: PathShapeSet }
  | { status: "invalid"; issues: ValidationIssue[] };

export interface DownloadButtonProps {
  state: PipelineState;
  onDownload: () => Uint8Array;
}

export function DownloadButton({ state, onDownload }: DownloadButtonProps) {
  const disabled = state.status !== "ready";

  return (
    <button type="button" disabled={disabled} onClick={() => onDownload()}>
      Download STL
    </button>
  );
}
