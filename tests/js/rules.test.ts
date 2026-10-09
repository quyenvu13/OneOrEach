import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {actionBlock,normalizeWallet,openBlock,noteBlock,REVERTS,rejectScope} from "../../src/lib/rules.ts";
import {record,S,B,X} from "./fixtures.ts";
test("UI reverts exactly match uploaded contract",()=>{
 const src=readFileSync(new URL("../../contracts/InstalmentAccord.py",import.meta.url),"utf8");
 const expected=[...new Set([...src.matchAll(/UserError\(\s*"([^"]+)"\s*\)/g)].map(m=>m[1]))].sort();
 assert.deepEqual([...new Set(Object.values(REVERTS))].sort(),expected);
});
test("open guard checks wallet, normalized limits, integers, self and duplicate",()=>{
 const v={me:S,buyerWallet:B,partCount:3,price:"100",text:"Terms.",exists:false};
 assert.equal(openBlock(v),null);
 for(const [patch,error] of [
 [{buyerWallet:"bad"},REVERTS.invalidWallet],[{text:" \u0085"},REVERTS.textEmpty],
 [{text:"x".repeat(141)},REVERTS.textTooLong],[{text:"entire"},REVERTS.reserved],
 [{partCount:1},REVERTS.partsRange],[{partCount:2.5},REVERTS.partsRange],
 [{price:"0"},REVERTS.priceRange],[{price:"1000000000001"},REVERTS.priceRange],
 [{price:"1e3"},REVERTS.priceRange],[{price:"1.1"},REVERTS.priceRange],
 [{buyerWallet:S},REVERTS.buyerIsSupplier],[{exists:true},REVERTS.duplicate]
 ] as const) assert.equal(openBlock({...v,...patch}),error);
 assert.equal(openBlock({...v,price:"1000000000000",text:"x".repeat(140),partCount:5}),null);
 assert.equal(normalizeWallet("0x"+"0".repeat(40)).ok,false);
});
test("buyer consent is role, state and exact normalized text hash gated",()=>{
 const c=record();
 assert.equal(actionBlock(c,S,"accept_terms",0,"",c.text_hash),REVERTS.termsRole);
 assert.equal(actionBlock(c,B,"accept_terms",0,"","0".repeat(64)),REVERTS.hashMismatch);
 assert.equal(actionBlock(c,B,"accept_terms",0,"","0x"+c.text_hash.toUpperCase()),null);
 assert.equal(actionBlock(c,B,"decline_terms",0),null);
 assert.equal(actionBlock({...c,state:"ACTIVE"},B,"accept_terms",0,"",c.text_hash),REVERTS.termsState);
});
test("supplier delivery precedes buyer decision; stranger and turn guards",()=>{
 let c=record();
 assert.equal(actionBlock(c,S,"deliver_instalment",1),REVERTS.proposed);
 c.state="ACTIVE";
 assert.equal(actionBlock(c,B,"deliver_instalment",1),REVERTS.deliverRole);
 assert.equal(actionBlock(c,B,"accept_instalment",1),REVERTS.notDelivered);
 assert.equal(actionBlock(c,B,"reject_instalment",1,""),REVERTS.notDelivered);
 assert.equal(actionBlock(c,X,"reject_instalment",1,""),REVERTS.notBuyer);
 assert.equal(actionBlock(c,S,"deliver_instalment",2),REVERTS.order);
 assert.equal(actionBlock(c,S,"deliver_instalment",1),null);
 c.instalments[0].state="DELIVERED";
 assert.equal(actionBlock(c,S,"deliver_instalment",1),REVERTS.alreadyDelivered);
 assert.equal(actionBlock(c,B,"accept_instalment",1),null);
 assert.equal(actionBlock(c,B,"reject_instalment",1," "),REVERTS.noteEmpty);
 assert.equal(actionBlock(c,B,"reject_instalment",1,"Damaged"),null);
});
test("ended, declined and completed writes blocked; contest remains possible",()=>{
 const c=record({state:"ENDED"}); c.instalments[0].state="REJECTED";
 assert.equal(actionBlock(c,B,"accept_instalment",1),REVERTS.ended);
 assert.equal(actionBlock({...c,state:"DECLINED"},S,"deliver_instalment",1),REVERTS.declined);
 assert.equal(actionBlock({...c,state:"COMPLETE"},B,"accept_instalment",1),REVERTS.complete);
 assert.equal(actionBlock(c,B,"contest_rejection",1,"note"),REVERTS.notSupplier);
 assert.equal(actionBlock(c,S,"contest_rejection",4,"note"),REVERTS.noSuchInstalment);
 assert.equal(actionBlock(c,S,"contest_rejection",2,"note"),REVERTS.notRejected);
 assert.equal(actionBlock(c,S,"contest_rejection",1,"note"),null);
 c.instalments[0].contest_note="existing";
 assert.equal(actionBlock(c,S,"contest_rejection",1,""),REVERTS.alreadyContested);
});
test("note length uses Python codepoints; WHOLE scope names ledger unwind",()=>{
 assert.equal(noteBlock("📦".repeat(60)),null);
 assert.equal(noteBlock("📦".repeat(61)),REVERTS.noteTooLong);
 assert.match(rejectScope(record({owed:"100"}),2),/unwind 100/);
 assert.match(rejectScope(record({shape:"SPLIT",owed:"100"}),2),/Owed stays 100/);
});
