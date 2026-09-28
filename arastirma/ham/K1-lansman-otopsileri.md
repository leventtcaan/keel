# K1 — Fitness Uygulamaları Lansman Otopsileri

> Araştırma tarihi: 2026-09-11 · Durum: **YAZILIYOR** (araştırma sürüyor, dosya ilerledikçe güncelleniyor)
> Amaç: bootstrap, kitlesiz, iOS-önce bir bilim temelli koçluk uygulaması için hata ve hamle envanteri.
> Kural: doğrulanamayan sayı `[doğrulanmadı]` işaretlenir. Bulunamayan bilgi "bulunamadı" yazılır.

---

# BÖLÜM A — BOOTSTRAP BAŞARILARI (bizim modelimiz)

## A1 · Hevy — 2 kişi, sıfır reklam, "gym için Strava"

**Kurucular:** Guillem Ros (Barselona, CEO) + Desmond McNamee (CTO). İkisi de Berlin'de **8fit**'te
çalışırken tanıştı — yani sektörü içeriden biliyorlardı, sıfırdan başlamadılar. %50/%50 ortaklık,
hiç dış yatırım yok.

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Lansman** | Temmuz 2019 (iOS). Fikirden abonelik lansmanına **~9 ay**. | Sub Club podcast |
| **İlk 1.000** | Kanal yok. **Günde 5-10 indirme**, temel ASO ile — rakiplerle *aynı* keyword'leri hedefleyerek. Yavaş, organik, sıkıcı sürünme. Founder'ın kendi ifadesi: erken dönemde ASO'yu neredeyse hiç yapmadılar. | Sub Club, RevenueCat |
| **İlk 10.000** | Ürün kalitesi + App Store/Google Play algoritması + ağızdan ağıza. Apple'dan **feature** aldılar (2020 başı) ama COVID kapanması momentumu kesti — spor salonları kapandı. | Sub Club |
| **Kırılma anı** | Uygulama içinde **kendiliğinden topluluklar oluşmaya başladığında**. Guillem: *"little communities were forming on the app of people that we had no idea who they were."* Bu, arkadaş-aile çevresinin ötesinde gerçek PMF sinyaliydi. | Sub Club |
| **Lansmandaki ürün** | Üç sütun: **tracking + analytics + social**. Sosyal en baştan vardı, sonradan eklenmedi. 2018 tasarımlarının çoğu bugün hâlâ yapılmadı — acımasız MVP kesimi. | Sub Club |
| **Fiyat** | $3/ay · $24/yıl · $75 lifetime — rakiplerin **~%50 altında**. Bilinçli: *"people are more likely to tell their friends if it's an absolute steal."* Müşteriler daha fazla ödemeye razı olduğu hâlde fiyat yükseltmediler. | Sub Club |
| **Fiyat değişikliği** | Kaçındılar. Gerekçe: *"If we're constantly experimenting with pricing... user trust... starts eroding."* Sosyal ağ dinamiği fiyat istikrarı gerektiriyor. | Sub Club |
| **Reklam harcaması** | **Toplam ömür boyu $15K'dan az.** | RevenueCat + Sub Club |
| **Ekip** | Başta 2 kişi. İlk işe alım ~2,5 yıl sonra. Bugün ~10 kişi (bazı kaynaklarda 13). | Sub Club, Latka |
| **Runway** | İşsizlik maaşı + ailesiyle yaşamak. Ramen-kârlılığa **~1,5 yıl**. | Sub Club |

**Büyüme eğrisi (doğrulanmış milestone'lar):**
| Tarih | Kullanıcı / Gelir |
| --- | --- |
| Tem 2019 | Lansman, günde 5-10 indirme |
| Ara 2021 | 1 milyon kullanıcı (3 yıl) |
| May 2023 | 2 milyon kullanıcı (+1M, sadece 5 ay) |
| 2023 | $240K ARR (Latka) — *bu rakam ARR mi net gelir mi tartışmalı, Latka verisi* `[kısmen doğrulanmadı]` |
| 2022 iddiası | 1,5M kullanıcı, "toplam gelir $2M" (Ottawa Business Journal) — Latka'nın $240K'sı ile **çelişiyor** `[doğrulanmadı]` |
| ~2026 | ~$600K/ay iddiası `[doğrulanmadı — birincil kaynak bulunamadı]` |

**"Uygulama içi sosyal özellikler" tam olarak ne demek?**
1. **Feed** — arkadaşlarının antrenmanlarını görmek, beğenmek, yorum yapmak.
2. **Takip/takipçi grafiği** (Strava modeli, arkadaşlık değil).
3. **Kullanıcı öneri algoritması** — aktif topluluk üyelerini yüzeye çıkarıyor. Organik keşif motoru bu.
4. **Family plan** — en yüksek retention'a sahip segment, grup hesap verebilirliği sayesinde.

**Mekanizma:** Çift kilit. Kullanıcı hem **veri** yatırıyor (antrenman geçmişi) hem **ilişki**
yatırıyor (takipçiler). Tek başına veri kilidi zayıf — export edilebilir. İlişki kilidi taşınamaz.

**İtiraf edilen hatalar:**
1. **Feature bloat riski** — 2018'de tasarlanan özelliklerin çoğu hâlâ yapılmadı; MVP'yi acımasızca kesmek doğru karardı.
2. **Fiyat esnekliği yok** — sosyal ağ kurunca fiyat deneyi yapamıyorsun, güven eriyor. Fiyatı **baştan doğru koymak** zorundasın.
3. **İşe alım tereddüdü** — ekip büyütmeye direndiler; büyütünce hırsın gerçekleşebildiğini gördüler. Kurucu sürtüşmesi de ("ürün mü teknik mi" tartışması) ekip büyüyünce çözüldü.

**Bizim için ders:** Hevy sıfır kitleyle başladı ve **3 yıl** sürdü ilk milyona. Hızlı değil.
Fark yaratan: sosyal katman gün 1'den itibaren vardı ve fiyat rakiplerin yarısıydı.

Kaynaklar:
- https://subclub.com/episode/cultivating-organic-growth-with-viral-loops-guillem-ros-salvador-hevy
- https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast
- https://getlatka.com/companies/hevyapp.com
- https://obj.ca/fitness-app-entrepreneur-pumped-by-hevys-progress-to-2m-in-annual-revenue/
- https://www.hevyapp.com/about-us/

---

## A2 · MacroFactor — hazır kitlenin üstüne kurulan app (Stronger by Science)

**Kurucular:** Greg Nuckols (içerik/bilim), Eric Trexler (SBS ortağı, PhD), **Cory Davis** (yazılımcı —
uygulamayı yapan asıl kişi), Rebecca Kekelishvili (geliştirici), Lyndsey Nuckols (dijital pazarlama).

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Lansman** | 2021. | macrofactor.com, FeastGood |
| **Kökeni** | Uygulama önce **Greg'in kendi Excel tablosuydu**. Geliştirici Cory Davis tabloyu gördü, "bunu app yapalım" diye Greg'e gitti. Yani ürün fikri kullanıcı-tarafından değil, **var olan bir çözümün ürünleştirilmesi**. | FeastGood |
| **İlk 1.000** | Stronger by Science'ın mevcut mail listesi + blog + podcast kitlesi. Greg'in yıllardır kurduğu güven. **Somut sayı bulunamadı** — SBS'in liste boyutunu açıklayan birincil kaynak yok. `[doğrulanmadı]` | — |
| **İlk 10.000** | Aynı kanal + Jeff Nippard gibi büyük fitness YouTuber'larının desteği/önerisi. | Arvo, çeşitli review |
| **Bugün** | *"We're closing in on 75,000 paying subscribers"* ve *"adding about 6-7000 net new subscribers per month"* (Greg Nuckols, FeastGood röportajı). | FeastGood |
| **Fiyat** | $11,99/ay · $71,99/yıl (~$6/ay). Bazı kaynaklar $5,99 alt planı gösteriyor (2026 çok-katmanlı yapı). | Arvo, nutriscan |
| **Free tier** | **Hiç olmadı ve olmayacak.** Sadece 7 günlük tam-erişim deneme. Gerekçe (şirketin açık pozisyonu): free tier ya ürün kalitesini düşürür ya reklam gerektirir; reklamsız + doğrulanmış gıda veritabanı + gizlilik için herkesten adil ücret almayı seçtiler. Gelir tamamen abonelerden → teşvikler kullanıcıyla hizalı. | macrofactor.com pozisyonu, review'lar |

**Kritik nokta — "hazır kitle" ne kadar avantaj sağladı?**
Sayısal olarak izole edilemiyor (kimse "X abonesinin Y'si SBS'ten geldi" demedi). Ama yapısal avantaj net:
- **Sıfır CAC ile bir launch günü.** Kategorinin CPI'ı $4,30-5,50; SBS listesi bunu bypass etti.
- **Free tier'ı hiç kurmama lüksü** — kitlesi *ödeme yapmaya alışmış* bir kitleydi (SBS zaten ücretli
  ürünler satıyordu). Kitlesi olmayan biri aynı kararı verirse indirme akışı hiç başlamaz.
