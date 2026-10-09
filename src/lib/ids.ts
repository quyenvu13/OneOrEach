import { keccak256, stringToBytes } from "viem";
import { pyLen, pyNormalize, pyStrip } from "./pytext.ts";
export function textHash(text: string): string { return keccak256(stringToBytes(pyNormalize(pyStrip(text)))).slice(2); }
export function contractId(supplier: string, buyer: string, text: string): string {
  const normalized = pyNormalize(pyStrip(text));
  const payload = "ONE_OR_EACH:CONTRACT:V2|" + pyStrip(supplier).toLowerCase() + "|" +
    pyStrip(buyer).toLowerCase() + "|" + String(pyLen(normalized)) + "|" + normalized;
  return keccak256(stringToBytes(payload)).slice(2);
}
export function short(value: string, head = 6, tail = 4): string {
  return !value || value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
export function cleanId(value: string): string { return pyStrip(value).toLowerCase().replace(/^0x/, ""); }

