# Pune panourile (copie din tabul „Panouri”) și adresa API-ului în șablon.
import json
API='https://script.google.com/macros/s/AKfycbzcbEAfbJQsOc1FqoTACVsaCqBf3NV4mTPR05FRSayUBGqtyTwwyEq32LUA2gaSXm0_4w/exec'
KEYS=('id','active','kind','title','guest','when','date','end','from','to','books','text')
def inject(t):
    import os; P=json.load(open(os.environ.get('PANELS','/home/claude/panels/panels.json')))
    P=[{k:p.get(k) for k in KEYS} for p in P if p.get('active')]
    js=json.dumps(P,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
    return t.replace('__PANELS_API__',API)