- **Otorite transferi** — "bilim temelli" iddiası Greg'in yıllardır yazdığı literatür review'larıyla
  zaten kanıtlıydı. Uygulamanın kendisi bu iddiayı kanıtlamak zorunda kalmadı.

**Bizim için ders (acı olan):** MacroFactor **bizim modelimiz değil**, bizim *hedefimiz*.
Bu vaka "önce kitle, sonra ürün" sırasının işlediğini kanıtlıyor. Kitle olmadan free-tier-yok
kararını kopyalamak intihar. Sıra: içerik → güven → ürün.

Kaynaklar:
- https://feastgood.com/macrofactor-brand-story/
- https://macrofactor.com/team/
- https://arvo.guru/vs/macrofactor

---

## A3 · Cal AI — 17 yaşındaki iki lise öğrencisi, 18 ayda $50M ARR

**Kurucular:** Zach Yadegari + Henry Langmack. Lansmanda 17 yaşındaydılar. Bootstrap.

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Lansman** | ~Mayıs/Haziran 2024. | TechCrunch, Inc |
| **Ürün** | Fotoğrafla kalori sayma. Tek özellik, tek vaat. Basit. | — |
| **İlk kullanıcılar** | **Fitness influencer'larına UGC yaptırma.** Sistematik olarak TikTok creator'larına ulaştılar, "native görünümlü" (reklam gibi durmayan) videolar çektirdiler. Bu tek hamle uygulamayı **aylık $2M gelire** taşıdı. | profitablefounder, çeşitli |
| **Ölçekleme** | 1) fitness influencer UGC → 2) geniş creator havuzu → 3) **MrBeast sponsorluğu ($500K)** → 4) kendi içinde paid ads (TikTok/IG/FB) → 5) Tribe üzerinden affiliate programı. | profitablefounder |
| **Reklam yapısı** | Bir ölçekleme kampanyası (CBO) + bir test kampanyası. **İlgi alanı hedeflemesi yok, lookalike yok.** Yaratıcı: spor salonunda biri, müzik, hızlı bir yemek taraması. Satın alma değil **trial-start** için optimize (Apple gizlilik kısıtı). Her reklam için ayrı **Custom Product Page** (atıf takibi). | profitablefounder |
| **Gelir** | TechCrunch: **$30M** yıllık gelir. Inc: son 12 ayda **$40M**. Yadegari (X): **"$50M ARR"**. Muhtemel okuma: $30M muhafazakâr GAAP, $40M LTM, $50M run-rate. Hiçbiri bağımsız denetlenmedi. `[kısmen doğrulanmadı]` | TechCrunch, Inc, X |
| **İndirme** | 2 yıldan kısa sürede **15M+**. | TechCrunch |
| **Ekip** | **7 kişi** + birkaç sözleşmeli. | TechCrunch |
| **Exit** | MyFitnessPal satın aldı. Anlaşma **Aralık 2025** kapandı, **2 Mart 2026** duyuruldu. **Bedel açıklanmadı.** MFP CEO'su Mike Fisher: ekip *"didn't have to sell"*. Ekip tutuldu, uygulama bağımsız kalıyor. | TechCrunch |

**MyFitnessPal'a satılması ne anlama geliyor?**
1. **Kategori konsolide oluyor.** AI-kalori-tarama artık ayrı bir kategori değil, MFP gibi
   devlerin özellik seti. Tek-özellikli AI tarayıcı yapmak 2026'da geç kalmış bir hamle.
2. **Dağıtım > teknoloji.** Cal AI'ın teknolojisi taklit edilebilirdi (edildi de, onlarca klon).
   Satın alınan şey **TikTok dağıtım makinesi ve genç kitle**ydi. MFP'nin olmadığı yer.
3. **Bizim için negatif ders:** Cal AI'ın oyunu **ücretli reklam + creator bütçesi**. MrBeast'e $500K
   veren bir şirketin playbook'u sıfır bütçeyle kopyalanamaz. Ama **ilk hamle kopyalanabilir**:
   ücretsiz/düşük ücretli creator UGC, reklam gibi durmayan native video.

Kaynaklar:
- https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/
- https://www.inc.com/ben-sherry/he-built-an-ai-app-in-high-school-made-40m-and-sold-to-myfitnesspal-now-hes-aiming-even-bigger/
- https://www.profitablefounder.xyz/blog/cal-ai-founder-story
- https://x.com/zach_yadegari/status/2028473704359874652

---

## A4 · Boostcamp — içerik-önce (11.000+ ücretsiz program)

