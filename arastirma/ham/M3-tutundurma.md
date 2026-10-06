# M3 · Dikkat ve tutundurma — Faz 5 · ürünün yüzü (R3 hattı, ADR-068)

- **Tarih:** 2026-10-07 · **Durum:** TAMAM (ilk tur) — Levent incelemesi bekliyor
- **Soru:** Kullanıcı ilk haftada neyi kazanç olarak görür, sıkıcı kayıt işi nasıl hafifler, kopan nasıl geri döner, ekran
  dikkati nasıl tutar — ve bunların hangisi **ölçülmüş**?
- **Bağlam:** gerçek iPhone denemesinde deneyim çalışmadı: metin çok ve düz (ADR-067). Bu dosya yeniden tasarımın girdisidir;
  ekran tasarlamaz, kanıttan yön çıkarır.
- **Pazar:** global İngilizce (ABD/UK/AU/CA). Rakip kümesi: `M0-rakip-listesi.md` (14 çekirdek + komşular).

## Yöntem

1. Önce okundu, tekrar araştırılmadı: `I1` (en kritik 3 bulgu, B1-B4, C1-C6, C-EK, D1-D2, E), `I2` §A ve §D, `L3` §0 ve §4,
   `05` §2 ve §3.6, `K2` §C16, `K5` §C14, `docs/anayasa.md` §U. Bu dosyadaki her şey **bunların üstüne** eklenmiştir; aynı
   kaynaklar yalnız atıfla anılır (ör. "bkz. I1 C5").
2. Altı paralel alt-araştırma (kıyaslar · beslenme rakipleri · antrenman rakipleri + ilk hafta · kayıt sürtünmesi · geri dönüş
   + zararlar · dikkat) + benim doğrulamam. Alt ajanlar her sayıyı sayfada okuyup kısa alıntıyla döndü; yalnız arama
   özetinde görülenler **[doğrulanmadı]** diye işaretlendi.
3. **İkinci okuma (ben, birincil kaynakta):** Duolingo resmî blogu (3 yazı + widget + friend streak), Sharif & Shu PDF'i,
   Milkman 2021 megastudy PDF'i, Peng 2023 tam metin tabloları, RevenueCat 2026 H&F sayfası, Adapty 2026 sayfası, Adjust 2026
   (RocketShip aktarımı), Apple HIG (bildirim, haptik, widget, Live Activity, Activity rings — JSON kaynağından), App Review
   4.5.4, MacroFactor adherence-neutral, Strava/Hevy streak sayfaları, Apple Newsroom Ocak 2026, Finch (Deconstructor of Fun),
   OneSignal (silicon.co.uk basın bülteni) ve PubMed/Europe PMC özetleri: Harvey 2019, Ben Neriah 2019, Lee 2024, Chikwetu 2023,
   Hagerman 2026, Serrano 2016, Patel 2020 (GoalTracker), Mazeas 2022, STEP UP 2019, ENGAGE 2021, Houts 2006, Hamari 2017,
   Levinson 2017, Fitz 2019, Kerner 2017, Agachi 2023. Geri kalan sayılar alt ajanın sayfada okuduğu değerdir.
4. **Dikkat edilen hata:** WebFetch'in özetleyicisi bir kez yazar adı uydurdu (Sharif & Shu makalesini başka yazarlara
   atfetti). Bu yüzden ana sayılar ham metinden (pdftotext, E-utilities) tekrar okundu.
5. **Kısıt:** Oturumun WebSearch bütçesi (200) yarıda bitti. Sonrasında yalnız bilinen URL'ler ve PubMed E-utilities, Europe
   PMC, Semantic Scholar, Crossref API'leri kullanıldı. Bir kez DuckDuckGo HTML sonuç sayfası curl ile denendi; bunun limiti
   dolanmak olduğu için bırakıldı. Tarayıcı kullanılmadı; hesap, form, ödeme yok. Reddit denenmedi.
6. Tüm URL'lerin erişim tarihi **2026-10-07**.

**Kanıt etiketleri:** **[RESMÎ]** şirketin kendi kaynağı (yardım merkezi, blog, App Store sayfası, basın bülteni) ·
**[HAKEMLİ]** hakemli yayın · **[3.P – ad]** üçüncü taraf (satıcı raporu ise "vendor" yazar) · **[ÇIKARIM]** benim yorumum ·
**[doğrulanmadı]** yalnız arama özetinde ya da ikincil kaynakta görüldü.
**Nedensellik notu:** "korelasyonel" yazan her sayıda seçilim yanlılığı vardır (özelliği kullanan zaten bağlı olandır). Yalnız
A/B testi ve RCT nedensel okunur.

---

## Özet (7 madde)

1. **Para ilk ayda karar veriyor, ve H&F bu konuda en zayıf kategori.** H&F trial→paid medyanı %37,7 (ilk çeyrek >%51,4) ve
   indirme→ödeyen (D35) %2,9 ile kategoriler arası lider; ama **ilk yenileme tutunması %30,3 ile son sırada** (Adapty 2026) ve
   tüm kategorilerde yıllık iptallerin %35'i 1. ayda (RevenueCat 2026). H&F D30 tutunma kaynağa göre %3-9 [3.P – vendor].
   → U15'in "değer 1 haftada" kuralı doğru yerde. (§1)
2. **Sektör antrenmanda haftalık + onarılabilir seriye yakınsamış.** Strava (haftalık, geç yükleme seriyi geri getirir), Hevy
   (haftalık, geriye kayıt eski seriye eklenir), Apple (halkalar 90 güne kadar duraklatılır), Gentler Streak (dinlenme sayılır),
   WW (Vacation Mode). Günlük seri beslenme tarafında kalmış (MFP, Cronometer, Cal AI — Cal AI kırılan seriyi **0,99 $'a geri
   satıyor**). Tasarımı ölçülmüş tek resmî kaynak Duolingo: seriyi kolaylaştırmak D14'ü +%3,3 artırdı. Sharif & Shu: "acil durum
   payı" olan hedef, aynı zorluktaki katı ve kolay hedefe göre **%40'a kadar daha çok hedef günü** tutturdu. → U7 kanıtla
   destekleniyor. (§2.1)
3. **Fitness uygulamalarının mekanik etkisi neredeyse hep korelasyonel.** Fitbod "2×", Strava kulüpleri "+%10", MFP "ilk hafta
   ≥4 gün kayıt → 7×", Duolingo friend streak "+%22", OneSignal "Live Activity +%23,7" — hepsi seçilim. Nedensel olanlar
   hakemli ve uygulamaya özgü değil: oyunlaştırma g=0,42, bittikten ~14 hafta sonra g=0,15 (Mazeas 2022); 61.293 kişilik
   megastudy'de 53 müdahalenin %45'i işe yaradı, **yalnız %8'i müdahale bitince sürdü** (Milkman 2021). (§2, §5)
4. **Geri dönüşü ödüllendirmek, ölçülmüş en güçlü tek müdahale.** Megastudy'nin birincisi: kaçırılan antrenmandan sonra
   *geri gelene* küçük ödül → haftalık salon ziyareti +%27. Haftanın başında salona gitme olasılığı +%33,4 (fresh start,
   Dai 2014). Runna (Plan Realignment) ve MacroFactor (Logging Break) dönüşü suçlamasız, boşluğun uzunluğuna göre kademeli
   seçenekle karşılıyor. Ama Duolingo'nun kendi verisi: mevcut kullanıcıyı tutmak, geri kazanmaktan **5× daha etkili**. (§5)
