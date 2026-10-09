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

## Owner-run signed flow — 2026-10-09

Live demo used: https://one-or-each-m54j.vercel.app

Evidence consists of owner-supplied screenshots and two unmodified dApp exports of accepted-state reads. Both exports have the same deployment, chain 61999, accounts and 13-entry transaction history. The duplicated history is counted once. Consistency checks on both files passed.

The `verifiedTransactions` name is the application's local history label. These exports are not cryptographic attestations. At 2026-10-09T08:06:38.549Z, independent genlayer-js accepted-state reads of both get_contract records and both get_account wallets matched the exported objects field-for-field, including instalments and notes. Explorer receipt verification was unavailable during this documentation update; transaction finality and deployed-source equivalence were not independently established.

| Result | WHOLE | SPLIT |
|---|---|---|
| Model outcome | ENTIRE | SEVERABLE |
| State | ENDED | ACTIVE |
| Instalment 1 | UNWOUND | ACCEPTED |
| Instalment 2 | REJECTED | REJECTED |
| Instalment 3 | RELEASED | PENDING |
| Currently owed | 0 | 100 |
| Unwound | 100 | 0 |
| Rejected instalment stake | 200 | 100 |
| Supplier contest | Goods were correct | Not contested |

Both records have three instalments at 100 units each. The buyer's rejection note is `Damaged shipment`. The supplier contested WHOLE instalment 2. The final supplier receivable and buyer payable are each 100; supplier unwound-as-supplier and buyer unwound-as-buyer are each 100. Both accounts record disputed 200 and two accepted contracts. Contesting does not restore debt.

### Records and original exports

- **WHOLE**: `bf0110832a3b4014b7b9912d300f669da6c24fc4d1077fd63a29a31e3aa83060`
  - Terms: A defect in any one shipment entitles you to refuse the rest.
  - Read at: 2026-10-09T08:03:31.565Z
  - [Original JSON](docs/evidence/oneoreach-bf0110832a3b-snapshot.json); SHA-256 `f94fc9d92b902484214f623c51d7376e6559c0055e5346a506acd2728ec80fec`
- **SPLIT**: `03a22fccbcaccb5c9aceaf86083ab1097a1699931b89f62b280c9409e01b49a5`
  - Terms: A defect in any one shipment entitles you to refuse that shipment only.
  - Read at: 2026-10-09T08:03:55.733Z
  - [Original JSON](docs/evidence/oneoreach-03a22fccbcac-snapshot.json); SHA-256 `c136d2552bea003186e73287fb2f871d2a2cd6189deee1de925a7dd1da2ba68d`

### Transaction references from the exports

Times below are the dApp postcondition-check timestamps (UTC), not block timestamps.

