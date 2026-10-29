# Evre 5 · Pazara çıkmadan son kontrol (29 Eki 2026)

Levent'in isteği (29 Eki): parçalar bitti; artık bütün satar mı, vaadi karşılıyor mu. Uygulamayı indirmiş, spora gidip gelen, yemek yiyen,
bazen unutan ya da eksik giren bir ABD'li kullanıcı gözüyle acımasızca yargıla: ihtiyaçlarını vaat ettiği ölçüde karşılıyor mu, UI çekici ve
modern mi, alıştığı uygulamalarla uyumlu mu, her işlev kolay mı, zamanla oluşan çıktı (haftalık karar) mantıklı ve işe yarar mı; indirme, dikkat
çekme ve ödeme noktası dahil. Web, ego, Reddit, X, YouTube taraması; ne gerekiyorsa yap. Sonra pazarlama ve kullanıcı geri bildirimiyle güncelleme.

## Bacaklar
1. **Pazar (araştırma, ego):** rakipler (vaat, fiyat, deneme, puan, şikâyetler, ekran görüntüleri) · kullanıcının sesi (Reddit, X, YouTube:
   işe aldıkları iş, bıkkınlıklar, neye para verir, kaçırılan gün beklentisi) · çıkış (abonelik ölçütleri, paywall, onboarding, ürün sayfası, ASO,
   ilk kanallar). Ham: `arastirma/ham/pazar-*-2026-10-29.md`.
2. **Persona yürüyüşü:** 4 haftalık zaman çizelgesi (tam hafta, unutulan günler, yarım öğün, atlanan antrenman, tatil haftası); her hafta uygulamanın
   gösterdiği ve verdiği karar; ekran ekran yargı (UI, UX, anlaşılırlık, güven, değer). Kanıt: gerçek sunucu + simülatör ekranları; zaman
   simülasyonu için geçmiş tarihli kayıt ya da motor senaryoları.
3. **Satış hunisi:** App Store ürün sayfası (başlık, alt başlık, ilk 3 ekran görüntüsü, anahtar kelime), onboarding → değer → paywall sırası,
   fiyat ve deneme, ilk açılıştaki "aha" anı.
4. **Düzeltme:** bulgular önem sırasıyla (P0 vaadi bozuyor · P1 güveni ya da ödemeyi bozuyor · P2 cila); her biri PR + test + simülatör kanıtı.
   Ürün, para ve marka kararları Levent'e (ADR-019): fiyat, deneme, mağaza metni.
5. **Build 8** → TestFlight → Levent cihazda (kamera dahil) → ASC gönderim (ELLE).

## Devam eden
- K-1055 (#656) fotoğraf akışı baştan: alt ajanda, prototip `prototip/yeniden-yapim.html` bölüm 10.
- ASC 1.0: build 7 bağlı, taslak, gönderilmedi (Levent durdurdu).
