# M3 · Part 3 — DEVAM (compact sonrası) — ✅ TAMAMLANDI (1 Eki; bkz. DURUM › Part 3 ÇIKIŞ = M3 ÇIKIŞ)

> Bu dosya bağlam dolmadan yazıldı (30 Eyl gece). Tek doğru kaynak: `DURUM.md › ## M3 ilerleme` + `## ▶ DEVAM NOKTASI (M3 Part 3)`.
> Sohbete güvenme; git'e ve bu dosyalara güven.

## Nerede kaldık
- **Birleşti:** K-306 #202 · K-312 #203 · K-309 #204 · K-403 #205 · K-308 yapılandırması #206 (cihaz/TestFlight adımları Levent'te).
- **Açık PR:** K-228 #207 (`decision/188-hard-stop-general-kind`, auto-merge açık). CI'ya ccd_pr `get_status` ile bak; kırmızıysa
  düzelt (DB testleri yalnız CI'da: `HardStopKeptGenerallyMigrationTests`, `CheckInQuestionsApiTests`).
- **Dalda, PR yok:** K-229 `decision/189-cycle-question-after-hard-stop` (K-228'in üstünde; saf testler yeşil, mutasyon 11/11,
  aktarım `docs/aktarim/M3/K-229.md`). **İnceleme geldi (compact öncesi), 3 bulgu — önce bunları TDD ile düzelt:**
  1. (92) `CheckInQuestionsApiTests.womanHeldAfterAHardStop` satırı `snapshot = '{}'` ile ekliyor; `SafetyHolds.from(calls.all())`
     her satırın anlık görüntüsünü `StoredSnapshot`'a okuyor, Jackson 3 `FAIL_ON_NULL_FOR_PRIMITIVES` → 500; 3 DB testi CI'da
     kırmızı olur. **Düzeltme:** `CallStore`'a yalnız `decided_at, application, decision` okuyan küçük bir sorgu
     (ör. `appliedDecisions(account)`); `SafetyHolds` onu kullansın (her `week()`'te 90 günlük anlık görüntü parse'ı da biter).
     Fixture'a yine de geçerli bir anlık görüntü koy.
  2. (82) Döngü sorusu yalnız cevapsız kuru çalıştırmaya bakıyor: hold'da kilo artıyor + görünüş WORSE → spine önce
     TRAINING/RECOVERY ister; cevaplanınca `AdjustCalories(-x)` → hold → `cycle_check_needed` bekler ama döngü sorusu hiç
     sorulmadı (her hafta tekrarlayabilir). **Düzeltme:** `needed()`'in denediği cevap birleşimlerinden herhangi biri
     `waitsForTheCycle` ise CYCLE_STOPPED'ı da sor (ör. `needed`'e verilen motor fonksiyonu bekleyişi kaydetsin). Test ekle.
  3. (85) Commit'e IDE derleme çıktısı girmiş: `backend/bin/**` (~400 dosya, .class). **Düzeltme:** ayrı bir chore:
     `git rm -r --cached backend/bin` + `.gitignore`'a `backend/bin/` (main'de zaten 175 dosya izleniyormuş). K-229 dalından
     bin değişikliklerini çıkar (`git checkout origin/main -- backend/bin` sonra commit) — K-228 (#207) içermiyor (kontrol edildi)
     K-227 dalı da K-229 üstünde → aynı temizlik.
  Sonra #207 birleşince `git rebase --onto origin/main decision/188-hard-stop-general-kind`, PR, auto-merge.
- **Yarım:** K-227 `decision/187-mini-cut` (K-229'un üstünde). Son commit yalnız motor testleri (`MiniCutGateTests` sonuna
  eklenen 5 test) — **derlenmiyor**, çünkü kod yok. Sıradaki: aşağıdaki K-227 planı.

## K-227 planı (karar verildi, uygula)
1. **Motor:** `Snapshot`'a `miniCutUntil: Optional<LocalDate>` (son bileşen; önceki kanonik form ikincil yapıcı olarak kalsın,
   bütün wither'lar yeni alanı taşısın — K-229'da `safetyHold`/`cycleResolved` için yapılanın aynısı), `withMiniCutUntil`.
   `MiniCutGate.over(snapshot, params)`: faz CUT + `miniCutUntil` var + bugün ≥ o gün → `ChangePhase(BULK)`, kural
   `MINI_CUT_OVER` ("mini_cut_over"), kaynak G7 K-102, metin `decision.change_phase.mini_cut_over` (en.json'a ekle).
   `DecisionPipeline.afterTheSafetyNet`'in **ilk** adımı (gözlem/veri kontrolünden önce). `MiniCutGate.target(snapshot,
   maintenanceKcal, params)`: bakım − `CUT_STEP_MIN_KCAL`; kadında yağ tahmini yoksa, LEA tabanının, BMR'nin (Mifflin, trend
   kilo) ya da makro bölüşümünün (`MacroTargets.forTarget` → `TargetTooLow`) altındaysa **bakım**. Merdivenin
   (`CalorieLadder.step`) taban kontrollerini kopyalama: ortak bir yardımcıya çıkar.
2. **Karar modülü:** göç **V18** `decision.plan` + `mini_cut_until date` (tırnaksız, `MigrationConventionTests`);
   `CallStore.Plan` + `miniCutUntil` (plan okuma/yazma SQL'i); `PlanChange.after`'a `Optional<Integer> miniCutTarget`
   (eski 5 argümanlı imza `Optional.empty()` ile kalsın): MiniCut → CUT, bugün başlar, hedef = motorun hedefi, gözlem yok,
   `miniCutUntil` = bugün + `MINI_CUT_WEEKS_MAX` hafta; kalori/hareket değişiklikleri `miniCutUntil`'i korur, yön değişimi
   siler. `DecisionService.apply`: MiniCut ise anlık görüntü + bakımla `MiniCutGate.target`. `snapshot(...)`:
   `withMiniCutUntil(plan.miniCutUntil())`. `StoredSnapshot`: `miniCutUntil` saklanır (eski satır null). Geri alma: K-216
   yolu (`plan_before`) — test et.
3. **İştah sorusu:** `CheckInQuestions.choices/answered` APPETITE (UNKNOWN hariç); `needed`: spine sorularından sonra, bütçe
   doluysa sorma; `APPETITE=GONE` ile kuru çalıştırma kararı değiştiriyorsa sor. `checkIn()`: iştah **cevaptan**
   (`answers.checkIn().appetite()`; şimdi `dataSays`'ten alıyor — hata). en.json `checkIn.question.appetite`,
   `checkIn.reason.appetite`, `checkIn.choice.appetite.{normal,gone}`.
4. Testler: MiniCutGateTests (yazıldı), ApplyDecisionTests (mini cut planı, geri alma, until korunur/silinir),
   StoredSnapshotTests, CheckInPartsTests/QuestionBudgetTests (iştah sorusu), DB: ApplyDecisionApiTests (V18 sütunu).
   Döngü: RED → kod → saf testler → mutasyon (`plan/oturum-promptlari/mutate.py`, MUT_DIR) → code-reviewer +
   pr-test-analyzer → aktarım `docs/aktarim/M3/K-227.md` → PR auto-merge (K-229 birleşince rebase).

## Sonra: Part 3 bitişi (M3.md + M3-part3.md "Bitiş" maddeleri)
1. `plan/yol-haritasi.md › M3` çıkış kriterleri tek tek, çıktıyla; eksikler DURUM'a. Backlog `status: done` güncelle
   (K-306, K-312, K-309, K-403, K-228, K-229, K-227; K-308 cihaz adımı bekliyor) + `python3 tools/sync_backlog.py --apply`.
2. **Toplu sorular (AskUserQuestion, en fazla 4'er):** 25-31 (DURUM › "Session sonunda…"; 25 ve 27 cevaplandı →
   ADR-030'a yaz), 26 (K1 onayı), 28 (görünüş adımı), 29 (gerçekçi gün), 30 (safety işareti artık riski), 31 (mini cut
   açığı), + **K-308 onayı**: `eas init` / simülatör derlemesi (bulut, Expo hesabı) / cihaz derlemesi ve TestFlight (Apple
   girişi Levent'in terminalinde) — `docs/eas-derleme.md`. Cevaplar → **ADR-030** (M3 sonu cevapları), uygulanabilir iş.
3. `plan/oturum-promptlari/M4.md` + `M4-part1..N.md` (M3.md kalıbı; devralınan: ekran kriterleri — Hedefler, check-in
   ekranı, program görünümü, karar kartı (`safety` → genel etiket), K-313, K-231 (+ soru 27), K-230, K-404 (iki rıza)).
4. DURUM › "Part 3 ÇIKIŞ = M3 ÇIKIŞ"; kısa özet + M4 Part 1 prompt'u. **Session kapanmaz;** Levent dönünce M3 aktarımı
   (`docs/aktarim/M3/README.md` sırası 1-14, skill `aktarim`).

## Kurallar (unutma)
- Geçici simülatör yaması: `_layout.tsx` yedekten geri yükle, `git checkout` değil; testler yamayı yakalar.
- `.expo/types/router.d.ts` eskiyse sil (CI'da yok) ya da `expo start` ile yenilet.
- Disk ~4 GB: `npm cache clean --force` gerekirse. Docker yok → DB testleri CI'da.
- Komutta `cat` ile stdin bekletme (bir kez takıldı).

## Güncel (compact sonrası koşu, 30 Eyl gece)
- Birleşti: K-228 #207, backend/bin chore #208, K-229 #209. Backlog status + sync yapıldı (K-229/K-227 `doing`, K-308 `doing`).
- K-227 dalda (`decision/187-mini-cut`, PR yok): motor + karar + iştah sorusu + V18 + aktarım yazıldı, mutasyon motor 9/9, karar 8/9 (1 eşdeğer).
  **pr-test-analyzer bulguları (uygula, TDD):** (1) pipeline sırası testi: güvenlik ağı mini cut bitişinden önce (kadın,
  CUT, miniCutUntil=bugün, menstrualLoss=true → HardStop); (2) QuestionBudgetTests: GONE → cycle_check_needed motorunda
  needed=[APPETITE] ve cycleAwaited(..., [APPETITE]) true; (3) LEA tabanı yolu: kadın 62 kg/165/30y/%15, enerji 2200 →
  target(2000)=2000, target(2100)=1600; enerji yoksa `target` bakım (guard ekle); (4) mini cut bitişi "antrenman kötü
  gidiyor"dan önce (FullRestWeek veren TrainingStatus); (5) Plan JSON'u miniCutUntil olmadan okunur (Jackson). Yanıltıcı
  yorum: `underASafetyFloorTheMiniCutStaysAtMaintenance` LEA tabanı da deliniyor.
  code-reviewer sonucu bekleniyor.
- M4 kalıbı: `plan/oturum-promptlari/M4.md` taslak (4 part). Kalan: M4-part1..4.md, sorular 25-32 + K-308 onayı → ADR-030.
- Soru 32 (yeni): mini cut sürerken (4-6 hafta) haftalık omurga pencere (21/28 gün) dolunca bir kalori adımı daha
  atabilir → (a) kabul; (b) mini cut sürerken kalori adımı yok (gün gelene kadar sabit).
- **code-reviewer (K-227) bulguları:** (A) PhaseGate CUT→BULK (surplus_zone, lower <%12) mini cut'ı 3. haftada bitirir →
  mini cut sürerken faz kapısının CUT kolu çalışmasın (mini cut kendi gününde döner), motor testi; (B) sözleşme
  `contracts/openapi.yaml` ~745 (answerCheckIn kabul edilen türler: APPETITE ekle) ve ~824 (applyDecision: mini cut artık
  uygulanır; eski "not applied yet" cümlesi) → `npm run generate`; (C) not: batıya saat dilimi + MiniCut apply → CONFLICT
  (kabul, aktarımda); metin `decision.mini_cut.appetite_gone` "under your needs" → "less than on the bulk" (taban engellerse
  hedef bakım). pr-test-analyzer bulguları 1-5 uygulandı (dalda, commit bekliyor).
