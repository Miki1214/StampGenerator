export type InputMode = "draw" | "svg";

export interface InputModeTabsProps {
  active: InputMode;
  onSelect: (mode: InputMode) => void;
}

const TABS: { id: InputMode; label: string; index: string }[] = [
  { id: "draw", label: "Draw", index: "01" },
  { id: "svg", label: "Upload SVG", index: "02" },
];

export function InputModeTabs({ active, onSelect }: InputModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Input mode"
      className="flex flex-wrap gap-1 border-b border-slate/20"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={[
              "font-mono text-sm px-4 py-3 transition-colors border-b-2 -mb-px",
              isActive
                ? "text-accent border-accent"
                : "text-slate border-transparent hover:text-slate-light hover:border-slate/40",
            ].join(" ")}
          >
            <span className="text-accent/80 mr-2">{tab.index}.</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
