# I1 · Onboarding, Alışkanlık ve İlk 8 Hafta — Ham Araştırma

**Tarih:** 2026-09-10 · **Durum:** tamamlandı
**Kapsam:** A) onboarding · B) fiziksel kanıt yokken ilk 4 hafta · C) alışkanlık/günlük döngü ·
D) check-in & bildirim · E) paywall/trial/iptal · F) 8 haftalık tasarım önerisi

## Doğrulanmış giriş verisi (tekrar araştırılmadı — brief'ten)
| Veri | Kaynak |
| --- | --- |
| Fitness app D30 retention %4 | brief |
| Salonda %63 üçüncü aydan önce bırakıyor | Sperandei 2016 |
| %50+ iptal etmeden sürükleniyor; %80 "geri getirebilecek bir şey vardı" | Zenoti 2026 |
| Kilo gürültüsü SD 0,42 kg · foto eşiği 1,2 kg yağ · bel 0,3 cm/hafta ± 1 cm hata | H1-olcum |
| Koç tespiti: arıza hafta 5, kayıp hafta 7, "bozdum" hafta 8 | kaynak koç transkript |

## En kritik 3 bulgu (özet)
1. **arXiv 2501.01779** (Mars Athletic Club, Türkiye, 2022–2023): 6. haftada üyelerin %50'si seriyi
   kaybediyor, 17. haftada %80. Geçmenin eşiği: **ilk 6 haftada ≥9 ziyaret (~2/hafta).** Seri
   **1 hafta affıyla**, ancak 2 ardışık hafta devamsızlıkta kırılıyor. → Koçun "hafta 5" tespitinin
   bağımsız doğrulaması + streak kararının kanıt temeli. (§C-EK)
2. **Fiziksel kanıt yokken gösterilecek şey uydurma olmak zorunda değil:** erken davranışsal
   adherence 6. ay sonucunu R=0,52 ile, günde ≥2 öğün kaydı R²=0,27 ile yorduyor. (§B2)
3. **Bildirimin nedensel etkisi +%3,9** (mikro-randomize deneme, n=1.255). Hafta içi etkisi
   sıfırdan ayırt edilemiyor. Bildirim kaldıraç değil. (§D2)

---

# A · İlk oturum ve onboarding

## A1 · Onboarding uzunluğu: sürtünme mi, yatırım gerekçelendirmesi mi?

