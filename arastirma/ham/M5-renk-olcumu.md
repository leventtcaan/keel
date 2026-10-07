# M5 · Renk ölçümü (R1'in görsel ayağı) — Faz 5 · Part 2 tur 2

- **Tarih:** 2026-10-07 · **Durum:** TAMAM · **İzin:** Levent (AskUserQuestion, 7 Eki: reklam görselleri + App Store ekranları indirilsin, ölçülsün, silinsin)
- **Kanıt etiketleri:** **[ÖLÇÜM]** bu dosyanın kendi hesabı · **[ÇIKARIM]** yorum
- **Soru:** Levent "renk Apify analizinin sonucuyla yeniden belirlensin" dedi. Kategoride hangi renk bölgeleri dolu, hangileri boş; uzun yaşayan
  reklamların rengi farklı mı?

## 1 · Yöntem
1. **Reklam görselleri:** `~/.keel-research/apify/ds-*.json` (R1 ham verisi, ABD, aktif, gösterime göre ilk 50) içindeki video önizleme kareleri ve
   görseller → 426 kare (MacroFactor 36, Cal AI 51, BetterMe 50, Gymverse 111, Ladder 60, WeightWatchers 16, Fitbod 79, MFP 22, Muscle Booster 1).
   Her karenin reklam başlangıç tarihi R1'den; **uzun yaşayan = ≥90 gün** (R1'in vekil ölçüsü, M1 §0).
2. **App Store görselleri:** iTunes Lookup API (`itunes.apple.com/lookup?id=…&country=us`), 18 uygulama, uygulama başına en çok 8 ekran → 134 görsel.
   Kimlikler `M5-renk/appids.json` (Apple top grossing listelerinden, M0).
3. **Ölçüm:** görsel 96 px'e küçültülür, CIELAB'a çevrilir (`scikit-image`). Açık zemin L>85, koyu zemin L<22. Canlı piksel kroma C>40 (uygulama) /
   C>45 (reklam). Uygulama başına canlı piksellerde k-ortalama (k=4) → baskın vurgular. Ton histogramı 15°'lik dilimler, kromayla ağırlıklı.
   Aday renkler için en yakın rakip vurgusuna CIEDE2000 uzaklığı ve WCAG kontrastı.
4. **Silme:** görseller ölçümden sonra silindi; yalnız sayılar kaldı. Betikler `M5-renk/fetch.py`, `M5-renk/analyze.py` (yeniden koşmak için
   bir scratch klasörüne kopyala; görseller depoya girmez).

## 2 · Uygulama içi (App Store ekranları) [ÖLÇÜM]

| Uygulama | Açık zemin % | Koyu zemin % | Canlı piksel % | Baskın vurgular |
|---|---|---|---|---|
| MyFitnessPal | 41 | 3 | 6.1 | #98A332, #BA6124, #375CDD |
| MacroFactor | 3 | 71 | 0.7 | #883D44, #E37E55, #B2A246 |
| Cal AI | 23 | 57 | 1.8 | #B98041, #DDA23E, #D96561 |
| Lose It | 27 | 13 | 8.3 | #F98723, #BC5729, #9AAB4A |
| LADDER | 43 | 36 | 9.2 | #E9FE27, #E9F85B, #F2F994 |
| Fitbod | 4 | 45 | 25.4 | #A52C45, #892B3E, #972C43 |
| Hevy | 71 | 9 | 12.0 | #1D82E9, #CBF08E |
| Gymverse | 4 | 50 | 30.1 | #393984, #5236D6, #4439A5 |
| BetterMe | 70 | 3 | 0.6 | #87AD47, #B7813A, #AA462D |
| Noom | 40 | 2 | 2.0 | #EA613A, #849130, #993E1F |
| WeightWatchers | 21 | 22 | 63.5 | #3D34E4, #191976 |
| Bevel | 53 | 17 | 1.4 | #F7BF72, #A08ADA, #F48448 |
| Muscle Booster | 3 | 50 | 25.3 | #0F1E69, #0C2AA6 |
| Strava | 0 | 72 | 15.3 | #C84314, #6C160A, #931C05 |
| Runna | 20 | 47 | 0.9 | #31A56A, #CE5F4E, #C78E4C |
| Strong | 31 | 20 | 4.8 | #D74744, #997CF7, #E68D50 |
| Liftoff | 27 | 45 | 8.0 | #57ACF7, #CBA640, #C1651F |
| Numify | 29 | 9 | 46.2 | #518BF1, #F47E39, #4DB662 |

