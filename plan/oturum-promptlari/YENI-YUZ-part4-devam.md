# M9a Part 4 · devam (15 Eki — token sınırında durdu)

> Hafıza: `DURUM.md › ## M9a ilerleme › Part 4 başı` (tablo + K1 listesi + Levent soruları). Ortak talimat `YENI-YUZ-kod.md`, ajan talimatı `ajan-brief.md`.

## Durum (main `b2475301`+, son göç V49)
Birleşen (14-15 Eki, 34 PR): #546 #548 #549 #550 #557 #558 #559(V48) #560 #561 #562 #563 #564 #565 #566 #567(V49) #568 #569 #570 #571 #572 #573 #574 #575 #576 #578 #579 #580 #581.
Kart: done K-1013 K-1014 K-1009 K-978 K-999 K-1016..K-1026 K-982 K-980 K-981 K-975 K-1025; K-977 → M11 (Levent).

## Açık iş (önce bunları bitir)
1. **#577 K-979 İlerleme B** — inceleme + düzeltmeler tamam, auto-merge açık; CI bekliyordu. Birleşmediyse `gh pr checks 577`, kırmızıysa log → düzelt.
2. **K-979 kardiyo kutusu takip PR'ı** — #577 birleşince: `mobile/442-progress-cardio-box`, İlerleme Cardio kutusu `/plus` → `/cardio` (tek satır + test). Açılmadıysa sen aç.
3. **#582 K-976 Instagram Story** — inceleme bitti: engelleyici bulgu (modül seviyesinde import → native modülsüz dev build açılışta çöker) + `parseAppId` sayısal değil → undefined; düzeltme ajana gönderildi (lazy require, `ShareModuleMissing` → sistem sayfası). Push edilmiş mi bak (`gh pr view 582`); edilmediyse sen yap ve kısa doğrula. **Tur 4 bitmeden birleştirme** (simülatördeki dev build'de modül yok). Worktree `.claude/worktrees/agent-ac625ad58e6a98c17` içinde 838 MB gerçek node_modules var → iş bitince worktree'yi sil.
4. **K-910 (#581 birleşti, `Refs #412`)** — kart açık kalır; Kalın Metin'de doğrulama Tur 4 + K-984.
5. Dependabot #547 (setup-node ara sürüm) beklemede (ADR-019 #6).

## Sıradaki büyük iş: kullanıcı-gözü yürüyüşü Tur 4
Tek ajan (simülatörün tek kullanıcısı) ya da düzenleyici: `../keel-sim/.sim/` (run.sh, scenario.sh, fixture.js, validate.py). Önce fikstüre yeni alanlar: `Program.canAddDay`, `Decision.nextCallOn`, `changes[] MOVE` (held_move), `Consistency.weeks[]`, `GET /v1/weigh-ins/summary`, `StartingTarget.proteinG/stepsPerDay`, `DayBudget.targetProteinG`, `ProgramCardio.loggedDays/loggedToday`, `DELETE /v1/cardio-sessions/{id}`, `GET/POST /v1/return`, `PUT /v1/state {days}`, `GET /v1/foods/recent`; `validate.py` ile sözleşmeye karşı doğrula. Ekranlar: İlerleme (ilk gün / 12. hafta / rızasız), tartı + Health kartı, öğün Recent, '+ › Cardio' + Undo, Dönüş (8 gün / 22 gün / rızasız) + Life (rızasız Sick → rıza adımı), Ayarlar, paylaşım (Story hariç), K-1013 maddeleri (süperset, Edit uyarısı, 1. hafta gün ekle, hero), başka cihazda açık seans; iki tema; **Kalın Metin açık** (K-910). Bulgular `prototip/kullanici-testi.md › Tur 4` + kart.
Sonra: #582 birleşir → K-984 (TestFlight derlemesi; Levent cihaz turu: SE, onboarding planı, Pause, bayat/çevrimdışı, Story, Kalın Metin). K-984 K-983'e (Levent ASC) bağlı.

## Levent'e sorulacaklar (part sonunda, AskUserQuestion)
- K1 listesi (DURUM › Part 4 başı) toplu onay.
- İlerleme hero "Day 1." yerine "Today's targets." (ADR-078 #1; telefon gün sayamaz).
- Koç "The call stands until its next look" nextReview'u söylüyor, Hero nextCallOn — koç metni nextCallOn'a geçsin mi.
- İlerleme › Calls yalnız son 12 karar; daha eskisi için "Show older" gerekir mi.
- Paylaşım çıkartmasında panel (prototipte gölge) — cihazda bakılacak.
- Gizlilik metni: Story paylaşımında çıkartma ve seçilen foto/video kullanıcının dokunuşuyla Instagram uygulamasına gider — privacy.md'ye satır?
- privacy.md'ye bu partta eklenen satırlar (K-1021 durum bildirimi, K-1020 dönüş cevabı) yayında; onay metni sürüm 4.
- K-976 Facebook App ID (`EXPO_PUBLIC_FACEBOOK_APP_ID`, EAS ortam değişkeni) · K-983 ASC deneme.

## Bitiş
"Part 4 ÇIKIŞ = M9a ÇIKIŞ" (DURUM) + backlog sync + özet + sıradaki: M9 Part 3 (beta kohortu, K-904) prompt'u.

## Devam prompt'u
```
oturum-baslat. Toplu mod. M9a PART 4 devam: plan/oturum-promptlari/YENI-YUZ-part4-devam.md (önce "Açık iş" 1-5, sonra Tur 4, sonra K-984 hazırlığı ve ÇIKIŞ).
Ortak talimat YENI-YUZ-kod.md, ajan talimatı ajan-brief.md. Opus düzenleyici; uygulayıcı ve inceleme ajanları Sonnet (model: sonnet).
Paralel en çok 3 uygulayıcı (mobil jest ağır: yük 400'e çıktı, jest -w 1/2); her PR'a inceleme; birleştirmeden önce gh pr update-branch; göçlü PR'lar tek tek (sıradaki V50).
Bitiş: "Part 4 ÇIKIŞ = M9a ÇIKIŞ" + özet + Levent'e biriken sorular + sıradaki: M9 Part 3 (beta kohortu, K-904) prompt'u.
```
