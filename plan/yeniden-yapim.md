# Yeniden yapım planı — 29 Eki 2026

> Neden: build 5'i Levent 10 saniyede denedi; antrenman yok, yemek eşleşmiyor, düğmeler tutarsız, Log seçeneklerinde ikon yok,
> "+" sayfası engelliyor, Ayarlar ve Account (paywall'daki dahil) kötü. Bulguların ilk kısmı: `plan/denetim-2026-10-29.md`.
> Ders (Levent): her adımın ne yapacağı önceden bilinir; agent'a %100 güvenilen sekans yok. Bu yüzden her evrenin bir **çıktısı** ve bir
> **Levent kapısı** var; kapı geçilmeden sonraki evre başlamaz. 1.0 incelemede, yayın şekli ELLE (onay gelse de çıkmaz).

## Kurallar (bu plan boyunca)
- "Bitti" = **gerçek sunucuya karşı** simülatörde yürünmüş akış + ekran görüntüsü. Sahte sunucu (`fixture.js`) yalnız hata durumlarını üretmek için.
- Arayüz değişikliği önce prototipte (artifact), Levent onayından sonra kodda.
- Her ekran şu sorulardan geçer: Kullanıcı burada ne yapmaya geldi, tek bakışta görüyor mu? Çıkışı var mı (boş, hata, yavaş ağ)?
  Düğme, kart, ikon, boşluk ve yazı sistemle tutarlı mı? "AI slop" izleri (anlamsız gradyan, her yerde kart, aynı ağırlıkta her şey,
  süs ikon, belirsiz metin) var mı? Prototiple (`prototip/yeni-yuz.html`, ADR-070) aynı mı?

## Evre 0 — Ekran envanteri ve acımasız tur (kod değişikliği yok)
- **Ön koşul:** simülatörde gerçek sunucuya giriş. Sign in with Apple yalnız gerçek Apple ID ile çalışır: **Levent simülatörün Ayarlar'ında
  bir kez Apple ID'sine girer** (şifreyi agent giremez). Simülatör derlemesi EAS `development-simulator` profiliyle bulutta (disk dar),
  üretim bundle ID'siyle (sunucu kimlik jetonunun alıcısını bu ID'ye göre doğrular).
- **İş:** iki hesap ile yürü: (a) yeni hesap (Delete account → baştan), (b) Levent'in mevcut hesabı. Her ekran açık ve koyu temada,
  boş / dolu / hata / çevrimdışı durumlarıyla; her akış (onboarding üç dal, antrenman başlat-bitir, set kaydı, yemek arama-barkod-tarif,
  tartı, check-in, Bu Hafta kararı, ilerleme, Ayarlar her satır, Account, paywall, hesap silme, çıkış) uçtan uca.
- **Çıktı:** "Ekran envanteri" sayfası (artifact): her ekranın görüntüsü + bulgular (mantık / UX / görsel / slop / prototip farkı),
  önem derecesi (kırık, kötü, cila). Sunucu logu ile eşlenmiş.
- **Levent kapısı:** envanteri okur, öncelikleri işaretler, çıkarılacak/ertelenecek özellikleri söyler (kapsam onun).

## Evre 1 — Kırık mantık
- Envanterin "kırık" satırları; ilk üçü bilinen: programsız hesap çıkışı, yemek araması (yazarken arama, eski sonuç), sunucu arama sıralaması
  ve "ı" katlama. Her biri kendi dalı, testi, PR'ı; her biri gerçek sunucuya karşı simülatör kanıtıyla kapanır.
- **Levent kapısı:** kanıt ekran görüntüleri.

## Evre 2 — Görsel sistem ve yeniden tasarım (prototip önce)
- Tek düğme sistemi (birincil / ikincil / hayalet / yıkıcı; boyut, köşe, dokunma alanı), kart ve liste satırı, ikon seti (Log seçenekleri dahil),
  boşluk ve yazı ölçeği. Sonra ekran ekran: Ayarlar (baştan), Account sayfası ve paywall'daki Account, "+" sayfası, Bu Hafta alt bölümleri
  (kardiyo vb. sönük), antrenman, yemek.
- **Çıktı:** prototip artifact'ı ekran ekran. **Levent kapısı:** her ekran için onay; onaysız ekran koda girmez.
- Sonra kod: bileşen sistemi önce, ekranlar sonra; her ekran simülatör görüntüsüyle prototiple yan yana kıyaslanır.

## Evre 3 — Yemek verisi
- **Levent kararı:** kaynak (Türkçe/sık yenen yemek listesi, marka + barkod için Open Food Facts gibi bir kaynak; lisans ve maliyet önce).

## Evre 4 — Son tur ve yeni build
- Evre 0'ın turu baştan, aynı envanterle; kırık satır kalmadıysa build 6 → TestFlight → Levent telefonda → mağaza güncellemesi.

## Oturum düzeni
Bir evre bir oturum (bağlam şişmesin). Her evre sonunda DURUM + bu dosya güncellenir, sonraki evrenin prompt'u `plan/oturum-promptlari/` altında.
