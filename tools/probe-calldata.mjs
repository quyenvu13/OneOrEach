// Optional read-only simulation. No signature, transaction, or model call.
// Only the EXPECTED deterministic revert proves decoding; network errors do not.
import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {hardBlockRows,BUYER} from "./calldata-rows.mjs";
const address=process.argv[2];
if(!/^0x[0-9a-fA-F]{40}$/.test(address||""))throw Error("Pass the deployment address.");
const client=createClient({chain:studionet});
function describe(e){
 const parts=[];const walk=(v,d=0)=>{if(!v||d>8)return;if(typeof v==="string")parts.push(v);
 else if(typeof v==="object")for(const k of ["message","shortMessage","details","cause","data"])walk(v[k],d+1);};walk(e);return parts.join(" | ");
}
let unconfirmed=0;
for(const row of hardBlockRows()){
 const expected=row.method==="open_contract"?"The buyer cannot be the supplier":"Unknown contract id";
 try{await client.simulateWriteContract({address,functionName:row.method,args:row.args,account:{address:BUYER}});
 console.log(row.name+": UNCONFIRMED (unexpected success)");unconfirmed++;
 }catch(e){const t=describe(e);if(t.includes(expected))console.log(row.name+": PASS ("+expected+")");
 else{console.log(row.name+": UNCONFIRMED: "+t.slice(0,400));unconfirmed++;}}
}process.exitCode=unconfirmed?1:0;
