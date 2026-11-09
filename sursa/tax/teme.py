# Comasarea temelor (aprobată de Alex, 3 nov. 2026). Rulează pe books2.json; apply.py o reaplică la fiecare build.
import json
M={
'Portret':['Portret','Portret contemporan','Portret · Oameni','Portret — premii','Portret copii'],
'Fotografie de stradă':['Stradă','Street photography','Fotografie de stradă','Femei — stradă','Stradă — tehnică'],
'Fotojurnalism':['Fotojurnalism','Fotojurnalism · Documentar','Reportaj','Fotojurnalism — teorie'],
'Documentar social':['Documentar social','Documentar social · Umanitar'],
'Conflict, război, memorie':['Conflict · Război · Memorie','Al Doilea Război Mondial'],
'Activism':['Activism · Rezistență vizuală'],
'Corp și identitate':['Corp și identitate','Corp și imagine','Identitate · LGBTQ+'],
'Femei în fotografie':['Femei în fotografie','Femei — privire','Femei — privire, reprezentare','reprezentare'],
'Modă':['Modă','Modă — albume contemporane','Istoria fotografiei de modă','Reviste de modă'],
'Arhitectură și oraș':['Arhitectură','Arhitectură · Urban · Patrimoniu','Fotografie arhitecturală'],
'Peisaj și natură':['Natură','Peisaj · Natură','Peisaj · Natură · Etnografie','Wildlife · Natură','Mediu și climat'],
'Fotografie românească':['Fotografie contemporană RO','Fotografie istorică RO','România — perspectivă externă'],
'Istoria fotografiei':['Istoria fotografiei','Istoria artei','Arhivă fotografică'],
'Teorie și eseu':['Teorie contemporană','Teorie · Eseu · Critică RO','Texte fundamentale','Filozofie · Ontologie','Limbaj vizual','Studii și analize'],
'Tehnică și practică':['Tehnica fotografică','Compoziție','Lumină și iluminat','Culoare și ton','Fotografie digitală','Educațional','Creativitate și practică','Fotografia de produs','Portret — tehnică'],
'Artă contemporană':['Albume artă contemporană','Artă contemporană','Fotografie experimentală','Reviste de artă'],
'Fotografie și alte arte':['Fotografie · Arte · Film','Fotografie și arte plastice','Fotografie și cinema','Fotografie și literatură'],
'Muzică și spectacol':['Fotografie și muzică','Muzică · Spectacol'],
'Sport':['Sport'],
'Premii și concursuri':['Colecții · Premii','Hasselblad Awards','Saloane naționale','World Press Photo'],
'Lucrări de referință':['Dicționar · Referință'],
'Asia':['Asia'],'Africa și Orientul Mijlociu':['Africa · Orient Mijlociu'],'America de Nord':['America de Nord'],'Europa':['Europa'],
'Festivaluri':['Arles','Alte festivaluri'],
}
DROP={'Diverse','Alte reviste foto','FUTURES Platform','Știință vizuală','David Goldblatt','E.O. Hoppe',
 # nume de fotografi și titluri de reviste: au deja filtrele lor (autori, serie)
 'Bruce Gilden','Nan Goldin','Steve McCurry','Sophie Calle','Tom Sandberg','Walker Evans','Wolfgang Tillmans','Paco Poyato','Cecil Beaton',
 'Aperture','Foam','Purple','Vogue','Reviste românești','Reviste de istorie','OFF Academy'}
MAP={old:new for new,olds in M.items() for old in olds}
EXTRA={'Portret — tehnică':['Portret'],'Stradă — tehnică':['Tehnică și practică'],'Fotojurnalism — teorie':['Teorie și eseu'],'Peisaj · Natură · Etnografie':[],'Istoria fotografiei de modă':['Istoria fotografiei'],'World Press Photo':['Fotojurnalism']}
def conv(tags):
    out=[]
    for t in tags:
        if t in DROP: continue
        for n in [MAP.get(t,t)]+EXTRA.get(t,[]):
            if n not in out: out.append(n)
    return out
if __name__=='__main__':
    P='/home/claude/proto/books2.json'; B=json.load(open(P)); unk=set()
    for b in B:
        for t in b['tags']:
            if t not in MAP and t not in DROP and t not in M: unk.add(t)
        b['tags']=conv(b['tags'])
    json.dump(B,open(P,'w'),ensure_ascii=False)
    from collections import Counter
    c=Counter(t for b in B for t in b['tags']); print(len(c),'teme', 'necunoscute:',unk); print(c.most_common())
