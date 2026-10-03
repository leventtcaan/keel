# M5 Part 1 — devam (compact sonrası, 3 Eki) — ✅ PART 1 BİTTİ (3 Eki, üçüncü oturum); ÇIKIŞ DURUM › M5 ilerleme. Bu dosya artık yalnız kayıt + dersler.

> Önce oku: `M5.md` (ortak), `M5-part1.md`, `DURUM.md › ## M5 ilerleme` + `## ▶ DEVAM NOKTASI`. Git ile doğrula.

## Yarım işler (sırayla) — güncel: 3 Eki, üçüncü oturum
1. ✅ K-513 #289 (motor, iki inceleme turu) + #290 (sunucu) birleşti. ✅ K-502 (1/2) #291 birleşti; (2/2) #292 auto-merge.
2. **Simülatör turu** (K-501, K-518, K-520, K-502 kartı + gerekçe sayfası; K-434 onboarding): ana checkout `git checkout --detach origin/main`
   (node_modules orada gerçek; worktree'de sembolik bağ var — Metro riski), geçici koruma yaması (`_layout.tsx` signedIn/onboarding
   sabit — **commitlenmez, geri alınır**), fikstür sunucusu bu oturumun scratchpad'inde `fixture.js` (8099; `/__call?v=hold|change|wait|advice|safety`,
   `/__checkin?v=open|answered`, `/__state?v=none|sick`, `/__prompt?v=on|off`), `EXPO_PUBLIC_API_URL=http://127.0.0.1:8099 npx expo start`
   (komut satırı .env'i ezer; .env okunmaz — sır), `xcrun simctl openurl booted exp://127.0.0.1:8081`. Görüntüler `docs/aktarim/M5/img/`,
   `sips -Z 1000`. Bitince `xcrun simctl shutdown all`, yamayı geri al.
3. Part 1 ÇIKIŞ (DURUM › M5 ilerleme), aktarım README'ye K-520, K-513, K-502 satırları, `M5-part2.md` kontrolü (sorular 67-71 DURUM'da hazır).
4. K-430 #273 Levent'te (soru 55) — dokunma. K-521 (ilk 8 hafta telefonda) backlog'da, Part 1 dışı.

## Sonra (part kapsamı)
K-520 (tetikleyici soruları telefonda) · K-513 (önce böl: motor + K-521 mobil; ilk 8 hafta + 5. hafta risk — risk ağırlıkları kaynakta
yok → girdiler kaynaklı, eşikler `urun` ya da soru) · K-519 (kararın dayanağı, sunucu) · K-502 (karar kartı varyantları + gerekçe
sayfası, prototip 3.2-3.5) · simülatör turu (K-501, K-434, K-518, K-502 ekranları; disk ~5 GB → önce `df -h ~`, iş bitince
`xcrun simctl shutdown all`) · Part 1 ÇIKIŞ + Part 2 sağlayıcı soruları (DURUM) + `M5-part2.md` kontrolü.

## Dersler (3. oturum)
- Mobil mutasyon betiği: jest desenini **bölerek** ver; "No tests found" çıkış 1'dir → her mutant sahte "öldü". Çıktıda `Tests:` yoksa
  "test koşmadı" yaz; davranışı değiştirmeyen kontrol mutantı yaşamalı.
- Worktree'de `node_modules` sembolik bağı `.gitignore`'daki `node_modules/` ile yakalanmaz → `git add -A` onu commitler. Ortak
  `info/exclude`'a `apps/mobile/node_modules` eklendi.
- Sahte sunucu her okumada aynı nesneyi dönerse "okumaya bağlı" durum testleri yanılır: yeniden okumadan önce yeni nesne ver.

## Dersler (önceki oturum)
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
