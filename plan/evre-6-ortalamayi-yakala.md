# Evre 6 · Ortalamayı yakala: her şey gerçekten çalışsın, bağlı olsun, kolay olsun (29 Eki 2026)

Levent'in build 8 incelemesi (29 Eki, kısa tur): "MVP olarak dahi markete çıkmaya hazır değil; rakiplerin sağladığını bile adam akıllı
sağlamıyoruz; kimse bu hâliyle 12 dolar vermez." Build 8 App Review'a **gönderilmez**; hedef build 9. Ütopya değil, **ortalama**: ABD'de bir
spor/beslenme uygulamasından beklenenin sorunsuz çalışması, üstüne bizim haftalık kararımız.

## Levent'in istedikleri (madde madde, hiçbiri atlanmaz)
### Antrenman
1. Train'de 7 güne antrenman eklenebiliyor ama bunun bir akışı yok: 7 gün isteyene kolay ekleme + kısa not (karar: ADR-090 #3).
2. Antrenman gün sayısı ve hareketler dinamik mi? Gün sayısı birçok yerden değişiyor (onboarding, Train, Edit program, check-in kararı,
   Settings): hepsi aynı uç noktayı ve akışı mı tetikliyor, değişiklik bağlı her yere yansıyor mu? Denetlenir, tek yola bağlanır.
3. Change akışı iyi (gym busy → anlık güncelleme). Antrenman sırasında da: "lat pulldown dolu" → o harekete anlık alternatif.
4. "Bring in workouts" (içe aktarma) çalışmıyor: çalışır hâle getir ya da kaldır; sahte (mock) hiçbir şey kalmaz.
### Yemek (en zayıf alan, "vasatın altı")
5. Her besin mantıklı birimle eklenebilmeli: yumurta adetle, gramla değil; porsiyon/adet/ölçü birimleri doğal.
6. Arama yardımcı olmalı: ABD ürünleri ve temel gıdalar, mantıklı sıralama, az yazıp hızlı kayıt, son/sık yenenler, tek dokunuşla tekrar.
7. Kayıtlı öğünler görünmeli, silinebilmeli, değiştirilebilmeli; geçmiş günler görünmeli (en azından bir aralık).
8. Barkod tarama çalışmıyor: çalışır hâle getir.
9. Yemek verisi kullanılabilir değil (ham OFF): ABD için USDA FoodData Central + OFF ABD (ADR-090 #1); betikleri kendin tetikle.
10. Kayıt bildirimleri: kullanıcının yemek saatlerine ve kayıt sıklığına göre öğün hatırlatması (ADR-090 #2: dördüncü tür).
11. "Günde şu kadar öğün yerim" diyen, kalori hedefi olan kullanıcı için akış düşünülmüş olmalı.
### Ayarlar ve genel
12. Settings › Gyms gereksiz, alan doldurtuyor: kaldır. Kullanıcıya form doldurtma; düşünüleni düğmelerle onaylatarak ilerlet.
13. Settings'teki her şey test edilir (çoğu statik duruyor); "Foods you avoid" gerçekten bağlı mı?
14. Settings alt sayfalarında düz yazı yığını var: kısa, taranabilir, modern; uygulamanın hiçbir yerinde güçsüz düz yazı yok.
15. Progress'teki animasyon verilere göre değişmiyor: dinamik olsun.
16. Mock kalmasın; çalıştığı doğrulanmamış, modernleştirilmemiş, ince ayarı yapılmamış bileşen kalmasın.
17. Birbirine bağlı bileşenler birbirini dinlesin: ilk karar verilip öyle kalmasın, kullanıcının isteğiyle şekillensin.
18. iPhone alışkanlıkları: klavye kapanır, geri tuşu ve kaydırarak geri, beklenen her davranış. Genel app alışkanlığına aykırı şey yok.
19. Karmaşık yerlerde rehber: onboarding sonunda uygulamanın kullanımını kavratan kısa rehber; az bilen kullanıcı da müşterimiz.
20. "Oha bunu da düşünmüşler" etkisi: kullanıcının davranışından çıktı (sık yediği, saatleri, salonu) ve buna dayanan kolaylıklar;
    öneri akışlarına altyapı olsun.
21. Pazarlamada öne çıkan her şey kusursuz ve kolay çalışmalı (hard paywall: kullanıcı mağaza görsellerinde gördüğünü almaya gelir).

## Sıra (bacaklar)
1. **Denetim** (salt okuma + simülatör): her ekran, her ayar satırı, her akış: sahte mi, bağlı mı, değişiklik nereye yayılıyor, düz yazı
   nerede, iPhone davranışı. Çıktı: `plan/evre-6-denetim.md` bulgu tablosu (P0 vaat/çalışmıyor · P1 bağlı değil/zor · P2 cila).
2. **Yemek verisi**: USDA FDC (Foundation + SR Legacy + Survey/FNDDS ölçüleriyle) + OFF ABD alt kümesi; birimler (adet/porsiyon), arama
   sıralaması, VPS'te içe aktarma.
3. **Yemek kaydı**: arama, birim, barkod, son/sık, öğünü düzelt/sil, geçmiş günler, öğün hatırlatması.
4. **Antrenman + Ayarlar + bağlantılar**: gün sayısı tek yol, 7 gün, antrenman içi "dolu" değişimi, içe aktarma, Gyms kalkar, ayar
   sayfaları kısalır, Foods you avoid uçtan uca, Progress animasyonu, mock temizliği.
5. **Rehber + cila**: onboarding sonu kısa kullanım rehberi, iPhone davranışları, son persona turu.
6. **Build 9** → Levent'e tek gösterim.

## Kurallar (bu evre)
- Arayüz için prototip onayı yok (Levent 29 Eki): doğrudan kod, test, simülatör kanıtı; Levent TestFlight'ta bakar.
- Her parça PR + test + simülatör ekran görüntüsü; gerçek sunucuya karşı yürünebilen her akış gerçek sunucuda.
- Ürün/para/marka kararları Levent'te; sorular toplu sorulur.