5. **Kayıtta süre değil sıklık sayılıyor.** Günlük kayıt süresi 23,2 dk → 14,6 dk'ya düştü ama kilo başarısını ayıran günlük
   giriş **sayısıydı** (Harvey 2019). Kullanıcıların %40'ı "girmesi zor" yiyeceği hiç kaydetmiyor; fotoğraf "çok zor" oranını
   %60'tan %22'ye indirdi ama **unutmayı düzeltmedi** (%95 → %93) (Cordeiro 2015). Aynı yemeği tekrar yiyenler daha çok
   verdi (%5,9'a %4,3) → öğün hafızası. Kişinin kendi öğün saatine göre hatırlatma işe yaradı, sabit saat yaramadı. (§3)
6. **Suçlama işe yaramıyor; sorumluluk yükleyen suçluluk mesajı neredeyse sıfır etkili (g=0,08 / 0,36).** Duolingo'nun
   suçlayıcı baykuş tonunun ölçülmüş etkisi **bulunamadı** (dolaşan "%15" iddiası kaynaksız). Kalori sayacı ile yeme bozukluğu
   ilişkisi üç ayrı kesitsel çalışmada var (MFP kullanan hastaların %73'ü katkısı olduğunu düşünüyor). Bildirimleri günde 3
   kez toplu göndermek iyi oluşu artırdı, hiç göndermemek kaygıyı artırdı. (§6)
7. **Dikkat:** kullanıcı sayfadaki kelimelerin ~%20'sini okuyor; her +100 kelime yalnız +4,4 sn okuma getiriyor. Kısa +
   taranabilir + nesnel metin kullanılabilirliği +%124 artırdı (NN/g). Metne bağlı resim dikkati ve hatırlamayı artırıyor
   (Houts 2006). İlerleme göstergesinde **sabit hızlı çubuk terki azaltmıyor**; başta hızlı ilerleyen azaltıyor. Sözlü/bilgi
   veren olumlu geri bildirim içsel motivasyonu artırıyor (d=+0,33); performansa bağlı somut ödül azaltıyor. (§7)

---

## 1 · Kıyaslar (2025-2026)

### 1.1 Abonelik hunisi — Sağlık ve Fitness

| Metrik | Değer | Kapsam | Kaynak |
|---|---|---|---|
| Trial → paid | **medyan %37,7**, ilk çeyrek >%51,4 | RevenueCat 2026 (115.000+ uygulama, 2025 verisi) | [3.P – vendor: RevenueCat] [SOSA 2026 H&F](https://www.revenuecat.com/state-of-subscription-apps-2026-health-and-fitness) |
| Trial → paid (önceki yıl) | medyan %39,9, en iyi %10: %68,3 | RevenueCat 2025 (75.000 uygulama) | [3.P – vendor: RevenueCat] [SOSA 2025](https://revenuecat.com/state-of-subscription-apps-2025) — I1 E2'de var |
| Trial → paid | %35,0 (kategoriler içinde en yüksek) | Adapty 2026 (16.000 uygulama, 3 mlr $) | [3.P – vendor: Adapty] [SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/) |
| İndirme → deneme | medyan %6,9 | RevenueCat 2026 | aynı |
| İndirme → ödeyen (D35) | **medyan %2,9**, ilk çeyrek >%6,2 — kategoriler arası lider | RevenueCat 2026 | aynı |
| Yıllık plan payı | %68 (RevenueCat) · %60,6 (Adapty; tek kategori ki yıllık baskın) | 2025 verisi | aynı iki kaynak |
| **İlk yenileme tutunması** | **%30,3 — kategoriler arasında son** (Utilities %58,1 ile ilk) | Adapty 2026, plan türü belirtilmemiş | [3.P – vendor: Adapty] aynı |
| İlk yenileme (haftalık plan, denemeli) | %67,7 | Adapty 2026 | I1 E1'de var — yukarıdakiyle çelişmez, yalnız haftalık planı ölçer |
| Kurulum başına gelir | D14 0,48 $ · D60 0,66 $ | RevenueCat 2026 | [3.P – vendor: RevenueCat] |
| Ödeyen başına 1. yıl gerçekleşen LTV | medyan 35,64 $ (Gaming'in 3 katı) | RevenueCat 2026 | aynı |
| İade oranı | **%4,71** (Eğitim %4,86 ile birlikte en yüksek iki kategori) | RevenueCat 2025 | [3.P – vendor: RevenueCat] SOSA 2025 |
| Denemelerin başlama günü | %86,1'i **0. gün** | Adapty 2026, H&F | [3.P – vendor: Adapty] [H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/) |

### 1.2 Yenileme ve kayıp — tüm kategoriler (H&F'ye özel yayımlanmamış)

| Metrik | Değer | Kaynak |
|---|---|---|
| Yıllık iptallerin 1. ayda gerçekleşen payı | **%35** (kategoriye göre %23-50) | [3.P – vendor: RevenueCat] [SOSA 2026 insights part 2](https://www.revenuecat.com/sosa-2026-insights-part-2) |
| 1. yıl tutunma | yıllık %31 → **%28** · aylık %10 → %8 · haftalık %1,7 → %1,2 | aynı |
| Yeniden etkinleşme (iptal sonrası geri dönen abone) | yıllık %5 · aylık %20 | aynı |
| Sert paywall ile freemium'un 1 yıllık tutunması | "neredeyse aynı" | aynı (K5 C16'da var) |
| 380. gün tutunma (denemeli aboneler) | yıllık %19,9 · aylık %14,2 · haftalık %5,5 | [3.P – vendor: Adapty] SOIS 2026 |

> ⚠️ **K5 C14 düzeltmesi.** K5 "yıllık aboneliğin 12 aylık kaybı %56'dan %72'ye çıktı" diyor. RevenueCat 2025 yıllık tutunmayı
> %44,1 verirken 2026 raporu bir önceki yılı **%31** olarak yeniden hesaplıyor → yöntem değişmiş; iki yılın sayısı
> karşılaştırılamaz. Doğru okuma: 2026 yönteminde yıllık 1. yıl tutunma %31 → %28. Ayrıca K5'teki "AI uygulamalarında aylık
> plan %36 daha kötü" sayısı 2026 sayfasında görülmedi; alt ajanın gördüğü ifade "AI uygulamaları %30 daha hızlı kayıp"
> **[doğrulanmadı — K5 kaynağı tekrar kontrol edilmeli]**.

### 1.3 Uygulama tutunması (D1 / D7 / D30) — Sağlık ve Fitness

| Kaynak | D1 | D7 | D30 | Not |
|---|---|---|---|---|
| Adjust 2026 State of App Growth (RocketShip HQ aktarımı, 24 Mar 2026) | **%26,8** | [doğrulanmadı] | **%8,6** | Tüm kategoriler D1 medyanı %25,4. Sayfadaki %14,2'nin D7 mi sahtekârlık oranı mı olduğu iki okumada çelişti → kullanma. Adjust'ın kendi sayfası 429 döndü. [3.P – RocketShip HQ, vendor: Adjust] [link](https://www.rocketshiphq.com/?p=5401) |
| UXCam derlemesi (21 Nis 2026) | medyan %25 · **75. yüzdelik %35-45** | medyan %10 · 75. yüzdelik %15-22 | medyan %5 · **75. yüzdelik %8-12** | AppsFlyer + Adjust + data.ai + kendi 37.000 uygulaması — derleme, ham veri değil. [3.P – vendor: UXCam] [link](https://uxcam.com/blog/mobile-app-retention-benchmarks/) |
| Adjust (2023, eski) | — | — | ~%3 | K2 C16'da var |
| Sensor Tower (Şub 2025) | — | — | CashWalk %31, Sweatcoin %20 | Ödüllü adım uygulamaları; kategori kıyası **değil**. [3.P – Sensor Tower] [link](https://sensortower.com/blog/state-of-mobile-health-and-fitness-in-2025) |

**Kategori ortalaması / ilk çeyrek ayrımı:** Dönüşüm için var (RevenueCat medyan + ilk çeyrek). Tutunma için birincil kaynakta
**bulunamadı**; yalnız UXCam derlemesinin 75. yüzdeliği var.
**Çelişki:** H&F D30 %3 (AppsFlyer, eski Adjust) ile %8,6 (Adjust 2026) arasında. Tanım ve yıl farkı; ikisi de satıcı verisi.

> **[ÇIKARIM]** Bizim için üç sonuç: (a) H&F'te insanlar *ödemeye* hazır ama *yenilemeye* değil — sorun satış değil, ilk ayın
> deneyimi. (b) Yıllık plan ağırlıklı kategoride 1. ay iptali sessiz bir kayıptır; kullanıcı 11 ay boyunca "ödemiş ama
> gitmiş" olur → K2'nin "2. hafta tutunması" öncü göstergesi doğru. (c) İade oranının H&F'te en yüksek olması, beklenti ile
> ilk deneyim arasındaki açığın bir ölçüsü olabilir [doğrulanmadı — nedeni araştırılmadı].

---

## 2 · Rakiplerin tutundurma mekanikleri

### 2.1 Seri (streak) türleri

| Uygulama | Birim | Ne kırar | Af / onarım | Kaynak |
|---|---|---|---|---|
| **Strava** | **haftalık** (Pzt-Paz, ≥60 sn aktivite) | aktivitesiz hafta | **Geç yükleme seriyi geri getirir**; afiş 2-5., 10., 15., 25. hafta ve 1-2-3. yıl | [RESMÎ] [Streaks on Strava](https://support.strava.com/hc/en-us/articles/36553427481997-Streaks-on-Strava) |
| **Hevy** | **haftalık** (≥1 antrenman) | tam bir hafta kayıtsız | Boşluk haftasına geriye kayıt girilirse hafta eski seriye eklenir; takvimde "son antrenmandan beri dinlenme günü" gösterilir | [RESMÎ] [Gym consistency](https://www.hevyapp.com/features/gym-consistency/) |
| **Strong** | haftalık seri (takvim widget'ı) | kural yayımlanmamış | — | [RESMÎ] App Store sayfası |
| **Apple Fitness** | günlük halkalar + ödül serisi | hedefin tutmadığı gün | **Halkalar gün/hafta/ay, 90 güne kadar duraklatılabilir; ödül serisi bozulmaz** | [RESMÎ] [Apple Watch kılavuzu](https://support.apple.com/en-me/guide/watch/apd9c3cfe913/watchos) |
| **Gentler Streak** | etkinlik yolu | — | Dinlenme seriye sayılır, ara sıfırlamaz; "hasta / sakat / ara" durumu | [RESMÎ] [gentlerstories.com](https://gentlerstories.com/gentlerstreak/) · L3 §4.1 |
| **WeightWatchers** | seri (kural yayımlanmamış) | — | **Vacation Mode**: kayıt duraklar, seri ve skor etkilenmez | [RESMÎ] App Store sayfası |
| **MyFitnessPal** | **günlük** — iki ayrı sayaç: giriş serisi + yemek kaydı serisi | kaçan gün (saat dilimi değişimi de) | Yemek serisi, kaçan güne geriye kayıtla onarılır; giriş sayacı web aracıyla düzeltilir | [RESMÎ] [MFP destek](https://support.myfitnesspal.com/hc/en-us/articles/360032624931) |
| **Cronometer** | **günlük** (yemek, egzersiz, ölçü, oruç — içe aktarılan veri sayılmaz) | kaçan gün | **Geriye kayıt sayılmaz**; kullanıcı seriyi gizleyebilir ya da elle istediği sayıya ayarlayabilir | [RESMÎ] [Cronometer destek](https://support.cronometer.com/hc/en-us/articles/16510105155988) |
| **Cal AI** | seri (kural yayımlanmamış) | — | **"Streak Restore" 0,99 $ uygulama içi satın alım** — kırılan seri parayla geri alınıyor | [RESMÎ] App Store sayfası |
| **Lose It!** | kayıt serisi | — | Hedef tarihi tahmini mevcut serinin gerçek açığından hesaplanır; seri uzadıkça tahmin oturur | [RESMÎ] [Lose It destek](https://loseit.zendesk.com/hc/en-us/articles/51382148864532) |
| **MacroFactor** | seri belgelenmemiş | — | "Adherence-neutral" ilke: uyumu zorlayan ya da uyumsuzluğu utandıran öğe yok (kırmızı sayı, uyarı, iyi/kötü yiyecek etiketi yok). Seri/rozet yokluğu sayfada açıkça yazmıyor [doğrulanmadı] | [RESMÎ] [adherence-neutral](https://macrofactor.com/adherence-neutral/) |
| **Duolingo** (referans) | günlük (1 ders yeter) | kaçan gün | Streak Freeze (2 tane takılabilir), Weekend Amulet (hafta sonu koruması), dönemsel geri yükleme etkinliği [doğrulanmadı] | [RESMÎ] aşağıda |

**Duolingo'nun ölçülmüş seri deneyleri** — sektörde tasarım değişikliğini A/B ile yayımlayan tek kaynak [RESMÎ]:

| Değişiklik | Ölçülen etki | Kaynak |
|---|---|---|
| Seriyi günlük hedeften ayırmak (1 ders = seri uzar) | 7+ gün serili öğrenci **+%40'ın üstünde** · **D14 tutunma +%3,3** · DAU +%1 · yeni kullanıcıda seri payı +%19 | [Improving the streak, 19 Kas 2020](https://blog.duolingo.com/improving-the-streak) |
| Seri uzatma animasyonu | yeni öğrenci tutunması +%1,7 | [How the streak builds habit, 31 Oca 2022](https://blog.duolingo.com/how-duolingo-streak-builds-habit) |
| 1 yerine 2 Streak Freeze takılabilmesi | günlük aktif öğrenci +%0,38 | aynı |
| Weekend Amulet (hafta sonu koruması) | bir hafta sonra dönme olasılığı +%4 · seriyi kaybetme −%5 | [How streaks keep learners committed, 10 May 2017](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals) |
| Streak Wager (7 günlük seri iddiası) | **D7 tutunma +%14** (D1 ve D14'te de anlamlı artış) | aynı |
| 7 günlük seriye ulaşan | ertesi gün dönme **2,4×**, kursu bitirme 3,6× — *korelasyonel* | 2020 ve 2022 yazıları |

Freeze'in churn'ü %21 düşürdüğü bulgusu I1 C5'te var (Lenny's Podcast); burada tekrarlanmadı.

**Seri tasarımında hakemli kanıt — acil durum payı (emergency reserve):**
Sharif & Shu: 240'tan fazla katılımcı 5 hafta adım saydı. "Haftada 7 gün, 2 acil atlama hakkı" gibi **paylı hedef** verilenler,
eşdeğer kolay hedefe (haftada 5 gün) ve katı hedefe (7 gün) göre **%20'ye kadar daha çok adım attı ve hedefi %40'a kadar daha
çok gün tutturdu**. Başarısızlık sonrası toparlanma (rebound) oranı: haftalık paylı %55, aylık paylı %47, katı %37, kolay %44.
Mekanizma: payın *küçük bir bedeli* var, insanlar onu harcamamaya çalışıyor ama başarısızlıkta "ilerlemem bitti" hissine
kapılmıyor. [HAKEMLİ] [field experiment PDF](https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Designing-More-Effective-Goals-by-Using-Emergency-Reserves-A-Field-Experiment.pdf) ·
[UCLA Anderson Review özeti](https://anderson-review.ucla.edu/emergency-reserves/) (OBHDP 2019; JMR 2017).

> **[ÇIKARIM]** Üç bağımsız hat aynı yere çıkıyor: salon verisi (I1 C-EK: 1 hafta boşluk seriyi bozmaz), Duolingo A/B'leri
> (seriyi kolaylaştırmak ve hafta sonunu korumak tutunmayı artırıyor), Sharif & Shu (paylı hedef katı ve kolay hedefi yeniyor).
> Antrenman uygulamaları zaten haftalık + onarılabilir seriye geçmiş. Günlük seriyi sürdürenler beslenme uygulamaları ve
> onların hiçbiri etki yayımlamamış.

### 2.2 Haftalık check-in, rapor, özet

| Uygulama | Ne | Etki | Kaynak |
|---|---|---|---|
| MacroFactor | Haftalık check-in (gün kullanıcıda, reddedilebilir) + koçluk modülleri: Partial Logging, Weigh-In, Fasting, **Logging Break**, Program Update | bulunamadı | [RESMÎ] [check-in](https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules) |
| MyFitnessPal | **Weekly Digest** — her pazar son 7 günün özeti; ücretsiz kullanıcı son 2 özeti görür | bulunamadı | [RESMÎ] [MFP destek](https://support.myfitnesspal.com/hc/en-us/articles/360032622591) |
| Hevy | **Aylık rapor** (antrenman, set, hacim, kas dağılımı, PR); yalnız içinde bulunulan ayda açılabilir, paylaşılabilir | bulunamadı | [RESMÎ] [monthly report](https://www.hevyapp.com/features/monthly-report/) |
| Ladder | Her pazar koçun yeni 7 günlük planı ("The Drop") | bulunamadı | [RESMÎ] [joinladder.com/llms.txt](https://www.joinladder.com/llms.txt) |
| Gentler Streak | haftalık özet + aylık özet | bulunamadı | [RESMÎ] |
| WHOOP / Oura | haftalık rehberlik / haftalık rapor | sayfa okunamadı [doğrulanmadı] | — |

**Ölçülmüş tek e-posta kanıtı [HAKEMLİ]:** Agachi ve ark. 2023 (JMIR mHealth, 22.797 katılımcı, 78 hafta, davranış değişikliği
uygulaması): genel bir e-postayı alıp açmak, o hafta aktif olma olasılığını **+3 yüzde puan** artırdı. Programın hedefiyle
uyumlu e-postalar (sağlık kampanyası) etkinliği artırdı; hedeften sapanlar (indirim, fırsat) **etkisiz** kaldı.
[RUG kaydı](https://research.rug.nl/en/publications/the-effect-of-periodic-email-prompts-on-participant-engagement-wi/)
Adaptif koçluk RCT'si (1. ayda geride kalana ek temas) I1 D1'de var.

### 2.3 İlerleme görselleştirme

| Uygulama | Ne gösteriyor | Etki | Kaynak |
|---|---|---|---|
| Fitbod | Kas toparlanma haritası (her kas 0-100%), Strength Score, tahmini 1RM | Şirket blogu: Insights'a bakanlar 6 aylık antrenman serisini **2×** sürdürüyor; Strength Score'u haftalık kontrol edenler %25 daha tutarlı — *yöntem yok, korelasyonel* | [RESMÎ] [Fitbod Insights](https://fitbod.me/blog/fitbod-insights-feature/) |
| Apple Fitness | Halkalar (Move/Exercise/Stand) | Ocak 2026: kullanıcıların %60'ı Ocak'ın ilk 2 haftasında egzersiz dakikasını %10+ artırdı; Ocak sonuna kadar sürdürenlerin %90'ı Şubat-Mart'ta da sürdürdü (~100.000 kişi, Apple Heart and Movement Study) — *korelasyonel, gönüllü* | [RESMÎ] [Apple Newsroom](https://www.apple.com/li/newsroom/2026/01/apple-watch-keeps-users-active-and-motivated-in-2026/) |
| Strong | e1RM ve hacim grafikleri | bulunamadı | [RESMÎ] App Store |
| MyFitnessPal | "Complete This Entry": bugün gibi her gün yersen 5 hafta sonraki kilo tahmini; kalori tabanının altında hesaplanmaz | bulunamadı. Sayfa kendisi "yalnız motivasyon amaçlı tahmin" diyor | [RESMÎ] [MFP destek](https://support.myfitnesspal.com/hc/en-us/articles/360032624131) |
| Lose It! | Hedef tarihi (seriden) | bulunamadı | [RESMÎ] yukarıda |
| WeightWatchers | Weight Health Score, AI vücut tarayıcı (3D) | bulunamadı | [RESMÎ] App Store |

### 2.4 Rozet, başarı, PR kutlaması

| Uygulama | Ne | Etki | Kaynak |
|---|---|---|---|
| Hevy | **Live PR**: rekor kıran set tamamlanır tamamlanmaz afiş (en ağır, 1RM, set hacmi, tekrar, süre) | bulunamadı | [RESMÎ] [live PR](https://www.hevyapp.com/features/live-pr/) |
| Strava | Seri afişleri, PR/başarı kupaları | bulunamadı | [RESMÎ] |
| Lose It! | Rozetler, kilometre taşları; tüm hesap geçmişine göre, sıfırlanamaz | bulunamadı | [RESMÎ] [Lose It destek](https://loseit.zendesk.com/hc/en-us/articles/47773224342548) |
| MyFitnessPal | Seri kutlamaları (4. ve 5. gün), "ilk yemek kaydedildi" kutlaması (Ağustos 2025) | bulunamadı | [RESMÎ, doğrulanmadı — basın bülteni 403] |
| Cronometer | Rozet yok (yardım merkezinde 0 sonuç) | — | [RESMÎ] |

**Hakemli:** Hamari 2017, bir eşler arası takas hizmetinde 2 yıllık alan deneyi (rozetten önce n=1.410, sonra n=1.579):
rozetli dönemde kullanıcılar anlamlı olarak daha çok teklif, işlem ve yorum yaptı. Fitness değil. [HAKEMLİ]
[Aalto kaydı](https://research.aalto.fi/en/publications/do-badges-increase-user-activity-a-field-experiment-on-the-effect/)
**Oyunlaştırma meta-analizi:** 16 RCT, 2.407 katılımcı → fiziksel aktivitede g=0,42 (%95 GA 0,14-0,69); aktif kontrole göre
g=0,23; müdahale bittikten ortalama 14 hafta sonra **g=0,15**. Yazarlardan biri oyunlaştırma şirketi Kiplin'de. [HAKEMLİ]
[Mazeas ve ark. 2022, JMIR](https://pubmed.ncbi.nlm.nih.gov/34982715/)

### 2.5 Rütbe, sıralama, yarış

| Uygulama | Ne | Etki | Kaynak |
|---|---|---|---|
| Liftoff | Her harekete rütbe, global sıralama, günlük/haftalık görevler, kozmetik para birimi; "XP kazan, rütbe atla" döngüsü | şirket verisi yok; aylık ~300 bin $ gelir [3.P – VentureRadar] | [RESMÎ] App Store · [VentureRadar](https://ventureradar.substack.com/p/this-gym-app-built-by-college-students) |
| Strava Local Legends | 90 günde bir segmenti **en sık** tamamlayan unvanı alır — **hız değil, süreklilik** | bulunamadı | [RESMÎ] [Local Legends](https://support.strava.com/hc/articles/360043099552-Local-Legends) |
| Duolingo ligleri | öğrenme süresi +%17; günde ≥1 saat, haftada 5 gün çalışanlar 3× | [3.P – Lenny's Newsletter, Duolingo eski çalışanı] [How Duolingo reignited user growth](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth) |

**En güçlü nedensel kanıt — STEP UP RCT [HAKEMLİ]:** 602 aşırı kilolu yetişkin, 24 hafta oyun + 12 hafta takip.
Kontrole göre günlük ek adım:

| Kol | 24 hafta içinde | Oyun bittikten sonraki 12 hafta |
|---|---|---|
| Yarış (competition) | **+920** | **+569 (anlamlı kaldı)** |
| Destek | +689 | +428 (P=.04) |
| İşbirliği | +637 | +126 (anlamsız) |

**Ama oyunun yapısı kayıp çerçeveli:** her pazartesi 70 puan verildi, hedef tutmayan her gün 10 puan **silindi**; kullanıcılar
gümüş seviyeden başlatıldı ki ilk hafta bronza **düşmenin kaybını** hissetsinler.
[Patel ve ark. 2019, JAMA Intern Med](https://pmc.ncbi.nlm.nih.gov/articles/PMC6735420/) · Benzer tasarım: ENGAGE RCT (n=500),
yalnız **kendi seçtiği ve hemen başlayan hedef** kolu kalıcı artış verdi (+1.384 adım, 8 haftalık takipte de sürdü); atanan ya
da kademeli hedef kolları tutarlı etki vermedi. [HAKEMLİ] [Patel ve ark. 2021, JAMA Cardiol](https://pubmed.ncbi.nlm.nih.gov/34468691/)

### 2.6 Evcil hayvan / karakter

| Uygulama | Ne | Etki | Kaynak |
|---|---|---|---|
| Finch | Öz-bakım görevleri hayvana enerji verir, hayvan maceraya çıkar, akşam hikâyeyle döner; widget hayvanın "sen yokken de" yaşadığını gösterir | **D1 %54 / D7 %37**, ~10 milyon MAU (Sensor Tower tahmini) — *Finch'in kendi verisi değil; öz-bakım kategorisi; korelasyonel* | [3.P – Deconstructor of Fun, Sensor Tower'a atıfla] [link](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl) · [RESMÎ] App Store |
| Finch "ceza yok" tasarımı | — | Resmî sayfada doğrulanamadı; yalnız kullanıcı yorumu var [doğrulanmadı] | — |
| Duolingo widget'ı | Duo'nun "kişiliği" widget'ın merkezinde; Duolingo bunu "öğrencilerin sevdiği" bir şey olarak gerekçelendiriyor | korelasyonel (§2.10) | [RESMÎ] [widget feature](https://blog.duolingo.com/widget-feature) |

Sanal hayvan ile fiziksel aktivite üzerine hakemli çalışma **bulunamadı** (Europe PMC'de arandı).

### 2.7 Sosyal hesap verebilirlik (ayrıntısı R4 hattında)

| Uygulama | Ne | Etki | Kaynak |
|---|---|---|---|
| Hevy | Takip | Kurucu: birbirini takip etmek insanları geri getiren en büyük çekimlerden biri — *sayı yok* | [3.P – RevenueCat Sub Club] [Guillem Ros](https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast) |
| Ladder | Her planın takım sohbeti; antrenman ortasında takım arkadaşını alkışlama | CEO: takım sohbeti kayba karşı ana savunma — *sayı yok* | [3.P – BetterLaunch, Sub Club özeti](https://www.betterlaunch.co/playbooks/episodes/greg-stewart-ladder-tiktok) |
| Strava | Kulüpler, grup meydan okumaları, kudos | Kulübe katılanlar sonraki ay %10 daha çok aktivite; grup meydan okumasına katılanların yarısı sonraki 30 günde daha çok yükledi — *Strava verisi, basın aktarımı, korelasyonel* | [3.P – Stickybottle](https://www.stickybottle.com/coaching/strava-reveals-quitters-day-date-most-new-years-resolutions-abandoned-90627) · [endurance.biz](https://endurance.biz/2021/industry-news/by-the-numbers-strava-year-in-sport-2021-report/) |
| Strava kudos | Daha çok kudos alan koşucular daha sık koşuyor; kudos verilen grubun bir sonraki yarışa katılması daha olası | [HAKEMLİ, Social Networks 2023 — yalnız üniversite haberi okundu] [Vox Radboud](https://www.voxweb.nl/en/what-kudos-can-do-for-your-motivation-and-sports-pleasure) |
| Koşu ağı | ~1,1 milyon koşucu, 5 yıl: egzersiz arkadaştan bulaşıyor; daha az aktif olan daha aktif olanı etkiliyor, tersi değil | [HAKEMLİ] Aral & Nicolaides 2017, Nature Communications, DOI 10.1038/ncomms14753 |

> ⚠️ **I1 C2 ile gerilim:** I1'deki meta-analizde "sosyal ipucu" (aynı kişilerle yapmak) fiili davranışı **öngörmüyordu**
> (r=0,09, anlamsız). Burada sosyal *teşvik* (yarış, takım, kudos) etkili görünüyor. İkisi farklı yapı: biri bağlam ipucu,
> öteki ödül/hesap verebilirlik. Çözümü R4'te.

### 2.8 "Bugünün planı" çekişi

| Uygulama | Ne | Etki | Kaynak |
|---|---|---|---|
| Ladder | Pazar günü 7 günlük plan, her gün tek antrenman, PR uyarısı, widget | Üyelerin %80'i Ladder'dan önce fitness uygulaması kullanmıyormuş; 15 milyon+ tamamlanan antrenman — *tutunma sayısı yok*. "Tracker'dan plan veren ürüne" pivotu K1'de | [RESMÎ, basın bülteni] [Silicon UK](https://www.silicon.co.uk/press-release/ladder-secures-over-100-million-in-new-funding-to-scale-1-strength-training-app) |
| Runna | Koç tarafından kurulmuş plan, hafta içinde taşınabilen antrenmanlar | bulunamadı | [RESMÎ] App Store |
| Fitbod | Toparlanmış kaslara öncelik veren üretilmiş antrenman | §2.3'teki blog iddiası | [RESMÎ] [Fitbod algoritma](https://fitbod.me/blog/fitbod-algorithm) |

### 2.9 Bildirim stratejisi

| Uygulama / kaynak | Ne | Etki | Kaynak |
|---|---|---|---|
| Cronometer | Yemek hatırlatması **yalnız o güne kayıt yoksa** gider; kilo hatırlatması son tartıdan **7 gün sonra**; seri kaybı bildirimi belgelenmemiş | bulunamadı | [RESMÎ] [Cronometer destek](https://support.cronometer.com/hc/en-us/articles/360051718511) |
| MyFitnessPal | Öğün başına elle saat; 2025'te "kişiselleştirilmiş öğün hatırlatması" eklendi [doğrulanmadı] | bulunamadı | [RESMÎ] |
| **Duolingo (KDD 2020)** | Bildirim şablonunun **yeniliği** etkiliyor: yakın zamanda görülmemiş şablon daha iyi çalışıyor, tekrar ettikçe etki sönüyor (15 günlük yarı ömürle modellendi) | 2 haftalık A/B: DAU +%0,5 · ders +%0,4 · **yeni kullanıcıda D1 +%2,2, D7 +%2,0** · mevcut kullanıcıda D7 anlamsız; 5 ay sonra %5'lik dışarıda bırakılmış gruba göre +%2,5 | [HAKEMLİ] [Yancey & Settles 2020](https://research.duolingo.com/papers/yancey.kdd20.pdf) |
| Kişiye özgü zamanlama | Fotoğraflı yemek kaydında, kişinin kendi öğün düzenine göre zamanlanan hatırlatma günde **+1,78 fotoğraf** (P≤.001); sabit saatli hatırlatma +0,83 (anlamsız) — çapraz RCT, n=30 | [HAKEMLİ] [Lee ve ark. 2024, JMIR mHealth](https://doi.org/10.2196/52074) |
| Apple HIG | Aynı şey için birden çok bildirim gönderme — kullanıcı hepsini kapatabilir; pazarlama bildirimi yalnız açık izinle; aciliyet düzeyini dürüst seç (Passive / Active / Time Sensitive / Critical) | — | [RESMÎ] [Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications) · [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications) |
| App Review 4.5.4 | Bildirim uygulamanın çalışması için zorunlu olamaz; tanıtım/pazarlama bildirimi yalnız uygulama içi açık onay + uygulama içi vazgeçme yoluyla | — | [RESMÎ] [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) |

Bildirimin nedensel etkisi (+%3,9), frekans ve kapatma oranları I1 D2'de; tekrarlanmadı.

### 2.10 Widget ve Live Activity

| Uygulama | Ne | Etki | Kaynak |
|---|---|---|---|
| **Duolingo** | Widget yalnız iki şey gösterir: **güncel seri** ve **bugün ders yapıldı mı** | Widget'ı olanların yarısının en az 6 aylık serisi var; widget kullananlar "daha bağlı olma eğilimi kontrol edildiğinde bile" çok daha iyi tutunuyor — *yöntem verilmemiş, korelasyonel* | [RESMÎ] [widget feature, 29 Ağu 2023](https://blog.duolingo.com/widget-feature) |
| MacroFactor | Ana ekran widget'ları (Eki 2023), Apple Watch uygulaması (2025) | bulunamadı | [RESMÎ] [annual report 2024](https://macrofactor.com/annual-report-2024/) · [2025](https://macrofactor.com/annual-report-2025/) |
| MyFitnessPal | iOS/Android widget'ları; iOS 18+ etkileşimli su widget'ı | bulunamadı | [RESMÎ] |
| WeightWatchers | Ana ve kilit ekranı widget'ı (Points bütçesi) | bulunamadı | [RESMÎ] [WW blog](https://www.weightwatchers.com/us/blog/weightwatchers-mobile-widget) |
| Cronometer | Seri widget'ı; seriyi Instagram/WhatsApp'a paylaşma | bulunamadı | [RESMÎ] |
| Strong | Takvim widget'ı (aylık antrenman + haftalık seri); dinlenme sayacı için Live Activity / Dynamic Island | bulunamadı | [RESMÎ] App Store |
| OneSignal | Live Activity kullanan uygulamaların ortalama 30 günlük tutunması **%23,7 daha yüksek** — *uygulama düzeyinde korelasyon* | — | [3.P – vendor: OneSignal] [basın bülteni](https://www.silicon.co.uk/press-release/onesignal-releases-2024-state-of-customer-engagement-report-revealing-key-omnichannel-considerations-and-opportunities) |
| Apple HIG | Live Activity **başı ve sonu belli** görevler içindir, en iyi **8 saati aşmayan** işlerde çalışır | — | [RESMÎ] [Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities) |

---

## 3 · Sıkıcı işi hafifleten tasarım

I2 §A (SnappyMeal: ses %0, düzeltme %20,7; ham LLM metin tahmini MAE 652 kcal; sesli asistanda kamusal utanç) ve §D (telefon
adımı MAPE %29,6; beyan eksikliği %20-27) tekrarlanmadı.

| Kalıp | Kim kullanıyor | Ölçülmüş etki | Kaynak |
|---|---|---|---|
| **Kayıt sıklığı > kayıt süresi** | — | 142 kişi, 24 hafta: günlük kayıt süresi 1. ayda **23,2 dk → 6. ayda 14,6 dk**. 6. ayda hâlâ kayıt yapanlarda (%65,5) süre kilo başarısını ayırmadı; **günlük giriş sayısı** ayırdı (≥%5 kaybedenler günde 2,4, kaybetmeyenler 1,6 kez). | [HAKEMLİ] [Harvey ve ark. 2019, Obesity](https://pubmed.ncbi.nlm.nih.gov/30801989/) |
| Haftalık oranla tutarlılık | MFP (çalışma ortamı) | 12 hafta, n=100: haftanın ≥6/7 gününü haftaların ≥%75'inde kaydedenlerin %5 kilo kaybına ulaşma oranı 3. ayda %48 / %13, 6. ayda %54 / %15 — *korelasyonel* | [HAKEMLİ] [Patel ve ark. 2020, J Behav Med](https://pubmed.ncbi.nlm.nih.gov/31396820/) |
| **Kayıt bırakma nedenleri** | — | Anket n=257: bırakma nedeni değerin zamanla azalması %37, fazla emek %25, fazla zaman %16. Kayıt atlama: unutmak %54; **%40'ı "girmesi zor" yiyeceği hiç kaydetmedi**; %13 sağlıksızı kaydetmekten kaçındı. | [HAKEMLİ] [Cordeiro ve ark. CHI 2015](https://homes.cs.washington.edu/~jfogarty/publications/chi2015-decaf.pdf) |
| **Fotoğraflı günlük** | Cal AI, MacroFactor, MFP Meal Scan, Lose It Snap It | Saha n=27, 4-8 hafta: girişlerin %88'i fotoğraflı, %86'sı yemekten sonraki 10 dk içinde. "Çok zor olduğu için kaydetmedim" **%60 → %22**; ama **unutma %95 → %93 (değişmedi)**. %52'si başkalarının önünde yemek fotoğrafı çekmeyi tuhaf buldu. Kilo veren katılımcılar yine de kalori sayısı istedi. | [HAKEMLİ] aynı |
| Fotoğraf özelliği (gerçek kullanıcı) | Lose It! Snap It | Kullananlar (n=9.871) kullanmayanlara (n=113.916) göre **+6,1 gün daha çok kayıt**, +3,5 gün daha uzun kullanım, +%0,14 kilo kaybı; kilo farkı kayıt günüyle tamamen açıklanıyor — *geriye dönük, kullanıcı kendi seçti* | [HAKEMLİ] [Ben Neriah & Geliebter 2019](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6592399/) |
| Fotoğrafın doğruluk bedeli | MFP, Lose It, Cal AI, Appediet | 102 tartılmış öğünde dördü de kaloriyi **düşük** tahmin etti, ağırlıkla yağı kaçırarak. Öğün başına 250-345 kcal sayısı [doğrulanmadı]. | [3.P – Nutritional Outlook, NUTRITION 2026 bildirisi](https://www.nutritionaloutlook.com/view/study-finds-popular-ai-calorie-tracking-apps-underestimate-meal-energy-by-about-a-third) |
| **Öğün hafızası / tekrar** | MFP, MacroFactor (son/sık yiyecekler, kayıtlı öğün) | 112 kişi, 12 hafta: çoğunlukla **aynı yiyecekleri** yiyenler %5,9, çeşitli yiyenler %4,3 kilo verdi; günlük kalori dalgalanmasındaki her +100 kcal ~%0,6 daha az kayıpla ilişkili — *korelasyonel* | [HAKEMLİ] Hagerman ve ark. 2026, Health Psychology · [ScienceDaily](https://sciencedaily.com/releases/2026/03/260330233357.htm) |
| Tekrarın yapısı | MFP günlükleri | Tek tek yiyecekler bütün öğünlerden daha çok tekrarlanıyor; tekrar kahvaltıda en güçlü, akşam yemeğinde en zayıf, hafta içi daha yüksek (yüzde verilmemiş) | [HAKEMLİ] Pai & Sabharwal 2022, Sensors (PMC9002488) |
| **Ses vs yazı** | MFP sesli kayıt, Lose It | 28 günlük pilot, 9'a 9, herkese günde 3 hatırlatma: ses kolunda kayıt **1,7×**, aktif gün 1,5×; bırakan 1'e 5. SnappyMeal'deki %0 ses kullanımıyla (I2 A0) çelişiyor — fark hatırlatmadan olabilir; örneklem çok küçük. | [HAKEMLİ] [Chikwetu ve ark. 2023, JMIR Form Res](https://doi.org/10.2196/46659) |
| **Dokunuş sayısı (hız ölçüsü)** | MacroFactor | Saniye değil **ayrık eylem sayısı** ölçüyor (arama, çoklu ekleme, barkod, hızlı ekleme). 2025, 21 uygulama: MacroFactor 24, MyNetDiary 30, Lose It 32; MFP ~1,5× daha çok eylem. AI fotoğraf/ses test edilmedi. *Rakibin kendi kıyası.* | [RESMÎ] [fastest food logger 2025](https://macrofactor.com/fastest-food-logger-2025/) · [2022](https://macrofactor.com/fastest-food-logger/) |
| **Önceki seti önceden doldurma** | Hevy ("PREVIOUS" sütunu; dokununca mevcut sete yazılır), Strong | Hevy sayı yayımlamamış; içinde **önceden doldurma etkisini ölçen kontrollü çalışma bulunamadı**. Anket yöntembiliminde, önceki cevabı geri okutmanın yanlış ön-yüklemeleri de onaylattığı bildiriliyor [doğrulanmadı] | [RESMÎ] [Hevy track exercises](https://www.hevyapp.com/features/track-exercises/) |
| Manuel olay tetikli kayıt maliyeti | APPetite | günde ortalama 17,66 dk; SUS 61,9/100 (n=157) | [HAKEMLİ] Ruf ve ark. 2021, JMIR (DOI 10.2196/25850) |

> **[ÇIKARIM]** Kanıt iki ayrı sorunu ayırıyor: **sürtünme** (girmesi zor → atlanıyor) ve **tetik** (unutuluyor). Fotoğraf
> ilkini çözüyor, ikincisini çözmüyor; ikincisini kişinin kendi düzenine göre zamanlanan hatırlatma çözüyor. Başarıyı ayıran
> şey dakika değil *dönüş sıklığı* — yani kayıt ekranının işi uzun oturum değil, **kısa ve sık dokunuş**.

---

## 4 · İlk hafta değeri — sonuç yokken rakipler ne gösteriyor

| Uygulama | İlk 7 gündeki "kazanç" | Dürüstlük biçimi | Kaynak |
|---|---|---|---|
| **Runna** | Onboarding'deki tahmini yarış süresinden kurulan plan. Pace Insights tempoları ancak **"net bir eğilim"** görünce önerir; o zamana kadar "veriyi izliyorum" der. Kullanıcı onaylamadan tempo değişmez. | Erken karar yok, görünür "öğreniyorum" durumu var | [RESMÎ] [Pace Insights](https://support.runna.com/en/articles/14656203-what-are-pace-insights-and-how-do-they-work) |
| **Fitbod** | İlk antrenmandan itibaren dolan kas toparlanma haritası; yeni harekette başlangıç ağırlığı benzer kullanıcıların toplu verisinden | Tahmin, kullandıkça incelir | [RESMÎ] [Fitbod algoritma](https://fitbod.me/blog/fitbod-algorithm) |
| **Hevy** | **Live PR** afişi — fiziksel sonuçtan önceki tek gerçek kazanç | Gerçek olay, doğru adıyla | [RESMÎ] |
| **MacroFactor** | Onboarding verisiyle standart formülden ilk harcama tahmini; haftalık check-in; tahmin **3-4 hafta tutarlı kayıttan sonra** veriye dayalı hale gelir | Neyin formül neyin veri olduğu söyleniyor | [RESMÎ] [MF yardım](https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low) |
| **WHOOP** | Günlük Recovery (1-99%) ve Strain (0-21) | Recovery ilk 4 gün gri [doğrulanmadı]; taban ~30 gün [doğrulanmadı] | [RESMÎ] App Store |
| **Oura** | Günlük skorlar | Ortalama değerleri öğrenmek **iki haftaya kadar** sürebilir | [RESMÎ] [Oura destek](https://support.ouraring.com/hc/en-us/articles/360057791533) |
| **MyFitnessPal** | "İlk yemek kaydedildi" kutlaması [doğrulanmadı]; seri mesajları; pazar günü Weekly Digest | — | [RESMÎ] |
| **Strava** | 2. haftada ilk seri afişi | — | [RESMÎ] |
| **Ladder** | 1. günden takım sohbeti; pazar "The Drop" | — | [RESMÎ] |
| **Duolingo** | Seri uzatma animasyonu (yeni öğrencide tutunma +%1,7) | — | [RESMÎ] |

**İlk haftanın neyi öngördüğü (hepsi korelasyonel):**
- MyFitnessPal şirket verisi: **ilk haftasında en az 4 gün kayıt yapanların** ölçülebilir ilerleme kaydetme olasılığı 7×.
  [3.P – Athletech News, 30 Ara 2024](https://athletechnews.com/nutrition-tracking-boosts-weight-loss-myfitnesspal-finds/)
- Duolingo: 7 günlük seriye ulaşan ertesi gün 2,4× daha olası döner. [RESMÎ]
- Megastudy (nedensel kola dayalı): işe yarayan programlarda müdahale sırasında kazanılan her ek salon ziyareti, sonraki 10
  haftada ~0,30 ek ziyaret getirdi. [HAKEMLİ] (§5)
- Lose It, 972.687 kullanıcı: "ara sıra kullanan" grupta %5 kilo kaybına ulaşan %4,87, "temel" %37,61, "güçlü kullanıcı"
  %72,70; arkadaş, grup, meydan okuma, hatırlatma, e-posta raporu gibi özelleştirme kullanımı grupları ayırdı.
  [HAKEMLİ] [Serrano ve ark. 2016, JMIR](https://pmc.ncbi.nlm.nih.gov/articles/PMC4925935)

> **[ÇIKARIM]** Hiçbir rakip ilk haftada *karar* vermiyor. Üç şeyden birini yapıyor: (1) **kalibrasyon** — ve bunu görünür,
> dürüst bir "öğreniyorum" durumu olarak gösteriyor (Runna, Oura, WHOOP, MacroFactor); (2) **gerçek küçük olayı kutluyor**
> (Hevy PR, Strava afişi, Duolingo animasyonu); (3) **planı veriyor** (Ladder, Fitbod). keel'in "1. haftada plan değişti ve
> nedenini söyledi" anı bu kümede bir fark — ama trend verisine değil, ilk haftanın davranış verisine dayanmak zorunda (U8,
> bkz. Anayasa gerilimi).

---

## 5 · Kopuş sonrası geri dönüş

### 5.1 Ürün kalıpları

| Uygulama | Akış | Dil / ton | Kaynak |
|---|---|---|---|
| **Runna Plan Realignment** | 3'ten çok antrenman ya da tam bir hafta kaçınca (genelde **pazartesi**) açılır. Seçenekler boşluğa göre büyür: birkaç antrenman → atla ya da yeniden diz; birkaç hafta → planı uzat, bitiş tarihine göre yeniden kur ya da devam et; 4+ hafta → yeni plan / baştan başla / yeniden kur / devam. | Kaçırmayı herkesin başına gelen bir şey olarak çerçeveliyor; vücudu dinlemek ve sakatlık riskinden söz ediyor. Atlama yazısı: "Skipping a run isn't a failure of discipline." | [RESMÎ] [Plan Realignment](https://support.runna.com/en/articles/10026375-how-to-use-the-plan-realignment-feature) · [skip guidance](https://support.runna.com/en/articles/15012850-how-and-when-to-skip-a-run-managing-missed-sessions-in-your-training-plan) |
| **MacroFactor Logging Break** | Haftada 4'ten az kayıtlı gün → harcama güncellemesi otomatik **"holding"** durumuna geçer; sonraki check-in'de neden durduğunu ve ne zaman devam edeceğini açıklayan modül | Veri kalitesini koruma olarak çerçeveli, kullanıcı hatası olarak değil | [RESMÎ] [Logging Break](https://help.macrofactorapp.com/en/articles/251-coaching-module-logging-break) |
| Gentler Streak | "Activity Status": ara / hasta / sakat → seri uyarlanır (ücretli özellik) | suçlamasız | [3.P – TapSmart] · L3 §4.1 |
| WW Vacation Mode · Apple halka duraklatma · Strava geç yükleme · Hevy/MFP geriye kayıt | Seriyi korumanın dört farklı yolu | — | §2.1 |
| **Peloton (Re)Build** | Hastalık, sakatlık ya da seyahat sonrası dönenlere 7 günlük karma program (13 Şub 2026) | Doğrudan yoğun antrenmana dönmenin ters teptiği; kısa, biten bir hedefin güveni yeniden kurduğu çerçevesi | [3.P – The Clip Out](https://theclipout.com/peloton-introduces-the-rebuild-program-with-ally-love/) |
| **Calm** (karşı örnek) | Uykuda olan **ödeyen** abonelere yeniden etkinleştirme mesajı, dışarıda bırakılmış gruba karşı test edildi | Mesaj alanlar **anlamlı olarak daha çok iptal etti** (sayı yok) | [3.P – Hightouch Lifecycle Leaders](https://lifecycle-leaders.hightouch.com/p/the-one-audience-you-actually-shouldn-t-re-engage) |
| Duolingo seri geri yükleme etkinliği | 30+ günlük serisi kırılanlara 3 ders üst üste yapınca seriyi geri verme | — | [3.P – Android Authority, doğrulanmadı] |

### 5.2 Ölçülmüş kanıt

**Megastudy — Milkman ve ark. 2021, Nature [HAKEMLİ]** (24 Hour Fitness'ın 61.293 üyesi, 30 bilim insanı, 53 dört haftalık
program + plasebo; PDF'ten okundu):
- Programların **%45'i** haftalık salon ziyaretini anlamlı artırdı (%9-27). Plasebo grubu haftada 1,48 ziyaret.
- **Birinci: kaçırılan antrenmandan sonra geri gelene 125 puan (0,09 $) bonus → haftada +0,40 ziyaret (+%27)**; temel pakete
  göre +%16. Aynı bonusun 225 puanlık hâli +%23.
- Diğer güçlüler: ziyaret başına 1,75 $ (+%25); "Amerikalıların çoğu egzersiz yapıyor ve oran artıyor" mesajı (+%24).
- **Kalıcılık zayıf:** programların yalnız **%8'i** müdahale bittikten sonraki 4 haftada anlamlı etkiyi sürdürdü (şans
  beklentisi %2,5).
- Uzmanların, profesörlerin ve sıradan insanların tahmini gerçek sonuçla ilişkisizdi (r=0,02); tahminler 9,1× fazla iyimserdi.
- [DOI 10.1038/s41586-021-04128-4](https://doi.org/10.1038/s41586-021-04128-4)

**Fresh start etkisi — Dai, Milkman & Riis 2014, Management Science [HAKEMLİ]** (11.912 öğrenci salon üyesi, 442 gün):
salona gitme olasılığı **haftanın başında +%33,4**, ayın başında +%14,4, yılın başında +%11,6, dönem başında +%47,1, okul
tatilinden sonra +%24,3. "Diet" araması hafta başında +%14,4, yılbaşında +%82,1.
[PDF](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf)

**Duolingo'nun büyüme ayrıştırması [3.P – Lenny's Newsletter, Jorge Mazal]:** Mevcut kullanıcı tutunma oranı (CURR — son iki
haftada aktif olanın bu hafta dönme olasılığı) DAU'ya, ikinci en önemli metrik olan pasif kullanıcıyı geri kazanmaya göre
**5× daha çok** etki ediyordu. CURR %21 arttı = en iyi kullanıcılarda günlük kayıp %40'tan fazla düştü; DAU 4 yılda 4,5×.
"Reactivated" 7-29 gün, "resurrected" 30+ gün yokluk — bu gruplar için tutunma sayısı verilmemiş.

**Kayma sonrası öz-şefkat** (I1 C6'daki kaynaklara ek):
- Adams & Leary 2007, JSCP: sağlıksız yiyecek yüklemesinden sonra öz-şefkat telkini sıkıntıyı ve yüksek kısıtlayıcı
  yiyenlerde sonraki yemeyi azalttı (n sayfada yok). [HAKEMLİ] [Duke](https://scholars.duke.edu/publication/782823)
- Thøgersen-Ntoumani ve ark. 2021, Br J Health Psychol: n=56, 2 hafta günde 2 ölçüm. Kaymadan sonra öz-şefkatin daha yüksek
  olduğu günlerde diyete devam niyeti ve öz-yeterlik daha yüksek, olumsuz duygu daha düşük; aracı suçluluk. Kilo kaybını
  yordamadı. [HAKEMLİ] [Birmingham](https://research.birmingham.ac.uk/en/publications/does-self-compassion-help-to-deal-with-dietary-lapses-among-overw/)
- Hagerman ve ark. 2024, Appetite: n=140; kaymaya öz-şefkatle tepki, sonraki birkaç saatte daha iyi ruh hali ve öz-denetim.
  [3.P – Drexel haber bülteni](https://drexel.edu/news/archive/2024/January/Can-Practicing-Self-Compassion-Help-People-Achieve-Weight-Loss-Goals)

> **[ÇIKARIM]** Geri dönüşün üç ölçülmüş kaldıracı var: **dönüşün kendisini olumlu karşılamak** (megastudy'nin birincisi),
> **takvimsel yeni başlangıç** (pazartesi +%33,4 — I1 D1'in pazartesi check-in'iyle aynı gün) ve **suçlamasız, kademeli
> seçenek** (Runna'nın boşluk uzunluğuna göre büyüyen seçenekleri). Ters örnek de var: ödeyip kullanmayana jenerik "seni
> özledik" mesajı iptali tetikleyebilir (Calm). Ve büyük resim: geri kazanmak, tutmaktan çok daha zayıf bir kaldıraç
> (Duolingo 5×).

---

## 6 · Kaçınılacaklar — ölçülmüş zarar

### 6.1 Suçluluk ve utanç

- **Suçluluk çağrılarının meta-analizi** — Peng ve ark. 2023, Frontiers in Psychology: 26 çalışma, 127 etki büyüklüğü,
  n=7.512. Genel etki küçük (g=0,19). Moderatörler (tam metin tablosundan okundu):
  - Okura **sorumluluk yükleyen** mesaj g=**0,08**; yalnız zararı anlatan g=0,36.
  - Telafi edici bir davranış **önerilen** mesaj g=0,22; önerilmeyen g=**−0,20** (yalnız 3 çalışma — zayıf).
  - Sağlık/tıp alanındaki mesajlar g=−0,01 (2 çalışma).
  - [HAKEMLİ] [PMC10568480](https://pmc.ncbi.nlm.nih.gov/articles/PMC10568480/)
- **Karşı kanıt (saklamıyorum):** Xu & Guo 2018, Health Communication: 8 çalışma, n=2.061; suçluluk çağrılarının sağlık
  tutum ve niyetine güçlü etkisi (r=0,49). [HAKEMLİ] [NAU kaydı](https://experts.nau.edu/en/publications/a-meta-analysis-of-the-effectiveness-of-guilt-on-health-related-a/)
  Uzlaştırma: suçluluk kendi başına zararlı değil; **zararlı olan suçlama, açık suçluluk ve çıkış yolu göstermemek.** Niyet
  ölçümü davranış değil.
- **Duolingo baykuş tonu:** suçlayıcı bildirimlerin A/B sonucu, kapatma oranı **bulunamadı**. KDD 2020 makalesindeki örnek
  şablonlar bilgi veren türden. "Hasta baykuş ikonu ders tamamlamayı %15 artırdı" iddiası birincil kaynaksız
  aggregator sayfalarında → **[doğrulanmadı], kullanma.**
- **Fitbit, ergenler:** 84 ergen 8 hafta Fitbit taktı → psikolojik ihtiyaç doyumu ve **özerk motivasyon anlamlı düştü**,
  motivasyonsuzluk arttı; kısa vadeli motivasyon yarış, suçluluk ve iç baskıdan geldi. [HAKEMLİ] Kerner & Goodyear 2017,
  DOI 10.1080/19325037.2017.1343161

### 6.2 Kalori takibi ve yeme bozukluğu (keel beslenme kaydı tutuyor — doğrudan ilgili)

Hepsi kesitsel; nedensellik kurulamaz.
- Levinson ve ark. 2017: yeme bozukluğu tanılı 105 hastanın ~%75'i MFP kullanıyor; **kullananların %73'ü uygulamanın
  bozukluğa katkısı olduğunu düşünüyor.** [HAKEMLİ] [PubMed 28843591](https://pubmed.ncbi.nlm.nih.gov/28843591/)
- Simpson & Mazzeo 2017: 493 üniversite öğrencisi; kalori takipçisi kullananlarda yeme kaygısı ve diyet kısıtlaması daha
  yüksek (BMI kontrol edildiğinde). [HAKEMLİ] PubMed 28214452
- Linardon & Messer 2019: 122 erkek; MFP kullananlarda daha çok yeme bozukluğu belirtisi; kullananların ~%40'ı katkısı
  olduğunu düşünüyor. [HAKEMLİ] PubMed 30772765
- MacroFactor'ün adherence-neutral gerekçesi aynı literatüre dayanıyor (utanç ve suçluluk daha yüksek kilo ve bozuk yeme
  örüntüleriyle ilişkili; esnek kısıtlama katıdan iyi). [RESMÎ]

### 6.3 Aşırı bildirim

- Fitz ve ark. 2019, Computers in Human Behavior: randomize alan deneyi, n=237. Bildirimleri **günde 3 kez toplu** alanlar
  normal alanlara göre daha dikkatli, üretken, iyi ruh hâlinde ve telefonu üzerinde daha kontrollü hissetti, stresi daha
  düşüktü. **Hiç bildirim almayanlarda kaygı ve FoMO arttı.** [HAKEMLİ] DOI 10.1016/j.chb.2019.07.016
- Pielot & Rello (MobileHCI): 30 kişi, 24 saat bildirimsiz → daha az dikkat dağınıklığı ve daha üretken, ama kaygılı ve kopuk;
  üçte ikisi bildirim yönetimini değiştirmeyi planladı, yarısı 2 yıl sonra hâlâ sürdürüyordu. [HAKEMLİ] DOI 10.1145/3098279.3098526
- Duolingo: aynı şablonu tekrar etmek etkiyi düşürüyor (§2.9). Apple HIG: aynı şey için çoklu bildirim kapatmaya yol açar.
- Frekans/kapatma ve +%3,9 nedensel etki: I1 D2.

### 6.4 Karanlık kalıplar

- Luguri & Strahilevitz 2021, Journal of Legal Analysis: n=1.963 → şüpheli teklifi kabul kontrol %11,3, hafif karanlık kalıp
  %25,8, agresif %41,9; agresif olan olumsuz ruh hâli ve deneyi bırakmayı artırdı (65'e 9), hafif olan tepki doğurmadı.
  n=3.777 → **utandırarak onaylatma (confirmshaming) tek başına %19,6'ya %14,8** (p=.008); engelleme %23,6'ya %16,7; hileli
  soru %19,2 → %33,4. [HAKEMLİ] [JLA](https://academic.oup.com/jla/article/13/1/43/6180579)
- Mathur ve ark. 2019, CSCW: ~11 bin alışveriş sitesinde 15 türde 1.818 karanlık kalıp; 183 site açıkça aldatıcı.
  [HAKEMLİ] [arXiv 1907.07032](https://arxiv.org/abs/1907.07032)
- Noom: otomatik yenileme ve iptal zorluğu nedeniyle Şubat 2022'de 62 milyon $'lık toplu dava uzlaşması; sonrasında
  self-servis iptal. [3.P – Wikipedia](https://en.wikipedia.org/wiki/Noom) (FTC/Click-to-Cancel durumu I1 E3'te.)
- Apple App Review 3.1.2: kullanıcıyı yanlış gerekçeyle aboneliğe kandıran uygulama kaldırılır; abone olmadan önce ne
  alınacağı açıkça söylenmeli. [RESMÎ]
- Cal AI'ın **parayla seri geri satması** (§2.1): etkisi ölçülmemiş; ama tam olarak "kaybı paraya çeviren" bir kalıp
  **[ÇIKARIM]**.

---

## 7 · Dikkat — ekranlar dikkat için nasıl tasarlanıyor

### 7.1 Okuma davranışı ve metin azlığı

| Bulgu | Sayı | Kaynak |
|---|---|---|
| Kullanıcı ortalama sayfada kelimelerin **~%20'sini** okuyor (en fazla %28) | Her +100 kelime yalnız +4,4 sn okuma; 25 kullanıcı, 45.237 sayfa görüntüleme (2008) | [3.P – NN/g] [How little do users read](https://www.nngroup.com/articles/how-little-do-users-read/) |
| Kısa + taranabilir + nesnel yazım | kısa +%58, taranabilir +%47, nesnel +%27, **üçü birlikte +%124** kullanılabilirlik (1997, 51 katılımcı) | [3.P – NN/g] [Concise, scannable, objective](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/) |
| Taranma kalıpları | F, katmanlı kek, benekli, işaretleme (mobilde daha sık), bağlılık; güçlü ipucu yoksa F varsayılan | [3.P – NN/g] [F-pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) |
| Mobilde anlama | 2011: iPhone boyutunda anlama masaüstünün %48'i. 2016 güncellemesi: anlama farkı pratikte yok, ama **zor metin mobilde daha yavaş** okunuyor | [3.P – NN/g] [2011](https://nngroup.com/articles/mobile-content-is-twice-as-difficult-2011) · [2016](https://www.nngroup.com/articles/mobile-content/) |
| İlk iki kelime | Liste öğelerinde kullanıcı çoğunlukla ~2 kelime görüyor; ilk 11 karakterle bağlantıların %35'inin nereye gittiği anlaşılmadı | [3.P – NN/g] [First 2 words](https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/) |
| Sayfada kalma | Kullanıcı web sayfasını çoğunlukla 10-20 sn'de terk ediyor; ilk 10 sn kritik | [3.P – NN/g, Liu/White/Dumais SIGIR 2010'a atıfla] [link](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/) |
| Aktif zaman | ziyaretlerin %55'inde 15 sn'den az aktif zaman (Chartbeat, 2 milyar ziyaret) | [3.P – Time/Chartbeat](https://time.com/12933/what-you-think-you-know-about-the-web-is-wrong/) |
| **Resim + metin** | Metne sıkı bağlı resim, yalnız metne göre sağlık bilgisinde **dikkati ve hatırlamayı belirgin artırıyor**; ilişki ve uzamsal düzen gösterdiğinde anlamayı da. Duygusal tepki davranışı iki yöne de çevirebilir. | [HAKEMLİ] Houts ve ark. 2006, Patient Educ Couns ([PubMed 16122896](https://pubmed.ncbi.nlm.nih.gov/16122896/)) |

Mobil **uygulama** oturum süresi için yeni ölçüm bulunamadı (yukarıdakiler web); H&F oturum verisi I1 C4'te (~12 dk; gün 30'da
0,19 oturum/gün).

### 7.2 Tek ana eylem

- Hick yasası: seçenek arttıkça karar süresi uzar (yönerge, sayı yok). [3.P – NN/g] [Hick's law](https://www.nngroup.com/videos/hicks-law-long-menus/)
- Birincil eylem kendi rengini almalı; aynı renkteki düğmeler eşit önemde algılanır. [3.P – NN/g] [Gestalt similarity](https://www.nngroup.com/articles/gestalt-similarity/)
- Seçenek fazlalığı meta-analizi (Chernev, Böckenholt & Goodman 2015, J Consumer Psych; 99 gözlem, 7.202 katılımcı): etkiyi
  seçenek karmaşıklığı, görev zorluğu, tercih belirsizliği ve karar hedefi belirliyor. [HAKEMLİ]
- A/B: 2 çağrı + çok bağlantıdan tek çağrıya inmek gelir +%19,7, dönüşüm +%10,9 (47 gün, örneklem yok). [3.P – vendor: VWO]
  Karşı örnek: erken bir "teklif al" düğmesini kaldırmak dönüşümü %39 artırdı → tek çağrı **doğru anda** işe yarıyor.
  [3.P – Conversion Rate Experts]

### 7.3 İlerleme görselleştirme

| Bulgu | Sayı | Kaynak |
|---|---|---|
| **Hedef eğimi (goal gradient)** | Kafe kartında ödüle yaklaştıkça alışveriş aralığı %20 kısaldı; 2 bedava damgalı 12'lik kart 12,7 günde, 10'luk kart 15,6 günde doldu (n=108); ödülden sonra hız sıfırlanıp yeniden arttı | [HAKEMLİ] [Kivetz, Urminsky & Zheng 2006](https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf) |
| **Bağışlanmış ilerleme (endowed progress)** | Yapay ilerleme verilen grup daha çok sürdürdü (özet); %34'e %19 sayısı yalnız ikincil kaynakta [doğrulanmadı] | [HAKEMLİ] Nunes & Drèze 2006, JCR |
| **İlerleme çubuğu** | 32 randomize deney: sabit hızlı çubuk terki anlamlı azaltmıyor; **baştan hızlı → azaltıyor; baştan yavaş → artırıyor**; küçük teşvikle sabit çubuk terki artırdı | [HAKEMLİ] [Villar, Callegaro & Yang 2013](https://openaccess.city.ac.uk/id/eprint/14427/) |
| Apple Activity rings kuralları | Halkalar **yalnız** Move/Exercise/Stand içindir; başka veri için kopyalanmaz, değiştirilmez; başka halka benzeri öğeler Activity halkalarından **ayırt edilmeli** | [RESMÎ] [HIG Activity rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings) |

### 7.4 Mikro-kutlama, ödül ve haptik

- **Ödül ve içsel motivasyon** — Deci, Koestner & Ryan 1999, Psych Bull, 128 çalışma: katılıma, tamamlamaya ve performansa
  bağlı ödüller serbest seçim motivasyonunu düşürdü (d=−0,40 / −0,36 / −0,28); **olumlu geri bildirim artırdı** (serbest
  seçim davranışı d=+0,33, ilgi d=+0,31). [HAKEMLİ] (PMID 10589297)
- Duolingo seri animasyonu: yeni öğrencide +%1,7 tutunma (§2.1). Asana/Duolingo kutlama animasyonları için başka ölçüm
  bulunamadı.
- **Apple HIG haptik:** haptiği diğer geri bildirimi tamamlamak için kullan; neden-sonuç ilişkisi kurmuyorsa kafa karıştırır;
  ara sıra iyi gelen haptik sık çalınınca yorar; ayrık olaylarda kısa haptik; kapatılabilir olsun. [RESMÎ]
  [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- Dokunmatik klavyede haptik: daha çok metin, daha az hata (laboratuvar); hareketli trende yalnız düzeltme iyileşti ama
  tercih güçlüydü. [HAKEMLİ] Brewster, Chohan & Brown, CHI 2007 ([Glasgow](https://eprints.gla.ac.uk/43793))

### 7.5 Bir bakışta okunan yüzeyler

- Duolingo widget'ı: yalnız seri + bugün yapıldı mı; Duolingo'ya göre "seriyi ve riskte olup olmadığını hatırlatmak bile çok
  değerli" (§2.10). [RESMÎ]
- UbiFit Garden (Consolvo, CHI 2008), Habito (Gouveia, UbiComp 2015), bir bakışta geri bildirim tasarım alanı (Gouveia,
  UbiComp 2016: soyut, eyleme dönük, kontrol alışkanlığı kuran) — **sayılar doğrulanamadı** (kapalı erişim; özetler
  yayıncı tarafından gizlenmiş).

> **[ÇIKARIM]** Ekran sorusu kanıtla iki cümleye iniyor: kullanıcı ~%20 okur ve ilk iki kelimeye bakar → ekranın mesajı **tek
> sayı + iki kelimelik başlık + tek eylem** olmalı, açıklama istenirse açılmalı. Metnin işini yapabildiği yerde **metne bağlı
> görsel** (grafik, karşılaştırma) metni geçer.

---

## Mekanik tablosu

| # | Mekanik | Kim kullanıyor | Ölçülmüş etki | Kanıt |
|---|---|---|---|---|
| 1 | Günlük seri | Duolingo, MFP, Cronometer, Cal AI, Apple (halka ödülü) | Duolingo: seriyi kolaylaştırmak D14 +%3,3, DAU +%1; animasyon +%1,7 | [RESMÎ] A/B, hakemsiz |
| 2 | Haftalık seri | Strava, Hevy, Strong | bulunamadı (salon verisi I1 C-EK) | — |
| 3 | Seri koruması / af (freeze, amulet, vacation, pause) | Duolingo, WW, Apple, Gentler Streak | Duolingo: 2 freeze DAU +%0,38; Weekend Amulet dönüş +%4; freeze churn −%21 (I1) | [RESMÎ] A/B |
| 4 | Paylı hedef (emergency reserve) | — (ürünlerde adıyla yok) | Hedef günü %40'a kadar, adım %20'ye kadar fazla | [HAKEMLİ] alan deneyi |
| 5 | Geriye kayıtla seri onarımı | Strava, Hevy, MFP (Cronometer bilerek yok) | bulunamadı | — |
| 6 | Parayla seri geri alma | Cal AI (0,99 $) | bulunamadı | — |
| 7 | Seri iddiası (wager) | Duolingo | D7 +%14 | [RESMÎ] A/B |
| 8 | Haftalık check-in / koçluk modülü | MacroFactor | bulunamadı | — |
| 9 | Haftalık / aylık özet | MFP (pazar), Hevy (aylık), Gentler | e-posta (genel program): o hafta aktif olma +3 yp; hedef dışı e-posta etkisiz | [HAKEMLİ] Agachi 2023 |
| 10 | İlerleme skoru / harita | Fitbod, Apple, WW | Fitbod "2×" / "%25"; Apple Ocak verisi | [RESMÎ] korelasyonel |
| 11 | Kilo projeksiyonu (her gün) | MFP (5 hafta), Lose It (hedef tarihi) | bulunamadı | — |
| 12 | PR kutlaması | Hevy, Strava | bulunamadı | — |
| 13 | Rozet / başarı | Lose It, Apple, Strava | takas hizmetinde aktivite arttı (fitness değil) | [HAKEMLİ] Hamari 2017 |
| 14 | Oyunlaştırma paketi (puan, seviye) | Liftoff, Noom, BetterMe | g=0,42 → bitince g=0,15 | [HAKEMLİ] meta-analiz |
| 15 | Yarış + kayıp çerçeveli puan | Liftoff (rütbe), Duolingo (lig) | STEP UP: +920 adım, oyundan sonra +569 kaldı; Duolingo lig: süre +%17 | [HAKEMLİ] RCT · [3.P] |
| 16 | Kendi seçtiği, hemen başlayan hedef | — | +1.384 adım, 8 hafta sonra sürdü; atanan/kademeli hedef etkisiz | [HAKEMLİ] ENGAGE RCT |
| 17 | Sıklık ödülü (hız değil) | Strava Local Legends | bulunamadı | — |
| 18 | Evcil hayvan / karakter | Finch, Duolingo (Duo) | Finch D1/D7 %54/%37 (Sensor Tower tahmini) | [3.P] korelasyonel |
| 19 | Takip / takım / kudos | Hevy, Ladder, Strava | kurucu beyanı; kulüp +%10; kudos ↔ sıklık | [3.P] · [HAKEMLİ] gözlemsel |
| 20 | Bugünün planı | Ladder, Runna, Fitbod | bulunamadı | — |
| 21 | Kişiye göre zamanlanan hatırlatma | MFP (2025) [doğrulanmadı] | +1,78 kayıt/gün; sabit saat anlamsız | [HAKEMLİ] RCT n=30 |
| 22 | Yenilik döngülü bildirim şablonu | Duolingo | yeni kullanıcı D1 +%2,2, D7 +%2,0 | [HAKEMLİ] KDD 2020 |
| 23 | Toplu (batched) bildirim | iOS Scheduled Summary | iyi oluş ↑, stres ↓; hiç bildirim yok → kaygı ↑ | [HAKEMLİ] RCT n=237 |
| 24 | Minimal widget (seri + bugün) | Duolingo, Cronometer, WW, MFP | Duolingo: "çok daha iyi tutunma" | [RESMÎ] korelasyonel |
| 25 | Live Activity | Strong (dinlenme sayacı) | +%23,7 D30 (uygulama düzeyi) | [3.P – vendor] korelasyonel |
| 26 | Fotoğrafla kayıt | Cal AI, MFP, Lose It, MacroFactor | "çok zor" %60 → %22; Snap It +6,1 kayıt günü; unutmayı çözmüyor; kaloriyi düşük tahmin | [HAKEMLİ] |
| 27 | Sesle kayıt | MFP, Lose It | pilot: 1,7× kayıt (SnappyMeal %0 ile çelişir) | [HAKEMLİ] pilot |
| 28 | Öğün hafızası / tekrar | MFP, MacroFactor | tekrar yiyen %5,9'a %4,3 kilo | [HAKEMLİ] korelasyonel |
| 29 | Önceki seti doldurma | Hevy, Strong | bulunamadı | — |
| 30 | Plan yeniden hizalama (kopuş sonrası) | Runna | bulunamadı | — |
| 31 | Veri kalitesi beklemesi ("holding") | MacroFactor | bulunamadı | — |
| 32 | Geri dönüşü ödüllendirme | — (ürünlerde adıyla yok) | +%27 salon ziyareti (en iyi müdahale); bitince çoğu etki sönüyor | [HAKEMLİ] megastudy |
| 33 | Uykudaki ödeyene yeniden etkinleştirme mesajı | Calm (test) | iptal **arttı** | [3.P] |
| 34 | Adherence-neutral görsel dil (kırmızı yok, iyi/kötü yiyecek yok) | MacroFactor | bulunamadı (gerekçe literatüre dayalı) | [RESMÎ] |
| 35 | Suçluluk / sorumluluk yükleyen mesaj | Duolingo (popüler kültür) | sorumluluk yükleyen g=0,08; çıkış yolu olmayan g=−0,20 | [HAKEMLİ] meta-analiz |

---

## Bizim için çıkarım

Hepsi **[ÇIKARIM]**. Ekran değil, kanıttan çıkan yön.

1. **Birim hafta, ama "acil durum payı" olarak anlatılan af.** U7'nin haftalık + 1 hafta aflı tutarlılığı sektörün yöneldiği yer
   ve en sağlam üç kanıtla uyumlu (salon verisi, Duolingo A/B'leri, Sharif & Shu). Sharif & Shu'dan çıkan ek ders: affın
   etkisi, **bir "pay" olarak görünmesinden** geliyor — kullanıcı onu harcamamaya çalışıyor ama harcadığında "bitti" demiyor.
   Gösterim "12 haftanın 11'i" ile birlikte "1 hafta payın duruyor" bilgisini taşıyabilir.
2. **Geriye kayıt, telafi değil düzeltmedir.** Strava ve Hevy, kaydı sonradan girileni seriye sayıyor; bu "fazladan antrenman
   yap" değil, "yaptığını kaydet". U7'nin telafi yasağıyla çelişmiyor gibi görünüyor ama ADR'de açıkça yazılmalı (aşağıda).
3. **Dönüş anı birinci sınıf akış olmalı.** Ölçülmüş en güçlü tek müdahale dönüşü olumlu karşılamak; Runna'nın kademeli
   seçenekleri ve MacroFactor'ün "neden bekliyorum, ne zaman devam ederim" açıklaması suçlamasız örnekler. Pazartesi hem
   check-in hem "yeni başlangıç" günü (+%33,4) — iki kanıt aynı güne düşüyor. Ama öncelik **tutmak**: Duolingo'da mevcut
   kullanıcıyı tutmak 5× daha etkili.
4. **İlk hafta: kalibrasyon + gerçek küçük olay + tek değişiklik.** Rakiplerin hiçbiri ilk haftada trendden karar vermiyor;
   "öğreniyorum" durumunu görünür kılıyor (Runna, Oura, MacroFactor) ve gerçek olayı kutluyor (Hevy PR). keel'in 1. hafta anı,
   trend yerine davranış verisinden (kaç gün kayıt, kaç antrenman, hangi saat tuttu) çıkan **tek** plan ayarı olabilir. İlk
   haftada ≥4 gün kayıt ile sonraki başarı arasındaki ilişki (MFP 7×, korelasyonel) bu sayının günlük sayı adayı olduğunu
   destekliyor.
5. **Kayıt ekranının işi: kısa, sık, tekrar eden.** Başarıyı ayıran dönüş sıklığı (Harvey), süre değil. Öğün hafızası (aynı
   yiyecekler en başarılılarda en sık), "yaklaşık gir" yolu (%40'ın atladığı "zor" yiyecek için) ve önceki seti gösterme bu
   işi yapan kalıplar. Fotoğraf sürtünmeyi azaltır ama unutmayı çözmez; unutmayı kişinin kendi saatine göre tek hatırlatma
   çözer (sabit saat çözmüyor).
6. **Ekran: ~%20 okunur.** Her ekranın ana mesajı ilk iki kelimede ve tek sayıda olmalı; gerekçe (U3) bir dokunuşla açılan
   katmanda. Metne bağlı görsel (önceki hafta / bu hafta karşılaştırması gibi) metni geçer. Tek birincil eylem, kendi renginde.
7. **İlerleme göstergesi baştan hızlı ilerlemeli** (Villar: baştan yavaş çubuk terki artırıyor). Ama "yapay ilerleme" (bedava
   damga) dürüstlük sorunu doğurur; keel'de baştan gerçek ilerleme kaynağı onboarding'de tamamlanan adımlar ve içe aktarılan
   geçmiş olabilir. **Apple'ın halka görünümü taklit edilmemeli** — HIG başka halka benzeri öğelerin Activity halkalarından
   ayırt edilmesini istiyor.
8. **Kutlama: bilgi veren olumlu geri bildirim, somut ödül değil** (Deci: performansa bağlı ödül motivasyonu düşürüyor,
   olumlu geri bildirim artırıyor). Haptik yalnız ayrık olaylarda (PR, hafta tamam), kapatılabilir.
9. **Bildirim: az, yenilenen, dürüst aciliyetli.** Şablonlar dönmeli (Duolingo: tekrar eden şablon sönüyor); aciliyet
   düzeyi çoğunlukla Passive/Active; uykudaki ödeyen kullanıcıya jenerik "seni özledik" gönderilmemeli (Calm). Hiç bildirim
   göndermemek de bir seçenek değil (Fitz: kaygı).
10. **Widget, Live Activity'den önce gelir.** Duolingo'nun widget'ı yalnız iki bilgi gösteriyor; keel karşılığı "bu hafta
    X/Y + bugünün tek eylemi" olabilir. Live Activity yalnız başı-sonu belli işler için (antrenman oturumu, dinlenme
    sayacı) — haftalık karar için değil (HIG ≤8 saat).
11. **Beslenme tarafında görsel dil adherence-neutral olmalı.** Kırmızı sayı, iyi/kötü yiyecek etiketi, aşım uyarısı yok —
    yeme bozukluğu literatürü (MFP kullanan hastaların %73'ü) ve U7 aynı yönü gösteriyor.
12. **Sosyal kaldıraç güçlü ama R4'ün işi.** STEP UP'ta en kalıcı kol yarıştı; Ladder ve Hevy kurucuları sosyal bağı ana
    tutundurucu sayıyor. Bu dosya bunu yalnız işaretliyor.

---

## Anayasayla gerilim (ADR adayı)

Karar verilmedi; yalnız listelendi. "Kanıt gücü": güçlü = RCT/büyük alan deneyi, orta = şirket A/B'si ya da küçük deney,
zayıf = korelasyonel/vendor/tek kaynak.

| Kural | Çelişen ya da zorlayan kanıt | Kanıt gücü | Not |
|---|---|---|---|
| **U7 — günlük sıfırlanan streak yok** | Duolingo'nun günlük serisi A/B'lerle ölçülmüş tutunma artışları gösteriyor (D14 +%3,3, wager D7 +%14). | orta (resmî A/B, hakemsiz; dil öğrenme, günlük alışkanlık alanı) | Duolingo'nun kazanımları da seriyi **kolaylaştırarak** ve koruma ekleyerek geldi; antrenman uygulamaları haftalığa geçmiş. Gerilim zayıf, kural lehine kanıt daha çok. |
| **U7 — telafi mekaniği yok** | (a) Megastudy'nin en iyi müdahalesi: kaçırılan antrenmandan sonra **geri gelene ödül** (+%27). (b) Peng 2023: telafi edici davranış öneren mesaj g=0,22, önermeyen g=−0,20. (c) Strava/Hevy/MFP geriye kayıtla seriyi onarıyor; Duolingo geri yükleme etkinliği; Cal AI parayla geri alma. | (a) güçlü (n=61.293), ama etkisi müdahale bitince sönüyor · (b) zayıf (k=3) · (c) etki bulunamadı | "Telafi"nin tanımı net değil: *dönüşü ödüllendirmek*, *geriye kaydı saymak* ve *eksik antrenmanı fazlasıyla ödetmek* üç farklı şey. İlk ikisi kanıtla destekleniyor; üçüncüsüne kanıt bulunamadı. ADR sorusu: U7 hangisini yasaklıyor? |
| **U7 — 1 hafta af (bedelsiz)** | Sharif & Shu: paylı hedefin etkisi payın **küçük bir bedeli** olmasından geliyor (insanlar harcamamaya çalışıyor). | orta (hakemli alan deneyi, >240 kişi, 5 hafta) | Bedel para ya da ceza değil; psikolojik ("payını kullandın") olabilir. U7 ile çelişmesi şart değil; affın *nasıl gösterildiği* sorusu. |
| **U7 — suçlama yok** | STEP UP'ın en etkili ve tek kalıcı kolu (yarış) **kayıp çerçeveli** puanla çalıştı (her kaçırılan gün −10 puan, seviye düşme). Kerner 2017: kısa vadeli motivasyon suçluluk ve iç baskıdan geldi. Xu & Guo 2018: suçluluk çağrısı tutum/niyette r=0,49. | orta-güçlü (RCT n=602) · Kerner zayıf · Xu & Guo orta (niyet, davranış değil) | Kayıp çerçevesi suçlama ile aynı şey değil; ama "puan silinir" mekaniği U7'nin ruhuna yakın düşüyor. Karşı kanıt da güçlü: sorumluluk yükleyen mesaj g=0,08; Kerner'de özerk motivasyon düştü; yeme bozukluğu literatürü. |
| **U8 — ilk 14 gün trend yorumu yok** ↔ **U15 — 1. haftada "plan değişti" anı** | Dış kanıt U8'i destekliyor: Runna net eğilim bekliyor, Oura 2 hafta, WHOOP 4 gün gri, MacroFactor 3-4 hafta. Ama U15'in 1. hafta anı ile U8'in "ilk karar en erken ilk pazartesi check-in" kuralı arasında **iç gerilim** var. | — (anayasanın kendi içinde) | Kanıt bir çözüm yönü gösteriyor (davranış verisinden karar, trendden değil) ama karar Levent'in. |
| **U9 — haftalık soru bütçesi ≤2** | Kişiye göre zamanlanan hatırlatma kayıt sayısını artırdı (Lee 2024); hedefle uyumlu e-posta etkinliği artırdı (Agachi 2023). | orta (küçük RCT) · güçlü (n=22.797, gözlemsel) | Bunlar soru değil hatırlatma. Gerilim değil, **tanım boşluğu**: hatırlatma/özet soru bütçesine sayılıyor mu? |
| **U10 — karakter, maskot, "AI arkadaşın" yok** | Finch D1/D7 %54/%37 (H&F D1 %26,8'e karşı); Duolingo widget'ını Duo'nun kişiliği üzerine kurdu ve widget kullananların "çok daha iyi" tutunduğunu söylüyor. | zayıf (Sensor Tower tahmini, farklı kategori, korelasyonel) | Maskotun nedensel etkisini gösteren kanıt bulunamadı; sanal hayvan + fiziksel aktivite üzerine hakemli çalışma yok. |
| **U12 — projeksiyon ilk 4 hafta / 2 ölçüm yok, varsayılan kapalı** | MFP her gün 5 haftalık kilo tahmini gösteriyor ("motivasyon amaçlı"); Lose It hedef tarihini seriden hesaplıyor. | yok (yalnız uygulama; etki bulunamadı) | Rakip pratiği kuralı zorluyor ama etki kanıtı yok. MFP/Lose It'in tek tarihli tahmini U5 ile de çelişir — yalnız not. |
| **U15 — günlük sayı: tutarlılık** | Destekleyen: Harvey 2019 (giriş sıklığı), Patel 2020 (≥6/7 gün), MFP (ilk hafta ≥4 gün). Zorlayan: 05 §2'nin "her gün izlenecek sayı" önerisi (Whoop, Oura, Apple) ile U7'nin haftalık birimi arasında: günlük sayı günlük seriye dönüşebilir. | destek orta (korelasyonel ama tutarlı) | Gerilim içsel: günlük sayının sıfırlanmayan, haftaya yayılan biçimde gösterilmesi gerekiyor. |
| U1-U3 (yalnız not) | Runna tempo önerisini kullanıcı onaylamadan uygulamıyor. keel'de motor karar veriyor. | — | Çelişki değil; kabul adımı U2'yi etkilemez. |
| U4, U6 (yalnız not) | Yeme bozukluğu literatürü (Levinson, Simpson & Mazzeo, Linardon & Messer) U4 ve U6'yı **güçlendiriyor**. WW "Weight Health Score" gibi skorlar keel'de U6 açısından dikkat ister. | — | — |
| Platform (anayasa değil) | Apple HIG: halka benzeri öğeler Activity halkalarından ayırt edilmeli; Live Activity ≤8 saatlik işler; pazarlama bildirimi açık onay ister (4.5.4). | [RESMÎ] | Tasarım kısıtı olarak R2/prototipte gözetilmeli. |

---

## Bulunamayanlar

- Kategori düzeyinde H&F **D7** (birincil kaynak); H&F D30 için birincil kaynakta ilk çeyrek; ülke düzeyinde (US/UK/AU/CA) H&F
  tutunması. Adjust sayfaları 429/bot kontrolü döndü, AppsFlyer verisi dinamik yükleniyor, Business of Apps 403.
- RevenueCat 2026'da H&F'ye özel: 1. ay yıllık iptal payı, aylık plan ilk yenilemesi, yıllık/aylık 12 ay tutunması, iade
  oranı; H&F'de sert paywall / freemium ayrımı.
- Rakiplerin **hiçbirinde** tek bir mekaniğin (seri, rozet, haftalık özet, check-in, widget, hatırlatma) şirketçe yayımlanmış
  A/B sonucu — Duolingo dışında. Braze/OneSignal/Airship/Amplitude vaka çalışması bu 14+ uygulama için bulunamadı.
- MacroFactor'ün tutunma/churn sayısı (yıllık raporlarda yok); Liftoff rütbe formülü ve tutunması; Runna haftalık özeti,
  serisi ve tutunma verisi; Hevy tutunma sayısı; Ladder seri/rozet olup olmadığı (resmî sayfa söylemiyor, bir inceleme var
  diyor — çelişki).
- Finch'in resmî "ceza yok" ifadesi ve kendi tutunma verisi; sanal hayvan × fiziksel aktivite hakemli çalışması.
- Duolingo'nun suçlayıcı/pasif-agresif bildirimlerinin A/B sonucu ve kapatma oranı; "hasta baykuş %15" iddiasının kaynağı.
- Fresh start mesajının RCT'si (2014 çalışması arşiv verisi); Duolingo "reactivated/resurrected" tutunma sayıları.
- Fotoğraf, barkod ve veritabanı aramasını **saniye cinsinden** karşılaştıran hakemli çalışma; önceden doldurma / "dünü
  kopyala" varsayılanının etkisini ölçen kontrollü çalışma; Apple Health'ten otomatik veri alımının kayıt bağlılığına etkisi.
- UbiFit Garden ve Habito'nun sayıları (kapalı erişim); Apple'ın halka tasarım gerekçesi üzerine WWDC/röportaj (yalnız arama
  özeti).
- Bildirim hacmi → kaldırma (uninstall) ilişkisinin güncel vendor verisi; sağlık/fitness uygulamalarına özgü karanlık kalıp
  çalışması.
- Mobil **uygulama** (web değil) için güncel okuma/oturum süresi ölçümü.
- WHOOP Weekly Performance Assessment ve Oura haftalık raporu (sayfalar 403).

---

## Kaynaklar

Tümü 2026-10-07'de erişildi.

**Kıyaslar**
- RevenueCat, State of Subscription Apps 2026 — H&F: https://www.revenuecat.com/state-of-subscription-apps-2026-health-and-fitness · insights part 2: https://www.revenuecat.com/sosa-2026-insights-part-2
- RevenueCat, State of Subscription Apps 2025: https://revenuecat.com/state-of-subscription-apps-2025
- Adapty, State of In-App Subscriptions 2026: https://adapty.io/state-of-in-app-subscriptions/ · H&F benchmarks: https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
- RocketShip HQ (Adjust 2026 aktarımı): https://www.rocketshiphq.com/?p=5401
- UXCam retention benchmarks: https://uxcam.com/blog/mobile-app-retention-benchmarks/
- Sensor Tower, State of Mobile Health & Fitness 2025: https://sensortower.com/blog/state-of-mobile-health-and-fitness-in-2025 · AI & H&F 2026: https://sensortower.com/blog/health-and-fitness-apps-ai

**Duolingo**
- Improving the streak (2020): https://blog.duolingo.com/improving-the-streak
- How the Duolingo streak builds habit (2022): https://blog.duolingo.com/how-duolingo-streak-builds-habit
- How streaks keep learners committed (2017): https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals
- Widget feature (2023): https://blog.duolingo.com/widget-feature
- Friend streak (2024): https://blog.duolingo.com/product-lessons-friend-streak/ (en az bir friend streak'i olan öğrencinin günlük dersi tamamlama olasılığı +%22 — korelasyonel)
- Yancey & Settles, KDD 2020: https://research.duolingo.com/papers/yancey.kdd20.pdf
- Mazal, Lenny's Newsletter: https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth

**Rakip resmî sayfaları**
- Strava streaks: https://support.strava.com/hc/en-us/articles/36553427481997-Streaks-on-Strava · Local Legends: https://support.strava.com/hc/articles/360043099552-Local-Legends
- Hevy: https://www.hevyapp.com/features/gym-consistency/ · https://www.hevyapp.com/features/live-pr/ · https://www.hevyapp.com/features/monthly-report/ · https://www.hevyapp.com/features/track-exercises/
- Runna: https://support.runna.com/en/articles/10026375-how-to-use-the-plan-realignment-feature · https://support.runna.com/en/articles/15012850-how-and-when-to-skip-a-run-managing-missed-sessions-in-your-training-plan · https://support.runna.com/en/articles/14656203-what-are-pace-insights-and-how-do-they-work
- MacroFactor: https://macrofactor.com/adherence-neutral/ · https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules · https://help.macrofactorapp.com/en/articles/251-coaching-module-logging-break · https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low · https://macrofactor.com/fastest-food-logger-2025/ · https://macrofactor.com/fastest-food-logger/ · https://macrofactor.com/annual-report-2024/ · https://macrofactor.com/annual-report-2025/
- MyFitnessPal destek: https://support.myfitnesspal.com/hc/en-us/articles/360032624931 · /360032622591 · /360032624131 · /360032622391
- Cronometer destek: https://support.cronometer.com/hc/en-us/articles/16510105155988 · /360051718511 · /4407693442324
- Lose It destek: https://loseit.zendesk.com/hc/en-us/articles/51382148864532 · /47773224342548
- Fitbod: https://fitbod.me/blog/fitbod-insights-feature/ · https://fitbod.me/blog/fitbod-algorithm
- Ladder: https://www.joinladder.com/llms.txt · basın bülteni: https://www.silicon.co.uk/press-release/ladder-secures-over-100-million-in-new-funding-to-scale-1-strength-training-app
- Apple: halka duraklatma https://support.apple.com/en-me/guide/watch/apd9c3cfe913/watchos · Newsroom Ocak 2026 https://www.apple.com/li/newsroom/2026/01/apple-watch-keeps-users-active-and-motivated-in-2026/
- Oura: https://support.ouraring.com/hc/en-us/articles/360057791533
- Gentler Streak: https://gentlerstories.com/gentlerstreak/
- WeightWatchers widget: https://www.weightwatchers.com/us/blog/weightwatchers-mobile-widget
- App Store sayfaları: Cal AI https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 · WW https://apps.apple.com/us/app/weightwatchers-program/id331308914 · Lose It https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629 · Liftoff https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563 · Finch https://apps.apple.com/us/app/finch-self-care-pet/id1528595748 · Strong https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 · Runna https://apps.apple.com/us/app/runna-running-training-plans/id1594204443 · WHOOP https://apps.apple.com/us/app/whoop/id933944389

**Apple platform yönergeleri [RESMÎ]**
- HIG Notifications / Managing notifications / Playing haptics / Widgets / Live Activities / Activity rings: https://developer.apple.com/design/human-interface-guidelines/ (sayfalar JSON kaynağından okundu: `developer.apple.com/tutorials/data/design/human-interface-guidelines/<sayfa>.json`)
- App Review Guidelines (3.1.2, 4.5.4): https://developer.apple.com/app-store/review/guidelines/

**Üçüncü taraf**
- Deconstructor of Fun (Finch): https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl
- OneSignal 2024 basın bülteni: https://www.silicon.co.uk/press-release/onesignal-releases-2024-state-of-customer-engagement-report-revealing-key-omnichannel-considerations-and-opportunities
- RevenueCat Sub Club (Hevy): https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast
- BetterLaunch (Ladder): https://www.betterlaunch.co/playbooks/episodes/greg-stewart-ladder-tiktok
- VentureRadar (Liftoff): https://ventureradar.substack.com/p/this-gym-app-built-by-college-students
- Stickybottle (Strava): https://www.stickybottle.com/coaching/strava-reveals-quitters-day-date-most-new-years-resolutions-abandoned-90627 · endurance.biz: https://endurance.biz/2021/industry-news/by-the-numbers-strava-year-in-sport-2021-report/
- Vox Radboud (kudos): https://www.voxweb.nl/en/what-kudos-can-do-for-your-motivation-and-sports-pleasure
- Athletech News (MFP): https://athletechnews.com/nutrition-tracking-boosts-weight-loss-myfitnesspal-finds/
- Nutritional Outlook (AI kalori doğruluğu): https://www.nutritionaloutlook.com/view/study-finds-popular-ai-calorie-tracking-apps-underestimate-meal-energy-by-about-a-third
- Hightouch Lifecycle Leaders (Calm): https://lifecycle-leaders.hightouch.com/p/the-one-audience-you-actually-shouldn-t-re-engage
- The Clip Out (Peloton): https://theclipout.com/peloton-introduces-the-rebuild-program-with-ally-love/
- TapSmart (Gentler Streak): https://www.tapsmart.com/features/deep-dive-gentler-streak/?amp=1
- Wikipedia (Noom): https://en.wikipedia.org/wiki/Noom
- NN/g: https://www.nngroup.com/articles/how-little-do-users-read/ · https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/ · https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/ · https://nngroup.com/articles/mobile-content-is-twice-as-difficult-2011 · https://www.nngroup.com/articles/mobile-content/ · https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/ · https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/ · https://www.nngroup.com/videos/hicks-law-long-menus/ · https://www.nngroup.com/articles/gestalt-similarity/
- Time/Chartbeat: https://time.com/12933/what-you-think-you-know-about-the-web-is-wrong/
- VWO: https://wingify.com/blog/reducing-choices-landing-page-increased-revenue-19/ · Conversion Rate Experts: https://conversion-rate-experts.com/removing-cta-win-report/
- ScienceDaily (Hagerman 2026): https://sciencedaily.com/releases/2026/03/260330233357.htm · Drexel (Hagerman 2024): https://drexel.edu/news/archive/2024/January/Can-Practicing-Self-Compassion-Help-People-Achieve-Weight-Loss-Goals

**Hakemli**
- Sharif & Shu (emergency reserves): https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Designing-More-Effective-Goals-by-Using-Emergency-Reserves-A-Field-Experiment.pdf · https://anderson-review.ucla.edu/emergency-reserves/
- Milkman ve ark. 2021, Nature: https://doi.org/10.1038/s41586-021-04128-4
- Dai, Milkman & Riis 2014, Management Science: https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf
- Patel ve ark. 2019 (STEP UP), JAMA Intern Med: https://pmc.ncbi.nlm.nih.gov/articles/PMC6735420/
- Patel ve ark. 2021 (ENGAGE), JAMA Cardiol: https://pubmed.ncbi.nlm.nih.gov/34468691/
- Mazeas ve ark. 2022, JMIR: https://pubmed.ncbi.nlm.nih.gov/34982715/
- Hamari 2017, Computers in Human Behavior: https://research.aalto.fi/en/publications/do-badges-increase-user-activity-a-field-experiment-on-the-effect/
- Agachi ve ark. 2023, JMIR mHealth: https://research.rug.nl/en/publications/the-effect-of-periodic-email-prompts-on-participant-engagement-wi/
- Harvey ve ark. 2019, Obesity: https://pubmed.ncbi.nlm.nih.gov/30801989/
- Patel, Brooks & Bennett 2020, J Behav Med: https://pubmed.ncbi.nlm.nih.gov/31396820/
- Cordeiro ve ark. 2015, CHI: https://homes.cs.washington.edu/~jfogarty/publications/chi2015-decaf.pdf
- Ben Neriah & Geliebter 2019, JMIR mHealth: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6592399/
- Lee ve ark. 2024, JMIR mHealth: https://doi.org/10.2196/52074
- Chikwetu ve ark. 2023, JMIR Formative Research: https://doi.org/10.2196/46659
- Hagerman ve ark. 2026, Health Psychology, DOI 10.1037/hea0001591
- Pai & Sabharwal 2022, Sensors: PMC9002488 · Ruf ve ark. 2021, JMIR: DOI 10.2196/25850
- Serrano ve ark. 2016, JMIR: https://pmc.ncbi.nlm.nih.gov/articles/PMC4925935
- Aral & Nicolaides 2017, Nature Communications: DOI 10.1038/ncomms14753
- Peng ve ark. 2023, Frontiers in Psychology: https://pmc.ncbi.nlm.nih.gov/articles/PMC10568480/
- Xu & Guo 2018, Health Communication: https://experts.nau.edu/en/publications/a-meta-analysis-of-the-effectiveness-of-guilt-on-health-related-a/
- Adams & Leary 2007, JSCP: https://scholars.duke.edu/publication/782823
- Thøgersen-Ntoumani ve ark. 2021, Br J Health Psychol: https://research.birmingham.ac.uk/en/publications/does-self-compassion-help-to-deal-with-dietary-lapses-among-overw/
- Kerner & Goodyear 2017: DOI 10.1080/19325037.2017.1343161
- Levinson, Fewell & Brosof 2017, Eating Behaviors: https://pubmed.ncbi.nlm.nih.gov/28843591/ · Simpson & Mazzeo 2017: PMID 28214452 · Linardon & Messer 2019: PMID 30772765
- Fitz ve ark. 2019, Computers in Human Behavior: DOI 10.1016/j.chb.2019.07.016 · Pielot & Rello, MobileHCI: DOI 10.1145/3098279.3098526
- Luguri & Strahilevitz 2021, Journal of Legal Analysis: https://academic.oup.com/jla/article/13/1/43/6180579 · Mathur ve ark. 2019: https://arxiv.org/abs/1907.07032
- Houts ve ark. 2006, Patient Educ Couns: https://pubmed.ncbi.nlm.nih.gov/16122896/
- Kivetz, Urminsky & Zheng 2006, JMR: https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf · Nunes & Drèze 2006, JCR: https://ideas.repec.org/a/oup/jconrs/v32y2006i4p504-512.html
- Villar, Callegaro & Yang 2013, SSCR: https://openaccess.city.ac.uk/id/eprint/14427/
- Chernev, Böckenholt & Goodman 2015, J Consumer Psychology: https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual
- Deci, Koestner & Ryan 1999, Psychological Bulletin: PMID 10589297
- Brewster, Chohan & Brown 2007, CHI: https://eprints.gla.ac.uk/43793
