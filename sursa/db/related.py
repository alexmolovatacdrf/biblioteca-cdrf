# „Ți-ar putea plăcea și”: cele mai apropiate cărți după teme, categorie, tip, autori și cuvintele din titlu și descriere.
# Se recalculează la fiecare build, pentru toate cărțile. Nu folosește nimic din afara catalogului.
import re,math,collections
STOP=set('a al ale ai alte altă an ani are au că ca care cu de din după e el ea este fiecare fost în între la le lui mai mult nu o pe pentru prin sa să se sunt și un una unei unui unor the of and in to with on for by from at as is his her its this that these their an or was were photographs photography photographer photographers fotograf fotografii fotografia fotografie carte cărți album volum volumul book books'.split())
W={'tag':6,'cat':2,'type':1.5,'ppl':4,'title':2,'desc':1}
def toks(s): return [w for w in re.findall(r'[a-zăâîșşțţ0-9]{3,}',(s or '').lower().replace('ş','ș').replace('ţ','ț')) if w not in STOP]
def compute(B,k=8):
    docs=[]
    for b in B:
        c=collections.Counter()
        for t in b.get('tags') or []: c['tag:'+t]+=W['tag']
        if b.get('category'): c['cat:'+b['category']]+=W['cat']
        if b.get('type'): c['type:'+b['type']]+=W['type']
        for p in b.get('people') or []: c['ppl:'+p]+=W['ppl']
        for w in toks(b.get('title','')+' '+b.get('subtitle','')): c['w:'+w]+=W['title']
        for w in toks(b.get('desc','')): c['w:'+w]+=W['desc']
        docs.append(c)
    n=len(docs); df=collections.Counter()
    for c in docs:
        for t in c: df[t]+=1
    vecs=[]
    for c in docs:
        v={t:x*math.log((n+1)/(df[t]+0.5)) for t,x in c.items()}; nrm=math.sqrt(sum(x*x for x in v.values())) or 1
        vecs.append({t:x/nrm for t,x in v.items()})
    out={}
    for i,b in enumerate(B):
        vi=vecs[i]; sc=[]
        for j,o in enumerate(B):
            if j==i: continue
            s=sum(x*vecs[j].get(t,0) for t,x in vi.items() if t in vecs[j])
            if s>0.05: sc.append((s,o['id']))
        sc.sort(reverse=True); out[b['id']]=[x for _,x in sc[:k]]
    return out
