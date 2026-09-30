---
guncelleme: 2026-09-29
---
# DURUM

> Oturum başında ilk okunan dosya (skill `oturum-baslat`). Oturum sonunda güncellenir (skill `oturum-kapat`).

## Şu an
**M1 · Karar motoru KAPANDI (29 Eyl gece)** — kod birleşti, aktarım bekliyor (`docs/aktarim/M1/`). **M2 · Backend
temel servisler sürüyor.** M0 kapandı (19 ADR, prototip v2, RUBİN).
Çalışma modu değişti → **ADR-019:** teknik işte agent karar verir, uygular, PR'ı `--auto --squash` ile birleştirir
(dal koruması: iki CI kontrolü zorunlu). Levent'i bekleyen: ürün kapsamı, para, sağlık/regülasyon, kullanıcı
verisinin dışarı gitmesi, hesap/sır, mağaza yayını, kişisel iş.

## Şu anki koşu — M1 kalanı + M2 (29 Eyl akşam, toplu mod; bağlam sıkışırsa buradan devam)
Prompt: `plan/oturum-promptlari/M2.md`. Levent paralelde başka işte; bu session M1 kalanını (ADR-020) ve M2'yi uygular,
aktarıma **başlamaz**; bitince M3 prompt'unu yazar (`plan/oturum-promptlari/M3.md`). **Session kapanmaz:** Levent dönünce
M1 (bu session'ın yaptığı kısım) ve M2 aktarımı bu sohbette yapılır.
**Her görev döngüsü:** `gorev-baslat` → test önce (geçerli RED) → kod → `./gradlew build` → pr-review-toolkit ajanları →
bulgular TDD ile + mutasyonla kanıt (betik: yedekten geri yükle, `git checkout` DEĞİL) → `docs/aktarim/<M>/<K-ID>.md` →
PR `--auto --squash` → bu tablo. Paralel iş: `git worktree` (`../keel-<iş>`).

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-101 değişikliği (NO_DECISION_YET gerekçeli, U14 çapa zorunlu) | ✅ birleşti | #143 | `M1/K-101.md` › ADR-020 kısmı |
| build: `tasks.register<Test>` + deprecation = kırmızı build | ✅ birleşti | #144 | (küçük) |
| K-104 kalanı (LEA, hızlı kayıp → daralt; tek hard stop) | ✅ birleşti | #145 | `M1/K-104.md` › ADR-020 kısmı |
| K-110 basamak 3 (L-12 iki sinyal) | ✅ birleşti | #146 | `M1/K-110.md` › ADR-020 kısmı |
| K-106 omurga (+ ADR-021 "sabit" ölçümü) | ✅ birleşti | #147 | `M1/K-106.md` |
| K-107 kalori merdiveni | ✅ birleşti | #148 | `M1/K-107.md` |
| K-114 başlangıç hedefi (+ `arastirma/ham/H6` Mifflin) | ✅ birleşti | #149 | `M1/K-114.md` |
| K-112 montaj (+ ADR-022 sıra; spesifikasyon 24/24 gerçek; mini cut WC-20) | ✅ birleşti | #150 | `M1/K-112.md` |
| K-113 altın senaryolar (37 yolculuk + DataSufficiency söz hatası düzeltildi) | ✅ birleşti | #152 | `M1/K-113.md` |
| K-115 sapma kalibrasyonu (aralık: formül + tartı payı; son iki pencere anlaşmalı) | ✅ birleşti | #153 | `M1/K-115.md` |
| tooling: git guard worktree dalını görür | ✅ birleşti | #151 | (küçük) |
| **M2** K-202 PostgreSQL + Flyway (+ ADR-023) | ✅ birleşti | #154 | `M2/K-202.md` |
| K-201 sözleşme v1 (+ ADR-024) | ✅ birleşti | #155 | `M2/K-201.md` |
| K-215 ortak altyapı (hata, SafeLog, health) | ✅ birleşti (gerçek Tomcat'te V3 sızıntısı bulundu, düzeltildi) | #156 | `M2/K-215.md` |
| K-203 kimlik (+ ADR-025) | ✅ birleşti; güvenlik incelemesi 3 bulgu düzeltildi | #157 | `M2/K-203.md` |
| K-204 rıza | ✅ birleşti; inceleme: AI rızası sağlayıcıya bağlandı, `seq` sırası | #158 | `M2/K-204.md` |
| K-205 profil | ✅ birleşti; inceleme: katı JSON tipleri | #159 | `M2/K-205.md` |
| K-207 besin spike (ADR-008 güncellendi) | ✅ main | — | `M2/K-207.md` |
| K-206 ölçüm (+ ADR-026) | ✅ birleşti; inceleme 5 bulgu düzeltildi | #160 | `M2/K-206.md` |
| K-210 antrenman kaydı | ✅ birleşti; inceleme 6 bulgu düzeltildi | #161 | `M2/K-210.md` |
| K-214 gizlilik (silme, dışa aktarma, egress; V7) | ✅ birleşti; inceleme: silme tekrar denenmiyordu, silinen hesabın token'ı yazıyordu → düzeltildi | #162 | `M2/K-214.md` |
| K-218 set tipi, yük modeli, e1RM (+ H3 B15) | ✅ birleşti; inceleme: int taşması, tekrar/RIR tavanı | #163 | `M2/K-218.md` |
| K-219 hareket kataloğu (40 hareket) | ✅ birleşti; inceleme: takas deseni, T-bar, face pull; K-210 beklentisi veriye göre | #164 | `M2/K-219.md` |
| K-211 program (V8, 6 şablon taslak) | ✅ birleşti; inceleme: iç içe okuma, eşzamanlı değiştirme 500, kol hacmi K-61 | #165 | `M2/K-211.md` |
| K-208 besin aralığı + barkod (V9, + H7) | ✅ birleşti; inceleme: etiket sınırı kaynaksız yön, UPC-E, göç yorumu; CI sıralama testini yakaladı | #166 | `M2/K-208.md` |
| K-209 öğün + günlük bütçe (V10) | ✅ birleşti; inceleme: boş assertion, tekrar gönderim sırası | #167 | `M2/K-209.md` |
| K-212 Snapshot + karar kaydı (V11) | ✅ birleşti; inceleme: döngü sorusu herkesten alınıyordu, yaş 0 → 500, dışa aktarmada yağ alanı | #168 | `M2/K-212.md` |
| K-213 check-in soruları + soru bütçesi | ✅ birleşti; inceleme: sorulan soruya 400 (veri GET→POST arasında değişince), GET/POST hafta kuralı ayrıydı, `needed` sonsuz döngü riski, aynı gün iki ölçüm | #171 | `M2/K-213.md` |
| K-216 kararı hedeflere uygula + geri al (V12) | ✅ birleşti; inceleme: bayat karar, split sığmayınca apply reddi, hedefsiz plan, LEA tabanı (soru 11); CI: text block boşluğu | #172 | `M2/K-216.md` |
| K-220 uyum kayıtlardan (WeekTally) | ✅ birleşti; inceleme: adım hedefi geriye uygulanıyordu, plandan önceki haftalar, K-216 yarışı (satır kilidi) | #174 | `M2/K-220.md` |
| K-217 programa yansıma (V13 tut/deload/dinlenme, V14 sonraki seans) | ✅ birleşti (iki PR); inceleme: aynı gün tutma kapanmıyordu, check-in'de başlayan tutma önceki hedefi kaçırıyordu, tek taraflı çift artış, eksik set, geç biten antrenman hedefi geri alıyordu; CI: List.of().contains(null) | #175, #176 | `M2/K-217.md` |
| K-221 TrainingStatus (set kaydından) | ✅ birleşti; inceleme: kayıt tutmayana iki haftada bir tam mola, dinlenme haftası kendini tetikliyordu, tutma haftaları gün/7, durum her okumada | #177 | `M2/K-221.md` |
| K-225 profil: 18+ ve kısıt alanı rızada (ADR-027 #13, #14) | ✅ birleşti; inceleme: kesin-18 ADR'ye yazıldı, ADR-015 tablosu | #182 | `M2/K-225.md` |
| K-223 motor: ADR-027 #0, #1, #11b, #19 | ✅ birleşti; inceleme: L-4 LEA artışını eziyordu (güvenlik), kadın penceresi, pay sınır testi | #183 | `M2/K-223.md` |
| K-226 FDC Foundation + SR Legacy (V15) | ✅ birleşti; inceleme: negatif karb Foundation'ı düşürüyordu, fl oz, eski sürüm satırları | #184 | `M2/K-226.md` |
| K-224 iç yağ tahmini (RFM + referans görünüş, V16) | ✅ birleşti; inceleme: bel 9 → RFM −336 → +6.720 kcal (olanaksız değer artık yok sayılıyor), "küçüğü" bulk kapılarını susturuyordu (artık kurala göre alt/üst), belge "yalnız kapı" diyordu | #185 | `M2/K-224.md` |
| K-222 faz/hard stop uygulaması, DECIDE_FOR_ME, döngü sorusu (V4), genel etiket | auto-merge açık (CI); inceleme: hard stop geri alınıyordu (artık 409), pencerede tartı yokken cut hedefi kalıyordu, "saklanmaz" metni; soru 23, 24. Mini cut → K-227 (M3) | #186 | `M2/K-222.md` |

**M1 önceki koşu** (öğleden akşama, hepsi birleşti): K-101 #134 · K-102 #135 · K-103 #136 · K-104 ilk kısım #137 ·
K-105 #138 · K-108 #139 · K-109 #140 · K-110 ilk kısım #141 · K-111 #142. Aktarım dosyaları `docs/aktarim/M1/`.

**Kararlar:** ADR-020 (L-1…L-13, M2/M3 ön kararları). Apple kimlikleri (Team/Bundle/Services ID): Levent "sonra vereceğim"
dedi → kod değer beklemeden yazılır, yapılandırmadan okunur; session sonunda sorulacak.

## ▶ DEVAM NOKTASI (30 Eyl, dördüncü oturum — bağlam dolmadan yazıldı; devam prompt'u `plan/oturum-promptlari/M2-devam-3.md`)
Bu oturum birleştirdi: K-206 #160, K-210 #161, K-214 #162, K-218 #163, K-219 #164, K-211 #165, K-208 #166, K-209 #167,
K-212 #168. Hepsinde inceleme ajanları + TDD + mutasyon + aktarım dosyası tamam.
0. **(güncel, 30 Eyl öğleden sonra)** M2 uygulaması bitti. Cevap işleri: K-225 #182, K-226 #184, K-223 #183, K-224 #185
   birleşti; **K-222 #186 auto-merge açık** (CI yeşil olunca birleşir; kırmızıysa düzelt). README düzeltmesi #186 içinde.
   `plan/oturum-promptlari/M3.md` yazıldı. Açık sorular: 21, 22, 23, 24 (+ Apple kimlikleri) → M3 prompt'u ilk iş olarak
   sorar. Kalan: #186 birleşince `python3 tools/sync_backlog.py --apply` (K-227 issue'su), worktree `../keel-k222` sil.
   Session açık: Levent dönünce **M1 (akşam) + M2 aktarımı** (skill `aktarim`, `docs/aktarim/M1/`, `M2/`).
1. **(bitti) K-213** `decision/37-check-in-questions` (`../keel-k213`, main üstünde, göç yok) → **PR #171, auto-merge
   KAPALI**. Kod + testler yazıldı ve itildi; yerel saf testler yeşil (QuestionBudgetTests, WaistTrendTests,
   MissingAnswerTests, CheckInPartsTests), DB testleri (CheckInQuestionsApiTests, DecisionServiceTests) CI'da.
   **Kalan:** (a) CI sonucuna bak (ccd_pr `get_status`, `gh` ile yoklama yok); kırmızıysa düzelt; (b) inceleme ajanları
   (code-reviewer + pr-test-analyzer) `git diff origin/main...HEAD`; bulgular TDD; (c) mutasyon (saf: CheckInQuestions,
   WaistTrend, missingAnswer); (d) `docs/aktarim/M2/K-213.md` + README satırı (K-212'nin kalıbıyla); (e) `gh pr merge
   --auto --squash 171`.
   K-213 tasarımı: soru = motorun bekleyeceği cevap (`WeeklySpine.missingAnswer`, yalnız TRAINING/RECOVERY); motor veriyle
   ve her olası cevapla kuru çalıştırılır (`CheckInQuestions.needed`); bütçe `quota.yaml` (`QuestionBudget`: 2, veri faza
   ters ise 5); görünüş haftanın foto kontrolünden, bel `WaistTrend` ile karar penceresinden (`Measurements.photoLook`,
   `Measurements.waists`); sorulmayan soruya cevap 400. K-212'nin bir testi buna göre değişti (LOOK cevabı → cevapsız).
2. **Kalan M2 sırası:** **K-216** kararı hedeflere uygula + geri al (decision; `DailyTargets` bean'ini decision sağlar —
   K-209'daki arayüz; `CallStore.Application` PENDING→APPLIED/UNDONE; plan.target_kcal güncellenir; U3 tek değişken) →
   **K-220** haftalık uyum kayıtlardan (backlog'a eklendi, #169; WeekTally) → **K-221** TrainingStatus set kaydından (#170)
   → **K-217** programa yansıma (deload `until`, `nextLoadKg/nextReps`, bölgeye göre yük adımı). Sonraki göç **V12**.
3. **Kurallar (bu koşuda öğrenilen, hepsi geçerli):** her uç noktada rıza kapısı (sağlık verisi), `ApiLimits`, 400 asla
   500 (motorun reddettiği veri 409), `Decimals.plain`, clientId idempotency (tekrar gönderim önce saklananı döner), katı
   JSON, sözleşmede sınırlar (ADR-024 §13), `*AccountData` (silme + dışa aktarma; `AccountDataTests` fixture'ına yeni tablo
   verisi ekle), satır eşleyicide sorgu yok (düz sorgular), U4 yağ tahmini hiçbir çıktıda yok.
   - **⚠ DİSK DOLU:** Mac'te ~1 GB boş, Docker açılmıyor → DB testleri yalnız CI'da. Worktree'de yalnız `contracts` için
     `npm ci` (43 MB); mobil `node_modules` kurma. Worktree silerken `--force`.
   - **PR takibi:** PR açınca ccd_pr `get_status` (CI'yı `gh pr checks` ile yoklama).
   - **Mutasyon betiği** `plan/oturum-promptlari/mutate.py` (düzeltildi: içeriği geri yazar + sonda yeniden derler).
     Kullanım: `MUT_DIR=. python3 plan/oturum-promptlari/mutate.py ../keel-<iş> '<tek test sınıfı>' <json>`; DB testi
     içeren filtre verme (Docker yokken her mutantı "öldü" sayar).
   - RED geçerliliği: iskelet null dönerse NPE → geçerli RED değil; iskelet gerçek ama eksik değer döndürsün.
4. **Bitiş:** sorular (aşağıdaki liste, 0-20) AskUserQuestion ile toplu → cevapları ADR'ye işle → kalan iş →
   `plan/oturum-promptlari/M3.md` (M3 · Mobil kabuk; kabul kriterlerine: tek uçuşlu refresh ADR-025, UPC-E sunucuda açılır,
   Dependabot #2) → özet. Session kapanmaz; M1 (akşam kısmı) + M2 aktarımı sonra (skill `aktarim`, `docs/aktarim/M1/`, `M2/`).

## Session sonunda Levent'e sorulacaklar
**Hepsi cevaplandı (30 Eyl) → `plan/kararlar/ADR-027-m2-sonu-cevaplari.md`.** Açık kalan: Apple kimlikleri (M3 başında).
21. **(K-225 incelemesi, veri/hukuk — YENİ)** Rıza geri alınınca sağlık verisi **silinmiyor, yalnız gizleniyor**
    (`ConsentWithdrawn` olayını dinleyen modül yok; tüm sağlık verisi için aynı). GDPR Md. 7(3)/17: geri çekme silmeyi
    zorunlu kılmaz ama beklenir. Seçenekler: (a) geri çekince o rızaya bağlı veri silinsin (geri dönüşsüz, uyarıyla);
    (b) gizlensin, kullanıcı ayrıca silebilsin (şimdiki + silme düğmesi); (c) belirli süre sonra silinsin.
22. **(K-224 incelemesi, sağlık — YENİ)** ADR-027 #11 "bel/boy bandı **yalnız kapı için**" dedi. Kod RFM'i nokta tahmin
    olarak okuyor ve bu sayı faz kapısı + L-4'ün yanında **LEA tabanının kcal büyüklüğünü** de belirliyor (yağsız kütle =
    kilo × (1 − yağ); ±5 puan hata tabanı erkek 80 kg'da ~±100 kcal oynatır). İki tahmin varken alt olanı okur (temkinli).
    Seçenekler: (a) böyle kalsın — LEA ağı RFM'le de çalışsın (şimdiki; görünüş seçmeyen ama belini ölçen korunur);
    (b) LEA ağı ve tabanı yalnız görünüşle, RFM yalnız faz kapısı/L-4 için; (c) LEA'da RFM'in bandının temkinli ucu
    (alt − 5/6 puan) okunsun.
23. **(K-222 incelemesi, sağlık — YENİ)** Hard stop (adet kaybı → açık biter, plan BULK + bakım) **ne kadar sürer?** Şimdi:
    bakım gözlemi (kadında 28 gün) bitince motor normal işler; yağ tahmini bulk tavanının (%30) üstündeyse faz kapısı cut'a
    döndürür ve açık geri gelir. Döngü sorusu yalnız plan yine LOW olunca sorulur. Geri alma (undo) kapalı (L-1).
    Seçenekler: (a) hard stop'tan sonra N hafta (ör. 12) cut'a dönüş ve aşağı adım yok; (b) cut'a dönmeden önce döngü
    sorusu yeniden sorulsun ("hayır" gelirse dönülür); (c) kullanıcı "doktorum onayladı" diyene kadar sürsün.
24. **(K-222 incelemesi, veri/hukuk — YENİ)** ADR-027 #18 "karar saklanır, adet cevabının izi kalmaz" diyor; ama HARD_STOP
    yalnız "evet" cevabıyla çıkıyor → saklanan/dışa aktarılan karar türü cevabı ele veriyor (GDPR Md. 9). Şimdi: gerekçe
    genel etiket, metin "cevabın saklanmaz; planı değiştirirse o değişiklik saklanır" diyor. Seçenekler: (a) böyle kalsın
    (karar = denetim izi); (b) karar türü de genel saklansın (ör. INCREASE_CALORIES + "güvenlik" etiketi); (c) HARD_STOP
    kararı belirli süre sonra silinsin.

## Teknik kararlar (bu koşu, aktarımda anlatılacak)
- U14 çapa kuralı: çapa dosyada başlık (`### K-17 ·`, `## 3.4`, `### 🚨 L2.1 ·`) ya da kalın etiket (`**U2 ·`) olmalı;
  `SourceAnchorTests` parametreleri, spesifikasyonu ve koddaki dizgileri tarar.
- Snapshot record + wither kalıbı (`withEnergy`, `withMenstrualLossReported`); TrainingStatus aynı kalıp.
- EA bandı motordan enum olarak çıkar, sayı çıkmaz (U4); LEA sınırı "≤" (ADR metni); `leaFloorKcal` K-107'nin tabanı.
- Güvenlik fonksiyonları Snapshot/Parameters cinsiyet uyuşmazlığında hata fırlatır.
- `org.gradle.warning.mode=fail`: her Gradle deprecation CI'da kırmızı.

## Levent'i bekleyen (acil değil)
- **Design eklentisi** (claude.ai kataloğu, `design-critique`): CLI'dan kurulamıyor, karttan bir tık. Kurulmazsa
  `frontend-design` + kendi eleştiri turum yeterli.
- **Expo MCP girişi:** `expo` eklentisinin MCP sunucusu (`mcp.expo.dev`) Expo hesabıyla giriş ister; EAS derlemesi
  (K-308) gelince gerekecek.
- İsteğe bağlı: RUBİN 5 saniye testi (8 kişiden 2'den fazlası "kadın uygulaması" derse Saha `#0B7F05`).

## Otomasyon (29 Eyl, ADR-019)
- GitHub: yalnız squash, auto-merge açık, birleşen dal silinir · `main` koruması: `Backend (Gradle build)` +
  `Mobile (typecheck, lint, test)` zorunlu, doğrusal geçmiş, force push kapalı
- Dependabot: güvenlik uyarıları + güvenlik düzeltme PR'ları; Actions sürümleri haftalık (`.github/dependabot.yml`)
- Zorunlu CI kontrolleri: Backend · Mobile · **Tooling (git guard)** · action'lar SHA'ya sabit (PR #133)
- Claude Code eklentileri (proje kapsamı): `expo`, `security-guidance`, `jdtls-lsp`, `typescript-lsp`, `pr-review-toolkit`
  (yerel: `brew install jdtls`, `npm i -g typescript-language-server typescript`)
- Vendor skill'ler: `test-driven-development`, `systematic-debugging`, `verification-before-completion`,
  `property-based-testing` · Git koruması: `.claude/hooks/git_guard.py` + `.githooks/commit-msg`
- **Zamanı gelince alınacak skill'ler** (L4, görev `refs`'inde): Postgres/Flyway → K-202 · sözleşme skill'i (spectral +
  oasdiff) → K-201 · RNTL → K-301 · app-store-review + `claude-security` → K-803/K-903

## Gece kurulumu — ne yapıldı (29 Eyl)
- [x] Anayasa ve hafıza: `CLAUDE.md`, `docs/anayasa.md` (U1-U15, V1-V6, K1-K10, G1-G4), `docs/aktarim-protokolu.md`,
      `docs/sozluk.md`, 7 skill, agent hata modları tablosu
- [x] 15 ADR (2 KABUL: yığın, görsel dil · 13 ÖNERİ) + `docs/mimari.md`
- [x] Yol haritası (11 kilometre taşı) + backlog: 95 görev, her birinde neden/kabul kriteri/test/kaynak/öğrenme
- [x] Prototip: 28 ekran, görsel dil C
- [x] Backend: Spring Boot 4.1.1 + Modulith 2.1.1, Java 25, 12 modül, mimari testler (modül sınırı, satır içi sürüm
      yok, parametre kaynağı) · `./gradlew build` yeşil
- [x] Motor parametreleri: 49 parametre, her biri kaynaklı (`data/parameters/`)
- [x] Haftalık check-in spesifikasyonu: 20 satır (`backend/src/test/resources/spec/weekly-checkin.yaml`) ·
      `./gradlew pendingTest` → 20/20 kırmızı (bilerek)
- [x] Mobil: Expo SDK 57 + expo-router (js-tabs), 4 sekme, C token'ları, metin sistemi · `npm run check` yeşil ·
      iOS paketi üretildi
- [x] Sözleşme iskeleti (`contracts/openapi.yaml`) · CI (GitHub Actions) yeşil
- [x] GitHub: private repo `leventtcaan/keel` + Project + 95 issue (`tools/sync_backlog.py`)

## Eklenen bağımlılıklar (K5 — gece kapsamında, Levent'in incelemesine)
- Backend: `spring-boot-starter`, `spring-modulith-starter-core`, test: `spring-boot-starter-test`,
  `spring-modulith-starter-test`, `snakeyaml` (Boot BOM sürümü; ParameterProvenanceTests için)
- Mobil: Expo SDK 57 varsayılan şablonunun paketleri + geliştirme: `eslint`, `eslint-config-expo`, `jest`, `jest-expo`,
  `@types/jest`, `@types/node` (hepsi `npx expo install` ile SDK uyumlu)

## Açık sorular (Levent'e)
1. **Dil modeli sağlayıcısı** (29 Eyl'de açıklandı): M5'te üç sağlayıcı kendi değerlendirme setimizle ölçülüp seçilecek
   (görev K-511). Rıza ekranı seçilen şirketin adını yazacak.
2. **Güray'ın kurallarının açık kural kitabında yayınlanma izni**
3. **Kaynak bekleyen motor kuralları (U14):** "zor set" hangi RIR, aradan sonra dönüş yükü, yoğun hafta kısa seans

## 29 Eyl sabah turu — sonuç
- L1-L3 araştırmaları yapıldı · **ADR-016** (RUBİN, koyu mod, Liquid Glass sistem katmanı; ADR-014'ün yerine) ·
  **ADR-017** (hareket gösterimi: Levent çeker, ilk/son tekrar) · **ADR-018** (Health'e yazma, içe aktarma) — üçü KABUL
- Backlog 95 → **129 görev**; L3'ün 16 plan hatası onarıldı; M11 eklendi; senkron aracına sıralama doğrulaması eklendi
- Prototip v2 yayınlandı (K-012 ✓): 37 ekran, RUBİN açık/koyu, hareket gösterimi, ayarlar, durum modu, kilit ekranı, "ne değiştirir" simülatörü, karar defteri, paylaşım kartı
- K-011 kapandı: 13 ADR KABUL, prototip ve renk onaylandı (Levent: "her şey kabulüm")

## Levent cevapları (29 Eyl sabah)
- **Bildirim bütçesi: 3 tür** (antrenman öncesi · Pazartesi check-in · 7 gün sessizlik), haftalık adet sınırı yok. Tetikleyiciler (K-512) push değil uygulama içi soru (Levent onayladı).
- ADR'leri okudu; eksik buldu: **hareket gösterimi** → araştırılıyor (L1)
- Renklerin başka bir uygulamadan çalıntı olmaması ve güncel/psikolojik olarak doğru tasarım → araştırılıyor (L2)
- Eksik zorunlu özellikler + yaratıcı öneriler → araştırılıyor (L3)
- **Expo resmî eklentisi: onaylandı** (+ Anthropic Design eklentisi önerildi); Levent "ne yaptığını söyleyerek inisiyatif al" dedi
- VPS: Contabo giriş segmenti, boş · Alan adı: yok, sonra alınır (K-903 geçici `dev.leventtcaan.keel`)

## Gece yakalanıp düzeltilenler (bilgi için)
- **RIR mantık hatası:** "aynı yükte düşen RIR" ilerleme diye yazılmıştı — yanlış; aynı yük ve tekrarda RIR'ın düşmesi
  setin zorlaştığını (gerilemeyi) gösterir. Prototip, backlog ve araştırma düzeltildi (araştırmada düzeltme notuyla).
- **Kalori adımı ↔ BMR tabanı:** prototipteki "60 g karb düşür" örneği Güray'ın 500 kcal minimum adımıyla çelişiyordu;
  kalori tabana yakınken motor hareketi değiştirir (spesifikasyon WC-12).
- **Bakım kalorisi gözlemi 21 → 14 gün:** 14 hem Güray'ı (1-2 hafta) hem literatürün alt sınırını sağlıyor.
- **Expo SDK 57:** `import { Tabs } from 'expo-router'` deprecated → `expo-router/js-tabs` (kurulu sürümde doğrulandı).
  TypeScript 6 `@types/*` paketlerini otomatik dahil etmiyor → `tsconfig.json › types`.

## Kapananlar
- 2026-09-08 → 11 · Faz 1-4 araştırması (Studio'da yapıldı, `arastirma/`'ya taşındı)
- 2026-09-29 · Levent kararları: yığın Spring Boot + Expo · görsel dil C · günlük sayı tutarlılık · program ikisi de ·
  sadece İngilizce · isimsiz ürün sesi · ana ekran Bugün · commit'te AI imzası yok · yalnız Claude Code (AGENTS.md yok)
- 2026-09-29 · M0 gece kurulumu (yukarıda)

## Riskler
- **Türk ürün kapsamı (K-207):** USDA FDC Branded'da Türk markaları yok denecek kadar az ("ülker" 2 ithal kayıt,
  "torku"/"tadım" 0). Barkod Türkiye'de çoğunlukla "bulunamadı"; genel gıda eşlemesi çalışır. Ürün kararı Levent'te
  (soru 10).
- **Dependabot #2 · decode-uri-component ≤0.4.2** (orta, DoS): expo-router → query-string@7 üzerinden uygulamada çalışıyor.
  Düzeltme 0.5.0 yalnız ESM, query-string@7 CJS → override kırar. Etki: bozuk bir derin bağlantı kullanıcının kendi
  uygulamasını dondurabilir. **Bekliyor:** Expo güncellemesi; her SDK yükseltmesinde kontrol. (#1 uuid kapatıldı:
  yalnız derleme zamanı, `uuid.v4()` tampon olmadan, etkilenmiyor.)
- **Retention ↔ geç değer:** Apple sıralaması retention'a bakıyor, değerimiz 4-8 haftada geliyor → U15 ve günlük
  tutarlılık sayısı bunun için var. `arastirma/05-faz4-pazarlama.md` §2
- **Apple Intelligence cihaz payı bilinmiyor** → cihaz üstü katmanın kapsamı belirsiz (ADR-004, K-510)
- **Egzersiz eşleme doğruluğu için benchmark yok** — kendimiz ölçeceğiz
- **Kadın parametrelerinin bir kısmı zayıf kanıtlı** (kas kazanım ×0,5) — `data/parameters` notlarında işaretli
