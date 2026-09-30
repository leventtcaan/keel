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
| K-216 kararı hedeflere uygula + geri al | **sürüyor** — dal `decision/100-apply-decision` (`../keel-k216`) | — | — |

**M1 önceki koşu** (öğleden akşama, hepsi birleşti): K-101 #134 · K-102 #135 · K-103 #136 · K-104 ilk kısım #137 ·
K-105 #138 · K-108 #139 · K-109 #140 · K-110 ilk kısım #141 · K-111 #142. Aktarım dosyaları `docs/aktarim/M1/`.

**Kararlar:** ADR-020 (L-1…L-13, M2/M3 ön kararları). Apple kimlikleri (Team/Bundle/Services ID): Levent "sonra vereceğim"
dedi → kod değer beklemeden yazılır, yapılandırmadan okunur; session sonunda sorulacak.

## ▶ DEVAM NOKTASI (30 Eyl, dördüncü oturum — bağlam dolmadan yazıldı; devam prompt'u `plan/oturum-promptlari/M2-devam-3.md`)
Bu oturum birleştirdi: K-206 #160, K-210 #161, K-214 #162, K-218 #163, K-219 #164, K-211 #165, K-208 #166, K-209 #167,
K-212 #168. Hepsinde inceleme ajanları + TDD + mutasyon + aktarım dosyası tamam.
0. **(güncel, K-213 birleşti #171)** Sıradaki: K-216 dalı `decision/100-apply-decision` (`../keel-k216`, main üstünde,
   commit'lenmemiş iş var: EnergyBudget egzersiz bilinmiyor + SafetyNet, adım parametreleri, PlanChange/PlanTargets saf +
   ApplyDecisionTests yeşil). Kalan: V12 (plan.steps_per_day, weekly_call applied_at/undone_at/plan_before/plan_after),
   CallStore, apply/undo/targets uçları, DailyTargets bean'i, ProfileFacts.trainingDays, Snapshot'a plan hedefi, API
   testleri, sözleşme. Soru 19 (adım hedefi) listeye eklenecek; K-222 (faz/mini cut/hard stop uygulaması) backlog'a.
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
4. **Bitiş:** sorular (aşağıdaki liste, 0-19) AskUserQuestion ile toplu → cevapları ADR'ye işle → kalan iş →
   `plan/oturum-promptlari/M3.md` (M3 · Mobil kabuk; kabul kriterlerine: tek uçuşlu refresh ADR-025, UPC-E sunucuda açılır,
   Dependabot #2) → özet. Session kapanmaz; M1 (akşam kısmı) + M2 aktarımı sonra (skill `aktarim`, `docs/aktarim/M1/`, `M2/`).

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
   U4 gereği sayı hiçbir yerde gösterilmez. **K-216'dan beri ek sonuç:** plan hedefi motora gidiyor, kalori merdiveni
   çalışıyor; yağ tahmini yokken LEA tabanı hesaplanamadığı için cut'ta aşağı adımı yalnız BMR ve makro tabanları
   sınırlıyor (önce merdiven hiç çalışmıyordu). Kabul mü, yoksa bu soru cevaplanana dek aşağı adım dursun mu (özellikle
   kadında)?
12. **(K-204, onay/hukuk)** Üç rıza metni taslak (`data/copy/en.json › consent.*`, sürüm `1-draft`): onay; mağaza öncesi
    hukuk gözden geçirmesi (M8). İçindeki taahhütler ("asla satmayız", "reklam yok") ürün sözü.
13. **(K-205, hukuk/ürün)** Yaş sınırı: doğum yılında alt sınır yok. GDPR Md. 8'e göre 16 yaş altının (ülkeye göre 13-16)
    sağlık verisi rızası geçersiz; K-8xx (SCOFF) 18 yaş altında özellikleri kapatıyor. Onboarding'de yaş kapısı olsun mu, kaç?
14. **(K-205, veri)** "Yiyemediğim gıdalar" alerji/çölyak gibi sağlık verisi olabilir (Md. 9). Profil sağlık verisi rızasına
    bağlansın mı, yoksa alan "sevmediğim" diye mi daraltılsın?
15. **(K-211, ürün/koçluk)** Altı program şablonu (`data/programs/1-days.yaml` … `6-days.yaml`) **taslak**: hangi hareket,
    kaç set. Güray sınırlarında (seans ≤5, hafta ≤10 set/kas, 4+ günde frekans 2) ama içerik onayı Levent'in. 7 gün seçen
    kullanıcıya program yok (400, G1 K-70) — uygulama "en fazla 6" desin mi, yoksa 6'lık program + bir gün dinlenme mi?
16. **(K-208, dışarıdan dosya indirme — izin)** FDC toplu verisi (USDA, CC0): Foundation + SR Legacy (~birkaç MB zip) ve
    Branded (~400 MB+ zip, barkod için) indirilip içe aktarılsın mı? İndirme izin ister; ayrıca Branded diske yer ister (disk
    şu an dolu). İzin gelene dek K-208 elle yazılmış küçük test verisiyle ilerler.
17. **(K-212, sağlık/ürün)** Hedefi "karar sen ver" (`DECIDE_FOR_ME`) olan kullanıcının başlangıç fazı: faz kapısı yağ
    tahmini ister (soru 11), yoksa kapı devre dışı. Güray G4 K-4: "neredeyse her yeni başlayan buradan başlar" (önce yağ
    kaybı) → varsayılan **CUT** mı, yoksa kullanıcıya iki seçenek sunulup seçtirilsin mi? Şimdilik bu kullanıcıda check-in
    karar üretmez (409).
18. **(K-212, sağlık/veri — ÖNEMLİ)** Adet kaybı cevabı (V4, ADR-020 L-1) kararı etkiler ama **saklanmaz**. Ama o cevapla
    verilen HARD_STOP kararı saklanıyor (ADR-003 §6: her karar girdisiyle saklanır) ve gerekçesi (`menstrual_loss_reported`)
    cevabı açığa vurur. Seçenekler: (a) karar saklanır, gerekçe genel bir etiketle ("güvenlik: düşük enerji") yazılır; (b)
    karar saklanır, gerekçe olduğu gibi — cevabın dolaylı kaydı kabul edilir (rıza metnine yazılır); (c) bu karar hiç
    saklanmaz (yeniden üretilebilirlik bu tek karar için yok). Şimdilik soru hiç alınmıyor (400): LEA bandı yağ tahmini
    olmadan hesaplanamıyor (soru 11), yani soru zaten sorulamaz. Soru 2 ile aynı konu, cevap ikisini birden kapatır.
19. **(K-216, sağlık/ürün)** Adım hedefi: başlangıç **7.000/gün**, "daha çok hareket" (CHANGE_MOVEMENT) kararı **10.000'e**
    kaldırır (Güray G2 K-42; `nutrition.yaml › steps_target_*`). Ama karar metni "aynı sonucu daha çok adımla alırsın"
    diyor: kesilmeyen adım 500 kcal, 3.000 adım ≈ 150 kcal (G2 K-43). Seçenekler: (a) 10.000 tavanı kalsın, metin "daha
    az ama güvenli" diye düzeltilsin; (b) adım kalori karşılığı kadar artsın (500 kcal = +10.000 adım → 17.000, gerçekçi
    değil); (c) 10.000'den sonra kardiyo önerilsin (G2: haftada 2-3 × 20-30 dk) — yeni bir hedef alanı demek.
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
