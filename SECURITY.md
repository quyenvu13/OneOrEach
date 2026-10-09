# Scope and trust boundaries

Wallet signatures authenticate which address called a method. They do not establish a real person, physical delivery, item quality or a justified rejection. One operator may control both parties.

The named buyer must consent before deliveries or debt entries. The supplier must declare delivery before a buyer decision. The contract preserves these role/state checks even if a client bypasses the UI.

The contract holds no funds or goods. Account balances have no external collection mechanism. Contest records a disputed stake without arbitration, restoration, payment or resolution.

The terms hash covers normalized text only. Price, count and parties are immutable fields of the proposal; the UI requires the buyer to review these fields too. Duplicate IDs prevent the same supplier/buyer/text combination being reused with another price or count. Other text or wallets can create new proposals; semantic grinding and Sybil behavior are not eliminated.

Only open_contract uses the model. A fence and reserved-token checks reduce accidental instruction confusion but do not prove prompt-injection resistance. Malformed results default to ENTIRE, which may unwind prior supplier receivables if the buyer rejects.

Accepted reads can lag, and shared accounts can change through another contract. The UI conservatively withholds success on mismatched postconditions. Do not resend a delayed transaction without inspecting its receipt and current state.

No private keys belong in the repository or Vercel. Wallet signing stays in the browser provider.
