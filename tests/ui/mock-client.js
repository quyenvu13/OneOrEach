// Browser-test transport only. Never imported into the production app.
import {contractId,textHash} from "/src/lib/ids.ts";
import {expectedAfter,expectedAccounts} from "/src/lib/verify.ts";
const t=window.__mock;
const blank=w=>({wallet:w,receivable:"0",payable:"0",unwound_as_supplier:"0",unwound_as_buyer:"0",disputed:"0",contracts:0});
export async function connectedWallet(){return t.wallet}
export async function requestWallet(){return t.wallet}
export async function ensureStudioNet(){}
export async function getLimits(){return {two_party:{buyer_accepts_text_hash:true},ledger:{accounts_sum_across_contracts:true}}}
export async function getContract(id){return structuredClone(t.records[id]||null)}
export async function getAccount(w){return structuredClone(t.accounts[w]||blank(w))}
export async function waitForVerdict(){return {kind:t.phase,status:t.phase==="success"?"ACCEPTED":"PENDING"}}
export async function sendWrite(me,method,args){
 if(t.rejectSignature)throw Object.assign(new Error("Rejected"),{code:4001});
 t.calls.push({me,method,args:args.map(x=>typeof x==="bigint"?x.toString():x)});
 if(method==="open_contract"){
 if(typeof args[1]!=="bigint"||typeof args[2]!=="bigint")throw Error("Integers not bigint");
 const [buyer,parts,price,text]=args,id=contractId(me,buyer,text);
 t.records[id]={contract_id:id,supplier:me,buyer,text,text_hash:textHash(text),outcome:text.includes("only")?"SEVERABLE":"ENTIRE",shape:text.includes("only")?"SPLIT":"WHOLE",state:"PROPOSED",part_count:Number(parts),price:String(price),next_index:1,owed:"0",unwound:"0",instalments:Array.from({length:Number(parts)},(_,i)=>({index:i+1,state:"PENDING",reject_note:"",contest_note:"",stake:"0"}))};
 }else{
 const [id,index,note]=args,c=t.records[id];
 const pair=expectedAccounts([await getAccount(c.supplier),await getAccount(c.buyer)],c,method,Number(index));
 for(const a of pair)t.accounts[a.wallet]=a;
 t.records[id]=expectedAfter(c,method,Number(index),note||"");
 }return "0x"+String(t.calls.length).padStart(64,"0");
}
