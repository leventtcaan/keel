"""Tek satırda iki öğe yazılmış YAML liste satırlarını ('- "a", "b"') ikiye böler, sonra dosyayı doğrular."""
import re, sys, yaml
path = sys.argv[1] if len(sys.argv) > 1 else "plan/backlog.yaml"
out, n = [], 0
for ln in open(path, encoding="utf-8").read().split("\n"):
    m = re.match(r'^(\s*)- (".*?")\s*,\s*(".*")\s*$', ln)
    while m:
        out.append(f"{m.group(1)}- {m.group(2)}"); n += 1
        ln = f"{m.group(1)}- {m.group(3)}"
        m = re.match(r'^(\s*)- (".*?")\s*,\s*(".*")\s*$', ln)
    out.append(ln)
open(path, "w", encoding="utf-8").write("\n".join(out))
d = yaml.safe_load(open(path, encoding="utf-8"))
print(f"{n} satır bölündü · {len(d['tasks'])} görev geçerli")
