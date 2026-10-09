import { pyContainsToken, pyLen, pyStrip } from "./pytext.ts";
import type { Action, ContractView } from "./types.ts";
export const MAX_TEXT_LENGTH = 140;
export const MAX_NOTE_LENGTH = 60;
export const MAX_PRICE = 1000000000000n;
export const MIN_PARTS = 2;
export const MAX_PARTS = 5;
export const RESERVED_TOKENS = ["<UNTRUSTED_SUPPLY_TERMS_TEXT>", "</UNTRUSTED_SUPPLY_TERMS_TEXT>", "ENTIRE", "SEVERABLE"] as const;
export const REVERTS = {
  invalidWallet: "Invalid wallet address", textEmpty: "Text is empty", textTooLong: "Text is too long",
  noteEmpty: "Note is empty", noteTooLong: "Note is too long", reserved: "Text contains a reserved token",
  unknownContract: "Unknown contract id", partsRange: "The number of instalments is out of range",
  priceRange: "The price is out of range", buyerIsSupplier: "The buyer cannot be the supplier",
  duplicate: "This contract already exists", notBuyer: "Only the named buyer may act on an instalment",
  proposed: "The buyer has not accepted these terms yet", declined: "The buyer declined these terms",
  ended: "The arrangement ended when an instalment was rejected", complete: "Every instalment has already been dealt with",
  order: "Instalments are handled in order", notDelivered: "This instalment has not been delivered yet",
  deliverRole: "Only the supplier may deliver", alreadyDelivered: "This instalment was already delivered",
  termsRole: "Only the named buyer may accept or decline the terms",
  termsState: "These terms are not awaiting acceptance", hashMismatch: "The accepted text does not match these terms",
  notSupplier: "Only the supplier may contest a rejection", noSuchInstalment: "No such instalment",
  notRejected: "This instalment was not rejected", alreadyContested: "This rejection has already been contested",
} as const;
export const SHAPE_LINE: Record<string, string> = {
  WHOLE: "One bargain: rejection unwinds earlier acceptances and releases the rest",
  SPLIT: "Separate bargains: a rejection affects that instalment only",
};
export function normalizeWallet(value: string): {ok:true; wallet:string} | {ok:false; reason:string} {
  const wallet = pyStrip(value).toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(wallet) && !/^0x0{40}$/.test(wallet)
    ? {ok:true, wallet} : {ok:false, reason:REVERTS.invalidWallet};
}
export function noteBlock(note: string): string | null {
  const n = pyStrip(note);
  return !pyLen(n) ? REVERTS.noteEmpty : pyLen(n) > MAX_NOTE_LENGTH ? REVERTS.noteTooLong : null;
}
export type OpenInput = { me:string; buyerWallet:string; partCount:number; price:string; text:string; exists:boolean };
export function openBlock(i: OpenInput): string | null {
  const wallet = normalizeWallet(i.buyerWallet);
  if (!wallet.ok) return wallet.reason;
  const text = pyStrip(i.text);
  if (!pyLen(text)) return REVERTS.textEmpty;
  if (pyLen(text) > MAX_TEXT_LENGTH) return REVERTS.textTooLong;
  if (pyContainsToken(text, RESERVED_TOKENS)) return REVERTS.reserved;
  if (!Number.isInteger(i.partCount) || i.partCount < MIN_PARTS || i.partCount > MAX_PARTS) return REVERTS.partsRange;
  if (!/^\d+$/.test(i.price) || BigInt(i.price) < 1n || BigInt(i.price) > MAX_PRICE) return REVERTS.priceRange;
  if (wallet.wallet === i.me.toLowerCase()) return REVERTS.buyerIsSupplier;
  return i.exists ? REVERTS.duplicate : null;
}
export function runningBlock(c: ContractView): string | null {
  if (c.state === "PROPOSED") return REVERTS.proposed;
  if (c.state === "DECLINED") return REVERTS.declined;
  if (c.state === "ENDED") return REVERTS.ended;
  if (c.state === "COMPLETE") return REVERTS.complete;
  return c.state === "ACTIVE" ? null : "Unsupported contract state; reload before signing.";
}
export function actionBlock(c: ContractView, me: string, action: Action, index: number, note = "", hash = ""): string | null {
  const caller = me.toLowerCase();
  const part = c.instalments.find(p => p.index === index);
  if (action === "accept_terms" || action === "decline_terms") {
    if (caller !== c.buyer.toLowerCase()) return REVERTS.termsRole;
    if (c.state !== "PROPOSED") return REVERTS.termsState;
    if (action === "accept_terms" && pyStrip(hash).toLowerCase().replace(/^0x/, "") !== c.text_hash) return REVERTS.hashMismatch;
    return null;
  }
  if (action === "contest_rejection") {
    if (caller !== c.supplier.toLowerCase()) return REVERTS.notSupplier;
    if (index < 1 || index > c.part_count || !part) return REVERTS.noSuchInstalment;
    if (part.state !== "REJECTED") return REVERTS.notRejected;
    if (part.contest_note) return REVERTS.alreadyContested;
    return noteBlock(note);
  }
  if (action === "deliver_instalment") {
    if (caller !== c.supplier.toLowerCase()) return REVERTS.deliverRole;
  } else if (caller !== c.buyer.toLowerCase()) return REVERTS.notBuyer;
  const stopped = runningBlock(c); if (stopped) return stopped;
  if (index !== c.next_index) return REVERTS.order;
  if (action === "deliver_instalment") return part?.state === "PENDING" ? null : REVERTS.alreadyDelivered;
  if (part?.state !== "DELIVERED") return REVERTS.notDelivered;
  return action === "reject_instalment" ? noteBlock(note) : null;
}
export function rejectScope(c: ContractView, index: number): string {
  if (c.shape === "SPLIT") return `Reject instalment ${index} only. Owed stays ${c.owed} units; other instalments remain independent.`;
  return `Reject instalment ${index}, unwind ${c.owed} owed units from earlier acceptances, and release ${Math.max(0,c.part_count-index)} later instalment(s). This contract ends. Both wallet accounts change.`;
}

