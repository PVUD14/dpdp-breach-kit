# Public release and hosting decision

24 October 2026 · issue #6 · status: prepared for review, not deployed.

## Decision

Provide source under the existing Apache-2.0 licence and a free static GitHub Pages practice
demo. The owner requested public release preparation. This does not remove the one-approval
review requirement in CONTRIBUTING.md or imply legal/accessibility sign-off.

Expected URL: https://pvud14.github.io/dpdp-breach-kit/.

The public repository is verified public. Its main-branch CI run
[39946544763](https://github.com/PVUD14/dpdp-breach-kit/actions/runs/39946544763) passed all
three jobs, including the Linux privacy browser test. That test is now blocking rather than
`continue-on-error`. Current release changes still require their own CI pass.

## Tradeoffs and limits

- Visitors can try fictional scenarios without installing development tools.
- The hosted app loads assets from GitHub Pages. It does not transmit incident answers or use
  browser storage. Host access logs and normal request metadata are outside these app checks.
- A meta CSP cannot enforce `frame-ancestors`; this Pages setup does not configure custom
  response security headers. Clickjacking protection is therefore not claimed. A host that
  supports response headers is preferable if that control is required.
- Public availability is not government endorsement, legal validation or filing readiness.
- Exported JSON/TXT files are user-managed, not automatically encrypted or authenticated evidence.
- Published JS/CSS use build hashes. Users may still see an older cached entry page; save JSON
  before reloading. No service worker or offline cache is introduced.
- Only `dist/app` is uploaded. No source PDFs, incident records, PSD, temporary tooling,
  build intermediates or credentials are part of the Pages artifact.

## Activation (maintainer)

1. Review the release PR and obtain one approving review. Confirm ownership/permission for
   the source and supplied branding; do not publish third-party assets without permission.
2. In repository **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
   Keep the `github-pages` environment limited to reviewed main-branch deployment.
3. Merge after required checks succeed. CI checks, browser privacy tests and secret scanning
   run before the Pages artifact is packaged. PRs never deploy.
4. Check the **Deploy public practice demo** job and open its reported URL. A manual run of
   **CI** on main can retry deployment after configuration is corrected.
5. Verify logo, PDF download, six-question flow, JSON export/import and practice at the live
   `/dpdp-breach-kit/` path. Inspect browser requests for unexpected destinations. Confirm HTTPS.
6. Only after that verification, remove “pending first deployment” wording from the README
   and guide. Record deployment URL, commit and results here.

If a release is faulty, revert it through a reviewed PR and let the same checks redeploy.
For urgent exposure, a maintainer can unpublish Pages in Settings while investigating.

## Configuration sources

- [GitHub: custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub: publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Vite: static deployment](https://vite.dev/guide/static-deploy)

The existing relative Vite base is retained so the same static app works locally and in a
repository subdirectory. The browser check exercises the repository prefix before release.
