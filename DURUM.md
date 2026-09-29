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
| K-112 montaj (+ ADR-022 sıra; spesifikasyon 24/24 gerçek; mini cut WC-20) | PR açık, auto-merge, iki inceleme uygulandı | #150 | `M1/K-112.md` |
| K-113 altın senaryolar (23 yolculuk) | dal itildi, **PR yok**; inceleme ajanı yarıda kaldı → yeniden çalıştır | `engine/24-golden-scenarios` | `M1/K-113.md` |
| K-115 sapma kalibrasyonu | dal itildi, **PR yok**; inceleme ajanı yarıda kaldı → yeniden çalıştır | `engine/99-intake-calibration` | `M1/K-115.md` |
| M2: K-201…K-219 | başlamadı | | |

**M1 önceki koşu** (öğleden akşama, hepsi birleşti): K-101 #134 · K-102 #135 · K-103 #136 · K-104 ilk kısım #137 ·
K-105 #138 · K-108 #139 · K-109 #140 · K-110 ilk kısım #141 · K-111 #142. Aktarım dosyaları `docs/aktarim/M1/`.

**Kararlar:** ADR-020 (L-1…L-13, M2/M3 ön kararları). Apple kimlikleri (Team/Bundle/Services ID): Levent "sonra vereceğim"
dedi → kod değer beklemeden yazılır, yapılandırmadan okunur; session sonunda sorulacak.

## ▶ DEVAM NOKTASI (29 Eyl gece, bağlam temizlenmeden önce yazıldı)
Önceki oturum burada durdu; yeni oturum **buradan** devam eder (prompt: `plan/oturum-promptlari/M2-devam.md`).
1. **#150 (K-112)** birleşti mi bak (`gh pr view 150`). Kırmızıysa düzelt.
2. **K-113** (`../keel-k113`, dal `engine/24-golden-scenarios`): taban eski K-112 commit'leri. #150 birleşince
   `git fetch && git rebase --onto origin/main 9cd0e46` (9cd0e46 = K-113 dalındaki eski K-112 ucu; yalnız cafc639 taşınır — `git log` ile doğrula) →
   `./gradlew build` → pr-test-analyzer **bitti**: 23 beklentinin hepsi kurallarla doğru; ama 32 motor mutasyonundan
   20'si altın senaryolarda yeşil kalıyor (hepsi birim/spec testlerinde yakalanıyor). Uygulanacaklar (her beklentiyi
   **elle yeniden türet**; ajanın sıraları öneri, kopya değil — önerilen YAML'lar ajan çıktısında vardı, burada özet):
   (A) K-64 "bir hafta daha bekle" hiçbir yolculukta yok; haftada 0,5 kg veren erkek tek sabit haftada −500 alıyor
   (79,5→79,0→79,0: 0,5 < 0,58 pay → "iki sabit hafta"); tek haftalık su sıçraması −500 sonra +500 (tavan 0,8 > 0,788)
   → GS-24/25 ile sabitle + **Levent'e soru** (L-10 payı yavaş kaybedeni erken kesiyor).
   (B) **MOTOR HATASI** (K-103 DataSufficiency): bir haftası seyrek tartılı kullanıcıda veri kontrolü günden güne
   aç-kapa yapıyor (haftalar "bugünden geriye" sayıldığı için); her hafta "3 gün sonra bak" sözü verip Pazar check-in'inde
   yine data_insufficient → nextReview hesabını düzelt (TDD), düzenek `nextReview`/`confidence`'ı da kontrol etsin
   (hafta başına isteğe bağlı `next`, `confidence`), hafta başına `mornings` → GS-26.
   (C) 8 haftalık hızlı kayıp kuralı hiçbir yolculukta yok; haftada 2 tartan biri haftalık tavana görünmez → GS-27.
   (D) Kadın bulk yok (ideal 0,5 kg/ay 28 günde de "sabit" → her 28 günde +250), kadın bulk tavanı 30 ve faz
   değişiminden sonrası yok → GS-28/29.
   (E) "Program hopper" temsil edilmiyor (GS-22 yalnız cevapsız antrenman) → GS-22'yi yeniden adlandır, GS-30 (plato
   sayacı her program değişiminde sıfırlanır, tırmanmaz); **Levent'e bilgi:** program değiştirmenin kendisi M1'de algılanmıyor (G? K-35).
   (F) Düzenek: `adherence: null`, `waist`, `months_stalled`, hafta başına `mornings`; gözlem bayrağını yalnız yeni plan
   kapatsın (plato haftası kapatmasın); her eylemde gerekçeyi de karşılaştır; `mornings>7` sonsuz döngü, `mornings: 6`
   bugünü atlıyor; HardStop/MiniCut/FullRestWeek planı değiştirmez — yorum yaz; faz değişiminde hedefin korunması K-212 varsayımı.
   (G) Hızlı kaybeden kadın (gözlem sırasında güvenlik), 60 yaş 155 cm 75 kg kadın (makro tabanı, carb_squeeze).
   → düzelt → backlog K-113 done → PR `--auto --squash`.
