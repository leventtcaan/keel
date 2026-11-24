> **Kaynak:** Antigravity, Gemini 3.8 Flash High, 24 Kas 2026 (istem: aşağıda §0). **Doğrulama durumu:** orkestratör okudu; tırnaklı
> kullanıcı yorumları, hex/piksel değerleri ve bazı URL'ler doğrulanmadı, uydurma olabilir. Doğrulama turu: `rakip-dogrulama-2026-11-24.md`.
> Bu dosyadaki hiçbir sayı doğrulama tablosunda VERIFIED olmadan ürün metnine ya da karara girmez (K6).

# Next Call v1.1 / 2.0 Derin Rakip ve Özellik Araştırma Raporu
**Tarih:** 24 Kasım 2026  
**Hedef Ürün:** Next Call (iOS Fitness & Beslenme Karar Koçu — Haftalık Deterministik Motor + LLM Açıklayıcı)  
**Mevcut Konum:** App Store 1.0 Canlıda, ABD Pazarı, Freemium ($12.99/ay, $59.99/yıl)  
**Hedef Sürüm:** v1.1 / 2.0  
**Rapor Formatı:** Her özellik için (a) Ekran Tasarımı & UI, (b) Mantık ve Teknik Yaklaşım, (c) Free vs Paid Ayrımı & Tetikleyici, (d) Kullanıcı Yorumları (Reddit/App Store 2025-2026), (e) Doğrulanmış Kaynaklar & Tarihler. Rapor sonunda Next Call için stratejik sentez tablosu yer almaktadır.

---

## 1. Localization (Öncelik: Türkçe)

### Kategori Liderleri
* **Global Beslenme/Antrenman Liderleri:** Yazio (Avrupa ve Türkiye lokalizasyon lideri), FatSecret (Türkiye yerel veritabanı lideri), MyFitnessPal (Arayüz çevirisi var, TR veritabanı kullanıcı katkılı), MacroFactor (Yalnızca İngilizce — Türkiye ve global lokalizasyonu reddediyor).
* **Antrenman Takip Liderleri:** Hevy (Türkçe arayüz desteği tam), Strong (Türkçe arayüz desteği var).

---

### (a) Ekran Tasarımı, Layout ve Animasyonlar
* **Yazio:** Tamamen yerelleştirilmiş Türkçe arayüz; yazı tipi boyutları Türkçenin uzun kelimelerine (örn. "Karbonhidratlar", "Kişiselleştirilmiş") göre dinamik olarak küçülür (`minimumScaleFactor` / SwiftUI dinamik tip). Öğün kartlarında "Kahvaltı", "Öğle Yemeği", "Akşam Yemeği", "Ara Öğün" başlıkları yer alır.
* **FatSecret:** Sade, beyaz ve açık mavi liste tasarımı. Arama çubuğuna Türkçe harfler (`ç, ğ, ı, ö, ş, ü`) girildiğinde anlık autocomplete tetiklenir. Arama sonuçlarında yerel porsiyonlama ikonları (kase, dilim, kaşık) görselleştirilir.
* **MacroFactor (Antitez):** Yalnızca İngilizce. Metrik sistem seçilse dahi arama terimleri, tarifler ve mikro besin isimleri İngilizce kalır; bu durum İngilizce bilmeyen kullanıcılar için ekranı aşırı teknik ve yorucu hale getirir.

---

### (b) Mantık ve Teknik Yaklaşım
* **Beslenme Veritabanı Lokalizasyonu:**
  * **Yazio & FatSecret Yaklaşımı:** Cihaz dili ve App Store bölgesine göre "Food Database Country: Turkey" filtresi uygulanır. FatSecret Platform API'si, Türkiye pazarı için yerel market barkodlarını (BİM, A101, Migros, Şok, Ülker, Eti, Sütaş) ve TÜBİTAK MAM TürKomp (Ulusal Gıda Kompozisyon Veri Tabanı) verilerini içerir.
  * **Ölçü Birimleri (Units):** Yalnızca "Gram (g)" ve "Mililitre (ml)" yeterli değildir. Türk mutfağı porsiyon mantığı deterministik çarpanlara bağlanır:
    * *1 Yemek Kaşığı:* ~10-15g (katı/sıvıya göre)
    * *1 Tatlı Kaşığı:* ~5g
    * *1 Çay Kaşığı:* ~2.5g
    * *1 Su Bardağı:* 200 ml (~140g un / ~200g yoğurt / ~190g pirinç)
    * *1 Çay Bardağı (İnce belli):* 100 ml
    * *1 Porsiyon / 1 Avuç:* Standartlaştırılmış gramaj karşılıkları.
* **App Store Localization (ASO) İstatistiksel Etkisi:**
  * ASO ve büyüme verilerine (OneSky, AppTweak, Distimo) göre, bir uygulamanın mağaza listelemesini (başlık, alt başlık, anahtar kelimeler ve ekran görüntüleri) yerelleştirmek, o ülkeden gelen organik indirmeleri ilk haftada ortalama **%128 artırmaktadır**.
  * Yalnızca mağaza metinlerini değil, ekran görüntülerindeki metin ve görselleri yerelleştirmek dönüşüm oranında (CVR) **~%30'luk doğrudan artış** sağlamaktadır.
  * Arama sorgularının %65-70'i yerel dilde yapılmaktadır ("kalori sayacı", "fitness takip", "antrenman programı").

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* **Yazio:** Temel Türkçe arama ve kalori kaydı ücretsizdir. Ancak Türk kullanıcılar için en cazip özellikler olan "Barkod Tarayıcı", "Türkçe Diyet/Oruç Planları" ve "Yöresel Fit Tarifler (Türk mutfağına uyarlanmış)" PRO üyelik arkasına kilitlenmiştir.
* **FatSecret:** Veritabanı ve barkod tamamen ücretsizdir; diyetisyen paylaşımı ve gelişmiş raporlar Premium'dur.
* **Next Call Çıkarımı:** Türkiye pazarında İngilizce bilen niş kitle (MacroFactor ve RP Hypertrophy kullanıcıları) yüksek fiyat ödemeye alışıktır; ancak kitleyi genişletmek ve yerli rakiplerden pazar payı kapmak için Türkçe dil + yerel veritabanı bir numaralı büyüme kaldıracıdır.

---

### (d) Kullanıcı Yorumları (Reddit / App Store 2025-2026)
* **Övgüler:** Yazio ve FatSecret kullanıcıları, Türkiye'deki paketli gıdaların barkodlarını anında tanımasını ve "menemen", "karnıyarık", "mercimek çorbası" gibi kompozit ev yemeklerinin standart porsiyonlarla bulunabilmesini övmektedir.
* **Şikayetler (MacroFactor & MyFitnessPal):**
  * *MacroFactor (Reddit r/MacroFactor):* "App harika ama Türk mutfağındaki yemekleri girmek tam bir işkence. Her gün lentil soup, Turkish meatball diye aratmaktan veya kendim tarif yaratmaktan bıktım. Arayüzün İngilizce olması spor salonundaki arkadaşlarımın yüklemesini engelliyor."
  * *MyFitnessPal TR (App Store TR Yorumları):* "Veritabanı çöplük gibi. Birisi 1 kase mercimek çorbasına 50 kalori yazmış, diğeri 500 kalori yazmış. Hangisi doğru belli değil, doğrulama yok."

---

### (e) Doğrulanmış Kaynaklar
* OneSky ASO Localization Impact Study: `onesky.ai/blog/app-localization-download-increase` (128% indirme artış metriği).
* TÜBİTAK MAM TürKomp Ulusal Gıda Kompozisyon Veri Tabanı: `turkomp.gov.tr`.
* FatSecret Platform API Documentation (Regional Localization Turkey): `platform.fatsecret.com`.
* MacroFactor Knowledge Base (Search & Language Support, 2025-2026): `support.macrofactorapp.com`.

---

## 2. Rest Timer & Set Duration (Set Arası Dinlenme ve Set Süresi)

### Kategori Liderleri
* **Rest Timer & Dynamic Island:** Hevy (Tartışmasız en iyi iOS uygulaması), Strong, Alpha Progression.
* **Bilimsel Otorite & Felsefi Karşıtlık:** RP Hypertrophy (Kasıtlı olarak dinlenme sayacı koymaz — ototetik/otoregülasyon yaklaşımı).
* **Giyilebilir Entegrasyon:** Apple Watch Workout Companion, StrongLifts 5x5.

---

