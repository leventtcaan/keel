# Evre 8 · Bütün ürün (1.0 sonrası)

> 24 Kas 2026. Kaynak: Levent'in 1.0 kullanım geri bildirimi (12 madde) + dört kod denetimi (bu oturum, `main` `fb83011b`,
> her bulgu dosya:satır ile ajan raporunda; ana bulgular orkestratör tarafından kodda yeniden doğrulandı) + rakip araştırması
> (Antigravity, Gemini 3.8 Flash: `arastirma/ham/rakip-ozellik-2026-11-24.md`, gelince) + Codex form görseli pilotu.
> Durum: **TASLAK.** Ürün, para ve sağlık kararları Levent'te (aşağıda K-1..K-7).

## 0. Tek cümlelik teşhis
1.0 tutarlı ama **boş**: para ödeyen kullanıcı, aboneliği bitmiş birinin bedava kullandığı modun aynısını alıyor (premium yalnız
AI'ı açıyor, AI üretimde kapalı); motorun ilk yemek kararı 4-5. haftada geliyor; ekranlar birbirini anmıyor.

## 1. Denetim bulguları (doğrulandı)

### 1.1 Para: ödenen şeyin karşılığı yok
- `premium` sunucuda yalnız iki yerde kontrol ediliyor: koç açıklaması (`coach/Explanation.java:92`) ve öğün metni/fotoğrafı (`coach/MealDraft.java:114`).
- Üretimde AI kapalı: `application-prod.yml` › `coach.provider: "off"` (ADR-064 #5). Gerçek sağlayıcı adaptörü hiç yazılmadı (yalnız `fake`, `off`).
- Hiç abone olmamış hesap onboarding'den sonra kapatılamayan paywall görüyor (`subscription/gate.ts`, ADR-058 #107); aboneliği bitmiş hesap
  ise her şeyi bedava kullanıyor (deterministik mod).
- Ücretsiz kullanıcının sunucu maliyeti AI olmadan ≈ 0 (yemek veritabanı kendi Postgres'imizde, fotoğraf cihazda). Kaynak: `arastirma/ham/K5-fiyat-kota-maliyet.md`.

### 1.2 Motor: mantık tutarlı, ürün olarak geç ve dar
| # | Bulgu | Kanıt | Önem |
|---|---|---|---|
| M1 | İlk açık (deficit) ~5. hafta, ilk yargısı ~7. hafta: plan bakımda başlar, gözlem + 21 günlük pencere ilk kararı geciktirir | `DataSufficiency.java:53,58`, GS-01/02 | Yüksek |
| M2 | Her 7 günlük blokta en az 4 tartı (`min_weighins_per_week: 4`); tek kaçan sabah 3 check-in'i düşürür; haftada 1 tartan hiç kilo kararı almaz (GS-20) | `windows.yaml:31` | Yüksek |
| M3 | Hedef kayıp hızı yok: "hareket ediyor" eşiği 0,58 kg / 14 gün (≈0,3 kg/hafta, kiloya bağlı değil); %0,5-1/hafta hiç zorlanmaz | `windows.yaml:49`, parametrelerde `rate` yok | Yüksek |
| M4 | Antrenman ve toparlanma durumu set kaydından türetilmiyor, yalnız kullanıcının cevabı | `DecisionService.java:291` (`Training.UNKNOWN`) | Yüksek |
| M5 | Kayıp sınırı güvenlik kararı tek gürültülü haftada +500 kcal'ı reddedilemez biçimde uygulayabilir | `SafetyNet.java:116+` [sayısal doğrulanmadı] | Orta-yüksek |
| M6 | Uyum kapısı kaloriyi okumuyor (antrenman günü, tartı, protein, adım) | `WeekTallies.java` | Orta |
| M7 | Sabit 500 kcal adım (80 kg erkekte ≈%17, hafif kadında %25+); bakış iyileşmesi ve bel düşüşü "sabit kilo" kesintisini durdurmuyor | `WeeklySpine.java:116-149` | Orta |
| M8 | Karar zamanlayıcısı yok: check-in açılmazsa karar da yok | `DecisionService.checkIn` | Orta |

### 1.3 Antrenman ekranı: odak dağınık
- Set sırasında ekranda **≈53**, dinlenmede **≈58** ayrı yazı/düğme var (`workout.tsx`, `ActiveSet.tsx`, `DoneSets.tsx`, `UpNext.tsx`, `RestTimer.tsx`).
  Dinlenme sayacı hiçbir şeyi gizlemiyor, üstüne 5 öğe ekliyor.
- Kontrast sorun değil (hepsi geçer); **renk rol taşımıyor**: tek turkuaz (#35D7CF) bağlantı, işaret, seçili çip, ana düğme ve "dinlenme bitti" için ortak.
  Aktif set kartında beyaz 1,5 px çerçeve (`ActiveSet.tsx:138`).
- Dinlenme: geri sayım, **her hareket için sabit 120 sn** (`workout.json` › `rest_seconds_min`); `rest_seconds_max` = 180 okunuyor ama hiçbir yerde
  kullanılmıyor; ±15 sn yalnız o dinlenmeye; **gerçek dinlenme kaydedilmiyor** (`NewSet` sözleşmesinde zaman alanı yok); set süresi sayacı yok;
  Live Activity yok.

### 1.4 Ana ekran ve yemek
- Ana ekranda protein, adım, kilo ve yenen kalori yok; yalnız "Food left" tek sayı. Adımları gösteren `TodayList.tsx` yalnız bir testten çağrılıyor (ölü kod).
- Hedef ızgarası (kalori, protein, adım, kardiyo) Progress'te **yalnız ilk karardan önce** görünüyor; sonra adım hedefi hiçbir yerde yok.
- Yemek kartı kahraman ve antrenman kartının altında, ekranın altına düşebiliyor; öğün ekranında arama kutusu kendiliğinden açılmıyor.
- Arama: sıralamayı yalnız ilk sözcük etkiliyor ("chicken breast"te "breast" sırayı değiştirmez); kullanıcının kendi kayıtları 100'lük havuz
  kesildikten **sonra** sayılıyor (her gün yediği şey havuza giremeyebilir); yakınlık (recency) yok; favori aramada öne çıkmıyor; yazım hatası
  yalnız tam sonuç 20'den azsa; eşanlamlı ve "2 eggs / 100 g rice" çözümleme yok; her tuşta liste siliniyor (titreme). (`FoodStore.java`, `FoodRanking.java`, `FoodPicker.tsx`)

### 1.5 Bütünlük
Bir gün: sabah tartı (+ › Weigh-in), öğünler (yemek kartı), antrenman (Train), akşam Progress + karar ekranı = 4+ ayrı yer.
Antrenman sonu yemeği/proteini anmıyor; yemek sayfası antrenman gününü anmıyor; karar ekranı yalnız tartıya bağlanıyor; tartı ve kardiyo `back()` ile bitiyor.

### 1.6 Dil
- Metin neredeyse tamamen dışarıda (2.989 anahtar, ≈16,6 bin sözcük, JSX'te çıplak metin yok — test korumalı). Güçlü taraf.
- Eksik: `t()` tek dil (yerel ayar yok), `expo-localization` yok, **33 yerde `'en-US'` sabit biçimlendirme**, Türkçe yasak ifade listesi yok,
  yemek veritabanı ABD (Türk yemekleri yok, en büyük işlevsel risk), mağaza ve izin metinleri İngilizce.
- Tahmin: Türkçe 1,5-2 hafta (çeviri + yerli okuma dahil); sonraki her dil çoğunlukla çeviri.

### 1.7 Adım, AI koç, form görseli: altyapı
- **Adım:** HealthKit adım okunuyor, motorda günlük adım hedefi var (7.000 → 10.000, Güray K-42). Mesafe, yer, konum izni yok; rıza metni "konum okumayız" diyor.
- **AI koç:** sağlayıcı kapısı (`LanguageModel` + `EgressGate`) ve sağlayıcıyı adıyla soran rıza altyapısı hazır; tek turlu `/v1/coach/messages` var
  ama model yalnız **sınıflandırıyor**, cümle yazmıyor (ADR-043 #76). Geçmiş, kişi hafızası, ses yok; mikrofon izni kapalı. Motor kararını açıklamaya
  hazır yapılar var (`CallFacts`, `ReasonFacts`, `/basis`, `/what-if`).
- **Form görseli:** 40 hareketin 40'ı `review: pending`, hiç klip yok, `expo-video` yok. **ADR-017 (Levent): "AI ile üretilmiş egzersiz görseli/videosu
  kullanılmaz."** Codex pilotu: `lat_pulldown_v1.png` (aşağıda §4).

## 2. Önerilen yön
İlke değişmiyor: **karar motordan, dil LLM'den** (U1). Değişen: ücretsiz katman motorun kendisi, para AI'ın yaptığı **kolaylık** için.

### 2.1 Ücretsiz ve ücretli: iki yol (K-1)
İkisinde de ücretsiz katmanın sunucu maliyeti ≈0 ve rakip ücretsizleriyle (Hevy, Strong, Cronometer) aynı seviye: sınırsız antrenman kaydı,
dinlenme sayacı, yemek kaydı + arama + **barkod ücretsiz** (MyFitnessPal'ın 2022'de barkodu kilitlemesi göç başlattı), kilo trendi, adım önerisi, Türkçe.

| | **A · Motor bedava, AI ücretli** | **B · Kayıt bedava, karar ücretli** (öneri) |
|---|---|---|
| Ücretsiz | yukarıdaki + haftalık karar ve nedeni | yukarıdaki + **başlangıç kararı ve ilk tam haftalık karar** (aha, ADR-069) |
| Ücretli | konuşan koç, hafıza, fotoğraf/metinle öğün, ses | haftalık karar akışı (kalori, hacim, deload), "neden" ve what-if, konuşan koç, fotoğraf/metinle öğün, ses |
| Ne satıyoruz | kolaylık (AI) | kararın kendisi + kolaylık |
| Risk | sattığımız şey bugün herkesin ChatGPT'ye veri boşaltarak yaptığı iş (pazar-kullanici-sesi #6); her ücretli kullanıcı LLM maliyeti taşır | ilk kararı gören ve beğenen ödemek zorunda; karar iyi değilse kimse ödemez (motor düzeltmeleri M1-M3 önce gelmeli) |
| Rakip modeli | Bevel (AI Pro'da) | MacroFactor / RP (karar ücretli), Hevy / Cronometer (kayıt ücretsiz) |

**Öneri B**, çünkü (1) tek benzersiz varlığımız motor; onu bedava verip yalnız AI satmak, metalaşan ve maliyetli şeyi satmak olur;
(2) "kayıt bedava" ücretsiz kullanıcının "acımasız" hissini kaldırır; (3) sert paywall'un dönüşüm avantajı (RevenueCat %10,7 / %2,1, doğrulama bekliyor)
çekirdek değer kilitli kaldığı için kısmen korunur. Yükseltme anı rastgele değil: ilk tam haftalık karardan sonraki hafta ("sıradaki karar
Premium'da"), "neden?" dokunuşu ve üçüncü elle öğün kaydında fotoğraf/metin önerisi. ADR-012'nin "kredi" sözcüğü yasağı ve kota bitince deterministik mod korunur.

### 2.2 Sıralama
| Evre | İçerik | Kimin kararı |
|---|---|---|
| **8a · 1.0.1 (≈1 hafta)** | Paywall zorunlu değil (ücretsiz çekirdek) · ana ekranda protein / adım / kilo · yemek kartı yukarı, arama odaklı · antrenmanda "tek şey" ekranı + dinlenme ayrı durum + renk rolleri · arama sıralaması v2 · motor M2/M3/M1 düzeltmeleri | K-1, K-2 Levent; geri kalanı teknik |
| **8b · 1.1 (≈2-3 hafta)** | Türkçe (+ Türk yemekleri tohum verisi) · gerçek dinlenme kaydı + hareket başına aralık + RIR/geri bildirimle öğrenme · adım açığını somut yürüyüşe çeviren öneri (önce konumsuz) · günlük döngü (sabah / antrenman sonu / akşam bağları) · M4 (set kaydından antrenman durumu) | K-3, K-4 |
| **8c · 1.2 (≈3-4 hafta)** | Konuşan koç (ücretli): motor gerçekleri girer, şemayla doğrulanan cümle çıkar · kişi hafızası (silinebilir) · ses (önce cihaz içi dikte) · form görselleri | K-5, K-6, K-7 |

## 3. Levent'in kararları (bekliyor)
- **K-1 Para:** zorunlu paywall kalksın; §2.1'deki A mı B mi (öneri B). ADR-058 #107 ve ADR-012'yi değiştirir. K5 araştırması sert paywall'un
  dönüşümü ~5 kat yüksek dediğini hatırlatırım (%10,7 ve %2,1, 35. gün); karşı kanıt: ödenen şeyin bugün karşılığı yok.
- **K-2 1.0 yayını:** 1.0'ı şimdi mi yayınlarız, yoksa ücretsiz çekirdekli 1.0.1 ile mi açarız? (Öneri: 1.0.1 ile; sert paywall + boş ürün ilk yorumları yakar.)
- **K-3 Motor (sağlık):** ilk açığı 1. günden başlatmak, haftalık tartı alt sınırını gevşetmek, %0,5-1/hafta hedef hızı. Her kural kaynak ister (U14):
  Güray kurallarında karşılığı aranır, yoksa [literatür] etiketiyle önerilir.
- **K-4 Konum:** adım önerisi için kayıtlı yer (ev, salon) ve konum izni; önce konumsuz sürüm (kullanıcı mesafeyi bir kez girer).
- **K-5 AI sağlayıcısı ve maliyet:** hangi sağlayıcı (sıfır saklama şartı, ADR-041/044), aylık tavan, mesaj limiti.
- **K-6 Koçun yazması:** ADR-043 #76'yı "gerçek girer, doğrulanmış cümle çıkar" ile değiştirmek. U1, U2, U6, U10 aynen kalır.
- **K-7 Form görseli:** ADR-017'nin AI yasağını, insan denetimli (kontrol listesinden geçen) AI çizimlerine açmak mı?

## 4. Codex form görseli pilotu
`~/Documents/keel-arastirma/hareket-pilot/lat_pulldown_v1.png` (Codex CLI, `gpt-6-luna`, tek istem, ~2 dk).
Değerlendirme: kas vurgusu (lats) ve bar yolu doğru; bitiş pozisyonu makul. Zayıf: başlangıç karesi arkadan açılı, okunması zor; uyluk pedi
bacağı tam kilitlemiyor; 1,3 MB (uygulamada ≈100 KB'a sıkıştırılmalı). Hareketsiz iki kare, "son tekrar yavaşlaması" klibinin yerini tutmaz;
**kurulum kartı ve başlangıç/bitiş görseli** için uygun aday. Standart istem şablonu + kontrol listesi + `review` kaydı ile 40 hareket ≈ 1 gün.

## 5. Rakipler (özet; tam rapor `arastirma/ham/rakip-ozellik-2026-11-24.md`, doğrulama bekliyor)
| Özellik | Lider | Bizim alacağımız | Bizim farkımız |
|---|---|---|---|
| Türkçe | Yazio, FatSecret | Türk porsiyonları (kaşık, su bardağı, kase), yerel barkod, Türkçe mağaza sayfası; tohum veri için TürKomp [lisansı doğrulanmadı] | Türkçe karar motoru: pazarda yok |
| Dinlenme | Hevy | otomatik başlayan sayaç, Live Activity + Dynamic Island, hareket başına varsayılan (bileşik uzun, izolasyon kısa) | gerçek dinlenmeyi kaydedip RIR / başarısız setle aralığı öğrenmek |
| Odak ekranı | StrongLifts, Fitbod | tek set, dev rakam, tam genişlik tek düğme, önceden dolu alanlar, sekmeler gizli, haptik geri sayım | 53 öğeden ~8 öğeye; renk yalnız "şimdi yapılacak şey" için |
| Form gösterimi | Fitbod (video), Hevy (hafif 2D) | 100-300 KB hafif görsel, 3 maddelik ipucu | Codex çizimi + insan denetimi (K-7) |
| Ana ekran | MacroFactor, Whoop | 3-5 sayı, "bugün ne yapmalıyım" cevabı, trend kilo | haftalık kararın bugüne çevrilmiş hali |
| Yemek | MacroFactor, Cronometer | arama açılınca klavye, sonuçta makrolar, Multi-Add, son/sık öğe öne, jenerik > marka | barkod ücretsiz |
| Günlük döngü | MacroFactor, Whoop | sabah / antrenman / akşam kartı; egzersiz kalorisi bütçeye eklenmez (bizde zaten öyle) | her şeyin haftalık karara bağlanması |
| AI koç | Whoop Coach, Bevel | hazır soru hapları, veriyle cevap, kısa JSON kişi özeti, haftalık soru hakkı, ucuz model | LLM karar vermez; yalnız motorun gerçekleri |
| Adım | Apple Fitness | kalan adımı dakikaya çevirmek (adım / kadans), kayıtlı yerler + MapKit bir kez mesafe, akşam eşiği bildirimi | "ev ↔ salon" gibi kişisel ölçü |
| Fiyat | Hevy, Strong, MacroFactor | yıllık plan ağırlıklı, 7 günlük deneme sektör standardı [doğrulanmadı] | §2.1 |
