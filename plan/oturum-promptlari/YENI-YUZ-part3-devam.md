# M9a Part 3 · devam (9 Eki, Levent'in token sınırında duraklatıldı)

Aynı session'da sürer: düzenleyici (ana oturum) paralel ajanlarla. Hafıza `DURUM.md › ## M9a ilerleme › Part 3 başı` tablosu; çelişkide git doğrudur.
Ortak talimat `plan/oturum-promptlari/YENI-YUZ-kod.md`; uygulayıcı ajan talimatı scratchpad `brief.md` (yoksa bu dosyadaki "Ajan kuralları"ndan yeniden yaz).

## Devam ederken ilk adımlar
1. `git fetch` · `gh pr list --state open` · `gh pr view <n> --json state` (aşağıdaki PR'lar). Ana checkout ayrık HEAD = `origin/main`.
2. Duraklatılan dört uygulayıcı ajana (K-969, K-970, K-971, K-995) "devam" mesajı; her biri raporunu verdiyse oradan, vermediyse dalının son commit'inden.
3. Bekleyen iki inceleme (#505, #506) sonucunu işle → bulguları ilgili ajana.
4. Simülatör düzeneği: `../keel-sim` + scratchpad `sim/` (fixture 8790, Metro 8081). Süreçler öldüyse `sim/run.sh <dal> <senaryo>` yeniden kurar.

## PR'lar (duraklatma anı)
| PR | Görev | Durum | Sıradaki |
|---|---|---|---|
| #494 | K-969 şerit + kahraman | **10 madde düzeltildi**, aba8791d (main üstünde) | tam check + anayasa → birleştir |
| #501 | K-969 bugünün kartı + yemek | düzeltildi, 14158b03 (#494 üstünde; taban hâlâ #494 dalı) | #494 sonra taban main; tam check + anayasa + gövde. **40 kelime için verilen 5 metin kararı gözden geçirilecek** (karar bloğu başlığı kalktı; 5 karar başlığı kısaldı — karar ekranı ve paylaşım kartında da görünür; 'Moved to Saturday.'; 'Over by'/'Around target'; duraklatılmışta tek blok) |
| #500 | K-971 aktif set | **bütün bulgular düzeltildi**, son commit 65bd5d7c; #499'un eski ucu 0454f3f6 üstünde → `--onto origin/main` ile taşı | simülatörde SE (667pt) sığma ve 375pt'de '102.5' bak → birleştir → K-972'ye geç |
| #506 | K-970 Edit | **inceleme bitti, 5 bulgu ajana iletilecek:** (1 KRİTİK) Rebuild onay metni neyin silindiğini söylemiyor (hedefler, başlangıç ağırlıkları, haftanın değişiklikleri, OWN → GENERATED) ve seans sürerken açık; (2 KRİTİK) Apply/Undo sonrası eski veriyle işlem (`answer.program` hemen göster ya da reload bitene kadar busy); (3) 0/7 günde Rebuild sonsuz 'Try again' → sunucu reddinde doğru metin; (4) CallRow 409'da yenilenmiyor, `useProblem` yok, `decision.id`'ye bağlı değil; (5) zayıf testler. Simülatör (own-program) bakılmadı | bulgular → birleştir; PR 4 kardiyo ajanda |
| #505 | K-995 A (FULL/UNDO, Program.today, movedFrom/undoable/workout, V44) | **inceleme bitti, engelleyici yok; CI yeşil.** Ajana iletilecek: (1) FROM_NOW_ON swap + UNDO servis yolu için API testi (TODAY swap → MOVE → FROM_NOW_ON swap → UNDO); (2) `Program.weekOf` ekle (`TodayChanges.monday(today)`); küçük: FULL açıklamasında 'every exercise back', 'withoutWorkouts' testinde diğer seansların workout'u null doğrulansın | birleşince K-969/K-970'e "Undo + bitmiş seans + Continue sunucudan" ek PR |
| (dal) | K-995 C taşı önizlemesi `training/491-move-preview-c` 5590624a (#505 üstünde, göçsüz; `WeekSession.movePreview`, ADR-073 Ek 6) | push'lu, PR açılmadı | kalan: API testi, anayasa, gövde; A birleşince rebase + aç |
| — | K-995 B PATCH /v1/program | **kod yok, tasarım hazır** (ajanın raporu: tam program gövdesi kimliklerle; satır id korunur; hareket/tekrar değişirse hedef silinir, set değişirse kalır; `PlannedExercise.id`, `AppliedReviewChange.kind`; V45 `program_review_change.kind` REVIEW/EDIT + suggestion nullable) | C'den sonra |
| (dal) | K-970 PR 4 kardiyo `mobile/433-edit-cardio` b31d3d15 (#506 üstünde) | push'lu, **bilerek kırmızı** (8 ekran testi önce yazıldı) | kalan: Edit `?part=cardio` + index satırı, `editProgram.cardio.*` metinleri, check, PR |
| #503 | infra/502 | **başka oturumun**; dokunma | |

Birleşenler: #490 K-994 · #492 K-992 · #493 K-970 kart+Change · #495 K-970 swap · #497 oturum WeekSession'dan · #498 K-996 · #499 K-971 odak modu.

## Kalan sıra (Part 3)
K-969 bitir → K-970 PR 4 + K-995 ek PR → K-971 (#500) → **K-972 → K-973** (aynı ajan, aynı ekran) → K-974 → K-978 → K-988 → K-993 → K-997 →
K-995 B, C (taşı önizlemesi) → part sonu: 6 personalı kullanıcı-gözü yürüyüşü (`prototip/kullanici-testi.md` yöntemi, simülatör düzeneğiyle) → Part 3 ÇIKIŞ.

## Levent'e sorulacaklar (part sonunda toplu, AskUserQuestion)
1. **Split seçimi** (K-995): her gün sayısının tek şablonu var; gerçek seçim için yeni şablonlar (3 gün FB, 4 gün FB, 3 gün PPL…) koçluk içeriği. Yapılsın mı, ne zaman?
2. **Koç soruları (K-520) ve ilk haftalar risk mesajı (K-521)** yeni Bu hafta'da yüzeysiz kaldı (ADR-077 #1 tek kahraman). Kalksın mı (ADR eki), yoksa yer mi?
3. Bilgi: Bu hafta'daki "Allow" rızayı doğrudan vermiyor, Ayarlar'a (rıza metni) götürüyor (prototipte doğrudan veriyordu).
4. Bilgi: dinlenme sayacı ileri sayıyor, 2:00-3:00 bandı (G1 K-49); bitirme düğmesi "Ready".
5. Bilgi: ADR-075 Ek 3 (seans başlangıcı Start anı); K1 notu #505 (mevcut bir API testi daha sıkı hale geldi, gevşemedi).
6. Bilgi (K1): K-974'te `workout-screen.test.tsx` bitiş yönlendirmesi `/workout-summary` → `/workout-end` (ADR-075 #7 kutlaması eski özetin yerini aldı; beklenti gevşemedi). #510'da iki API testi önizlemeyi içerecek şekilde sıkılaştı. #515'te bir beklentinin tersine çevrilmesi **reddedildi** (açığı kilitliyordu).
7. Bilgi: yeni kartlar K-995, K-996, K-997, K-998, K-999 (sunucuda açık seansa dönüş), K-1000 (karar ekranı sunucu alanları; "varsayılan uygulanır" sunucuda), K-1008 (özette hareket başına değişim). Rekor haptiği Part 4 derlemesinde (`expo-haptics`, ADR-075 Ek 5).

## Ajan kuralları (brief.md özeti)
Ayrı worktree, ana checkout'a dokunmaz · node_modules sembolik bağ (npm ci yok, disk dar) · Docker yok: saf testler yerelde, DB testleri CI · simülatörü kullanmaz ·
TDD (assertion RED) · metin en.json, tire yok, kelime bütçesi · telefon kural/tarih işletmez · ≈≤400 satır, gerekirse PR'a böl · Conventional + (#issue), AI imzası yok ·
auto-merge yok (düzenleyici açar) · rapor: PR, kontroller, kabul ↔ test, kararlar, simülatör için uçlar/durumlar.
Süreç dersleri: yığılı PR + squash → üstteki PR'ı yalnız kendi commit'leriyle `origin/main`'e rebase; aynı anda en çok 3 uygulayıcı; birleştirmeden önce
`gh pr update-branch`; tam jest yük altında meal/onboarding zaman aşımına düşer → `-i` ya da `-w 2 --testTimeout=20000` ile yeniden.

## Cihaz turuna (K-984) bakılacaklar
- Seyahat: telefon gece yarısını geçip sunucunun `today`'i geçmediyse bekleyen finish 'done' sayılmıyor (Start görünür, sunucu DONE gelince düzelir); sonraki telefon gününde sürdürülen seans bugünün kısa sürümünü/swap'ını kaybeder (#515 doğrulaması).
- Seans: aktif set iPhone SE'de (667pt) ilk görünümde tam görünüyor mu (üstteki dinlenme yuvası ~60pt boş); 375pt'de "102.5" kesilmiyor mu; klavye "Log set"i örtmüyor mu (KeyboardAvoidingView).

## Devam sonrası (9 Eki öğle) olanlar
- #500 simülatörde görüldü (prototip sırası, "180", simgeler) → auto-merge. K-971 ajanı K-998'e (#507: DELETE workout + finish pausedSeconds) geçti, sonra K-972 P1-P4.
- K-969 metin kararları (5) onaylandı. K-972 kararları: Discard yeni uç (K-998), set düzelt/sil PENDING yerelde / SYNCED çevrimiçi, duraklama özet ve Health'ten düşer, analiz satırı yeniden hesabı K-973'e.


## ▶ DURAKLATMA 2 (9 Eki öğleden sonra, token sınırı)
Birleşenler (devamdan sonra): #494 #500 #501 #505(V44) #506 #508 #509(V45) #510 #511 · #512 auto-merge'de.
Açık PR ve ajan işleri (her ajan duraklat mesajı aldı; dönüşte dalın son commit'inden):
- K-969 ajanı: #519 (K-978 PR1 /call) incelemede → bulgular; sonra K-1000 (#514, decision/514-call-fields) → K-978 PR2.
- K-970 ajanı: #515 kritik düzeltmeler (ortak `sessionState(program, records, now)`; 8 madde; `train-screen.test.tsx:478` beklentisi geri gelir) → #512 birleştiyse rebase; K-974 (mobile/437-workout-summary, `/workout-end`, test yönlendirme değişikliği ONAYLI) → K-1008 (#516) → K-974 "What moved".
- K-971 ajanı: #517 (P3a atlama) 6 bulgu düzeltmede; P3b set düzelt/sil yığılı; sonra P2 (End/Discard/pausedSeconds/Health) → P4 swap → K-973.
- K-995 ajanı: #518 (PATCH, V46) 6 bulgu + start_* anlık görüntüde düzeltmede (409 süren seans günü: KARAR) → K-993 (#488; göç gerekirse V47) → K-988 → K-997.
Kalan kartlar: K-973, K-979'a kadar Part 3: K-972, K-973, K-974, K-978, K-988, K-993, K-997, K-999, K-1000, K-1008; part sonu persona yürüyüşü + ÇIKIŞ.
- Rapor geldi (duraklatma 2): K-970 #515 düzeltmeleri bitti (95b79a3c; `sessionState`, `todayFor`; K1 beklentileri geri geldi) → **incele + birleştir**; sonra #512'yi `sessionState`'e geçir (K-969). K-974 WIP `mobile/437-workout-summary` cfe7e3ab (workout-end stub, 9 kırmızı test bilerek).
- #519 inceleme bulguları (K-969'a iletilecek): (1) 409'da yeniden okuma yok, ölü düğme; (2) consent/subscription/404 hep "Check your connection" → duruma göre metin + Settings; (3) geçmiş APPLIED karar "In this week's plan" diyor → salt okunurda geçmiş zaman, geri etiketi geldiği yere göre; (4) Keep/Use sonrası VoiceOver duyurusu; (5) `CallCard.tsx` artık yalnız testte, Hero okunda çift push koruması.
- Rapor geldi (duraklatma 2): K-971 #517 düzeltmeleri bitti (47616e34; K1 notu PR gövdesine yazılmadı) → incele + birleştir. P3b set düzelt/sil `mobile/435-session-set-edit` 797ba3af (#517 üstünde, PR yok; tam check koşulmadı). Kalan: P3b PR, P2, P4, K-973.
- Rapor geldi (duraklatma 2): K-995 #518 altı bulgu düzeltildi (07804726; start_* PlannedExercise'ta, relay, 409 başlamış gün, undo-all yalnız öneriler) → incele + birleştir (V46). K-993 `decision/488-first-week-seen` 9a2c688d (V47, `PUT /v1/profile/plan-seen`; PR #518'den sonra). Telefon parçası: plan ilk gösterimde bir kez plan-seen + first-weeks yeniden oku → mobil ajana. K-988, K-997 başlanmadı.
