import { useState } from "react";
import type { StampOptions } from "@stamp-generator/geometry-core";

export interface ConfigPanelProps {
  value: StampOptions;
  onChange: (next: StampOptions) => void;
}

const inputClassName =
  "mt-1.5 block w-full rounded bg-navy-darkest border border-slate/30 px-3 py-2 text-lightest-slate font-mono text-sm focus:outline-none focus:border-accent transition-colors";

const labelClassName = "block font-mono text-sm text-slate";

export function ConfigPanel({ value, onChange }: ConfigPanelProps) {
  const [designHeightDraft, setDesignHeightDraft] = useState(
    String(value.designHeightMm),
  );
  const [designHeightError, setDesignHeightError] = useState<string | null>(
    null,
  );

  function handleDesignHeightChange(raw: string) {
    setDesignHeightDraft(raw);
    const next = Number(raw);
    if (!Number.isFinite(next) || next < 0) {
      setDesignHeightError("Design height must be greater than zero");
      return;
    }
    setDesignHeightError(null);
    onChange({ ...value, designHeightMm: next });
  }

  return (
    <div className="space-y-5">
      <label className={labelClassName}>
        Design height (mm)
        <input
          type="number"
          aria-label="Design height (mm)"
          value={designHeightDraft}
          onChange={(event) => handleDesignHeightChange(event.target.value)}
          className={inputClassName}
        />
      </label>
      {designHeightError ? (
        <div role="alert" className="text-red-400 text-xs font-mono">
          {designHeightError}
        </div>
      ) : null}

      <p className="font-mono text-xs text-slate leading-relaxed">
        The base and handle are a fixed 3D model: the base is stretched in X/Y
        to fit your design (never smaller than its original size) and the
        handle is joined on top unchanged.
      </p>
    </div>
  );
}
