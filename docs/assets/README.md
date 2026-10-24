# Documentation artwork

Screenshots show only the application's fictional sample journey. No real incident records
or personal details are included. The supplied transparent logo is in `public/brand/`.

The visual SOP is built by `scripts/build-sop.py` into `public/guide/Breach-Guide-SOP.pdf`.
The app and its CI do not need Python. For documentation authoring only, install ReportLab
and Pillow in an isolated Python environment, then run:

```sh
python -m pip install reportlab pillow
python scripts/build-sop.py
```

The renderer uses installed Segoe UI fonts on Windows if available. `SOP_FONT_DIR` can select
another directory containing those fonts; otherwise it falls back to standard PDF Helvetica.
No font files are distributed in the repository. Render and inspect every page after changes;
font substitutions can affect line wrapping. Screenshots in `sop/` are source inputs, not
screenshots of real user data. The portable text alternative is `docs/GETTING-STARTED.md`.
