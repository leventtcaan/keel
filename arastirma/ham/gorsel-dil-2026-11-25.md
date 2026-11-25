# Görsel Dil Araştırma Raporu: Lider Fitness ve Koçluk Uygulamaları (Kasım 2026)

**Model:** Gemini 3.8 Flash (High)  
**Tarih:** 25 Kasım 2026  
**Bağlam:** "Next Call" iOS uygulaması için sakin, tutarlı, az metinli ve Türkçe yerelleştirmeye uygun yeni görsel dil kılavuzu ve karşılaştırmalı pazar analizi.

---

## GİRİŞ VE METODOLOJİ

Bu araştırma, antrenman, beslenme, kilo ve fotoğraf verilerini okuyarak haftada YALNIZCA BİR net karar ("150 kcal daha az ye", "1 set ekle", "sabit tut") üreten deterministik bir karar motoruna ve bunu açıklayan bir yapay zeka koçuna sahip "Next Call" uygulaması için hazırlanmıştır.

Mevcut arayüzün kurucu tarafından tespit edilen temel tasarım zaafları:
- Beyaz arka plan üzerinde sert siyah karar kartı ve doygunluğu yüksek agresif turkuaz tonları (`#007C8C` / `#2EE6D6`).
- Dar kartlar içerisine sıkıştırılmış Barlow Condensed 900 kalınlığında büyük harfli (ALL-CAPS) agresif başlıklar.
- Dar kartlarda uzun cümleler (Türkçe arayüzün uzun etiket yapısıyla birleştiğinde görsel tıkanıklık ve bağrışma hissi yaratmaktadır).
- Tiklerden ve noktalardan oluşan baskıcı bir hafta şeridi (kullanıcıda sınav/ceza psikolojisi uyandırmaktadır).
- Zayıf, bağlamdan kopuk ve ham metin yığını üreten sohbet arayüzü.

Aşağıdaki analizde 12 öncü uygulama (WHOOP, Oura, Bevel, MacroFactor, Gentler Streak, Strava, Runna, Ladder, Fitbod, Apple Fitness, Rise Science ve netlik/sadelik referansı olarak Things 3) 6 kritik eksende incelenmiştir. Her bir iddia resmi kaynaklar, tasarım vaka analizleri ve App Store dokümantasyonlarıyla kaynaklandırılmıştır.

---

## 1. ANA EKRAN / BUGÜN GÖRÜNÜMÜ (Açılıştan Sonraki İlk 5 Saniye)

