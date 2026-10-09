# OneOrEach — InstalmentAccord edition

OneOrEach lets a supplier and buyer agree to supply terms, record delivery decisions, and see the resulting balances in a shared on-chain ledger. GenLayer validators classify the terms once: does a rejection affect the whole bargain or only one instalment?

| Item | Value |
|---|---|
| Project deployment | [0xf6e30eF23D3e4ff9ca238b38bba5d4082edA0583](https://explorer-studio.genlayer.com/address/0xf6e30eF23D3e4ff9ca238b38bba5d4082edA0583) |
| Network | StudioNet, chain 61999 |
| Source | `contracts/InstalmentAccord.py`, contract version 1.0.0 |
| Source fingerprint | `SOURCE_SHA256.txt` |
| Existing app URL | https://one-or-each.vercel.app — redeploy this revision before reviewing it |
| Repository | https://github.com/quyenvu13/OneOrEach |

## What changed

The earlier app let one wallet name the buyer and kept consequences within each record. This revision introduces:

- **Buyer consent:** only the named buyer can accept the immutable proposal using its normalized terms hash, or decline it. A proposal alone creates no account balance.
- **Supplier delivery declaration:** the supplier must mark the current instalment delivered before the buyer can accept or reject it.
- **Shared account consequences:** accepting adds the price to the supplier's receivable and buyer's payable across all contracts on this deployment. WHOLE rejection unwinds earlier accepted amounts; SPLIT rejection preserves them.
- **Recorded disputes:** the supplier can contest each rejection once. Both accounts record the disputed stake. Contesting does not restore debt or resolve the dispute.
- **Verifiable UI:** wallet permissions, exact calldata integers, receipt checks, accepted-state postconditions, and an export of fresh contract/account snapshots.

These authenticate wallet actions, not real-world identity or delivery. Ledger units are not money, escrow, collection, or legal enforcement. A person can control both wallets.

## Use

1. Supplier: propose buyer wallet, 2–5 instalments, integer price per instalment and terms (up to 140 characters).
2. Buyer: review text, price, count and WHOLE/SPLIT consequence. Check the acknowledgement and accept, or decline.
3. Supplier: mark the current instalment delivered.
4. Buyer: accept it, or enter a rejection note and review the effect before confirming.
5. Read **Wallet accounts** for cross-contract totals. Use **Export accepted-state snapshot** to save freshly read evidence.

With 3 instalments priced at 100 units, accept #1 then reject #2:

| Result | WHOLE | SPLIT |
|---|---|---|
| Instalments | UNWOUND / REJECTED / RELEASED | ACCEPTED / REJECTED / PENDING |
| Contract | ENDED | ACTIVE |
| Owed | 0 | 100 |
| Unwound | 100 | 0 |
| Rejection stake | 200 | 100 |

## Build and deploy

Node 22+:

```sh
npm ci
npm test
npm run verify:source
npm run calldata
npm run build
npm run dev
```

Vercel: use Vite, build command `npm run build`, output `dist`, and the directory containing `package.json` as Root Directory. Keep `vercel.json`: it proxies the Studio RPC through `/genlayer-rpc`.

Remove an old `VITE_CONTRACT_ADDRESS` environment override or set it to the Project address above, then redeploy. No private key, API secret, or MetaMask seed is needed in Vercel. The default deployment is in `src/lib/config.ts`.

## Limits and evidence

The model sees only the terms text. Its frozen result is ENTIRE → WHOLE or SEVERABLE → SPLIT. Malformed output defaults to ENTIRE; this favors the buyer's ability to reject and can harm the supplier. No classification is a guarantee of correctness.

The same supplier, buyer and normalized text have the same contract ID, even if price or count differs. Terms cannot be reopened under that ID. There is no timeout, settlement, dispute resolution or global administrator.

The app retains a 255-byte calldata compatibility cap, so long multibyte input may be blocked before reaching the contract's character limit. A delayed confirmation is not success or failure; use **Check again**, not another signature.

See `TESTING.md` for executed checks, `TEST_PLAN.md` for the two-wallet walkthrough, `RUNTIME_EVIDENCE.md` for read-only observations and outstanding signed evidence, and `LOCKED_SPEC.md` for the ABI. Old-deployment screenshots and transaction hashes are not evidence for this revision.

License: MIT.
