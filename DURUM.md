---
guncelleme: 2026-09-29
---
# DURUM

> Oturum başında ilk okunan dosya (skill `oturum-baslat`). Oturum sonunda güncellenir (skill `oturum-kapat`).

## Şu an
**M0 · Temel KAPANDI (29 Eyl).** 19 ADR KABUL, prototip v2 onaylandı, RUBİN kesin. **Sırada M1 · Karar motoru.**
Çalışma modu değişti → **ADR-019:** teknik işte agent karar verir, uygular, PR'ı `--auto --squash` ile birleştirir
(dal koruması: iki CI kontrolü zorunlu). Levent'i bekleyen: ürün kapsamı, para, sağlık/regülasyon, kullanıcı
verisinin dışarı gitmesi, hesap/sır, mağaza yayını, kişisel iş.

## Akşam oturumu — Levent dönünce (önerilen sıra, ~2 saat)
1. **Kararlar (15 dk):** aşağıdaki "Akşam sorulacaklar" L-1…L-11 — en acili L-1 (K-104 hard stop) ve K-106 tasarımı.
   Cevaplar gelince K-104'ün kalan iki kuralı ve K-106 → K-107 → K-112 zinciri açılır.
2. **Aktarım (merdiven, 2-3 basamak/mesaj):** `docs/aktarim/M1/` sırasıyla K-101 → K-102 → K-103 → K-104 → K-105 →
   K-108 → K-109. Her dosyada basamaklar, satır satır yerler, canlı kanıt ve soru bankası hazır.
3. Levent kendi cümleleriyle anlatır → Apple Notes (Keel klasörü, `ders-notu`) — en son.

## M1 koşusu — toplu mod (29 Eyl öğleden itibaren; bağlam sıkışırsa buradan devam)
Levent paralelde başka işte; M1'i agent uygular, akşam toplu aktarım (`docs/aktarim-protokolu.md` › Toplu mod).
**Her görev döngüsü:** `gorev-baslat` → test önce (RED çıktısı) → kod → `./gradlew build` → pr-review-toolkit
(code-reviewer + pr-test-analyzer, gerekirse silent-failure-hunter/type-design-analyzer) → düzelt → aktarım dosyası
`docs/aktarim/M1/K-1NN.md` → PR `--auto --squash` → CI yeşil + birleşti → aşağıdaki satırı işaretle → sıradaki.
**Eksik eşik politikası (Levent, 29 Eyl):** araştırmadan kaynakla koy (dosya + kural no + tag; çelişkide Güray),
"Onay bekleyen eşikler" listesine yaz.

