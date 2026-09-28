---
title: Ürün ilkeleri — Levent'in girdileri
guncelleme: 2026-09-08
durum: birikiyor (her oturumda eklenir)
---
# Ürün ilkeleri

> Bu dosya karar değil, **kısıt.** Her feature önerisi buradan geçecek.
> Levent'in kendi ağzından çıkan gereksinimler; araştırma bunları test eder, silmez.

## 1 · Amaç
İnsanın aynada mutlu olabileceği bir vücuda sahip olmasını ve daha sağlıklı olmasını
sağlamak. Kanal değil, gerçek çıktı. Ölçülebilir değişim.

## 2 · Bilimsellik ana metodoloji
Manipüle edilmemiş araştırmalara sadakat. İddia varsa kaynak var. Şarlatanlık yok,
"30 günde" vaadi yok. Arkada mekanizma çalışır, önde sadelik görünür.

## 3 · Sürtünmeyi öldür — "işimi kolaylaştırsın"
Kullanıcının yaptığı iş minimum olmalı. Somut:
- **Öğün fotoğrafı yükle → sistem kaloriyi/makroyu çıkarsın.** Var olan uygulamalar
  bunu yapıyor ama kaba yapıyor; biz **doğru** yapacağız.
- Serbest metin/sesle kayıt: "üstten çekmeli alette 60 kilo 8 tekrar yaptım" anlaşılmalı.
  Spor bilgisi olmayan da, telefonla arası iyi olmayan da kullanabilmeli.
- Tek tek form doldurtma yok. Monoton set/tekrar girişi son çare olmalı, ilk yol değil.

## 4 · Gün içi yönlendirme (intra-day steering)
Kalori saymak yetmez. Sistem **günün geri kalanını yönetmeli:**
- Şu ana kadar ne yedim → kalan bütçe ne
- Bu bütçeyle ne yiyebilirim (sevdiğim, bulabildiğim, bütçeme uyan şeylerden)
- Akşam antrenman var mı, ona göre ne değişir
- Gün kaçtıysa: telafi değil, **yeniden hizalama**

## 5 · "Özel hizmet alıyorum" hissi
Koçun gözetiminde ve onunla daimi iletişimde olma hissi. Bildirim atan, soran,
hatırlayan, geçmişini bilen bir taraf. Jenerik uygulama değil, **sana ait biri.**
Kullanıcı bunu "yazılım" değil "hizmet" olarak algılamalı.

## 6 · Agentik ve dinamik
Hayat araya girer: diyet kaçar, antrenman olmaz, gün kötü geçer. Sistem bunu
ceza olarak değil **girdi** olarak alır, planı yeniden kurar. Statik plan yok.

## 7 · Karmaşıklık arkada
Kompleksite yüksek olacak (portfolyo kanıtı + CV). Ama kullanıcıya terminoloji,
formül, yolak ismi yansımayacak. Bilimsellik ile kullanıcının alabileceği skopun
**tam ortasında** duracak arayüz.

## 8 · Levent kullanacak
Kendisi kullanmayacağı feature yoktur. Dağıtık takip yerine tek merkez, güvendiği
bilimsellikte.

## 9 · Modülerlik
Başlangıç: gym (hareket belli, kâğıt üzerindeki karşılığı belli).
Sonra: koşu, Hyrox, diğer metrikler. Mimari buna hazır olmalı, ilk sürüm olmayabilir.

## 10 · AYRIM ZORUNLU — üç testten geçmeyen feature yok
Sektörde olan bir feature'ı kurgularken bile farkımız olacak. Her feature şunu geçmeli:
| Test | Soru |
| --- | --- |
| **Bilimsel** | Bu feature'ın arkasındaki mekanizma doğru mu, rakip bunu yanlış mı yapıyor? |
| **Yazılımsal** | Teknik olarak rakipten farklı/daha iyi mi çalışıyor? Neden kopyalanamaz? |
| **Pazarlanabilir** | Tek cümlede anlatılıp "bu farklı" dedirtiyor mu? |
Üçünden en az ikisini geçmeyen feature listeye girmez.

## 11 · Regülasyon farkındalığı
Sağlık tavsiyesi sınırı var. En az takılacak şekilde kurgulanacak — ama bu,
işlevi kısmanın değil, doğru çerçevelemenin işi.

## 12 · Kara kutu yok
Levent her adımın nasıl çalıştığını bilecek. "Şu otomasyonla şu süreyi şu kadar
düşürdüm, ölçtüm" diyebilmeli.

---
_9 Eylül eklemeleri (Levent)_

## 13 · MVP diye kısma yok
Feature erteleme **yasak.** Uygulama akla gelen haliyle, tam ve bütün tasarlanır.
Bir feature ancak **regülasyon veya sağlık riski** sebebiyle **iptal** edilir — "sonraki
sürüme kalsın" diye ertelenmez. Kullanıcı geri bildiriminden gelecek yeni özellikler
zaten sonra düşünülür; bu ayrı iştir.
> Not: iOS-önce sırası bir erteleme değil, Google Play'in Organizasyon hesabı
> zorunluluğundan doğan **store kısıtı.**

## 14 · Ölçüm: fotoğraf birincil, mezura tamamlayıcı
Salon BIA'sı ("MacFit aletleri") reddedilir — hoca da reddediyor.
- **Fotoğraf birincil:** sabit ışık, sabit poz, sabit sıklık. Model **mutlak yağ oranı
  söylemez**, iki fotoğrafı karşılaştırır ve **yön** söyler.