**Kurucular:** Patricia (mühendis, MVP'yi kodladı) + Michael (fitness tarafı, koçlarla ilişki).
Kanadalı üniversite arkadaşları, Brooklyn'de.

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **İlk 1.000** | **Reddit.** Boostcamp'i Reddit'te paylaştılar, *bir gecede binlerce kullanıcı* geldi. Bu destek işlerini bırakıp tam zamanlı geçmelerini sağladı. | boostcamp.app/about |
| **Neden Reddit işledi** | Ürün, r/fitness ekosisteminin *zaten kullandığı* programları (5/3/1, GZCLP, PPL, nSuns...) uygulamaya taşıyordu. Yani yeni bir şey satmadılar — topluluğun mevcut davranışının sürtünmesini kaldırdılar. Pazarlama mesajı literally "Reddit'in en iyi programları için app". | boostcamp.app |
| **İçerik-önce stratejisi** | 11.000+ program **ücretsiz**. Program kataloğu hem SEO varlığı hem edinme kancası. Web **Program Creator** ile kullanıcılar 10 dakikada program üretip yayınlıyor → katalog kullanıcı tarafından büyüyor (UGC flywheel). | Fitt Insider, boostcamp.app |
| **Ürün bugün** | Ücretsiz takip + program kataloğu + AI koç (hedef/takvim/ekipmandan plan üretiyor). 600.000+ kullanıcı. | boostcamp.app |
| **Gelir** | **Bulunamadı.** Ücretsiz katman çok geniş; monetizasyon detayı açıklanmamış. `[doğrulanmadı]` | — |

**Bizim için ders:** Boostcamp'in kanalı = **var olan bir topluluğun kanonik içeriğini paketlemek**.
Kendi otoritesini kurmadan, topluluğun zaten güvendiği içeriğin dağıtım katmanı oldular.
NOT: Reddit self-promotion kuralları 2019-2021'e göre çok sıkılaştı; aynı hamle bugün riskli.

Kaynaklar:
- https://www.boostcamp.app/about
- https://insider.fitt.co/press-release/boostcamp-launches-web-program-creator-the-easiest-way-to-make-free-workout-plans/

---

## A5 · StrengthLog — 8 yıl blog, sonra app (İsveç)

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Kökeni** | **2011'de İsveççe bir güç antrenmanı blogu** olarak başladı ("Styrkelabbet"). **1.000'den fazla ücretsiz makale** ve podcast bölümü yayınladılar. Uygulama 2018'de çıktı — yani **7 yıl içerik, sonra ürün**. | strengthlog.com/about |
| **İlk kullanıcılar** | Blogun mevcut İsveç okur kitlesi. Sonra İngilizce'ye geçiş + SEO. | strengthlog.com |
| **Model** | **Freemium.** Temel her şey sonsuza kadar ücretsiz: sınırsız antrenman logu, çok sayıda program, ilerleme takibi. Premium = ileri programlar, derin analitik. 14 gün deneme. | help.strengthlog.com |
| **Ekip** | 7 kişi, İsveç. | strengthlog.com/about |
| **Gelir** | Bulunamadı. | — |

**Bizim için ders:** MacroFactor ile aynı örüntü, farklı ülke, farklı dil: **içerik → güven → ürün**.
Ama StrengthLog **tam tersi fiyat kararı** verdi (cömert free tier). İkisi de çalışıyor — ayrım
kitlenin ödeme alışkanlığında. SBS ücretli ürün satarak kitle kurdu, StrengthLog bedava blogla.

Kaynak: https://www.strengthlog.com/about/ · https://help.strengthlog.com/help-article/strengthlog-premium/

---

## A6 · GymStreak — tek kişi, 4 sözleşmeli, $2,5M/yıl (bonus vaka, listede yoktu ama en öğretici)

**Kurucu:** Joseph Mambwe. Fikir Cambridge'de doğdu, şirket 2018'de kuruldu.

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **İlk kullanıcılar** | İngilizce konuşan pazarlarda **soft launch**, kontrollü reklam harcamasıyla. Sonra global. | Hampton |
| **Kanallar** | Facebook + TikTok reklamı (ana kanal) · App Store feature'ları · blog (yavaş yanan SEO) · ASO. | Hampton |
| **Gelir eğrisi** | 2021: ~$300K → 2022: ~$2,5M (**10x**) → 2023: ~$2,5M (ürün optimizasyonu için bilinçli yavaşlatma). | Hampton |
| **Ekip** | Solo kurucu + 4 sözleşmeli (destek, pazarlama, içerik, performans pazarlaması). **Sıfır tam zamanlı çalışan.** | Hampton |
| **KIRILMA ANI — en önemli sayı** | **Gün-0'da 1,5x ROAS.** Reklam masrafını ilk gün geri kazanıyorlar. Bu, dış sermayeyi gereksiz kıldı ve kârlı ölçeklemeyi mümkün yaptı. | Hampton |
| **HATA** | 2021'de $300K'da **plato + yüksek churn**. Rakip uygulamaları inceledi ve **ürünü sıfırdan üç kez yeniden yazdı.** Sonrasında 10x. | Hampton |

**Bizim için ders — bu vaka görevdeki "reklam matematiksel zarar" verisini nitelendiriyor:**
CPI $4,30-5,50 vs LTV $1,21 **ortalama**. GymStreak gün-0'da 1,5x ROAS yakaladı — yani reklam
her zaman zarar değil, **paywall/onboarding dönüşümü yeterince iyiyse** kâr. Ama bu ancak ürün
üç kez yeniden yazıldıktan sonra oldu. Sıra: önce dönüşüm, sonra reklam. Asla tersi.

Kaynak: https://joinhampton.com/blog/bootstrapping-a-2.5-million-per-year-fitness-app-with-zero-employees

---

## A7 · Apple Watch indie'leri: Gentler Streak · Athlytic · Bevel

**Gentler Streak** (Slovenya) — kurucular Jasna Krmelj, Katarina Lotrič, Andrej Mihelič, Luka Orešnik.
Sakatlık ve tükenmişlik sonrası "dinlenmeye saygı duyan" bir fitness app fikri.
- **2022 Apple Watch App of the Year** · **2024 Apple Design Award (Social Impact)**.
- Apple ödülünün ardından The Verge, Forbes, TechCrunch kapsaması.
- **Kırılma anı = Apple'ın kendisi.** Apple editoryal seçimi tek başına PR zincirini tetikledi.
- Gelir/kullanıcı sayısı: **bulunamadı.**

**Athlytic** — **iki kişilik**, yatırımsız şirket. Algoritmalar 2017'den beri geliştiriliyor.
- Konum: "ekstra donanım olmadan Apple Watch'tan alabileceğin en Whoop-benzeri deneyim" —
  Recovery / Exertion / Sleep skoru. **Whoop'un $30/ay donanım aboneliğine karşı $24,99/yıl.**
- Gizlilik konumlandırması: her şey cihazda, App Store etiketi "Data Not Collected".
- Gelir: **bulunamadı.**

**Bevel** — Athlytic'in doğrudan rakibi, aynı niş (Apple Watch recovery skoru). Kurucu/gelir
detayı **bulunamadı**.

**Ortak örüntü (3 vakada da):**
1. **Var olan donanımın üstüne yazılım katmanı.** Donanım riski yok, sermaye gereksinimi yok.
2. **Pahalı bir rakibin fiyat açığını kullanmak** (Whoop $30/ay → Athlytic $25/yıl).
3. **Apple editoryal görünürlüğü tek en büyük ivme kaynağı.** Satın alınamaz, kazanılır:
   Apple platform-yeni özelliklere (yeni watchOS API'leri, Widget, Live Activity, Vision Pro)
   ilk gün destek verenleri ve tasarım kalitesi yüksek olanları öne çıkarır.

Kaynaklar:
- https://developer.apple.com/news/?id=3m0ht22s
- https://thenextweb.com/news/slovenian-fitness-tracker-won-apple-watch-app-of-the-year-award
- https://athlyticapp.com/
- https://www.fitcoin.co/articles/bevel-vs-athlytic

---

## A8 · Alpha Progression · Strong · Setgraph — kısa notlar

**Alpha Progression** (Almanya) — kurucu **Benjamin Schnabel**. Hipertrofi odaklı, otomatik
progressive overload öneren antrenman planlayıcı. Bir spor profesyoneliyle egzersiz videoları
çekmişler. **Gelir, kullanıcı sayısı, lansman kanalı: bulunamadı** — kurucu röportajı bulunamadı,
Almanca kaynaklar arandı, birincil kaynak yok. `[doğrulanmadı]`

**Strong** (Strong Fitness PTE. LTD., Singapur kayıtlı) — 1,2M+ kullanıcı iddiası. App Store'da
2011'den beri (ID 464254577) — kategorinin **en eski** ciddi tracker'ı. Bu kadar eski olmasına
rağmen kurucu hikâyesi, gelir veya lansman detayı **kamuya açık değil**. Kasıtlı sessizlik.
Ders: Strong'un konumu **first-mover + App Store yaş otoritesi**. Kopyalanamaz.

**Setgraph** — fonlanmamış, indie. IAP fiyatları $29,99–$99,99. Üçüncü taraf tahmini
(Tracxn/MWM): son ayda ~30K indirme, ~$30K gelir. `[doğrulanmadı — üçüncü taraf tahmini]`
Adapty paywall kütüphanesinde yer alıyor → paywall optimizasyonuna yatırım yapan bir indie.

---

# BÖLÜM B — YATIRIMLI / BÜYÜK OYUNCULAR

## B1 · Fitbod — $5,7M yatırım, ~$20M ARR, 300K+ ücretli abone

**Kurucular:** Allen Chen (CS + BNP Paribas'ta 7 yıl portföy optimizasyon algoritmaları) +
Jesse Venticinque (ürün tasarımı). 2015.

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Kökeni** | Chen'in önceki startup'ı kapandıktan sonra **yan proje** olarak başladı. | Sub Club |
| **KRİTİK PIVOT** | Beta aşamasında **"gelişmiş tracker"dan "önerilen antrenman planı"na** döndüler. Yani takip etmekten **karar vermeye** geçtiler. *Bizim ürün tezimizin aynısı.* | Sub Club |
| **İlk trafik** | **ASO** — Apple arama sonuçlarında keyword testiyle sıralanmak. | Sub Club |
| **Bugünkü kanallar** | 1) ağızdan ağıza / viral döngüler (*"a major growth driver today"*) 2) referans programı (link paylaşınca **6 ücretsiz antrenman**) 3) blog / içerik 4) ücretli reklam — açıkça **"an accelerant"**, temel değil. | Sub Club |
| **Fiyat** | Yıllık $79,99. Baseline 3 ücretsiz antrenman, referansla 6. | Sub Club |
| **Retention eşiği** | **Ayda 3+ antrenman** = retention'ı öngören eşik. İdeal müşteri profili haftada "2 küsur" antrenman yapıyor. 36/48/60+ ay kohortları hâlâ tutuluyor. | Sub Club |
| **Ekip/zaman** | 2015'te 2 kurucu. **İlk para kazanma seed turundan ~1,5 yıl önce** (~2016). Yıllarca sadece 2 kişi. | Sub Club |
| **Yatırım** | $5,7M (Pear VC, TechNexus, Jason Calacanis). Kârlı. | Crunchbase |
| **İTİRAF EDİLEN HATA** | Sadece **çok bağlı süper kullanıcılar için ürün geliştirme riski**. Abone geri bildirimine fazla güvenip **dönüşmeyenlerin neden dönüşmediğini araştırmamak.** | Sub Club |

**Bizim için en değerli iki satır:**
- Karar veren ürün > takip eden ürün — Fitbod bunu **beta'da** keşfetti, lansmandan önce.
- "Ayda 3 antrenman" gibi **tek bir aktivasyon eşiği** tanımlamak. Bizim de bir tane olmalı.

Kaynak: https://subclub.com/episode/product-lessons-from-a-profitable-20m-arr-subscription-app-jesse-venticinque

---

