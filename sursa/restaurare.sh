#!/bin/bash
# Reface mediul de build într-o sesiune nouă. Rulează din rădăcina repo-ului clonat:  bash sursa/restaurare.sh
# Repo-ul trebuie clonat în /home/claude/biblioteca-cdrf (căile din scripturi sunt fixe).
set -e
R=/home/claude/biblioteca-cdrf; H=/home/claude
for d in proto desc tax nb panels db grok_in; do mkdir -p $H/$d; cp -r $R/sursa/$d/. $H/$d/; done
# imaginile publicate sunt deja în repo; build-ul le copiază din proto/
mkdir -p $H/proto/covers $H/proto/pages $H/proto/fonts $H/proto/brand
cp -r $R/covers/. $H/proto/covers/; cp -r $R/pages/. $H/proto/pages/; cp -r $R/fonts/. $H/proto/fonts/; cp -r $R/brand/. $H/proto/brand/
# GA și Cloudflare: le recitește din index.html publicat (sunt publice în pagină)
python3 - <<'PY'
import re
t=open('/home/claude/biblioteca-cdrf/index.html').read()
g=re.search(r"const GA_ID='([^']*)'",t); c=re.search(r"const CF_TOKEN='([^']*)'",t)
if g: open('/home/claude/db/ga_id.txt','w').write(g.group(1))
if c: open('/home/claude/db/cf_token.txt','w').write(c.group(1))
PY
echo "Gata. Build: cd /home/claude && python3 desc/apply.py && python3 db/gh_build.py"