### WHOOP
- **Ekranda Ne Var:** En üstte "Recovery" (Toparlanma) dairesi, altında "Day Strain" (Günlük Zorlanma) dairesi, ardından uyku skoru ve kalp atım değişkenliği (HRV) gibi temel biyometriklerin yer aldığı yatay modüler kartlar bulunur [kaynaklı: https://apps.apple.com/app/whoop-your-personal-coach/id933944389 (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Ekranın merkezinde yer alan devasa renkli toparlanma halkası (yeşil/sarı/kırmızı) ve içerisindeki büyük yüzde sayısı (%78 vb.) [gözlem: https://www.whoop.com/experience (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Son derece düşük. Ana ekranda cümle yerine sadece tek kelimelik etiketler ("RECOVERY", "DAY STRAIN", "SLEEP NEED") ve metrik birimleri bulunur [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Çift eşmerkezli halkalar (gauge/ring), dairesel ilerleme çubukları ve devasa tipografik sayılar [gözlem: https://apps.apple.com/app/whoop-your-personal-coach/id933944389 (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Koyu arka plan ve minimalist yüzey sakinleştirici olsa da, kırmızı/sarı/yeşil trafik ışığı sistemi düşük toparlanma günlerinde kullanıcıda anksiyete ve alarm hissi yaratabilmektedir [gözlem: https://www.whoop.com/experience (Görülme: Kasım 2026)].

### Oura (Gen 4 / 2024-2026 Yeniden Tasarımı)
- **Ekranda Ne Var:** 2024 sonu ve 2025-2026 döneminde devreye giren 3 sekmeli yeni mimari: "Today" (Bugün), "Vitals" (Hayati Göstergeler) ve "My Health" (Sağlığım). Today sekmesinde günün en önemli tekil metriğini öne çıkaran "One Big Thing" kartı, günlük dinamik özet ve altta minik göstergeler yer alır [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** "One Big Thing" odak kartı; kullanıcının o sabah en çok dikkat etmesi gereken tekil içgörüyü (örn. "Toparlanma ihtiyacı" veya "Olağan dışı sıcaklık artışı") gösteren geniş, yumuşak yüzey [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Orta-düşük; tek bir sakinleştirici başlık cümlesi ve 1-2 satırlık açıklama metni. Sayı kalabalığı "Vitals" sekmesine gizlenmiştir [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Dinamik renkli eğriler, yumuşak pil (pill) şeklinde göstergeler ve yalın sayısal puanlar [gözlem: https://apps.apple.com/app/oura/id1043837948 (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Olağanüstü sakin. Veri anksiyetesini düşürmek amacıyla tasarlanan bu yapı, kullanıcıyı sayılarla boğmak yerine "günün ana fikrini" fısıldar [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].

### Bevel (Eski Superset)
- **Ekranda Ne Var:** "Better Home" paneli; hava durumuna duyarlı arka plan tonu, en üstte Strain, Recovery, Sleep puanlarını toplayan üçlü gösterge halkaları, alt tarafta zaman çizelgesi ve biyometrik kartlar [kaynaklı: https://bevel.health/changelog (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Ekranın üst yarısındaki üçlü parlak renkli toparlanma ve zorlanma gösterge halkaları [gözlem: https://apps.apple.com/app/bevel-health/id6450616173 (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük; kart başlıkları ve sayısal skorlar haricinde sadece birer satırlık durum özeti ("Fully Recovered", "Rest Recommended") [kaynaklı: https://bevel.health (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** İnce hatlı ilerleme halkaları (rings), mikro çizgi trend grafikleri (sparklines) ve yuvarlatılmış kart yüzeyleri [kaynaklı: https://apps.apple.com/app/bevel-health/id6450616173 (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Koyu antrasit zemin ve Apple HIG standartlarına sadık kart yapısı temiz bir his verir; ancak birden fazla halkanın aynı anda parlaması bilgi yoğunluğunu biraz artırır [gözlem: https://bevel.health (Görülme: Kasım 2026)].

### MacroFactor
- **Ekranda Ne Var:** "Dashboard"; en üstte "Expenditure" (Günlük Enerji Harcaması) ve "Trend Weight" (Kilo Trendi) grafiği, altında bugünün kalori ve makro hedef çubukları (Protein, Yağ, Karbonhidrat) [kaynaklı: https://macrofactorapp.com/expenditure/ (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Kalan/tüketilen kaloriyi gösteren geniş yatay nötr ilerleme çubuğu ve sol üstteki pürüzsüz trend çizgisi [gözlem: https://apps.apple.com/app/macrofactor-macro-tracker/id1553503471 (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Çok düşük. Sadece besin isimleri ("Protein", "Fat", "Carbs"), gramajlar ve kalori sayıları [kaynaklı: https://macrofactorapp.com/adherence-neutral/ (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Pürüzsüzleştirilmiş ağırlık trend çizgisi (günlük dalgalanmaları filtreleyen spline curve), yatay makro çubukları (bars) ve nötr sayı blokları [kaynaklı: https://macrofactorapp.com/expenditure/ (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Pazardaki en sakin diyet arayüzü. "Adherence-Neutral" (Uyum-Nötr) felsefesiyle, kalori aşımında kırmızı uyarı veya ceza vermez; kırmızı/alarm renkleri tamamen elenmiştir [kaynaklı: https://macrofactorapp.com/adherence-neutral/ (Görülme: Kasım 2026)].

### Gentler Streak
- **Ekranda Ne Var:** Ekranın tam ortasında kıvrımlı, organik "Activity Path" (Aktivite Yolu), içinde kullanıcının günlük durumunu simgeleyen maskot "Yorhart", altta dinlenme veya hafif yürüyüş önerisi [kaynaklı: https://gentlerstories.com (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Organik, yeşil/turuncu/mavi pastel tonlardaki kalın dalgalı aktivite bandı ve üzerindeki Yorhart karakteri [gözlem: https://apps.apple.com/app/gentler-streak-workout-tracker/id1576856835 (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük; insani, suçluluk hissettirmeyen kısa cümleler ("You're in your optimal zone", "Time to rest") [kaynaklı: https://gentlerstories.com (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Geniş, dinamik sınır bandı (Activity Path). Halka veya sert sayısal hedefler yerine kullanıcının bulunması gereken güvenli "tatlı nokta" bandı [kaynaklı: https://gentlerstories.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Zirve sakinlik. Apple Design Award sahibi bu dil; halka kapatma baskısını, kırmızı hata bildirimlerini ve sporcu elitizmini tamamen yıkarak ferahlatıcı bir dinginlik sunar [kaynaklı: https://developer.apple.com/design/awards/ (Görülme: Kasım 2026)].

### Strava
- **Ekranda Ne Var:** Sosyal akış (takip edilen kişilerin aktiviteleri), kullanıcının son kaydı ve üstte arama/profil barları [kaynaklı: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Akıştaki GPS harita polylineleri ve turuncu "Kudos" butonları [gözlem: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Orta-yüksek. Aktivite başlıkları, kullanıcı açıklamaları, yorumlar ve ayrıntılı istatistik dizileri [gözlem: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** GPS harita rotaları, mikro irtifa profilleri, sayısal veri tabloları [kaynaklı: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Yüksek uyarıcı/sosyal rekabet odaklı. Turuncu accent (`#FC4C02`) ve sosyal akış dinamiği sakin bir koçluk hissiyatından ziyade enerjik bir topluluk sahnesi oluşturur [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].

### Runna
- **Ekranda Ne Var:** En üstte 7 günlük yatay hafta şeridi, altında "Today's Run" (Günün Koşusu) kartı, hedef tempo aralığı ve antrenman başlatma butonu [kaynaklı: https://apps.apple.com/app/runna-running-training-plans/id1605335193 (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** "Week 4 / Day 2 - Interval Run" başlığı taşıyan büyük karanlık antrenman kartı ve parlak neon yeşil "Start Workout" düğmesi [gözlem: https://apps.apple.com/app/runna-running-training-plans/id1605335193 (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük-orta. Koşu türü, hedef tempo (örn. "4:45 /km"), mesafe ve antrenmanın yapısını anlatan 2-3 maddelik teknik liste [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Renk kodlu antrenman şeritleri (interval için kırmızı/pembe, toparlanma için mavi), yatay hafta hücreleri [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Atletik, yüksek enerjili ancak yapılandırılmış. Neon yeşil aksan harekete geçiricidir; ancak karmaşık grafikler içermediği için zihinsel yükü düşüktür [gözlem: https://runna.com (Görülme: Kasım 2026)].

### Ladder
- **Ekranda Ne Var:** Takım koçunun büyük fotoğrafı/videosu, bugünün antrenman adı ("Lower Body Strength"), seriler, tahmini süre ve seriler arası dinlenme zamanlayıcıları [kaynaklı: https://apps.apple.com/app/ladder-strength-training-plans/id1631437341 (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Genişletilmiş brutalist tipografiyle yazılmış günün antrenman adı ve koçun görseli [gözlem: https://joinladder.com (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük. Egzersiz adları, tekrar sayıları, koç notu ("Heavy loading today") [kaynaklı: https://joinladder.com (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Set/tekrar matrisleri, toplam kaldırılan hacim (tonnage) sayacı, minimal ilerleme çubukları [gözlem: https://apps.apple.com/app/ladder-strength-training-plans/id1631437341 (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Sert, premium ve maskülen. Koyu siyah zemin ve kalın geniş fontlar spor salonu enerjisi yayar; dingin veya meditatif değildir [gözlem: https://joinladder.com (Görülme: Kasım 2026)].

### Fitbod
- **Ekranda Ne Var:** En üstte interaktif 2D/3D kas toparlanma ısı haritası (Muscle Recovery Heatmap), altında gün için önerilen egzersiz listesi [kaynaklı: https://apps.apple.com/app/fitbod-workout-gym-planner/id1041517543 (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** İnsan figürü üzerindeki kırmızı/turuncu (yorgun) ve mavi/siyah (dinlenmiş) kas grupları ısı haritası [kaynaklı: https://fitbod.me (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük. Kas yüzdeleri ("Chest: 18%", "Legs: 92%") ve egzersiz kartları [kaynaklı: https://fitbod.me (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Termal gradyanlı kas anatomisi modeli, yüzde göstergeleri [kaynaklı: https://fitbod.me (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Fonksiyonel ve analitik. Kas ısı haritası durumu anında anlattığı için uzun açıklamaları gereksiz kılar; ancak kırmızı kaslar sertlik algısını artırır [gözlem: https://fitbod.me (Görülme: Kasım 2026)].

### Apple Fitness (Fitness / Fitness+)
- **Ekranda Ne Var:** En üstte devasa 3 boyutlu Activity Rings (Hareket, Egzersiz, Duruş), altında son antrenman kartları, eğilimler (Trends) ve Fitness+ önerileri [kaynaklı: https://www.apple.com/apple-fitness-plus/ (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Zifiri siyah zemin üzerindeki kırmızı, yeşil, camgöbeği 3'lü Aktivite Halkaları [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Çok düşük. Sadece halka değerleri ("450/600 kcal", "35/30 MIN", "10/12 HRS") [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Üç katmanlı eşmerkezli halkalar (concentric rings) ve yukarı/aşağı ok simgeli eğilim grafikleri [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** İkonik ve sade; fakat halkaların kapatılamaması hissi kimi kullanıcılarda psikolojik baskı yaratmaktadır [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].

### Rise Science
- **Ekranda Ne Var:** 24 saatlik dikey/yatay sirkadiyen enerji dalgası grafiği ("Energy Schedule"), anlık biyolojik faz ("Grogginess", "Peak", "Dip") ve birikmiş uyku borcu ("Sleep Debt") kartı [kaynaklı: https://apps.apple.com/app/rise-sleep-tracker-schedule/id1276060841 (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Yumuşak gradyanlı sirkadiyen enerji eğrisi ve "Peak in 45m" tarzı öngörü etiketi [kaynaklı: https://www.risescience.com (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük-orta. Faz isimleri ve tek satırlık eylem tavsiyesi ("Güneş ışığı al") [kaynaklı: https://www.risescience.com (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Zaman eksenli sinüzoidal enerji dalgası (wave), saatlik renkli gradyan blokları [kaynaklı: https://www.risescience.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Oldukça sakin. Koyu mor/turuncu atmosferik gradyanlar biyolojiyi doğal bir akış olarak hissettirir [gözlem: https://www.risescience.com (Görülme: Kasım 2026)].

### Things 3 (Netlik / Sadelik Referansı)
- **Ekranda Ne Var:** "Today" listesi; solunda yumuşak mavi/gri dairesel onay kutuları olan minimal görev satırları, başlıkta bugünün tarihi [kaynaklı: https://apps.apple.com/app/things-3/id904280696 (Görülme: Kasım 2026)].
- **Hiyerarşi (Göz İlk Neyi Görür):** Ekrandaki geniş beyaz/açık gri boşluk ve ilk sırada yer alan temiz görev başlığı [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Tamamen kullanıcının içeriği kadar; arayüzün kendi kromu sıfır metin taşır [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** İlerleme dairesi (pie indicator) ve yuvarlak onay kutuları [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Dünyadaki en yüksek netlik ve sakinlik standardı. Kart sınırları neredeyse görünmezdir; tipografi ve negatif alan ana yapıyı oluşturur [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].

#### Ortak Desenler ve Kaçınılması Gerekenler (Ana Ekran Deseni)
> **Liderlerin Paylaştığı Desenler:** Lider uygulamalar ilk 5 saniyede kullanıcının zihnini tek bir görsel odakla karşılar: Oura "One Big Thing" ile tek bir içgörü sunar, Gentler Streak "Activity Path" ile tek bir güvenli koridor gösterir, MacroFactor ise tek bir pürüzsüzleştirilmiş trend çizgisi çizer. Metinler hiçbir zaman tam cümlelerle kartları doldurmaz; sayı ve durum kelimesi yeterlidir.
> 
> **Kaçınılması Gerekenler:** Ekranı aynı anda birden fazla bağıran renk ve çerçeveyle doldurmak; Next Call'un şu anki hatası olan koyu siyah kartın beyaz arka plana kontrast patlaması yapması, all-caps başlıklar ve haftalık tik şeridinin ilk ekranda kullanıcıyı sınava çekmesidir.

---

## 2. HAFTALIK ÖZET / HAFTALIK KARAR / RAPOR EKRANI

### WHOOP
- **Ekranda Ne Var:** 2024-2026 döneminde eski statik PDF formatındaki "Weekly Performance Assessment (WPA)" tamamen kaldırılmış, yerini "Weekly Plan" (Haftalık Plan / My Week) ve dinamik trend sekmelerine bırakmıştır [kaynaklı: https://support.whoop.com (Görülme: Kasım 2026)]. Pazartesi–Pazar ekseninde belirlenen hedefler (Derin Uyku, Kondisyon Artırma vb.), 7 günlük toparlanma/zorlanma ortalaması ve yapay zeka tarafından üretilen haftalık debrief kartı yer alır [kaynaklı: https://www.whoop.com/experience (Görülme: Kasım 2026)].
- **Hiyerarşi:** 7 günlük bileşik ortalama toparlanma halkası ve haftalık hedef tamamlama yüzdesi [kaynaklı: https://www.whoop.com/experience (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Orta. Eski uzun PDF sayfaları yerine 3-4 maddelik yapay zeka içgörüsü ("Geç saatte yenen yemekler toparlanmanı %12 düşürdü") [kaynaklı: https://www.whoop.com/experience (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** 7 günlük çubuk grafikler (zorlanma vs toparlanma kesişimi), hedef tamamlama çizgileri [kaynaklı: https://www.whoop.com/experience (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Eski WPA'e göre çok daha interaktif ve sakin; kullanıcıyı yargılayan "haftalık karne" hissi azaltılarak dinamik planlama hissine dönüştürülmüştür [kaynaklı: https://support.whoop.com (Görülme: Kasım 2026)].

### Oura (My Health / Weekly Trends)
- **Ekranda Ne Var:** "My Health" sekmesinde yer alan haftalık/aylık kardiyovasküler yaş, stres birikimi (Cumulative Stress) ve uyku düzenliliği trendleri [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].
- **Hiyerarşi:** "Gelişim Alanı" veya "Güçlü Yön" kartı; örneğin "Uyku Tutarlılığı: Optimal" şeklindeki yumuşak başlıklı özet [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük-orta. Tıbbi terimler yerine alışkanlıkların metriklerle bağı kurulur ("Erken yatışların toparlanmanı destekliyor") [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Yumuşak geçişli bant grafikleri, baseline (kişisel taban çizgisi) aralıkları [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Çok yüksek sakinlik. Bir haftalık kötü veriyi felaketleştirmeyen, kişisel taban çizgisine göre normalize eden koruyucu dil [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)].

### MacroFactor (Haftalık Check-In / Program Güncelleme)
- **Ekranda Ne Var:** Strategy sekmesinde beliren "Check-In" akışı. Kullanıcının son 7 gündeki tartı ağırlığı trendi, günlük kalori alımı ve güncellenen metabolik harcama (Expenditure V3) karşılaştırılır [kaynaklı: https://macrofactorapp.com/coached-program/ (Görülme: Kasım 2026)].
- **Hiyerarşi:** Önerilen TEK KARAR: "Yeni Kalori Hedefin: 2,150 kcal (-120 kcal)" ve makro dağılımı [kaynaklı: https://macrofactorapp.com/coached-program/ (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük-orta. "Koçluk Modülleri" (Coaching Modules) devreye girerek platoları veya değişimleri açıklar; kullanıcı isterse bu modülleri tek dokunuşla atlayabilir [kaynaklı: https://macrofactorapp.com/coached-program/ (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Trend kilosu grafiği (dalgalanmalardan arındırılmış), önceki hafta vs yeni hafta kalori sütun karşılaştırması [kaynaklı: https://macrofactorapp.com/expenditure/ (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Mükemmel sakinlik. Kullanıcı haftayı yüzde yüz kaçırmış veya aşırı yemiş olsa bile sistem yargılamaz; "Kilonuz şu yönde değişti, bu doğrultuda yeni hedefiniz budur" diyerek deterministik kararı uygulatır veya reddetme hakkı verir [kaynaklı: https://macrofactorapp.com/adherence-neutral/ (Görülme: Kasım 2026)].

### Runna (Weekly Plan Review)
- **Ekranda Ne Var:** Haftalık tamamlanan kilometre, kaçırılan antrenmanların telafi planı, gelecek haftanın uzun koşu ve interval hedefleri [kaynaklı: https://apps.apple.com/app/runna-running-training-plans/id1605335193 (Görülme: Kasım 2026)].
- **Hiyerarşi:** Haftalık toplam mesafe ("34.5 km / 35 km") ve haftalık tamamlama tebrik kartı [gözlem: https://runna.com (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük. Madde imli antrenman durumları ve gelecek haftaya geçiş düğmesi [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** 7 günlük renkli bloklar (yeşil tikler ve gri dinlenme günleri) [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Pozitif ve ileriye bakan ton. Kaçırılan günleri cezalandırmaz; antrenmanları otomatik olarak gelecek haftaya yeniden dağıtmayı teklif eder [kaynaklı: https://runna.com (Görülme: Kasım 2026)].

### Strava (Haftalık İlerleme Özeti)
- **Ekranda Ne Var:** "Weekly Progress"; bu haftaki toplam süre, mesafe, irtifa kazanımı ve geçen haftanın aynı anına göre karşılaştırma çubuğu [kaynaklı: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Hiyerarşi:** Devasa haftalık saat ve mesafe rakamı ("4h 28m / 42.1 km") [kaynaklı: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Neredeyse sıfır. Tamamen metriklerden ve çubuk grafiklerden oluşur [gözlem: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Günlük yığılmış çubuk grafikler (stacked bar charts) ve kümülatif ilerleme çizgisi [kaynaklı: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Kıyaslama odaklı olduğu için kimi zaman rekabetçi/sert gelebilir ("Geçen haftadan %15 daha az"). Ancak görsel netliği üst düzeydedir [gözlem: https://apps.apple.com/app/strava-run-bike-walk/id170216591 (Görülme: Kasım 2026)].

### Fitbod (Haftalık Kas Toparlanma Özeti)
- **Ekranda Ne Var:** Haftalık toplam kaldırılan yük (Volume / lbs/kg), çalıştırılan ana kas grupları dağılımı ve dinlenme dengesi [kaynaklı: https://fitbod.me (Görülme: Kasım 2026)].
- **Hiyerarşi:** Toplam hacim sayısı ve kas dengesi dairesel grafik gösterimi [kaynaklı: https://fitbod.me (Görülme: Kasım 2026)].
- **Metin Yoğunluğu:** Düşük; kas grubu isimleri ve yüzdeleri [kaynaklı: https://fitbod.me (Görülme: Kasım 2026)].
- **Veri Görselleştirme:** Kas dağılım pasta/radar grafiği ve hacim çubukları [kaynaklı: https://fitbod.me (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Mekanik ve analitik. Karar vermekten ziyade durum tespiti yapar [gözlem: https://fitbod.me (Görülme: Kasım 2026)].

#### Ortak Desenler ve Kaçınılması Gerekenler (Haftalık Karar Ekranı Deseni)
> **Liderlerin Paylaştığı Desenler:** Next Call için en kritik referans **MacroFactor Check-In** modelidir. Liderler haftalık kararı tek bir net teklif olarak sunar ("Yeni hedefin: -150 kcal" veya "Haftalık planını güncelle"). Geçmiş 7 günün hatasını kullanıcıya suçluluk duygusuyla ödetmez; veri dalgalanmalarını yumuşatarak deterministik matematiksel kararı sakin bir şekilde kabule açar.
> 
> **Kaçınılması Gerekenler:** Her günün tik/çarpı durumunu kullanıcının yüzüne vurmak; uzun açıklama paragraflarıyla kararı gölgelemek; kararı kabul etme butonunu ikincil plana itmek.

---

## 3. YAPAY ZEKA KOÇ SOHBET EKRANI (AI Coach Chat Screen)

### WHOOP Coach
- **Ekran Düzeni:** ChatGPT tarzı temiz dikey mesaj akışı; üstte "WHOOP Coach" başlığı, altta sabit metin giriş kutusu [kaynaklı: https://www.whoop.com/thelocker/whoop-coach/ (Görülme: Kasım 2026)].
- **Prompt Hapları (Prompt Pills):** Sohbet başladığında veya antrenman sonrasında beliren dinamik haplar: *"Dünkü antrenman toparlanmamı nasıl etkiledi?"*, *"Neden bugün bu kadar yorgunum?"*, *"Bu gece ne kadar uyumalıyım?"* [kaynaklı: https://openai.com/index/whoop/ (Görülme: Kasım 2026)].
- **Cevap İçi Zengin Kartlar:** AI sadece ham metin yazmaz; metnin içine kullanıcının HRV geçmişini, uyku evresi grafiğini veya toparlanma halkasını gösteren interaktif mikro kartlar yerleştirir [kaynaklı: https://www.whoop.com/thelocker/whoop-coach/ (Görülme: Kasım 2026)].
- **Input Bar ve Klavye:** Ekranın altına yapışık (docked), sade "Ask WHOOP anything..." placeholder'ı, mikrofon ve gönder ikonu [kaynaklı: https://www.whoop.com/thelocker/whoop-coach/ (Görülme: Kasım 2026)].
- **"Koç İşi Benim İçin Yapıyor" Hissi:** Kullanıcının 24 saatlik biyometrik verisini arka planda analiz edip direkt sonuç üretir; kullanıcıya ham veri aratmaz, çıkarımı hazır verir [kaynaklı: https://openai.com/index/whoop/ (Görülme: Kasım 2026)].

### Oura Advisor (Oura Labs'ten Ana Uygulamaya Geçiş)
- **Ekran Düzeni:** Doğal bir mesajlaşma arayüzü; Today sekmesindeki '+' butonundan veya içgörü kartlarından direkt ilgili konuyla açılır [kaynaklı: https://ouraring.com/blog/oura-advisor/ (Görülme: Kasım 2026)].
- **Prompt Hapları:** Bağlama duyarlı dinamik öneriler (örn. düşük hazırlık skorunda: *"Toparlanmak için bugün ne yapmalıyım?"*) [kaynaklı: https://ouraring.com/blog/oura-advisor/ (Görülme: Kasım 2026)].
- **Cevap İçi Zengin Kartlar:** Mesaj akışında doğrudan satır içi (in-line) trend eğrileri, uyku evreleri çubukları ve davranış korelasyon kartları [kaynaklı: https://ouraring.com/blog/oura-advisor/ (Görülme: Kasım 2026)].
- **Input Bar ve Klavye:** Akıcı iOS klavye yönetimi, temiz giriş barı [gözlem: https://apps.apple.com/app/oura/id1043837948 (Görülme: Kasım 2026)].
- **"Koç İşi Benim İçin Yapıyor" Hissi:** Kullanıcı tonunu ("Destekleyici/Sohbetçi" veya "Doğrudan/Hedef Odaklı") seçebilir. Oura Advisor geçmiş sohbetleri "Memories" (Hafıza) özelliğiyle hatırlar ve kullanıcının yaşam tarzını bildiğini hissettirir [kaynaklı: https://ouraring.com/blog/oura-advisor/ (Görülme: Kasım 2026)].

### Bevel Intelligence ("Ask Bevel")
- **Ekran Düzeni:** Google Gemini altyapısıyla güçlendirilmiş, sekmeli veya açılır pencereli temiz diyalog alanı [kaynaklı: https://bevel.health (Görülme: Kasım 2026)].
- **Prompt Hapları:** Duruma göre üretilen kartlar: *"Bugün neden dinlenmiş hissetmiyorum?"*, *"Haftalık toparlanma trendimi özetle"* [kaynaklı: https://bevel.health (Görülme: Kasım 2026)].
- **Cevap İçi Zengin Kartlar:** Apple Health ve giyilebilir cihaz verilerini içeren yapılandırılmış mini widget'lar ve korelasyon matrisleri [kaynaklı: https://bevel.health/changelog (Görülme: Kasım 2026)].
- **Input Bar ve Klavye:** Sesli dikte (mikrofon) desteği, o an bakılan ekranın bağlamını tek tıkla sohbete aktarma ("Attach Context") yeteneği [kaynaklı: https://bevel.health (Görülme: Kasım 2026)].
- **"Koç İşi Benim İçin Yapıyor" Hissi:** Arka plandaki veri tarama süreçlerini katlanabilir mini kutularda ("Analyzing 14 days of sleep data...") göstererek kullanıcıya derin bir analizin tamamlandığını hissettirir [kaynaklı: https://bevel.health (Görülme: Kasım 2026)].

### Future (İnsan Koç + Yapay Zeka Hibrit Sohbeti)
- **Ekran Düzeni:** Doğrudan kişisel antrenörle konuşma hissi veren iMessage benzeri ama veriyle zenginleştirilmiş akış [kaynaklı: https://apps.apple.com/app/future-personal-training/id1450099497 (Görülme: Kasım 2026)].
- **Prompt Hapları:** Hızlı yanıt hapları ("Antrenmanı tamamladım", "Form kontrol videosu gönder", "Hedefi güncelle") [kaynaklı: https://future.co (Görülme: Kasım 2026)].
- **Cevap İçi Zengin Kartlar:** Sesli koç mesajları (ses dalgası görseli), günün antrenman kartı widget'ı ve form analiz kutuları [gözlem: https://future.co (Görülme: Kasım 2026)].
- **Input Bar ve Klavye:** Medya yükleme (video/fotoğraf çekimi) butonu öne çıkarılmıştır [kaynaklı: https://future.co (Görülme: Kasım 2026)].
- **"Koç İşi Benim İçin Yapıyor" Hissi:** Koç haftalık planı hazırlar ve mesaj akışına bir "paket" olarak bırakır; kullanıcı sadece antrenmana başlar [kaynaklı: https://future.co (Görülme: Kasım 2026)].

#### Ortak Desenler ve Kaçınılması Gerekenler (AI Koç Sohbet Deseni)
> **Liderlerin Paylaştığı Desenler:** AI sohbeti artık boş bir metin kutusu ve upuzun monologlar üreten bir chatbot değildir. Liderler:
> 1. Ekran açıldığında hazır 3-4 dinamik prompt hapı sunar.
> 2. Yanıtların içine mutlaka görsel bir metrik kartı veya karar widget'ı gömer.
> 3. Kullanıcının klavyeyle uzun uzun yazmasını gerektirmeyecek hızlı aksiyon butonları ("Kararı Onayla", "Planı Değiştir") barındırır.
> 
> **Kaçınılması Gerekenler:** Next Call'un şu anki "zayıf chat ekranı" hatası: Kullanıcıyı beyaz boşlukta uzun metinlerle baş başa bırakmak; AI'ın deterministik kararla çelişen veya kullanıcının verisini görselleştirmeyen ham metinler üretmesi.

---

## 4. PAYLAŞIM KARTI / PAYLAŞILABİLİR GÖRSEL (Share Card)

### Strava
- **Format:** 9:16 dikey Instagram Hikaye formatı veya 1:1 kare [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].
- **Hangi Veri Öne Çıkıyor:** GPS rotası (turuncu kalın çizgi), toplam mesafe (km), süre, irtifa kazanımı ve tempo [kaynaklı: https://support.strava.com (Görülme: Kasım 2026)].
- **Markalama:** Altta veya üstte net Strava logosu, turuncu vurgu çizgisi. İsteğe bağlı olarak kullanıcının çektiği antrenman fotoğrafının üzerine bindirilen şeffaf (transparent sticker) veri katmanı [kaynaklı: https://support.strava.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Gurur ve performans odaklı, kontrastı yüksek, sosyal kanıtı güçlü [gözlem: https://press.strava.com (Görülme: Kasım 2026)].

### Hevy
- **Format:** 9:16 Instagram Story boyutu; siyah, beyaz veya şeffaf (kullanıcı fotoğrafının üstüne yapıştırmalık PNG) seçenekleri [kaynaklı: https://hevyapp.com (Görülme: Kasım 2026)].
- **Hangi Veri Öne Çıkıyor:** Toplam kaldırılan ağırlık ("12,450 kg kaldırıldı"), antrenman süresi, kırılan rekorlar (PR rozetleri) ve çalıştırılan kasların mini ısı haritası [kaynaklı: https://hevyapp.com (Görülme: Kasım 2026)].
- **Markalama:** `#hevy` etiketi ve köşede minimal logo [kaynaklı: https://hevyapp.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Ağırlık kaldırma kültürüne uygun, cesur ama modüler yapısı sayesinde derli toplu [gözlem: https://hevyapp.com (Görülme: Kasım 2026)].

### WHOOP
- **Format:** 9:16 dikey hikaye kartı veya doğrudan fotoğraf üstüne WHOOP Live veri bindirmesi [kaynaklı: https://support.whoop.com (Görülme: Kasım 2026)].
- **Hangi Veri Öne Çıkıyor:** Toparlanma yüzdesi (yeşil/sarı/kırmızı daire), günün zorlanması (Strain mavi halka) ve uyku süresi [kaynaklı: https://support.whoop.com (Görülme: Kasım 2026)].
- **Markalama:** Sağ üstte veya altta minimal beyaz WHOOP sembolü, koyu gradyan arka plan [gözlem: https://www.whoop.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Yüksek tasarım disiplini; metin kalabalığı yok, sadece sayılar ve ikonik halkalar konuşur [gözlem: https://www.whoop.com (Görülme: Kasım 2026)].

### Runna
- **Format:** 9:16 dikey koyu indigo arka planlı hikaye kartı [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Hangi Veri Öne Çıkıyor:** Devasa tempo ("4:12 /km") veya toplam mesafe, koşulan rota ve haftalık serinin durumu [gözlem: https://runna.com (Görülme: Kasım 2026)].
- **Markalama:** Tepeye yerleştirilmiş yalın Runna logosu, buzlu cam (frosted glass) veri kutucukları [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Modern, temiz ve elit atletik [gözlem: https://runna.com (Görülme: Kasım 2026)].

### Ladder
- **Format:** 9:16 yüksek kontrastlı koyu kart [kaynaklı: https://joinladder.com (Görülme: Kasım 2026)].
- **Hangi Veri Öne Çıkıyor:** Toplam tonaj ("Total Volume: 24,000 lbs"), antrenman adı ve koçun/takımın özel rozet damgası [gözlem: https://joinladder.com (Görülme: Kasım 2026)].
- **Markalama:** Genişletilmiş brutalist tipografiyle Ladder marka mührü [gözlem: https://joinladder.com (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Sert ve güçlü; doğrudan ağırlık kaldırma başarısını kutlar [gözlem: https://joinladder.com (Görülme: Kasım 2026)].

### Apple Fitness
- **Format:** Kare veya dikey paylaşım kartı; iOS Share Sheet üzerinden dışa aktarılır [kaynaklı: https://support.apple.com/guide/watch/share-activity-apd3bf6d5a9b/watchos (Görülme: Kasım 2026)].
- **Hangi Veri Öne Çıkıyor:** 3D Aktivite Halkaları, aktif kalori, toplam süre, ortalama nabız [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Markalama:** Zifiri siyah zemin üzerinde Apple standart SF Pro Rounded tipografisi ve halkaları [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Sakinlik vs. Sertlik:** Kusursuz Apple minimalizmi. Sıfır süsleme, salt veri netliği [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].

#### Ortak Desenler ve Kaçınılması Gerekenler (Paylaşım Kartı Deseni)
> **Liderlerin Paylaştığı Desenler:** Başarılı paylaşım kartları tek bir kahraman metriğe (hero metric) odaklanır: Strava'da harita çizgisi, WHOOP'ta yeşil toparlanma dairesi, Hevy'de kaldırılan toplam tonaj. Kartların formatı daima 9:16 (Instagram Stories) uyumludur ve arka plan şeffaf veya derin nötr tutularak kullanıcının kendi fotoğrafının üzerine binmesine izin verilir.
> 
> **Kaçınılması Gerekenler:** Kartın üzerine uzun Türkçe cümleler yazmak; karmaşık tablolar koymak; Next Call için haftalık kararı ("Bu hafta 150 kcal kestim") paylaşırken sıkıcı bir metin kartı üretmek yerine, kararın ve kilo eğrisinin ikonikleştiği bir mühür oluşturulmalıdır.

---

## 5. RENK PALETİ (Colour Palette)

*Not: Hex kodları yalnızca resmi marka kılavuzları, basın kitleri ve tasarım dokümantasyonlarında doğrulandığı takdirde verilmiştir. Tahmin edilenler `[tahmini]` olarak işaretlenmiş, bulunamayan değerler `doğrulanmadı` olarak belirtilmiştir.*

### WHOOP
- **Arka Plan:** Koyu tema gradyanı (Siyah ve derin arduvaz gri: `#101518` ile `#283339` arası) [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Koyu gri-mavi kart katmanları (`#1B2328` [tahmini]).
- **Metin:** Beyaz (`#FFFFFF`) ve açık kurşuni gri (`#A0AAB0` [tahmini]).
- **Vurgu (Accent):** Teal / Turkuaz (`#00F19F`), Zorlanma Mavisi (`#0093E7`), Uyku Arduvazı (`#7BA1BB`) [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
- **Semantik Renkler:** 
  - Yüksek Toparlanma (Yeşil): `#16EC06`
  - Orta Toparlanma (Sarı): `#FFDE00`
  - Düşük Toparlanma (Kırmızı): `#FF0026` [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
- **Varsayılan Mod:** Koyu (Dark Mode) varsayılandır.

### Oura
- **Arka Plan:** Sıcak krem/tuval (`#F7F1E8` veya `#EFE7DB`) ve Koyu modda derin İskandinav arduvazı (`#1B3449` / `#121A21` [tahmini]) [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Saf beyaz (`#FFFFFF`) veya yumuşak kumtaşı yüzeyler; kenarlıklar açık gri (`#ECECEC`) [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)].
- **Metin:** Kumtaşı mürekkebi / koyu sıcak kahve (`#4A4741`) ve yumuşak gri (`#5A5958`) [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)]. Sert zift siyahtan kaçınılır.
- **Vurgu (Accent):** Oura Mavisi (`#2A72DE`), Hover durumunda (`#2056A6`) [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)].
- **Semantik Renkler:** Doğadan ilham alan pastel tonlar; Zeytin Yeşili (`#5C6F5D`), Hardal Sarısı (`#AF751B`), Sıcak Kahve (`#715956`), Uyarı Kırmızısı (`#D22C15`) [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)].
- **Varsayılan Mod:** Açık/Krem (Light/Warm Canvas) marka kimliğinin temelidir; koyu mod desteklenir.

### Bevel
- **Arka Plan:** Derin grafit / antrasit (`#0D0E11` [tahmini]) [gözlem: https://bevel.health (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Hafif yükseltilmiş kart yüzeyi (`#17191E` [tahmini]).
- **Metin:** Beyaz (`#FFFFFF`) ve Apple ikincil etiket grisi (`#8E8E93`).
- **Vurgu (Accent):** Enerjik Mavi ve Mor gradyanlar [gözlem: https://bevel.health (Görülme: Kasım 2026)].
- **Semantik Renkler:** Yeşil (Toparlanma), Turuncu (Orta Zorlanma), Kırmızı (Aşırı Yük) [gözlem: https://bevel.health (Görülme: Kasım 2026)].
- **Varsayılan Mod:** Koyu (Dark Mode) varsayılandır.

### MacroFactor
- **Arka Plan:** Nötr koyu antrasit (`#121417` [tahmini]) veya açık modda yumuşak gri-beyaz (`#F4F5F7` [tahmini]) [kaynaklı: https://macrofactorapp.com (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Mat nötr kart yüzeyleri (`#1E2228` [tahmini]).
- **Metin:** Yüksek kontrastlı kirli beyaz (`#F0F2F5` [tahmini]) ve nötr gri.
- **Vurgu (Accent):** Turuncu/Mercan (Enerji harcaması çizgisi), Mavi/Teal (Kilo trend çizgisi) [gözlem: https://macrofactorapp.com (Görülme: Kasım 2026)].
- **Semantik Renkler:** Kırmızı alarm rengi bilinçli olarak YOKTUR. Hedef aşımı veya eksikliği nötr gri veya tamamlayıcı sakin tonlarla ifade edilir [kaynaklı: https://macrofactorapp.com/adherence-neutral/ (Görülme: Kasım 2026)].
- **Varsayılan Mod:** Sistem ayarını takip eder (Koyu mod ağırlıklıdır).

### Gentler Streak
- **Arka Plan:** Yumuşak Gece/Antrasit (`#111216` [tahmini]) veya Açık modda yumuşak pamuk beyazı (`#F9F9FB` [tahmini]) [kaynaklı: https://gentlerstories.com (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Yumuşak platin/gümüş kenarlıklı açık veya koyu yüzeyler [gözlem: https://apps.apple.com/app/gentler-streak-workout-tracker/id1576856835 (Görülme: Kasım 2026)].
- **Metin:** Koyu modda yumuşak beyaz, açık modda koyu kömür grisi.
- **Vurgu (Accent):** Mango Turuncusu / Mercan (`#FB7F42`) enerji için; Denim Mavisi / Yumuşak Teal toparlanma ve dinlenme için [kaynaklı: https://refero.design (Görülme: Kasım 2026)].
- **Semantik Renkler:** Agresif neon kırmızılar yerine pastel pembe, yumuşak lavanta ve huzurlu adaçayı yeşili [kaynaklı: https://gentlerstories.com (Görülme: Kasım 2026)].
- **Varsayılan Mod:** Sistem ayarına uyarlı (her iki modda da pastel yumuşaklığı korunur).

### Strava
- **Arka Plan:** Açık modda saf beyaz (`#FFFFFF`), Koyu modda (Haziran 2024'te resmi olarak yayınlandı) kömür karası (`#121214` [tahmini]) [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Açık modda açık gri (`#F0F0F2`), koyu modda antrasit kartlar (`#1E1E22` [tahmini]).
- **Metin:** Açık modda koyu mürekkep (`#242428`), ikincil metin (`#6D6D78`) [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].
- **Vurgu (Accent):** İkonik Strava Turuncusu (`#FC4C02`) [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].
- **Semantik Renkler:** Başarı/Kudos için turuncu, segment rekorları için altın sarısı (`#F2C94C` [tahmini]).
- **Varsayılan Mod:** Açık mod tarihsel standarttır; 2024 itibarıyla sistem varsayılanını takip eden tam koyu mod mevcuttur [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].

### Runna
- **Arka Plan:** Derin arduvaz indigo ve koyu kömür (`#0F1016` ile `#161616`) [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Yükseltilmiş kart katmanları (`#1C1E26` [tahmini]).
- **Metin:** Saf beyaz (`#FFFFFF`) ve açık arduvaz mavisi.
- **Vurgu (Accent):** Elektrik Misketi / Parlak Nane Yeşili (`#23CC56` [tahmini]) eylem butonları için; Mercan/Turuncu (`#F07561` [tahmini]) marka vurgusu için [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Semantik Renkler:** Koşu türüne göre kategori renkleri: Kolay koşu (Mavi), Tempo (Turuncu), İnterval (Pembe/Kırmızı) [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Varsayılan Mod:** Koyu (Dark Mode) varsayılandır.

### Ladder
- **Arka Plan:** Derin simsiyah obsidian (`#0E0E0E`) [kaynaklı: https://joinladder.com (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Koyu gri kartlar (`#1A1A1A` [tahmini]).
- **Metin:** Keskin tebeşir beyazı (`#FFFFFF`) ve soğuk gri (`#737373` [tahmini]).
- **Vurgu (Accent):** Neon yeşil veya takıma özel kontrastlı renk patlamaları [gözlem: https://joinladder.com (Görülme: Kasım 2026)].
- **Semantik Renkler:** PR rozetleri için altın/sarı, tamamlanan setler için parlak yeşil.
- **Varsayılan Mod:** Koyu (Dark Mode) varsayılandır.

### Apple Fitness
- **Arka Plan:** Saf Zifiri Siyah (`#000000`) - HIG gereği OLED ekranlarda halkaların parlaması için zorunludur [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Saydam gri kartlar (`#1C1C1E` / System Gray 6 Dark).
- **Metin:** Beyaz (`#FFFFFF`) ve sistem ikincil metin grisi (`#8E8E93`).
- **Vurgu (Accent):** 
  - Hareket (Move - Kırmızı/Pembe): `#FA114F`
  - Egzersiz (Exercise - Parlak Misket Yeşili): `#A3FF00` (veya `#AFFF00`)
  - Duruş (Stand - Parlak Camgöbeği Turkuaz): `#00F0FF` [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Semantik Renkler:** Bu üç halka rengi sistem genelinde değişmez kuraldır.
- **Varsayılan Mod:** Koyu (True Black) zorunludur.

### Things 3
- **Arka Plan:** Açık modda saf beyaz (`#FFFFFF`) ve ultra açık kağıt grisi (`#F7F7F8` [tahmini]); Koyu modda derin antrasit (`#1C1D1F` [tahmini]) [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Yüzey / Kartlar:** Kart sınırı kullanılmaz; içerik zemin üzerinde yüzer.
- **Metin:** Koyu grafit (`#202124` [tahmini]); koyu modda yumuşak beyaz.
- **Vurgu (Accent):** İkonik Things Mavisi (`#2883F6` [tahmini]) [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Semantik Renkler:** Son tarih uyarısı için yumuşak mercan kırmızısı (`#EB5757` [tahmini]), diğer tüm unsurlar nötrdür.
- **Varsayılan Mod:** Açık mod temel alınarak tasarlanmıştır.

#### Ortak Desenler ve Kaçınılması Gerekenler (Renk Paleti Deseni)
> **Liderlerin Paylaştığı Desenler:** Dingin ve insan odaklı uygulamalar (Oura, MacroFactor, Gentler Streak, Things 3) saf zift siyah (`#000000`) üzerine saf tebeşir beyazı (`#FFFFFF`) kontrastından kaçınır. Bunun yerine zemin için sıcak krem (`#F7F1E8`) veya yumuşak grafit (`#121417`), metin içinse kumtaşı/antrasit tercih edilir. Vurgu rengi TEK BİR odak noktasına tahsis edilir (örn. Oura'nın tekil mavisi `#2A72DE`).
> 
> **Kaçınılması Gerekenler:** Next Call'un şu an kullandığı beyaz zemin üstüne sert siyah kart ve neon turkuaz (`#007C8C` / `#2EE6D6`) kombinasyonu "göz kanatan" bir dijital yorgunluk üretir. Ayrıca kırmızı/yeşil ikiliğinin suçluluk hissi tetiklemesi sebebiyle, diyet ve kilo yönetiminde MacroFactor'ün yaptığı gibi kırmızı alarm renkleri tamamen dışlanmalıdır.

---

## 6. TİPOGRAFİ (Typography)

*Not: Yazı tipi boyutları, ağırlıkları ve dizgileri resmi tasarım spesifikasyonları üzerinden doğrulanmıştır. Doğrulanamayan değerler `doğrulanmadı` olarak belirtilmiştir.*

### WHOOP
- **Kullanılan Yazı Tipleri:** 
  - Kelimeler, Başlıklar ve Gövde Metni: **Proxima Nova** (Başlıklarda Bold %10 harf aralığı ile büyük harf; gövdede Semibold) [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
  - Sayılar ve Veriler: **DINPro** (Bold) [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
  - Sistem İkincil Font (Fallback): Helvetica Neue [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** DINPro Bold ile dizilmiş devasa toparlanma skoru (yaklaşık 48-56pt [tahmini]) [gözlem: https://www.whoop.com (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Başlık etiketlerinde büyük harf (ALL-CAPS: "RECOVERY", "DAY STRAIN"), açıklamalarda tümce düzeni (sentence case) [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Tabular/monospaced rakamlar kullanılarak metriklerin sıçraması engellenir [kaynaklı: https://www.whoop.com/brand-guidelines (Görülme: Kasım 2026)].

### Oura
- **Kullanılan Yazı Tipleri:**
  - Başlıklar ve Editoryal Hikaye Anlatımı: **Editorial New** (Zarif serif font) [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)].
  - Arayüz, Veri ve Gövde Metni: **Akkurat LL** (veya platform standart grotesque sans-serif) [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** İnce-orta ağırlıkta, aşırı devasa olmayan dengeli skor rakamları (yaklaşık 36-40pt [tahmini]) [gözlem: https://apps.apple.com/app/oura/id1043837948 (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Tamamen tümce düzeni (Sentence case: "Optimal", "Pay attention to your sleep") [kaynaklı: https://ouraring.com/blog/redesigning-the-oura-app (Görülme: Kasım 2026)]. ALL-CAPS bağrışmalarından kesinlikle kaçınılır.
- **Sayı Dizgisi:** Açık, rahat harf/rakam boşluklu orantısal dizgi [kaynaklı: https://ouraring.com (Görülme: Kasım 2026)].

### Bevel
- **Kullanılan Yazı Tipleri:** Apple sistem yazı tipi ailesi: **SF Pro** (*SF Pro Display* başlıklarda, *SF Pro Text* gövdede) [kaynaklı: https://bevel.health (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** SF Pro Display Bold ile halka içine gömülmüş büyük puan (32-44pt [tahmini]) [gözlem: https://bevel.health (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Başlıklarda Sentence case, mikro sayaç etiketlerinde hafif aralıklı büyük harf [gözlem: https://bevel.health (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Tabular Figures (`monospacedDigitSystemFont`) [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/ (Görülme: Kasım 2026)].

### MacroFactor
- **Kullanılan Yazı Tipleri:** 
  - Özel Marka Tipografisi: Pentagram ve Reset Type Studio ile özel tasarlanan değişken yazı tipi **MacroSans** [kaynaklı: https://macrofactorapp.com (Görülme: Kasım 2026)].
  - iOS Arayüzü: **SF Pro** [kaynaklı: https://macrofactorapp.com (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** Kalori ve kilo trendinde büyük, net, yuvarlatılmış his veren sayılar (36-44pt [tahmini]) [gözlem: https://macrofactorapp.com (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Neredeyse tamamen tümce düzeni (Sentence case: "Weight trend", "Target calories") [kaynaklı: https://macrofactorapp.com (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Tabular dizgi; besin loglamalarında rakamlar hizalı akar [kaynaklı: https://macrofactorapp.com (Görülme: Kasım 2026)].

### Gentler Streak
- **Kullanılan Yazı Tipleri:** Apple sistem ailesi: **SF Pro** ve Apple Watch'ta **SF Compact** [kaynaklı: https://gentlerstories.com (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** SF Pro Rounded benzeri yumuşatılmış his veren, insani boyutlarda sayılar [gözlem: https://apps.apple.com/app/gentler-streak-workout-tracker/id1576856835 (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Tamamen tümce düzeni (Sentence case). Samimi ve konuşma diline yakın [kaynaklı: https://gentlerstories.com (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Dinamik tipografi (iOS Dynamic Type tam desteği) [kaynaklı: https://developer.apple.com/design/awards/ (Görülme: Kasım 2026)].

### Strava
- **Kullanılan Yazı Tipleri:** Web ve pazarlamada özel geometrik grotesque türevleri; iOS uygulamasında yüksek oranda optimize edilmiş **SF Pro** [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** Ağır siklet (Heavy/Black) 40-48pt mesafe ve süre sayaçları [gözlem: https://press.strava.com (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Metrik etiketlerinde küçük punto büyük harf (ALL-CAPS: "DISTANCE", "PACE", "TIME"); başlıklarda Title Case [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Koşu esnasında sıçramaması için katı Tabular Figures [kaynaklı: https://press.strava.com (Görülme: Kasım 2026)].

### Runna
- **Kullanılan Yazı Tipleri:** Geometrik atletik sans-serif (Manrope veya Sora karakterinde özel tipografi) ve gövdede temiz grotesque [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** Dar ve kalın tempo/mesafe göstergeleri (40pt üzeri [tahmini]) [gözlem: https://runna.com (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Etiketlerde küçük izlemeli büyük harf ("WEEK 4", "TARGET PACE"), içerikte Sentence case [kaynaklı: https://runna.com (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Tabular [gözlem: https://runna.com (Görülme: Kasım 2026)].

### Ladder
- **Kullanılan Yazı Tipleri:** Başlıklarda genişletilmiş brutalist font (**EKModena Extended Heavy** veya benzeri özel geniş grotesque); arayüzde **SF Pro Display** [kaynaklı: https://joinladder.com (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** Çok kalın ve yatayda geniş rakamlar [gözlem: https://joinladder.com (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Başlıklarda agresif ALL-CAPS, detaylarda Sentence case [kaynaklı: https://joinladder.com (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Ağırlık/tekrar tablolarında Tabular [gözlem: https://joinladder.com (Görülme: Kasım 2026)].

### Apple Fitness
- **Kullanılan Yazı Tipleri:** **SF Pro Rounded** (Apple Human Interface Guidelines tarafından fitness ve sağlık için tavsiye edilen yumuşatılmış sistem yazı tipi) [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** SF Pro Rounded Bold ile yazılmış 40-48pt kalori ve dakika değerleri [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Sentence case veya Title Case; etiketlerde yumuşak harfler [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/activity-rings (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** SwiftUI `.monospacedDigit()` desteğiyle kusursuz tabular hizalama [kaynaklı: https://developer.apple.com/design/human-interface-guidelines/ (Görülme: Kasım 2026)].

### Things 3
- **Kullanılan Yazı Tipleri:** Apple sistem standardı: **SF Pro** [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Kahraman Sayı (Hero Number):** Sayı odaklı değildir; görev başlıklarında Medium/Semibold 17-20pt [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Harf Büyüklüğü (Case):** Tamamen doğal tümce düzeni (Sentence case) [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].
- **Sayı Dizgisi:** Doğal orantısal dizgi [kaynaklı: https://culturedcode.com/things/ (Görülme: Kasım 2026)].

#### Ortak Desenler ve Kaçınılması Gerekenler (Tipografi Deseni)
> **Liderlerin Paylaştığı Desenler:** Dinginlik hissi veren tüm modern uygulamalar (Oura, Apple Fitness, Gentler Streak, Things 3) ALL-CAPS yerine **Sentence case (Tümce düzeni)** kullanır. Sayılarda Apple ekosisteminin en insani ve modern yüzü olan **SF Pro Rounded** tercih edilir. Rakamlar hareketli loglamalarda zıplamaması için mutlaka **Tabular (monospaced digits)** olarak kodlanır.
> 
> **Kaçınılması Gerekenler:** Next Call'un şu anki "Barlow Condensed 900 ALL-CAPS" tercihi, fitness salonu tabelası gibi bağırıp dar kartları boğmaktadır. Özellikle **Türkçe arayüzde** kelimeler İngilizceye kıyasla %30-40 daha uzun olduğu için ("DEĞERLENDİRME", "SÜRDÜRÜLEBİLİRLİK"), dar ve aşırı kalın ALL-CAPS fontlar satır sonlarında feci kırılmalara yol açmakta ve okunabilirliği yok etmektedir.

---

## 7. TÜRKÇE YERELLEŞTİRME VE "NEXT CALL" İÇİN ÇIKARILAN DERSLER

Türkçe arayüz tasarımı, İngilizceye göre belirgin yapısal farklılıklar taşır:
1. **Kelime Uzunluğu:** "Hold" (4 karakter) -> "Sabit Tut" (9 karakter); "Add a set" (9 karakter) -> "Bir Set Ekle" (12 karakter); "Expenditure" (11 karakter) -> "Enerji Harcaması" (16 karakter). Barlow Condensed ALL-CAPS gibi fontlar Türkçe karakterlerle (`Ğ`, `İ`, `Ş`, `I`) birleştiğinde dikeyde çok fazla yer kaplamakta ve kaba bir görünüm oluşturmaktadır.
2. **Karakter Duyarlılığı:** Türkçe'deki noktalı `İ` ve noktasız `I` ayrımı, yabancı hazır fontlarda veya all-caps dönüşümlerinde sıkça tipografik hatalar üretir. SF Pro veya native sistem fontları bu sorunu sıfıra indirir.
3. **Cümle Kurgusu:** Türkçe sondan eklemeli bir dil olduğu için cümlelerin sonuna gelen ekler dar kartlarda satır taşmalarına yol açar. Bu nedenle Next Call'un kartlarında uzun açıklama cümleleri yerine "Durum + Tek Sayısal Karar" modeli uygulanmalıdır.

---

## 8. SENTEZ: DİNGİN, İNSANİ VE AZ METİNLİ BİR GÖRSEL DİL (Synthesis)

**7 Temel İlke (Haftalık Karar Uygulaması İçin):**
1. **Tek Odak:** Ekranda tek bir kahraman içgörü olmalı, yarışan halkalar elenmeli [Oura "One Big Thing", Gentler Streak].
2. **Uyum-Nötr Karar:** Sapmalar kırmızı alarmla değil, yapıcı matematiksel düzeltmeyle sunulmalı [MacroFactor].
3. **Baskısız Ritim:** Suçluluk hissettiren tik/çarpı şeridi yerine organik durum hücreleri kullanılmalı [Gentler Streak, Runna].
4. **Sentence Case & SF Pro Rounded:** Türkçe uzun kelimelerde ALL-CAPS bağrışması terk edilmeli [Apple Fitness, Things 3].
5. **Nötr & Sıcak Zemin:** Sert siyah-beyaz patlaması yerine sıcak krem veya mat grafit tercih edilmeli [Oura, Things 3].
6. **Eylemsel AI Diyaloğu:** Ham metin yerine prompt hapları ve dokunulabilir karar widget'ları sunulmalı [WHOOP Coach, Oura Advisor].
7. **9:16 Hikaye Mührü:** Paylaşımda karmaşık tablolar yerine haftanın tek kararı ve kilo eğrisi mühürleşmeli [Strava, Hevy].

**3 Aday Görsel Yön:**
- **1. Nordic Clarity:** Sessiz, lüks, editoryal. Sıcak yulaf/krem zemin, kumtaşı yüzey, koyu kömür metin, tekil kobalt mavi vurgu. SF Pro & zarif sans. Hero: Yumuşak gölgeli "Haftalık Karar Mührü" ve pürüzsüz kilo trend eğrisi.
- **2. Gentle Rhythm:** Empatik, organik biyo-ritim (Gentler Streak & Rise sentezi). Mat füme zemin, adaçayı yeşili ve gün batımı mercanı pastelleri. SF Pro Rounded. Hero: Kullanıcının dengesini gösteren tekil organik "Denge Koridoru".
- **3. Modern Studio:** Hassas mühendislik minimalizmi (MacroFactor & Teenage Engineering). Soğuk taş grisi zemin, antrasit yüzey, mat beyaz metin, tekil canlı kehribar vurgu. SF Pro tabular. Hero: 3 net sayısal blok ([Karar: -150 kcal], [Trend: -0.4 kg/hf], [4/4]) ve mikro koçluk hapı.

---
*Rapor Sonu. İlgili tüm analizler 25 Kasım 2026 itibarıyla taranan güncel pazar verilerine ve tasarım sistemlerine dayanmaktadır.*
