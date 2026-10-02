# M5 Part 1 — devam (compact sonrası, 3 Eki)

> Önce oku: `M5.md` (ortak), `M5-part1.md`, `DURUM.md › ## M5 ilerleme` + `## ▶ DEVAM NOKTASI`. Git ile doğrula.

## Yarım işler (sırayla) — güncel: 3 Eki, ikinci oturum sonu
1. ✅ K-518 #284, K-512 #283 + #285, K-519 #286, K-520 #287 birleşti.
2. **K-513 kısım 1 #289** (`../keel-513`, dal `engine/119-first-weeks`, auto-merge KAPALI): inceleme 5 bulgu — **önce bunlar**, TDD ile:
   (1) **risk penceresi kaydı:** sinyaller biten takvim haftasından, kapı içinde bulunulan kullanıcı haftası (5-8) → 4-7. haftaların
   davranışı okunuyor, 8. haftanınki hiç. Düzeltme: sinyalleri **biten kullanıcı haftasından** (kişinin 7 günlük bloğu) oku; risk,
   biten hafta 5-8 iken (yani 6-9. haftalarda) okunur; akış 8. haftadan sonra da 1 hafta yalnız risk için açık. Affedilen hafta takvim
   haftasıyla sayılıyor → bu sinyali de kişinin haftasına uyarla ya da ADR'ye uyumsuzluğu yaz. ADR-040 #1/#3 ve yaml notlarını güncelle.
   (3) **affedilen hafta motorda hesaplansın:** `Consistency`'ye saf yardımcı (ör. `ConsistencyRecord.forgivenWeekUsed` ya da
   `FirstWeeks.Facts` `List<WeekTally>` alsın); ilk sayılan hafta kaçtıysa "affedilen" değil (koşu yok) — testle tanımla; duraklayan
   hafta atlanır. Facts'te konumsal int/bool kalabalığını azalt.
   (2) **5. hafta metni** herkese "eşiği geçtin" diyor (I1 F2'de koşullu: 12'de 9) → koşulsuz bir cümleye çevir ya da seans sayısına
   bağla. (4) **antrenmansız kullanıcıya** H2/H6 antrenman metni + "muscle can start to show" vaadi → `trainingPlanned` yoksa içerik
   varyantı/yok; H6 "may"; "6. haftadan önce muscle yok" testi (H4'ün "not muscle yet" olumsuzu ADR'de izinli say). Metinler soru 65.
   (5) ADR-040'da `EightWeeks` → `FirstWeeks`; backlog K-513 `tests:` → `FirstWeeksTests`.
   Sonra yeniden incelet, `gh pr merge 289 --auto --squash`.
3. **K-513 kısım 2** (sunucu, decision modülü): `GET /v1/first-weeks` → `{week, contentKey?, risk: [rule]}` (8. haftadan sonra 404);
   Facts: hesabın açılış günü (identity `account.created_at` — kimlik modülünden public okuyucu gerekir), biten takvim haftasının seans
   sayısı (`TrainingLog.workoutStarts`), antrenman planlı mı (profil günleri), affedilen hafta (Consistency kaydı: son sayılan hafta
   kaçtı ve önceki kaçmadı — `WeekLogs`/`Consistency.record` mantığından, motora saf yardımcı ekle), öğün kaydı olan gün sayıları (iki
   hafta), biten hafta beyanlı mı (`StateStore.days`). Risk varken haftanın soru bütçesi `question_budget_per_week_anomaly`
   (`QuestionBudget.forWeek`). Sözleşme + DB testi + RED CI'da önce.
4. **K-502** (karar kartı varyantları + gerekçe sayfası; `/v1/decisions/{id}/basis` hazır; prototip 3.2-3.5).
5. Simülatör turu (K-501, K-434, K-518, K-520, K-502), Part 1 ÇIKIŞ (DURUM), Part 2 sağlayıcı soruları, `M5-part2.md` kontrolü,
   aktarım README'ye K-520 ve K-513 satırları.
6. K-430 #273 Levent'te (soru 55) — dokunma.

**Disk 4,3 GB (3 Eki, 5 GB altı):** oturum başında önbellek temizliği (`~/Library/Caches`, Xcode DerivedData, eski Gradle
önbellekleri) — simülatörden önce şart; hâlâ azsa Levent'e sor.

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
- İki commit'i (RED + düzeltme) birlikte itme: CI yalnız ucu koşar, RED görünmez. Önce RED'i it, CI kırmızıyı görsün.
- git_guard tüm komutu engeller (zincirin bir parçası yasaksa hiçbiri çalışmaz): `branch -D` yok; squash'lı yerel dalı bırak.
- Test fikstüründe `weekly_call.snapshot = '{}'` 500 verir (Jackson 3 eksik primitive'i reddeder): gerçek `StoredSnapshot` JSON'u koy.
- Sözleşme testi tek sayılık kaloriyi yakalar (U5): izin listesini genişletmeden önce alanın gerçekten gerekip gerekmediğine bak.
