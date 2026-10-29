# Yeniden yapım planı — 29 Eki 2026

> Neden: build 5'i Levent 10 saniyede denedi; antrenman yok, yemek eşleşmiyor, düğmeler tutarsız, Log seçeneklerinde ikon yok,
> "+" sayfası engelliyor, Ayarlar ve Account (paywall'daki dahil) kötü. Bulguların ilk kısmı: `plan/denetim-2026-10-29.md`.
> **Levent (29 Eki): ara kapı yok.** Döngü (`/loop`, talimat `plan/oturum-promptlari/yeniden-yapim-dongu.md`) bitene kadar otonom çalışır;
> Levent bitmiş hali görür. Her evrenin çıktısı yine yazılır (kanıt ve iz için), ama onay beklemez. 1.0 incelemede, yayın şekli ELLE.

## Kurallar (bu plan boyunca)
- "Bitti" = **gerçek sunucuya karşı** simülatörde yürünmüş akış + ekran görüntüsü. Sahte sunucu (`fixture.js`) yalnız hata durumlarını üretmek için.
- Arayüz değişikliği önce prototipte (artifact, prototip doğruluk kaynağı olarak güncellenir), sonra kodda; onay agent'ın kendi denetimidir (ekran görüntüsü ↔ prototip).
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
- Öncelik ve kapsamı agent belirler (kırık > kötü > cila); bir özelliği çıkarmak ya da ertelemek ADR'ye yazılır.

## Evre 1 — Kırık mantık
- Envanterin "kırık" satırları; ilk üçü bilinen: programsız hesap çıkışı, yemek araması (yazarken arama, eski sonuç), sunucu arama sıralaması
  ve "ı" katlama. Her biri kendi dalı, testi, PR'ı; her biri gerçek sunucuya karşı simülatör kanıtıyla kapanır.
- Kanıt: ekran görüntüleri envanter sayfasında, önce/sonra.

## Evre 2 — Görsel sistem ve yeniden tasarım (prototip önce)
- Tek düğme sistemi (birincil / ikincil / hayalet / yıkıcı; boyut, köşe, dokunma alanı), kart ve liste satırı, ikon seti (Log seçenekleri dahil),
  boşluk ve yazı ölçeği. Sonra ekran ekran: Ayarlar (baştan), Account sayfası ve paywall'daki Account, "+" sayfası, Bu Hafta alt bölümleri
  (kardiyo vb. sönük), antrenman, yemek.
- **Çıktı:** prototip artifact'ı ekran ekran (agent'ın tasarım kararları ADR-070 Ek olarak).
- Sonra kod: bileşen sistemi önce, ekranlar sonra; her ekran simülatör görüntüsüyle prototiple yan yana kıyaslanır.

## Evre 3 — Yemek verisi
- Kaynağı agent seçer, ADR'ye yazar: parasız ve lisansı uygun olan (Open Food Facts: ODbL, atıf + türetilmiş veritabanında paylaşım şartı;
  içe aktarım VPS'te, yerel disk dar). Kullanıcı verisi dışarı gitmez. Ücretli kaynak gerekirse durur, Levent'e sorar (para).

## Evre 4 — Son tur ve yeni build
- Evre 0'ın turu baştan, aynı envanterle; kırık satır kalmadıysa build 6 → TestFlight → ASC'de 1.0 gönderimi geri çekilir, build 6 bağlanır,
  yeniden gönderilir (yayın şekli ELLE kalır; **Release Levent'te**). Son çıktı: önce/sonra envanter sayfası + build 6.

## Döngü düzeni
Tek oturum, `/loop` (kendi hızında). Hafıza dosyadadır: her tur `DURUM.md › ▶ DEVAM NOKTASI` + bu dosyanın **İlerleme** bölümünü okur, bir iş
paketini bitirir, ikisini günceller. Bağlam özetlense de iş kaybolmaz.

## İlerleme
- [x] Evre 0 — envanter (29 Eki): `plan/envanter-2026-10-29.md` · sayfa https://claude.ai/artifact/7Ew5GE2C1uECT7dYaCofKb (özel; önce şeritleri dolu,
  sonra şeritleri Evre 4'te). Yerel kaynak: `.envanter/` (inventory.json → build_page.py → page/; görüntüler shots/). 8 kırık, 17 kötü satır.
- [ ] Evre 1 — kırık mantık (sıra; her biri kendi dalı + PR + gerçek sunucu kanıtı; kanıt görüntüsü inventory.json › after'a, bulguya `fixed`):
  - [x] 1. K-1 + K-2 programsız hesap (29 Eki, #619, ADR-084; kanıt: gerçek sunucuda programsız hesap → Build my program → 4 gün → Train/This Week'te program): açılışta profil var + program yok → hazırlık yeniden koşar (resume); Train, This Week, Training days/Cardio'da
        "Build my program" çıkışı (Edit program'daki "Rebuild for me" mantığı); sign-out onboarding işaretini silmez.
  - [~] 2. K-4 yemek arama (kod birleşti: #621 sunucu, #622 istemci; sunucu sıralaması üretim verisinde doğrulandı 29 Eki 01:22 — egg/rice/chicken; **simülatör kanıtı sabah**: oturum düştü, dev düzeneği eski food.json sundu): istemci (yazarken gecikmeli arama, eski sonuç temizlenir, aranıyor durumu, bağlantı ≠ sunucu hatası, satırda kcal,
        makul varsayılan birim) + sunucu (kelime başı önce, ı/İ katlama, ilgi sıralaması, aynı adlı kayıtları ayırt etme ya da birleştirme).
  - [~] 3. (kod birleşti #625, ADR-086; kanıt sabah) K-3 kaydedilen yemeği görme / düzeltme / silme yolu (emekli food ekranı yerine; ADR-069 #3 Ek).
  - [~] 4. (kod birleşti #626, ADR-087; kanıt sabah) K-5 Sign out / Delete account onayı görünür yerde (sheet ya da sistem uyarısı).
  - [~] 5. (kod birleşti #626 + #627 test süresi; kanıt sabah) K-6 paywall üst güvenli alan · K-7 antrenman ilerleme çubuğu taşması.
  - (K-8 yemek verisi → Evre 3.)
- [ ] Evre 2 — görsel sistem + ekranlar (kararlar ADR-070 Ek 2; prototip `prototip/yeniden-yapim.html`, https://claude.ai/artifact/3w4F4AyapNksScmgmgzpD6;
  sıra: 1 bileşen sistemi → 2 Ayarlar + Account → 3 "+" + onay bandı → 4 This Week + Train → 5 yemek → 6 antrenman başlığı + stepper yerleri)
  - [~] 2.1 bileşen sistemi (#630 birleşti; kanıt sabah) · [~] 2.2 Ayarlar + Account + veri kaynakları + tek geri (#633 birleşti; kanıt sabah) · [ ] 2.3 "+" + onay bandı (#634 ajanda)
- [~] Evre 3 — yemek verisi (ADR-088; #632 birleşti; üretimde 29 Eki 03:22 UTC 2.897 OFF ürünü içe aktarıldı, 0 atlandı; atıf satırı #633;
  kalan: uygulamada adla arama kanıtı sabah; Türk yemekleri ayrı karar)
- [ ] Evre 4 — son tur + build 6
