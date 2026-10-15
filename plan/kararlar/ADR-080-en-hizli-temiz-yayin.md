# ADR-080 · En hızlı temiz yayın: önce sessiz mağaza yayını, pazarlama ve büyük ekler sonra

- **Durum:** KABUL (Levent, 15 Eki: "en temiz ve hızlı canlıya çıkış; videolar sonra güncellemelerle; pazarlamayı sonra düşünürüz")
- **Tarih:** 2026-10-15
- **Değiştirdiği:** yol haritası M9 (8 haftalık başvurulu beta), M10 (lansman günü dahil), M11 kapsamı; K-904, K-906, K-805, K-533 yerleri.

## Bağlam
M9a (yeni yüz) kodda bitti; kalan yol 8 haftalık beta + tam lansman paketiyle (Featuring, Product Hunt, CPP, 3 yerelleştirme)
takvimde Şubat'a uzanıyordu ("Ocak'ta lansman yok", `arastirma/05-faz4-pazarlama.md` §1). Levent işi kısaltmak istiyor; ürün
kararı motoru, verisi ve yasal tabanı hazır. Pazarlama araştırmasındaki zamanlama kuralı **pazarlama itişi** içindir, mağazada
var olmak için değil.

## Karar
1. **İki ayrı an:** (a) **sessiz yayın** — uygulama App Store'da, ödeme açık, reklam/itiş yok; (b) **pazarlama lansmanı** —
   Featuring, Product Hunt + Show HN, CPP, reklam: sonra, ayrı bir planla (M11). Ocak kuralı yalnız (b)'ye uygulanır.
2. **Beta kısalır:** 8 haftalık başvurulu kohort yerine **2 haftalık dış TestFlight** (küçük grup, Levent'in seçtiği), mağaza
   hazırlığıyla **paralel** koşar; takvime ayrı süre eklemez. Kohort formu, 8 hafta taahhüdü ve haftalık geri bildirim döngüsü
   yayından sonraya (M11). TestFlight'ın kendi geri bildirimi yeter.
3. **Yayın için gerekenler (M9 + M10, başka bir şey değil):**
   - M9a: K-983 → K-984 TestFlight + Levent cihaz turu (K-815 erişilebilirlik turu aynı turda).
   - M9 yayın öncesi kod: K-905 öncü göstergeler (yayın günü ölçmeye başlamak için), K-908 `/health` hazır olmayı söyler,
     K-817 hız sınırı, K-816 metin dışı kontrast, K-704 RevenueCat tazeleme; K-903 K-984 oturumunda kapanır; K-904 kısa beta.
   - M10 mağazaya çıkış: K-1001 ürün adı (Levent, ilk kapı), **K-805 vergi + banka (M11'den alındı: Paid Applications
     Agreement olmadan abonelik satılamaz)**, K-1002 ASO (yalnız EN-US), K-1003 ekran görüntüleri + açıklama, K-1006 puan
     isteği, **K-1033 mağaza başvurusu** (ASC beyanları, SANDBOX'ın kalkması, AI kapalı ekranların dürüstlüğü, App Review).
4. **Yayında olmayan, güncellemeyle gelecek (M11):** hareket klipleri (K-419, K-425), Live Activity (K-426), cihaz üstü model ve
   kilit ekranı (K-510, K-515), Siri ile kilo (K-536), onboarding referans görünüş (K-313), AI sağlayıcı ölçümü ve koçun AI
   katmanı (K-533; yayında AI kapalı, gizlilik politikası zaten "not active yet" diyor), K-1002'nin EN-UK + ES-MX yerelleştirmesi,
   CPP (K-1004), Featuring (K-1005), lansman günü (K-1007), beta geri bildirim döngüsü (K-906), mevcut M11 işleri.
5. Kalite kapıları aynen (anayasa denetimi, testler, inceleme); kısaltma kapsamdan, kaliteden değil.

## Sonuçlar
- Yayına kalan kod ~2 oturum (M9 kartları S/M), mağaza hazırlığı ~1 oturum; geri kalan süre Levent'in adımlarına bağlı:
  K-983, K-805 (mali müşavir), K-1001, dış TestFlight grubu, App Review gönderim onayı (mağaza yayını Levent'te, ADR-019).
- 8 haftalık retention verisi yayından önce olmayacak; öncü göstergeler yayın gününden itibaren gerçek kullanıcıdan ölçülür.
- Pazarlama planı ayrı konuşma: yayından sonra, ilk gerçek kullanım verisiyle.
