# ADR-069 · Ürün yönü ve yeni yüzün kapsamı: salonda ağırlık çalışan için haftanın kararı
- **Durum:** KABUL
- **Tarih:** 2026-10-07 · **Karar veren:** Levent. Odak, onboarding "aha"sı ve test şekli Levent'in seçimi. Kesim listesi Levent'in açık yetki
  devriyle agent'ın ("kesilmesi gerekenleri rasyonel ve acımasız olarak indir"). Öneren: agent.

## Bağlam
Uygulama ilk kez gerçek cihazda kullanıldı ve deneyim çalışmadı (ADR-067). Levent'in değerlendirmesi: "Kimse indirmez, reklam çıkılamaz, kişisel
olarak da kullanmam." Faz 5 araştırması (ADR-068) dört hattı tamamladı: `arastirma/06-faz5-yuz.md`, `arastirma/ham/M0-M4`. Ürün bugün 43 ekrandan oluşuyor:
4 sekme, 29 tekil ekran ve 10 adımlık onboarding. Today'in ilk görünümünde ~105 kelime var (rakiplerde 25-50). Onboarding "Wait" ile bitiyor;
AI üretimde kapalıyken koç ve öğün fotoğrafı çıkmaz sokağa varıyor (K-909).

## Karar sürücüleri
- Reklam ve ürün aynı vaadi taşımalı; ürünün 3 saniyede filme alınabilir bir anı olmalı (ADR-068; M1 §10).
- Kategorinin alışkanlıkları: kısa akış, tek kahraman öğe, birkaç dokunuşta kayıt (M2 K1-K11).
- U1-U6 dokunulmaz; anayasa değişikliği gerektirmeyen yol tercih edilir.
- Levent kendi ürününü kullanmak ve reklamını yapabilmek istiyor.

## Karar
1. **Odak:** salonda ağırlık çalışan, ne yapacağını tahmin etmekten yorulmuş kişi. Ürünün vaadi tek cümle: **haftanın kararı ve nedeni.** Antrenman
   kararı önde; beslenme ve kilo bu kararı besler. Motorun kapsamı (kalori kararları dahil) değişmez; değişen yüzü.
