import { useEffect, useRef, useState } from "react";
import { CONTRACT_ADDRESS, EXPLORER_BASE } from "./lib/config";
import { calldataBytes, CALLDATA_LIMIT } from "./lib/calldata";
import { errorMessage } from "./lib/errors";
import { connectedWallet, ensureStudioNet, getContract, getAccount, getLimits, requestWallet, sendWrite, waitForVerdict } from "./lib/genlayer";
import { cleanId, contractId, textHash, short } from "./lib/ids";
import { pyLen, pyStrip } from "./lib/pytext";
import { actionBlock, MAX_TEXT_LENGTH, MAX_NOTE_LENGTH, normalizeWallet, openBlock, rejectScope, SHAPE_LINE } from "./lib/rules";
import { accountsVerified, actionVerified, expectedAccounts, openVerified } from "./lib/verify";
import type { OpenSubmission } from "./lib/verify";
import type { ContractView, AccountView, Action, TxStatus } from "./lib/types";

type Tab = "open" | "manage" | "compare" | "accounts";
type Pending = { hash:string; title:string; id:string; submission?:OpenSubmission; before?:ContractView; action?:Action; index:number; note:string; accounts?:[AccountView,AccountView] };
const STORE = "oneoreach.v2:" + CONTRACT_ADDRESS.toLowerCase();
function readStore<T>(key:string, fallback:T):T { try { return JSON.parse(localStorage.getItem(STORE+key) || "null") ?? fallback; } catch { return fallback; } }
function writeStore(key:string, value:unknown) { try { localStorage.setItem(STORE+key,JSON.stringify(value)); } catch { /* read-only storage */ } }
const validId = (value:string) => /^[0-9a-f]{64}$/.test(cleanId(value));
const unit = (value:string) => BigInt(value).toLocaleString("en-US");
function Strip({c}:{c:ContractView}) { return <ol className="strip" aria-label="Instalments">{c.instalments.map(p=><li key={p.index} className={"tile tile-"+p.state.toLowerCase()}><span>#{p.index}</span><strong>{p.state}</strong></li>)}</ol>; }
function Head({c}:{c:ContractView}) { return <><div className={"shape shape-"+c.shape.toLowerCase()}>{SHAPE_LINE[c.shape]}</div><dl className="facts">{[["Reading",c.outcome],["State",c.state],["Price / instalment",unit(c.price)+" units"],["Currently owed",unit(c.owed)+" units"],["Unwound",unit(c.unwound)+" units"]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></>; }
function AccountCard({a,label}:{a:AccountView;label:string}) { return <article className="pane"><h3>{label}</h3><code>{a.wallet}</code><dl className="ledger">{[["Receivable",a.receivable],["Payable",a.payable],["Unwound as supplier",a.unwound_as_supplier],["Unwound as buyer",a.unwound_as_buyer],["Disputed (not settled)",a.disputed],["Accepted contracts",String(a.contracts)]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{unit(v)}</dd></div>)}</dl></article>; }

export default function App() {
  const [me,setMe]=useState("");
  const [tab,setTab]=useState<Tab>("open");
  const [ready,setReady]=useState(false);
  const [connection,setConnection]=useState("Checking deployment…");
  const [tx,setTx]=useState<TxStatus>({phase:"idle",message:""});
  const [pending,setPending]=useState<Pending|null>(()=>readStore(":pending",null));
  const [recent,setRecent]=useState<string[]>(()=>readStore(":recent",[]));
  const lock=useRef(false);
  const [buyer,setBuyer]=useState("");
  const [parts,setParts]=useState(3);
  const [price,setPrice]=useState("100");
  const [text,setText]=useState("");
  const [idInput,setIdInput]=useState("");
  const [current,setCurrent]=useState<ContractView|null>(null);
  const [accounts,setAccounts]=useState<[AccountView,AccountView]|null>(null);
  const [note,setNote]=useState("");
  const [contestNotes,setContestNotes]=useState<Record<number,string>>({});
  const [termsChecked,setTermsChecked]=useState(false);
  const [confirming,setConfirming]=useState(false);
  const [pairIds,setPairIds]=useState(["",""]);
  const [pair,setPair]=useState<(ContractView|null)[]>([null,null]);
  const [accountInput,setAccountInput]=useState("");
  const [queried,setQueried]=useState<AccountView|null>(null);
  const busy=!!pending || ["checking","signing","submitted"].includes(tx.phase);

  function remember(id:string) { setRecent(old=>{const n=[id,...old.filter(x=>x!==id)].slice(0,10);writeStore(":recent",n);return n;}); }
  function retain(p:Pending|null) { setPending(p);writeStore(":pending",p); }
  function fail(e:unknown) { setTx({phase:"error",message:errorMessage(e)}); }
  async function guarded(f:()=>Promise<void>) { try { await f(); } catch(e) { fail(e); } }
  async function checkDeployment() {
    setReady(false);setConnection("Checking deployment…");
    try {
      const l=await getLimits();
      if (!l.two_party?.buyer_accepts_text_hash || !l.ledger?.accounts_sum_across_contracts) throw new Error("Expected two-party ledger capabilities are missing.");
      setReady(true);setConnection("InstalmentAccord v1.0 · accepted reads");
    } catch(e) { setConnection(errorMessage(e)); }
  }
  useEffect(()=>{
    void checkDeployment();
    connectedWallet().then(setMe).catch(fail);
    const changed=(a:string[])=>{setMe((a?.[0]??"").toLowerCase());setTermsChecked(false);setConfirming(false);};
    const chainChanged=()=>{setTermsChecked(false);void checkDeployment();};
    window.ethereum?.on?.("accountsChanged",changed);
    window.ethereum?.on?.("chainChanged",chainChanged);
    return ()=>{window.ethereum?.removeListener?.("accountsChanged",changed);window.ethereum?.removeListener?.("chainChanged",chainChanged);};
  },[]);
  async function connect() { const w=await requestWallet(); await ensureStudioNet();setMe(w); }
  async function readAccounts(c:ContractView):Promise<[AccountView,AccountView]> { return Promise.all([getAccount(c.supplier),getAccount(c.buyer)]); }
  async function refresh(id:string) {
    setAccounts(null);
    const c=await getContract(id);setCurrent(c);
    setAccounts(c?await readAccounts(c):null);
    return c;
  }
  async function loadById(raw:string) {
    const id=cleanId(raw);if(!validId(id)) throw new Error("Enter a 64-character contract ID.");
    setTermsChecked(false);setConfirming(false);setCurrent(null);setAccounts(null);setIdInput(id);
    const c=await refresh(id);if(!c) throw new Error("No contract with this ID on this deployment.");
    remember(id);setTab("manage");
  }
  async function verifyPending(p:Pending):Promise<boolean> {
    const after=await refresh(p.id);
    if(p.submission) return openVerified(after,p.submission);
    if(!p.before || !p.action || !p.accounts || !after) return false;
    const actual=await readAccounts(after);setAccounts(actual);
    return actionVerified(p.before,after,p.action,p.index,p.note) && accountsVerified(p.accounts,actual);
  }
  async function finish(p:Pending) {
    setTx({phase:"submitted",message:"Checking consensus receipt and accepted-state postconditions…",hash:p.hash});
    const v=await waitForVerdict(p.hash);
    if(v.kind==="error") { retain(null);setTx({phase:"error",message:v.reason,hash:p.hash});return; }
    if(v.kind==="success") {
      for(let i=0;i<3;i++) {
        if(await verifyPending(p)) {
          retain(null);remember(p.id);
          const history=readStore<unknown[]>(":history",[]);
          writeStore(":history",[{hash:p.hash,id:p.id,action:p.title,checkedAt:new Date().toISOString()},...history].slice(0,50));
          setTx({phase:"success",message:p.title+": receipt and accepted state verified.",hash:p.hash});
          return;
        }
        await new Promise(r=>setTimeout(r,1500));
      }
    }
    setTx({phase:"delayed",message:"Not yet verified. Do not resend. Check again preserves the original postconditions, including both account totals.",hash:p.hash});
  }
  async function runWrite(p:Omit<Pending,"hash">,method:string,args:unknown[]) {
    const bytes=calldataBytes(method,args);
    if(bytes>CALLDATA_LIMIT) throw new Error("Calldata exceeds 255 bytes. Shorten the text or note.");
    setTx({phase:"signing",message:p.title+": confirm in your wallet…"});
    const hash=await sendWrite(me,method,args);
    const saved={...p,hash};retain(saved);setIdInput(p.id);setTab("manage");
    try { await finish(saved); } catch(e) { setTx({phase:"delayed",message:"Submitted; verification interrupted: "+errorMessage(e)+". Do not resend.",hash}); }
  }
  async function withLock(f:()=>Promise<void>) {
    if(lock.current || busy) return;
    lock.current=true;
    try { setTx({phase:"checking",message:"Reading current permissions and ledger…"});await f(); }
    catch(e) { fail(e); }
    finally { lock.current=false; }
  }
  const normalizedBuyer=normalizeWallet(buyer);
  const localId=me&&normalizedBuyer.ok&&pyStrip(text)?contractId(me,normalizedBuyer.wallet,text):"";
  const openReason=!ready?"Deployment not verified":!me?"Connect a wallet first":openBlock({me,buyerWallet:buyer,partCount:parts,price,text,exists:false});
  const openArgs=[pyStrip(buyer).toLowerCase(),BigInt(parts),/^\d+$/.test(price)?BigInt(price):0n,pyStrip(text)];
  const openBytes=calldataBytes("open_contract",openArgs);
  async function onOpen() { await withLock(async()=>{
    if(openReason) throw new Error(openReason);
    const exists=!!await getContract(localId);
    const reason=openBlock({me,buyerWallet:buyer,partCount:parts,price,text,exists});
    if(reason) throw new Error(reason);
    const s:OpenSubmission={me,buyerWallet:pyStrip(buyer).toLowerCase(),partCount:parts,price,text,contractId:localId};
    await runWrite({title:"Propose supply terms",id:localId,submission:s,index:0,note:""},"open_contract",openArgs);
  }); }
  async function onAction(action:Action,index:number,n="") { await withLock(async()=>{
    if(!ready || !current) throw new Error("Load a verified deployment and contract first.");
    if(action==="accept_terms" && !termsChecked) throw new Error("Review the terms, price, count and consequence, then check the acknowledgement.");
    const previous=current, fresh=await getContract(current.contract_id);
    if(!fresh) throw new Error("Contract not found.");
    if(JSON.stringify(fresh)!==JSON.stringify(previous)) {setCurrent(fresh);setTermsChecked(false);throw new Error("Contract changed. Review the refreshed state before signing.");}
    const hash=textHash(fresh.text);
    const reason=actionBlock(fresh,me,action,index,n,hash);if(reason) throw new Error(reason);
    const a=await readAccounts(fresh);
    const args:unknown[]=action==="accept_terms"?[fresh.contract_id,hash]:action==="decline_terms"?[fresh.contract_id]:[fresh.contract_id,BigInt(index)];
    if(action==="reject_instalment"||action==="contest_rejection") args.push(pyStrip(n));
    setConfirming(false);
    await runWrite({title:action.replaceAll("_"," "),id:fresh.contract_id,before:fresh,action,index,note:n,accounts:expectedAccounts(a,fresh,action,index)},action,args);
    setTermsChecked(false);
  }); }
  async function checkAgain() { if(!pending || lock.current)return;lock.current=true;try {await finish(pending);}catch(e){setTx({phase:"delayed",message:errorMessage(e),hash:pending.hash});}finally{lock.current=false;} }
  async function loadPair() {
    if(!pairIds.every(validId)) throw new Error("Enter two valid contract IDs.");
    setPair(await Promise.all(pairIds.map(x=>getContract(cleanId(x)))));
  }
  async function readWallet() {
    setQueried(null);
    const w=normalizeWallet(accountInput);if(!w.ok)throw new Error(w.reason);
    setQueried(await getAccount(w.wallet));
  }
  async function exportSnapshot() {
    if(!current) return;
    const latest=await getContract(current.contract_id);
    if(!latest) throw new Error("Contract not found.");
    const ledger=await readAccounts(latest);
    const proof={deployment:CONTRACT_ADDRESS,chainId:61999,readAt:new Date().toISOString(),stateStatus:"accepted",
      contract:latest,accounts:ledger,verifiedTransactions:readStore<unknown[]>(":history",[])};
    const url=URL.createObjectURL(new Blob([JSON.stringify(proof,null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="oneoreach-"+latest.contract_id.slice(0,12)+"-snapshot.json";
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setCurrent(latest);setAccounts(ledger);
  }
  const c=current;
  const role=!c||!me?"viewer":me===c.supplier?"supplier":me===c.buyer?"buyer":"viewer";
  function button(action:Action,index:number,label:string,n="",extra:string|null=null) {
    if(!c)return null;
    const reason=!ready?"Deployment not verified":!me?"Connect a wallet first":actionBlock(c,me,action,index,n,textHash(c.text))||extra;
    const args=action==="accept_terms"?[c.contract_id,textHash(c.text)]:action==="decline_terms"?[c.contract_id]:[c.contract_id,BigInt(index),...(["reject_instalment","contest_rejection"].includes(action)?[pyStrip(n)]:[])];
    const over=calldataBytes(action,args)>CALLDATA_LIMIT;
    return <div className="action-cell"><button className={action.includes("reject")||action==="decline_terms"?"bad":"primary"} disabled={busy||!!reason||over} onClick={()=>action==="reject_instalment"?setConfirming(true):void onAction(action,index,n)}>{label}</button><small className="why">{reason||(over?"Calldata exceeds 255 bytes. Shorten the note.":"")}</small></div>;
  }
  return <div className="shell">
    <header className="bar"><div className="brand"><img src="/logo-192.png" width={42} height={42} alt="OneOrEach logo"/><div><h1>OneOrEach</h1><p>Two-party terms. Delivery decisions. Shared ledger consequences.</p></div></div><div className="who"><button onClick={()=>void guarded(connect)}>{me?short(me)+" · "+role:"Connect MetaMask"}</button><span className="chip">StudioNet 61999</span></div></header>
    <section className="hero"><span className="eyebrow">INSTALMENT ACCORD / V2</span><h2>One rejection.<br/><em>How far does it reach?</em></h2><p>Both wallets take part. The buyer accepts the proposed terms, the supplier marks delivery, and the buyer decides. Each decision updates the shared on-chain ledger.</p><p className="small">Ledger units only — no payments, no escrow, no proof of physical delivery.</p></section>
    <div className={ready?"connection":"warn"}><span>{connection}</span><button onClick={()=>void checkDeployment()}>Check connection</button></div>
    {(tx.phase!=="idle"||pending)&&<section className={"status status-"+(tx.phase==="idle"?"delayed":tx.phase)} role="status"><strong>{tx.phase==="idle"?"Unverified transaction saved":tx.phase}</strong><span>{tx.message||"A previous transaction needs receipt and state verification. Do not resend."}</span>{(tx.hash||pending?.hash)&&<a href={EXPLORER_BASE+"/tx/"+(tx.hash||pending?.hash)} target="_blank" rel="noreferrer"><code>{tx.hash||pending?.hash}</code></a>}{pending&&tx.phase!=="submitted"&&<button onClick={()=>void checkAgain()}>Check again</button>}</section>}
    <nav className="tabs">{(["open","manage","compare","accounts"] as Tab[]).map(t=><button key={t} className={tab===t?"tab on":"tab"} onClick={()=>setTab(t)}>{{open:"Propose terms",manage:"Manage instalments",compare:"Side by side",accounts:"Wallet accounts"}[t]}</button>)}</nav>
    {tab==="open"&&<section className="panel"><h2>Propose a supply contract</h2><p className="muted">The buyer must accept the exact text hash before deliveries or ledger entries can start. Price and count are immutable proposal fields.</p><label>Buyer wallet<input value={buyer} onChange={e=>setBuyer(e.target.value)} placeholder="0x…" spellCheck={false}/></label><div className="grid2"><label>Instalments<select value={parts} onChange={e=>setParts(Number(e.target.value))}>{[2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label><label>Price per instalment (ledger units)<input value={price} inputMode="numeric" onChange={e=>setPrice(e.target.value)} placeholder="100"/></label></div><label>Supply terms<textarea rows={4} value={text} onChange={e=>setText(e.target.value)}/><small>{pyLen(pyStrip(text))}/{MAX_TEXT_LENGTH} characters · {openBytes}/{CALLDATA_LIMIT} calldata bytes</small></label><p className="small muted">ENTIRE and SEVERABLE are reserved output words. The same supplier, buyer and normalized text cannot be proposed again, even with a different price or count.</p>{localId&&<p className="mono-line">New contract ID: <code>{localId}</code></p>}<div className="actions"><button className="primary" disabled={busy||!!openReason||openBytes>CALLDATA_LIMIT} onClick={()=>void onOpen()}>Propose terms</button><span className="why">{openReason||(openBytes>CALLDATA_LIMIT?"Calldata is too long; shorten the text.":"")}</span></div></section>}
    {tab==="manage"&&<section className="panel"><div className="section-head"><h2>Manage instalments</h2>{c&&<button disabled={busy} onClick={()=>void guarded(()=>loadById(c.contract_id))}>Refresh accepted state</button>}</div><div className="row"><input aria-label="Contract ID" value={idInput} onChange={e=>setIdInput(e.target.value)} placeholder="64-character contract ID"/><button disabled={busy} onClick={()=>void guarded(()=>loadById(idInput))}>Load</button></div><div className="recent">{recent.map(id=><button disabled={busy} key={id} className="link" onClick={()=>void guarded(()=>loadById(id))}>{short(id,8,6)}</button>)}</div>
      {c?<div className="contract"><Head c={c}/><blockquote>{c.text}</blockquote><p className="mono-line">ID <code>{c.contract_id}</code></p><div className="grid2"><p>Supplier<br/><code>{c.supplier}</code></p><p>Buyer<br/><code>{c.buyer}</code></p></div><p className="mono-line">Normalized terms hash: <code>{c.text_hash}</code></p><Strip c={c}/>
        {c.state==="PROPOSED"&&<section className="consent"><h3>Buyer approval required</h3><p>Review {c.part_count} instalments × {unit(c.price)} units, the exact text above, and the {c.shape} rejection consequence.</p><label className="check"><input type="checkbox" checked={termsChecked} onChange={e=>setTermsChecked(e.target.checked)}/>I have reviewed this proposal and its ledger consequences.</label><div className="actions">{button("accept_terms",0,"Accept these terms","",termsChecked?null:"Review and check the acknowledgement first.")}{button("decline_terms",0,"Decline terms")}</div></section>}
        <section className="turn"><h3>{c.state==="ACTIVE"?"Current instalment #"+c.next_index:c.state==="PROPOSED"?"Waiting for buyer approval":"Contract "+c.state.toLowerCase()}</h3><div className="actions">{button("deliver_instalment",c.next_index,"Mark delivered")}{button("accept_instalment",c.next_index,"Accept instalment")}</div><label>Rejection note<textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Describe why you reject this delivered instalment"/><small>{pyLen(pyStrip(note))}/{MAX_NOTE_LENGTH} characters</small></label>{button("reject_instalment",c.next_index,"Review rejection…",note)}<p className="muted small">“Delivered” is the supplier's signed declaration, not independently verified delivery.</p></section>
        <ul className="notes">{c.instalments.filter(p=>p.state==="REJECTED").map(p=><li key={p.index}><h3>Instalment #{p.index} · rejected</h3><p>{p.reject_note}</p><p>Dispute stake: {unit(p.stake)} units (rejected price plus any unwound amount).</p>{p.contest_note?<p className="contest">Supplier contested: {p.contest_note}</p>:<><label>Supplier response<input value={contestNotes[p.index]||""} onChange={e=>setContestNotes(old=>({...old,[p.index]:e.target.value}))}/></label>{button("contest_rejection",p.index,"Contest rejection",contestNotes[p.index]||"")}</>}</li>)}</ul>
        <div className="section-head"><h3>Shared wallet accounts</h3><button disabled={busy} onClick={()=>void guarded(exportSnapshot)}>Export accepted-state snapshot</button></div><p className="muted small">Totals across all accepted contracts on this deployment, not just this contract. Disputed units are tracked separately and do not settle the debt.</p>{accounts?<div className="pair"><AccountCard a={accounts[0]} label="Supplier account"/><AccountCard a={accounts[1]} label="Buyer account"/></div>:<p>Account data is unavailable — no zero balance assumed.</p>}
      </div>:<p className="muted">Load a contract ID or propose new terms.</p>}</section>}
    {tab==="compare"&&<section className="panel"><h2>Compare the consequences</h2><p className="muted">Load real WHOLE and SPLIT records. A WHOLE rejection can unwind earlier accepted amounts; a SPLIT rejection preserves them.</p><div className="grid2">{pairIds.map((v,i)=><label key={i}>Contract {i+1}<input value={v} onChange={e=>setPairIds(old=>old.map((x,j)=>i===j?e.target.value:x))}/></label>)}</div><button onClick={()=>void guarded(loadPair)}>Compare accepted state</button><div className="pair">{pair.map((p,i)=><article className="pane" key={i}>{p?<><Head c={p}/><blockquote>{p.text}</blockquote><Strip c={p}/><code>{p.contract_id}</code></>:<p>No contract loaded.</p>}</article>)}</div></section>}
    {tab==="accounts"&&<section className="panel"><h2>Wallet accounts</h2><p className="muted">Read the cumulative ledger for any wallet. These are contract ledger units, not GEN balances or enforceable payment orders.</p><div className="row"><input aria-label="Account wallet" value={accountInput} onChange={e=>setAccountInput(e.target.value)} placeholder="Wallet address"/><button onClick={()=>void guarded(readWallet)}>Read account</button></div>{me&&<button className="link" onClick={()=>setAccountInput(me)}>Use connected wallet</button>}{queried&&<AccountCard a={queried} label="Cross-contract totals"/>}</section>}
    {confirming&&c&&<div className="scrim" role="dialog" aria-modal="true" aria-label="Confirm rejection"><div className="dialog"><h2>Reject instalment {c.next_index}?</h2><p className="scope">{rejectScope(c,c.next_index)}</p><p>Reason: {pyStrip(note)}</p><p>This cannot be undone. A supplier contest records disputed units; it does not restore the debt.</p><div className="actions"><button className="bad" disabled={busy} onClick={()=>void onAction("reject_instalment",c.next_index,note)}>Confirm rejection</button><button onClick={()=>setConfirming(false)}>Cancel</button></div></div></div>}
    <footer className="foot"><a href={EXPLORER_BASE+"/address/"+CONTRACT_ADDRESS} target="_blank" rel="noreferrer"><code>{CONTRACT_ADDRESS}</code></a><p>InstalmentAccord · no funds or goods held · no external truth verification · two wallets do not prove two separate people.</p></footer>
  </div>;
}
