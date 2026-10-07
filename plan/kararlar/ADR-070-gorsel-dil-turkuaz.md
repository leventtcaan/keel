# ADR-070 · Görsel dil: turkuaz, açık zemin, koyu odak modu, uygulama içi tema seçici
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (renk seçimi ve prototip onayı, 7 Eki); öneren: agent
- **Yerine geçtiği:** ADR-016 (renk, tema ve köşe kısmı; Barlow Condensed başlık ve sistem gövde fontu aynen sürer)

## Bağlam
ADR-016 RUBİN'i (#B0129A) seçmişti; "kadın uygulaması" riskini ölçecek 5 saniye testi hiç yapılmadı. Cihaz turunda (ADR-067) Levent koyu
yüzü iç karartıcı buldu. Faz 5 Part 2'de reklam ve mağaza görselleri ölçüldü (`arastirma/ham/M5-renk-olcumu.md`, 426 reklam karesi, 134 mağaza
görseli): kategorinin canlı rengi %44 mavi-çivit, ~%40 sıcak; turkuaz-camgöbeği %0, macenta %0,2. Uzun yaşayan reklamlar daha az renkli: renk
kancayı değil markayı taşıyor. Levent tur 2'de turkuazı seçti, tur 3 prototipini onayladı (`prototip/yeni-yuz.html`, sürüm 3).

## Karar sürücüleri
- Rakip vurgularından algısal uzaklık (ΔE00) ve iki temada WCAG AA.
- Paylaşım çıkartması kullanıcının sıcak tonlu foto/videosu üstünde okunmalı (ADR-076).
- Kategori normu açık zemin (M2 K17); antrenman sırasında odak (Runna, Ladder).
- Arayüzde "AI izi" yok: uzun ve orta tire kullanılmaz (Levent, tur 1).

## Karar
1. **Vurgu turkuaz**, açık temada dolgu `#007C8C` (üstünde beyaz 4,93:1), siyah blok üstünde `#2EE6D6` (12,3:1), koyu temada `#35D7CF`
   (üstünde `#061212`). Yumuşak zemin açıkta `#DDF3F4`, koyuda `#113030`. Uyarı rengi ayrı kalır (`#D12F1F` / `#FF6B5A`), yalnız gerçek uyarıda.
2. **Açık zemin varsayılan** (`#FFFFFF`, yüzey `#F1F3F3`, çizgi `#DCE0E0`, mürekkep `#0B0C0C`). Karar bloğu zeminin tersi (açıkta siyah,
   koyuda açık). Birincil düğme açıkta siyah, koyuda turkuaz.
3. **Uygulama içi tema seçici:** Ayarlar › Appearance: Light / Dark / System, **varsayılan Light**. ADR-016'nın "uygulama içinde tema
   ayarı yok" maddesi kalkar (kategori normu ve Levent'in tepkisi; HIG seçiciyi yasaklamıyor, sistemi izlemeyi öneriyor: System seçeneği bunu
   karşılar).
