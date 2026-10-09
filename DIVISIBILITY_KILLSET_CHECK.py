"""
Semantic case and rubric gate for OneOrEach / InstalmentAccord.

GATE 1  no token or bigram may separate the two classes.
GATE 2  the rubric may share no content word with any case.
        (No stemming: 'pay' and 'paid' look different to it, so a green gate
         still needs a human read of the rubric.)

Run:  python3 DIVISIBILITY_KILLSET_CHECK.py
      python3 DIVISIBILITY_KILLSET_CHECK.py contracts/InstalmentAccord.py
"""

import re
import sys

DECLARED = 'the Buyer'

CASES = {
    "ENTIRE": {
        "E1": "The deliveries together make up one single undertaking.",
        "E2": "A defect in any one shipment entitles you to refuse the rest.",
        "E3": "The instalments stand or fall together.",
        "E4": "You need not take part of the order if the whole cannot be supplied.",
        "E5": "Rejecting one delivery ends the arrangement for every delivery still to come."
    },
    "SEVERABLE": {
        "S1": "Each delivery is a separate undertaking.",
        "S2": "A defect in any one shipment entitles you to refuse that shipment only.",
        "S3": "Every instalment stands on its own.",
        "S4": "You must take whatever part of the order can be supplied.",
        "S5": "Rejecting one delivery has no effect on the deliveries still to come."
    }
}

PAIRS = [
    [
        "E2",
        "S2",
        "same sentence up to the last words"
    ],
    [
        "E5",
        "S5",
        "both open with Rejecting one delivery"
    ],
    [
        "E4",
        "S4",
        "both about taking part of the order"
    ],
    [
        "E3",
        "S3",
        "both about instalments standing"
    ],
    [
        "E1",
        "S1",
        "both call the deliveries an undertaking"
    ]
]

# Texts that must make the open method REVERT rather than produce a label.
# They sit OUTSIDE gate 1 on purpose: gate 1 asks whether a token separates the
# two DECIDABLE classes, and a third class makes that question meaningless.
# They are inside gate 2 — the rubric must not quote them either.
MUST_REVERT = {}


def features(text):
    tok = re.findall(r"[a-z]+", text.lower())
    f = set(tok)
    f.update(" ".join(p) for p in zip(tok, tok[1:]))
    return f


def leaks(case_set):
    sides = {k: {n: features(t) for n, t in v.items()} for k, v in case_set.items()}
    names = list(sides)
    out = []
    for i, name in enumerate(names):
        other = names[1 - i]
        common = set.intersection(*sides[name].values())
        absent = set().union(*sides[other].values())
        out += [(name, f) for f in sorted(common - absent)]
    return out


STOP = set("""a an and are as at be been by do does for from has have in into is it its
of on or our that the their them there these this to us we will with your you not no
if any each one two both same other than then when where which while who whom what""".split())


def content_words(text):
    return {w for w in re.findall(r"[a-z]+", text.lower())
            if w not in STOP and len(w) > 2}


flat = {}
for group in CASES.values():
    flat.update(group)

all_texts = dict(flat)
all_texts.update(MUST_REVERT)

print("=" * 74)
print("DECLARED CONTEXT:", DECLARED)
print("=" * 74)

found = leaks(CASES)
if found:
    print(f"LEAK: {len(found)} separating feature(s) — set is NOT usable:")
    for side, f in found:
        print(f"   {f!r:32s} -> in ALL {side}, in NO case of the other class")
else:
    print("NO LEAK: no token or bigram separates the two classes.")

print()
print("Adversarial pairs (same surface, opposite label):")
for a, b, why in PAIRS:
    print(f"   {a} / {b}  - {why}")

print()
if MUST_REVERT:
    print()
    print("Must-REVERT texts (not in gate 1; the open method must raise on each):")
    for n, t in sorted(MUST_REVERT.items()):
        print(f"   {n}  {t}")

print()
print("Byte length per case (255-byte calldata cliff; method name + 64-hex id add more):")
for name, text in sorted(all_texts.items()):
    n = len(text.encode("utf-8"))
    print(f"   {name}  {n:3d} bytes{'   <-- CHECK' if n > 150 else ''}")


def rubric_text(path):
    src = open(path, encoding="utf-8").read()
    if path.endswith(".txt"):
        return src
    m = re.search(r'RUBRIC\s*=\s*f?"""(.*?)"""', src, re.S)
    return m.group(1) if m else None


def rubric_overlap(path):
    body = rubric_text(path)
    if body is None:
        print("\ncould not find a RUBRIC block in", path)
        return 1
    # DECLARED is the fixed framing handed to the model with EVERY case, in both
    # classes alike. It therefore carries zero label information and is excluded
    # from this gate on purpose. Only the case wording is checked.
    cw = set()
    for t in all_texts.values():
        cw |= content_words(t)
    ov = sorted(content_words(body) & cw)
    print()
    print("=" * 74)
    print("RUBRIC OVERLAP GATE —", path)
    print("=" * 74)
    if ov:
        print(f"FAIL: {len(ov)} content word(s) shared with the case set:")
        for w in ov:
            print("   ", w)
        print("The rubric defines the TASK. It never quotes an answer.")
        return 1
    print("PASS: rubric shares no content word with any case.")
    print("      (No stemming — read the rubric yourself for near-matches.)")
    return 0


print("=" * 74)
if len(sys.argv) > 1:
    sys.exit((1 if found else 0) or rubric_overlap(sys.argv[1]))
sys.exit(1 if found else 0)