## B2 · Ladder — $105M ve "pazarlamayı önden finanse eden" yapı

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Tur (Kas 2024)** | Toplam **$105M** (görevdeki $127M rakamı doğrulanamadı — muhtemelen tüm turların toplamı). İkiye ayrılmış: **$15M Series B** (Point72, ADvantage) + **$90M go-to-market finansmanı (General Catalyst)**. | BusinessWire, Fitt Insider |
| **Yapı ne?** | GC'nin **Customer Value Fund** tipi anlaşması: hisse karşılığı değil, **pazarlama harcamasına özel, gelirle geri ödenen borç benzeri sermaye**. Toplam turun **~%86'sı** sadece kullanıcı edinmeye. | Fitt Insider, pulse2 |
| **Neden gerekti?** | Çünkü abonelik uygulamalarında CAC **bugün** ödenir, LTV **aylara yayılır**. Hisse ile CAC finanse etmek kurucu payını yakar. Bu yapı CAC'ı bilanço dışı bir "varlık" gibi finanse ediyor. | — |
| **İşe yaradı mı?** | **Henüz belirsiz.** Hedef: kullanıcı sayısını bir yılda **iki katından fazla** artırmak. Bağımsız doğrulanmış sonuç verisi **bulunamadı**. `[doğrulanmadı]` | Yahoo Finance |

**Bizim için ders:** Bu yapı, "ücretli reklam kategoride zarar" gerçeğinin **kurumsal cevabı**:
zararı sermayeyle finanse et, ölçekte LTV'yi kurtar. Bizim erişimimiz yok, olmamalı da. Ama şunu
öğretiyor: **rakiplerimiz kaybetmeye finanse edilmiş durumda.** Aynı kanalda (paid social) onlarla
yarışmak matematiksel olarak imkânsız. Kanal farklı olmak zorunda.

Kaynaklar:
- https://www.businesswire.com/news/home/20241120017577/en/Ladder-Secures-Over-$100-Million-in-New-Funding-to-Scale-1-Strength-Training-App
- https://insider.fitt.co/ladder-raises-105m-for-strength-training-app/

---

## B3 · Runna — ⚠️ GÖREVDE HATA VAR: Nike DEĞİL, **Strava** aldı

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Kuruluş** | 2021, Londra. Dom Maskell + Ben Parker (Parker koş antrenörü). | Tracxn, Forbes |
| **Satın alan** | **Strava**, 17 Nisan 2025 duyurdu. **Nike değil.** (Nike Run Club ayrı bir üründür ve karıştırılıyor.) | Forbes, runna.com |
| **Bedel** | **Açıklanmadı.** "Multimillion-pound" deniyor. Kesin rakam **bulunamadı**. `[doğrulanmadı]` | T3, Hyper Exits |
| **Öncesi yatırım** | £8M (bazı kaynaklarda toplam $10,3M / 5 tur / 32 yatırımcı). | Tracxn |
| **Büyüme** | 2026 itibarıyla **180+ ülkede 2M+ aylık kullanıcı**. 2024 Apple App of the Year **finalisti**. | TFN, therunninggenie |
| **Fiyat** | $119,99/yıl — kategorinin **üst ucu**. Kişiselleştirilmiş koşu planı = premium konumlandırma. | Forbes |
| **Neden aldılar** | Strava'nın boşluğu: **kayıt tutuyor ama antrenman planı vermiyor.** Runna tam o katmanı doldurdu. Strava iki uygulamayı ayrı tutacağını söyledi. | T3, Forbes |

**Bizim için ders:** Runna, Strava'nın **eksik olduğu** yerde büyüdü — "takip ediyor ama söylemiyor".
Bu, bizim tezimizin (karar veren koç) pazarda **ödenmiş bir exit'le kanıtlandığı** en net vaka.
Ve $119,99/yıl fiyat noktası, karar veren ürünün takip eden üründen **4-5x** fiyatlanabildiğini
gösteriyor (Hevy $24/yıl vs Runna $120/yıl).

Kaynaklar:
- https://www.runna.com/strava-acquires-runna
- https://www.forbes.com/sites/andrewwilliams/2025/04/17/strava-acquires-runna-what-it-means-for-subscribers/
- https://www.t3.com/active/strava-just-bought-runna-and-we-got-the-inside-story-from-both-ceos

---

## B4 · Freeletics — PDF'ten 52M kullanıcıya, bootstrap

| Soru | Cevap | Kaynak |
| --- | --- | --- |
| **Kökeni** | 2012, Münih'te bir **parkta**. Üç kurucu (Andrej Matijczak, Joshua Cornelius, Mehmet Yilmaz) vücut ağırlığı HIIT metodu geliştirdi. Ürün **önce PDF olarak satıldı** — app değil. | freeletics.com blog |
| **İlk kullanıcılar** | PDF alıcıları. Uygulama 2013'te çıktı. | freeletics.com |
| **İlk 1M** | **Uygulamanın ilk yılında 1 milyon kullanıcı.** Motor: **sosyal paylaşım + kullanıcıların kendi çektiği "before-after" dönüşüm videoları.** YouTube ana katapult. | Munich Startup |
| **Kritik nokta** | Dönüşüm videolarını **şirket üretmedi** — kullanıcılar üretti, viral oldu. Freeletics sadece paylaşılabilir bir format (adı olan antrenmanlar: "Aphrodite", "Kentaur") ve topluluk kimliği verdi. | Munich Startup |
| **Model** | 2017 sonuna kadar **tamamen bootstrap**, 20M kullanıcı. Sonra $45M (2018) + $25M (2020). | TechCrunch |
| **Bugün** | 52M+ kullanıcı, 160+ ülke. | freeletics.com |

**Bizim için ders — en kopyalanabilir mekanizma bu:**
1. **Ürünü önce PDF/dijital dosya olarak sat.** Uygulama yazmadan talebi kanıtla, para kazan.
2. **Antrenmanlara isim ver.** İsimlendirilmiş birim = paylaşılabilir birim = kimlik.
3. **Kullanıcı dönüşüm videosunu ürünün bir parçası yap**, pazarlama bütçesi değil.

Kaynaklar:
- https://www.freeletics.com/en/blog/posts/from-pdfs-to-europes-top-fitness-app-we-are-freeletics/
- https://en.munich-startup.de/2019/11/26/freeletics-success-story/

---

## B5 · Zing Coach · Caliber — kısa notlar

**Zing Coach** — 2021 lansmanı, Temmuz 2024'te **$10M Series A** (Zubr Capital + Triple Point).
1M+ indirme, aylık **%25 MoM** büyüme iddiası `[doğrulanmadı — şirket beyanı]`. AI fitness koçu,
"hareketsizlikle mücadele" konumlandırması. Para tamamen **pazarlama + yeni pazarlar** için.
Ders: $10M'ın büyük kısmı reklama giden bir rakip = paid kanalda CPI'ı bizim için de yukarı iten güç.

**Caliber** — Ekim 2020'de $2,2M seed (Trinity Ventures) ile dijital koçluk platformu.
İnsan koç + uygulama hibriti. **Kapandığına dair kanıt bulunamadı** — görevdeki "çöküş"
sınıflandırması doğrulanamadı. `[doğrulanmadı]`

---

## B6 · Whoop & Oura — donanım + abonelik, ve fiyat/söz kırma dersi

