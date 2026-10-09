import {abi} from "genlayer-js";
import {hardBlockRows,measureOnlyRows} from "./calldata-rows.mjs";
let failed=0;
for(const [group,rows] of [["REQUIRED",hardBlockRows()],["MEASURE ONLY",measureOnlyRows()]]){
 console.log(group);
 for(const r of rows){
 const enc=abi.calldata.encode(abi.calldata.makeCalldataObject(r.method,r.args));
 const n=(abi.transactions.serialize([enc,false]).length-2)/2;
 console.log(n+" bytes | "+r.name+" | "+(n<=255?"fits":"over UI safety cap"));
 if(group==="REQUIRED"&&n>255)failed++;
 }} process.exitCode=failed?1:0;