- **Bel çevresi alınmalı** — hoca ücretli koçluğunda özellikle bel ölçüsü alıyor.
  Sorun kullanıcının standart ölçememesi → **ölçüm protokolü öğretilecek**,
  tutarlılık sistemin işi.
- Kilo trendi ve performans zaten takip ediliyor ama tek başlarına yetersiz.

## 15 · Karşılaştırma çıpası — insan hafızası bozuk
İnsan dünü hatırlar, başlangıcı hatırlamaz. Dünle kıyaslanınca değişim görünmez,
motivasyon ölür. Sistem kullanıcıyı **kendi seçtiği geçmiş noktayla** kıyaslar:
başlangıç, 1 ay önce, hedefin yarısı. Bu bir görselleştirme özelliği değil,
**davranış müdahalesi.**

## 16 · Projeksiyon — "işin sonunda nasıl görüneceksin"
Kullanıcı hedefini girer (görsel ya da kilo/ölçü). Sistem, mevcut fotoğrafı ve
gerçekçi kazanım/kayıp hızlarını kullanarak **tahmini sonucu görsel olarak** üretir.
Dinamik olmalı: aylık değerlendirmede uyum iyiyse süre kısalır, kötüyse uzar —
ve bu kullanıcıya **sebebiyle** gösterilir.
> Bu, ilkeler içindeki en özgün ve **en riskli** fikir. Beden algısı, gerçekçi olmayan
> beklenti ve reklam iddiası regülasyonu üç ayrı risk. Araştırma bunun **güvenli
> yolunu** çıkaracak — iptal gerekçesi aranmayacak.

## 17 · Her şey aralıktır, nokta değil
Yediğin yemeğin kalorisi de, harcaman da, kazanım hızın da bir **aralık.**
Sistem aralıkla çalışır, aralığı daraltarak optimal noktayı arar. Sahte kesinlik yok.
(Faz 1 · Boşluk 3 ile aynı yere çıkıyor.)

## 18 · Karmaşıklığı azaltarak öğret
Bir işin detayına girdikçe insan soğur. Sistem **yüzeyde sade** konuşur, derinliği
isteyene açar. Kullanıcıya "8 ay boyunca şunu yeme" denmez; küçük, taşınabilir
değişiklikler verilir. Farmakoloji önerilmez — ve önerilmesine gerek olmadığı
gösterilir: dinamikler herkes için aynı, değişen sadece hız.

## 19 · Levent = 0 numaralı kullanıcı
Metodoloji, uygulama yazılmadan önce Levent üzerinde canlı çalıştırılacak.
Bu hem karar motorunun testi, hem kaynak kuralının karşılığı, hem YouTube içeriği.


---
_10 Eylül kararları (Levent)_

## 20 · Koç VE uygulama — ayrı değil
"Koç mu uygulama mı" ayrımı reddedildi. İkisi tek üründe sunulur; metodoloji uygulamanın
altında çalışır. Fiyat buna göre kurulur — **bizi hiçbir şekilde eksiye geçirmeyecek şekilde.**
Bir özellik ancak **mali olarak kâra geçirmiyorsa** elenir; teknik zorluk gerekçe değil.

## 21 · LLM kota modeli
Sınırsız kullanım **yok** — kötü niyetli kullanım maliyeti patlatır. Claude/ChatGPT gibi
katman başına **token/hak** verilir. Mimarinin ucuz yolu baştan seçilir.

## 22 · Ulusal/yerel hardcoding YASAK
Proje global. Türk mutfağı, Türkçe içerik, herhangi bir ulusal özel durum **hedeflenmez.**
Pazar ABD/global, dil İngilizce, YouTube kanalı İngilizce. Besinler bireysel ele alınır.
Kullanıcı yanlış beyan ederse mekanizma telafi eder; ulusal veri seti kurulmaz.

## 23 · Özellik geliştirme yöntemi: test önce
İleride, teknik faza geçildiğinde: her özellik bir **gereksinim** gibi ele alınır, önce
testlerine dökülür, sonra geliştirilir. Hem test hem güvenlik tarafı bu şekilde geçilir.
(Bu bir mimari kararı — Faz 6'ya not.)

## 24 · Projeksiyon "optimal" üzerine kurulur
Referans senaryo ne maksimum (her şeyin mükemmel olduğu) ne minimum (sündürülen) —
**optimal:** ortalama bir insan bunu yaparsa gerçekten iyi gelişir noktası.
Kullanıcı bunun üstüne çıkarsa projeksiyon **olumlu**, altına düşerse **olumsuz** kayar.
Ölçebildiğimiz her davranış (adım, antrenman, uyum) bu kaymayı besler.

## 25 · Kadınlar ilk sürümde
Önceki "önce erkek" kararı **iptal.** Cinsiyet onboarding'de alınır, farklılıklar
minimum sürtünmeyle parametre olarak işlenir. Gerekçe: pazar payının büyük kısmı,
ve düzenli kullanıcı olma ihtimali yüksek.

## 26 · Kullanıcıyı olduğu yerden al
Uygulama expert'lere değil, **derdi olan herkese.** Kullanıcı "lat pulldown yerine barfix
çekiyorum, öyle mutluyum" diyorsa — sorun değil, yeter ki mekanik gerilim ve failure sağlansın.
Yanlış veya eksik bilgisi olan kullanıcı **zorla düzeltilmez**, koçluk yoluyla yavaşça
doğruya çekilir. Dümdüz "şunu ye, şunu yap" formülü değil; seviyeyi ve inancı okuyup
oradan ilerleyen bir sistem.

## 27 · Platform: iOS, Android şartlı
iOS öncelikli. Google Play'e ilk ivme gelmezse hiç girilmeyebilir.