**Whoop — Mayıs 2025 krizi (kategorinin en pahalı iletişim hatası):**
- Whoop yıllarca "6 aydan uzun üyeliği olanlar yeni nesil donanıma **ücretsiz** yükselir" dedi.
- Whoop 5.0 çıkınca 4.0 kullanıcılarından **ya 12 ay abonelik uzatma ya $49 ($79 EKG'li)** istendi.
- Reddit/sosyal medyada patlama. *"Upvote this if you just canceled your subscription"* → 2.400 upvote.
- Şirket **geri adım attı**: 12 aydan fazla üyeliği kalanlara ücretsiz yükseltmeyi onurlandırdı.
- TechCrunch, TechRadar, CCW gibi yayınlar bunu "müşteri deneyimi kötüydü, **tepki daha kötüydü**"
  diye çerçeveledi.

**Oura:** 2021'de Gen 3 ile **$5,99/ay abonelik** ekledi — şiddetli tepki aldı ama **geri adım atmadı**.
2026'da paywall'ı savunmaya devam ediyor, kaldırma planı yok. Gerekçe: abonelik zamanla artan
değer sağlıyor.

**İki vaka arasındaki fark, tek bir cümle:** Oura **yeni müşteriye** yeni fiyat koydu (söz kırmadı).
Whoop **mevcut müşteriye verdiği sözü** bozdu. Birincisi tolere edildi, ikincisi kriz oldu.

**Bizim kuralımız:** Fiyat *yükseltilebilir* — ama sadece **yeni kullanıcılar için**. Mevcut
aboneye verilen her söz kalıcı bir yükümlülüktür. Lifetime plan satarsan sonsuza kadar taşırsın.

Kaynaklar:
- https://techcrunch.com/2025/05/11/fitness-tracker-whoop-faces-unhappy-customers-over-upgrade-policy
- https://www.customercontactweekdigital.com/cx-news-and-trends/articles/whoop-upgrade-customer-backlash
- https://www.notebookcheck.net/Oura-defends-subscription-paywall-of-the-Oura-Ring-4.1218222.0.html

---

# BÖLÜM C — ÇÖKÜŞLER, GERİ ÇEKİLMELER, ÖLÜMLER

## C1 · Sweat (Kayla Itsines) → iFIT → geri satın alma

| Aşama | Ne oldu | Kaynak |
| --- | --- | --- |
| Kuruluş | Kayla Itsines + Tobi Pearce. "Bikini Body Guide" **PDF** olarak başladı → Instagram → app. | genel |
| Zirve | 30M+ indirme, **$99,5M gelir**. | BusinessWire, Startup Daily |
| Satış | **Temmuz 2021, iFIT'e $400M.** | BusinessWire |
| Çöküş | 2022: gelir ~A$100M → **A$71M**. **A$85M zarar.** $80M şerefiye silme (satın alımda A$81,4M şerefiye tanınmıştı). | Neos Kosmos, Greek Herald |
| Geri alım | **2023 sonu** Itsines + Pearce uygulamayı iFIT'ten geri aldı (bedel açıklanmadı). **Mart 2026**'da Itsines tek sahip oldu. | Forbes AU, Welltodo |

**Ne yanlış gitti — üç neden:**
1. **COVID zirvesinde satıldı.** Spor salonları kapalıyken şişen bir metriğe göre değerlendi.
   Salonlar açılınca talep normalleşti.
2. **Reklam kesintisi → abone düşüşü.** Yeni sahip nakit akışı için pazarlamayı kıstı; abonelik işi
   sürekli edinme gerektirir, musluk kapanınca churn açığı kapatamadı.
3. **Kurucu-marka bağı koptu.** Sweat'in varlığı Itsines'in kişisel markasıydı; kurumsal sahiplik
   altında o bağ zayıfladı. Itsines geri döndüğünde: *"I'm the boss now."*

**Itsines'in kendi uyarısı:** kurucuları aynı hatayı yapmamaya çağırıyor (IBTimes) — özetle
**şirketi zirvede ve kontrolü kaybederek satmak.**

Kaynaklar:
- https://www.businesswire.com/news/home/20210713005441/en/iFIT-Acquires-Sweat-a-Leading-Digital-Fitness-App-for-Women
- https://neoskosmos.com/en/2022/12/19/news/business/kayla-itsines-fitness-app-sweat-loses-85-million-after-changing-hands/
- https://www.forbes.com.au/covers/entrepreneurs/im-the-boss-now-kayla-itsines-on-being-back-at-sweats-helm/
- https://www.welltodoglobal.com/post/ifit-sells-sweat-back-to-co-founders/

---

## C2 · Zoe — büyüme için fiyat kırmanın bedeli

| Ne | Detay | Kaynak |
| --- | --- | --- |
| Model | Bağırsak mikrobiyomu testi + kişiselleştirilmiş beslenme uygulaması. Yüksek bilim iddiası (ZOE PREDICT çalışmaları). | genel |
| Kriz | **Üyelik fiyatını büyüme için indirdi → gelir neredeyse yarıya düştü.** Ağustos 2025 sonu yıl: **£20M+ zarar**, bir önceki yılın neredeyse iki katı. | The Grocer |
| İşten çıkarmalar | Birden fazla dalga. CEO Jonathan Wolf LinkedIn'de itiraf: **son altı ayda ekibi aşırı büyüttük.** Bir turda **139 kişi** daha. Pazarlama ekibinin %50'si, **beslenme koçluğu ekibinin %80'i.** | Sifted, Welltodo |
| Kök sorun | **Churn.** Kurucu Tim Spector (Sifted): kullanıcıların **"yarısı" sadece 6-9 ay** abone kalıyor. | Sifted |

**Dersler:**
1. **Fiyat indirimi büyüme getirmedi, geliri yok etti.** Ucuzlatmak talep elastikiyeti varsayar;
   sağlık aboneliğinde asıl kısıt fiyat değil **sonuç ve alışkanlık**.
2. **İnsan koçluğu ölçeklenmiyor.** Beslenme koçluğu ekibinin %80'inin gitmesi bunun kanıtı —
   marj yiyor.
3. **6-9 ay churn**, bu kategorinin doğal ömrü. Ürün buna göre tasarlanmalı: ya 6 ayda
   somut sonuç ver, ya ömür boyu değer sunacak bir sebep (sosyal, veri, kimlik) inşa et.

Kaynaklar:
- https://www.thegrocer.co.uk/news/zoe-gut-health-app-losses-swell-as-it-slashes-membership-price/718306.article
- https://sifted.eu/articles/more-layoffs-healthtech-zoe
- https://www.welltodoglobal.com/post/zoe-lays-off-staff-amid-restructuring/

---

## C3 · Amazon Halo — devin bile kurtaramadığı ürün

- **Kapanış:** 1 Ağustos 2023'te cihazlar ve servis çalışmayı durdurdu, para iadesi yapıldı.
- **Neden başarısız oldu:**
  1. **Ekransız bant** — kullanıcı hiçbir anlık geri bildirim almıyor.
  2. **Body Scan:** kullanıcıdan **az kıyafetle tam boy fotoğraf** isteyip Amazon bulutunda işleyen
     3D vücut yağ ölçümü. Ve "daha az yağla vücudun **nasıl görünmesi gerektiğini**" gösteriyordu.
     İnvazif ve moral bozucu.
  3. **Tone:** mikrofonla ses tonundan duygu analizi. "Ürkütücü" bulundu; Amazon sonraki ürünlerden
     mikrofonu çıkardı.
  4. **Politik/regülasyon tepkisi:** Senatör Amy Klobuchar HHS'e açık mektup yazdı.
- Amazon'un resmi gerekçesi: yatırımların yeniden değerlendirilmesi + makroekonomik ortam.

**Bizim için ders (doğrudan ürün kararı):** Bir sağlık ürününde **beden imajı üzerinden normatif
yargı** (senin vücudun şöyle görünmeli) ölümcül. Ve **veri toplama derinliği ile kullanıcı
tahammülü** arasında sert bir tavan var: fotoğraf ve mikrofon o tavanın üstünde.
Amazon'un dağıtım gücü bile bunu kurtaramadı → **dağıtım, yanlış ürünü kurtarmaz.**

Kaynaklar:
- https://www.aboutamazon.com/news/company-news/amazon-halo-discontinued
- https://www.androidpolice.com/why-amazon-halo-failed/
- https://www.geekwire.com/2023/amazons-halo-disappears-tech-giant-discontinues-health-devices-and-service-promises-refunds/

---

## C4 · Satın alınıp terk edilenler: Yummly · PlateJoy · (kısmen Nutritionix)

| Ürün | Hikâye | Kaynak |
| --- | --- | --- |
| **Yummly** | 2009 kuruldu → 2017 **Whirlpool** aldı → Nisan 2024 Whirlpool **tüm ekibi işten çıkardı** (generative AI'a pivot gerekçesi) → **20 Aralık 2024** site ve app kalıcı kapandı. | The Spoon, Plan to Eat |
| **PlateJoy** | 2021'de **RVO Health** aldı → destek 2023'ten beri yanıtsız → Mart 2025 Google Play'den kaldırıldı → **Temmuz 2025 kapandı** → 2026'da domain bile çözülmüyor. | MealThinker |
| **Nutritionix** | 4 Haziran 2018 **Syndigo** aldı. **Kapanmadı** — aylık 250M+ API sorgusu, 20K+ uygulama kullanıyor. AMA: **açık/ücretsiz erişim katmanı kaldırıldı** (kişisel, ticari olmayan, öğrenci kullanımı artık yok). Yani "yetim bırakıldı" değil, **"kurumsallaştı ve indie'lere kapandı"**. | Syndigo, nutritionix.com |

**Örüntü:** Büyük şirket küçük ürünü alır → ekibi dağıtır → kullanıcıyı veri göçü imkânı vermeden
bırakır. Yummly ve PlateJoy'da kullanıcılar kaydettikleri tarifleri ve kişisel verilerini kaybetti.

**Bizim için iki ders:**
1. **Bağımlılık riski:** Üçüncü taraf gıda veritabanına (Nutritionix, Edamam, FatSecret) bağlı
   kurarsan, o katmanın fiyatlandırması/erişimi bir gün değişir. Nutritionix bunu **zaten yaptı**.
   Plan: kendi doğrulanmış çekirdek veritabanını (en çok kullanılan ~2-5K gıda) sahiplen.
2. **Konumlandırma fırsatı:** "Satın alınmayacağız / kapanmayacağız / verini export edebilirsin"
   bugün gerçek bir pazarlama mesajı. Yummly ve PlateJoy mültecileri var.

---

## C5 · Vi (LifeBEAM) — Kickstarter zaferinin ölümü

- 2016 Kickstarter: hedef **30 dakikada** doldu, toplam **$1,7M** — o güne kadar Kickstarter
  tarihinin **en çok fonlanan fitness giyilebiliri**. Harman Kardon sesi, havacılık sınıfı biyosensör.
- 2017 başında piyasaya çıktı, Amazon ve Best Buy'a girdi.
- **Bugün: üretimden kalktı**, sadece ikinci elde bulunuyor.
- Resmi bir "kapanış postmortem"i **bulunamadı** — sessizce söndü.

**Ders:** **Ön talep ≠ retention.** $1,7M ön sipariş, ürünün tutulacağının kanıtı değil; sadece
**hikâyenin** iyi olduğunun kanıtı. Fitness'ta lansman hype'ı ile 6. ay retention'ı arasında
korelasyon yok.

Kaynaklar:
- https://www.kickstarter.com/projects/1050572498/vi-the-first-true-artificial-intelligence-personal
- https://venturebeat.com/business/lifebeam-launches-kickstarter-for-a-i-personal-trainer-vi
- https://www.techradar.com/reviews/lifebeam-vi

---

## C6 · Femtech küçükleri: FitrWoman + Jennis · Wattson Blue

**Jennis** (Dame Jessica Ennis-Hill, Olimpiyat şampiyonu) — 2021'de €1,17M topladı, hormonal
sağlık + perimenopoz içerik kütüphanesi kurdu. **Orreco** (AI biyo-analitik, FitrWoman'ın sahibi)
**Jennis'i satın aldı** (2026, $4M taze fonla). İki ürün tek platformda birleşiyor.
→ Yani "birleşmek zorunda kaldı" doğru: **iki niş femtech ürünü tek başına ayakta kalamadı.**

**Wattson Blue** — kadınlar için hormon-farkındalıklı antrenman. **Hiç yatırım almadı.**
App Store'da hâlâ duruyor ama **"sunset mode"** — aktif geliştirme durdu. Kapanmadı, terk edildi.

**Dersler:**
1. **Olimpiyat şampiyonu kurucu bile yetmiyor.** Jennis'in kurucusu Dame Jessica Ennis-Hill —
   ünlü kurucu = dikkat, ama dikkat ≠ retention ≠ birim ekonomisi.
2. **Niş çok dar olursa TAM yetmez.** Hormon-döngüsü antrenmanı tek başına bir ürün değil,
   daha büyük bir ürünün **özelliği** olabiliyor. Orreco tam bunu yaptı.
3. **"Sunset mode" en yaygın ölüm biçimi**, dramatik kapanış değil. Uygulama mağazada kalır,
   güncelleme durur, kullanıcı yavaşça gider. Wattson Blue bunun ders kitabı örneği.

Kaynaklar:
- https://femtechinsider.com/orreco-acquires-jessica-ennis-hills-jennis-to-build-womens-performance-platform/
- https://www.eu-startups.com/2021/10/london-based-femtech-startup-jennis-raised-e1-17-million-to-become-go-to-app-for-helping-women-improve-their-hormonal-health/
- https://www.wattson.blue/
- https://tracxn.com/d/companies/wattson-blue/

---

## C7 · Stronger U — 9 yıl, sonra portföy kararıyla kapatıldı

- Beslenme koçluğu servisi (insan koç + makro hedefleri). **~9 yıl** faaliyet.
- **31 Mart 2026'da tüm hizmetler durdu.** Gerekçe şirketin kendi açıklamasında:
  *"Purpose Brand'in stratejik iş ihtiyaçları ve portföyü."*
- Yani ürün başarısız olmadı — **sahibinin portföy kararıyla** kapatıldı.

**Ders:** İnsan-koç tabanlı beslenme işi 9 yıl sonra bile bir portföy kalemi olarak kapatılabilir
marjda. **Zoe'nin koçluk ekibinin %80'ini çıkarmasıyla aynı sinyal:** insan koçluğu ölçeklenmiyor.
Bizim ürünümüzün "karar veren" olması = insan koçun işini yazılıma taşımak. Bu sinyal bizi doğruluyor.

Kaynak: https://strongeru.com/end-of-services/

---

## C8 · Gymshark Training · Caliber · FitnessAI — DOĞRULANAMADI

Görevde "çöküş" olarak listelenen üç vaka için **kapanma/dondurma kanıtı bulunamadı**:
- **Gymshark Training** — App Store ve Google Play'de **aktif ve güncelleniyor** (v2.54.0'a kadar
  sürümler var). "Donduruldu" iddiası doğrulanamadı. `[doğrulanmadı]`
- **Caliber** — 2020'de $2,2M seed aldı, kapandığına dair kaynak yok. `[doğrulanmadı]`
- **FitnessAI** — get.fitnessai.com ve Google Play listelemesi aktif. "Öldü" iddiası
  doğrulanamadı. `[doğrulanmadı]`

Not: Aynı arama sırasında **Flex AI** (kişisel antrenman uygulaması, Kanada) **Mart 2026'da**
ekibini çıkarıp faaliyeti durdurdu — şirketi satma çabası sonuçsuz kaldı. (BetaKit)
Ve **Vitruvian** (Trainer+ donanımı) Aralık 2023'te $15M topladıktan sonra sessizleşti; kurucu
Jon Gregory ve personelin çoğu ayrıldı, "yeni nesil platform" planı tuttu (Ağustos 2025 açıklaması:
kapanmıyor, yeniden yapılanıyor).

Kaynaklar:
- https://betakit.com/personal-training-app-flex-ai-is-shutting-down/
- https://connectthewatts.com/2025/08/08/vitruvian-trainer-resurfaces-with-update-after-a-year-of-silence/
- https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320

---

# BÖLÜM D — (a) HATA ENVANTERİ

Frekansa göre sıralı. "Vaka" = bu araştırmada bu hatanın somut olarak görüldüğü örnek sayısı.

### 1. Dağıtımı ürünün sonrasına bırakmak — **7 vaka**
Vi/LifeBEAM, Wattson Blue, Alpha Progression, Setgraph, Bevel, Gymshark Training, Caliber.
Ürün iyi, kimse duymuyor. Vi'nin $1,7M Kickstarter'ı bile bunu çözmedi çünkü lansman dikkati
tek seferlikti, tekrarlanabilir bir kanal değildi.
> **Bizim kuralımız:** Kanalı üründen **önce** kur. YouTube kanalı v1'den önce yayında olmalı.
> Uygulama yazmaya başlamadan önce "bu videoyu izleyen kaç kişi var" sorusunun sayısal cevabı olmalı.

### 2. Ücretli reklamı temel edinme kanalı sanmak — **6 vaka**
Sweat/iFIT (reklam kesilince gelir çöktü), Zing Coach, Ladder, Cal AI (ölçeklerken), Zoe, Freeletics (geç dönem).
Reklam bir **hızlandırıcı**dır (Fitbod'un kendi ifadesi: *"an accelerant"*), motor değil.
Kategori matematiği: CPI $4,30-5,50 vs LTV $1,21.
> **Bizim kuralımız:** İlk 12 ay **sıfır ücretli reklam**. Reklama ancak GymStreak'in eşiği
> (gün-0'da 1,5x ROAS) ölçülebilir olduğunda dokunulur. O ölçülemiyorsa reklam yakma demektir.

### 3. Fiyatı büyüme için indirmek — **4 vaka**
Zoe (gelir yarıya indi), Sweat (indirimlere sığındı), Hevy (bilinçli düşük tuttu ama sonra
yükseltemedi — kilitlendi), Boostcamp (çok geniş free tier, monetizasyon belirsiz).
> **Bizim kuralımız:** Fiyat **baştan doğru** konur, sonra dokunulmaz. Yükseltme sadece
> **yeni kullanıcı** için. Hevy'nin itirafı: sosyal ürün kurunca fiyat deneyemezsin.

### 4. Retention'ı ölçmeden edinmeye yatırım yapmak — **4 vaka**
Zoe (kullanıcıların yarısı 6-9 ayda gidiyor), GymStreak 2021 (plato + yüksek churn),
Sweat post-COVID, Amazon Halo.
Kategori tabanı: **D30 retention %4.**
> **Bizim kuralımız:** Tek bir **aktivasyon eşiği** tanımla ve onu takip et. Fitbod'un eşiği:
> ayda 3+ antrenman. Bizimki de tek sayı olmalı ve D30'u öngörmeli. O sayı hedefi tutmadan
> hiçbir edinme yatırımı yapılmaz.

### 5. Zirvede satmak / kontrolü kaybetmek — **4 vaka**
Sweat→iFIT ($400M → A$85M zarar → geri alım), Yummly→Whirlpool (kapandı),
PlateJoy→RVO Health (kapandı), Jennis→Orreco (bağımsız kalamadı).
> **Bizim kuralımız:** Bu bizim şu anki problemimiz değil ama ilkesi geçerli:
> **hiçbir tek partiye (platform, veri sağlayıcı, tek creator) hayati bağımlılık kurma.**

### 6. Yalnızca süper kullanıcı için ürün geliştirmek — **3 vaka**
Fitbod (itiraf edilmiş), MacroFactor (ciddi lifter dışına hiç çıkmadı — bilinçli),
Boostcamp (program-meraklısı Reddit kitlesi).
Fitbod'un itirafı: abone geri bildirimine güvenip **dönüşmeyenlerin neden dönüşmediğini** araştırmamak.
> **Bizim kuralımız:** Her ay **dönüşmeyen 5 kullanıcıyla** konuş. Aboneyle değil.

### 7. Mevcut kullanıcıya verilen sözü bozmak — **3 vaka**
Whoop (ücretsiz donanım yükseltme sözü → geri adım → kriz → geri dönüş),
Nutritionix (ücretsiz/indie API katmanını kaldırdı), Yummly/PlateJoy (veri göçü imkânı vermeden kapandı).
> **Bizim kuralımız:** Söz verme. Verdiğin sözü sonsuza kadar taşı. **Lifetime plan satma** —
> Hevy'nin $75 lifetime'ı bugün onun için kalıcı bir maliyet kalemi.

### 8. Beden imajı üzerinden normatif yargı & aşırı veri toplama — **2 vaka**
Amazon Halo (Body Scan "vücudun nasıl görünmeli" + Tone ses analizi → senatör mektubu → kapanış),
Sweat (BBG'nin erken dönemi, "bikini body" çerçevesi eleştirildi).
> **Bizim kuralımız:** Ürün **performans ve sağlık** konuşur, görünüş üzerinden yargı kurmaz.
> Fotoğraf/mikrofon gerektiren hiçbir zorunlu akış yok. Veri cihazda kalır (Athlytic modeli).

### 9. İnsan koçluğunu ölçekleme sanmak — **3 vaka**
Zoe (koçluk ekibinin %80'i işten çıkarıldı), Stronger U (9 yıl sonra kapatıldı),
Caliber (insan koç + app hibriti, büyüyemedi).
> **Bizim kuralımız:** İnsan koç yok. Ürünün tamamı **karar veren yazılım**. Bu bir kısıt değil,
> tam da pazarın kanıtladığı doğru mimari.

### 10. Ekibi gelirden önce büyütmek — **3 vaka**
Zoe (CEO itirafı: *son altı ayda ekibi aşırı büyüttük* → 139 kişi çıkarıldı),
Vitruvian ($15M sonrası kadro dağıldı), Flex AI (Mart 2026 kapandı).
Karşı örnek: GymStreak $2,5M/yıl **sıfır tam zamanlı çalışanla**; Hevy ilk işe alımı **2,5 yıl** sonra.
> **Bizim kuralımız:** Tek kişi + sözleşmeli. İlk tam zamanlı işe alım, gelir onu **12 ay**
> finanse edebildiğinde.

### 11. Tek özelliklik ürünle geç girmek — **2 vaka**
Cal AI klonları (onlarca, hiçbiri tutmadı), Bevel/Athlytic'in birbirini kopyalaması.
Cal AI'ın MyFitnessPal'a satılması bunu mühürledi: **AI kalori tarama artık bir özellik, kategori değil.**
> **Bizim kuralımız:** Tek özellik üzerine ürün kurma. Bizim savunma hattımız
> **karar mantığı + bilimsel gerekçelendirme**, tek bir arayüz numarası değil.

### 12. Ön talebi retention sanmak — **2 vaka**
Vi/LifeBEAM ($1,7M Kickstarter, 30 dakikada → üretimden kalktı), Zing Coach (%25 MoM iddiası, doğrulanamadı).
> **Bizim kuralımız:** Waitlist sayısı bir metrik değil. Ölçtüğümüz tek şey **haftalık aktif
> kullanım** ve **D30**.

### 13. Üçüncü taraf veri katmanına bağımlılık — **1 vaka (ama kategorik risk)**
Nutritionix: Syndigo satın aldı → ücretsiz/indie erişim kaldırıldı.
> **Bizim kuralımız:** Çekirdek gıda veritabanının en çok kullanılan kısmını (~2-5K öğe) **sahiplen**.
> Üçüncü taraf sadece uzun kuyruk için.

### 14. "Sunset mode" — sessizce terk etmek — **3 vaka**
Wattson Blue, Vi, Setgraph (risk altında).
Uygulama mağazada kalır, güncelleme durur, kullanıcı yavaşça gider. Ölümlerin çoğu böyle.
> **Bizim kuralımız:** Kanal (YouTube) ürünü finanse ettiği sürece "sunset" bir seçenek değil.
> İkisi birbirini besliyorsa hiçbiri tek başına ölmez.

---

# BÖLÜM E — (b) İŞE YARAYAN HAMLELER

Frekansa göre sıralı.

### 1. Önce içerik/kitle, sonra ürün — **5 vaka**
MacroFactor (Stronger by Science, yıllarca literatür review'ı → 75K ödeyen abone, ayda **6-7K net yeni**),
StrengthLog (2011'den beri blog, **1.000+ ücretsiz makale** → 2018 app),
Freeletics (önce **PDF sattılar**, sonra app),
Sweat (BBG PDF + Instagram → app),
Boostcamp (Reddit topluluğunun kanonik programlarını paketlediler).
> **Bizim kuralımız:** Bu **tam olarak bizim yolumuz.** YouTube kanalı ürün değil, dağıtım altyapısı.
> Ürün lansmanı, kanal bir kitle kanıtladıktan sonra. Ve MacroFactor'ün free-tier-yok kararını
> kopyalamak ancak kitle **ödemeye alışmış** olduğunda mümkün.

### 2. Takip etmekten karar vermeye geçmek — **4 vaka**
Fitbod (beta'da pivot: gelişmiş tracker → önerilen plan; $20M ARR, 300K+ ödeyen abone),
Runna (Strava'nın "kaydediyor ama söylemiyor" boşluğu → **Strava tarafından satın alındı**),
MacroFactor (hedefleri gerçek veriye göre **otomatik ayarlar**),
Alpha Progression (otomatik progressive overload).
**Fiyat kanıtı:** Hevy (takip eden) $24/yıl vs Runna (karar veren) **$119,99/yıl** — **5x**.
> **Bizim kuralımız:** Ürün tezi doğrulandı ve **fiyatlanabilir.** Karar veren ürün, takip eden
> üründen 4-5x fiyatlanıyor. Bizim fiyat aralığımız $60-120/yıl olmalı, $24 değil.

### 3. Sosyal katmanı gün 1'de koymak — **3 vaka**
Hevy (tracking + analytics + **social** aynı MVP'de; kendiliğinden oluşan topluluklar PMF sinyali oldu;
family plan en yüksek retention),
Freeletics (kullanıcı dönüşüm videoları YouTube'da viral oldu — şirket üretmedi),
Fitbod (referans programı: link paylaşınca **6 ücretsiz antrenman**).
**Mekanizma:** çift kilit — kullanıcı hem **veri** hem **ilişki** yatırır. Veri taşınabilir,
ilişki taşınamaz.
> **Bizim kuralımız:** v1'de en az bir sosyal ilmek olmalı. Tam feed olması gerekmez; paylaşılabilir
> bir **çıktı birimi** yeter (Freeletics'in isimlendirilmiş antrenmanları gibi).

### 4. Rakibin fiyat açığından girmek — **3 vaka**
Athlytic ($24,99/yıl vs Whoop ~$30/**ay** — 14x ucuz, aynı çıktı: recovery skoru),
Hevy (rakiplerin %50 altı, bilinçli: *"people are more likely to tell their friends if it's an absolute steal"*),
Bevel (aynı niş).
> **Bizim kuralımız:** Konumlandırmayı **var olan pahalı bir alternatifin fiyat açığı** üzerinden
> kur. Bizim için o alternatif: **kişisel antrenör / beslenme uzmanı** (aylık yüzlerce dolar).

### 5. Apple editoryal görünürlüğünü hedeflemek — **4 vaka**
Gentler Streak (**2022 Apple Watch App of the Year** + **2024 Apple Design Award** → The Verge,
Forbes, TechCrunch zinciri), Runna (2024 Apple App of the Year finalisti), Hevy (2020 feature),
GymStreak (App Store feature'ları listelenen kanallar arasında).
Bu **satın alınamaz**, kazanılır: tasarım kalitesi + yeni platform API'lerine **ilk gün** destek.
> **Bizim kuralımız:** iOS-önce zaten planımız. Buna ek: her yeni watchOS/iOS API'sine (Widget,
> Live Activity, Control Center, Health API'leri) ilk dalgada destek ver. Apple'ın editör ekibi
> tam olarak buna bakıyor. Sıfır bütçeli en büyük kaldıraç bu.

### 6. Aşırı sıkı MVP + acımasız kesim — **3 vaka**
Hevy (2018 tasarımlarının çoğu bugün hâlâ yapılmadı; 3 sütun: tracking/analytics/social),
GymStreak (ürünü **üç kez sıfırdan** yazdı, sonra 10x),
Cal AI (tek özellik: fotoğrafla kalori).
> **Bizim kuralımız:** MVP = **karar mantığı + tek bir güven kanıtı (kaynak/gerekçe gösterimi)**.
> Kalan her şey v2.

### 7. Native creator içeriği (reklam gibi durmayan) — **2 vaka**
Cal AI (sistematik TikTok creator outreach, native tarzda videolar → **aylık $2M gelir**;
yaratıcı formülü: spor salonunda biri, müzik, hızlı bir tarama),
Freeletics (kullanıcı dönüşüm videoları, ücretsiz).
> **Bizim kuralımız:** Levent'in kendi kanalı **bu formatı ücretsiz üretiyor.** Cal AI'ın
> $500K MrBeast bütçesine ihtiyacımız yok; ihtiyacımız olan **kendi creator'ımız olmak**.
> Bu bizim tek yapısal avantajımız.

### 8. Gün-0 ROAS eşiğine kilitlenmek — **1 vaka ama en somut sayı**
GymStreak: **gün-0'da 1,5x ROAS**. Reklam masrafı ilk gün geri geliyor → dış sermaye gereksiz,
kârlı ölçekleme. Bu eşiğe ulaşması **ürünü üç kez yeniden yazmasını** gerektirdi ve gelir
$300K → $2,5M oldu.
> **Bizim kuralımız:** Reklam kararı bir inanç değil bir eşik. Eşik: **gün-0 ROAS ≥ 1,0**.
> Altındaysak reklam yok, ürün üzerinde çalışılır.

### 9. Ücretsiz kataloğu edinme kancası + UGC flywheel yapmak — **2 vaka**
Boostcamp (11.000+ ücretsiz program; web **Program Creator** ile kullanıcılar 10 dakikada program
üretip yayınlıyor → katalog kullanıcı tarafından büyüyor; 600K+ kullanıcı),
StrengthLog (1.000+ ücretsiz makale + sonsuza kadar ücretsiz temel takip).
> **Bizim kuralımız:** Kanalın ürettiği her video için, uygulamada **ücretsiz erişilebilir bir
> karşılık** olsun (protokol, hesaplayıcı, program). Video → uygulama → abone hattı böyle kurulur.

### 10. Gizlilik ve cihaz-içi işlemeyi konumlandırma yapmak — **2 vaka**
Athlytic (App Store etiketi **"Data Not Collected"**, her şey Apple Health üzerinden cihazda),
MacroFactor (free tier yok → reklam yok → veri satışı yok; teşvikler kullanıcıyla hizalı).
Karşı kutup: Amazon Halo (bulutta vücut fotoğrafı → kapandı).
> **Bizim kuralımız:** "Reklam yok, veri satmıyoruz, hesaplama cihazında" **satılabilir bir
> özellik**. Free tier'sız modelin en güçlü gerekçesi de bu.

### 11. Uzun süre 1-2 kişi kalmak — **4 vaka**
Hevy (ilk işe alım 2,5 yıl sonra), Fitbod (yıllarca 2 kurucu, ilk para seed'den 1,5 yıl önce),
Athlytic (**iki kişi**, yatırımsız), GymStreak (**sıfır tam zamanlı çalışan**, 4 sözleşmeli, $2,5M/yıl).
Karşı örnek: Zoe (aşırı büyüme → 139 kişi çıkarma).
> **Bizim kuralımız:** Tek kişi + Codex/CLI otomasyonu. Bu bir dezavantaj değil — kategorinin
> en kârlı örnekleri bu boyutta.

### 12. Ramen-kârlılığa kadar düşük yaşam maliyeti — **2 vaka**
Hevy (işsizlik maaşı + ailesiyle yaşamak, **~1,5 yıl** ramen-kârlılığa),
Freeletics (2017'ye kadar tamamen bootstrap).
> **Bizim kuralımız:** Öğrenci bütçesi ve yurt odası bir kısıt değil, **runway**. Hevy tam olarak
> bu koşulda başladı.

---

# BÖLÜM F — BİZİM MODELİMİZE (bootstrap · kitlesiz · iOS-önce) EN UYGUN 3 ÖRÜNTÜ

### Örüntü 1 — "İçerik → güven → ürün" sırası (MacroFactor · StrengthLog · Freeletics)
Kategoride kitlesiz bootstrap lansmanının **tek tekrarlanan başarı yolu** bu. Üç vakanın üçünde de
ürün, **var olan bir içerik varlığının parasallaştırılması**ydı — pazarlaması yapılan yeni bir ürün değil.
StrengthLog 7 yıl blog yazdı. Freeletics önce PDF sattı. MacroFactor Greg'in Excel'iydi.
**Uygulama:** YouTube kanalı önce. Kanal, ürünün **hem dağıtımı hem kanıtı** olur — "AI slop yok"
kırmızı çizgisiyle de tam uyumlu, çünkü her video gerçek bir kaynağa dayanmak zorunda.
**Ve bir ara adım var:** uygulama yazmadan önce **PDF/protokol sat** (Freeletics modeli). Talebi
kanıtlar, para getirir, ürünü finanse eder.

### Örüntü 2 — "Karar veren ürün, 4-5x fiyatlanır" (Fitbod · Runna · MacroFactor)
Fitbod bunu **beta'da** keşfetti ve pivot etti. Runna bunun üzerine kuruldu ve Strava tarafından
satın alındı. Fiyat kanıtı sert: Hevy (takip eden) $24/yıl, Runna (karar veren) $119,99/yıl.
**Uygulama:** Ürün tezimiz ("sadece takip etmeyen, karar veren") pazarda ödenmiş bir exit'le
doğrulanmış durumda. Ve fiyatı **$60-120/yıl** aralığında konumlandırmalıyız — Hevy fiyatına
inmek hem geliri hem algılanan değeri kırar, ve Hevy'nin kendisi bu tuzağa düştüğünü itiraf ediyor.

### Örüntü 3 — "Apple editoryal görünürlüğü, sıfır bütçelinin tek kaldıracı" (Gentler Streak · Runna · Hevy)
Gentler Streak dört kişilik bir Slovenya ekibiydi; **Apple Watch App of the Year** ve **Apple Design
Award** aldıktan sonra The Verge/Forbes/TechCrunch zinciri kendiliğinden geldi. Bu, kategoride
sıfır bütçeyle erişilebilen **tek büyük dağıtım olayı**. Satın alınamaz, ama hedeflenebilir:
tasarım kalitesi + yeni platform API'lerine ilk gün destek + net bir "insani" hikâye.
**Uygulama:** iOS-önce kararı zaten doğru. Buna ek: her watchOS/iOS sürümünün yeni API'lerine
(Widget, Live Activity, Health, Control Center) ilk dalgada destek ver ve Apple'a
**App Store Featuring formu** üzerinden aktif başvur. Maliyeti sıfır, beklenen değeri en yüksek hamle.

---

## Doğrulanamayanların listesi
- Hevy ~$600K/ay (2026) — birincil kaynak yok.
- Hevy $240K ARR (Latka 2023) ile "$2M gelir" (OBJ 2022) **birbiriyle çelişiyor**.
- MacroFactor'ün SBS kitlesinden gelen kullanıcı oranı — hiçbir kaynakta sayı yok.
- Cal AI geliri: $30M / $40M / $50M — üç farklı rakam, hiçbiri denetlenmiş değil.
- Runna satın alma bedeli — açıklanmadı.
- Ladder'ın $127M'ı — doğrulanan rakam $105M.
- Zing Coach %25 MoM — şirket beyanı.
- Gymshark Training "donduruldu" / Caliber "çöktü" / FitnessAI "öldü" — üçü de doğrulanamadı,
  aksine aktif görünüyorlar.
- Alpha Progression, Bevel, Setgraph, Boostcamp gelirleri — bulunamadı.
- Runna'yı **Nike almadı, Strava aldı** (17 Nisan 2025).

*Dosya tamamlandı: 2026-09-11.*
