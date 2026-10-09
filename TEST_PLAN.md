# Two-wallet verification — new Project deployment

These are instructions and expected results, not a claim that the transactions have run.

- Supplier: `0x923a09d0D6e5C242e36C3c1D2071835917cC0bDF`
- Buyer: `0x10AaA763DB250e4856210Dfb91B57780F60e9879`
- Deployment: `0xf6e30eF23D3e4ff9ca238b38bba5d4082edA0583`
- Use 3 instalments, price 100 units in each proposal.
- Every signed step must show verified accepted state before continuing. Save transaction links and both IDs. Do not reuse old-deployment IDs.

## 1. Propose two cases as supplier

WHOLE candidate:
```text
A defect in any one shipment entitles you to refuse the rest.
```

SPLIT candidate:
```text
A defect in any one shipment entitles you to refuse that shipment only.
```

Open **Propose terms**, enter buyer, count, price and the first text. Sign, wait, copy its ID. Repeat for the second text.
Check the actual verdicts. If a label differs from the expected WHOLE/SPLIT reading, record the result and stop the comparison; do not claim it passed or silently edit the evidence.

Both records should be PROPOSED and the accounts unchanged.

## 2. Buyer accepts both proposals

Switch MetaMask to the buyer. Open **Manage instalments**, load the first ID, review the exact text, hash, price/count and rejection scope. Tick the acknowledgement and click **Accept these terms**. Sign and wait for ACTIVE.
Repeat with the second ID.
Both accounts should gain 2 accepted contracts, with no debt yet.

## 3. Accept part 1 on both contracts

Switch to supplier, load the WHOLE ID, click **Mark delivered**, sign and wait for DELIVERED. Do the same for part 1 of the SPLIT ID.
Switch to buyer and **Accept instalment** #1 on each contract.
Each contract owes 100; supplier receivable and buyer payable increase by 200 in total.

## 4. Reject part 2 on both contracts

Supplier: mark part 2 delivered on each contract.
Buyer: load WHOLE, enter `Damaged shipment`, click **Review rejection…**. The dialog must show unwind 100 and release 1 later part. Confirm and sign.
WHOLE must become ENDED with UNWOUND / REJECTED / RELEASED, owed 0, unwound 100.
Then load SPLIT, enter the same note and reject part 2. SPLIT must stay ACTIVE with ACCEPTED / REJECTED / PENDING, owed 100, unwound 0.

Across these two records, the account receivable/payable increment is now 100, and the unwound increment is 100. If the wallets already had other records, compare deltas against their starting balances.

## 5. Record a supplier contest

Supplier: load WHOLE, enter `Goods were correct` in **Supplier response**, then **Contest rejection** for part 2.
Both wallets' disputed totals increase by 200. WHOLE stays ENDED and owed remains zero.
A second contest should be disabled. This does not resolve the dispute or prove either statement true.

## 6. Save review evidence

For each ID click **Export accepted-state snapshot**. Save both JSON files and transaction links.
Use **Side by side** to show the two different consequences.
Record data in RUNTIME_EVIDENCE only after checking actual results. A screenshot alone does not prove successful execution.

Wrong role, missing consent, out-of-order delivery, missing delivery, duplicate acceptance, note/input limits and exact ledger rules are already covered by automated source tests; no extra manual signatures are needed for those routine checks.
