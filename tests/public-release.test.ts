import { describe, expect, it } from "vitest";
import workflow from "../.github/workflows/ci.yml?raw";
import app from "../src/ui/app.ts?raw";
import readme from "../README.md?raw";
import release from "../docs/PUBLIC-RELEASE.md?raw";

describe("public release packaging", () => {
  it("keeps Pages deployment behind all release checks and on main only", () => {
    expect(workflow).toContain("needs: [build, network-check, secret-scan]");
    expect(workflow).toContain("github.ref == 'refs/heads/main' && github.event_name != 'pull_request'");
    expect(workflow).toContain("path: dist/app");
    expect(workflow).toContain("needs: pages-build");
    expect(workflow).not.toContain("continue-on-error: true");
    expect(workflow).toContain("CHECK_BASE_PATH: /dpdp-breach-kit");
  });

  it("links public assets with portable relative paths and explains its status", () => {
    expect(app).toContain('./brand/breach-guide-logo.png');
    expect(app).toContain('./guide/Breach-Guide-SOP.pdf');
    expect(app).toContain('not a government service');
  });

  it("documents deployment as pending instead of claiming an unverified live site", () => {
    expect(readme).toContain("pending first deployment");
    expect(release).toContain("prepared for review, not deployed");
  });
});