3. **K-115** (`../keel-k115`, dal `engine/99-intake-calibration`, taban `main`): code-reviewer **bitti** (matematik,
   gün aralığı `window−7`, EWMA sırası, işaret doğru). Uygulanacak 5 bulgu, TDD ile:
   (a) KRİTİK: "sapma" formül hatasını da içeriyor (referans − kayıt birimi harcama = formül hatası + kayıt hatası); eşik
   yalnız büyüklüğe bakıp hepsini sapma diye döndürüyor → yalnız bandın ötesini bildir (`işaret·(|fark|−formülHatası)`)
   ya da aralık döndür (U5); gerçek harcaması REFERENCE'tan farklı sahte kullanıcı testi ekle; javadoc "referans
   Mifflin×aktivite" desin.
   (b) KRİTİK: `logging_bias_smoothing` 0,5 H1 §3.4'ten türemiyor (günlük α 0,1 → 21 günde ≈0,89) ve notdaki "iki
   pencerede yarıya" yanlış (her pencerede yarıya) → dürüst türetme ya da "kaynaksız seçim" etiketi.
   (c) `min_logged_days_per_week` kaynağı (H1 §3.4) yemek kaydı hakkında değil; `logging_bias_min_windows` Thomas/Sanghvi
   dinamik modelinden türemiyor → notları dürüstleştir, gerekirse onay listesine yaz.
   (d) Metin `calibration.logs_run_low`: fazla kayıt (negatif sapma) yönü yok, "a little" ve "true for everyone"
   kaynaksız, "already account for it" henüz yok → iki yönlü, iddiasız metin.
   (e) `decisionsNeverReadLoggedFood`: `IntakeBias` tipini ve iç içe record'ları da taramalı.
   Test boşlukları: gürültülü tartı, iyi pencereler arasında tek kötü pencere. → düzelt → backlog K-115 done →
   `origin/main` üstüne rebase → `npm run check` **ana dizinde** (worktree'de node_modules yok) → PR.
4. M1 kapanışı: `docs/aktarim/M1/README.md` durum tablosuna K-106/107/112/113/114/115 ekle; DURUM "Şu an" = M1 kapandı.
   Worktree'leri temizle (`git worktree remove`).
5. **M2** — sıra: K-201 sözleşme + K-202 Postgres (bağımsız) → K-207 besin spike → K-215 → K-203 kimlik → K-204, K-205 →
   K-206, K-210, K-208, K-214 → K-209, K-211, K-218, K-219 → K-212 → K-213, K-216, K-217. Skill'ler: Postgres/Flyway →
   K-202, sözleşme (spectral + oasdiff) → K-201 (`arastirma/ham/L4-skill-kaynaklari.md` §6-8).
   - **Docker daemon kapalı** (`docker info` bağlanamadı): K-202 Testcontainers için Docker Desktop açılmalı
     (`open -a Docker`; açılmazsa Levent'e sor).
   - **ADR-008 güncellenecek:** ADR-020 "yalnız USDA FDC, OFF yok" dedi; ADR-008 ve K-208'in "barkod → OFF" kriteri
     buna göre değişir (FDC Branded Foods'ta GTIN var mı, K-207 spike doğrular). Türk ürün kapsamı zayıflığı → Riskler.
   - M2 notu (K-212): "süren mini cut" Snapshot'ta temsil edilmiyor; `menstrualLossReported` saklanmaz (mimari m.4).
6. Bitiş: sorular (aşağıdaki liste) AskUserQuestion ile toplu → ADR → kalan iş → `plan/oturum-promptlari/M3.md` →
   özet. Session kapanmaz; M1 kalanı + M2 aktarımı bu işi yapan oturumda (ya da devam oturumunda) yapılır.

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
- **Dependabot #2 · decode-uri-component ≤0.4.2** (orta, DoS): expo-router → query-string@7 üzerinden uygulamada çalışıyor.
  Düzeltme 0.5.0 yalnız ESM, query-string@7 CJS → override kırar. Etki: bozuk bir derin bağlantı kullanıcının kendi
  uygulamasını dondurabilir. **Bekliyor:** Expo güncellemesi; her SDK yükseltmesinde kontrol. (#1 uuid kapatıldı:
  yalnız derleme zamanı, `uuid.v4()` tampon olmadan, etkilenmiyor.)
- **Retention ↔ geç değer:** Apple sıralaması retention'a bakıyor, değerimiz 4-8 haftada geliyor → U15 ve günlük
  tutarlılık sayısı bunun için var. `arastirma/05-faz4-pazarlama.md` §2
- **Apple Intelligence cihaz payı bilinmiyor** → cihaz üstü katmanın kapsamı belirsiz (ADR-004, K-510)
- **Egzersiz eşleme doğruluğu için benchmark yok** — kendimiz ölçeceğiz
- **Kadın parametrelerinin bir kısmı zayıf kanıtlı** (kas kazanım ×0,5) — `data/parameters` notlarında işaretli
