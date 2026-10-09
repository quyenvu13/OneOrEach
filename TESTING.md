# Testing status

Checks below were executed during preparation. Mocked model and browser tests are not live consensus evidence.

| Check | Result | Scope |
|---|---|---|
| Direct Mode, GenVM v0.2.16 | 16 passed | Executed 2026-10-07 against unchanged supplied source; model replies mocked |
| Frontend logic | 38 passed | npm test; receipts, guards, account deltas, source hash and Python whitespace parity |
| Production build | PASS | TypeScript and Vite |
| Source fingerprint | PASS | Supplied file preserved |
| Contract lint | PASS (3 checks) | genvm-linter 0.11.0 AST lint, 2026-10-07 |
| Semantic case/rubric gate | PASS | Token/bigram leakage and overlap checks, not semantic accuracy |
| Calldata | PASS | 17 required rows fit the retained 255-byte UI safety cap |
| Browser integration | NOT RUN successfully | Chromium cannot launch in this execution environment; test script included, no UI PASS claimed |
| StudioNet reads | PASS, 2026-10-07 | get_limits and both test-wallet accounts |
| StudioNet signed flow | NOT RUN in this preparation | Owner signatures required; see TEST_PLAN |

## Reproduce

Node 22+:
```sh
npm ci
npm test
npm run build
npm run verify:source
npm run calldata
```

Python 3.12+, Node available for cross-language ID tests:
```sh
python3 -m pip install genlayer-test==0.29.2 genvm-linter==0.11.0 pytest==9.1.1 pycryptodome
python3 -m pytest tests/contract -q -p no:cacheprovider
python3 -m genvm_linter.cli lint contracts/InstalmentAccord.py
python3 DIVISIBILITY_KILLSET_CHECK.py contracts/InstalmentAccord.py
```

Direct Mode pins SDK v0.2.16. The first run downloads its SDK unless cached. No node, wallet key or live model is used.

Optional browser integration: install Playwright 1.51.1 and its Chromium browser, start Vite at port 5174, then run `node tests/ui/smoke.cjs`. It intercepts only the test page's RPC module. No mock is imported into production. The browser package downloaded during preparation, but Chromium exited at launch before any UI assertion ran.

Optional read-only RPC decoding probe:
```sh
npm run probe:calldata -- 0xf6e30eF23D3e4ff9ca238b38bba5d4082edA0583
```
It passes only when the exact expected deterministic revert is observed. Network errors are UNCONFIRMED, never PASS. This probe is not reported as executed here.

## Important coverage

- Proposal alone does not create debt; only named buyer can accept the matching hash.
- Supplier delivery required; wrong roles and out-of-order actions rejected.
- WHOLE unwinds earlier amounts and ends; SPLIT preserves them and can complete.
- Multiple contracts share account totals; one unwind cannot erase another contract's debt.
- Supplier contest adds stake to both accounts once, without restoring debt.
- Independent Keccak and frontend IDs match contract helpers, including Unicode whitespace.
- Pending/missing receipts are not success. Provisional rollback remains pending.
- Postconditions check precise contract fields, each part, and both account totals.

## Limits

The deterministic source tests mock model answers. They do not establish live label accuracy, injection resistance, physical delivery, identity, legal effect or payment.
The client retains an existing 255-byte compatibility cap: a max ASCII proposal is 227 bytes; accept_terms 164; delivery 106; acceptance 105; rejection/contest with a 60-character ASCII note 167. A 140-emoji proposal is 649 bytes and is blocked.
The exported snapshot is a local copy of accepted-state reads, not an independent cryptographic attestation. Its transaction links must be inspected.
