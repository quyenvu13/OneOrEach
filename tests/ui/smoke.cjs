// UI integration only. RPC and wallet are MOCKS; no on-chain writes.
// Start Vite on port 5174, then run with Playwright available.
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 const S="0x"+"a".repeat(40), B="0x"+"b".repeat(40);
 await page.addInitScript(({S})=>{
  window.__listeners={};window.ethereum={on:(n,f)=>window.__listeners[n]=f,removeListener:()=>{}};
  window.__mock={wallet:S,calls:[],records:{},accounts:{},phase:"success",rejectSignature:false};
 },{S});
 await page.route("**/src/lib/genlayer.ts*",async route=>route.fulfill({contentType:"application/javascript",body:fs.readFileSync("tests/ui/mock-client.js","utf8")}));
 await page.goto("http://127.0.0.1:5174");
 await page.getByText("InstalmentAccord v1.0 · accepted reads").waitFor();
 await page.getByLabel("Buyer wallet",{exact:true}).fill(B);
 await page.getByLabel("Supply terms").fill("A defect in any one shipment entitles you to refuse the rest.");
 await page.getByRole("button",{name:"Propose terms",exact:true}).last().click();
 await page.getByText("Propose supply terms: receipt and accepted state verified.").waitFor();
 assert(await page.getByRole("button",{name:"Accept these terms",exact:true}).isDisabled());
 const switchTo=async wallet=>page.evaluate(wallet=>{window.__mock.wallet=wallet;window.__listeners.accountsChanged([wallet]);},wallet);
 await switchTo(B);
 await page.getByRole("checkbox").check();
 await page.getByRole("button",{name:"Accept these terms",exact:true}).click();
 await page.getByText("accept terms: receipt and accepted state verified.").waitFor();
 assert(await page.getByRole("button",{name:"Accept instalment",exact:true}).isDisabled());
 for(const n of [1,2]){
  await switchTo(S);
  await page.getByRole("button",{name:"Mark delivered",exact:true}).click();
  await page.getByText("deliver instalment: receipt and accepted state verified.").waitFor();
  await switchTo(B);
  if(n===1){
   await page.getByRole("button",{name:"Accept instalment",exact:true}).click();
   await page.getByText("accept instalment: receipt and accepted state verified.").waitFor();
  }
 }
 await page.getByLabel("Rejection note").fill("Damaged");
 await page.getByRole("button",{name:"Review rejection…",exact:true}).click();
 await page.getByRole("dialog").waitFor();
 assert((await page.getByRole("dialog").innerText()).includes("unwind 100"));
 await page.getByRole("button",{name:"Confirm rejection",exact:true}).click();
 await page.getByText("reject instalment: receipt and accepted state verified.").waitFor();
 assert.equal(await page.locator(".tile-unwound").count(),1);
 await switchTo(S);
 await page.getByLabel("Supplier response").fill("Goods were correct");
 await page.getByRole("button",{name:"Contest rejection",exact:true}).click();
 await page.getByText("contest rejection: receipt and accepted state verified.").waitFor();
 const data=await page.evaluate(()=>window.__mock);
 const first=Object.values(data.records)[0];
 assert.equal(first.owed,"0");assert.equal(first.unwound,"100");assert.equal(first.state,"ENDED");
 assert.equal(data.accounts[S].disputed,"200");assert.equal(data.accounts[B].disputed,"200");
 fs.mkdirSync("artifacts/ui",{recursive:true});
 await page.screenshot({path:"artifacts/ui/desktop-MOCKED.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:"artifacts/ui/mobile-MOCKED.png",fullPage:true});
 // Pending context retains original postconditions; retry never signs again.
 await page.getByRole("button",{name:"Propose terms",exact:true}).first().click();
 await page.getByLabel("Supply terms").fill("A defect in any one shipment entitles you to refuse that shipment only.");
 await page.evaluate(()=>window.__mock.phase="pending");
 await page.getByRole("button",{name:"Propose terms",exact:true}).last().click();
 await page.getByRole("button",{name:"Check again",exact:true}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith(":pending")))));
 assert(saved?.submission?.text.includes("only"));
 await page.evaluate(()=>window.__mock.phase="success");
 await page.getByRole("button",{name:"Check again",exact:true}).click();
 await page.getByText("Propose supply terms: receipt and accepted state verified.").waitFor();
 assert.equal(await page.evaluate(()=>window.__mock.calls.filter(c=>c.method==="open_contract").length),2);
 const download=page.waitForEvent("download");
 await page.getByRole("button",{name:"Export accepted-state snapshot"}).click();
 assert((await download).suggestedFilename().endsWith("-snapshot.json"));
 assert.deepEqual(errors,[]);
 console.log("PASS: mocked browser WHOLE flow, permissions, consent, delivery, unwind, shared dispute ledger, pending retry, snapshot export, desktop/mobile.");
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
