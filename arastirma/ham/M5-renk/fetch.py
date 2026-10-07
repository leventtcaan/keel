import json,glob,re,os,datetime,urllib.request,concurrent.futures as cf,time
SP=os.path.dirname(os.path.abspath(__file__))
os.makedirs(f'{SP}/ads',exist_ok=True); os.makedirs(f'{SP}/store',exist_ok=True)
jobs=[]; meta=[]
for f in glob.glob(os.path.expanduser('~/.keel-research/apify/ds-*.json')):
    if 'totals' in f: continue
    brand=os.path.basename(f)[3:-5].replace('-kw','')
    d=json.load(open(f)); items=d if isinstance(d,list) else d.get('items',[])
    for it in items:
        sn=it.get('snapshot') or {}; aid=str(it.get('adArchiveID') or it.get('adArchiveId'))
        start=it.get('startDate'); active=it.get('isActive')
        cands=[]
        for v in (sn.get('videos') or []): cands.append(('video',v.get('videoPreviewImageUrl')))
        for im in (sn.get('images') or []): cands.append(('image',im.get('resizedImageUrl') or im.get('originalImageUrl')))
        for c in (sn.get('cards') or []): cands.append(('card',c.get('videoPreviewImageUrl') or c.get('resizedImageUrl') or c.get('originalImageUrl')))
        for k,(kind,u) in enumerate([c for c in cands if c[1]]):
            fn=f'{SP}/ads/{brand}_{aid}_{k}.jpg'
            if fn in [j[1] for j in jobs]: continue
            jobs.append((u,fn)); meta.append({'file':os.path.basename(fn),'brand':brand,'ad':aid,'kind':kind,'start':start,'active':active})
json.dump(meta,open(f'{SP}/ads-meta.json','w'))
ids=json.load(open(f'{SP}/appids.json'))
smeta=[]
for name,i in ids.items():
    try:
        r=json.load(urllib.request.urlopen(f'https://itunes.apple.com/lookup?id={i}&country=us',timeout=20))['results'][0]
    except Exception as e:
        print('lookup fail',name,e); continue
    for k,u in enumerate((r.get('screenshotUrls') or [])[:8]):
        u=re.sub(r'/[0-9]+x[0-9]+bb\.(png|jpg)$','/392x696bb.jpg',u)
        fn=f'{SP}/store/{name.replace(" ","_")}_{k}.jpg'; jobs.append((u,fn)); smeta.append({'file':os.path.basename(fn),'app':name,'idx':k})
json.dump(smeta,open(f'{SP}/store-meta.json','w'))
def get(job):
    u,fn=job
    if os.path.exists(fn): return 1
    for t in range(2):
        try:
            req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
            data=urllib.request.urlopen(req,timeout=25).read(); open(fn,'wb').write(data); return 1
        except Exception as e:
            time.sleep(1)
    return 0
with cf.ThreadPoolExecutor(8) as ex: ok=sum(ex.map(get,jobs))
print('jobs',len(jobs),'ok',ok,'ads',len(meta),'store',len(smeta))
