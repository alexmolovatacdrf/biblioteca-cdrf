import json,os,sys
from PIL import Image
import numpy as np
def bbox(im,thr=28,frac=0.015):
    a=np.asarray(im.convert('RGB')).astype(int); H,W,_=a.shape
    border=np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3),a[:,:4].reshape(-1,3),a[:,-4:].reshape(-1,3)])
    bg=np.median(border,axis=0)
    # border must be fairly uniform to count as background
    if np.abs(border-bg).sum(1).mean()>25: return None
    d=np.abs(a-bg).max(2)>thr
    cols=np.where(d.mean(0)>frac)[0]; rows=np.where(d.mean(1)>frac)[0]
    if len(cols)==0 or len(rows)==0: return None
    x0,x1,y0,y1=cols[0],cols[-1]+1,rows[0],rows[-1]+1
    if (x1-x0)*(y1-y0) > 0.97*W*H: return None
    return (x0,y0,x1,y1)
if __name__=='__main__':
    print('ok')
