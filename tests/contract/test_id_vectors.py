"""Cross-language V2 IDs: deployed source helpers, independent Python, and frontend."""
import json
import subprocess
from pathlib import Path
from Crypto.Hash import keccak
ROOT = Path(__file__).resolve().parents[2]
S = "0x" + "a" * 40
B = "0x" + "b" * 40
def test_vectors_match_contract_and_frontend(direct_deploy):
    c = direct_deploy(str(ROOT/"contracts/InstalmentAccord.py"), sdk_version="v0.2.16")
    for text in [" Terms. ", "Parts\u0085stand\ttogether 📦.", "\ufeffSeparate deliveries.", "\u001cEach part.\u001f"]:
        norm = " ".join(text.strip().split())
        digest = lambda s: keccak.new(digest_bits=256, data=s.encode()).hexdigest()
        cid = digest("ONE_OR_EACH:CONTRACT:V2|"+S+"|"+B+"|"+str(len(norm))+"|"+norm)
        assert c._contract_id_for(S,B,norm) == cid
        assert c._hash(norm) == digest(norm)
        script = "import {contractId,textHash} from './src/lib/ids.ts';const [s,b,t]=JSON.parse(process.argv[1]);console.log(JSON.stringify([contractId(s,b,t),textHash(t)]));"
        out = subprocess.check_output(["node","--experimental-strip-types","--no-warnings","--input-type=module","-e",script,json.dumps([S,B,text])],cwd=ROOT,text=True)
        assert json.loads(out) == [cid,digest(norm)]
