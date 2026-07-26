export function BrandHeader() {
  return (
    <header className="px-6 py-10 sm:px-10 sm:py-12 border-b border-slate/15">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-lightest-slate">
            Stamp Generator
          </h1>
          <p className="mt-3 max-w-xl text-slate leading-relaxed">
            Design a rubber stamp, validate the geometry, and download a
            3D-printable STL — entirely in your browser.
          </p>
        </div>
        <p className="font-mono text-xs text-slate/70 shrink-0">
          Client-side only · No accounts · No persistency
        </p>
      </div>
    </header>
  );
}
