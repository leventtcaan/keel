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
| K-214 gizlilik (silme, dışa aktarma, egress; V7) | PR auto-merge; inceleme: silme tekrar denenmiyordu, silinen hesabın token'ı yazıyordu → düzeltildi | #162 | `M2/K-214.md` |

**M1 önceki koşu** (öğleden akşama, hepsi birleşti): K-101 #134 · K-102 #135 · K-103 #136 · K-104 ilk kısım #137 ·
K-105 #138 · K-108 #139 · K-109 #140 · K-110 ilk kısım #141 · K-111 #142. Aktarım dosyaları `docs/aktarim/M1/`.

**Kararlar:** ADR-020 (L-1…L-13, M2/M3 ön kararları). Apple kimlikleri (Team/Bundle/Services ID): Levent "sonra vereceğim"
dedi → kod değer beklemeden yazılır, yapılandırmadan okunur; session sonunda sorulacak.

## ▶ DEVAM NOKTASI (30 Eyl, üçüncü oturum — bağlam dolmadan yazıldı; devam prompt'u `plan/oturum-promptlari/M2-devam-2.md`)
Bu oturum M1'i kapattı (#150-#153) ve M2'de K-201, K-202, K-203, K-204, K-205, K-207, K-215'i birleştirdi.
1. **Açık zincir (30 Eyl, compact sonrası):** K-206 #160 ✅, K-210 #161 ✅ birleşti. **K-214 PR #162** auto-merge
   (V7 `privacy.deletion`; `../keel-k214`). **K-218** `training/102-set-types` (`../keel-k218`, taban K-210 ucu 41df098 —
   #161 squash'la birleşti, açılınca `git rebase --onto origin/main 41df098`); göç yok. Araştırma eklendi:
   `arastirma/ham/H3-bosluk-literatur.md › B15` (e1RM: Epley, ≤10 tekrar, RIR). Plan: motor `E1rm` (parametre
   `e1rm_epley_divisor`, `e1rm_max_reps_to_failure`, yeni birim `reps`), training'de set kuralları (tek taraflı → LEFT/RIGHT,
   BODYWEIGHT → loadKg 0, FAILURE → rir 0) + yalnız WORKING set sorgusu; vücut ağırlığı birleştirme decision'da (K-212).
   - Birleşen dal worktree'lerini kaldır (`git worktree remove`); yerel dal etiketleri zararsız.
2. **Sonraki göç numarası V8** (V7 = K-214). Kalan M2 (sıra): **K-218** set tipi/yük modeli (K-210 üstü; e1RM yalnız WORKING, vücut ağırlığı +
   ek yük, tek taraflı) → **K-219** hareket kataloğu 30-40 (+ aliases, setup_fields, clips, review; `data/muscles.yaml`
   sözlüğü var, bilinmeyen alan reddi var → alan listesini genişlet) → **K-211** program üretimi/içe alma → **K-208** besin
   eşleme + aralık (FDC toplu içe aktarma, ADR-008 güncellemesi; aralık modeli parametreleri araştırmadan kaynakla) →
   **K-209** öğün + günlük bütçe (`KcalBalance` eksi olabilir; HEALTH_DATA rıza kapısı) → **K-212** Snapshot + karar kaydı
   (ADR-003; parametre `versionHash`; `Measurements.dailyWeights`, `Profiles.of`; check-in günü profil saat diliminde) →
   **K-213** check-in soruları (soru bütçesi parametreden, `reasonCopyKey`) → **K-216** kararı hedeflere uygula (+ undo,
   `application.state`) → **K-217** programa yansıma (deload `until`, `nextLoadKg/nextReps`, bölgeye göre yük adımı).
3. **Kurallar (bu koşuda öğrenilenler):**
   - Her uç noktada: rıza kapısı (sağlık verisi ise, ADR-026), `ApiLimits` (`keel.api`: aralık ≤400 gün, yıl 1900-2200),
     saklanamayan değer 400 (asla 500), sayılar `Decimals.plain`, clientId idempotency (201/200; başka ebeveyne aynı
     clientId → 409), PUT cevabı saklananı geri okur. Katı JSON açık (`spring.jackson.*`).
   - Yeni modül verisi: `*AccountData` (silme dinleyicisi + dışa aktarma bölümü) yaz — `AccountDataTests` veritabanındaki
     her `account_id` tablosunu kontrol eder, unutulursa kırmızı.
   - Test yardımcıları: `app.keel.identity.TestSessions` (bearer), `PostgresTestConfiguration`, measurement'ta
     `MeasurementTestSupport`. Test yapılandırması `src/test/resources/config/application.yml`.
   - **Mutasyon betiği:** `plan/oturum-promptlari/mutate.py` (kopya). Kullanım: bir JSON listesi
     `[{name,file,old,new}]` yaz, `MUT_DIR=<modül|.> python3 plan/oturum-promptlari/mutate.py <worktree> '<test filtresi>' <json>`;
     dosyayı `.bak`'a kopyalar, değiştirir, Gradle testini koşar, `.bak`'tan geri taşır; sonucu Gradle çıktısından okur.
   - Docker Desktop açık olmalı (`open -a Docker`); yerel DB `cd backend && docker compose up -d` (port 55432, parolasız);
     yerel çalıştırma `KEEL_SESSION_SECRET=$(openssl rand -base64 32)`.
