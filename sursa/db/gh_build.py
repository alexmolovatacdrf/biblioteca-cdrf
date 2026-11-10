# Construiește versiunea pentru GitHub Pages: căi locale pentru imagini, document HTML complet.
import json,os,shutil
P='/home/claude/proto/'; R='/home/claude/biblioteca-cdrf/'
B=json.load(open(P+'books2.json'))
pub=[{k:(v if k!='images' else [{kk:vv for kk,vv in im.items() if kk not in ('from','credit')} for im in v]) for k,v in b.items() if k not in ('desc_old','batch','descSrc','srcs','press')} for b in B]
data='window.BOOKS='+json.dumps(pub,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';'
t=open(P+'template.html').read()
import sys; sys.path.insert(0,'/home/claude/panels'); from inject import inject; t=inject(t)
GA=open('/home/claude/db/ga_id.txt').read().strip() if os.path.exists('/home/claude/db/ga_id.txt') else '__GA__'
t=t.replace("const GA_ID='__GA__';","const GA_ID='"+GA+"';")
CF=open('/home/claude/db/cf_token.txt').read().strip() if os.path.exists('/home/claude/db/cf_token.txt') else '__CF__'
t=t.replace("const CF_TOKEN='__CF__';","const CF_TOKEN='"+CF+"';")
n=len(B); t=t.replace('__NT__',f"{n}{'' if 1<=n%100<=19 else ' de'} titluri")
# părțile șablonului: meta (title/og/link) · css · markup · date · aplicație
_hm=t[:t.index('<style>')]; _css=t[t.index('<style>')+7:t.index('</style>')]
_i=t.index('</style>')+len('</style>'); _j=t.index('<script>',_i)
_body=t[_i:_j]; _app=t[t.index('<script>',_j+8)+8:t.rindex('</script>')]
_app_pub=_app.replace('const VARB=__VARB__;','const VARB=true;')
import hashlib,re,glob
h8=lambda x:hashlib.md5(x.encode()).hexdigest()[:8]
CSS=f'site.{h8(_css)}.css'; APP=f'app.{h8(_app_pub)}.js'; DATA=f'data.{h8(data)}.js'
for f in glob.glob(R+'site.*.css')+glob.glob(R+'app.*.js')+glob.glob(R+'data.*.js'): os.remove(f)
open(R+CSS,'w').write(_css); open(R+APP,'w').write(_app_pub); open(R+DATA,'w').write(data)
HEAD0='<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><base href="/">'
def page(headmeta,noindex=False):
    return HEAD0+(('<meta name="robots" content="noindex">') if noindex else '')+headmeta+f'<link rel="stylesheet" href="/{CSS}"></head><body>'+_body+f'<script src="/{DATA}"></script><script src="/{APP}"></script></body></html>'
open(R+'index.html','w').write(page(_hm))
open(R+'404.html','w').write(page(_hm,True))   # adrese necunoscute: tot aplicația (fără indexare)
# o pagină pentru fiecare carte: /carte/0417-titlu, cu previzualizare (Open Graph) și date pentru Google
import unicodedata
def slug(t):
    x=(t or '').lower()
    for a,b in (('ă','a'),('â','a'),('î','i'),('ș','s'),('ş','s'),('ț','t'),('ţ','t'),('ß','ss')): x=x.replace(a,b)
    x=''.join(c for c in unicodedata.normalize('NFD',x) if not unicodedata.combining(c))
    x=re.sub(r'[^a-z0-9]+','-',x).strip('-')
    if len(x)>60: x=x[:60]; k=x.rfind('-'); x=x[:k] if k>0 else x
    return x or 'carte'
pad4=lambda i:str(i).zfill(4)
esc=lambda v:str(v).replace('&','&amp;').replace('"','&quot;').replace('<','&lt;')
sys.path.insert(0,'/home/claude/db'); from og_image import make as og_make
os.makedirs(R+'carte',exist_ok=True); os.makedirs(R+'og',exist_ok=True)
for f in glob.glob(R+'carte/*.html'): os.remove(f)
OGC=json.load(open('/home/claude/db/og_cache.json')) if os.path.exists('/home/claude/db/og_cache.json') else {}
keep=set(); npg=0
for b in B:
    if not b.get('cover') or not os.path.exists(P+b['cover']): continue
    code=pad4(b['id']); path=f'/carte/{code}-{slug(b["title"])}'; url='https://biblioteca.cdrf.ro'+path
    ppl=', '.join(b.get('people') or []); meta=' · '.join(x for x in [b.get('type'),b.get('publisher'),str(b.get('year') or '')] if x)
    d=re.sub(r'\s+',' ',(b.get('desc') or '')).strip()
    if len(d)>200: d=d[:200]; d=d[:max(d.rfind('. '),d.rfind(' '))].rstrip('.,;:')+'…'
    descr=d or ' · '.join(x for x in [ppl,meta] if x)
    title=esc(b['title']+(' · '+ppl if ppl else '')+' · Biblioteca CdRF')
    key=json.dumps([b['title'],ppl,meta,b['cover'],os.path.getmtime(P+b['cover'])])
    og=f'og/{code}.jpg'; keep.add(og)
    if OGC.get(code)!=key or not os.path.exists(R+og):
        og_make(P+b['cover'],b['title'],ppl,meta,R+og); OGC[code]=key
    ld={'@context':'https://schema.org','@type':'Book','name':b['title'],'url':url,'image':'https://biblioteca.cdrf.ro/'+b['cover'],'inLanguage':b.get('lang') or None,
        'author':[{'@type':'Person','name':p} for p in (b.get('people') or [])] or None,'publisher':({'@type':'Organization','name':b['publisher']} if b.get('publisher') else None),
        'datePublished':str(b['year']) if b.get('year') else None,'isbn':b.get('isbn') or None,'numberOfPages':b.get('pages') or None,'description':descr or None}
    ld={k:v for k,v in ld.items() if v}
    hm=_hm
    hm=re.sub(r'<title>.*?</title>',f'<title>{title}</title>',hm,count=1)
    hm=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{esc(descr)}">',hm,count=1)
    hm=hm.replace('<meta property="og:type" content="website">','<meta property="og:type" content="book">')
    hm=re.sub(r'<meta property="og:title" content="[^"]*">',f'<meta property="og:title" content="{esc(b["title"])}">',hm,count=1)
    hm=re.sub(r'<meta property="og:description" content="[^"]*">',f'<meta property="og:description" content="{esc(descr)}">',hm,count=1)
    hm=re.sub(r'<meta property="og:url" content="[^"]*">',f'<meta property="og:url" content="{url}"><link rel="canonical" href="{url}">',hm,count=1)
    hm=re.sub(r'<meta property="og:image" content="[^"]*">',f'<meta property="og:image" content="https://biblioteca.cdrf.ro/{og}"><meta name="twitter:card" content="summary_large_image">',hm,count=1)
    hm+=''.join(f'<meta property="book:author" content="{esc(p)}">' for p in (b.get('people') or []))+(f'<meta property="book:isbn" content="{esc(b["isbn"])}">' if b.get('isbn') else '')
    hm+='<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')+'</script>'
    open(R+'carte/'+path.split('/')[-1]+'.html','w').write(page(hm)); npg+=1