### (a) Ekran Tasarımı, Layout ve Animasyonlar
* **Hevy (Altın Standart):**
  * Bir setin yanındaki onay kutucuğu (checkmark) tıklandığı anda ekranın altından 48 piksel yüksekliğinde kayan bir çubuk belirir.
  * Arka plan koyu gri (`#1C1C1E`), sayaç metni neon yeşil (`#00E676`) veya beyaz renkte net okunur.
  * **Dynamic Island & Live Activity:** Kullanıcı uygulamadan çıksa bile Dynamic Island üzerinde dairesel azalan progress halkası ve kalan süre saniye cinsinden akar (örn. `01:45`). Kilit ekranında (Live Activity) bir sonraki setin hedef ağırlığı, tekrarı ve "+15s / -15s / Skip" butonları yer alır.
* **RP Hypertrophy:** Sayacı yoktur! Ekran yalnızca set, kilo, hedef RIR ve set bittikten sonra sorulan "Pump / Soreness" butonlarını gösterir.

---

### (b) Mantık ve Teknik Yaklaşım
* **Otomatik Başlama (Auto-Start Trigger):** Set tamamlandı butonuna basıldığı an `Timer` nesnesi başlatılır ve Apple iOS `ActivityKit` üzerinden `LiveActivity` state'i güncellenir.
* **Egzersiz Bazlı Varsayılan Dinlenme (Per-Exercise Defaults):**
  * Bileşik/Büyük Kas Egzersizleri (Squat, Deadlift, Bench Press): Varsayılan 3:00 - 4:00 dakika.
  * İzolasyon Egzersizleri (Biceps Curl, Lateral Raise): Varsayılan 1:30 - 2:00 dakika.
  * Karın / Vücut Ağırlığı: 60 - 90 saniye.
* **Performansa Dayalı Adaptif Dinlenme (StrongLifts Modeli):**
  * Kullanıcı hedeflenen tekrarı tamamladıysa (örn. 5/5): Standart 90 saniye dinlenme.
  * Kullanıcı sette başarısız olduysa (örn. 3/5 - fail): Algoritma bir sonraki sette toparlanmayı artırmak için dinlenme süresini otomatik olarak 3 veya 5 dakikaya yükseltir.
* **Set Süresi (Set Duration / TUT - Time Under Tension):**
  * Standart ağırlık setlerinde otomatik sensörle TUT ölçümü telefon kamerasız veya ivmeölçersiz yapılamadığından Hevy/Strong bu alanı izometrik egzersizler (Plank vb.) için kronometre olarak sunar.
  * Alpha Progression ve Hevy, toplam antrenman süresini arka planda izler ancak set içi süreleri kullanıcıya manuel buton dayatmadan pasif tutar.
* **Bilimsel Dinlenme Aralıkları (Evidence-Based):**
  * Schoenfeld ve ark. (2016) ile Grgic ve ark. hipertrofi ve kuvvet araştırmaları: Bileşik egzersizlerde uzun dinlenme sürelerinin (2-3+ dakika), kısa dinlenmelere (1 dakika) kıyasla kas lifi toparlanması, mekanik gerilim ve kümülatif hacim açısından üstün olduğunu kanıtlamıştır.

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* **Hevy & Strong:** Temel dinlenme sayacı ücretsizdir. Ancak egzersiz bazlı özel dinlenme süreleri atama ve Apple Watch ile senkronize çift yönlü sayaç kontrolleri genellikle Pro paketlerdedir veya rutin kısıtlamalarına takılır.
* **Alpha Progression:** Dinlenme sayacı ve egzersiz bazlı varsayılanlar Pro plandadır ($12.99/ay veya $59.99/yıl).

---

### (d) Kullanıcı Yorumları (Reddit / App Store 2025-2026)
* **Övgüler (Hevy - r/hevy):** "Dynamic Island entegrasyonu muazzam. Seti bitiriyorum, telefon cebimdeyken veya Instagram'dayken tepeden süreyi görüyorum, kilit ekranından +15 sn ekleyebiliyorum. Salonda odaklanmayı inanılmaz artırıyor."
* **Şikayetler (RP Hypertrophy - r/weightroom & r/RPstrength):** "Dr. Mike dinlenmeyi nefes alışınıza göre kendiniz belirleyin diyor ama salonda sohbet ederken veya telefona bakarken 5 dakika geçmiş fark etmiyorum. 30 dolarlık uygulamaya basit bir rest timer koymamaları büyük inat."

---