4. **Bitiş:** sorular (aşağıdaki liste, 0-14) AskUserQuestion ile toplu → cevapları ADR'ye işle → kalan iş →
   `plan/oturum-promptlari/M3.md` (M3 · Mobil kabuk; M3 kabul kriterine ekle: tek uçuşlu refresh, ADR-025) → özet.
   Session kapanmaz; M1 (akşam kısmı) + M2 aktarımı sonra bu sohbette (skill `aktarim`, `docs/aktarim/M1/`, `M2/`).

**Bilgi (Levent'e, soru değil):** K-113 GS-10 — erkekte ideal bulk hızı (ayda 1 kg) 21 günlük pencerede "sabit" okunur,
motor +250 verir; `gain_rate_max_kg_per_month` hiçbir kuralda yok (bulk'ta "çok hızlı" kuralı M1 kapsamında değil).

## Session sonunda Levent'e sorulacaklar (toplu, AskUserQuestion)
0. **(K-113 A, sağlık)** Haftada ~0,5 kg veren erkek tek sabit haftada kalori kesintisi alıyor (L-10 payı 0,58 kg iki
   haftalık farkı "sabit" sayıyor); tek haftalık su sıçraması −500/+500 salınımı yapıyor. Kabul mü, yoksa K-64 beklemesi
   yavaş kaybedende de mi işlesin? (ADR-021 değişir.)
1. **L-4** (sağlık): iç yağ tahmini <%18 (kadın) / <%8 (erkek) → açığı durdur (J1 L2.1)? ADR-020'de yok; yazılmadı.
2. **Hard stop gerekçesinin saklanması** (veri, GDPR Art. 9): Snapshot'taki cevap saklanmıyor (`docs/mimari.md` madde 4);
   `menstrual_loss_reported` gerekçeli karar kaydı saklanabilir mi, yoksa gerekçe genel bir etiketle mi saklansın?
3. **Deload basamak 1-2 cut'ta** da çalışsın mı? (ADR-020 cevaplamadı; şimdilik çalışıyor. Basamak 3 "gerileme" cut'ta
   susturuldu: G6 K-30.)
4. **ADR-021 madde 4** (sağlık/ürün): görünüş "aynı" ya da "bu hafta fotoğraf yok" → devam (şimdiki, kalori değişmez) mi,
   ağaçtaki gibi "daha iyi değil" → antrenman/toparlanma/genetik limit mi?
5. **Açık yağdan mı karbdan mı** (bilgi/sağlık): G7 K-117 "yağdan ver" · 03 §2.3 ve G3 K-22 "karb ayar kolu". Kart
   uygulandı (karb, karb tabanında yağ 0,5 g/kg'a iner).
6. **Aktivite sorusu** (ürün, K-114): kaç seçenek, nasıl sorulur? Gün boyu, antrenman dahil olmalı.
7. Apple Team ID / Bundle ID / Services ID.
8. **(K-115, ürün)** Kayıt sapması yalnız büyükse görünür (erkek 2800 kcal'de günde ~640+): formül hatası ve tartı
   gürültüsünden ayrılamıyor. Bu mesaj uygulamada gösterilsin mi (iki okumayı birden söyleyen metinle), yoksa yalnız
   içeride mi kalsın?
10. **(K-207, ürün)** Barkod Türk ürünlerinde bulunamayacak (FDC'de yok). Bulunamayınca ne olsun: etiketten tek seferlik
   elle giriş (sonra hafızada) mı, yalnız genel gıda araması mı? İleride Türkiye kaynağı (TürKomp) araştırılsın mı?
11. **(K-201, sağlık/ürün — ÖNEMLİ)** Motorun iç yağ tahmini (`fatProxyPct`) nereden gelecek? Faz kapısı (bulk tavanı,
   cut → bulk) ve **düşük enerji güvenlik ağı** bu sayı olmadan çalışmıyor (LEA → adet sorusu → hard stop zinciri de).
   Araştırma: mezura formülü (Navy) değişimi izlemede başarısız (H1 §3.2), WHtR bir eşik, Ö-4 "görsel proxy" diyor
   ama nasıl toplanacağı yok. Seçenekler: (a) kullanıcı referans görsellerden kendine en yakını seçer (Güray'ın göbek
   testi), (b) bel/boy'dan kaba bant (yalnız kapı için, izleme için değil), (c) ikisi, (d) hiçbiri → iki kural kapalı.
   U4 gereği sayı hiçbir yerde gösterilmez.
12. **(K-204, onay/hukuk)** Üç rıza metni taslak (`data/copy/en.json › consent.*`, sürüm `1-draft`): onay; mağaza öncesi
    hukuk gözden geçirmesi (M8). İçindeki taahhütler ("asla satmayız", "reklam yok") ürün sözü.
13. **(K-205, hukuk/ürün)** Yaş sınırı: doğum yılında alt sınır yok. GDPR Md. 8'e göre 16 yaş altının (ülkeye göre 13-16)
    sağlık verisi rızası geçersiz; K-8xx (SCOFF) 18 yaş altında özellikleri kapatıyor. Onboarding'de yaş kapısı olsun mu, kaç?
14. **(K-205, veri)** "Yiyemediğim gıdalar" alerji/çölyak gibi sağlık verisi olabilir (Md. 9). Profil sağlık verisi rızasına
    bağlansın mı, yoksa alan "sevmediğim" diye mi daraltılsın?
9. **(K-115, onay)** `min_logged_days_per_week` = 4 ve `logging_bias_min_windows` = 2 araştırmadan türemiyor (seçim,
   `tag: urun`). Onay mı?

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
