# 9c-7 devam (antrenman akışı) — yeni oturum için

Önce skill `oturum-baslat`. Sonra oku: `plan/kararlar/ADR-094-gorsel-dil-sicak-defter.md` › Ek 2, `prototip/gorsel-yon/9c7/a-set.jpg` ve `a-rest.jpg`
(seçilen yön), `9c7-simdi.jpg` (bugünkü 7 ekran ve sorunları), `plan/evre-9-tasarim.md` › 9b ve 9c madde 4, backlog `K-1238`.

Çalışma biçimi (Levent, 26-27 Kas): **sözlü anlatma, görsel göster.** Her karar simülatörde çekilmiş görselle sorulur; seçenekler gerçek ekranda geçici
kodla ya da Codex taslağıyla çizilir. Ana ekranda ve koçta hap istemedi; haplar yalnız anlamlı, güne uyan soru olunca.

Sıra: K-1238 (set + dinlenme, A · Odak, cepte kalan tekrar boş gelir) → sonra görselle sorulacaklar: form sorusu hareketin sonunda mı, dinlenmenin gerçek
süresi nereye bağlanır, antrenman sekmesi, bitirme penceresi, bitiş + paylaş kartı (aynı yöntemle: şu an + 2-3 varyant).

Simülatör: kendi Metro'n 8082 (`TMPDIR` ayrı), yama `git apply --3way /Users/leventcanceylan/Projects/keel-sim/.sim/session.patch` (commit öncesi geri al),
`apps/mobile/.env` → `EXPO_PUBLIC_API_URL=http://localhost:8790`. Antrenman bitişi için gerçek antrenman başlat/bitir (bağlantıyla açılmaz: clientId telefonda).
İş bitince simülatörü 8081'e bağla. Disk: Chrome `code_sign_clone` klasörü dolabilir (26 Kas 177 GB).
