# Runtime evidence — current Project deployment

Address: [0xf6e30eF23D3e4ff9ca238b38bba5d4082edA0583](https://explorer-studio.genlayer.com/address/0xf6e30eF23D3e4ff9ca238b38bba5d4082edA0583)

## Observed read-only checks

At 2026-10-07T14:09:03.420Z, a genlayer-js 1.1.8 client read accepted state through StudioNet:

- get_limits returned InstalmentAccord, version 1.0.0.
- Buyer hash acceptance, supplier delivery before buyer decisions, and supplier contest were enabled.
- Ledger capabilities included price booking, WHOLE unwind, cross-contract account totals and disputed stakes.
- Maximum price: 1000000000000; parts 2–5; terms 140 and note 60 codepoints.
- Rubric hash: `4bc0971a4e1f990bdc56a0827e57616f1f26a4e752c2f7af3b0a952fbfb2b162`.
- Both supplied test-wallet accounts returned 0 contracts and zero receivable, payable, unwound and disputed counters.

Supplier wallet: `0x923a09d0D6e5C242e36C3c1D2071835917cC0bDF`
Buyer wallet: `0x10AaA763DB250e4856210Dfb91B57780F60e9879`

These observations establish accessible views at that time. They do not prove the full deployed source fingerprint or a signed end-to-end transaction flow. Later account values may differ.

## Signed evidence still to add

No signed write is claimed for this deployment in this release preparation.

Follow TEST_PLAN, then append the actual WHOLE/SPLIT IDs, proposal/consent/delivery/acceptance/rejection/contest transaction links, observed balances, and fresh exported snapshots.

Old Divisibility deployments, transaction hashes and UI screenshots were excluded from this revision's evidence.
