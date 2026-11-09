import json,csv,re
C=json.load(open('/home/claude/gpt/cmp.json')); W,G=C['W'],C['G']
B={b['id']:b for b in json.load(open('/home/claude/proto/books2.json'))}
A=json.load(open('/home/claude/desc/applied.json'))
def fix(s):
    s=str(s or '').replace('ş','ș').replace('ţ','ț').replace('Ş','Ș').replace('Ţ','Ț').replace('\xa0',' ')
    return re.sub(r'\s+',' ',s).strip()
cols=['ID','Stare','Titlu','Subtitlu','Fotograf / autor','Colaboratori (nume – rol)','Editură','Loc','An','Ediție','Serie','Volum','ISBN','Limbă','Tip','Categorie','Teme','Raft','Pagini','Dimensiuni (cm)','Legătură','Descriere','Sursa descrierii','Linkuri surse','Copertă','Interioare','Copertă de verificat','Verificat la raft','Note','Wix ID']
rows=[]
ids=sorted(set(W)|set(G),key=int)
for i in ids:
    b=B.get(i); g=G.get(i,{}); w=W.get(i,{})
    if b:
        a=A.get(i,{})
        r=dict(ID=i,Stare='Publicată',Titlu=b['title'],Subtitlu=b['subtitle'],**{'Fotograf / autor':'; '.join(b['people']),'Colaboratori (nume – rol)':'; '.join(f"{c['n']} – {c['r']}" for c in b.get('contrib',[]))},
          Editură=b['publisher'],Loc=b['place'],An=b['year'],Ediție=b.get('edition',''),Serie=b.get('series',''),Volum=b.get('vol',''),ISBN=b['isbn'],Limbă='; '.join(b['lang']),Tip=b['type'],Categorie=b['category'],Teme='; '.join(b['tags']),Raft=b['shelf'],Pagini=b.get('pages',''),**{'Dimensiuni (cm)':' x '.join(map(str,b.get('dim') or [])),'Sursa descrierii':('Text CdRF, '+a['descSrc']) if a.get('descSrc') else '','Linkuri surse':' | '.join(s['u'] for s in a.get('srcs',[])),'Copertă de verificat':'da' if b.get('coverCheck') else ''},
          Legătură=b.get('binding',''),Descriere=b['desc'],Copertă=b['cover'].replace('_v',''),Interioare=len(b['images'])-1,**{'Verificat la raft':'','Wix ID':w.get('ID','')},Note='')
    else:
        st='Ciornă' if w.get('Status')!='PUBLISHED' else 'În lucru'
        cat=''
        try: cat=json.loads(g.get('Categorie') or '[]')[0]
        except: pass
        try: tg='; '.join(json.loads(g.get('Subcategorie') or '[]'))
        except: tg=''
        m=re.search(r'wix:image://v1/([^/]+)/',w.get('Cover',''))
        r={'ID':i,'Stare':st,'Titlu':fix(g.get('Titlu') or w.get('Title')),'Subtitlu':fix(g.get('Subtitlu')),'Fotograf / autor':fix(g.get('Autor / fotograf / contributor') or w.get('AUTHOR')).replace(', ','; '),
           'Colaboratori (nume – rol)':(fix(g.get('Editor'))+' – Editor') if g.get('Editor') else '','Editură':fix(g.get('Editură')),'Loc':fix(g.get('Locul publicării')),'An':fix(g.get('An')),'Ediție':'','Serie':'','Volum':'','ISBN':fix(g.get('ISBN')),
           'Limbă':fix(g.get('Limbă')),'Tip':fix(g.get('Tip')),'Categorie':cat,'Teme':fix(tg),'Raft':fix(g.get('Raft') or w.get('RAFT')),'Pagini':'','Dimensiuni (cm)':'','Legătură':'','Descriere':fix(g.get('Descriere')),'Sursa descrierii':'audit ChatGPT, neverificat','Linkuri surse':'',
           'Copertă':('wix:'+m[1]) if m else '','Interioare':0,'Copertă de verificat':'','Verificat la raft':'','Note':'Autorii nu sunt încă separați pe roluri','Wix ID':w.get('ID','')}
    rows.append(r)
with open('baza_de_date.csv','w',newline='',encoding='utf-8-sig') as f:
    wr=csv.DictWriter(f,fieldnames=cols); wr.writeheader(); wr.writerows(rows)
from collections import Counter
print(len(rows),Counter(r['Stare'] for r in rows))
print(Counter(bool(r['Copertă']) for r in rows if r['Stare']!='Publicată'))
