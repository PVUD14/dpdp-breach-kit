# Official source documents

The source PDFs are **not committed** to the repository (`docs/source/*.pdf` is in `.gitignore`).
Download each file from its official URL into this folder under the file name shown, then run:

```sh
npm run verify:sources
```

It recomputes each file's SHA-256 and compares it with the value below (taken from
[../requirements.md](../requirements.md) §1, which is the record of truth). Exit code 2 with
"sources not downloaded" means one or more files are absent; exit code 1 means a mismatch.

A matching hash shows the file is the same one recorded on the download date. It does not show that
the URL is still the authoritative copy, or that the document has not since been amended.

| File name | Document | Printed identifier | URL | Downloaded (IST) | Pages | SHA-256 |
|---|---|---|---|---|---|---|
| `dpdp_rules_2025.pdf` | Digital Personal Data Protection Rules, 2025 (Hindi pp. 1–23, English pp. 24–41) | G.S.R. 846(E), MeitY Notification, New Delhi, 13th November, 2025; Gazette of India, Extraordinary, Part II—Section 3—Sub-section (i), No. 760, 13 Nov 2025; F. No. AA-11038/1/2025-CLandES | https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf | 2026-10-22 12:13 | 41 | `eabc7d05e013144615d78ddc0e8b9c9aac1920e814f4fad38ce6560951f5aa08` |
| `dpdp_rules_2025_corrigendum.pdf` | Corrigendum to G.S.R. 846(E) | G.S.R. 892(E), New Delhi, 10th December, 2025; Gazette of India, Extraordinary, No. 806, 11 Dec 2025; F. No. AA-11038/8/2025-CL&ES | https://www.meity.gov.in/static/uploads/2025/12/3c7ebbae0e5456f493f486e6845df86b.pdf | 2026-10-22 12:17 | 1 | `8f8d9526b511801889f8ae022b6d7c5db449283e90fe32792e5896314b32f994` |
| `dpdp_act_2023.pdf` | Digital Personal Data Protection Act, 2023 (No. 22 of 2023), as published | Gazette of India, Extraordinary, Part II—Section 1, No. 25, 11 Aug 2023; Act No. 22 of 2023, [11th August, 2023] | https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf | 2026-10-22 12:15 | 21 | `4deb23981d3010c8225a2ff6149e7243dc2268455b299e283afebdd7b72a7d15` |
| `dpdp_act_commencement_gsr843.pdf` | Notification appointing commencement dates for Act provisions | G.S.R. 843(E), New Delhi, 13th November, 2025; Gazette of India, Extraordinary, No. 757, 13 Nov 2025; F. No. AA-11038/1/2025-CL&ES | https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf | 2026-10-22 12:18 | 2 | `6df25cd8c76ac8eb18cae81835d51d51128ffbf2ed13262843395efddf0998e5` |