for f in glob.glob(R+'og/*.jpg'):
    if 'og/'+os.path.basename(f) not in keep: os.remove(f)
json.dump(OGC,open('/home/claude/db/og_cache.json','w'))
print(npg,'pagini de carte')
# varianta veche rămâne cum era (totul într-un singur fișier), neindexată
html='<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t[:_i]+'</head><body>'+t[_i:].replace('__DATA__',data)+'</body></html>'
open(R+'veche.html','w').write(html.replace('const VARB=__VARB__;','const VARB=false;').replace('<head>','<head><meta name="robots" content="noindex">',1))
# păstrează beacon-ul Cloudflare pus în varianta.html din PR #1 (Cursor), ca build-ul să nu-l șteargă
import re as _re
_old=open(R+'varianta.html').read() if os.path.exists(R+'varianta.html') else ''
_cf=_re.search(r'<!-- Cloudflare Web Analytics -->.*?<!-- End Cloudflare Web Analytics -->',_old,_re.S)
open(R+'varianta.html','w').write('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=./"><title>Biblioteca CdRF</title>'+(_cf.group(0) if _cf else '')+'<a href="./">Biblioteca CdRF</a>')
need={im['src'] for b in B for im in b['images']}|{b['cover'] for b in B}
for d in ('covers','pages','fonts','brand'): os.makedirs(R+d,exist_ok=True)
for s in need: shutil.copy2(P+s,R+s)
for d in ('fonts','brand'):
    for f in os.listdir(P+d):
        if os.path.isfile(P+d+'/'+f) and not f.startswith('.'): shutil.copy2(P+d+'/'+f,R+d+'/'+f)
# Lista imaginilor fiecărei cărți, pentru admin (alegerea imaginilor de pe site și a celei de la mouse)
IM={}
for b in B:
    ims=b.get('images',[])
    h=b.get('hov') or 0
    if not (h and h<len(ims) and not ims[h].get('ext')):
        h=next((i for i,im in enumerate(ims) if i>0 and not im.get('ext')),0)
    IM[str(b['id'])]={'i':[[im['src'],1 if im.get('ext') else 0,im.get('cap','')] for im in ims],'h':h}
open(R+'imagini.json','w').write(json.dumps(IM,ensure_ascii=False,separators=(',',':')))
open(R+'.nojekyll','w').write('')
print(len(need),'imagini', round(os.path.getsize(R+'index.html')/1e6,2),'MB index')
