# M9a Part 3 · devam 2 (yeni session; 9 Eki akşam devir)

Bu dosya önceki session'ın devridir. Eski notlar `YENI-YUZ-part3-devam.md`'de (tarihçe); **bu dosya güncel olandır**. Çelişkide git doğrudur.
Ortak talimat `YENI-YUZ-kod.md`; uygulayıcı ajan talimatı `ajan-brief.md` (ajanlara bunun yolunu ver).

## Yeni session prompt'u
```
oturum-baslat. Toplu mod. M9a PART 3 · devam 2. Önce plan/oturum-promptlari/YENI-YUZ-part3-devam-2.md'yi oku ve "İlk adımlar"ı uygula.
Paralel: en çok 3 uygulayıcı ajan (her biri plan/oturum-promptlari/ajan-brief.md ile); her PR'a inceleme ajanı; düzeltmeden sonra kısa
doğrulama incelemesi; birleştirmeden önce `gh pr update-branch`; göçlü PR'lar tek tek. Bitiş: Part 3 ÇIKIŞ + özet + Part 4 prompt'u.
```

## İlk adımlar
1. `git fetch` · `gh pr list --state open` · aşağıdaki tablodaki her PR'ın durumu (`gh pr view <n> --json state,mergeable`). Ana checkout ayrık HEAD = `origin/main`.
2. Önceki session'ın ajanları yoktur: açık PR'ların incelemesini yeniden başlat ya da bulgularını (aşağıda) yeni ajanlara ver.
3. Ajan worktree'leri `.claude/worktrees/agent-*` (önceki session) — dalları push'lu; temizse ve PR'ı birleşmişse `git worktree remove`.
4. Disk ≥ 5 GB mı (`df -h ~`); değilse npm/jest önbelleği.

