"""Direct Mode: uploaded source and real v0.2.16 SDK; model replies are mocked.
These tests do not establish live validator accuracy or on-chain write success.
"""
import json
import re
from pathlib import Path
import pytest
from Crypto.Hash import keccak
from gltest.direct.loader import create_address

SOURCE = str(Path(__file__).resolve().parents[2] / "contracts/InstalmentAccord.py")
WHOLE = "A defect in any one shipment entitles you to refuse the rest."
SPLIT = "A defect in any one shipment entitles you to refuse that shipment only."

def h(text):
    return keccak.new(digest_bits=256, data=text.encode()).hexdigest()

@pytest.fixture
def env(direct_vm, direct_deploy):
    c = direct_deploy(SOURCE, sdk_version="v0.2.16")
    s, b, x = [create_address(n) for n in ("supplier", "buyer", "outsider")]
    direct_vm.mock_llm(re.escape(SPLIT), '{"outcome":"SEVERABLE"}')
    direct_vm.mock_llm(r"(?s).*", '{"outcome":"ENTIRE"}')
    return c, direct_vm, s, b, x

def open_(env, text=WHOLE, price=100, parts=3):
    c, vm, s, b, _ = env
    vm.sender = s
    c.open_contract(str(b), parts, price, text)
    normalized = " ".join(text.strip().split())
    cid = h("ONE_OR_EACH:CONTRACT:V2|" + str(s).lower() + "|" + str(b).lower() + "|" + str(len(normalized)) + "|" + normalized)
    return cid

def read(env, cid):
    return json.loads(env[0].get_contract(cid))

def account(env, wallet):
    return json.loads(env[0].get_account(str(wallet)))

def active(env, text=WHOLE, price=100, parts=3):
    cid = open_(env, text, price, parts)
    c, vm, _, b, _ = env
    vm.sender = b
    c.accept_terms(cid, read(env, cid)["text_hash"])
    return cid

def deliver(env, cid, index):
    c, vm, s, _, _ = env
    vm.sender = s
    c.deliver_instalment(cid, index)

def accept(env, cid, index):
    deliver(env, cid, index)
    c, vm, _, b, _ = env
    vm.sender = b
    c.accept_instalment(cid, index)

def reject(env, cid, index):
    deliver(env, cid, index)
    c, vm, _, b, _ = env
    vm.sender = b
    c.reject_instalment(cid, index, " Damaged ")

def denied(call, message):
    with pytest.raises(Exception, match=re.escape(message)):
        call()

def test_proposal_has_no_ledger_effect_and_exact_hash(env):
    cid = open_(env)
    c, _, s, b, _ = env
    r = read(env, cid)
    assert r["state"] == "PROPOSED"
    assert r["text_hash"] == h(WHOLE)
    assert r["price"] == "100"
    assert [p["state"] for p in r["instalments"]] == ["PENDING"] * 3
    for wallet in (s, b):
        a = account(env, wallet)
        assert a["contracts"] == 0 and a["payable"] == a["receivable"] == "0"
    assert json.loads(c.get_contract("bad")) == {}

def test_buyer_consent_role_hash_once_and_accounts(env):
    cid = open_(env)
    c, vm, s, b, x = env
    vm.sender = x
    denied(lambda: c.accept_terms(cid, h(WHOLE)), "Only the named buyer may accept or decline the terms")
    vm.sender = b
    denied(lambda: c.accept_terms(cid, "0"*64), "The accepted text does not match these terms")
    c.accept_terms(cid, " 0x" + h(WHOLE).upper() + " ")
    assert read(env, cid)["state"] == "ACTIVE"
    assert account(env, s)["contracts"] == account(env, b)["contracts"] == 1
    denied(lambda: c.accept_terms(cid, h(WHOLE)), "These terms are not awaiting acceptance")

