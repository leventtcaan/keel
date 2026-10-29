# Evre 7 · Ürün hissi: çalışan form uygulaması değil, seni tanıyan koç (30 Eki 2026)

Levent'in build 9 incelemesi (30 Eki): kod çalışır hâle geldi ama ürün hâlâ "bir şeyler gizlenmiş, düz yazı, basit buton, kötü input,
çalışmayan fonksiyon, döngü" hissi veriyor. "Ben de kâğıda yazabilirim ya da basit bir CRUD yapabilirim, farkımız ne?" Hedef: 2026'nın
health & fitness uygulaması standardında, kolay (easy-to-use "kanka" kitlesi, akademik değil), markalı, pazarlanabilir, vaadini karşılayan
kaliteli bir MVP. Aşırı mühendislik yok; görünüm ve özellik eksiksiz, düşünce kusursuz. Build 9 App Review'a gönderilmez; hedef build 10.

## Levent'in maddeleri (hiçbiri atlanmaz)
### Yemek kaydı (Log a meal)
1. "Find a food" bölümü ve üstteki öğün seçicisi daha modern olsun.
2. Today's food sayfası çok gizli: ana sayfadaki kcal'e basana kadar bulamadım. Log a meal'den de oraya erişilsin; o öğüne eklenenlerin
   küçük bir özeti/brief'i görünsün ve oradan kolayca geçilsin.
3. **Hata:** Log again'de bir şeye "+" basıyorum, loglanmıyor.
4. Favoriler anlaşılmıyor (nasıl favorilenir?). Karışık yapma: Recent olsun, kalp ile favorilensin; Recent öğüne göre değişsin.
5. MyFitnessPal görünümünde ama ondan kullanışlı ve kolay; tek bir özelliğe değil "harmoniye ve zekâya" para verilsin.
6. Bir kullanıcı gibi acımasızca sorgula; güncel uygulamaların modern tricklerinden kaçınma.
### Program düzenleme (Training days / Edit program)
7. **Hata:** Add a day'de hareketler seçili gelmedi (gelmeli).
8. Add a move düz liste: modern ve anlaşılır olsun (herkes hareket isimlerine hâkim değil); sonradan özelleştirmek isteyen için.
9. Remove day, "kaldır" eylemini yansıtan görünümde değil.
10. Edit program › Cardio'da düz yazı; "split" yalnız bilgi olarak duruyor; bilimsel/hardcoded açıklamalar neden gösteriliyor? Kullanıcı
    ne kadar bilimsel veri görmek ister? Bu sayfaya acımasız son analiz.
11. **Hata:** Rebuild my program basıyorum, hiçbir yere atmıyor / bir şey olmuyor.
### Antrenman akışı
12. **Hata:** antrenmanı bitiremedim; döngüler ve çalışmayan fonksiyonlar var.
13. Öncesi (motivasyon) · antrenman anı (işle takibi, setleri tamamlama hissi) · sonrası (başardım hissi) · kesintiler, iptaller,
    değişimler: her senaryo ele alınmış mı? Görünüm temiz mi, yoruyor mu?
### Genel
14. İlk açılış güzel; "wow" özellikler farklı sayfalarda da gösterilsin, ama karmaşık görünmesin. Gizlenmiş hissi çok.
15. Arka planda gerçekten her use case'e özgü düşünülmüş bir zekâ var mı? Değiştirdiğimiz şeyler genel yapıyı gerçekten şekillendiriyor mu?
16. Sayfalardaki vurgular, ayrımlar, kartlar, fontlar, renkler, butonlar, işlevler tamam olsun. Fazla/gereksiz iş kırpılsın; gizli olan öne
    çıksın; düz yazı yerine daha iyi yöntem; sayfanın üstü vurgulu altı düz yazılı olmasın (bütünlük).
17. Logic çalışsın, bağlı yerler analiz edilsin; ne vaat ediyor, yazdığımız şey kullanıcıda ne uyandırıyor.
18. Gerçek dünya iş akışları: kullanıcının sorunu ne, biz ne sunuyoruz, karar alıyor muyuz, takip ediyor muyuz, unutuyor muyuz?
19. Progress: gelişimin gösterilmesi, motive etmesi, sayılarla ve görsel olarak doğru renklendirmeyle.
20. Hardcoded "doğrular" ile motamot ilerleme yok; akademi değil, insanlara hizmet; 2026 dünyası; ileride daha agentic/AI entegre olacak.
21. Teknik, temel, marka, reklam ve pazarlama açısından son noktaya gel.

## Sıra
1. **Kök neden** (simülatörde yeniden üret, systematic-debugging): #3 Log again +, #7 Add a day hareketsiz, #11 Rebuild, #12 antrenman bitmiyor/döngü.
2. **Araştırma:** MyFitnessPal, MacroFactor, Cal AI, Lose It!, Hevy, Strong, Fitbod, Ladder: kayıt ve antrenman akışlarının modern kalıpları
   (arama, öğün, favori, son, özet, set tamamlama, bitiş, ilerleme). Çıktı `arastirma/ham/evre7-rakip-kaliplari.md`.
3. **Acımasız ekran incelemesi:** her ekran kullanıcı gözüyle (mobile-ui-audit): vurgu, bütünlük, düz yazı, input, buton, gizli özellik.
   Çıktı `plan/evre-7-inceleme.md`.
4. **Düzeltme parçaları:** A yemek kaydı yeniden kurulum · B program düzenleme · C antrenman akışı (öncesi/an/sonrası/kesinti) ·
   D genel bütünlük + wow + Progress. Her biri PR + test + simülatör kanıtı.
5. **Build 10** → Levent'e tek gösterim.