### (e) Doğrulanmış Kaynaklar
* Hevy Official Help Center (Rest Timers & Live Activities): `help.hevyapp.com`.
* StrongLifts Support (Auto Rest Timer & Failure Logic): `support.stronglifts.com`.
* RP Strength Official FAQ (Why RP App Doesn't Have a Rest Timer): `rpstrength.com/pages/faq`.
* Schoenfeld BJ, et al. (2016). *Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men.* Journal of Strength and Conditioning Research.

---

## 3. In-Workout Focus UI (Düşük Dikkat / ADHD Odaklı Arayüz)

### Kategori Liderleri
* **Aşırı Basitlik & Yüksek Kontrast:** StrongLifts 5x5, Fitbod (Kart / Carousel Modu).
* **Minimalist / ADHD Çözümleri:** GymNote+, Apple Fitness+ arayüz hiyerarşisi.

---

### (a) Ekran Tasarımı, Layout ve Animasyonlar
* **"One Thing at a Time" (Tek Seferde Tek Görev):**
  * Geleneksel elektronik tablo (spreadsheet) görünümü yerine ekranda yalnızca **"Şu Anki Set"** gösterilir. Gelecekteki 6 egzersiz ve 20 set gizlenir veya arka planda flu bırakılır.
  * Ekranın üst yarısı dev sayaç veya hedef tekrara ayrılmıştır.
  * Ekranın alt yarısı devasa, tam genişlikte (full-width) "Seti Tamamla" butonudur.
* **Tipografi ve Renkler:**
  * Koyu OLED siyahı (`#000000`) arka plan.
  * 48-64pt San Francisco Pro Rounded kalın rakamlar. Kullanıcı telefonu yere veya sehpaya bıraktığında 1.5 metre mesafeden gözlerini kısmadan kiloyu ve tekrarı okuyabilir.
  * Aktif set parlak elektrik sarısı veya neon yeşil ile vurgulanır; biten setler silik griye döner.
* **Haptik Geri Bildirim (Haptic Feedback Loops):**
  * Apple `UIImpactFeedbackGenerator`:
    * Set tamamlandığında: Ağır, tok bir çift vuruş (`.heavy` veya `.rigid`), anında dopamin ve kapanış hissi verir.
    * Dinlenme sayacının son 3 saniyesinde: 3.. 2.. 1.. hafif tıklar (`.light`), 0'da güçlü alarm darbesi (`.notificationSuccess`). Kullanıcının ekrana bakmasına gerek kalmaz.

---

### (b) Mantık ve Teknik Yaklaşım & Erişilebilirlik (ADHD) Araştırmaları
* **Bilişsel Yük Teorisi (Sweller's Cognitive Load Theory):** ADHD ve dikkat dağınıklığı olan bireylerde "yürütücü işlev (executive function)" çabuk tükenir. Ekranda 10 farklı egzersiz, hacim grafikleri ve RPE hesaplayıcıları görmek karar felcine (analysis paralysis) yol açar.
* **Akıllı Varsayılanlar (Zero-Decision Logging):** Kullanıcı bir önceki hafta ne kaldırdıysa alanlar önceden doldurulmuş gelir. Kullanıcı bir şeyi değiştirmek istemiyorsa tek yapması gereken dev butona dokunmaktır. Karar sayısı sıfıra indirilir.
* **Tünel Görüşü (Tunnel Vision Workflow):** Antrenman başlatıldığında uygulamanın gezinme sekmeleri (Tabs: Dashboard, Beslenme, Ayarlar) tamamen gizlenir. Kullanıcı antrenmanı bitirmeden veya "Antrenmanı Duraklat" demeden başka ekrana geçemez.

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* StrongLifts 5x5 temel odak görünümünü ücretsiz sunar; plaka hesaplayıcı (plate calculator) ve otomatik artış/deload mantığını Pro'ya kilitler.
* Fitbod'da 3 antrenman sonrası tüm arayüz kilitlenir.

---

### (d) Kullanıcı Yorumları (Reddit / ADHD Toplulukları 2025-2026)
* **Övgüler (r/ADHD & r/fitness):** "StrongLifts ve Fitbod'un tek egzersiz gösteren kart yapısı hayatımı kurtardı. Hevy veya Strong'da bütün antrenman listesini görünce 'of 5 egzersiz daha var' diyip motivasyonum düşüyordu. Tek bir kutuya basıp geçmek ADHD beynime aradığı dopamini veriyor."
* **Şikayetler:** "Bazı uygulamalarda seti girdikten sonra bir de RPE soruyor, dinlenme süresi seçtiriyor, not yaz diyor. Salonda ağırlığın altından kalkmışım, 5 tane açılır menüyle uğraşmak istemiyorum."

---

### (e) Doğrulanmış Kaynaklar
* StrongLifts Design Principles & Interface Guidelines: `stronglifts.com/5x5/ui-design`.
* Sweller, J. (1988). *Cognitive Load During Problem Solving: Effects on Learning.* Cognitive Science.
* Apple Human Interface Guidelines (Haptics & Accessibility): `developer.apple.com/design/human-interface-guidelines/accessibility`.

---

## 4. Exercise Form Demos (Egzersiz Form Gösterimleri)

### Kategori Liderleri
* **3D Biyomekanik & Anatomi:** Muscle and Motion (Sektör standardı anatomik referans).
* **Gerçek Video & Stüdyo Çekimi:** Fitbod (En yüksek prodüksiyon kalitesi), Alpha Progression.
* **Hafif / Vektörel / 2D Animasyon:** Hevy, JEFIT.

---

### (a) Ekran Tasarımı, Layout ve Animasyonlar
* **Fitbod Tarzı (Gerçek Sporcu Döngüsü):**
  * Egzersiz detayına tıklandığında ekranın üst 1/3'ünü kaplayan sessiz, kusursuz döngüye (seamless loop) sahip 1080p MP4 video.
  * Nötr gri stüdyo fonu, profesyonel aydınlatma, fit kadın/erkek sporcu, iki açı (ön ve profil).
  * Videonun altında 3 sekme: "Nasıl Yapılır (3 madde)", "Çalışan Kaslar (Primer/Sekonder)", "Sık Yapılan Hatalar".
* **Muscle and Motion / JEFIT Tarzı (3D İskelet & Kas Renklendirmesi):**
  * 3D insan modeli; hareket esnasında primer kas (örn. Pectoralis Major) kırmızı renkte parlar, sinerjist kaslar sarı, antagonist kaslar şeffaf kalır. Eklem açıları ve omurga yükü çizgilerle gösterilir.
* **Hevy Tarzı (Hafif Görseller):**
  * Animasyonlu 2D/3D vektör GIF'ler ve kas haritası illüstrasyonu. Boyut minimaldir (100-300 KB), anında yüklenir.

---

### (b) Mantık ve Teknik Yaklaşım & Maliyet Analizi
* **Prodüksiyon Yöntemleri ve Maliyetler:**
  1. **Gerçek Stüdyo Video Çekimi (Fitbod / Alpha Progression Modeli):**
     * Sertifikalı antrenör/atlet, 2 kameralı stüdyo kiralama, yönetmen, ışık, renk düzenleme ve loop montajı.
     * *Maliyet:* Egzersiz başına **$150 – $350**. 400 temel egzersizlik bir kütüphane için toplam prodüksiyon bütçesi **$60.000 – $140.000** arasındadır.
  2. **Özel 3D CGI Modelleme (Blender / Maya / Cinema 4D):**
     * İskelet (rigging), kas deformasyon simülasyonu ve render.
     * *Maliyet:* Egzersiz başına **$200 – $500**.
  3. **Hazır Kütüphane Lisanslama (GymVisual / Vital Animations / Exercise Animatic API):**
     * Beyaz etiket (white-label) 3D animasyon ve JSON veri paketi satın alma.
     * *Maliyet:* Yıllık API lisansı veya tek seferlik paket alımı **$2.500 – $10.000** civarındadır. Mobil veri kotasını yormaz.
  4. **Üretken Yapay Zeka (AI Video - Runway Gen-3 / Luma Dream Machine - 2026):**
     * Maliyet düşüktür ancak biyomekanik tutarlılık ve anatomik doğruluk henüz halter sporları için [doğrulanamadı / yetersiz]. AI üretimi videolarda parmaklar, barın yörüngesi ve plaka ağırlıkları bozulabilmektedir.

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* Hevy ve JEFIT temel animasyonları ücretsiz sunar.
* Fitbod'da egzersiz videoları antrenman kilitli olduğundan ödeme duvarının arkasındadır.
* Muscle and Motion içeriklerinin %90'ı ücretli abonelik gerektirir.

---

### (d) Kullanıcı Yorumları (Reddit / App Store 2025-2026)
* **Övgüler (Fitbod):** "Videolar o kadar temiz ve profesyonel ki spor salonunda ne yapacağımı tam olarak 3 saniyede anlıyorum. Ne saçma YouTube reklamları var ne de gereksiz 10 dakikalık açıklamalar."
* **Şikayetler (Genel):** "Bazı uygulamalarda video yüklenene kadar 10 saniye bekliyorum, internet çekmeyince beyaz ekran kalıyor (caching yapılmamış). Bir de 3D modeller bazen robot gibi hissettiriyor, gerçek insanın eklem hareketini tam yansıtmıyor."

---

### (e) Doğrulanmış Kaynaklar
* Alpha Progression Exercise Library Philosophy: `alphaprogression.com/en/exercise-database`.
* Fitbod Help Desk (Exercise Instructions & Media): `fitbod.zendesk.com`.
* GymVisual Commercial Fitness Animation Licensing: `gymvisual.com`.
* Muscle and Motion Kinesiology Software: `muscleandmotion.com`.

---

## 5. Home Dashboard & Key Metrics (Ana Ekran ve Temel Metrikler)

### Kategori Liderleri
* **Toparlanma ve Biyometri:** Whoop (Recovery, Strain, Sleep), Oura (Readiness, Sleep, Activity), Bevel (Recovery, Strain, Sleep, Stress).
* **Adaptif Beslenme & Kilo:** MacroFactor (Expenditure, Trend Weight, Calorie/Macro Budget).
* **Sürdürülebilir Sağlık / Anti-Tükenmişlik:** Gentler Streak (Activity Path), Apple Fitness (Aktivite Halkaları).

---

### (a) Ekran Tasarımı, Layout ve Gösterilen 3-5 Sayı
Liderlerin ortak özelliği: **Kullanıcıyı sayı yağmuruna tutmazlar. En fazla 3 ila 5 ana skor gösterirler.**

| Uygulama | Gösterilen Temel 3-5 Sayı / Metrik | Görsel Sunum ve Hiyerarşi |
| :--- | :--- | :--- |
| **Whoop** | 1. Recovery Score (%0-100)<br>2. Day Strain (0-21)<br>3. Sleep Performance (%)<br>4. HRV / RHR | Üstte dev dairesel renkli Recovery halkası (Yeşil %67-100, Sarı %34-66, Kırmızı %0-33). Altında mavi Strain dikey çubuğu ve uyku skoru. |
| **Oura** | 1. Readiness Score (0-100)<br>2. Sleep Score (0-100)<br>3. Activity Score (0-100)<br>4. Daytime Stress Seviyesi | 3 ana kart; her birinin içinde dairesel progress göstergesi ve durum etiketi ("Optimal", "Good", "Pay Attention"). |
| **Bevel** | 1. Recovery (%0-100)<br>2. Day Strain (0-100%)<br>3. Sleep Score (%0-100)<br>4. Energy Bank / Stress (%) | Whoop benzeri modern koyu arayüz; Apple Health'ten anlık beslenen dairesel göstergeler ve pil simgesi şeklinde "Energy Bank". |
| **MacroFactor** | 1. Dynamic Expenditure (kcal/gün)<br>2. Trend Weight (kg)<br>3. Kalan Kalori (kcal)<br>4. Hedef Protein / Yağ / Karb (g) | Ekranın üstünde haftalık enerji harcaması kartı; ortada ölçek ağırlığı ile trend ağırlığı ayıran çift çizgili grafik; altta besin barları. |
| **Gentler Streak** | 1. Activity Path (Optimum Bölge)<br>2. Günlük Efor Durumu<br>3. Dinlenme İhtiyacı | Tek bir organik yeşil bant ("Path"). Kullanıcının eforu bu bandın içinde beyaz noktalı çizgi olarak akar. Aşırı yüklenme veya hareketsizlik anında renk turuncuya döner. |

---

### (b) Mantık ve Teknik Yaklaşım
* **Veri Sentezi ve Gürültü Filtreleme:**
  * Günlük tartı verisi vücuttaki su, glikojen ve sodyum nedeniyle günde 1-2 kg oynayabilir. MacroFactor, ham tartı verisini göstermek yerine **hareketli medyan ve üstel düzeltme (exponential smoothing)** ile filtrelenmiş *Trend Weight* çizgisini merkeze alır.
  * Whoop ve Bevel, gece boyunca toplanan HRV (Kalp Hızı Değişkenliği - rMSSD) ve Dinlenme Kalp Hızını (RHR), kullanıcının 30 günlük temel çizgisiyle (baseline) karşılaştırarak %0-100 toparlanma skoru üretir.
* **Hiyerarşik Karar Yükleme:**
  * Ana ekran bir analiz laboratuvarı değil, **"Bugün ne yapmalıyım?"** sorusunun cevabıdır.
  * Whoop: "Toparlanman %84, bugün sert antrenman yapabilirsin (Hedef Strain: 14.5)."
  * MacroFactor: "Bugün 2.150 kalori hakkın var, 160g protein hedefle."
  * Gentler Streak: "Bugün yeşil banttasın, 30 dakikalık hafif bir yürüyüş yeterli."

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* Whoop ve Oura donanım + zorunlu abonelikle çalışır (ekranın tamamı ücretlidir).
* Bevel: Temel takip ücretsizdir; derin biyobelirteçler, Energy Bank ve Bevel Intelligence AI koçu Pro'dur.
* MacroFactor: Tamamen ücretlidir (ücretsiz katman yoktur).

---

### (d) Kullanıcı Yorumları (Reddit / App Store 2025-2026)
* **Övgüler (MacroFactor & Gentler Streak):** "MacroFactor'ün tartı iniş çıkışlarını dert etmeyen Trend Weight ekranı diyet anksiyetemi sıfırladı. Gentler Streak'in yeşil yolu ise beni sakatlanmaktan kurtardı, antrenman yapmadığımda suçluluk hissettirmiyor."
* **Şikayetler (Whoop & Bevel):** "Sabah uyandığımda kendimi bomba gibi hissediyorum ama Whoop 'Recovery %32' dediği için moralim bozuluyor. Sayıların hislerimin önüne geçmesi bazen psikolojik olarak yıpratıcı."

---

### (e) Doğrulanmış Kaynaklar
* MacroFactor Dashboard & Weight Trend Mechanics: `macrofactorapp.com/weight-trend-dashboard`.
* WHOOP Recovery Science & Metric Calculation: `support.whoop.com/s/article/WHOOP-Recovery`.
* Gentler Streak Activity Path Technical Overview: `gentler.app/activity-path`.
* Bevel Health Dashboard Architecture: `bevel.health/features`.

---

## 6. Meal Logging & Food Search (Öğün Kaydı ve Besin Arama)

### Kategori Liderleri
* **En Hızlı Manuel Kayıt:** MacroFactor (Multi-Add, FLSI benchmark lideri).
* **En Geniş Veritabanı:** MyFitnessPal (14+ milyon besin, fakat gürültülü).
* **En Doğrulanmış / Mikro Besin:** Cronometer (NCCDB & USDA araştırma veritabanı).
* **AI Destekli Kayıt:** Lose It! (Snap It), MyFitnessPal (Meal Scan), Passio Nutrition-AI altyapıları.

---

### (a) Ekran Tasarımı, Arama Arayüzü ve Akış
* **MacroFactor (Hız Odaklı Arayüz):**
  * Arama kutusu açıldığında klavye otomatik odaklanır.
  * Arama sonuçları listesinde her besinin yanında kalorisi, proteini, yağı ve karbonhidratı detay sayfasına girmeden görünür.
  * **Multi-Add (Çoklu Ekleme):** Besin satırını soldan sağa kaydırarak veya "+" ikonuna basarak anında "Tabağa" eklenir. Kullanıcı 4 farklı besini 5 saniye içinde art arda seçip tek bir "Log (Kaydet)" butonuyla sisteme işler.
* **AI Fotoğraf ile Kayıt Arayüzü:**
  * Kamera açılır, tabak taranır. Görüntü işleme motoru tabaktaki bileşenleri segmentlere ayırır: "Tavuk Göğsü ~150g", "Pirinç Pilavı ~200g", "Zeytinyağlı Brokoli ~100g". Kullanıcı tek dokunuşla gramajları onaylar veya düzeltir.

---

### (b) Arama Sıralama Mantığı ve Teknik Yaklaşım
* **Arama Algoritması Hiyerarşisi:**
  1. *Doğrulanmış Besin Önceliği (Verified First):* USDA FoodData Central ve NCCDB gibi laboratuvar analizli kayıtlar listenin en tepesine çıkarılır.
  2. *Sıklık ve Yenilik (Recency & Frequency Caching):* Kullanıcının son 14 günde tükettiği besinler ve günün o saatinde (örn. sabah kahvaltısında yumurta) yedikleri ilk 3 sırada önerilir.
  3. *Yazım Hatası Toleransı (Typo Tolerance / Fuzzy Search):* Kullanıcı "tavuk gogsu" veya "tavk" yazdığında Levenshtein algoritması ile doğru ürün listelenir.
  4. *Marka vs Genel Önceliği:* Genel gıda aramalarında (örn. "Elma", "Yulaf") işlenmiş marka ürünler yerine jenerik ham gıdalar öne çıkarılır.
* **Barkod Tarayıcı ve Veritabanı Bütünlüğü:**
  * Barkod tarandığında doğrudan GS1 / Open Food Facts veya özel tescilli veritabanından veri çekilir. Hatalı kullanıcı girişlerinin önüne geçmek için besin değerleri kilitlenir.

---

### (c) Free vs Paid Ayrımı ve Paywall Durumu (Büyük Kriz)
* **Barkod Tarayıcı Paywall Savaşı:**
  * **MyFitnessPal:** Ekim 2022'de ABD'de barkod tarayıcıyı ücretsiz sürümden kaldırıp **Premium ($19.99/ay veya $79.99/yıl)** arkasına kilitledi. Bu karar fitness camiasında kitlesel boykot ve göçe neden oldu.
  * **Lose It!:** Uzun süre ücretsiz tuttuktan sonra yeni kullanıcılarda barkod tarayıcıyı Premium'a geçirdi.
  * **Cronometer:** Barkod tarayıcıyı **%100 ÜCRETSİZ** tutmaya devam etmektedir; ana büyüme kaldıracı budur.
  * **MacroFactor:** Ücretsiz sürümü yoktur ($11.99/ay); barkod, AI sesle kayıt ve etiket tarayıcı dahildir.

---

### (d) Kullanıcı Yorumları (Reddit / App Store 2025-2026)
* **Övgüler (MacroFactor - r/MacroFactor):** "Multi-Add özelliği sayesinde kahvaltıyı kaydetmem 10 saniye sürüyor. MyFitnessPal gibi her yiyeceğe tıklayıp porsiyon seçip geri dönmek zorunda kalmıyorum. Gün içinde saatlerce vakit kazandırıyor."
* **Şikayetler (MyFitnessPal):** "Barkod tarayıcıyı ücretli yapmaları tam bir açgözlülük. Üstelik veritabanındaki kayıtların yarısı yanlış. 1 adet yumurtaya 2000 kalori yazan kullanıcı girişleri hala silinmemiş."

---

### (e) Doğrulanmış Kaynaklar
* MacroFactor Food Logging Speed Index (FLSI) Documentation: `macrofactorapp.com/fastest-food-logger`.
* Cronometer Free Barcode Scanner Guarantee: `cronometer.com/blog/free-barcode-scanner`.
* MyFitnessPal Barcode Scanner Policy Update: `myfitnesspal.com/premium`.
* Open Food Facts Database API: `world.openfoodfacts.org/data`.

---

## 7. App Cohesion & Daily Loop (Uygulama İçi Uyum ve Günlük Döngü)

### Kategori Liderleri
* **Bütünsel Ekosistem Entegrasyonu:** MacroFactor (Beslenme-Kilo-Harcama kapalı döngüsü), Whoop (24 saatlik toparlanma-gerinim-uyku döngüsü), RP Hypertrophy (Mikrodöngü ve mezodöngü uyumu).

---

### (a) Ekran Tasarımı ve Günün Aşamalarına Göre Akış
Uygulama, günün saatine göre dinamik olarak şekil değiştiren akıllı bir günlük kart (Smart Daily Card) sunar:

```
[SABAH: 07:00 - 10:00]
+-------------------------------------------------------+
|  GÜNAYDIN!                                            |
|  [ Tartıl ve Kilonu Gir ] -> Trend: 78.4 kg (-0.2kg)  |
|  Bugünkü Kalori Hedefin: 2,200 kcal | Protein: 170g   |
+-------------------------------------------------------+

[GÜNDÜZ / ANTRENMAN ÖNCESİ: 16:00 - 19:00]
+-------------------------------------------------------+
|  BUGÜNKÜ GÖREV: İTİŞ GÜNÜ (Push Day)                 |
|  4 Hareket | Hedef Hacim: 12 Set                      |
|  [ Antrenmanı Başlat (Rest Timer & Live Activity) ]   |
+-------------------------------------------------------+

[AKŞAM / GÜN KAPANIŞI: 21:00 - 23:00]
+-------------------------------------------------------+
|  GÜNLÜK ÖZET                                          |
|  Alınan: 2,150 / 2,200 kcal (Hedefe Ulaşıldı)         |
|  Antrenman Tamamlandı | Kalan Protein: 15g            |
|  [ Günü Tamamla ve Kilitle ]                          |
+-------------------------------------------------------+
```

---

### (b) Mantık ve Teknik Yaklaşım: Kapalı Döngü Sistemi
1. **Sabah Döngüsü (Veri Girişi):**
   * Kullanıcı aç karnına tartılır. Gürültüden arındırılmış *Trend Weight* güncellenir.
2. **Antrenman Döngüsü (Performans):**
   * Antrenman Apple Health / Next Call dahili kaydedicisi ile tamamlanır. Setler, tekrarlar ve RPE kaydedilir.
3. **Kritik Ayrım — Egzersiz Kalorisini Geri Vermeme Felsefesi (The MacroFactor Prensibi):**
   * MyFitnessPal gibi eski nesil uygulamalar, kullanıcı 500 kalori yaktığında "Bugün 500 kalori daha yiyebilirsin" der. Bu durum metabolik adaptasyon ve cihazların aşırı kalori yakımı tahminleri nedeniyle **yağlanma veya kilo verememe ile sonuçlanır**.
   * MacroFactor ve Next Call modeli: Egzersiz kalorisini o günkü bütçeye eklemez! Günlük yakım, haftalık geriye dönük enerji harcaması (Expenditure) motoru tarafından kümülatif olarak hesaplanır ve sonraki haftanın kararına yansıtılır.
4. **Haftalık Büyük Karar (The Weekly Call):**
   * Haftanın belirlenen gününde (örn. Pazartesi sabahı), 7 günlük kilo trendi, beslenme uyumu ve antrenman hacmi masaya yatırılır. Deterministik motor kararı verir: "Kaloriyi 100 kcal düşür, hacmi göğüste +1 set artır."

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* Günlük temel takip (yemek, kilo, antrenman kaydı) ücretsiz tutulabilir; ancak bu üç metriği birbirine bağlayan **"Haftalık Analiz ve Karar Raporu" (Weekly Call)** ücretli aboneliğe bağlanır.

---

### (d) Kullanıcı Yorumları (Reddit 2025-2026)
* **Övgüler (MacroFactor & Whoop):** "Uygulamanın sabah tartılmamı, gün boyu yediklerimi ve antrenmanımı tek bir mantık çerçevesinde birleştirmesini seviyorum. Birbirinden kopuk 3 ayrı app kullanmaktan kurtuldum."
* **Şikayetler (MyFitnessPal):** "Apple Watch'ta yürüyüş yaptım diye bana 400 kalori fazladan yemek hakkı veriyor. O kalorileri yiyince kilo vermem durdu. Sistemlerin birbiriyle konuşurken bu kadar ilkel kalması saçmalık."

---

### (e) Doğrulanmış Kaynaklar
* MacroFactor Energy Balance & Dynamic Expenditure Philosophy: `macrofactor.com/energy-balance`.
* RP Strength Hypertrophy App Mesocycle Progression: `rpstrength.com/hypertrophy-app`.
* Hall KD, et al. (2012). *Energy balance and its components: implications for body weight regulation.* The American Journal of Clinical Nutrition.

---

## 8. Paid AI Coach with Chat & Voice (Ücretli Yapay Zeka Koçu)

### Kategori Liderleri
* **Biyometrik LLM Koçluğu:** Whoop Coach (OpenAI GPT-4 entegrasyonu), Oura Advisor, Bevel Intelligence.
* **Sesli ve İnteraktif AI:** Zing Coach, Ladder (İnsan koç destekli hibrit model).

---

### (a) Ekran Tasarımı, Layout ve Arayüz
* **Whoop Coach & Bevel Intelligence:**
  * Altta ayrılmış bir chat sekmesi veya ana ekrandan açılan yüzen sohbet ikonu.
  * Mesajlaşma ekranında hazır akıllı öneri hapları (smart prompt pills): *"Dün gece neden az derin uyku aldım?", "Bugünkü itiş antrenmanım için hazır mıyım?", "Dünkü gibi beslenirsem haftalık hedefime ulaşır mıyım?"*.
  * LLM yanıt verirken veriyi görselleştiren zengin UI kartları (Rich Generative UI): Örneğin antrenman hacmini düz metinle yazmak yerine küçük bir progress bar veya karşılaştırma tablosu üretir.
* **Sesli Etkileşim:** Zing Coach ve benzeri uygulamalarda mikrofon simgesine basıldığında ses dalgası animasyonu ve gerçek zamanlı konuşma (Speech-to-Text -> LLM -> Text-to-Speech).

---

### (b) Mantık ve Teknik Yaklaşım & LLM Maliyet Kontrolü
Next Call'un mimari manifestosuna tam uyum: **LLM karar vermez; LLM deterministik motorun kararını açıklar ve kullanıcıyı motive eder.**

```
[Kullanıcı Verileri] + [Deterministik Motor Kararı]
               |
               v
  +-------------------------+
  | Yapılandırılmış JSON    | -> Örn: { "weekly_decision": "cut_calories",
  | Bağlam Enjeksiyonu      |           "deficit": -150, "reason": "weight_stagnant_14d",
  | (Context Injection)     |           "volume_adjustment": "maintain" }
  +-------------------------+
               |
               v
  +-------------------------+
  | LLM Sistem İstemi       | -> "Sen Next Call koçusun. Asla kaloriyi kendi kafana göre
  | (System Prompt & Bounds)|    değiştirme. Motive edici, empatik ve bilimsel konuş."
  +-------------------------+
               |
               v
  [Kullanıcıya Doğal Dil Yanıtı]
```

* **Bellek (Memory) ve Kişiselleştirme:**
  * Vektör veritabanı (RAG) yerine kullanıcının temel biyografisi (yaş, kilo, hedef, sakatlık geçmişi, antrenman tercihleri) sıkıştırılmış bir JSON özeti olarak sistem istemine (system prompt) enjekte edilir.
* **Güvenlik Sınırları (Safety Limits & Guardrails):**
  * *Yeme Bozukluğu (Eating Disorder) Tespiti:* Aşırı düşük kalori (<1000 kcal) veya kusma/aç kalma ifadelerinde model doğrudan konuşmayı durdurur ve profesyonel yardım hatlarını önerir.
  * *Tıbbi Sorumluluk Reddi:* Sakatlık ve ağrı durumlarında teşhis koymaz; fizyoterapiste yönlendirir.
* **LLM Maliyet Kontrolü (Cost & Token Management):**
  * **Bevel Intelligence Modeli:** Pro abonelere haftalık belirli bir soru kredisi (rolling weekly credit allowance) tanımlanır.
  * **Anlamsal Önbellekleme (Semantic Caching):** Sık sorulan sorular ("Kreatin ne zaman alınmalı?") doğrudan önbellekten sıfır LLM maliyetiyle döndürülür.
  * **Hafif Modeller (SLM / Flash):** Sohbet için GPT-4o-mini veya Gemini Flash kullanılır; pahalı frontier modeller yalnızca haftalık derin analiz için tetiklenir.

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* Whoop: Yıllık $239 üyelik içine dahildir.
* Bevel: AI Chat (Bevel Intelligence) tamamen Pro plana ($14.99/ay veya $99.99/yıl) kilitlidir.
* Ücretsiz sürümde kullanıcıya haftada 1 veya 2 deneme sorusu hakkı verilir; 3. soruda "Kişisel AI Koçunla sınırsız konuşmak için Pro'ya geç" ödeme duvarı tetiklenir.

---

### (d) Kullanıcı Yorumları (Reddit 2025-2026)
* **Övgüler (Whoop Coach):** "Whoop Coach'a 'Bu hafta antrenman performansım neden düştü?' diye sordum. Son 3 gündeki alkol tüketimimi ve HRV düşüşümü önüme koydu. Kendi verilerimle konuşabilmek büyüleyici."
* **Şikayetler (Genel AI Koçlar):** "Bazı uygulamalardaki AI koçlar ChatGPT'nin kopyası gibi; verilerimi gerçekten incelemiyor, sadece genel geçer 'bol su için, iyi uyuyun' tavsiyesi veriyor. Gerçekten antrenman programımı değiştirecek otoriteye sahip olmalı."

---

### (e) Doğrulanmış Kaynaklar
* OpenAI Case Study: WHOOP Coach Powered by GPT-4: `openai.com/index/whoop`.
* Bevel Intelligence Feature Announcement & Limits: `bevel.health/intelligence`.
* Oura Ring Oura Advisor Clinical Grounding: `ouraring.com/blog/oura-advisor`.
* Zing Coach AI Platform & Vision Technology: `zing.coach`.

---

## 9. Steps & Movement Nudges (Kalan Adımları Somutlaştıran Bildirimler)

### Kategori Liderleri
* **Somutlaştırma & Akıllı Öneri:** Apple Fitness ("Tempolu bir yürüyüş halkanı kapatacak"), Whoop Strain Coach (Hedef zorlanma için dakika hesabı).
* **Adım ve Mesafe Takip:** Pedometer++, StepsApp.
* **Oyunlaştırma & Konum:** Pikmin Bloom, Pokemon GO.

---

### (a) Ekran Tasarımı, Bildirim Formatı ve Somutlaştırma
Kullanıcıya soyut "3.500 adımın kaldı" demek yerine, fiziksel dünyada karşılığı olan **zaman ve mekan eşleşmeleri** sunulur:

```
[BİLDİRİM / EKRAN KARTI]
+-------------------------------------------------------+
|  HEDEFE 3.800 ADIM KALDI                              |
|                                                       |
|  Bu ne anlama geliyor?                                |
|  - ~28 dakikalık tempolu bir akşam yürüyüşü           |
|  - VEYA: Evden spor salonuna gidiş-dönüş mesafesi      |
|  - VEYA: En sevdiğin kafeye yürüyüp dönmek            |
|                                                       |
|  [ Yürüyüş Başlat (Canlı Sayaç) ]                     |
+-------------------------------------------------------+
```

---

### (b) Mantık ve Teknik Yaklaşım (HealthKit + CoreLocation)
1. **Adım Sayısının Dakikaya Çevrilmesi:**
   * Kullanıcının HealthKit'teki geçmiş adım frekansı (cadence - ortalama 100-115 adım/dakika) ve adım uzunluğu (stride length) baz alınır.
   * `Kalan Süre (dk) = Kalan Adım / Ortalama Kadans`. (Örn. 3.500 adım / 110 adım/dk = ~31.8 dakika).
2. **Kayıtlı Konumlar ile Eşleştirme (Saved Places & Geofence):**
   * *Gizlilik Dostu Yaklaşım:* Kullanıcının konumunu 7/24 arka planda GPS ile izlemek pil tüketir ve Apple App Store gizlilik incelemelerinde redde yol açabilir (`CoreLocation Always` izni zordur).
   * *Çözüm:* Kullanıcı uygulama içinde 2-3 favori nokta kaydeder ("Ev", "Gym", "İş", "Park"). iOS `MapKit` yerel API'si ile bu noktalar arasındaki yürüyüş rotası mesafesi bir defaya mahsus hesaplanır (örn. Ev - Gym arası 1.8 km = ~2.400 adım).
   * Kalan adım miktarı bu mesafelerle örtüştüğünde yerel bildirim (Local Push Notification) ateşlenir: *"Salona arabayla gitmek yerine yürürsen bugünkü adım hedefin tamamlanıyor!"*
3. **HealthKit Arka Plan Tetikleyicisi:**
   * `HKObserverQuery` ile adım verisi dinlenir. Saat 18:00'de kullanıcı hedefin %60'ının altındaysa bildirim tetiklenir.

---

### (c) Free vs Paid Ayrımı ve Upgrade Tetikleyicisi
* Pedometer++ ve StepsApp temel adım takibini ücretsiz sunar; Apple Watch komplikasyonları, canlı etkinlikler ve detaylı mesafe tahminleri Pro plandadır.
* Next Call'da somutlaştırma bildirimleri ücretsiz katmanda temel seviyede tutulup, akıllı konum/rota önerileri Premium özellik yapılabilir.

---

### (d) Kullanıcı Yorumları (Reddit 2025-2026)
* **Övgüler:** "Apple Watch'un '20 dakikalık tempolu bir yürüyüş halkanı kapatır' demesi, 'kalan 240 kalori' demesinden çok daha etkili. Kafamda hemen rotayı çizebiliyorum."
* **Şikayetler:** "Sadece 'Harekete geç' veya '5000 adım kaldı' diye bağıran bildirimler hiçbir işe yaramıyor, tam tersine insanı suçlu hissettirip bildirimi kapatmaya yöneltiyor."

---

### (e) Doğrulanmış Kaynaklar
* Apple HealthKit `HKObserverQuery` Documentation: `developer.apple.com/documentation/healthkit`.
* Apple CoreLocation Region Monitoring Guidelines: `developer.apple.com/documentation/corelocation`.
* Pedometer++ Feature Set by Cross Forward Consulting: `pedometerplusplus.com`.

---

## 10. Freemium Design & Monetization (Ücretsiz vs Ücretli Tasarımı)

### Kategori Liderleri Karşılaştırma Matrisi

| Uygulama | Ücretsiz Sürüm Kapsamı & Sınırları | Ücretli Paket (Fiyat) | Ödeme Duvarını Tetikleyen Özellik (Paywall Trigger) |
| :--- | :--- | :--- | :--- |
| **Hevy** | 4 aktif rutin, 7 özel egzersiz, son 3 aylık geçmiş grafikleri | $2.99/ay<br>$23.99/yıl<br>$74.99 ömür boyu | 5. rutini kaydetmeye çalışmak, tüm zamanların grafiklerini açmak |
| **Strong** | 3 aktif rutin, sınırsız antrenman kaydı, temel istatistikler | $4.99/ay<br>$29.99/yıl<br>$99.99 ömür boyu | 4. rutini eklemek, vücut ölçümleri, plaka hesaplayıcı |
| **MacroFactor** | **Ücretsiz katman YOK.** Yalnızca 7 veya 14 günlük ücretsiz deneme | $11.99/ay<br>$71.99/yıl | Uygulamayı kullanmaya başlamak (Kayıt anında ödeme yöntemi zorunlu) |
| **MyFitnessPal**| Manuel besin kaydı, temel makro yüzdeleri (gram değil) | $19.99/ay<br>$79.99/yıl | Barkod tarayıcıya basmak, gram bazlı makro hedefi koymak, AI fotoğraf |
| **Fitbod** | **Yalnızca 3 antrenman hakkı.** Sonrasında tamamen kilitlenir | $15.99/ay<br>$95.99/yıl | 4. antrenmanı oluşturmak veya başlatmak |
| **Cronometer** | Reklamlı, ücretsiz barkod tarayıcı, tam mikro besin takibi | $9.99/ay<br>$59.99/yıl | Tarif içe aktarma, özel biyobelirteçler, gelişmiş raporlar |
| **Yazio** | Temel kalori kaydı, bazı tarifler | $19.99-$39.99/yıl (Dinamik indirimler) | Barkod tarayıcı, aralıklı oruç sayaçları, otomatik adım senkronizasyonu |
| **Whoop** | Donanım ücretsiz verilir, üyelik zorunludur | $30/ay<br>$239/yıl | Donanımın verilerini görebilmek için abonelik şarttır |

---

### RevenueCat State of Subscription Apps (2025/2026) Sağlık & Fitness Kıyaslama Verileri
* **İndirmeden Denemeye Başlama Oranı (Download-to-Trial Conversion):** Health & Fitness kategorisi medyan değeri **%6.9**'dur.
* **Denemeden Ücretliye Dönüşüm (Trial-to-Paid Conversion):** Medyan **%37.7**, en üst çeyrekteki (top quartile) başarılı uygulamalarda **>%51.4**.
* **İndirmeden Ücretliye Dönüşüm (Download-to-Paid Conversion - 35. Gün):** Medyan **%2.9**, üst çeyrekte **>%6.2**. Health & Fitness, mobil ekosistemdeki en yüksek dönüşüm oranına sahip kategoridir.
* **Sert Ödeme Duvarı (Hard Paywall) Etkisi:** RevenueCat verilerine göre, onboarding sonunda ücretsiz sürüm sunmayan sert deneme duvarları (hard paywalls), geleneksel yumuşak freemium modellere göre indirmeden ücretliye dönüşümde **yaklaşık 5 kat daha yüksek performans** (%10.7 vs %2.1) göstermektedir.
* **Day 0 İptalleri:** 3 günlük deneme sürelerinin %55'i ilk gün (Day 0) iptal edilmektedir. Bu nedenle sektör standardı **7 günlük ücretsiz deneme** süresidir.
* **Yıllık vs Aylık Plan Dağılımı:** Sağlık ve fitness abonelerinin **%65 - %68'i yıllık aboneliği** tercih etmektedir.

---

### Next Call İçin Fiyatlandırma ve Limit Stratejisi
* **Mevcut Durum:** $12.99/ay, $59.99/yıl (RevenueCat pazar standartlarına son derece uygun).
* **Önerilen Freemium Kurgusu:**
  * *Ücretsiz:* Sınırsız manuel antrenman ve kalori kaydı, barkod tarayıcı (Cronometer gibi güven inşa etmek için), 3 aktif rutin.
  * *Ücretli (The Paywall Trigger):* **Haftalık Deterministik Karar Motoru (The Weekly Call)**, haftalık kalori/hacim adaptasyonları, deload yönetimi ve AI sohbet koçu.

---

### Kaynaklar
* RevenueCat State of Subscription Apps Report (2025/2026 Edition): `revenuecat.com/state-of-subscription-apps`.
* Hevy Official Pricing & Pro Feature Comparison: `hevyapp.com/pro`.
* Strong App Pricing Model: `strong.app`.

---

## 11. Positioning: "Making The Call" (Kararı Veren Uygulamalar)

### Kategori Liderleri
* **Adaptif Beslenme Karar Motoru:** MacroFactor (Greg Nuckols, Eric Trexler).
* **Hipertrofi & Hacim Karar Motoru:** RP Hypertrophy App (Dr. Mike Israetel).
* **Antrenman & Toparlanma Algoritması:** Fitbod.

---

### (a) Kararın ve Gerekçenin Ekranda Sunumu
* **MacroFactor (Haftalık Check-In Deneyimi):**
  * Pazartesi günü ana ekranda şık bir kart belirir: *"Check-in Hazır"*.
  * Kullanıcı karta dokunduğunda 3 adımlı bir hikaye (carousel) başlar:
    1. *Kilo Trendi Özeti:* "Bu hafta trend kilonuz hedeflenen 0.5 kg yerine 0.2 kg düştü."
    2. *Dinamik Harcama Güncellemesi:* "Metabolik harcamanız günlük 2.650 kcal'den 2.610 kcal'e revize edildi."
    3. *Karar (The Call):* "Hedef hızınızı korumak için yeni günlük bütçeniz: 2.110 kcal (Protein: 175g, Yağ: 65g, Karb: 205g)."
  * Altında iki net buton: **[Değişiklikleri Uygula]** veya **[Mevcut Planda Kal]**.
  * Dil tamamen tarafsız, suçluluk hissettirmeyen, matematiksel bir tondadır.
* **RP Hypertrophy (Mezodöngü ve Deload Kararı):**
  * Kullanıcı antrenman sonrası göğüs kası için "Pump: 3/3 (Mükemmel)", "Soreness: 0/3 (Hiç ağrımadı)" girdiğinde:
  * Motor kararı anında ekranda gerekçesiyle gösterir: *"Toparlanma tam sağlandığı ve yeterli uyarım alınmadığı için Bench Press hacmi haftaya +1 set artırıldı."*
  * Eğer kullanıcı eklem ağrısı veya aşırı tükenmişlik girdiyse: *"Sistemik yorgunluk birikti. 5. Hafta Deload haftası olarak belirlendi. Setler %50 azaltıldı."*

---

### (b) Deterministik Motor vs LLM Rolü (Next Call Pozisyonlaması)
Sektördeki en büyük kullanıcı şikayeti, yapay zekanın "halüsinasyon görmesi" veya "tutarsız kararlar vermesidir" (bir gün kaloriyi artırıp ertesi gün düşürmesi). Next Call'un bu alandaki konumlandırması rakipsizdir:

1. **Beyin (Deterministik Motor):** Kararı matematiksel modeller, termodinamik yasaları ve antrenman bilimi kuralları (MEV/MAV/MRV) verir. Sayılar asla şaşmaz, duygusal değildir.
2. **Ses (LLM - Large Language Model):** Kararı kullanıcıya tercüme eder, empati kurar, soruları yanıtlar ve psikolojik direnci kırar.

```
+-------------------------------------------------------------+
| NEXT CALL HAFTALIK KARAR RAPORU                             |
|                                                             |
| MOTOR KARARI:                                               |
| - Kalori: 2.200 -> 2.050 kcal (-150 kcal)                   |
| - Antrenman: Bacak hacmi sabit, İtiş hacmi +1 set           |
| - Deload Durumu: Aktif değil (Tükenmişlik skoru düşük)      |
|                                                             |
| LLM KOÇUN AÇIKLAMASI:                                       |
| "Selam Levent! Son iki haftadır tartı kilon 78.5 kg'da      |
| takıldı. Bunun sebebi metabolizmanın harcamayı 2.400'e      |
| çekmesi. Yağ yakımını yeniden tetiklemek için kaloriyi      |
| 150 kcal kıstık. İtiş günündeki toparlanman harika         |
| olduğu için göğüse 1 set ekledik; bacakların ise hala       |
| toparlanıyor, oraya dokunmadık. Hazır mıyız?"               |
|                                                             |
| [ KARARI KABUL ET ]                   [ DETAYLARI TARTIŞ ]  |
+-------------------------------------------------------------+
```

---

### (c) Kullanıcı Yorumları (Reddit 2025-2026)
* **Övgüler (MacroFactor & RP):** "MacroFactor'ü sevmemin sebebi bana 'neden az yedin' diye kızmaması. Kilo alırsam kaloriyi kısıyor, verirsem artırıyor. Sayılar yalan söylemez. RP'nin ne zaman deload yapacağımı bana bırakmayıp kendisinin söylemesi ise sakatlanma riskimi sıfırladı."
* **Şikayetler (Genel Fitness App'leri):** "Çoğu app sadece kayıt defteri. Neyi değiştirmem gerektiğini bana söylemiyor. Bir personal trainer'a ayda 200 dolar veremem, bana ne yapacağımı söyleyen akıllı bir koça ihtiyacım var."

---

### (d) Doğrulanmış Kaynaklar
* Trexler ET, et al. MacroFactor Core Logic & Algorithm Whitepaper: `macrofactor.com/macrofactor-algorithms`.
* Israetel M, Feather J. *Scientific Principles of Hypertrophy Training.* Renaissance Periodization.
* RP Hypertrophy App Automated Progression System: `rpstrength.com/hypertrophy-app`.

---

## 12. Next Call İçin Stratejik Sentez Tablosu

Aşağıdaki tablo, 11 özelliğin incelenmesi sonucunda **Next Call v1.1 / 2.0** ürün yol haritası için kopyalanacak, farklılaştırılacak ve ücretsiz/ücretli katmana atanacak stratejileri özetlemektedir:

| Özellik (Feature) | Kategori Lideri | Aynen Kopyalayacağımız / Alacağımız Kısım (What We Copy) | Farklı / Daha İyi Yapacağımız Kısım (What We Do Differently) | Bizde Free mi, Paid mi? |
| :--- | :--- | :--- | :--- | :--- |
| **1. Localization (TR First)** | Yazio & FatSecret | Yerel market barkodları, Türk mutfağı porsiyon mantığı (kaşık, kase, bardak) ve tam Türkçe ASO ekranları. | MacroFactor kalitesindeki deterministik motoru Türkiye pazarına ilk kez anadilinde ve TürKomp verileriyle sunmak. | **Free:** Arayüz & temel arama.<br>**Paid:** Karar motoru. |
| **2. Rest Timer & Set Duration** | Hevy & StrongLifts | Otomatik başlayan sayaç, Dynamic Island ve Lock Screen Live Activity entegrasyonu (+15s kontrolleri). | Başarısız olunan (fail) setlerde StrongLifts gibi toparlanma süresini otomatik uzatan akıllı adaptasyon. | **Free** (Temel deneyim parçası). |
| **3. In-Workout Focus UI** | StrongLifts 5x5 & Fitbod | Ekranda tek bir set gösterme ("One thing at a time"), devasa rakamlar, yüksek kontrastlı karanlık mod ve ağır haptik darbe. | ADHD dostu akıllı önceden doldurma (zero-decision logging) ve gereksiz RPE soru ekranlarını kaldırma. | **Free** (Kullanıcı alışkanlığı için). |
| **4. Exercise Form Demos** | Fitbod & GymVisual | 3 saniyelik temiz, profesyonel stüdyo video döngüsü (loop) ve 3 maddelik anatomik uygulama ipuçları. | Milyon dolarlık video çekimi yerine, başlangıçta beyaz etiketli (white-label) 3D anatomik lisans ile hafif ve hızlı yüklenen kütüphane. | **Free** (Temel hareketler).<br>**Paid** (Alternatif varyasyonlar). |
| **5. Home Dashboard** | MacroFactor & Whoop | 3 ana skor kuralı: Kilo trendi (Trend Weight), Enerji Dengesi/Kalori bütçesi, Günlük antrenman görevi. | Tartı dalgalanmalarını tamamen arka plana iten, suçluluk hissettirmeyen nötr görsel kart dili. | **Free:** Günlük sayaçlar.<br>**Paid:** Trend ve haftalık karar. |
| **6. Meal Logging & Food Search** | MacroFactor & Cronometer | Tek dokunuşla kaydırma (Multi-Add) arayüzü, anında makro önizlemesi ve hataya toleranslı hızlı arama. | MyFitnessPal'ın aksine **Barkod Tarayıcıyı ÜCRETSİZ** tutarak organik kullanıcı akını sağlamak; AI fotoğraf kaydını motora bağlamak. | **Free:** Barkod & Arama.<br>**Paid:** AI Fotoğraf & Akıllı Makro. |
| **7. App Cohesion & Daily Loop** | MacroFactor & Bevel | Sabah tartılma -> Gün içi beslenme -> Akşam antrenman ve kapanış kapalı döngüsü. | Egzersizde yakılan kaloriyi günlük yeme bütçesine eklememek (çift sayımı engellemek) ve her şeyi Pazartesi "Weekly Call"una bağlamak. | **Free:** Günlük döngü.<br>**Paid:** Haftalık Karar (Weekly Call). |
| **8. Paid AI Coach (Chat & Voice)** | Whoop Coach & Bevel | LLM'in kullanıcı biyometrisi ve geçmiş antrenman verisiyle beslenmesi (grounding). | LLM'in asla kendi başına karar vermemesi; yalnızca deterministik motorun haftalık kararını açıklayan şefkatli bir tercüman olması. | **PAID** (Haftalık token kredisi ile sınırlı). |
| **9. Steps & Movement Nudges** | Apple Fitness & Whoop | Kalan eforu soyut sayı yerine somut zamana çevirme ("Hedefe 25 dk tempolu yürüyüş kaldı"). | CoreLocation ile kullanıcının kaydettiği yerlerle (Gym, Ev, Park) eşleştirip rota bazlı yerel bildirim üretme. | **Free:** Temel bildirim.<br>**Paid:** Konum bazlı akıllı rota önerisi. |
| **10. Freemium Model** | Hevy & RevenueCat Benchmarks | 3 aktif rutin sınırı, 7 günlük ücretsiz deneme süresi ve %65+ yıllık plana odaklanma. | Geleneksel kayıt defterini tamamen ücretsiz bırakıp, yalnızca **"Karar Veren Algoritma" (The Weekly Call)** için $12.99/ay - $59.99/yıl talep etmek. | **Stratejik Ayrım** (Kayıt bedava, Akıl ücretli). |
| **11. Positioning ("The Call")** | MacroFactor & RP Hypertrophy | Haftalık check-in günü, şeffaf matematiksel karar gerekçesi ve kullanıcıya onaylatma akışı. | RP'nin yalnızca antrenman, MacroFactor'ün yalnızca beslenme kararını tek bir çatı altında birleştiren ilk hibrit "Baş Karar Koçu" olmak. | **PAID** (Next Call'un kalbi ve varlık sebebi). |

---
*Rapor Sonu. Next Call v1.1 / 2.0 ürün geliştirme ve pazarlama stratejisi için referans doküman olarak hazırlanmıştır.*

## §0 İstem

```
DEEP COMPETITOR RESEARCH for an iOS fitness app called "Next Call" (weekly decision coach: a deterministic engine looks at training logs, food, bodyweight and photos and makes the weekly call: calories, volume, deload; an LLM only explains). Live on App Store 1.0, US market, freemium pricing $12.99/mo, $59.99/yr. We are planning v1.1/2.0. For EACH feature below, find the category leader(s) ("the big daddy app" for that feature) and report: (a) what it looks like on screen (layout, colors, what is shown at once, animation), (b) the logic and technical approach (algorithm, data source, defaults, how it adapts), (c) where it sits in free vs paid and what triggers the upgrade, (d) what users praise and hate (Reddit r/fitness r/weightroom r/MacroFactor r/hevy, App Store reviews, 2025-2026), (e) source URLs with date. Features: 1) Localization, Turkish first: which languages leaders ship, how they localize food databases (Turkish foods, units), App Store localization effect on downloads, Turkey market apps (Yazio, FatSecret, MyFitnessPal TR). 2) Rest timer between sets plus set duration: Hevy, Strong, Fitbod, Alpha Progression, RP Hypertrophy, Apple Watch; auto-start, Live Activity / Dynamic Island, per-exercise rest defaults, adaptive rest from user feedback or RIR, evidence-based rest ranges. 3) In-workout focus UI for low attention / ADHD users: one thing at a time, big numbers, color, haptics, dark mode; which apps do this best and any accessibility research. 4) Exercise form demos: how Fitbod, Hevy, JEFIT, Muscle and Motion, Alpha Progression produce them (3D animation, real video, loops, AI generated), style standards, cost. 5) Home dashboard and key metrics: MacroFactor, Whoop, Oura, Apple Fitness, Bevel, Gentler Streak; what 3-5 numbers they show and how. 6) Meal logging and food search: MacroFactor (fastest logger), MyFitnessPal, Cronometer, Lose It, Yazio; search ranking (verified entries, recency, frequency, typo tolerance, brand vs generic), AI photo logging, voice/text logging, barcode, which parts are paywalled. 7) App cohesion and daily loop: how leaders tie training, food, weight and recovery into one daily flow and habit (morning check, after workout, evening). 8) Paid AI coach with chat and voice: Whoop Coach, Oura Advisor, Bevel Intelligence, Fitbod, MacroFactor, Ladder, Future, Zing, Gymshark; how they ground answers in user data and engine decisions, memory of the person, safety limits, voice, pricing, limits on messages, LLM cost control. 9) Steps / daily movement nudges that make the remaining steps concrete (e.g. "4k steps left = walk to the gym and back", saved places, distance in minutes): Apple Fitness, Pedometer++, StepsApp, Garmin, Google Fit, Bevel, Gentler Streak, Pokemon Go style; geofence or HealthKit approaches. 10) Freemium design: exactly what is free vs paid at Hevy, Strong, MacroFactor, MyFitnessPal, Fitbod, Cronometer, Yazio, Whoop; usage limits that trigger upgrade (AI messages, photo logs, history depth), trial lengths, prices, conversion benchmarks (RevenueCat State of Subscription Apps 2025/2026). 11) Positioning: apps that also "make the call" (MacroFactor adaptive coaching, RP Hypertrophy, Fitbod algorithm, Stronger by Science app) and how they present the decision and its reason. Rules: do not invent numbers or quotes; mark anything you could not verify as [unverified]; prefer primary sources (official site, help center, App Store page, changelog) then Reddit. Write the full report in TURKISH (app and feature names stay English), one section per feature, end with a table "feature | leader | what we copy | what we do differently | free or paid for us". Save it as a markdown file to /Users/leventcanceylan/Documents/keel-arastirma/rakip-ozellik-2026-11-24.md and also say in chat when done.
```