2. **Onboarding'in "aha"sı başlangıç kararı:** "Planın hazırlanıyor" → başlangıç kalorisi + haftalık antrenman sayısı + "ilk ayar pazartesi"
   geri sayımı → paywall. Anayasa değişmez (U12'nin projeksiyon kuralı yerinde kalır).
3. **Ana yüzeyden inenler** (kod silinmez; rota ya da giriş noktası kalkar, ilgili ADR'ler geçerli kalır):
   - Today'deki koç çubuğu ve çipleri. Koç yalnız kararın "Neden" katmanında soru olarak durur, AI kapalıyken hiç görünmez (K-909 kapanır).
   - Projeksiyon + SCOFF (ADR-050 geri açılırsa aynen geçerli).
   - What-if ve karar geçmişi ayrı ekran olmaktan çıkar, "Neden"in ikinci katmanına girer.
   - Tarifler (ADR-034 kodu yerinde kalır).
   - AI kapalıyken öğün fotoğrafı girişi.
   - **Beslenme sekmesi.** Öğün kaydı "+"tan girilir; kalan bütçe (aralık, U5) "Bu hafta"da tek satır durur, hedefler İlerleme'de görünür.
   - Onboarding'in photos, foods, Apple Health ve expectations ekranları. Apple Health izni ilk tartı ya da antrenman anında istenir
     (ADR-018 bu yönde güncellenir). Yiyecek kısıtı ayarlara taşınır.
   - Bütün ekranlardaki paragraflar.
4. **Yeni iskelet:** 3 sekme ("Bu hafta", Antrenman, İlerleme) ve tek "+" (tartı, öğün, antrenman başlat). Today tek kahraman öğe: bu haftanın
   kararı ve check-in geri sayımı, altında hafta şeridi. Pazartesi check-in ile "Neden" tek akış, paylaş düğmesi orada. Açık tema varsayılan,
   uygulama içi seçici. Metin hedefi: Today'in ilk görünümü ≤40 kelime, onboarding ekranı ≤25 kelime. Ayrıntı: `plan/faz5-rota.md`.
5. **Test:** prototipi Levent onaylar (ekran ekran). Dış kullanıcı testi bu turda yok.

## Neden
- Kategorinin en çok reklam harcanan acısı "ne yapacağımı bilmiyorum". Fitbod'un en uzun yaşayan reklamları bu skeç; Fitbod 810, Ladder 362
  aktif reklam. Rakiplerin hiçbiri kararın nedenini göstermiyor (M1 §0, §6, §8).
- Ağırlık antrenmanı uygulamaları kısa onboarding ve 3 sekmeyle çalışıyor (Fitbod 14 adım ve 3 sekme, Hevy 10 adım ve 3 sekme). Ana ekranda tek
  kahraman öğe var (M2 K7, K10).
- 12 uygulamanın 9'u onboarding'i somut bir çıktıyla bitiriyor. Başlangıç kararı bunu anayasaya dokunmadan karşılıyor (M2 K1-K2, çıkarım 1).
- Kullanıcı sayfadaki kelimelerin ~%20'sini okuyor (M3 §7.1). Yüzeydeki her ek giriş, kahraman öğeyle yarışıyor (M2 çıkarım 3, 7).
- Haftalık karar kartının rakipte karşılığı yok; farklılaşma kararda, kayıtta eşitlik yeterli (M4 §5-A, çıkarım 1).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Kilo/beslenme odağı (Cal AI yolu) | Kalori sayacı rafı dolu ve AI fotoğrafla yarışıyor; bizim AI'ımız üretimde kapalı. Tezin "neden"i en çok antrenman kararında görünür |
| İkisi eşit (bugünkü yüz) | Cihaz turu bu yüzü sınadı ve çalışmadı; her şey eşitken hiçbir şey kahraman olamıyor |
| Aralıklı projeksiyonu "aha" yapmak | U12 değişikliği gerektirir; etki kanıtı yok (M3 gerilim) |
| Özellikleri silmek | Geri dönüşü pahalı; gizlemek yeter, motor ve sunucu aynı kalır |
| 4 sekmeyi korumak | Beslenme sekmesi odakla yarışıyor; ağırlık uygulamalarının normu 3 sekme + giriş |

## Sonuçlar
- Olumlu: tek vaat, tek kahraman ekran, reklamla aynı an; yüzey küçülür, metin iner; K-909 çıkmaz sokağı kapanır.
- Olumsuz (kabul edilen bedel): beslenme odaklı kullanıcı sekme kaybeder; projeksiyon ve tarifler gibi yazılmış özellikler v1'de görünmez.
  Dış kullanıcı testi olmadığı için tasarımcının kör noktası riski kalır; L2'nin RUBİN için önerdiği 5 saniye testi yapılmıyor.

## Geri dönmenin maliyeti
Düşük-orta. Kod silinmiyor; inen ekranlar giriş noktasıyla geri gelir. Metin ve iskelet yeniden yazımı ise geri alınması pahalı bir iş.

## Etkilenen
`apps/mobile/src/app/` (sekmeler, Today, onboarding, check-in/why/what-if/ledger, coach, food, recipes, projection, scoff), `data/copy/en.json`,
ADR-016 (görsel dil, yerine yenisi gelecek), ADR-018 (Health izni zamanı), ADR-050 ve ADR-034 (kod yerinde, giriş yok), ADR-054 (kart yeniden),
`plan/faz5-rota.md`, `plan/yol-haritasi.md` (M9 ara), `plan/oturum-promptlari/UIUX-part2.md`.

## Doğrulama
Prototipte: Today'in ilk görünümü ≤40 kelime ve onboarding ekranları ≤25 kelime (sayım), sekme sayısı 3, inen ekranlara giriş yok. Levent ekran
ekran onaylar. Kodda: rota testleri inen ekranlara erişim olmadığını, anayasa denetimi (`tools/anayasa-denetimi.sh`) U4/U6 ihlali olmadığını gösterir.
