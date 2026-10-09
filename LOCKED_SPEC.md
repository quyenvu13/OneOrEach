# InstalmentAccord — source and integration specification

The supplied `contracts/InstalmentAccord.py` is unchanged. SHA-256:
`b9a10e77a013c1599f0470c90594908064688b7ea5190577d505952d6decb63b`.
Header: GenVM v0.2.16. Contract version: 1.0.0. Frontend release: 2.0.0.

## ABI

| Write | Caller | Effect |
|---|---|---|
| open_contract(buyer_wallet, part_count, price, text) | Supplier | One semantic evaluation; immutable PROPOSED record |
| accept_terms(contract_id_hex, text_hash) | Named buyer | Matching normalized hash; PROPOSED → ACTIVE; both account contract counts +1 |
| decline_terms(contract_id_hex) | Named buyer | PROPOSED → DECLINED |
| deliver_instalment(contract_id_hex, index) | Supplier | Current PENDING → DELIVERED while ACTIVE |
| accept_instalment(contract_id_hex, index) | Buyer | Current DELIVERED → ACCEPTED; owed and account balances +price |
| reject_instalment(contract_id_hex, index, note) | Buyer | Current delivered part rejected; shape controls unwind and release |
| contest_rejection(contract_id_hex, index, note) | Supplier | One contest per rejected part; both accounts' disputed totals +stake |

Integer ABI arguments use JavaScript BigInt. Decimal strings returned for price, owed, unwound and account amounts stay strings until exact BigInt arithmetic.

Views return JSON strings: get_contract(id), get_account(wallet), get_limits(); get_rubric() returns text. Unknown contract ID returns "{}". Accounts for unused wallets return zero counters; transport errors must not be represented as zeros.

## States and ledger

PROPOSED → ACTIVE or DECLINED. ACTIVE → COMPLETE after the last part, or ENDED after a WHOLE rejection.

Parts begin PENDING and must become DELIVERED before the buyer decides.
WHOLE rejection marks earlier ACCEPTED parts UNWOUND, the current part REJECTED and later parts RELEASED. Earlier prices are subtracted from supplier receivable and buyer payable and added to their unwound counters.
SPLIT rejection affects only the current part and advances to the next.
Stake = rejected part price + any amount unwound by that rejection. A contest records this stake as disputed, without restoring debt.

Account totals aggregate across contracts on this deployment. They are accounting units only.

## Identifiers and validation

Normalize terms with Python `" ".join(text.strip().split())`. Length is Unicode codepoints.
ID = Keccak256 of `ONE_OR_EACH:CONTRACT:V2|` + lowercase supplier + "|" + lowercase buyer + "|" + normalized length + "|" + normalized terms.
Terms hash = Keccak256(normalized terms). Price and count are immutable fields associated with the ID, but are not included in that hash or ID.

Parts: 2–5. Price: integer 1–1,000,000,000,000. Terms: stripped length 1–140. Notes: stripped length 1–60. The UI separately guards encoded calldata size.
Reserved tokens are the input fences, ENTIRE and SEVERABLE; see the source for exact checking.

## Verification boundaries

The model runs only in open_contract and sees only the rubric and terms.
Other writes are deterministic.
The UI verifies a successful execution receipt plus the expected accepted contract state and account deltas; Check again retains the original expectations.
Concurrent account changes from another contract may cause conservative verification failure even when a transaction succeeded. Inspect its explorer receipt and fresh account snapshots before taking further action.
Wallet declarations do not prove delivery, identities, or whether rejection is justified.