| Görev | Durum | Dal / PR | Aktarım |
|---|---|---|---|
| K-101 alan tipleri | ✅ birleşti | PR #134 | `docs/aktarim/M1/K-101.md` |
| K-102 parametre yükleme | ✅ birleşti | PR #135 | `docs/aktarim/M1/K-102.md` |
| K-103 trend, veri yeterliliği | ✅ birleşti | PR #136 | `docs/aktarim/M1/K-103.md` |
| K-104 güvenlik ağı | kısmi ✅ birleşti (tavan + BMR); 8%/EA L-1'i bekliyor | PR #137 | `docs/aktarim/M1/K-104.md` |
| K-105 faz kapısı | ✅ birleşti | PR #138 | `docs/aktarim/M1/K-105.md` |
| K-106 check-in omurgası | **tasarım önerisi, akşam konuşulacak** | `plan/m1-k106-tasarim-onerisi.md` | |
| K-107 kalori merdiveni | — | | |
| K-108 makrolar | ✅ birleşti | PR #139 | `docs/aktarim/M1/K-108.md` |
| K-109 progresyon | ✅ birleşti | PR #140 | `docs/aktarim/M1/K-109.md` |
| K-110 deload | kısmi, inceleme (basamak 3 L-12'yi bekliyor) | `engine/21-deload` (worktree `../keel-k109`) | — |
| K-111 tutarlılık sayısı | — | | |
| K-112 karar montajı | — | | |
| K-113 altın senaryolar | — | | |
| K-114 başlangıç hedefi | — | | |
| K-115 sapma kalibrasyonu | — | | |

**Onay bekleyen eşikler (akşam Levent'e):**
- `min_weighins_per_week: 4` (windows.yaml, K-103) — araştırmada sayı yok; H1'in 0,42 kg gürültü SD'sinden türetildi:
  n=4 → iki haftalık ortalama farkında ~0,3 kg/hafta ayırt edilir; n=2 → yavaş kaybı sabitten ayıramaz. Sonuç: ilk karar
  pratikte pencere kadar (erkek 21, kadın 28 gün) düzenli tartıdan sonra gelir.
- `plateau_sessions: 3` (training.yaml, K-110) — H3 B5 "3 ardışık seans" (uzman görüşü, RCT yok).
- `protein_female_higher_from_age: 45` (nutrition.yaml, K-108) — J1 C5 perimenopoz ~45 (kaynakta açık; bilgi için).
- Faz kapısı çizgileri `fat_first` {25,35}, `surplus_below` {12,22} (safety.yaml, K-105) — Güray + J1 +10 ofset (bilgi için).
**Akşam sorulacaklar:**
1. (K-101) NO_DECISION_YET de en az bir gerekçe taşımalı mı? Kabul kriteri izin veriyor; spesifikasyonda hepsi gerekçeli;
   inceleme ajanı "evet" öneriyor (U2: neyin kararı değiştireceği söylenebilsin). Öneri: evet → kriter + test değişir (K1).
2. (K-101) U14 "dosya + kural no": kaynaklarda `#K-n` çapası zorunlu olsun mu? Bugün parametrelerin bir kısmı dosya düzeyinde.
3. (K-101 inceleme) INCREASE_CALORIES (güvenlik) ile ADJUST_CALORIES(yukarı, bulk adımı) ayrı mı kalsın? Faz değişimi
   (K-105 "tavan üstü → cut") için ayrı eylem gerekir mi? — K-105/K-107'de teknik öneriyle gelecek.
4. **Sağlık/ürün kararları L-1…L-8** → `plan/m1-kural-haritasi.md` (kaynak satırlarıyla). En acili **L-1**: K-104 kartı
   "8 haftada >%8" ve "EA ≤30" için hard stop diyor, kaynak (J1 C6/L2.1) "açığı daralt + uyar" diyor; tek hard stop adet
   kaybı bildirimi. Bu iki kural L-1 cevaplanana kadar yazılmıyor; K-104'ün geri kalanı yazılıyor.
5. **K-106 tasarımı** → `plan/m1-k106-tasarim-onerisi.md` (L-5, L-6, L-9, L-10 orada)
6. Bilgi (K-105): zorunlu bulk geçişi kaynağa göre <%12 (kadın <%22); %12-25 kullanıcının hedefine bırakıldı → hedef girdisi ürün kapsamı
7. **L-11** (K-108): kalori hedefi makro tabanlarının (protein + yağ tabanı + karb tabanı) altında kalırsa motor bölünme
   uydurmuyor, `TargetTooLow(en düşük kcal)` diyor. Omurga o zaman ne yapsın: kaloriyi yükselt mi, hareketi mi artır?
   Öneri: BMR tabanı gibi CHANGE_MOVEMENT (G2:869).
8. **L-12** (K-110): Güray kendi içinde çelişiyor — G7 K-68 basamak 3 "geçen haftanın kilosunu kaldıramıyorsan yorgunluk
   değil, beslenme/uykuya tek tek bak" · K-70/K-73 "plana uyamıyorsan overtraining, 1 hafta TAM mola". Aynı belirtiye iki
   tedavi. Deload merdiveninin 3. basamağı (FULL_REST_WEEK) ve WC-18'in 0,4 eşiği (kaynaksız) bu karara bağlı.
9. K1 açıklaması: K-103'te iki testin beklenen tarihi (kırılan `nextReview` sözü), K-108'de iki testin beklentisi
   (sessiz kalori aşımı → `TargetTooLow`) inceleme bulgusu üzerine değişti. Testler birleşmeden önce, aynı dalda.
**Alınan teknik kararlar (aktarımda anlatılacak):**
- K-101: Action = sealed interface + record, ActionType ayrı kimlik (tek exhaustive switch) · CopyKey/RuleId değer tipleri ·
  Source yalnız arastirma/*.md · PRODUCT etiketli kaynak kural gerekçesi olamaz (U14) · EnginePurityTests: yalnız JDK,
  I/O/saat/rastgelelik/ortam yok · ArchUnit test bağımlılığı (Modulith BOM sürümü)
- K-102: motor dosya okumaz; ham YAML → `ParameterSet` (tüm hatalar birden) · `Unit` enum (tür + aralık: oran ≤1, gün tam
  sayı) · min≤max çiftleri · hash = key|unit|male|female (not/kaynak hariç), format testle sabit · quota motor dışı ·
  çağıran katı YAML kullanır (yinelenen anahtar hata) — üretim okuyucusu M2 `decision` modülünde
- K-103: jqwik 1.10.1 (JUnit Platform 6 üzerinde denendi, shrink çalışıyor) · Snapshot'a planStart + WeightSeries ·
  14 gün kuralı ilk tartıdan sayılır (ADR-018 içe aktarma) · kontrol sırası: 14 gün → pencere → haftalık tartı ·
  nextReview = üç kapının birlikte açıldığı en erken gün (simülasyon)
- K-104: kayıp tavanı yalnız cut'ta ve iki yoğun ardışık haftada (tek tartıda gürültü tavanı aşar) · güvenlik kararı HIGH
- K-105: yeni eylem CHANGE_PHASE(faz) — veri taşıyan ilk eylem · Snapshot'ta isteğe bağlı iç yağ tahmini (U4: yansımalı
  test çıktıda yağ/yüzde alanı olmadığını kanıtlar) · yeni parametreler fat_first {25,35}, bulk_band_min {15,25} (Güray + J1 ofset)

## Aktif görev
K-110 (kısmi) öz-denetimde · sıradaki K-111 tutarlılık · K-106 akşam kararına bağlı

## Sıradaki tek adım
Tablodaki ilk açık görev. Levent dönünce: skill `aktarim` ile `docs/aktarim/M1/` sırasıyla.

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
- **Dependabot #2 · decode-uri-component ≤0.4.2** (orta, DoS): expo-router → query-string@7 üzerinden uygulamada çalışıyor.
  Düzeltme 0.5.0 yalnız ESM, query-string@7 CJS → override kırar. Etki: bozuk bir derin bağlantı kullanıcının kendi
  uygulamasını dondurabilir. **Bekliyor:** Expo güncellemesi; her SDK yükseltmesinde kontrol. (#1 uuid kapatıldı:
  yalnız derleme zamanı, `uuid.v4()` tampon olmadan, etkilenmiyor.)
- **Retention ↔ geç değer:** Apple sıralaması retention'a bakıyor, değerimiz 4-8 haftada geliyor → U15 ve günlük
  tutarlılık sayısı bunun için var. `arastirma/05-faz4-pazarlama.md` §2
- **Apple Intelligence cihaz payı bilinmiyor** → cihaz üstü katmanın kapsamı belirsiz (ADR-004, K-510)
- **Egzersiz eşleme doğruluğu için benchmark yok** — kendimiz ölçeceğiz
- **Kadın parametrelerinin bir kısmı zayıf kanıtlı** (kas kazanım ×0,5) — `data/parameters` notlarında işaretli
