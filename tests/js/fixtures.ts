import { textHash } from "../../src/lib/ids.ts";
import type { ContractView, AccountView } from "../../src/lib/types.ts";
export const S="0x"+"a".repeat(40), B="0x"+"b".repeat(40), X="0x"+"c".repeat(40);
export function record(patch:Partial<ContractView>={}):ContractView {
 return {contract_id:"1".repeat(64),supplier:S,buyer:B,text:"Terms.",text_hash:textHash("Terms."),outcome:"ENTIRE",shape:"WHOLE",state:"PROPOSED",part_count:3,price:"100",next_index:1,owed:"0",unwound:"0",
 instalments:Array.from({length:3},(_,i)=>({index:i+1,state:"PENDING",reject_note:"",contest_note:"",stake:"0"})),...patch};
}
export const account=(wallet:string,patch:Partial<AccountView>={}):AccountView=>({wallet,receivable:"0",payable:"0",unwound_as_supplier:"0",unwound_as_buyer:"0",disputed:"0",contracts:0,...patch});