İki karşıt bulgu var ve **ikisi de doğru** — ayrım "soru ne işe yarıyor" noktasında.

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Paywall öncesi 3–5 ekran, 1–2 ekrandan da 6+ ekrandan da iyi dönüşüyor | — | [RocketShip HQ / Phiture derlemesi](https://www.rocketshiphq.com/optimize-app-paywall-higher-conversion/) |
| Noom'un onboarding'i **113 ekran**, ~15 dakika — ve dönüşüyor | 113 ekran | [RevenueCat teardown](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel), [Growthwaves](https://www.growthwaves.io/p/the-113-screen-onboarding-that-doesnt) |
| Fitness'ta paywall'ı "değer anı"ndan sonra tetikleyen uygulamalarda trial başlatma oranı **2,1×** | 2,1× | [RocketShip HQ / Adapty](https://www.rocketshiphq.com/paywall-optimization-fitness-apps/) |
| Gate'lemeden önce değer veren uygulamalarda trial→paid **1,5–2×** | 1,5–2× | [RocketShip HQ](https://www.rocketshiphq.com/paywall-structure-fitness-app-workouts/) |

**Uzlaştırma:** Noom'un 113 ekranı "veri toplama" değil — her adımda kullanıcıya bir şey **geri veriyor**
(yansıtma, isimlendirme, "senin gibi 40 yaş üstü kadınlarda şu görülüyor"). RevenueCat teardown'ının
tespiti bu: *veri toplamak yerine her adımda değer geri veriyorlar.* Yani uzunluk değil, **ekran başına
geri verilen değer** belirleyici.

> **Karar kuralı:** Bir soruyu ancak (a) cevabı ilk 7 gün içinde ürünün davranışını görünür şekilde
> değiştiriyorsa **veya** (b) sorunun kendisi kullanıcıya bir içgörü veriyorsa sor. İkisi de yoksa
> soruyu 3. haftaya ertele (progressive profiling).

⚠️ "Investment/effort justification" (IKEA etkisi / çaba gerekçelendirme) için fitness app bağlamında
**doğrudan randomize kanıt bulunamadı.** Noom vakası gözlemsel — kontrol grubu yok. Bunu hipotez
olarak işaretle, kanıt olarak değil.

## A2 · İlk 5 dakika: "aha moment"

| Bulgu | Sayı | Kaynak | Not |
| --- | --- | --- | --- |
| 5 dk içinde aha yaşatan ürünlerde D30 retention %40 daha yüksek | +%40 | [ProductQuant](https://productquant.dev/blog/5-minute-aha-rule-optimize-ttv/) | ⚠️ vendor blogu, hakemli değil |
| Aktivasyon oranı, downstream'in tek en güçlü öncü göstergesi | — | [Appcues](https://www.appcues.com/blog/user-onboarding-metrics-and-kpis) | ⚠️ vendor |
| Retention'la korele olmayan "aha" olayı **vanity metrik**tir | — | [Userpilot](https://userpilot.com/blog/aha-moment/) | metodolojik uyarı |

Bu literatürün tamamı vendor içerik pazarlaması. Hakemli kaynak **bulunamadı**. Yine de operasyonel
tanım işe yarar: *aha = uzun vadeli retention'la en yüksek korelasyona sahip ilk eylem.*

**Fitness'taki karşılığı (bizim ürün için hipotez):** ilk 5 dakikada gösterilecek şey fiziksel sonuç
olamaz (yok). Gösterilebilecek tek gerçek değer: **kullanıcının kendi verisinden çıkan, kendisinin
bilmediği bir çıkarım.** Örn. "Anlattığın haftalık düzende gerçekçi olarak haftada 2,7 antrenman
sığıyor, 5 değil — plan buna göre kuruldu." Bu, veri toplamayı değer anına çevirir.

## A3 · Hedefi kullanıcı mı koyar, sistem mi önerir?

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Hedef koymanın davranış değişimine benzersiz etkisi | d = 0,34 | [Epton/Currie/Armitage meta-analizi 2017](https://dspace.stir.ac.uk/bitstream/1893/25978/1/goal%20meta%20(2017.09.25).pdf) |
| Zor hedefler kolay hedeflerden güçlü etki yapıyor (moderatör: hedef zorluğu) | — | aynı meta-analiz |
| **Statik** hedef: başta adım sayısını artırıyor, sonra düşürüyor. **Uyarlanabilir (adaptive)** hedef: başlangıç artışı küçük ama 4 ay boyunca tutarlı | — | faktöriyel deneme, [Stronger by Science derlemesi](https://www.strongerbyscience.com/goal-setting/) |
| Yüksek kilo kaybı beklentisi → 12. ayda **daha yüksek** attrition (bağımsız bilişsel yordayıcı) | — | [Dalle Grave ve ark., çok merkezli gözlemsel](https://pubmed.ncbi.nlm.nih.gov/16339128/) |
| Nüans: tedavi **ücretsiz**se, gerçekçi olmayan hedefi tutturamamak dropout'u artırmıyor. **Ücretliyse** artırması bekleniyor | — | [Int J Obesity incelemesi](https://www.nature.com/articles/0803649) |

**Bizim için kritik:** Ürün abonelikli (ücretli). Yani gerçekçi olmayan hedef bizde **en riskli** senaryo.
Literatür açık: *gerçekçi olmayan hedefler tedavinin en başında ele alınmalı.*

> **Karar:** Hedefi kullanıcı söyler (özerklik), sistem **yeniden çerçeveler** — reddetmez.
> "12 haftada 15 kg" girildiğinde "hayır" demek yerine: aynı hedefi zaman eksenine yay ve
> ilk 8 haftanın **süreç** karşılığını göster. Hedefi silmek özerkliği kırar; takvimlendirmek kırmaz.

## A4 · Onboarding'de sorulmayacaklar

Sorulmaması gerekenler için doğrudan kanıt zayıf; ama iki dolaylı kanıt var:
- Diyet self-monitoring'de **10. haftadan sonra örneklemin yarısından azı hâlâ takip ediyor**
  ([Payne 2022 ve ark. derlemesi](https://pmc.ncbi.nlm.nih.gov/articles/PMC8928602/)) → veri girme
  yükü zamanla çöküyor; onboarding'de toplanan ama sonra güncellenmeyen alan ölü veridir.
- Adaptive goal bulgusu → başlangıçta girilen sabit parametre (hedef kilo, hedef tarih) zamanla
  yanlışlaşıyor. Onboarding'de **dondurulan** her sayı 4. haftada borç olur.

# B · İlk 4 hafta: fiziksel kanıt yokken ne gösterilir

Bu bölüm brief'teki en sert kısıtın cevabı: **bırakma penceresi (hafta 5–8) ile fiziksel kanıtın
yokluğu (hafta 0–4) üst üste biniyor.** Literatür bu çakışmaya doğrudan cevap vermiyor ama üç ayrı
yerden gelen kanıt birleşince kullanılabilir bir çözüm çıkıyor.

## B1 · Süreç hedefi vs sonuç hedefi

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Hedef koymanın benzersiz etkisi (tüm davranışlar) | d = 0,34 | [Epton ve ark. 2017 meta-analizi](https://dspace.stir.ac.uk/bitstream/1893/25978/1/goal%20meta%20(2017.09.25).pdf) |
| Statik hedef: erken artış → sonra düşüş. Adaptive hedef: küçük artış → 4 ay boyunca korunuyor | — | faktöriyel RCT, [SbS derlemesi](https://www.strongerbyscience.com/goal-setting/) |
| Fizyoterapi adherence'ında BCT'lerin genel etkisi "küçük"; **booster seans, süpervizyon, kademeli egzersiz** orta düzey kanıtla öne çıkıyor | — | [panoramik meta-analiz 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11106864/) |

⚠️ **Dürüst tespit:** "süreç hedefi sonuç hedefinden üstündür" diyen doğrudan, başlık düzeyinde bir
meta-analiz **bulunamadı.** Bulunan şey daha dolaylı ama daha güçlü: *sonuç hedefi ilk 4 haftada
zaten ölçülemiyor* — yani sonuç hedefi bu pencerede fiilen **geri bildirim üretmeyen** bir hedef.
Süreç hedefinin üstünlüğü teorik değil, **ölçülebilirlik** kaynaklı.

## B2 · Leading indicator: hangi davranış metriği gerçekten sonucu öngörüyor?

Bu, bölümün en değerli kısmı. "Uydurma leading indicator" (rozet, puan) ile **gerçekten yordayıcı**
metriği ayıran kanıt var.

| Öncü gösterge | Yordama gücü | Kaynak |
| --- | --- | --- |
| **Erken davranışsal adherence** (ilk aylar) → 6. ayda % kilo kaybı ve bel çevresi | **R = 0,52** (6 ay), R = 0,37 (24 ay) | [POUNDS LOST, Acharya ve ark. 2009, J Behav Med](https://pubmed.ncbi.nlm.nih.gov/20195742/) |
| **Günde ≥2 öğün kaydedilen gün sayısı** → 6. ay kilo kaybı | **R² = 0,27** (p<0,001); tüm adherence tanımları arasında en çok varyansı açıklayan | [Payne ve ark. 2019, J Acad Nutr Diet](https://pubmed.ncbi.nlm.nih.gov/31155473/) |
| Haftada ≥6 gün kilo/yemek logu → haftada 2 gün loglayana göre **1,7× daha fazla kilo kaybı** | 1,7× | koçluk denemesi derlemesi, [Eureka Health](https://www.eurekahealth.com/resources/weight-loss-coach-online-worth-it-accountability-en) ⚠️ vendor derlemesi |
| **Fiziksel aktivite hedefi tutturma (PA goal attainment)** — erken dönemde yanıt verenle vermeyeni ayıran yeni bir işaret | — | [latent class analizi, Obesity/JMIR](https://pmc.ncbi.nlm.nih.gov/articles/PMC8672928/) |
| İlk **1–2 ay**daki kilo kaybı, ilk 1–3 haftadan **daha iyi** uzun vade yordayıcısı (ilk 3 hafta herkeste iyi, ayrıştırmıyor) | — | aynı kaynak |

**Buradan çıkan tasarım kuralı:** İlk 4 haftada kullanıcıya gösterilecek metrik, *rastgele bir
davranış sayacı* değil — **6. ay sonucunu istatistiksel olarak yordadığı gösterilmiş** olan davranış
olmalı. Bizde bu ikisi:
1. **Kayıt tutarlılığı** (günde ≥2 öğün kaydedilen gün sayısı) — R²=0,27
2. **Antrenman/aktivite hedefi tutturma oranı** — erken ayrıştırıcı

Ve bu dürüst bir mesaj: *"Bunu ölçüyoruz çünkü ölçülebilen tek şey bu değil — 6. ay sonucunu
öngördüğü gösterilen şey bu."*

⚠️ Uyarı: bu çalışmalar **kilo kaybı** bağlamında. Kas kazanımı / performans hedefli kullanıcı için
aynı R değerleri **doğrulanmadı** — genellenebilirliği varsayım.

## B3 · Performans erken sinyal olarak: bilimsel olarak dürüst mü?

**Evet, koşulla.** Kanıt:

| Bulgu | Kaynak |
| --- | --- |
| İlk 4 haftadaki kazanım ağırlıklı olarak **nöral** — kas mimarisi ve twitch özellikleri değişmemiş | [Frontiers in Physiology 2025 derlemesi](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1598149/full) |
| Anlamlı kas lifi hipertrofisi ancak **6. haftadan sonra** tespit edilebiliyor | aynı |
| Motor ünite recruitment ve ateşleme verimliliği artıyor; EMG aktivitesi ve agonist-antagonist koordinasyonu **hipertrofiden önce** ölçülebilir değişiyor | aynı |
| Cross-education: eğitilmemiş uzuvda 4. haftada MVF **+%7**, 8. haftada **+%10** → yani gözlenen kuvvet artışının önemli kısmı kas dışı | [J Physiol 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11747592/) |

> **Dürüstlük testi:** "Güçleniyorsun" demek **doğru**. "Kas yapıyorsun" demek ilk 4 haftada
> **yanlış.** Ürünün diline geçmesi gereken ayrım tam olarak bu. Kullanıcıya söylenebilecek dürüst
> cümle: *"Bu artış şu an büyük ölçüde sinir sisteminin öğrenmesi — kas henüz değil. Bu normal ve
> beklenen sıra; kas kısmı 6. haftadan sonra ölçülebilir hale geliyor."*

Bu, "sahte ilerleme rozeti"nden farklı: gerçek bir fizyolojik olayı, doğru adıyla raporluyor.

## B4 · "4 hafta boyunca bir şey görmeyeceksin" demek bırakmayı artırır mı?

Bu brief'te "kritik" işaretlenmişti. **Doğrudan RCT bulunamadı.** Ama iki yönlü dolaylı kanıt var:

**Beklentiyi düşürmek lehine:**
| Bulgu | Kaynak |
| --- | --- |
| Yüksek kilo kaybı beklentisi, 12. ayda attrition'ın **bağımsız** yordayıcısı — beklenti yükseldikçe bırakma artıyor | [Dalle Grave ve ark., çok merkezli](https://pubmed.ncbi.nlm.nih.gov/16339128/) |
| "Gerçekçi olmayan kilo hedefleri tedavinin **en başında** ele alınmalı" | [Karger, Obesity Facts](https://www.karger.com/article/FullText/441366) |
| Tedavi **ücretliyse**, beklentiyi tutturamamanın bırakma riski daha yüksek | [Int J Obes incelemesi](https://www.nature.com/articles/0803649) |

**Karşı taraf (dikkat):**
| Bulgu | Kaynak |
| --- | --- |
| Tedavi **ücretsiz**se, gerçekçi olmayan hedefi tutturamamak dropout'u veya psikososyal sonuçları kötüleştirmiyor | aynı inceleme |
| Ticari programda "gerçekçi beklenti + kaybedilen kiloyla tatmin" teşvik etmenin etkisi **belirsiz/karışık** | [SpringerPlus ön çalışma](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4164670/) |

> **Sonuç:** Kanıt, *beklentiyi baştan kalibre etmeyi* destekliyor — ama "hiçbir şey görmeyeceksin"
> formunu değil. Fark önemli: literatür **beklenti düşürmeyi** destekliyor, **umut kesmeyi** değil.
> Doğru form: sonuç beklentisini takvime yay **ve** aynı anda görülecek başka bir şey **koy**.
> Boşluk bırakmak (hiçbir geri bildirim yok) kanıtla desteklenmiyor.

# C · Alışkanlık ve günlük döngü

## C1 · Alışkanlık kaç günde oturuyor?

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Otomatikliğin asimptotunun %95'ine ulaşma **medyanı** | **66 gün** (aralık 18–254) | [Lally ve ark. 2010, Eur J Soc Psychol](https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674) |
| Örneklem | 96 kişi, 84 gün günlük raporlama | aynı |
| **Kritik nüans:** 66 gün, katılımcıların **%48'i** (başaranlar) için geçerli; çoğu **basit** davranış | %48 | [Behavioral Scientist analizi](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit) |
| **Bir günü kaçırmak eğriyi bozmadı** | — | Lally 2010, orijinal bulgu |
| Su içmek gibi basit davranışlar ~66 günde plato; **tam bir antrenman gibi karmaşık davranışlar çok daha uzun ve çok daha değişken** | — | [Steps özeti](https://steps.org/sources/lally-2010-habit-formation/) |

> **Bizim için:** "8 hafta = 56 gün" alışkanlık oturması için **yetmiyor** — özellikle antrenman gibi
> karmaşık bir davranış için. 8 haftalık program alışkanlık *kurmaz*, alışkanlığın **eğrisine
> bindirir.** Ürünün vaadi buna göre kurulmalı. Ve Lally'nin en pratik bulgusu doğrudan streak
> tasarımına giriyor: **bir gün kaçırmak eğriyi bozmuyor.**

## C2 · Neyi tekrar ettirmeli: ipucu (cue) tutarlılığı

Bu, "alışkanlığı hızlandıran faktör" sorusunun en net cevabı — ve şaşırtıcı bir şey söylüyor.

**Meta-analiz: 14 çalışma, 6.069 katılımcı** ([PMC13467471](https://pmc.ncbi.nlm.nih.gov/articles/PMC13467471/))

| İpucu tipi | Alışkanlık gücüyle (r) | **Fiili davranışla (r)** |
| --- | --- | --- |
| **Zamansal** (aynı saat) | 0,16 ✓ | **0,11 ✓ anlamlı** |
| **Rutin** (başka bir davranışın ardına bağlama) | 0,16 ✓ | **0,13 ✓ anlamlı** |
| Sosyal (aynı kişiler) | 0,15 ✓ | 0,09 ✗ anlamlı değil |
| Mekân (aynı yer) | 0,12 ✓ | 0,06 ✗ anlamlı değil |
| Ruh hali | 0,15 ✓ | 0,02 ✗ anlamlı değil |
| Genel | 0,20 | 0,11 |

> **Tasarım sonucu:** Fiili davranışı öngören tek iki ipucu **saat** ve **rutine bağlama.**
> Yer ve sosyal ortam istatistiksel olarak işe yaramıyor. Yani ürün "hangi salonda antrenman
> yapacaksın" sorusunu sormayı bırakıp **"hangi saatte" ve "hangi mevcut alışkanlığının ardına"**
> sorusuna odaklanmalı. Bu tek başına bir onboarding sadeleştirmesi.

Destekleyici: [tutarlı egzersiz saati fizibilite çalışması](https://pmc.ncbi.nlm.nih.gov/articles/PMC10722958/) —
sabit saat hem ipucu kuruyor hem zamanı koruyarak "vaktim yok" bariyerini düşürüyor.

## C3 · Implementation intentions ("X olursa Y yaparım")

| Bulgu | Etki büyüklüğü | Kaynak |
| --- | --- | --- |
| Genel hedefe ulaşma (tüm alanlar) | d = 0,65 (%95 GA 0,60–0,70) | Gollwitzer & Sheeran 2006 |
| **Fiziksel aktivite özelinde** | **g = 0,31** (post), g = 0,24 (takip) | [Bélanger-Gravel, Godin & Amireault meta-analizi](https://www.academia.edu/12403333/A_meta_analytic_review_of_the_effect_of_implementation_intentions_on_physical_activity) |
| Daha yeni tahmin | d = 0,14 (Sheeran ve ark. 2024) – d = 0,31 | [PMC11920387](https://pmc.ncbi.nlm.nih.gov/articles/PMC11920387/) |
| **Pekiştirme (reinforcement) olmadan implementation intention'ın yetişkin PA'sına anlamlı etkisi YOK**; pekiştirmeyle küçük-orta etki | — | [PLOS ONE sistematik derleme + meta-analiz](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0206294) |

> **Kritik uyarı:** Onboarding'de bir kez "eğer sabah 7'de uyanırsam antrenman yaparım" yazdırmak
> **tek başına etkisiz.** Etkili olması için tekrar pekiştirilmesi gerekiyor. Yani plan cümlesi
> onboarding'de kurulur, **haftalık check-in'de yeniden okunur/güncellenir.**

## C4 · Günlük ritim: kullanıcı günde kaç kez açıyor?

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Sağlık & fitness: gün 0'da **1,70** oturum/kullanıcı/gün → gün 7'de **0,29** → gün 14'te 0,25 → **gün 30'da 0,19** | — | [Adjust](https://www.adjust.com/blog/app-sessions/) |
| Ortalama oturum süresi | ~12 dk (2023: 11,76 → 2024 Ç1: 12,28) | [Adjust](https://www.adjust.com/blog/app-sessions/), [MWM](https://mwm.ai/glossary/session-length) |
| Diyet self-monitoring: **10. haftadan sonra örneklemin yarısından azı** hâlâ takip ediyor (tüm adherence tanımlarında) | <%50 | [PMC8928602 derlemesi](https://pmc.ncbi.nlm.nih.gov/articles/PMC8928602/) |
| Perşembe–Pazar arası self-monitoring anlamlı olarak düşüyor; **en düşük Cumartesi–Pazar** | — | [PMC11966970](https://pmc.ncbi.nlm.nih.gov/articles/PMC11966970/) |

> **Sert gerçek:** Gün 30'da ortalama kullanıcı uygulamayı **5 günde 1 kez** açıyor (0,19/gün).
> "Günlük etkileşim" varsayımı üzerine kurulan hiçbir mekanik ayakta kalmıyor. Ve hafta sonu
> sistematik olarak zayıf — bildirim/check-in takvimi buna göre kurulmalı, hafta sonunu
> **beklenen düşüş** olarak modelle, ihlal olarak değil.

## C5 · Streak: iki tarafı da

**Lehte (gerçek, ölçülmüş):**
| Bulgu | Sayı | Kaynak | Güven |
| --- | --- | --- | --- |
| Streak Freeze, streak kırma riski olan kullanıcılarda churn'ü **%21** düşürdü | %21 | Duolingo, [Lenny's Podcast / Jackson Shuttleworth özeti](https://www.recall.it/summary/business/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team) | orta (birinci ağız, hakemsiz) |
| 1 yerine 2–3 streak freeze'e izin vermek dönüş oranını ve DAU'yu anlamlı artırdı | — | aynı | orta |
| 7+ günlük streak'i olanlar, hiç streak kurmayanların **2,4×** oranında kalıyor | 2,4× | [Trophy.so derlemesi](https://trophy.so/blog/streaks-feature-gamification-examples) | ⚠️ düşük — seçilim yanlılığı: streak kuran kullanıcı zaten motive olandır, streak sebep değil sonuç olabilir |

**Aleyhte:**
| İddia | Sayı | Kaynak | Güven |
| --- | --- | --- | --- |
| 60+ günlük streak'i kıran kullanıcıların ~**%40**'ı iki hafta içinde ürünü terk ediyor | %40 | [High Five Studio](https://www.highfivestudio.co/posts/streak-resets-cost-23-of-users-at-day-17/) | ⚠️ **düşük** — vendor blogu, birincil kaynak gösterilmiyor |
| "2020 CHI çalışması: streak anksiyetesi alışkanlık app'i terk etmenin 1 numaralı sebebi"; "katı streak takip edenler bir gün kaçırınca %63 daha fazla tamamen bırakıyor" | %63 | [EHM-tech blog](https://www.ehm-tech.com/habit/blog/habit-streaks-do-they-actually-work/) | ⚠️ **doğrulanamadı** — CHI 2020'de böyle bir çalışma teyit edilemedi. **Kullanma.** |
| Koşu streak'i kıran rekreasyonel koşucularda geri tepme potansiyeli | — | [medRxiv 2024 ön baskı](https://www.medrxiv.org/content/10.1101/2024.12.26.24319676) | orta — ön baskı, tam metin çekilemedi (403) |
| "Streak creep": aşırı oyunlaştırma davranışı hedeften koparıyor | — | [The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification) | kavramsal |

**Ve en güçlü karşı-kanıt aslında Lally'den geliyor, streak literatüründen değil:**
> *Bir günü kaçırmak otomatiklik eğrisini bozmadı.* (Lally 2010)
> Yani **sıfırlanan streak, gerçekliğe aykırı bir yalan söylüyor.** Kullanıcının ilerlemesi
> gerçekte sıfırlanmadı; sayaç sıfırlandı. Streak'in asıl sorunu psikolojik değil, **ölçüm
> geçerliliği** sorunu.

### Streak yerine ne konur?
Kanıta en yakın alternatif: **haftalık oran + kayan pencere.** Gerekçe:
- Yordayıcı gücü gösterilmiş metrik zaten oran biçiminde: *"günde ≥2 öğün kaydedilen gün sayısı"*
  (R²=0,27, Payne 2019) ve *"haftada ≥3 gün kayıt"* eşiği literatürde standart.
- Hafta sonu düşüşü sistematik (PMC11966970) → günlük streak hafta sonunu ceza haline getiriyor.
- Duolingo'nun kendi çözümü de bu yöne gidiyor (freeze sayısını artırmak = fiilen oranı yumuşatmak).

## C6 · Kaçırma sonrası geri getirme (recovery)

| Bulgu | Kaynak | Güven |
| --- | --- | --- |
| Öz-şefkat, egzersiz lapse'i sonrası suçluluk ve utançla **negatif** ilişkili (öz-saygı, yaş, lapse önemi kontrol edildikten sonra) | [J Sport Exerc Psychol 2021](https://pubmed.ncbi.nlm.nih.gov/34702786/) | iyi (kesitsel) |
| Öz-şefkat lapse sonrası ruminasyonu azaltıp öz-düzenleme kaynağını serbest bırakıyor; içsel motivasyonla pozitif ilişkili | [Semenchuk ve ark. 2018](https://self-compassion.org/wp-content/uploads/2019/09/Semenchuk2018.pdf) | iyi |
| Diyet lapse'lerinde öz-şefkatin rolü (kilo hedefi güden fazla kilolu/obez yetişkinler) | [PMC8451927](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8451927/) | iyi |
| Abstinence Violation Effect: asıl felaket kayma değil, ardından gelen **utanç ve felaketleştirme çığı** | popüler klinik literatür, birincil değil | ⚠️ kavram sağlam, sayı yok |

**Zamanlama (ticari veri, hakemsiz):**
| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Push için reaktivasyon tetiği: **7, 14, 30 gün** hareketsizlik | — | [SEM Nexus](https://semnexus.com/app-reactivation-campaigns-timing-triggers-channel-mix) |
| 90 gün hareketsiz kullanıcı %10–12 reaktive oluyor; **180 gün → %2–4** | — | aynı |
| Pratikte sağlıklı re-engagement oranı ilk 30 günde **%8–12** | — | [Finsi derlemesi](https://www.finsi.ai/blog/win-back-email-campaign-guide/) |

> **Karar:** Geri getirme penceresi **kısa.** 7. günde müdahale etmeyen sistem, 90. günde %10'luk
> bir kurtarma oynuyor. Ve mesajın tonu kanıta göre **öz-şefkat çerçevesi** olmalı — suçlama veya
> "streak'in gitti" değil. Zenoti'nin %80'i ("beni geri getirebilecek bir şey vardı") tam bu boşluğu
> tarif ediyor.

# D · Check-in ve etkileşim ritmi

## D1 · Haftalık check-in

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Haftalık sanal geri bildirim, program dropout'unu **%40'tan ~%20'ye** düşürüyor | 40→20 | [Eureka Health derlemesi](https://www.eurekahealth.com/resources/weight-loss-coach-online-worth-it-accountability-en) ⚠️ vendor derlemesi, birincil RCT teyit edilemedi |
| 437 kişilik 3 kollu RCT: 1. ayda **yetersiz kilo kaybı** olanlara 3 veya 12 hafta telefon koçluğu vermek, hem kilo kaybını hem online programla etkileşimi iyileştirdi | n=437 | [Adaptive Telephone Coaching RCT](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11161849/) |
| Standart davranışsal kilo verme kadansı: **ay 1–3 haftalık**, ay 4+ aylık | — | çoklu protokol, [PMC13352420](https://pmc.ncbi.nlm.nih.gov/articles/PMC13352420/) |

> **En kullanışlı bulgu:** Adaptive coaching RCT'si, koçluğu **herkese değil, 1. ayda geri kalanlara**
> verdi ve işe yaradı. Yani check-in yoğunluğu sabit olmamalı — **1. ay sonundaki sinyale göre
> ayrışmalı.** Bu, bizim hafta 5 problemine doğrudan oturuyor.

Gün/saat için: self-monitoring Perşembe–Pazar düşüyor, en dip hafta sonu
([PMC11966970](https://pmc.ncbi.nlm.nih.gov/articles/PMC11966970/)) → check-in **Pazartesi**
mantıklı (hafta kapanışı + yeni hafta planı aynı anda). Saat için doğrudan kanıt bulunamadı; en
yakın veri MRT'den: hafta sonu 12:30'da etkileşim olasılığı zirve (+%11,8).

## D2 · Bildirim: kaç tane, ne zaman, hangi ton

**Hakemli, nedensel kanıt (altın standart burada):**
[To Prompt or Not to Prompt — mikro-randomize deneme](https://pmc.ncbi.nlm.nih.gov/articles/PMC6293241/),
n=1.255 kullanıcı, 89 gün, günde 6 karar noktası:

| Etki | Sayı |
| --- | --- |
| Uyarlanmış (tailored) sağlık mesajı → sonraki 24 saatte etkileşim | **+%3,9** (RR 1,039; %95 GA 1,01–1,08; p<0,05) |
| Hafta sonu | +%8,7 (GA 1,01–1,17) |
| Hafta içi | +%2,5 (GA 0,98–1,07) — **anlamlı değil** |
| Zirve: hafta sonu 12:30 | +%11,8 (%90 GA 1,02–1,13) |
| Zamanla zayıflama | var ama anlamlı değil (p=0,84) |

> **Bu sayı tasarımı değiştirmeli.** Kişiselleştirilmiş bildirimin nedensel etkisi **%3,9** — yani
> neredeyse hiç. Bildirim bir büyüme kaldıracı değil. Hafta içi etkisi istatistiksel olarak
> **sıfırdan ayırt edilemiyor.**

**Ticari veri (frekans ve opt-out):**
| Bulgu | Sayı | Kaynak | Güven |
| --- | --- | --- | --- |
| Haftada 2–5 mesaj alan kullanıcıların **%46**'sı bildirimi kapatıyor | %46 | [MoEngage](https://www.moengage.com/learn/push-notification-statistics/) | ⚠️ vendor |
| Haftada 6–10 mesajda kapatma **%32** | %32 | aynı | ⚠️ vendor, önceki satırla tutarsız (dikkat) |
| Abonelerin **%94**'ü haftada en az 1 bildirimi sorun etmiyor | %94 | aynı | ⚠️ vendor |
| Çoğu kategori için tavan: **haftada 3 bildirim** | 3 | [Business of Apps](https://www.businessofapps.com/marketplace/push-notifications/research/push-notifications-statistics/) | ⚠️ vendor |
| Günlük bildirim alanlarda retention %820, haftalıkta %440 daha yüksek (sıfıra göre) | — | aynı | ⚠️ **çok düşük güven** — korelasyonel, bildirimi açık tutan kullanıcı zaten bağlı olandır |

> **Karar:** Nedensel kanıt (+%3,9) ile korelasyonel iddia (+%820) arasındaki uçurum, ikincisinin
> seçilim yanlılığı olduğunu gösteriyor. Bildirimi **haftada ≤3** tut, hafta içi jenerik bildirimden
> kaçın (etkisi anlamsız), hafta sonu öğlen penceresini kullan.

## D3 · Sohbet arayüzü vs form

**Lehte (hakemli):**
| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Hastaların **%69,9**'u sohbet botunu online forma tercih etti; NPS 24 vs 13 (istatistiksel anlamlı) | %69,9 | [Virtual conversational agents vs online forms, PMC9606606](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9606606/) |
| **Ama:** sohbet botu tamamlaması **daha uzun sürdü** | — | aynı |
| Sohbet tarzı ankette veri kalitesi daha yüksek | — | aynı literatür hattı |
| Tek sayfa / çok sayfa / konuşma tarzı form kullanılabilirlik karşılaştırması | — | [PMC8190652](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8190652/) |

**Aleyhte:**
| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Kullanıcıların **%53**'ü chatbot'la etkileşimi insanla etkileşimden daha zor buluyor | %53 | [Master of Code derlemesi](https://masterofcode.com/blog/chatbot-statistics) ⚠️ vendor |
| Seçenek verilse tüketicilerin **%87**'si insanı tercih ediyor | %87 | aynı ⚠️ vendor |
| Chatbot frustrasyonunun gizli maliyeti gerçek | [California Management Review 2026](https://cmr.berkeley.edu/2026/04/chatbot-frustration-is-real-hidden-costs-and-best-practices/) | orta |
| Görev tipine bağlı: basit sipariş takibinde insan tercihi sadece %19 | %19 | vendor derlemesi |

> **Uzlaştırma:** Karşıt gibi görünen bulgular aslında aynı şeyi söylüyor — **sohbet, alternatifi
> uzun bir form olduğunda kazanıyor; alternatifi tek dokunuş olduğunda kaybediyor.**
> Fitness'a çevirisi: *nüanslı, bağlamsal, seyrek* veri (nasıl hissettin, ne engelledi, hedefin
> değişti mi) → sohbet. *Tekrarlayan, yapılandırılmış, sık* veri (set/tekrar/ağırlık, öğün, kilo)
> → form/tek dokunuş. Günlük loglamayı sohbete koymak, günde 12 dakikalık oturuma kotasından
> fazlasını yüklemek demek.

## D4 · Soru sorma ekonomisi

| Bulgu | Sayı | Kaynak | Güven |
| --- | --- | --- | --- |
| Her ek zorunlu form alanı → dönüşüm ortalama **%4,1–%7** düşüyor | %4,1–7 | HubSpot 2024 araştırması, [Brixon derlemesi](https://brixongroup.com/en/lead-forms-in-b2b-the-perfect-balancing-act-between-data-depth-and-conversion-rate) | ⚠️ B2B lead formu, fitness değil |
| 7+ alanlı formlarda terk oranı **%67,8** | %67,8 | [Reform](https://www.reform.app/blog/progressive-profiling-vs-traditional-forms-key-differences) | ⚠️ vendor |
| Kullanıcıların **%26**'sı sırf akış uzun/karmaşık diye terk ediyor | %26 | aynı | ⚠️ vendor |
| Progressive profiling: form tamamlama +%35 ortalama, terk −%45'e kadar | — | [involve.me](https://www.involve.me/blog/progressive-profiling-101-collect-more-data-without-friction) | ⚠️ vendor |

⚠️ Bu literatürün tamamı B2B pazarlama formları üzerine. **Fitness onboarding'e doğrudan
genellenemez** — çünkü Noom 113 ekranla dönüşüyor. Çelişkinin çözümü A1'deki kural: ekran başına
geri verilen değer.

> **Sorma kuralı (operasyonel):**
> - **Sor:** cevabı 7 gün içinde ürünün davranışını görünür değiştiriyorsa (saat, rutin bağlantısı,
>   ekipman erişimi, sakatlık, mevcut sıklık).
> - **Sorma:** cevabı sadece bir profil alanına yazılacaksa; veya 4 hafta sonra değişecek bir
>   sayıysa (hedef kilo tarihi gibi) — bunu adaptive tut, dondurma.
> - **Ertele:** hoş-olur veriyi 3.–4. haftaya bırak. O zaman kullanıcı zaten yatırım yapmış, ve
>   soru "sen kimsin" değil "şu ana kadarki verine göre şunu ayarlayayım mı" formunda sorulabilir.

# C-EK · Salon verisi: hafta 6 milestone'u (bu araştırmanın en değerli bulgusu)

**Demirci, Tüzün, Ün, Sönmez & Varol (2025), arXiv:2501.01779v2 (28 Eyl 2025)** —
Mars Athletic Club (Türkiye'nin en büyük zincir, 100+ kulüp, 13 il), 2022–2023 dönemi,
**yalnızca ilk ücretli yıllık sözleşmeler** (tekrar üye avantajı elenmiş), anonimleştirilmiş.
[arXiv](https://arxiv.org/abs/2501.01779) · [PDF](https://arxiv.org/pdf/2501.01779)
⚠️ Örneklem N'i çıkarılan metinde açıkça belirtilmemiş.

| Bulgu | Sayı |
| --- | --- |
| **6. hafta noktasında üyelerin ~%50'si devamlılık serisini sürdüremiyor** | %50 |
| **17. hafta noktasında %80'i sürdüremiyor** | %80 |
| 6 haftalık milestone'u geçmek için gereken **kritik ziyaret sayısı: en az 9** (≈ haftada 2) | ≥9 ziyaret |
| Milestone'lar arası kritik ziyaret sayısı neredeyse doğrusal → sürekli **haftada ~2 ziyaret** gerekiyor | ~2/hafta |
| Survival metriği tanımı: **art arda en az 1 kez gidilen hafta sayısı** | — |
| **Tolerans: 1 haftalık boşluk (gap week) seriyi bozmuyor.** Seri ancak **2 ardışık hafta** devamsızlıkta kırılıyor | 1 hafta tolerans |
| Bu toleransın gerekçesi ampirik: **tüm ara boşlukların %50'si tam olarak 1 hafta uzunluğunda** | %50 |
| **Gap week kullanımı serinin sonuna yaklaşırken artıyor** → churn'ün öncü göstergesi | — |
| Gap week kullanımı seri uzadıkça azalıyor (alışkanlık gücü artıyor) | — |
| Nedensel çıkarım (DoWhy, propensity score matching): **kişiselleştirilmiş rehberlik (personal trainer) ve sosyal dinamikler** uzun vadeli bağlılığın ana sürücüleri | — |
| Grup dersinin etkisi başta yüksek, zamanla azalıyor ama anlamlı kalıyor | — |

> **Bu, kaynak koçun "Hafta 5'te arıza başlıyor" tespitinin bağımsız, büyük ölçekli, Türkiye
> verisiyle doğrulanmasıdır.** Kritik nokta 6. hafta; arıza 5. haftada başlıyor çünkü seri
> 2 ardışık hafta devamsızlıkta kırılıyor — yani hafta 5'te kaçırılan hafta, hafta 6'da kaybı
> kesinleştiriyor. Koçun gözlemi ve verinin milestone'u **aynı noktayı işaret ediyor.**

> **Ve streak kararını bu çözüyor, blog istatistikleri değil:** Gerçek dünyada çalışan streak
> tanımı *günlük* değil **haftalık**, ve **1 hafta affı olan** bir streak. Bu tanım hem Lally'nin
> "bir gün kaçırmak eğriyi bozmaz" bulgusuyla, hem hafta sonu düşüşüyle, hem de Duolingo'nun
> freeze deneyiyle (churn −%21) tutarlı. Üç bağımsız kaynak aynı tasarıma çıkıyor.

# E · Paywall, trial ve iptal

## E1 · Paywall yerleşimi

| Bulgu | Sayı | Kaynak | Tarih/örneklem |
| --- | --- | --- | --- |
| Medyan trial başlatma (tüm install'lar) | %5–7; en iyi %5'lik dilim %12–15+ | [RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025) | 2025 |
| Paywall→trial (yalnızca paywall görenler) fitness'ta medyan | ~%11 | Adapty 2025, [RocketShip derlemesi](https://www.rocketshiphq.com/paywall-optimization-fitness-apps/) | 2025 |
| **Hard paywall**: anında trial başlatmada freemium'a göre %20–40 avantaj | %20–40 | Adapty 2025 | 2025 |
| **Freemium**: 12 aylık toplam gelirde %15–25 avantaj | %15–25 | Adapty 2025 | 2025 |
| Hard paywall'ların LTV'si soft'a göre **%21 daha yüksek** | %21 | [Adapty SOIS 2026](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/) | 16.000+ app, 3 mlr $+ |
| Ölçülebilir "değer anı"ndan sonra tetiklenen paywall'da trial başlatma **2,1×** | 2,1× | RocketShip/Adapty | 2025 |
| Gate'lemeden önce değer verende trial→paid **1,5–2×** | 1,5–2× | [RocketShip](https://www.rocketshiphq.com/paywall-structure-fitness-app-workouts/) | 2025 |
| Sağlık & fitness install LTV medyanı **1,21 $** (12 ay) — App Store kategorileri arasında en yüksek | 1,21 $ | Adapty SOIS 2026 | 2026 |
| Fitness haftalık abonelik hunisi: install→trial %9,5 · trial→paid %42,2 · ilk yenileme %67,7 | — | Adapty SOIS 2026 | 2026 |
| Onboarding içi trial'lı paywall: install→paid %1,78 (tüm yerleşimler içinde en yüksek) | %1,78 | Adapty SOIS 2026 | 2026 |

> ⚠️ **Çelişki var, saklamıyorum.** Adapty "hard paywall LTV'de %21 üstün" derken RocketShip
> "değer anından sonraki paywall 2,1× trial başlatıyor" diyor. İkisi farklı metrik ölçüyor
> (LTV vs trial başlatma) ve ikisi de vendor. **Kesin cevap yok.** Bizim bağlamımız için ayırt
> edici olan şu: bizim ürünün değer anı ilk 5 dakikada *fiziksel sonuç* olamaz (yok) — ama
> **kişiselleştirilmiş çıkarım** olabilir. Bu, "değer anını paywall'dan önce koy" seçeneğini
> pratikte mümkün kılıyor: değer, üretilen planın kendisidir.

## E2 · Trial uzunluğu

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| 17–32 günlük trial'lar medyan **%42,5** dönüşüm; ≤4 günlükler **%25,5** | 42,5 vs 25,5 | [RevenueCat 2025](https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app) |
| ≤4 gün trial'lar, 4+ günlüklerden **%30 daha kötü** dönüşüyor | %30 | aynı |
| Sağlık & Fitness trial→paid medyanı **%39,9** (üst decile %68,3) | %39,9 | RevenueCat 2025 |
| 3 günlük trial iptallerinin **%84**'ü, 7 günlüklerin **%64**'ü **gün 0–1**'de oluyor | %84 / %64 | [Phiture](https://phiture.com/mobilegrowthstack/the-subscription-stack-how-to-optimize-trial-length/) |
| Eğitim/finans gibi "değer realizasyonu birden fazla oturum gerektiren" kategorilerde 7 veya 14 gün | — | RevenueCat 2025 |

> **Bizim için:** Ürünün değer realizasyonu **haftalar** sürüyor (fiziksel kanıt 4 hafta yok).
> 3 gün kesin yanlış. Kanıt 7–14 gün aralığını, ve "17–32 gün en iyi dönüşüyor" bulgusu daha da
> uzunu destekliyor. **Ama kritik risk noktası gün 0–1** — iptallerin %64–84'ü orada. Yani trial
> uzunluğundan bağımsız olarak, **ilk 24 saatte değer göstermek** trial tasarımının tamamı.

## E3 · İptal deneyimi

| Bulgu | Sayı | Kaynak | Güven |
| --- | --- | --- | --- |
| **Duraklatan (pause)** aboneler %60–80 oranında geri dönüyor; **iptal edenler %10–20** | 60–80 vs 10–20 | [Cleeng](https://blog.cleeng.com/how-to-use-subscription-pauses-to-reduce-churn-and-boost-retention) | ⚠️ vendor |
| Aylık %5 vs %8 kayıp arasındaki fark çoğu zaman "iptal akışında pause görünür mü" sorusuna iniyor | — | aynı | ⚠️ vendor |
| Fitness sektöründe "iptal ettim sanıyordum" tahsilat çağrısı = **1 yıldızlı yorum fabrikası** | — | [ABC Fitness](https://abcfitness.com/abc-articles/the-era-of-billing-inertia-is-ending/) | sektör görüşü |
| FTC "Click-to-Cancel" kuralı Eki 2024'te kesinleşti, **8 Tem 2025'te temyiz mahkemesi tarafından iptal edildi**; FTC ROSCA yetkisini koruyor, Şub 2026'da yeni bir dalga başladı | — | [FTC](https://www.ftc.gov/news-events/news/press-releases/2024/10/federal-trade-commission-announces-final-click-cancel-rule-making-it-easier-consumers-end-recurring), [Churnkey](https://churnkey.co/blog/ftc-click-to-cancel-rule-voided/), [Goodwin Şub 2026](https://www.goodwinlaw.com/en/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life) | yüksek |

⚠️ "Kolay iptalin retention'a etkisi" için **randomize kanıt bulunamadı.** Bulunan tek kantitatif
şey pause vs cancel geri dönüş oranı ve o da vendor kaynaklı.

> **Ama bizim bağlamımızda daha güçlü bir argüman var, kendi verimizden:** brief diyor ki
> **%50'den fazlası iptal bile etmeden sürükleniyor.** Yani bizim asıl problemimiz iptal sürtünmesi
> değil — *sessiz sürüklenme.* İptali zorlaştırmak bu kitleyi zaten etkilemiyor (onlar iptal
> etmiyor); sadece geri dönme ihtimali olan %80'i ("beni geri getirebilecek bir şey vardı")
> düşman ediyor. Pause verisi (60–80% geri dönüş) tam bu kitleyi hedefliyor.

---

# F · 8 HAFTALIK TASARIM ÖNERİSİ

## F0 · Tasarımı belirleyen 7 kanıt

| # | Kanıt | Tasarıma etkisi |
| --- | --- | --- |
| 1 | 6. haftada %50 seriyi kaybediyor; geçmek için **6 haftada ≥9 ziyaret (~2/hafta)** — arXiv 2501.01779 | Programın tek somut eşiği bu: **8 haftada 12+ antrenman.** Kullanıcıya gösterilen ana sayaç bu olmalı. |
| 2 | Seri **1 hafta affıyla**, ancak **2 ardışık hafta** devamsızlıkta kırılıyor; ara boşlukların %50'si zaten 1 hafta — aynı | Streak **haftalık + 1 hafta aflı.** Günlük streak yok. |
| 3 | Erken davranışsal adherence → 6. ay sonucu **R=0,52**; günde ≥2 öğün kaydı **R²=0,27** — POUNDS LOST, Payne 2019 | Gösterilen "ilerleme" uydurma değil, **yordayıcılığı ölçülmüş** metrik. |
| 4 | İlk 4 hafta kuvvet artışı **nöral**; hipertrofi 6. haftadan sonra ölçülebilir — Frontiers 2025 | Hafta 1–5 dili: "güçleniyorsun". Hafta 6+ dili: "kas". Yalan yok. |
| 5 | Fiili davranışı öngören tek iki ipucu: **saat** (r=0,11) ve **rutine bağlama** (r=0,13); mekân ve sosyal anlamsız — 14 çalışma, n=6.069 | Onboarding'de yer/arkadaş sorma. Saat ve "neyin ardına" sor. |
| 6 | Kişiselleştirilmiş bildirimin nedensel etkisi **+%3,9**; hafta içi anlamsız, hafta sonu +%8,7 — MRT n=1.255 | Bildirim kaldıraç değil. Haftada ≤3, hafta sonu öğlen penceresi. |
| 7 | Gün 30'da ortalama 0,19 oturum/gün; oturum ~12 dk — Adjust | Günlük etkileşim varsayan hiçbir mekanik kurma. 12 dakikaya sığdır. |

## F1 · İlk oturum (hedef: 5 dakika, ≤12 ekran)

**Kural:** her ekran ya (a) 7 gün içinde planı görünür değiştirir ya (b) kullanıcıya bir çıkarım verir.
Aksi halde 3. haftaya ertelenir.

| Adım | Ne sorulur / gösterilir | Gerekçe |
| --- | --- | --- |
| 1 | Ne için buradasın? (kuvvet / yağ / dayanıklılık / sağlık) — tek seçim | Hedef sahipliği kullanıcıda kalır (özerklik). |
| 2 | Gerçekte haftanın kaç günü **çıkabilirsin**? "İdeal" değil, "gerçek" diye sor | ≥2/hafta eşiği kurulacak; gerçekçi taban lazım |
| 3 | **Hangi saat?** (sabah/öğle/akşam + yaklaşık saat) | Fiili davranışı öngören ipucu #1 (r=0,11) |
| 4 | **Neyin hemen ardına?** (işten çıkınca / kahvaltıdan sonra / dersten sonra) | Fiili davranışı öngören ipucu #2 (r=0,13) — implementation intention'ın çekirdeği |
| 5 | Ekipman erişimi + sakatlık/kısıt | Planı fiilen değiştirir |
| 6 | Mevcut durum: kilo, boy, tahmini deneyim | Minimum; kilo hedefi **tarihe bağlanmaz** |
| 7 | **Hedefini söyle** (serbest metin veya sayı) | Reddedilmez |
| 8 | ⭐ **AHA EKRANI — çıkarım geri verilir** | Aşağıda |
| 9 | 8 haftalık takvim: 12+ antrenman, hangi günler, hangi saat | Program görünür hale gelir (Levent'in "belirsizlik" problemi = kullanıcının da problemi) |
| 10 | İlk antrenmanı takvime koy + hatırlatıcı izni | Tek eylem |
| 11 | Paywall (trial) | Değer gösterildikten sonra |

### ⭐ Adım 8: aha ekranı (ürünün tek gerçek ilk-5-dakika değeri)
Kullanıcının kendi verisinden çıkan, kendisinin bilmediği çıkarım. Üç cümle:

> "Söylediğin düzende **haftada gerçekçi olarak 2,7 antrenman** sığıyor — 5 değil. Plan buna
> göre kuruldu.
> Türkiye'nin en büyük salon zincirinin 2022–2023 verisinde üyelerin **%50'si 6. haftada
> bırakıyor**; bırakmayanları ayıran tek şey **ilk 6 haftada 9 antrenman.** Senin planın 12'ye
> ayarlı — 3 antrenmanlık payın var.
> İlk 4 hafta terazi ve ayna sana bir şey söylemeyecek: kilo günlük gürültüsü ±0,42 kg, fotoğrafta
> fark 1,2 kg yağa kadar görünmez. O yüzden ilk 4 hafta **sana bunları göstermeyeceğim** —
> onun yerine 6. ay sonucunu istatistiksel olarak öngördüğü ölçülmüş iki şeyi göstereceğim."

Bu ekran aynı anda üç iş yapıyor: değer verir (aha), beklentiyi kalibre eder (attrition kanıtı),
ve ilk 4 haftanın boşluğunu **açıklanmış bir tasarım tercihi** haline getirir — boşluk olmaktan
çıkarır.

## F2 · Hafta hafta

| Hafta | Kullanıcı ne görür | Sistem ne yapar | Ne sorar | Gerekçe |
| --- | --- | --- | --- | --- |
| **0 (ilk oturum)** | Kişiselleştirilmiş çıkarım + 8 haftalık takvim + beklenti kalibrasyonu | Plan üretir, saat + rutin ipucunu kaydeder, ilk antrenmanı takvime yazar | 7 soru (F1) | İptallerin %64–84'ü gün 0–1'de → değer ilk 24 saatte |
| **1** | **Tek sayaç: "12'de 1"**. Antrenman içi: set/tekrar/ağırlık girişi (form, sohbet değil) | Sadece kaydeder. Yorum yok, skor yok | Hiçbir şey | Soru ekonomisi: 1. hafta borç toplama zamanı değil |
| **2** | "12'de 3" · **ilk performans karşılaştırması**: "Aynı hareketi geçen hafta 8×40, bu hafta 9×40" | Egzersiz bazında karşılaştırma tablosu açar | Pazartesi check-in: **2 soru** — geçen hafta ne engelledi? / bu hafta saat aynı mı? | Performans, mevcut tek dürüst kanıt. Implementation intention **pekiştirilmeli** (pekiştirmesiz etkisiz — PLOS ONE) |
| **3** | "12'de 5" · **kayıt tutarlılığı** paneli açılır: "8 günün 6'sında ≥2 öğün kaydettin" + neden bu metriğin gösterildiğinin açıklaması (R²=0,27) | Beslenme kaydı gevşekse **tek** hatırlatma | Progressive profiling: ertelenen 2–3 soru **şimdi** sorulur ("verine göre X'i ayarlayayım mı?") | 3. hafta = yatırım yapılmış, soru "sen kimsin" değil "ayar" formunda |
| **4** | "12'de 7" · **Nöral açıklama ekranı**: toplam kaldırılan hacim grafiği + "bu artış şu an sinir sistemi öğrenmesi, kas değil — kas 6. haftadan sonra ölçülebilir" | İlk **ölçüm penceresi**: 4 haftalık kilo trendi (tek ölçüm değil, trend + gürültü bandı) | "Hedefin hâlâ aynı mı?" — **adaptive goal güncellemesi** | Statik hedef 4 ayda düşüşe geçiyor, adaptive korunuyor. Hedef burada yeniden ayarlanır |
| **⚠️ 5 — KIRMIZI BÖLGE** | "12'de 9" · **eşik geçildi bildirimi**: "Salon verisinde 6 haftada 9 antrenman yapanlar bırakmayan grup. Sen oradasın." | **Risk skoru devreye girer.** Sinyaller: bu hafta 0 antrenman · gap week kullanımı · kayıt tutarlılığı düşüşü · uygulama açılmaması | Risk yoksa: 1 soru. **Risk varsa: insan tonunda tek mesaj** | Salon verisi: 6. haftada %50 kayıp; gap kullanımı serinin sonuna yaklaşırken artıyor = churn öncü göstergesi. RCT: 1. ay sonunda geride kalanlara **ekstra koçluk** işe yarıyor (n=437) |
| **6** | "12'de 11" · **6 haftalık milestone kutlaması** + ilk kez "kas" kelimesi kullanılır: "hipertrofi ancak şimdi ölçülebilir hale geliyor" | 6 haftalık tam rapor: performans + tutarlılık + ölçüm trendi | Foto/ölçü isteği (**ilk kez** — 1,2 kg eşiği artık geçilmiş olabilir) | Kas lifi hipertrofisi 6. haftadan sonra tespit edilebiliyor. Söz tutuldu → güven |
| **7** | "12'de 13 — hedef aşıldı" · **karşılaştırma: hafta 1 sen vs hafta 7 sen** (performans, tutarlılık, ölçüm) | Kayıp riski en yüksek hafta → recovery mekaniği tam güçte | "Sonraki 8 hafta neye odaklanalım?" | Koç tespiti: hafta 7'de kayboluyor. 17. haftada %80 kayıp → bir sonraki milestone şimdi kurulmalı |
| **8** | **8 haftalık dosya**: ne değişti, ne değişmedi, neden. Fiziksel değişim varsa **gürültü bandıyla birlikte** | Yeni 8 haftalık blok önerir, hedefi yeniden kalibre eder | "Ne işe yaramadı?" (ürün için en değerli soru) | 8 hafta alışkanlık kurmaz (Lally: karmaşık davranış ≫66 gün), **bir sonraki bloğa devrettirir** |

## F3 · STREAK KARARI

**Günlük streak: HAYIR. Haftalık seri + 1 hafta affı: EVET.**

| Karar | Gerekçe |
| --- | --- |
| Birim **hafta**, gün değil | Gün 30'da ortalama 0,19 oturum/gün (Adjust) → günlük seri zaten matematiksel olarak imkânsız. Ayrıca hafta sonu sistematik düşüyor (PMC11966970) → günlük seri hafta sonunu ceza yapar |
| **1 hafta affı**, 2 ardışık hafta devamsızlıkta kırılır | Salon verisinde ara boşlukların **%50'si tam 1 hafta** ve 1 haftalık boşluk devamlılıkla uyumlu (arXiv 2501.01779). Bu keyfi bir "grace day" değil, **ampirik eşik** |
| Sayaç sıfırlanmaz — **kümülatif** gösterilir ("12'de 9") | Lally: bir günü kaçırmak otomatiklik eğrisini bozmadı. Sıfırlanan sayaç gerçekliğe aykırı bilgi verir |
| Af **kullanıldığında** kullanıcıya bildirilir, ama ceza dilinde değil | Gap kullanımı churn'ün öncü göstergesi → sistem bunu **risk sinyali** olarak okur, kullanıcı **hak** olarak görür |
| Duolingo doğrulaması | Streak Freeze churn'ü %21 düşürdü; 2–3 freeze'e çıkarmak dönüşü daha da artırdı |

⚠️ Kullanılmayan iddialar: "60+ streak kıranların %40'ı 2 haftada bırakıyor" ve "CHI 2020: streak
anksiyetesi 1 numaralı bırakma sebebi, %63" — **birincil kaynak doğrulanamadı, karara dahil edilmedi.**

## F4 · BİLDİRİM KARARI

**Haftada en fazla 3. Jenerik hafta içi bildirim yok.**

| Slot | Zaman | İçerik | Gerekçe |
| --- | --- | --- | --- |
| 1 | Antrenman gününde, kullanıcının **kendi belirlediği saatten** 30 dk önce | "İşten çıkınca — bugün alt vücut, 42 dk" (kullanıcının kendi yazdığı rutin cümlesi) | İpucu tutarlılığı fiili davranışı öngören tek mekanizma (r=0,11–0,13) |
| 2 | **Pazartesi sabah** | Haftalık check-in (2 soru) + "12'de X" | Perşembe–Pazar self-monitoring dibi → Pazartesi toparlama noktası |
| 3 | **Sadece risk sinyalinde**: 7 gün hareketsizlik | Öz-şefkat çerçeveli tek mesaj (aşağıda) | Reaktivasyon penceresi kısa: 90 günde %10–12, 180 günde %2–4 |
| — | Hafta sonu jenerik motivasyon | **YOK** | Nedensel etki hafta içi %2,5 (anlamsız). Hafta sonu +%8,7 ama bunu slot 1/3 zaten kapsıyor |

**Beklenti:** Bildirimden gelecek kazanç **%4 civarı** (MRT: +%3,9). Bildirim bir strateji değil,
hijyen. Retention'ı bildirimle çözmeye çalışmak kanıta aykırı.

**7. gün recovery mesajının formu** (öz-şefkat literatürü + Lally + salon verisi):
> "Bir hafta geçti. Verilere göre bu seriyi bozmuyor — iki ardışık hafta bozuyor, ve senin bir
> haftalık payın hâlâ duruyor.
> Bu hafta 1 antrenman, 25 dakika. Planını bunun için yeniden yazdım.
> [Ne oldu? — tek soru, isteğe bağlı]"

Neden bu form: suçlama yok (AVE tetiklenmiyor), somut ve küçük eylem var (kademeli egzersiz —
panoramik meta-analizde orta düzey kanıtla desteklenen az sayıdaki teknikten biri), ve **doğru
bilgi** veriyor (1 hafta gerçekten bozmuyor).

## F5 · Bunun işe yarayıp yaramadığı nasıl ölçülür

| Metrik | Eşik | Kaynağı |
| --- | --- | --- |
| **Hafta 6'da ≥9 antrenman yapanların oranı** | Salon tabanı %50 | arXiv 2501.01779 — dış karşılaştırma noktamız |
| Hafta 6 → hafta 8 devam oranı | koç tespiti: hafta 7 kayıp | iç |
| Günde ≥2 öğün kaydedilen gün oranı, hafta 4'te | — | Payne 2019 (R²=0,27) |
| Gap week kullanım oranı (öncü churn göstergesi) | artış = risk | arXiv 2501.01779 |
| Trial gün 0–1 iptal oranı | sektör %64 (7 gün trial) | Phiture |
| Bildirim opt-out oranı | — | iç |
| D30 retention | kategori %27,2 / bizim referans %4 | Adjust vs brief |

## F6 · Bulunamayanlar (dürüstlük listesi)

- "Süreç hedefi > sonuç hedefi" için doğrudan, başlık düzeyinde meta-analiz **bulunamadı.**
- "4 hafta boyunca bir şey görmeyeceksin demek bırakmayı artırır/azaltır" için **RCT bulunamadı.**
  Yalnızca beklenti-attrition korelasyonu var (Dalle Grave).
- Fitness onboarding'de "investment justification" için **randomize kanıt bulunamadı** (Noom vakası
  gözlemsel, kontrol grubu yok).
- "Kolay iptalin retention'a etkisi" için **randomize kanıt bulunamadı.**
- Check-in için **hangi saat** en iyi — doğrudan kanıt bulunamadı (yalnızca hafta sonu 12:30 MRT verisi).
- Aha moment literatürünün tamamı **vendor içerik pazarlaması**, hakemli kaynak bulunamadı.
- Hevy, Ladder, Runna, Zing, Whoop, Oura onboarding'leri için **kamuya açık ekran-sayısı verisi
  bulunamadı** (Mobbin/PageFlows arkasında, ücretli). Yalnızca Noom (113 ekran) ve MacroFactor'ün
  akış kaydı mevcut.
- Streak karşıtı en çok alıntılanan iki sayı (%40 terk, %63 bırakma) **birincil kaynağa
  bağlanamadı.**
- POUNDS LOST R=0,52 değeri **abstract düzeyinde**; tam metne erişilemedi (paywall), adherence
  tanımının haftaları doğrulanamadı.
- Egzersiz (kilo kaybı değil) hedefli kullanıcılarda erken davranışsal adherence'ın yordama gücü
  **doğrulanmadı** — R değerleri kilo kaybı çalışmalarından.
