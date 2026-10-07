import json,os,numpy as np,datetime,collections,warnings
warnings.filterwarnings('ignore')
from PIL import Image
from skimage.color import rgb2lab, lab2rgb, deltaE_ciede2000
SP=os.path.dirname(os.path.abspath(__file__))
def load(fn,w=96):
    im=Image.open(fn).convert('RGB'); h=int(im.height*w/im.width); im=im.resize((w,max(h,1)))
    return rgb2lab(np.asarray(im)/255.0).reshape(-1,3)
def stats(lab):
    L,a,b=lab[:,0],lab[:,1],lab[:,2]; C=np.hypot(a,b); H=(np.degrees(np.arctan2(b,a))+360)%360
    return L,C,H
def kmeans(X,k=4,it=12,seed=0):
    rng=np.random.default_rng(seed); 
    if len(X)<k: return X, np.ones(len(X))
    c=X[rng.choice(len(X),k,replace=False)]
    for _ in range(it):
        d=((X[:,None,:]-c[None])**2).sum(-1); l=d.argmin(1)
        for j in range(k):
            if (l==j).any(): c[j]=X[l==j].mean(0)
    w=np.bincount(l,minlength=k)/len(X); return c,w
def hexof(lab):
    rgb=np.clip(lab2rgb(lab.reshape(1,1,3)).reshape(3),0,1); return '#%02X%02X%02X'%tuple((rgb*255).round().astype(int))
BINS=24
def hue_hist(C,H,cmin):
    m=C>cmin; h=np.zeros(BINS)
    if m.any(): np.add.at(h,(H[m]//(360/BINS)).astype(int)%BINS,C[m])
    return h
out={'store':{},'ads':{},'ads_long':{},'ads_short':{}}
# App Store screenshots: in-app look
smeta=json.load(open(f'{SP}/store-meta.json')); by=collections.defaultdict(list)
for m in smeta:
    fn=f'{SP}/store/{m["file"]}'
    if os.path.exists(fn): by[m['app']].append(load(fn))
storeacc={}
for app,labs in by.items():
    X=np.vstack(labs); L,C,H=stats(X)
    light=(L>85).mean(); dark=(L<22).mean(); vivid=X[C>40]
    cents,w=kmeans(vivid,4) if len(vivid)>50 else (np.empty((0,3)),np.array([]))
    order=np.argsort(-w); acc=[(hexof(cents[i]),round(float(w[i])*float((C>40).mean())*100,1)) for i in order if w[i]>0.12]
    storeacc[app]=[cents[i] for i in order if w[i]>0.12]
    out['store'][app]={'light%':round(light*100),'dark%':round(dark*100),'vivid%':round((C>40).mean()*100,1),'accents':acc}
# Ads: brand + longevity
meta=json.load(open(f'{SP}/ads-meta.json')); today=datetime.date(2026,10,7)
grp=collections.defaultdict(list); longs=collections.defaultdict(list)
allhist=np.zeros(BINS); longhist=np.zeros(BINS); shorthist=np.zeros(BINS); recs=[]
for m in meta:
    fn=f'{SP}/ads/{m["file"]}'
    if not os.path.exists(fn): continue
    try: lab=load(fn,72)
    except Exception: continue
    L,C,H=stats(lab)
    try: days=(today-datetime.date.fromisoformat(str(m['start'])[:10])).days
    except Exception:
        try: days=(today-datetime.datetime.utcfromtimestamp(int(m['start'])).date()).days
        except Exception: days=None
    h=hue_hist(C,H,45); allhist+=h
    rec={'brand':m['brand'],'days':days,'meanL':float(L.mean()),'dark':float((L<22).mean()),'light':float((L>85).mean()),'vivid':float((C>45).mean()),'h':h}
    recs.append(rec); grp[m['brand']].append(rec)
    if days is not None and days>=90: longhist+=h
    elif days is not None: shorthist+=h
def summ(rs):
    if not rs: return {}
    return {'n':len(rs),'meanL':round(np.mean([r['meanL'] for r in rs]),1),'dark%':round(100*np.mean([r['dark'] for r in rs]),1),'light%':round(100*np.mean([r['light'] for r in rs]),1),'vivid%':round(100*np.mean([r['vivid'] for r in rs]),1)}
for b,rs in grp.items():
    out['ads'][b]=summ(rs); hh=sum(r['h'] for r in rs); top=np.argsort(-hh)[:2]
    out['ads'][b]['topHues']=[int(i*15) for i in top if hh[i]>0]
L_=[r for r in recs if r['days'] is not None and r['days']>=90]; S_=[r for r in recs if r['days'] is not None and r['days']<90]
out['ads_long']=summ(L_); out['ads_short']=summ(S_)
norm=lambda h:(h/h.sum()*100).round(1).tolist() if h.sum() else []
out['hue_all']=norm(allhist); out['hue_long']=norm(longhist); out['hue_short']=norm(shorthist)
# candidate sweep: accent fills at L=45 C=60 (white text AA) around the wheel; distance to competitor in-app accents
comp=[c for v in storeacc.values() for c in v]
def mindist(lab):
    return min(float(deltaE_ciede2000(lab.reshape(1,3),c.reshape(1,3))[0]) for c in comp) if comp else None
def lab_of(hexs):
    r=np.array([int(hexs[i:i+2],16) for i in (1,3,5)])/255.0; return rgb2lab(r.reshape(1,1,3)).reshape(3)
cands={'RUBIN #B0129A':'#B0129A','SAHA #0B7F05':'#0B7F05','Strava #FC5200':'#FC5200'}
out['cand']={k:{'minDE_inapp':round(mindist(lab_of(v)),1),'hueDensity_ads%':round(float(norm(allhist)[int(((np.degrees(np.arctan2(lab_of(v)[2],lab_of(v)[1]))+360)%360)//15)]),1)} for k,v in cands.items()}
sweep=[]
for hdeg in range(0,360,15):
    a=60*np.cos(np.radians(hdeg)); b=60*np.sin(np.radians(hdeg)); lab=np.array([48.0,a,b])
    rgb=lab2rgb(lab.reshape(1,1,3)).reshape(3)
    if (rgb<0).any() or (rgb>1).any(): 
        lab=np.array([48.0,a*0.75,b*0.75])
    sweep.append({'hue':hdeg,'hex':hexof(lab),'minDE_inapp':round(mindist(lab),1),'adDensity%':norm(allhist)[hdeg//15],'longDensity%':norm(longhist)[hdeg//15] if longhist.sum() else None})
out['sweep']=sweep
json.dump(out,open(f'{SP}/result.json','w'),indent=1,default=float)
print('STORE'); [print(f'  {k:16s} light {v["light%"]:3d}% dark {v["dark%"]:3d}% vivid {v["vivid%"]:5}%  accents {v["accents"]}') for k,v in out['store'].items()]
print('ADS'); [print(f'  {k:16s} {v}') for k,v in out['ads'].items()]
print('LONG(>=90d)',out['ads_long']); print('SHORT(<90d)',out['ads_short'])
print('HUE all  ',out['hue_all']); print('HUE long ',out['hue_long'])
print('CAND',out['cand'])
print('SWEEP'); [print('  ',s) for s in sweep]
