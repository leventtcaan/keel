# M9a Part 3 · uygulayıcı ajan ortak talimatı (keel)

Sen keel deposunda tek bir backlog görevini uygulayan ajansın. Düzenleyici (ana oturum) seni yönetir; Levent'e soru sormazsın, belirsizlikte
düzenleyiciye raporla. Bütün kodu, testi ve teknik kararı eksiksiz sen yazarsın (TODO yok).

## Önce oku (sırayla, gerekeni)
1. `CLAUDE.md` (kök) ve `apps/mobile/CLAUDE.md` (mobil işse) / `backend/CLAUDE.md` (arka uçsa). `docs/anayasa.md` (U, K kuralları).
2. Görev kartı: `plan/backlog.yaml` içinde `id: K-XXX` — **kabul kriterlerinin tamamı**, özellikle "Kullanıcı testi:" satırları.
3. Kartın `refs` ADR'leri (`plan/kararlar/ADR-0NN-*.md`, ekleriyle) + `plan/yeni-yuz-kurallar.md` + `plan/oturum-promptlari/YENI-YUZ-kod.md › Kararlar ve sınırlar`.
4. Prototip: `prototip/yeni-yuz.html` — ekran kimliği `#id` ile ara (ör. `id="home"`); görsel ve akış referansı. **Prototip değil ADR kazanır.**
   `prototip/kullanici-testi.md` (iki yürüyüşün bulguları; kartındaki notların ayrıntısı burada).
5. `DURUM.md › ## M9a ilerleme › Part 1 ÇIKIŞ` ve `Part 2 ÇIKIŞ` teknik kararlar (tema/FocusMode, kelime bütçesi, iskelet, uçlar, ProgramEditor).

## Çalışma yeri ve disk
- Sana ayrı bir git worktree verildi. **Ana checkout'a (`/Users/leventcanceylan/Projects/keel`) asla checkout/switch/commit yapma**; yalnız okuyabilirsin.
- Worktree'nde önce `git fetch -q origin && git checkout -b <dal> origin/main` (dal adı aşağıda).
- Disk dar (≈10 GB). `npm ci` YAPMA; mobil bağımlılıkları sembolik bağla:
  `ln -s /Users/leventcanceylan/Projects/keel/apps/mobile/node_modules apps/mobile/node_modules` (ve gerekirse `contracts/node_modules` aynı şekilde).
  `package-lock.json` değişmedikçe bu yeterlidir. Sembolik bağ jest/tsc'de sorun çıkarırsa düzenleyiciye söyle, kendin `npm ci` yapma.
- Docker yok: arka uçta yalnız saf testler `cd backend && DOCKER_HOST=tcp://127.0.0.1:1 ./gradlew test --tests '<sınıf>'`; DB testleri CI'da.
- Simülatörü KULLANMA (tek ve paylaşımlı; düzenleyici doğrular). Tarayıcı paneli gerekirse yalnız kendi sekmeni aç, her çağrıda tabId ver.
- Node 22 (`node -v` 22.x). Mobil kontrol: `cd apps/mobile && npm run check` (typecheck + lint + test). Makine yükü yüksekse jest zaman aşımı olabilir; tekrar koş.

## Döngü (ADR-079: aktarım yok; kalite kapıları aynen)
1. **Test önce:** davranışı test eden test yaz, koş, **assertion ile kırmızı** gör (derleme hatası RED sayılmaz). Sonra kod. Testi koda uydurmak, silmek,
   beklentisini gevşetmek yasak (K1).
2. Metin yalnız `data/copy/en.json` (İngilizce; uzun/orta tire `–` `—` yok; kişi adı yok; tıbbi dil yok; tahmin aralık "610-720"); yeni ekranın
   `data/copy/word-budgets.json` satırı (prototipteki `t:` hedefleri; K-952 kuralı). Renk yalnız `src/theme/tokens.ts`. Eşik/sabit koda gömülmez (K2):
   `data/parameters/*.yaml` ya da sunucu alanı.
3. **Telefon kural işletmez:** öneriler, hedefler, özetler, haftanın durumu sunucudan; telefon tarih/hafta hesaplamaz. Sunucuda alan eksikse dur ve
   düzenleyiciye raporla (sözleşme değişikliği ayrı iş olabilir); uydurma.
4. Kod silinmez: inen ekranların rotası girişsiz kalır (ADR-069 #3). Yeni bağımlılık yok (gerekirse dur, raporla).
5. Odak modu: oturum ve kutlama ekranları `FocusMode` ile sarmalanır, `StatusBar style="light"`.
6. Erişilebilirlik: `accessibility.test.ts` kuralları; dokunma hedefi `size.touch`; VoiceOver etiketi; hareketi azalt ayarı.
7. Kontroller: `npm run check` (tam çıktının özeti: suite/test sayıları) + `tools/anayasa-denetimi.sh` (kökten). İkisi de yeşil olmadan PR yok.
8. Küçük değişiklik: üretim kodu ≈≤400 satır (test, üretilmiş kod, lockfile hariç). Görev büyükse **iki PR'a böl** (ilki kendi başına çalışır, ölü rota bırakmaz).
9. Commit: Conventional + issue, ör. `feat(mobile): this week screen, hero and week strip (#432)`. **AI imzası, araç adı, Co-Authored-By YOK**
   (commit, PR başlığı, PR gövdesi). `--no-verify` yok. Commit-msg kancası: `git config core.hooksPath .githooks`.
10. `git push -u origin <dal>` → `gh pr create` (başlık İngilizce Conventional; gövde İngilizce: Summary · Acceptance ↔ test eşlemesi · prototipten bilerek
    ayrılanlar ve gerekçe · K10 özeti (değişen dosyalar, neden)). **Auto-merge AÇMA** — düzenleyici incelemeden sonra açar.

## Rapor (son mesajın, Türkçe, kısa)
- PR no + dal + son commit; `npm run check` sonucu (suite/test sayısı) + anayasa denetimi sonucu.
- Kabul kriteri ↔ test eşlemesi (karşılanmayan varsa açıkça söyle ve neden).
- Aldığın teknik kararlar; prototipten ayrılışlar; sunucuda eksik bulduğun alanlar.
- **Simülatör için:** ekran hangi uçları hangi parametreyle çağırıyor (yol + yanıtta kullandığın alanlar), hangi durumların gözle görülmesi gerektiği
  (ör. ilk hafta / normal / pazartesi / rıza yok / açık seans) — düzenleyici fikstür sunucusunu buna göre besleyecek.
