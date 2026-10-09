export const BUYER="0x"+"1".repeat(40), ID="f".repeat(64), NOTE60="n".repeat(60);
export const CASES={
 E1:"The deliveries together make up one single undertaking.",
 E2:"A defect in any one shipment entitles you to refuse the rest.",
 E3:"The instalments stand or fall together.",
 E4:"You need not take part of the order if the whole cannot be supplied.",
 E5:"Rejecting one delivery ends the arrangement for every delivery still to come.",
 S1:"Each delivery is a separate undertaking.",
 S2:"A defect in any one shipment entitles you to refuse that shipment only.",
 S3:"Every instalment stands on its own.",
 S4:"You must take whatever part of the order can be supplied.",
 S5:"Rejecting one delivery has no effect on the deliveries still to come."
};
export function hardBlockRows(){
 const rows=Object.entries(CASES).map(([name,text])=>({name:"open_contract "+name,method:"open_contract",args:[BUYER,3n,100n,text]}));
 rows.push({name:"max ASCII proposal",method:"open_contract",args:[BUYER,5n,1000000000000n,"x".repeat(140)]});
 for(const method of ["accept_terms","decline_terms","deliver_instalment","accept_instalment","reject_instalment","contest_rejection"]){
  const args=method==="accept_terms"?[ID,ID]:method==="decline_terms"?[ID]:method.includes("reject")?[ID,5n,NOTE60]:[ID,5n];
  rows.push({name:method,method,args});
 } return rows;
}
export function measureOnlyRows(){return [
 {name:"140 emoji terms",method:"open_contract",args:[BUYER,5n,1000000000000n,"📦".repeat(140)]},
 {name:"60 emoji note",method:"reject_instalment",args:[ID,5n,"📦".repeat(60)]}
];}
