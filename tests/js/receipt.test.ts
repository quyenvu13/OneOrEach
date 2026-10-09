import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyTransaction, revertReasonFrom } from "../../src/lib/receipt.ts";
import { errorMessage } from "../../src/lib/errors.ts";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const hex = (s: string) => "0x" + Buffer.from(s, "utf8").toString("hex");

test("SUCCESS on the leader receipt is success", () => {
  const tx = { status: "ACCEPTED", consensus_data: { leader_receipt: [{ mode: "leader", execution_result: "SUCCESS" }] } };
  assert.equal(classifyTransaction(tx).kind, "success");
});

test("validator receipt listed first does not count; leader is found by mode", () => {
  const tx = { status: "ACCEPTED", consensus_data: { leader_receipt: [
    { mode: "validator", execution_result: "SUCCESS" },
    { mode: "leader", execution_result: "ERROR", result: b64("UserError: The arrangement ended when an instalment was rejected") },
  ] } };
  const v = classifyTransaction(tx);
  assert.equal(v.kind, "error");
  assert.equal(v.kind === "error" && v.reason, "The arrangement ended when an instalment was rejected");
});

test("missing or null execution result is NOT success", () => {
  assert.equal(classifyTransaction({status:"PROPOSING",consensus_data:{leader_receipt:{mode:"leader",execution_result:"ERROR"}}}).kind,"pending");
  assert.equal(classifyTransaction({ status: "PENDING" }).kind, "pending");
  assert.equal(classifyTransaction({ consensus_data: { leader_receipt: [{ mode: "leader", execution_result: null }] } }).kind, "pending");
  assert.equal(classifyTransaction({ consensus_data: { leader_receipt: null } }).kind, "pending");
  assert.equal(classifyTransaction(null).kind, "pending");
});

test("UNDETERMINED / CANCELED is a failure even with a SUCCESS leader", () => {
  const v = classifyTransaction({ status: "UNDETERMINED", consensus_data: { leader_receipt: { mode: "leader", execution_result: "SUCCESS" } } });
  assert.equal(v.kind, "error");
});

test("revert reason found in plain, hex and base64 fields", () => {
  assert.equal(revertReasonFrom({ error: "[rollback] Every instalment has already been dealt with" }), "Every instalment has already been dealt with");
  assert.equal(revertReasonFrom({ result: hex("No such instalment") }), "No such instalment");
  assert.equal(revertReasonFrom({ genvm_result: { stderr: b64("x UserError('Unknown contract id')") } }), "Unknown contract id");
  assert.equal(revertReasonFrom({ a: "nothing here" }), null);
});

test("errorMessage walks every nested cause", () => {
  const err = { message: "Execution reverted", cause: { shortMessage: "RPC error", cause: { details: "UserError: The buyer cannot be the supplier" } } };
  assert.equal(errorMessage(err), "The buyer cannot be the supplier");
  assert.equal(errorMessage({ code: 4001, message: "User rejected the request." }), "The wallet request was rejected.");
  assert.match(errorMessage(new Error("RLP string ends with 12 superfluous bytes")), /255 bytes/);
});
