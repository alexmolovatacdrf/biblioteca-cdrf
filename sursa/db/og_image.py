# Imaginea de previzualizare a unei cărți (1200×630) pentru WhatsApp, Facebook, Messenger etc.
# Fundal: degradeul de la panouri (--band → alb), text în stânga, coperta întreagă (nedecupată) în dreapta.
from PIL import Image, ImageDraw, ImageFont, ImageFilter
F='/usr/share/fonts/opentype/inter/'
W,H=1200,630
BAND=(0xe7,0xea,0xe8)
def _grad():
    im=Image.new('RGB',(W,H),'white'); px=im.load()
    for x in range(W):
        t=min(1,max(0,(x/W-0.18)/0.45)); c=tuple(int(BAND[k]+(255-BAND[k])*t) for k in range(3))
        for y in range(H): px[x,y]=c
    return im
_G=None
def wrap(d,text,font,maxw,maxl):
    words=text.split(); lines=[]; cur=''
    for w in words:
        t=(cur+' '+w).strip()
        if d.textlength(t,font=font)<=maxw: cur=t
        else:
            if cur: lines.append(cur)
            cur=w
    if cur: lines.append(cur)
    if len(lines)>maxl:
        lines=lines[:maxl]; last=lines[-1]
        while d.textlength(last+'…',font=font)>maxw and ' ' in last: last=last.rsplit(' ',1)[0]
        lines[-1]=last+'…'
    return lines
def make(cover_path,title,people,meta,out):
    global _G
    if _G is None: _G=_grad()
    im=_G.copy(); d=ImageDraw.Draw(im)
    # coperta în dreapta
    cv=Image.open(cover_path).convert('RGB'); mh=H-120; mw=430
    r=min(mh/cv.height,mw/cv.width); cv=cv.resize((max(1,int(cv.width*r)),max(1,int(cv.height*r))),Image.LANCZOS)
    cx=W-70-cv.width; cy=(H-cv.height)//2
    sh=Image.new('RGBA',(cv.width+80,cv.height+80),(0,0,0,0)); sd=ImageDraw.Draw(sh); sd.rectangle([40,48,40+cv.width,48+cv.height],fill=(0,0,0,70)); sh=sh.filter(ImageFilter.GaussianBlur(18))
    im.paste(sh,(cx-40,cy-40),sh); im.paste(cv,(cx,cy))
    # textul în stânga
    x=70; maxw=cx-70-x
    f_small=ImageFont.truetype(F+'Inter-Medium.otf',22); f_t=ImageFont.truetype(F+'Inter-SemiBold.otf',52); f_p=ImageFont.truetype(F+'Inter-Regular.otf',32); f_m=ImageFont.truetype(F+'Inter-Regular.otf',24)
    tl=wrap(d,title,f_t,maxw,3)
    if len(tl)==3 and d.textlength(title,font=f_t)>maxw*2.6: f_t=ImageFont.truetype(F+'Inter-SemiBold.otf',44); tl=wrap(d,title,f_t,maxw,3)
    pl=wrap(d,people,f_p,maxw,2) if people else []
    ml=wrap(d,meta,f_m,maxw,1) if meta else []
    lh_t=int(f_t.size*1.18); lh_p=int(f_p.size*1.3)
    total=len(tl)*lh_t+(14+len(pl)*lh_p if pl else 0)+(18+30 if ml else 0)
    y=(H-total)//2+10
    d.text((x,70),'BIBLIOTECA CdRF',font=f_small,fill=(90,95,92))
    for l in tl: d.text((x,y),l,font=f_t,fill=(20,20,22)); y+=lh_t
    if pl:
        y+=14
        for l in pl: d.text((x,y),l,font=f_p,fill=(60,63,62)); y+=lh_p
    if ml: y+=18; d.text((x,y),ml[0],font=f_m,fill=(120,124,122))
    im.save(out,'JPEG',quality=82,optimize=True,progressive=True)
