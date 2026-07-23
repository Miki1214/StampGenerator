export function Sidebar() {
  return (
    <aside className="lg:fixed lg:flex lg:flex-col lg:justify-between lg:w-[min(40%,28rem)] lg:h-screen lg:px-12 lg:py-24 px-6 py-12 bg-navy">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-lightest-slate">
          Stamp Generator
        </h1>
        <p className="mt-4 max-w-xs text-slate leading-relaxed">
          Design a rubber stamp, validate the geometry, and download a
          3D-printable STL — entirely in your browser.
        </p>
        <nav aria-label="Page sections" className="mt-12 hidden lg:block">
          <ol className="space-y-4 font-mono text-sm">
            <li>
              <a
                href="#design"
                className="group inline-flex items-center gap-3 text-slate hover:text-accent transition-colors"
              >
                <span className="text-accent">01.</span>
                <span className="border-b border-transparent group-hover:border-accent pb-0.5">
                  Design
                </span>
              </a>
            </li>
            <li>
              <a
                href="#export"
                className="group inline-flex items-center gap-3 text-slate hover:text-accent transition-colors"
              >
                <span className="text-accent">02.</span>
                <span className="border-b border-transparent group-hover:border-accent pb-0.5">
                  Export
                </span>
              </a>
            </li>
          </ol>
        </nav>
      </div>
      <p className="mt-12 lg:mt-0 font-mono text-xs text-slate/70">
        Client-side only · No accounts · No uploads
      </p>
    </aside>
  );
}