## Açık PR'lar (devir anı)
| PR | Kart | Durum | Yapılacak |
|---|---|---|---|
| #523 | K-1008 özette hareket değişimi | düzeltildi, auto-merge'de (CI'daki yeni API testleri) | birleşmediyse CI'a bak |
| #527 | K-972 P2 End/Finish/Fill later/Discard (+pausedSeconds, Health aktif süre) | inceleme sürüyordu (sonucu kayıp olabilir) | yeniden incele: SYNCED atma sonrası Undo'nun yeni seans olarak yeniden gönderilmesi (çift kayıt? hedefler? Health iki kez?), "fill later" + 24 sa otomatik kapanış |
| #519 | K-978 PR1 `/call` ekranı | 5 bulgu düzeltmesi ajandaydı | doğrula: 409'da yeniden okuma, consent/subscription/404 metinleri, geçmiş APPLIED geçmiş zaman + geri etiketi, Keep/Use duyurusu, Hero okunda çift push |
| #524 | K-969 Bu hafta kartı `sessionState`'e | **incelenmedi** | incele (iki kart aynı "önce telefon" kuralı; bayat kopyada telefonun günü) |
| #525 | K-997 ilk hafta bütçesi (göçsüz) | 3 bulgu düzeltmesi ajandaydı | doğrula: protein/left API testi, `startingTarget`/`startingTargets` tek yöntem + age<1'de 404, `@Transactional(readOnly)` |
| #526 | K-993 plan görüldü (V47) | 3 bulgu düzeltmesi ajandaydı | doğrula: **ilk karardan sonra plan-seen no-op + firstDay karar varken planSeen'i yok sayar**, D tablosu API testleri, `onboarded_at`/`plan_seen_at` dışa aktarımda |
| #503 | infra/502 | başka oturumun | dokunma |
Dallar (PR'sız, push'lu): `decision/514-call-fields` (K-1000, sözleşme + motor commit'leri; ajan devam ediyordu) · `mobile/433-edit-days-moves` (K-970 Days/Moves; başlanmış olabilir).

## Kalan iş (sırayla)
1. Açık PR'ları birleştir (göç sırası: **V47 #526**, sonra V48 gerekirse K-1000).
2. **K-1000** (karar ekranı sunucu alanları: `Decision.changes[]`, `inForce`, `Reason` olguları, varsayılan uygulanır (ADR-077 #3 B11, sunucu cevap anında), 1. hafta `suggested` günleri, `observationDays`) → **K-978 PR2** (değişenler, `decision.rule.<rule>.short` kısa nedenler, 1. hafta + w1change, gün kaydı PATCH ile; `checkin` 30 ve `call` 45 kelime bütçesi).
3. **K-972 P4** swap (seans içi, `PlannedExercise.swapOptions`, TODAY, çevrimiçi) → **K-973** (Too heavy, kalibrasyon: boş kilo "Pick a weight", "Starting weight found"; analiz satırı — düzelt/sil/atla sonrası yeniden hesap da burada; kardiyo son adımı Done/Later/Skip; "Beat last time X · Last X" çelişkisi).
4. **K-970 Days/Moves** düzenleme (`ProgramEditor` + `PATCH /v1/program`; aralık değişince hedef gider — kullanıcıya söyle; Undo `review.edits` + `/v1/program/review/undo {changeId}`).
5. Telefon parçaları: **K-997** (Bu hafta yemek satırı ilk haftada `/v1/days/{day}/budget`'tan; #501'in geçici `/v1/targets/starting` yolu kalkar) · **K-993** (onboarding planı ilk gösterimde bir kez `PUT /v1/profile/plan-seen`, sonra `/v1/first-weeks` yeniden) · **K-974 "What moved"** (#523 birleşince; düşüş negatif `by`, sakin metin U7).
6. Part sonu: **6 personalı kullanıcı-gözü yürüyüşü** (`prototip/kullanici-testi.md` yöntemi) simülatör düzeneğiyle → bulgular → **Part 3 ÇIKIŞ** (DURUM › M9a ilerleme; backlog status; `sync_backlog --apply`).
- Part 4'e kalan: K-999 (sunucuda açık seansa dönüş), K-979 (İlerleme; K-988 `weightChange.direction` cümlesi burada), split seçimi (Levent).

## Levent'e (part sonu AskUserQuestion)
1. **Split seçimi** (K-995): her gün sayısının tek şablonu var; gerçek seçim yeni koçluk şablonu ister. Yapılsın mı, ne zaman?
2. **Koç soruları (K-520) ve ilk haftalar risk mesajı (K-521)** yeni Bu hafta'da yüzeysiz (ADR-077 #1 tek kahraman). Kalksın mı (ADR eki), yer mi?
3. K1 listesi (onaylandıktan sonra yeni çıkanlar; hafıza `k1-adr-test-degisikligi`).
4. Bilgi: Bu hafta "Allow" rızayı doğrudan vermiyor, Ayarlar'a götürüyor · dinlenme ileri sayıyor (2:00-3:00, G1 K-49), düğme "Ready" · ADR-075 Ek 3/4/5 (seans başlangıcı Start anı; atma ve duraklama; rekor haptiği Part 4 derlemesinde `expo-haptics`) · ADR-072 Ek 2, ADR-073 Ek 5-7, ADR-077 Ek 3, ADR-078 Ek 1.

## Simülatör düzeneği (repoya girmez)
`../keel-sim` worktree + `../keel-sim/.sim/` (fixture.js 8790, Metro 8081; `run.sh <dal> [senaryo]`, `scenario.sh <ad>`, `shot.sh`, `theme.sh light|dark`, `validate.py`).
Senaryolar: beginner-w1, regular-w12-mon, regular-midweek, regular-short-today, regular-moved, open-session, no-consent, own-program, returning.
Sekme dokunuşu: y≈895 pt (This week x 73, Train x 219, Progress x 365). Geliştirme menüsündeki "Tools button" Edit/Settings'i örtebilir.
Fikstür yeni uçları (PATCH, plan-seen, budget ilk hafta, summary.moves, weightChange, Decision.changes) henüz bilmiyor → yürüyüşten önce güncelle (sözleşmeden, `validate.py` ile).

## Cihaz turuna (K-984) bakılacaklar
- Seans: aktif set iPhone SE'de (667pt) ilk görünümde tam mı; 375pt'de "102.5"; klavye "Log set"i örtmüyor mu.
- Seyahat: telefon gece yarısını geçip sunucunun `today`'i geçmediyse bekleyen finish "done" sayılmıyor; sonraki telefon gününde sürdürülen seans kısa sürüm/swap'ı kaybeder.

## Bu part'ın dersi (Part 4'e uygula)
Ekran işine başlamadan **prototip ↔ sözleşme boşluk taraması**: her ekranın gösterdiği her sayı/durum için sözleşmede alan var mı? Bu part'ta 7 arka uç kartı (K-995, K-997, K-998, K-999, K-1000, K-1008, K-996) işin ortasında çıktı ve ekran PR'larını bekletti.

## K-972 / K-973 devir notları (K-971 ajanı)
- #520 birleşti. **#527**'yi main'e taşı: `git rebase --onto origin/main fa99f2d8 mobile/435-session-end`.
- **P4 swap planı (kod yok):** seans içi swap tamamen telefonda (sunucunun TODAY swap'ı başlamış seansta 409; sözleşme "swaps in the session itself"). Hareket başlığında "Swap"; seçenekler `PlannedExercise.swapOptions` (oturumdakiler hariç; planlı hareket ilk sırada = geri dönüş). Seçilen hareket aynı sets/reps/targetRir, hedefsiz (nextLoadKg, nextReps, lastBestSet, lighter/heavier, calibrationStepKg yok — sunucunun TODAY swap kuralının aynası). kv `train.swaps` workout başına (envanter, çıkışta forget, start() kalıcılığı — skips gibi); geri al; eski hareketin setleri extraIds ile görünür. Testler: başka id ile log, yeniden açılış, geri dönüş, çevrimdışı, seçenek yoksa bağlantı yok.
- **K-973 notları:** "Pick a weight" boş kiloda; `stepLoad(null, +1)` salonda boş bar, salon yoksa set_load_step → "ilk dokunuş boş bar / en hafif dambıl"; kilo seçilmeden Log set kapalı. Analiz satırı plans'tan türerse düzelt/sil/atla ile kendiliğinden yenilenir (K-972'den taşındı). "Too heavy?" yeri Skip'lere yakın olmamalı (karar ver). Son hareketten sonra dock'ta "Finish workout" yerine "Next: cardio" (EndSheet aynen). Sunucu düzeltilmiş SYNCED seti sona ekliyor (ProgressReads sırası) — analiz sunucu sırasına bakarsa fark. `calibrationNext`, `loadSteps.within/lighter` hazır.
