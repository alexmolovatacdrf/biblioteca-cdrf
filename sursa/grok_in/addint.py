import json,re
from PIL import Image
I=json.load(open('/home/claude/grok_in/interiors.json'))
P=json.load(open('/home/claude/proto/books2.json')); D={b['id']:b for b in P}
drop={'2':[0],'27':[0],'45':[0],'49':[0],'52':[0],'92':[3],'175':[0],'252':[0,1,2],'278':[0],'370':[0],'377':[0],'395':[0],'528':[0,1,5]}
exclude={'10','13','192','300','327','366','566'}
def credit(c):
    c=re.sub(r'\(.*?\)','',c or '').strip()
    if not c or c.lower().startswith('niciun') or c.lower().startswith('fără'): return ''
    return c
added={}
for i,rows in I.items():
    if i in exclude or i not in D: continue
    b=D[i]
    if any('pages/' in im['src'] for im in b['images'][1:]): continue  # avem deja interioare
    keep=[x for k,x in enumerate(rows[:6]) if k not in drop.get(i,[])]
    if not keep: continue
    ims=[b['images'][0]]
    n=len(keep)
    for k,x in enumerate(keep,1):
        im=Image.open('/home/claude/grok_in/x/'+x['fișier']).convert('RGB')
        im.thumbnail((1600,1600),Image.LANCZOS)
        p=f'pages/{i}_g{k:02d}.webp'; im.save('/home/claude/proto/'+p,'WEBP',quality=80,method=6)
        ims.append({'src':p,'w':im.width,'h':im.height,'cap':f'Interior · {k} din {n}','credit':credit(x['creditul afișat pe pagină']),'from':x['pagina de unde e luată']})
    b['images']=ims; added[i]=n
json.dump(P,open('/home/claude/proto/books2.json','w'),ensure_ascii=False)
print(len(added),sum(added.values()))
print(added)
