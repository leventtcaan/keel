# M4 · Part 2 devamı (compact sonrası) — tam olarak nerede

> Hafıza `DURUM.md › ## M4 ilerleme` ve `## ▶ DEVAM NOKTASI`. Ortak kurallar `plan/oturum-promptlari/M4.md` (harfiyen).
> Session KAPANMAZ: Part 2 bitince Levent dönünce Part 2 aktarımı yapılır (`docs/aktarim/M4/README.md` 8-…).

## Durum (1 Eki gece)
- ✅ K-414: #221 (salon API + `equipment`), #222 (`LoadSteps` yuvarlama, lb ölçeği, plaka/taraf). `docs/aktarim/M4/K-414.md`.
- ✅ K-405: #223 (veri katmanı), #224 (Antrenman sekmesi + seans; simülatörde uçtan uca). `K-405.md`.
- ✅ K-406: #226 (efor özeti). `K-406.md`.
- ⏳ **#225** `engine/e1rm-round-once` (E1rm tek yuvarlama, K-406 incelemesinden; auto-merge açık). CI **kırmızı** ama e1RM yüzünden
  değil: `main`'deki `LoadStepsTests.withLbPlatesTheRoundedLoadIsTheNearestRealLoadHeavierThanTheLastAsTheAppStoresIt` (jqwik,
  rastgele tohum) karşı örnek buldu: beklenen 22.68 (50 lb), gelen 21.55 (47.5 lb); bar 45 lb, 47.5 lb = 45 + 2×1.25 lb.
  **İlk iş bu** (skill `systematic-debugging`). Ya `LoadSteps` lb ölçeğinde gerçek kusur, ya testin kaba kuvvet beklentisi
  yanlış (hedefi lb'ye çevirip `Math.round` etmesi, yakınlık eşitliği, plaka kümesi). Hızlı tarama: TS eşi
  `apps/mobile/src/train/loadSteps.ts` (dal `mobile/114-warmup`) aynı algoritma — commit'lenmeyen geçici bir jest dosyasıyla
  plaka alt kümeleri (4500 + 125/250 içerenler) × `fivesOverTheBar` 0..20 × adım (7'şer) tara; önceki tam tarama 600 sn'yi aştı.
  Kusur `LoadSteps`'teyse: vakayı `contracts/fixtures/load-steps.json`'a ekle (Java + TS ikisi de okur), RED, düzelt (iki dilde),
  yeni PR. Sonra #225'i `gh run rerun` ile yeniden koştur.
- 🔧 **K-417** dalı `mobile/114-warmup` (K-406 dalının üstünde; #226 birleşti → önce
  `git rebase --onto origin/main mobile/52-workout-summary mobile/114-warmup`). WIP ffb7a28: `train/loadSteps.ts` (Java
  `LoadSteps` eşi, 40 ortak vaka geçiyor), `train/warmup.ts` + `warmup.test.ts`, `workout.json` ısınma parametreleri
  (G1 K-17 sayılar; merdiven TÜRETİLMİŞ `urun`, soru 40). **Kalan:**
  1. Telefonda salon: `trainData.ts` `createTrainingCache` `/v1/gyms`'i de okusun ve kopyasını tutsun; `TrainData.gym` =
     kullanılan salon, `GymWeights`'e çevrilmiş (`machines` dizisi → `machineStepsKg`). Testler `train-data.test.ts`.
  2. Seans: hareket kartında ısınma satırları (günün ilk hareketi = bu antrenmanda henüz çalışma seti yokken seçili hareket → 3;
     diğerleri → 1); her biri tek dokunuşla `setType: 'WARM_UP'` set (RIR yok); yapılan ısınmalar sırayla dolar
     (`planExercise` ısınmayı zaten satır saymıyor). Barbell/kızakta girilen yük için taraf başına plakalar (`platesPerSide`).
     Metinler `workout.warmup.*` (en.json). Testler `workout-screen.test.tsx`.
  3. `npm run check`, mutasyon (mobil: dosyayı yedekle → değiştir → `npx jest <test>` → yedekten geri yaz), simülatör,
     code-reviewer + pr-test-analyzer, `docs/aktarim/M4/K-417.md` + README satır 11, PR `--auto --squash`.
- Sırada: **K-415** hareket geçmişi, PR listesi (izolasyonda yük PR'ı yok, tekrar/efor PR'ı var — G6 K-33), set ve seans notu
  (not alanı sözleşmede yoksa: sözleşme + backend + göç, ADR). Sonra **K-421** salon profili ekranı (backlog'da; Ayarlar'dan;
  lb plakalar lb ile girilir). Sonra Part 2 ÇIKIŞ.

## Simülatör kurulumu (geçici, commit'lenmez — bitince geri al)
- Yedek: `cp apps/mobile/src/app/_layout.tsx <scratchpad>/sim/_layout.tsx.bak`; `useSignedIn() || true` ve
  `useOnboarding() && 'done'` (yorum: SIMULATOR ONLY). Fikstür sunucusu `<scratchpad>/sim/server.js` (port 8099; program,
  katalog `data/exercises`'tan, workout/set/finish POST'ları; yazmaları `writes.log`'a). `/v1/gyms` eklenmeli (K-417/K-421).
  Scratchpad kaybolduysa yeniden yaz (K-405 aktarımında anlatıldı).
- `CI=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:8099 npx expo start --port 8081 --clear`; `xcrun simctl launch <udid>
  host.exp.Exponent`, sonra `xcrun simctl openurl <udid> exp://127.0.0.1:8081`. iPhone 16 Pro Max `F737A327-A966-45B4-910E-F7953FA40C01`.
  Dokunuş noktası = ekran görüntüsü pikseli (921 genişlik) / 2.09. Bitince: sunucu + expo `pkill`, `_layout.tsx` yedekten, `git diff` boş.
- Tipli rotalar: yeni ekran dosyasından sonra kısa `expo start --port 8097` `.expo/types/router.d.ts`'i yeniler.

## Bilinen tuzaklar (bu part)
- RNTL 14: `render` ve `fireEvent` asenkron → `await`. `Promise.all` ile iki dokunuş act'leri çakıştırır, sonraki testleri bozar
  (çift dokunuşu askıdaki bir kayıtla, sırayla dene).
- `jest.clearAllMocks` taklidin uygulamasını sıfırlamaz → `beforeEach`'te varsayılanı yeniden ver.
- `copy-literals.test`: JSX çocuk ifadesindeki dizgiler yakalanır → koşullu parçaları sabitlere çıkar.
- React Compiler lint: efektte senkron setState yok (türetilmiş durum, satır anahtarı); render'da `Date.now()` yok.
- Prettier'ı yalnız değiştirdiğin dosyalara uygula (`--single-quote --print-width 150 --bracket-same-line`).
- git guard zorla dal silmeyi engeller; squash'la birleşen yerel dalları bırak. Heredoc metninde o komutun yazımı da kancayı tetikler.
- DB testleri yalnız CI'da; `build.gradle.kts` artık CI'da beklenen/gelen değeri yazıyor.
- Saf backend testleri: `@SpringBootTest`/`PostgresTestConfiguration` içermeyen `*Tests.java` sınıflarını `--tests` ile koş.
- Python ile dosya düzenlerken eşleşmeyen `replace` sessizce geçer → `assert old in s`.

## Part 2 ÇIKIŞ (bitince)
`DURUM.md › ## M4 ilerleme` altına "Part 2 ÇIKIŞ (tarih)": birleşenler + PR'lar, açık PR/worktree, kalan iş, Part 3'ün bilmesi
gerekenler (salon önbelleği, `LoadSteps` iki dilde + ortak vakalar, seans kayıt modeli, özete `router.replace`), sorular 38-42
(yazıldı). Backlog status (K-414, K-405, K-406, K-417, K-415, K-421 → done) + `python3 tools/sync_backlog.py --apply`.
`M4-part3.md` prompt'unu güncelle (K-421 bitmezse oraya). `main`'e commit + push. Kısa Türkçe özet, dur.
