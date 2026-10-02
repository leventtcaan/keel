# M5 Part 1 — devam (compact sonrası, 3 Eki)

> Önce oku: `M5.md` (ortak), `M5-part1.md`, `DURUM.md › ## M5 ilerleme` + `## ▶ DEVAM NOKTASI`. Git ile doğrula.

## Yarım işler (sırayla) — güncel: 3 Eki, ikinci oturum
1. ✅ K-518 #284, ✅ K-512 #283 + #285 birleşti.
2. **K-519 #286** (`../keel-519`, auto-merge açık) ve **K-520 #287** (`../keel-520`, auto-merge açık): CI yeşil olunca GitHub birleştirir.
   `get_status`/`gh pr view` ile doğrula; kırmızıysa düzelt. Birleşince worktree'leri kaldır (`git worktree remove`; squash'lı yerel dal
   `branch -d` ile silinmez — `-D` hook'ta yasak, yerel dalı bırak).
3. **K-513** (motor + sunucu; telefon K-521, backlog'da bölündü): ADR-040 yazılacak. Taslak karar:
   - Hafta sayımı: kullanıcının ilk planının günü (decision.plan `plan_start` değil — ilk kararın `firstMadeOn` ya da profil ilk kaydı;
     karar ver, ADR'ye yaz). H1-H8 içerik anahtarı motorda saf fonksiyon (`EightWeeks`), metinler `en.json`.
   - 5. hafta riski (I1 F2): sinyaller kaynaklı — bu hafta 0 seans, af haftası kullanımı (Consistency'nin affettiği hafta), kayıt
     tutarlılığı düşüşü; **uygulama açılmaması sunucuda yok** (açılış yalnız telefonda) → K-521'e. Birleştirme: **herhangi biri = risk**
     (ağırlık yok → kaynaksız ağırlık uydurma yok). "Düşüş" eşiği kaynakta yok → `urun` parametresi + Levent'e soru.
   - Riskte soru bütçesi ≤5 (U9): `QuestionBudget`'a bağla.
4. **K-502** (karar kartı varyantları + gerekçe sayfası; K-519'un `/v1/decisions/{id}/basis`'ini kullanır; prototip 3.2-3.5).
5. K-430 #273 Levent'te (soru 55) — dokunma.

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
