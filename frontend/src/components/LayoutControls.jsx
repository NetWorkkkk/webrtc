import { LAYOUTS, MAX_TILES_OPTIONS } from "../hooks/useVideoLayout";

export function LayoutControls({ layout, setLayout, maxTiles, setMaxTiles }) {
  return (
    <div className="layout-controls">
      <div className="layout-selector">
        {LAYOUTS.map(({ id, label }) => (
          <button
            key={id}
            className={`layout-btn${layout === id ? " layout-btn--active" : ""}`}
            onClick={() => setLayout(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {layout !== "sidebar" && (
        <select
          className="max-tiles-select"
          value={maxTiles}
          onChange={(e) => setMaxTiles(Number(e.target.value))}
          title="Maximum visible tiles"
        >
          {MAX_TILES_OPTIONS.map((n) => (
            <option key={n} value={n}>Max {n}</option>
          ))}
        </select>
      )}
    </div>
  );
}