| Checked at (UTC) | Record | Action | Explorer |
|---|---|---|---|
| 2026-10-09T07:36:35.538Z | WHOLE | Propose supply terms | [0xed861c2ccddfc78badfab447574fa3da0237eb5101db29a67415eb6e39ace3f6](https://explorer-studio.genlayer.com/tx/0xed861c2ccddfc78badfab447574fa3da0237eb5101db29a67415eb6e39ace3f6) |
| 2026-10-09T07:38:49.398Z | SPLIT | Propose supply terms | [0x66737efa1259e5238b3887ccf7dd52d5959a0fb716ce99f293cc581446b3a1ed](https://explorer-studio.genlayer.com/tx/0x66737efa1259e5238b3887ccf7dd52d5959a0fb716ce99f293cc581446b3a1ed) |
| 2026-10-09T07:40:22.915Z | SPLIT | accept terms | [0x3ade38c7696124d23da7d350d65c20419db1d8e9fc5ac4452621ee605271c855](https://explorer-studio.genlayer.com/tx/0x3ade38c7696124d23da7d350d65c20419db1d8e9fc5ac4452621ee605271c855) |
| 2026-10-09T07:41:23.996Z | WHOLE | accept terms | [0xb87ed7f44be62658f1f5c288051648d987eb0f41d7b0d585cd808adf16dd1b74](https://explorer-studio.genlayer.com/tx/0xb87ed7f44be62658f1f5c288051648d987eb0f41d7b0d585cd808adf16dd1b74) |
| 2026-10-09T07:43:50.710Z | WHOLE | deliver instalment | [0x34ffe96a3b56091c5c01b9be5b1155dd81323d09d636a3e0163fb6587b1a9c09](https://explorer-studio.genlayer.com/tx/0x34ffe96a3b56091c5c01b9be5b1155dd81323d09d636a3e0163fb6587b1a9c09) |
| 2026-10-09T07:45:21.282Z | SPLIT | deliver instalment | [0x46841b0f19bfcb3930bbd13f56ba0e8f103d5e498738d7cf509131589c732038](https://explorer-studio.genlayer.com/tx/0x46841b0f19bfcb3930bbd13f56ba0e8f103d5e498738d7cf509131589c732038) |
| 2026-10-09T07:47:25.789Z | WHOLE | accept instalment | [0x1a9c729de5e8eeef6d5ab1b57814f302af84b6eca23754ae8967ae183915232b](https://explorer-studio.genlayer.com/tx/0x1a9c729de5e8eeef6d5ab1b57814f302af84b6eca23754ae8967ae183915232b) |
| 2026-10-09T07:51:04.858Z | SPLIT | accept instalment | [0x468b8aa6cb6d5d3032aed26672bd1e958a34462e4f2fb843e85bb655f2b5a1a4](https://explorer-studio.genlayer.com/tx/0x468b8aa6cb6d5d3032aed26672bd1e958a34462e4f2fb843e85bb655f2b5a1a4) |
| 2026-10-09T07:53:05.780Z | SPLIT | deliver instalment | [0x941a9826ef0320783ce1818d6d2ed722bfcb8d0b1d572fe92ff33154c827e634](https://explorer-studio.genlayer.com/tx/0x941a9826ef0320783ce1818d6d2ed722bfcb8d0b1d572fe92ff33154c827e634) |
| 2026-10-09T07:54:11.837Z | WHOLE | deliver instalment | [0x7c77c9495c7c4bb60aa1373fde8597ea443f6becb896b55eba65c5820420fc79](https://explorer-studio.genlayer.com/tx/0x7c77c9495c7c4bb60aa1373fde8597ea443f6becb896b55eba65c5820420fc79) |
| 2026-10-09T07:56:59.678Z | WHOLE | reject instalment | [0x2580b14c8e4b583347c0310fcbdf032236015989340c96e108899c46b84138e2](https://explorer-studio.genlayer.com/tx/0x2580b14c8e4b583347c0310fcbdf032236015989340c96e108899c46b84138e2) |
| 2026-10-09T07:59:32.726Z | SPLIT | reject instalment | [0x4fb121800df14900851b24801f3ba24ab79fb4fc7054a499c6b584145b219ff4](https://explorer-studio.genlayer.com/tx/0x4fb121800df14900851b24801f3ba24ab79fb4fc7054a499c6b584145b219ff4) |
| 2026-10-09T08:01:35.264Z | WHOLE | contest rejection | [0xbe34bf12660e58fc8262221dba2f0e669b7f56a2c38b42661c113262b6efc6fa](https://explorer-studio.genlayer.com/tx/0xbe34bf12660e58fc8262221dba2f0e669b7f56a2c38b42661c113262b6efc6fa) |

### Scope

This run covers two proposals, two buyer consents, delivery and acceptance of instalment 1 in both records, delivery and rejection of instalment 2 in both records, and one supplier contest. Earlier screenshots show combined receivable/payable at 200 after both first instalments were accepted, and 100 after WHOLE unwind.

It does not establish general model accuracy, independent physical delivery, distinct human ownership of the wallets, cash settlement or dispute resolution. Decline, unauthorized writes, repeated contest and completion of instalment 3 were not manually exercised in this run; deterministic automated coverage is described separately in TESTING.md.
