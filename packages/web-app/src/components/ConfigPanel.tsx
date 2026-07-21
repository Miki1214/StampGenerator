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
    </div>
  );
}