def test_decline_permanent_without_debt(env):
    cid = open_(env)
    c, vm, s, b, _ = env
    vm.sender = b
    c.decline_terms(cid)
    assert read(env, cid)["state"] == "DECLINED"
    denied(lambda: c.accept_terms(cid, h(WHOLE)), "These terms are not awaiting acceptance")
    vm.sender = s
    denied(lambda: c.deliver_instalment(cid, 1), "The buyer declined these terms")
    assert account(env, b)["contracts"] == 0

def test_proposed_blocks_delivery_and_decisions(env):
    cid = open_(env)
    c, vm, s, b, _ = env
    vm.sender = s
    denied(lambda: c.deliver_instalment(cid, 1), "The buyer has not accepted these terms yet")
    vm.sender = b
    denied(lambda: c.accept_instalment(cid, 1), "The buyer has not accepted these terms yet")
    denied(lambda: c.reject_instalment(cid, 1, "Damaged"), "The buyer has not accepted these terms yet")

def test_delivery_role_order_once_and_buyer_gate(env):
    cid = active(env)
    c, vm, s, b, x = env
    vm.sender = b
    denied(lambda: c.deliver_instalment(cid, 1), "Only the supplier may deliver")
    denied(lambda: c.accept_instalment(cid, 1), "This instalment has not been delivered yet")
    denied(lambda: c.reject_instalment(cid, 1, ""), "This instalment has not been delivered yet")
    vm.sender = s
    denied(lambda: c.deliver_instalment(cid, 2), "Instalments are handled in order")
    c.deliver_instalment(cid, 1)
    denied(lambda: c.deliver_instalment(cid, 1), "This instalment was already delivered")
    vm.sender = x
    denied(lambda: c.accept_instalment(cid, 1), "Only the named buyer may act on an instalment")
    vm.sender = b
    c.accept_instalment(cid, 1)
    assert read(env, cid)["owed"] == "100"

def test_whole_rejection_unwinds_and_ends(env):
    cid = active(env)
    accept(env, cid, 1)
    reject(env, cid, 2)
    c, vm, s, b, _ = env
    r = read(env, cid)
    assert r["state"] == "ENDED"
    assert r["owed"] == "0" and r["unwound"] == "100"
    assert [p["state"] for p in r["instalments"]] == ["UNWOUND","REJECTED","RELEASED"]
    assert r["instalments"][1]["stake"] == "200"
    assert r["instalments"][1]["reject_note"] == "Damaged"
    assert account(env, s)["receivable"] == account(env, b)["payable"] == "0"
    assert account(env, s)["unwound_as_supplier"] == account(env, b)["unwound_as_buyer"] == "100"
    denied(lambda: c.accept_instalment(cid, 3), "The arrangement ended when an instalment was rejected")

def test_split_rejection_preserves_prior_debt_and_can_complete(env):
    cid = active(env, SPLIT)
    accept(env, cid, 1)
    reject(env, cid, 2)
    r = read(env, cid)
    assert r["shape"] == "SPLIT" and r["state"] == "ACTIVE"
    assert r["owed"] == "100" and r["unwound"] == "0"
    assert [p["state"] for p in r["instalments"]] == ["ACCEPTED","REJECTED","PENDING"]
    assert r["instalments"][1]["stake"] == "100"
    accept(env, cid, 3)
    assert read(env, cid)["state"] == "COMPLETE"
    assert read(env, cid)["owed"] == "200"

def test_shared_accounts_accumulate_across_contracts_and_unwind_only_one(env):
    a = active(env)
    b = active(env, SPLIT)
    accept(env, a, 1)
    accept(env, b, 1)
    _, _, s, buyer, _ = env
    assert account(env, s)["receivable"] == account(env, buyer)["payable"] == "200"
    reject(env, a, 2)
    assert account(env, s)["receivable"] == account(env, buyer)["payable"] == "100"
    assert account(env, s)["contracts"] == account(env, buyer)["contracts"] == 2
    assert read(env, b)["owed"] == "100"