4. **Koyu odak modu:** antrenman oturumu ve antrenman sonu kutlaması temadan bağımsız her zaman koyu.
5. **Tipografi:** başlık Barlow Condensed **900**, büyük harf (ekran başlığı, karar etiketi, büyük sayılar); gövde sistem fontu 17 pt, etiketler
   yarı kalın. Gri küçük metin az. 11 pt altı metin yok (ADR-016'dan sürer).
6. **Biçim:** dolu kartlar (ince çizgi kart yok), köşe kart 16-18, düğme 12, seçenek 16; dokunma hedefi ≥44 pt, birincil düğme 54 pt.
   Her hareket listesinde hareket küçük görseli (ADR-017 klip karesi); oynat rozeti yalnız dokunulunca video açan yerde.
7. **Arayüz metninde uzun (—) ve orta (–) tire yok.** Aralıklar "610-720", cümle bağları nokta ya da virgül. Test bunu `data/copy/en.json`
   üstünde zorlar.
8. **Apple Activity halkalarına benzeyen iç içe halka yok** (HIG). Haftanın ilerlemesi segmentlerle; tek halka yalnız "plan hazırlanıyor".
9. **Sistem katmanı** (sekme çubuğu) ADR-016'daki gibi Native Tabs; turkuaz yalnız seçili sekme ve "+" düğmesinde.

## Neden
Turkuaz en yakın rakip vurgusuna ΔE 22,5 (Hevy mavisi); kategoride boş bölge; ten ve salon ışığının tamamlayıcısı (çıkartmada öne çıkar);
cinsiyet kodu taşımıyor. Açık zemin Levent'in "iç karartıcı" tepkisini ve kategori normunu karşılıyor. Koyu odak modu salonda parlamayı
azaltır ve "şimdi antrenman" kipini ayırır. Kanıt: M5 §2-§5; M2 K17, çıkarım 6; 06 §6.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| RUBİN (ADR-016) | Test edilmemiş "kadın uygulaması" riski; Levent turkuazı seçti |
| Koyu varsayılan | Cihaz turunda iç karartıcı bulundu; kategori normu açık |
| Yalnız sistem teması | Kullanıcı açık istese de telefonu koyuda; seçici ucuz, System seçeneği HIG'i karşılar |
| Oturumu da temaya bağlamak | Salonda parlak ekran ve kip ayrımı kaybı |

## Sonuçlar
- Olumlu: tek vurgu, iki temada AA, çıkartmada okunur; tokenlar tek dosyada.
- Olumsuz: turkuaz sağlık/klinik çağrışımı yapabilir (önlem: doygun ton siyahla, pastel yok). WHOOP teal'i (ΔE 15,6) en yakın komşu; rakip
  kümesinde değil. Dış 5 saniye testi bu turda da yok (ADR-069 #5).

## Geri dönmenin maliyeti
Düşük: renkler `apps/mobile/src/theme/tokens.ts`'de; tema seçici tek ayar.

## Etkilenen
`apps/mobile/src/theme/` (tokens, theme.tsx, fonts 900 ağırlığı), Ayarlar, `contrast.test.ts`, `tokens.test.ts`, `data/copy/en.json` (tire
taraması), paylaşım çıkartması (ADR-076), ADR-016 (YERİNİ ALDI → ADR-070, kısmen).

## Doğrulama
`contrast.test.ts` iki temada ve odak modunda dolgu üstü metin ≥4,5:1 · `tokens.test.ts` renk literali yalnız token dosyasında · tema seçici
testi (Light/Dark/System, varsayılan Light, oturum ekranı her zaman koyu) · copy testi: `en.json`'da "—" ve "–" yok.

## Ek 1 · Metin olarak turkuaz bir ton koyu (K-951, 2026-10-07, agent; **Levent KABUL, 2026-10-08**: `#007684` kalır, ayrı metin token'ı yok)
Vurgu yalnız dolgu değil, metin de ("in use", bağlantılar, rekor). `#007C8C` yüzeyde (`#F1F3F3`) 4,42:1 veriyor (AA altı) ve koyu temada açık
karar bloğunda (`#F1F4F4`) 4,46:1. Tek token korunarak açık vurgu ve koyu temanın blok içi vurgusu **`#007684`** oldu: beyaz metin üstünde
5,35:1, yüzeyde 4,80:1, açık blokta 4,84:1, yumuşak zeminde (`#DDF3F4`) 4,64:1. Göz için fark yok; iki ayrı token (dolgu/metin) 20 dosyaya
dokunacaktı. Koyu temada `decisionText` zeminle aynı (`#0E1010`): sayfadaki seçili çip blok renkleriyle çizilir (`Chip`).
Tema tercihi telefonda (`appearance` anahtarı, veri envanteri) ve oturum kapanınca silinir: sonraki kişi Light ile başlar.
Uygulama seçimi iOS'a da bildirir (`Appearance.setColorScheme`; System → `unspecified`): durum çubuğu, sekme çubuğu ve sayfalar sayfayla aynı
temada. Levent `#007C8C`'yi dolgu için korumak isterse ayrı bir metin token'ı eklenir (vurgu metni ~20 dosyada).
