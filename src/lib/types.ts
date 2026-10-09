export type Instalment = { index: number; state: string; reject_note: string; contest_note: string; stake: string };
export type ContractView = {
  contract_id: string; supplier: string; buyer: string; text: string; text_hash: string;
  outcome: string; shape: string; state: string; part_count: number; price: string;
  next_index: number; owed: string; unwound: string; instalments: Instalment[];
};
export type AccountView = {
  wallet: string; receivable: string; payable: string; unwound_as_supplier: string;
  unwound_as_buyer: string; disputed: string; contracts: number;
};
export type TxPhase = "idle" | "checking" | "signing" | "submitted" | "delayed" | "success" | "error";
export type TxStatus = { phase: TxPhase; message: string; hash?: string };
export type Action = "accept_terms" | "decline_terms" | "deliver_instalment" | "accept_instalment" | "reject_instalment" | "contest_rejection";

