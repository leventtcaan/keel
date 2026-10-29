# Evre 6 denetimi (29 Eki 2026) · birleşik bulgular ve parçalar

Dört salt-okuma denetimi (kod, dosya:satır kanıtıyla): `plan/evre-6-denetim/{yemek,antrenman,ayarlar,genel}.md`. Ana sonuç: **mock neredeyse
yok; sorun kopuk bağlantılar, eksik akışlar, ABD için boş yemek verisi ve düz yazı.** Kararlar ADR-090 (#1-#5).

## Parçalar (sıra; her biri PR + test + simülatör kanıtı)
### A · Antrenman günleri tek kaynak + 7 gün
- P0 Program günleri değişince profil `schedule.trainingDays` güncellenmiyor; antrenman hatırlatması ve "Rebuild for me" eski günleri okuyor;
  yeni kullanıcıya antrenman hatırlatması hiç kurulmuyor (`usualTrainingTime` yok). → Günlerin tek kaynağı program; hatırlatma ve Rebuild
  programdan okur; sunucu profil günlerini programla eşler.
- P0 7. gün: boş "Day 7" açılıyor, `too_many_days` "5 is the most" deyip birleştirmeyi öneriyor, generate 7'yi 400 ile reddediyor.
  → `max_training_days` 7, sözleşme maxItems 7, 7 günlük şablon, tek dokunuşla içerikli gün ekleme (sunucu üretir), kısa dinlenme notu, öneri susar.
- P1 Gün değiştirmenin beş ayrı yolu; Train'de görünür "add a day" yok; boş gün ekleme ~10 dokunuş.
### B · Antrenman sırasında "dolu" + Change
- P1 "Lat pulldown dolu" seçenekleri aynı istasyon; salon filtresi yalnız barbell. → Farklı ekipmanlı alternatif, "sona al", 2 dokunuş.
### C · Yemek verisi (ABD)
- P0 ABD markalı ürün ve barkod yok (8.169 USDA genel + 2.897 TR OFF); barkod her zaman "not in database". → USDA Branded + FNDDS
  (akış hâlinde okuma, gtin), OFF ABD alt kümesi (çok bölge), arama dizini (trigram), popülerlik sıralaması.
- P0 Birim modeli yalnız g + ham porsiyon adı; yumurta adetle ancak porsiyonu varsa. → Adet/porsiyon/cup/oz/g/ml, varsayılan doğal birim.
### D · Yemek kaydı
- P0 Geçmiş gün yok, başka güne yazma yok (eatenAt hep şimdi; istemci yalnız bugün/dün). → Gün gezgini + o güne kayıt.
- P0 Öğün hatırlatması yok (ADR-090 #2). → Dördüncü tür, kullanıcının yemek saatlerinden.
- P1 Sonuç satırı "100 g başına" aralık; porsiyon başına tek sayı + makro yok; karbonhidrat/yağ görünmüyor (ADR-090 #5 tek sayı).
- P1 Düzeltme = sil + yeniden kaydet; öğe başına silme/kaydırma yok; satırda miktar/birim yok. → PATCH, kaydırarak sil, satırda miktar.
- P1 Recent 2 öğe; favori/sık yok; "dünkü gibi" yalnız dün. → Son + sık + favori, öğünü tekrar, kendi besini, hızlı kalori, barkod kaçınca elle giriş.
### E · Ayarlar
- P1 Gyms kalkar (yeni kullanıcıda etkisi yok; plaka satırı varsayılana düşer).
- P1 Foods you avoid yalnız recent/önerilerde; arama ve barkodda etkisiz; serbest metin. → Çip seçimi, arama/barkodda işaret.
- P1 Onboarding sonrası değiştirilemeyenler: check-in günü, antrenman saati, hedef, boy, aktivite. → Düğmeli satırlar.
- P1 İçe aktarma: rıza yoksa çıkmaz sokak, üç ayrı ad, yalnız 3 başlık; → rıza düğmesi, tek ad, Strong/Hevy gerçek dosyayla test.
- P1 Düz yazı: Routine 40+13, Import 42, rıza geri çekme 41, Apple Health ~40, geçmiş ~50, rebuildBody 51, hareket ekranı ~65.
- P1 Gizlilik ve Koşullar bağlantısı Ayarlar'da yok. Hatırlatmalar bölünmüş (deneme hatırlatması Subscription'da).
### F · Rehber ve cila
- P0 "Demo clips aren't filmed yet" kartı her hareket ekranında (klip yok). → Kart kalkar; hareket ekranı kısa ipuçlarıyla.
- P0 Onboarding sonrası rehber yok. → Üç sekme, "+", haftalık karar için kısa ilk kullanım rehberi.
- P1 Progress'te animasyon yok (reanimated hiç kullanılmıyor); kas haritası geçişsiz. → Veriye bağlı geçişler.
- P1 Klavye: sayı klavyesinde Done yok, KAV tek ekranda, Save/Continue klavye altında kalabilir. → Her girişte kapanış + kaçış.
- P1 Sheet'ler (today-change, swap, state) kapanınca sekmeyi yeniden okutmuyor olabilir. → saved-changes sinyali.
- P2 weigh-in/meal modal'larında Close yok; iki türlü Back; "Every Monday" sloganı; ulaşılmaz ekran artıkları.

Sağlam: birimler, tema, rızalar her yere anında yayılıyor; abonelik/export/sign-out/delete gerçek; program değişince This week/Train/Progress/motor doğru okuyor.
