// Prototip akış testi (tur 3). Yerel önizlemede (yeni-yuz.html, doctype sarmalı) tarayıcı konsolunda ya da javascript aracında çalıştır.
// Sonuç: { fails, errs, steps, done }. Beklenen: fails [] ve errs [].
(async () => {
const errs=[]; window.addEventListener('error',e=>errs.push(e.message));
const app=document.getElementById('app'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const scr=()=>(document.getElementById('pb-name').textContent.match(/#([\w-]+)/)||[])[1];
const log=[]; const fails=[];
async function click(sel,wait=80){const el=app.querySelector(sel); if(!el) throw new Error('missing '+sel+' on '+scr()); el.click(); await sleep(wait);}
function expect(id){ if(scr()!==id) throw new Error(`expected ${id}, got ${scr()}`); log.push(id);}
function open(id,sc){document.querySelector(`#flows .item[data-open="${id}"][data-sc="${sc}"]`).click();}
async function flow(name,fn){ try{ await fn(); log.push('✓ '+name);}catch(e){fails.push(name+': '+e.message);} }
async function runWorkout(){ let g=0; while(scr()==='workout' && g++<40){ if(app.querySelector('[data-act=logset]')) await click('[data-act=logset]'); else if(app.querySelector('[data-act=nextmove]')) await click('[data-act=nextmove]'); else break; } }
await flow('A', async()=>{ open('welcome','d1'); await sleep(80); expect('welcome'); await click('[data-act=signin]'); expect('ob-goal');
 await click('[data-act=pick][data-val=decide]',400); expect('ob-exp'); await click('[data-act=pick][data-val=new]',400); expect('ob-program');
 await click('[data-act=pick][data-val=build]',400); expect('ob-days'); await click('[data-act=daysn][data-val="3"]',400); expect('ob-consent');
 await click('[data-act=consent][data-val=yes]'); expect('ob-about'); await click('[data-act=obgo][data-val=ob-about]'); expect('ob-activity');
 await click('[data-act=pick][data-val=LOW_ACTIVE]',400); expect('ob-preparing'); await sleep(3600); expect('ob-plan');
 if(!app.textContent.includes('Session 1 finds your weights')) throw new Error('beginner plan has no weights note');
 await click('[data-go=paywall]'); expect('paywall'); await click('[data-act=trial]',1300); expect('home');
 await click('[data-go=workout]'); expect('workout'); await runWorkout(); if(!app.textContent.includes('Cardio, easy')) throw new Error('no cardio step');
 await click('[data-act=cardio][data-val=done]'); await click('.dock [data-go=summary]',150); expect('summary');
 await click('[data-go=share]'); expect('share'); await click('[data-act=tpl][data-val=pr]'); await click('[data-act=back]'); expect('summary'); await click('[data-act=home]'); expect('home'); });
await flow('A2', async()=>{ await click('[data-act=plus]'); expect('plus'); await click('[data-act=toweigh]'); expect('weigh'); await click('[data-act=saveweigh]'); expect('health-jit');
 await click('[data-act=health][data-val=no]',200); expect('home'); await click('[data-go=meal]'); expect('meal'); await click('[data-act=logmeal]'); expect('home'); });
await flow('A3', async()=>{ await click('[data-tab=progress]'); expect('progress'); await click('.tgt[data-go=meal]'); expect('meal'); await click('[data-act=back]'); expect('progress'); });
await flow('A4', async()=>{ open('checkin','d1'); await sleep(80); expect('checkin'); await click('[data-act=w1feel][data-val=right]'); await click('[data-act=reveal]'); expect('week1');
 await click('[data-act=sheet][data-val=w1change]'); expect('w1change'); await click('[data-act=w1set][data-val=three]'); expect('week1'); await click('[data-act=home]'); expect('home'); });
await flow('B', async()=>{ open('welcome','d1'); await sleep(80); await click('[data-act=signin]'); await click('[data-act=pick][data-val=decide]',400); await click('[data-act=pick][data-val=exp]',400);
 await click('[data-act=pick][data-val=own]',400); expect('ob-own'); await click('[data-act=ownsrc][data-val=import]',1500); expect('ob-review');
 app.querySelector('#rv-chest').click(); await sleep(80); if(!app.textContent.includes('2 changes')) throw new Error('toggle count');
 await click('[data-act=revgo]'); expect('ob-consent'); await click('[data-act=consent][data-val=yes]'); await click('[data-act=obgo][data-val=ob-about]'); await click('[data-act=pick][data-val=ACTIVE]',400); expect('ob-weights');
 await click('[data-act=lw][data-val="bench,2.5"]'); await click('.dock [data-act=obgo][data-val=ob-weights]'); expect('ob-preparing'); await sleep(3600); expect('ob-plan');
 await click('[data-go=paywall]'); await click('[data-act=trial]',1300); expect('train'); await click('[data-act=sheet][data-val=today]'); expect('today'); await click('[data-act=todaychg][data-val=short]'); expect('train');
 await click('[data-act=sheet][data-val=editprog]'); expect('editprog'); app.querySelector('.sheetwrap').click(); await sleep(80); expect('train'); await click('[data-act=swapfrom]'); expect('swap'); await click('[data-act=swapto]'); expect('train'); });
await flow('C1', async()=>{ open('home','w12'); await sleep(80); await click('[data-go=call]'); expect('call'); await click('[data-act=keepw12]'); await click('[data-act=home]'); expect('home'); });
await flow('C2', async()=>{ open('home-mon','w12'); await sleep(80); await click('.ritual [data-go=checkin]'); expect('checkin'); await click('[data-act=ci][data-val=up]'); await click('[data-act=reveal]'); expect('call'); });
await flow('C3', async()=>{ open('train','w12'); await sleep(80); await click('.dock [data-go=workout]'); expect('workout'); await click('[data-act=heavy]'); await click('[data-act=drop]'); await click('[data-act=logset]');
 if(!app.querySelector('.restslot .restpill')) throw new Error('no rest'); await click('.donerow'); expect('editset'); await click('[data-act=eadj][data-val="reps,1"]'); await click('[data-act=closesheetbtn]'); expect('workout');
 await click('[data-act=skipset]'); await click('[data-act=skipmove]'); await click('[data-act=pausewo]'); if(!app.querySelector('.pausebar')) throw new Error('no pause'); await click('.pausebar [data-act=pausewo]');
 await click('[data-act=sheet][data-val=endwo]'); expect('endwo'); await click('[data-act=endchoice][data-val=later]'); expect('home'); });
await flow('C4', async()=>{ open('workout','w12'); await sleep(80); for(let i=0;i<3;i++) await click('[data-act=logset]'); if(app.querySelector('.restslot .restpill')) throw new Error('rest after last set'); if(!app.querySelector('[data-act=nextmove]')) throw new Error('no next'); });
await flow('D', async()=>{ open('return','w12'); await sleep(80); await click('[data-act=ret][data-val=pickup]'); await click('[data-act=retgo]'); expect('home');
 open('life','w12'); await sleep(80); await click('[data-act=lk][data-val=sick]'); await click('[data-act=pause]'); expect('home');
 open('settings','w12'); await sleep(80); await click('[data-act=mode][data-val=dark]'); if(document.getElementById('phone').dataset.mode!=='dark') throw new Error('theme'); await click('[data-act=mode][data-val=light]');
 open('progress','w12'); await sleep(80); await click('[data-act=lift][data-val=bench]'); if(!app.textContent.includes('Held this week')) throw new Error('lift switch'); });
console.log({fails, errs, steps: log.length, done: log.filter(x=>x.startsWith('✓'))});
return {fails, errs, steps: log.length, done: log.filter(x=>x.startsWith('✓'))};
})();
