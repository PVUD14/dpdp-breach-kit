# Security policy

## Reporting a vulnerability

Please report security issues privately. Do not open a public issue, pull request or discussion.

- Contact: **[SECURITY CONTACT — to be added by the maintainer]**
- If GitHub private vulnerability reporting is enabled for this repository, you may use
  **Security → Report a vulnerability** instead.

Include what you found, how to reproduce it, and the impact you expect. Do **not** include real
personal data in a report: use synthetic values only.

We aim to acknowledge reports and agree a disclosure timeline with the reporter. Response times are
not yet committed; the maintainer will publish them here.

## Scope

In scope:

- `src/` — the core functions, draft generators and the intake page.
- `index.html`, the Content-Security-Policy, and the build configuration.
- `scripts/` and `.github/workflows/`.

Examples of what we want to hear about:

- Any way the intake page can make a network request, persist data (storage, cookies, service
  workers), or execute injected markup or script.
- An incident file that passes `validateIncident` despite unknown fields or malformed values.
- Anything that makes a draft show content that is not in the incident record.

Out of scope: the accuracy of the legal interpretation in `docs/requirements.md`. Raise those
through the "Rule interpretation" issue template; they are not security issues.

## Supported versions

Only the latest commit on `main` is supported.
