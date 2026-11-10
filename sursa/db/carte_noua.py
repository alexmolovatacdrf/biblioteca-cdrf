# Construiește o înregistrare books2 dintr-un rând din tabel (snapshot), cu suprascrieri
import re
def split(v): return [x.strip() for x in re.split(r';\s*',v or '') if x.strip()]
def contrib(v):
    out=[]
    for part in split(v):
        m=re.match(r'(.+?)\s+[–-]\s+(.+)$',part)
        if m:
            for n in re.split(r',\s*',m.group(1)): out.append({'n':n.strip(),'r':m.group(2).strip()})
        else: out.append({'n':part,'r':''})
    return out
def dim(v):
    m=re.match(r'\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)',v or '')
    return [float(m.group(1).replace(',','.')),float(m.group(2).replace(',','.'))] if m else []
def rec(r,ov={}):
    g=lambda k:(ov[k] if k in ov else r.get(k,'')).strip() if isinstance(ov.get(k,r.get(k,'')),str) else ov.get(k)
    pages=g('Pagini'); 
    return dict(id=r['ID'],title=g('Titlu'),subtitle=g('Subtitlu'),people=[p for p in split(g('Fotograf / autor')) if p not in ("'-",'-')],
        publisher=g('Editură'),year=g('An'),place=g('Loc'),lang=split(g('Limbă')),isbn=g('ISBN'),editor='',shelf=g('Raft'),
        category=g('Categorie'),tags=split(g('Teme')),type=g('Tip'),desc=g('Descriere'),related=[],series=g('Serie'),vol=g('Volum'),
        edition=g('Ediție'),pages=int(pages) if pages.isdigit() else pages,dim=dim(g('Dimensiuni (cm)')),binding=g('Legătură'),contrib=contrib(g('Colaboratori (nume – rol)')))
