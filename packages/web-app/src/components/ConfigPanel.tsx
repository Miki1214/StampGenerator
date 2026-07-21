import { useState } from "react";
import type { StampOptions } from "@stamp-generator/geometry-core";

export interface ConfigPanelProps {
  value: StampOptions;
  onChange: (next: StampOptions) => void;
}

export function ConfigPanel({ value, onChange }: ConfigPanelProps) {
  const [designHeightDraft, setDesignHeightDraft] = useState(
    String(value.designHeightMm),
  );
  const [designHeightError, setDesignHeightError] = useState<string | null>(
    null,
  );
  const [baseThicknessDraft, setBaseThicknessDraft] = useState(
    String(value.baseThicknessMm),
  );
  const [baseThicknessError, setBaseThicknessError] = useState<string | null>(
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

  function handleBaseThicknessChange(raw: string) {
    setBaseThicknessDraft(raw);
    const next = Number(raw);
    if (!Number.isFinite(next) || next <= 0) {
      setBaseThicknessError("Base thickness must be greater than zero");
      return;
    }
    setBaseThicknessError(null);
    onChange({ ...value, baseThicknessMm: next });
  }

  return (
    <div>
      <label>
        Design height (mm)
        <input
          type="number"
          aria-label="Design height (mm)"
          value={designHeightDraft}
          onChange={(event) => handleDesignHeightChange(event.target.value)}
        />
      </label>
      {designHeightError ? <div role="alert">{designHeightError}</div> : null}

      <label>
        Base thickness (mm)
        <input
          type="number"
          aria-label="Base thickness (mm)"
          value={baseThicknessDraft}
          onChange={(event) => handleBaseThicknessChange(event.target.value)}
        />
      </label>
      {baseThicknessError ? <div role="alert">{baseThicknessError}</div> : null}
    </div>
  );
}