def test_contest_only_supplier_once_marks_both_accounts_without_restore(env):
    cid = active(env)
    accept(env, cid, 1)
    reject(env, cid, 2)
    c, vm, s, b, _ = env
    before = read(env, cid)
    vm.sender = b
    denied(lambda: c.contest_rejection(cid, 2, ""), "Only the supplier may contest a rejection")
    vm.sender = s
    denied(lambda: c.contest_rejection(cid, 4, "x"), "No such instalment")
    denied(lambda: c.contest_rejection(cid, 1, "x"), "This instalment was not rejected")
    denied(lambda: c.contest_rejection(cid, 2, ""), "Note is empty")
    c.contest_rejection(cid, 2, " Goods were correct ")
    for wallet in (s, b):
        assert account(env, wallet)["disputed"] == "200"
    assert read(env, cid)["state"] == before["state"]
    assert read(env, cid)["owed"] == "0"
    denied(lambda: c.contest_rejection(cid, 2, "again"), "This rejection has already been contested")

def test_first_whole_rejection_has_price_stake_but_no_unwind(env):
    cid = active(env)
    reject(env, cid, 1)
    r = read(env, cid)
    assert r["owed"] == r["unwound"] == "0"
    assert r["instalments"][0]["stake"] == "100"

def test_final_acceptance_and_order(env):
    cid = active(env, parts=2, price=1000000000000)
    accept(env, cid, 1)
    accept(env, cid, 2)
    c, vm, s, b, _ = env
    r = read(env, cid)
    assert r["state"] == "COMPLETE" and r["owed"] == "2000000000000"
    denied(lambda: c.accept_instalment(cid, 3), "Every instalment has already been dealt with")
    vm.sender = s
    denied(lambda: c.deliver_instalment(cid, 3), "Every instalment has already been dealt with")

def test_input_guards_and_duplicate_ignores_price_count(env):
    c, vm, s, b, _ = env
    vm.sender = s
    for args, message in [
        (("bad",3,100,WHOLE),"Invalid wallet address"),
        ((str(b),3,100," "),"Text is empty"),
        ((str(b),3,100,"x"*141),"Text is too long"),
        ((str(b),3,100,"ENTIRE"),"Text contains a reserved token"),
        ((str(b),1,100,WHOLE),"The number of instalments is out of range"),
        ((str(b),6,100,WHOLE),"The number of instalments is out of range"),
        ((str(b),3,0,WHOLE),"The price is out of range"),
        ((str(b),3,1000000000001,WHOLE),"The price is out of range"),
        ((str(s),3,100,WHOLE),"The buyer cannot be the supplier")]:
        denied(lambda args=args: c.open_contract(*args), message)
    open_(env)
    denied(lambda:c.open_contract(str(b),5,1,WHOLE),"This contract already exists")

def test_note_caps_and_unknown_contract(env):
    cid = active(env)
    deliver(env, cid, 1)
    c, vm, _, b, _ = env
    vm.sender = b
    denied(lambda:c.reject_instalment(cid,1,""),"Note is empty")
    denied(lambda:c.reject_instalment(cid,1,"n"*61),"Note is too long")
    c.reject_instalment(cid,1,"📦"*60)
    assert len(read(env,cid)["instalments"][0]["reject_note"]) == 60
    denied(lambda:c.accept_terms("f"*64,"0"*64),"Unknown contract id")

def test_normalized_id_and_text_hash_match_independent_keccak(env):
    text = "  Parts\u0085stand\t together 📦.  "
    cid = open_(env,text)
    r = read(env,cid)
    assert r["text"] == text.strip()
    assert r["text_hash"] == h("Parts stand together 📦.")
    c, _, s, b, _ = env
    assert c._contract_id_for(str(s).lower(),str(b).lower(),"Parts stand together 📦.") == cid

def test_malformed_model_reply_defaults_to_entire_not_semantic_pass(env):
    c, vm, _, _, _ = env
    vm.clear_mocks()
    vm.mock_llm(r"(?s).*", "not-json")
    cid = open_(env)
    assert read(env,cid)["outcome"] == "ENTIRE"