Not: mağaza görselleri pazarlama çerçevesi de içerir (arka plan, başlık); "zemin" uygulamanın kendisi kadar mağaza tasarımını da ölçer.

## 3 · Reklamlar [ÖLÇÜM]

| Reklam veren | Kare | Ort. L | Koyu % | Açık % | Canlı % |
|---|---|---|---|---|---|
| MacroFactor | 36 | 52.6 | 29.3 | 28.0 | 2.0 |
| Cal AI | 51 | 48.5 | 20.0 | 7.8 | 4.8 |
| BetterMe | 50 | 50.9 | 19.7 | 16.8 | 1.5 |
| Gymverse | 111 | 39.5 | 32.1 | 4.7 | 2.1 |
| Ladder | 60 | 48.7 | 25.8 | 18.3 | 3.4 |
| WeightWatchers | 16 | 37.0 | 38.8 | 4.5 | 24.0 |
| Fitbod | 79 | 36.0 | 40.5 | 6.5 | 2.2 |
| MyFitnessPal | 22 | 55.0 | 8.8 | 12.2 | 13.6 |

- **Uzun yaşayan (≥90 gün, 144 kare)** ort. L 44,6 · koyu %29,6 · canlı **%2,5** · **kısa ömürlü (282)** ort. L 44,3 · koyu %28,1 · canlı **%4,7**.
- **Ton dağılımı** (canlı piksel kütlesi): mavi-çivit (Lab 285-300°) %44; kırmızı-turuncu-sarı (0-75°) ~%40, büyük kısmı ten ve salon ışığı;
  **yeşil-turkuaz-camgöbeği (150-255°) %0-0,1; macenta (315-345°) %0,2-0,4.** Uzun yaşayanlarda çivit %40,7, sıcak ~%46.

## 4 · Adaylar [ÖLÇÜM]

| Aday | Kullanım | En yakın rakip vurgusu (ΔE00) | Beyaz yazı | Siyah üstünde |
|---|---|---|---|---|
| Turkuaz #007C8C | açık tema dolgu/metin | Hevy #1D82E9 22,5 · Numify 24,6 · Liftoff 25,2 | 4,93 | — |
| Turkuaz #2EE6D6 | siyah blok üstü | WHOOP teal (L2) 15,6 · Runna yeşili 22,4 | — | 12,32 |
| Turkuaz #35D7CF | koyu tema dolgu | WHOOP 18,6 · Runna 21,6 | — | 10,82 (siyah yazı) |
| Rubin #B0129A | ADR-016 | Gymverse 19,5 · Fitbod 20,6 | 6,18 | — |
| Strava #FC5200 | kıyas | 6,2 | — | — |

## 5 · Çıkarım [ÇIKARIM]
1. **Renk kancayı taşımıyor.** Uzun yaşayan reklamlar daha az renkli; kazanan gerçek çekim (yüz, beden, salon). Renk kararı reklam performansı için
   değil, **marka tanınırlığı ve uygulama içi kimlik** için verilir.
2. **Boş iki bölge:** turkuaz-camgöbeği ve macenta. Turkuaz en uzak bölge (ΔE ≥22,5) ve reklam akışının sıcak tonlarının (ten, salon ışığı)
   tamamlayıcısı; kullanıcının fotoğrafı üstüne binen çıkartmada öne çıkar. Macenta da boş ama "kadın uygulaması" riski test edilmedi (L2, ADR-069).
3. **Zemin:** ağırlık uygulamaları koyuya, beslenme/koç uygulamaları açığa yakın (M2 K17 ile aynı). Levent koyu temayı iç karartıcı buldu → açık
   zemin varsayılan, antrenman ekranı koyu odak modu.
4. **Risk:** turkuaz sağlık/klinik çağrışımı yapabilir; bunu doygun "elektrik" tonu (#2EE6D6) siyahla eşleyerek ve pastel kullanmayarak azaltırız.
   WHOOP'un teal'i (ΔE 15,6) en yakın komşu; WHOOP bu rakip kümesinde değil.
