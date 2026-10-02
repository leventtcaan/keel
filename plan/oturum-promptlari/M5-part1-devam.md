# M5 Part 1 — devam (compact sonrası, 3 Eki)

> Önce oku: `M5.md` (ortak), `M5-part1.md`, `DURUM.md › ## M5 ilerleme` + `## ▶ DEVAM NOKTASI`. Git ile doğrula.

## Yarım işler (sırayla)
1. **K-518 (#284, dal `mobile/278-state-mode`, worktree `../keel-518`)** — son commit RED: 4 test kırmızı (bilerek).
   Yapılacak (inceleme bulguları):
   - `reminders.ts`: `createReminders` seçeneğine `mutedUntil?: () => Promise<string | null>`; `reschedule`: `silenced = await muted()`,
     `until = silenced ? await mutedUntil() : null`; `!enabled || !granted || (silenced && until === null)` → clear; değilse
     `planReminders({..., muted: silenced, mutedUntil: until})`. (`plan.ts` zaten hazır ve yeşil: `mutedUntil`, `daysAfter`.)
   - `stateService.ts`: `until(): Promise<string|null>` — yürürlükteki durumun son günü, yoksa/geçmişse null.
   - `appServices.ts`: `mutedUntil: () => state.until()`.
   - `StateCard.tsx`: not (`said`) hangi duruma söylendiyse ona ait: `{identity, key}` tut; kimlik = `ready` ise `kind+since`, değilse
     `none`; "I'm back" sonrası kimlik `none` → hoş geldin kalır; başka bir duruma geçince not gizlenir. Yanıltıcı yorumu düzelt
     ("Today says it failed once, above" — `data.state` `parts`'ta yok).
   - Sonra: `npm run check`, mutasyon (yeni dallar), aktarım dosyası (`docs/aktarim/M5/K-518.md` › inceleme satırı), PR gövdesi
     (REST PATCH, `gh pr edit` GraphQL hatası verir), `gh pr merge 284 --auto --squash`.
   - Worktree'de jest için: `ln -s ../../../keel/apps/mobile/node_modules apps/mobile/node_modules` (commit'ten önce sil!).
2. **K-512 (#283 motor, dal `engine/118-triggers`, `../keel-512`; kısım 2 dal `engine/118-triggers-api`, `../keel-512b`, PR yok)**.
   #283 incelemesi ciddi kusurlar buldu → `Prompts` yeniden tasarlanacak (ADR-039'a not düş):
   - `Facts`'e: `phase`, `trainingDaysSince` (program değişikliği), `pausedDays` (beyanlı günler + mola haftası günleri),
     `deficitBegan` (açığın ilk günü — gözlemdeki bakım tahmini değil; tanımı ADR-039'a yaz), `declaredNow`.
   - T-4: planlı günler son seanstan **sonra**, `trainingDaysSince`'ten itibaren, bugünden önce, duraklayan günler hariç; anahtar = son
     seanstan sonraki ilk planlı gün (sapma boyunca sabit). Hiç seans yoksa sessiz.
   - T-13: **takvim haftaları** (geçen Pzt-Paz vs önceki) — bir düşüş bir kez; duraklayan günler sayılmaz.
   - T-5: yalnız `phase == CUT` (bulk'ta motor FIX_RECOVERY diyor, çelişmesin).
   - T-2: `deficitBegan` ile.
   - Eksik testler: mola haftası, faz, anahtar kararlılığı, Pazartesi sınırı, bugün planlı gün, beyan bitince, gün değişikliği.
   - Sonra #283'ü güncelle (RED yerelde önce), kısım 2'yi (`../keel-512b`: V26 `decision.prompt_answer`, `PromptStore`,
     `PromptController` `/v1/prompts`, sözleşme, metinler `prompt.*`, `AccountFixture` cevabı, `PromptsApiTests`) yeni Facts'e
     uyarla ve #283 birleşince main'e yeniden tabanla, CI'da RED göster (test commit'i önce), PR aç.
3. **K-430 (#273)** Levent bekliyor (soru 55) — dokunma.

## Sonra (part kapsamı)
K-520 (tetikleyici soruları telefonda) · K-513 (önce böl: motor + K-521 mobil; ilk 8 hafta + 5. hafta risk — risk ağırlıkları kaynakta
yok → girdiler kaynaklı, eşikler `urun` ya da soru) · K-519 (kararın dayanağı, sunucu) · K-502 (karar kartı varyantları + gerekçe
sayfası, prototip 3.2-3.5) · simülatör turu (K-501, K-434, K-518, K-502 ekranları; disk ~5 GB → önce `df -h ~`, iş bitince
`xcrun simctl shutdown all`) · Part 1 ÇIKIŞ + Part 2 sağlayıcı soruları (DURUM) + `M5-part2.md` kontrolü.

## Dersler (bu oturum)
- Ana checkout ayrık HEAD'de kalsın; her dal kendi worktree'sinde (inceleme ajanı okurken dal değiştirme).
- `gh pr edit` GraphQL (Projects classic) hatası → gövde için `gh api -X PATCH repos/leventtcaan/keel/pulls/N -F body=@dosya`.
- Push çıktısını süzme: `git push 2>&1 | grep -E "main -> main|rejected"` (bir commit sessizce itilemedi).
- Python ile dosya düzenlerken `a if c else b` önceliğine dikkat (backlog bir kez kesildi, geri kuruldu).
- Göç sürüm sırası: açık PR'lar V24/V25/V26 kullanıyor — sıra boşluğu `MigrationConventionTests`'te kırmızı.
- Tüm saf backend testleri yerelde: `./gradlew test`, düşenlerden `PostgresTestConfiguration|SpringBootTest` olmayanları ayıkla.
- Sabitleyen liste testleri (uç noktalar, cevap türleri) bilerek genişleyince K1 notu (soru 59).
