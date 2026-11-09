import json,csv
A=json.load(open('/home/claude/desc/applied.json'))
P=json.load(open('/home/claude/proto/books2.json'))
for b in P:
    for k in ('descSrc','srcs','press'): b.pop(k,None)
    a=A.get(b['id'])
    if not a: continue
    if 'desc_old' not in b: b['desc_old']=b.get('desc','')
    b['desc']=a['desc']
import sys; sys.path.insert(0,'/home/claude/tax'); from teme import conv as _teme
for b in P: b['tags']=_teme(b['tags'])
OV=json.load(open('/home/claude/desc/overrides.json'))  # confirmări manuale de la Alex, au prioritate
for b in P:
    for k,v in OV.get(b['id'],{}).items(): b[k]=v
json.dump(P,open('/home/claude/proto/books2.json','w'),ensure_ascii=False)
pub=[{k:(v if k!='images' else [{kk:vv for kk,vv in im.items() if kk not in ('from','credit')} for im in v]) for k,v in b.items() if k not in ('desc_old','batch')} for b in P]   # pe site nu ajung sursele și nici textul vechi
BL={}
for l in open('/home/claude/nb/blobs.txt'):
    if l.strip(): k,v=l.split(); BL['covers/'+k+'.webp']='/_blob/'+v
for l in open('/home/claude/nb/blobs2.txt'):
    if l.strip(): k,v,_=l.split(); BL[k]='/_blob/'+v
for b in pub:
    if b['cover'] in BL: b['cover']=BL[b['cover']]
    b['images']=[dict(im,src=BL.get(im['src'],im['src'])) for im in b['images']]
open('/home/claude/proto/data.js','w').write('window.BOOKS='+json.dumps(pub,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';')
t=open('/home/claude/proto/template.html').read().replace('const VARB=__VARB__;','const VARB=true;')
import sys; sys.path.insert(0,'/home/claude/panels'); from inject import inject; t=inject(t)
n=len(P); t=t.replace('__NT__',f"{n}{'' if 1<=n%100<=19 else ' de'} titluri")
open('/home/claude/proto/index.html','w').write(t.replace('__DATA__',open('/home/claude/proto/data.js').read()))
D={b['id']:b for b in P}
w=csv.writer(open('/home/claude/desc/descrieri_surse.csv','w',encoding='utf-8-sig',newline=''))
w.writerow(['ID','Titlu','Descriere nouă (pe site)','Descriere veche','Sursa textului','Linkuri surse','Despre carte în presă'])
for i in sorted(A,key=int):
    a=A[i]; b=D[i]
    w.writerow([i,b['title'],a['desc'],b.get('desc_old',''),'Text CdRF, '+a.get('descSrc',''),' | '.join(f"{s['t']}: {s['u']}" for s in a.get('srcs',[])),' | '.join(f"{p['o']}{' · '+p['a'] if p.get('a') else ''}{' · '+p['d'] if p.get('d') else ''}: {p['u']}" for p in a.get('press',[]))])
print('aplicate',len(A))
