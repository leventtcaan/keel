# Prototip akış testi — tur 3 (7 Eki 2026)

- **Ne:** `prototip/yeni-yuz.html` (artifact sürüm 3) bütün akışları gerçek düğmelere tıklanarak baştan sona yürütüldü.
- **Nasıl:** yerel önizleme (`yeni-yuz.html` + doctype sarmalı) yerleşik tarayıcıda açıldı; `akis-testi.js` sayfada çalıştırıldı. Her adımda
  üst çubuktaki ekran kimliği (`#id`) beklenenle karşılaştırılır; eksik düğme, yanlış ekran ya da JS hatası testi düşürür.
- **Sonuç:** **10/10 akış geçti, 70 adım, 0 hata, 0 JS hatası.** Kelime sayımı ayrıca: bütün ekranlar hedefte (dizindeki sayaç).

| # | Akış | Doğrulanan |
|---|---|---|
| A | Yeni başlayan: giriş → hedef → deneyim → program bizden → 3 gün → rıza → hakkında → aktivite → hazırlanıyor → plan → paywall → Bu hafta → antrenman (5 hareket, bütün setler) → kardiyo → antrenman sonu → paylaş → geri | Yeni başlayanda ağırlık ekranı atlanır, planda "Session 1 finds your weights"; son hareketten sonra kardiyo adımı |
| A2 | "+" → tartı → Apple Health izni (anında) → Bu hafta; öğün ekle | İlk tartıda izin sayfası |
| A3 | İlk gün İlerleme → kalori hedefi → öğün → geri | Hedefler tıklanabilir |
| A4 | 1. hafta check-in (nasıl geçti) → karar → "Change it" → "Keep 3 days" | Kullanıcının seçimi karara yansır |
| B | Tecrübeli + kendi programı: içe aktar → inceleme (bir öneriyi kapat: sayı 3 → 2) → rıza → hakkında → aktivite → ağırlıklar → plan (Push) → paywall → Antrenman → Change → Edit → Swap | Kendi programı dallanması uçtan uca |
| C1 | 12. hafta karar → "Keep last week's plan" → Got it | — |
| C2 | Pazartesi ritüeli → check-in → karar (açılış animasyonu) | — |
| C3 | Oturum: Too heavy → hafiflet; set gir; seti düzelt; set ve hareket atla; duraklat/sürdür; End → sonra doldur | Dinlenme sayacı setten sonra görünür |
| C4 | Hareketin son setinden sonra dinlenme çıkmaz, "Next" görünür | Levent'in tur 2 notu (dinlenme düğmeyi kapatıyordu) |
| D | Dönüş seçimi; duraklat; ayarlarda tema değişir; İlerleme'de hareket seçimi | — |

Kapsam dışı (prototipte bilerek sahte): satın alma, Apple izin sayfaları, içe aktarma dosyası, kamera, gerçek video paylaşımı → toast ile anlatılır.
