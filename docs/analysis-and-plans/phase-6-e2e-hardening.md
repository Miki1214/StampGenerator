[< Back to index](index.md)

# Phase 6 - E2E Hardening (Playwright)

## Goal

Add a small number of high-value, full-stack regression tests that exercise
the complete pipeline through the real UI, layered on top of - not
replacing - the unit-level TDD suite from Phases 1-5.

## Scenarios

- [ ] Draw a simple closed shape on the canvas, keep the default
      `designHeightMm`, download an STL, and assert the downloaded file is
      non-empty and starts with a valid 80-byte binary STL header followed by
      a plausible triangle count.
- [ ] Drop a clean sample SVG (a solid letter shape) and download; verify the
      resulting STL's triangle count falls within an expected range for that
      fixture.
- [ ] Drop a deliberately messy SVG fixture (self-intersecting path,
      disjoint fragments) and assert `ValidationMessages` renders the
      expected issue text, and that `DownloadButton` stays disabled.
- [ ] Type text using a bundled font, download, and verify a non-empty,
      valid STL is produced.
- [ ] Adjust `designHeightMm` in `ConfigPanel` and draw a larger design and
      confirm the resulting STL's parsed bounding box changes accordingly
      (parse the downloaded file bytes within the test, reusing the same
      test-only STL reader introduced in
      [Phase 4](phase-4-stl-export.md)).
- [ ] Full round-trip smoke test: draw shape -> configure -> download -> the
      file is accepted without error by the test-only STL reader (basic
      "nothing is corrupted end-to-end" sanity check).

## File layout

```
packages/web-app/e2e/
  playwright.config.ts
  draw-and-download.spec.ts
  drop-clean-svg.spec.ts
  drop-messy-svg.spec.ts
  type-text-and-download.spec.ts
  adjust-config-changes-bbox.spec.ts
  fixtures/
    letter-a.svg
    messy-self-intersecting.svg
    disjoint-fragments.svg
```

## Acceptance criteria

All scenarios above pass in CI on every pull request, and passing is a
required check before a merge to `main` is allowed (branch policy, enforced
in [Phase 7](phase-7-deployment-hardening.md)).

## Risks / edge cases

- Playwright's simulated file-drop events may not perfectly match real
  browser drag-and-drop behavior across browsers - mitigate by also covering
  the file-picker (click-to-browse) path, not drag-and-drop alone.
- Headless browser canvas rendering can differ subtly from a real browser -
  keep `DrawingCanvas` e2e assertions focused on the resulting exported
  geometry/STL output, not pixel-level canvas rendering.
- E2E suite runtime growth over time - keep this list intentionally short
  (high-value scenarios only); push additional coverage down into the unit
  level in Phases 1-5 wherever possible instead of adding more e2e specs.

## Dependencies

- **Depends on**: [Phase 5](phase-5-web-app-ui.md).
- **Blocks**: [Phase 7](phase-7-deployment-hardening.md) (branch policy
  requires these checks to be green).
