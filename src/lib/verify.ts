import { pyStrip } from "./pytext.ts";
import { textHash } from "./ids.ts";
import type { Action, ContractView, AccountView } from "./types.ts";
export type OpenSubmission = { me:string; buyerWallet:string; partCount:number; price:string; text:string; contractId:string };
export function openVerified(c: ContractView | null, s: OpenSubmission): boolean {
  return !!c && c.contract_id === s.contractId && c.supplier === s.me.toLowerCase() && c.buyer === s.buyerWallet.toLowerCase()
    && c.text === pyStrip(s.text) && c.text_hash === textHash(s.text) && c.price === BigInt(s.price).toString()
    && c.part_count === s.partCount && c.state === "PROPOSED" && c.next_index === 1 && c.owed === "0" && c.unwound === "0"
    && ((c.shape === "WHOLE" && c.outcome === "ENTIRE") || (c.shape === "SPLIT" && c.outcome === "SEVERABLE"))
    && c.instalments.length === s.partCount && c.instalments.every((p,i) => p.index === i+1 && p.state === "PENDING");
}
export function expectedAfter(before: ContractView, action: Action, index: number, note = ""): ContractView {
  const c: ContractView = structuredClone(before);
  const p = c.instalments.find(p => p.index === index);
  if (action === "accept_terms") c.state = "ACTIVE";
  if (action === "decline_terms") c.state = "DECLINED";
  if (action === "deliver_instalment" && p) p.state = "DELIVERED";
  if (action === "contest_rejection" && p) p.contest_note = pyStrip(note);
  if ((action === "accept_instalment" || action === "reject_instalment") && p) {
    if (action === "accept_instalment") {
      p.state = "ACCEPTED"; c.owed = (BigInt(c.owed)+BigInt(c.price)).toString();
    } else {
      p.state = "REJECTED"; p.reject_note = pyStrip(note);
      let unwind = 0n;
      if (c.shape === "WHOLE") {
        c.instalments.forEach(q => {
          if (q.index > index) q.state = "RELEASED";
          if (q.index < index && q.state === "ACCEPTED") { q.state = "UNWOUND"; unwind += BigInt(c.price); }
        });
        c.owed = (BigInt(c.owed)-unwind).toString();
        c.unwound = (BigInt(c.unwound)+unwind).toString();
        c.state = "ENDED";
      }
      p.stake = (BigInt(c.price)+unwind).toString();
    }
    c.next_index = index+1;
    if (c.state === "ACTIVE" && c.next_index > c.part_count) c.state = "COMPLETE";
  }
  return c;
}
export function actionVerified(before: ContractView, after: ContractView | null, action: Action, index: number, note = ""): boolean {
  if (!after) return false;
  const expected = expectedAfter(before, action, index, note);
  const fields = ["contract_id","supplier","buyer","text","text_hash","outcome","shape","state","part_count","price","next_index","owed","unwound"] as const;
  return fields.every(k => after[k] === expected[k]) && after.instalments.length === expected.instalments.length
    && expected.instalments.every((p,i) => ["index","state","reject_note","contest_note","stake"].every(k => (after.instalments[i] as any)[k] === (p as any)[k]));
}
export function expectedAccounts(before: [AccountView,AccountView], c: ContractView, action: Action, index: number): [AccountView,AccountView] {
  const [s,b] = structuredClone(before);
  const add = (a:AccountView,k: "receivable"|"payable"|"unwound_as_supplier"|"unwound_as_buyer"|"disputed",n:bigint) => a[k]=(BigInt(a[k])+n).toString();
  if (action === "accept_terms") { s.contracts++; b.contracts++; }
  if (action === "accept_instalment") { add(s,"receivable",BigInt(c.price)); add(b,"payable",BigInt(c.price)); }
  if (action === "reject_instalment" && c.shape === "WHOLE") {
    const n=BigInt(c.owed); add(s,"receivable",-n); add(b,"payable",-n); add(s,"unwound_as_supplier",n); add(b,"unwound_as_buyer",n);
  }
  if (action === "contest_rejection") { const n=BigInt(c.instalments.find(p=>p.index===index)?.stake ?? "0"); add(s,"disputed",n); add(b,"disputed",n); }
  return [s,b];
}
export function accountsVerified(expected:[AccountView,AccountView], actual:[AccountView,AccountView]): boolean {
  return expected.every((a,i)=>Object.keys(a).every(k=>(a as any)[k]===(actual[i] as any)[k]));
}

