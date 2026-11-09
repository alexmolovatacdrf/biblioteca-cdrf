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
n=len(B); t=t.replace('__NT__',f"{n}{'' if 1<=n%100<=19 else ' de'} titluri").replace('__DATA__',data)
# <head> ține title/meta/link/style; <body> începe la primul element vizibil
_i=t.index('</style>')+len('</style>')
html='<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+t[:_i]+'</head><body>'+t[_i:]+'</body></html>'
# varianta B este site-ul principal; varianta veche rămâne la veche.html (neindexată), varianta.html trimite la index
open(R+'index.html','w').write(html.replace('const VARB=__VARB__;','const VARB=true;'))
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
