import {test} from "node:test";
import assert from "node:assert/strict";
import {openVerified,expectedAfter,actionVerified,expectedAccounts,accountsVerified} from "../../src/lib/verify.ts";
import {record,account,S,B} from "./fixtures.ts";
test("proposal verification binds buyer, hash, price, parts and classification",()=>{
 const c=record(), s={me:S,buyerWallet:B,partCount:3,price:"100",text:"Terms.",contractId:c.contract_id};
 assert.equal(openVerified(c,s),true);
 for(const patch of [{price:"101"},{text_hash:"wrong"},{buyer:S},{state:"ACTIVE"},{outcome:"SEVERABLE"}])
 assert.equal(openVerified({...c,...patch},s),false);
 assert.equal(openVerified(null,s),false);
});
test("accept consent increments both accounts without booking debt",()=>{
 const c=record(), a=expectedAfter(c,"accept_terms",0);
 assert.equal(actionVerified(c,a,"accept_terms",0),true);
 const pair=expectedAccounts([account(S),account(B)],c,"accept_terms",0);
 assert.equal(pair[0].contracts,1); assert.equal(pair[1].contracts,1); assert.equal(pair[0].receivable,"0");
});
test("delivery and acceptance verify exact notes and accounting",()=>{
 const c=record({state:"ACTIVE"}), d=expectedAfter(c,"deliver_instalment",1);
 assert.equal(d.instalments[0].state,"DELIVERED");
 assert.equal(actionVerified(c,d,"deliver_instalment",1),true);
 const a=expectedAfter(d,"accept_instalment",1);
 assert.equal(a.owed,"100"); assert.equal(a.next_index,2);
 assert.equal(actionVerified(d,{...a,owed:"0"},"accept_instalment",1),false);
 assert.equal(actionVerified(d,a,"accept_instalment",1),true);
});
test("WHOLE rejection unwinds earlier money units and releases later parts",()=>{
 let c=record({state:"ACTIVE"});
 c=expectedAfter(expectedAfter(c,"deliver_instalment",1),"accept_instalment",1);
 c=expectedAfter(c,"deliver_instalment",2);
 const a=expectedAfter(c,"reject_instalment",2," Damaged ");
 assert.deepEqual(a.instalments.map(p=>p.state),["UNWOUND","REJECTED","RELEASED"]);
 assert.equal(a.state,"ENDED"); assert.equal(a.owed,"0"); assert.equal(a.unwound,"100"); assert.equal(a.instalments[1].stake,"200");
 assert.equal(actionVerified(c,a,"reject_instalment",2," Damaged "),true);
 const corrupted=structuredClone(a); corrupted.instalments[0].state="ACCEPTED";
 assert.equal(actionVerified(c,corrupted,"reject_instalment",2,"Damaged"),false);
 const pair=expectedAccounts([account(S,{receivable:"500"}),account(B,{payable:"500"})],c,"reject_instalment",2);
 assert.equal(pair[0].receivable,"400"); assert.equal(pair[1].payable,"400");
 assert.equal(pair[0].unwound_as_supplier,"100"); assert.equal(pair[1].unwound_as_buyer,"100");
});
test("SPLIT rejection preserves earlier debt and contest adds stake only",()=>{
 let c=record({state:"ACTIVE",shape:"SPLIT",outcome:"SEVERABLE"});
 c=expectedAfter(expectedAfter(c,"deliver_instalment",1),"accept_instalment",1);
 c=expectedAfter(c,"deliver_instalment",2);
 const a=expectedAfter(c,"reject_instalment",2,"Damaged");
 assert.equal(a.state,"ACTIVE"); assert.equal(a.owed,"100"); assert.equal(a.unwound,"0");
 assert.equal(a.instalments[1].stake,"100"); assert.equal(a.instalments[2].state,"PENDING");
 const pair=expectedAccounts([account(S,{receivable:"100"}),account(B,{payable:"100"})],a,"contest_rejection",2);
 assert.equal(pair[0].disputed,"100"); assert.equal(pair[1].disputed,"100"); assert.equal(pair[0].receivable,"100");
 assert.equal(accountsVerified(pair,structuredClone(pair)),true);
 const wrong=structuredClone(pair); wrong[1].disputed="0";
 assert.equal(accountsVerified(pair,wrong),false);
});
test("final acceptance completes; resubmission is not verified against old snapshot",()=>{
 const c=record({state:"ACTIVE",next_index:3,owed:"200"});
 c.instalments.forEach((p,i)=>p.state=i<2?"ACCEPTED":"DELIVERED");
 const after=expectedAfter(c,"accept_instalment",3);
 assert.equal(after.state,"COMPLETE"); assert.equal(after.owed,"300");
 assert.equal(actionVerified(c,c,"accept_instalment",3),false);
});
