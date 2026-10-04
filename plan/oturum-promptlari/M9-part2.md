# M9 · Part 2 — TestFlight ve cihaz (session prompt'u)

> Part 1 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M9 üç part hâlinde yapılıyor; bu PART 2. Ortak talimat plan/oturum-promptlari/M9.md — önce onu oku ve harfiyen uygula.
Hafıza DURUM.md › "## M9 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 1 ÇIKIŞ" git ile doğru mu? Sunucu ayakta mı (sağlık ucu)? Apple Developer üyeliği + App Store Connect uygulama kaydı (Levent).

Kapsam, sırayla:
1) K-308 kapanış + K-903: EAS iOS derlemesi (profil `eas.json`'da; bundle kimliği ve imza yapılandırmada), dahili TestFlight, gerçek sunucuya bağlı.
   Dış TestFlight inceleme başvurusu (Apple — beklerken diğer işler). İletişim adresi yoksa dış teste gitme (M9.md).
2) Cihaz kontrol listesi (Levent cihazda, agent simülatörde ve listeyle): Sign in with Apple + iptali (K-812, gerçek `.p8`), HealthKit izin/okuma/yazma,
   kamera (barkod, öğün, ilerleme fotoğrafı), widget, Live Activity, sandbox satın alma/geri yükleme/iptal (K-702), K-617, K-612. Her madde: sonuç +
   ekran görüntüsü `docs/aktarim/M9/img/`.
3) K-618 ilerleme fotoğrafları yedekten hariç (ince yerel modül, ADR-047 yolu); cihazda doğrula; metin "never uploaded" iddiasını tam söyler.
4) K-815 erişilebilirlik cihaz turu (`docs/yasal/app-store-beyanlari.md › 3` kontrol listesi): AX5, VoiceOver, Reduce Motion, Bold/Increase Contrast,
   Grayscale; VoiceOver duyuruları (koç cevabı, kaydetme hataları — `announceForAccessibility`). Sonuç Besin Etiketi taslağına.

Bitiş: "Part 2 ÇIKIŞ" bloğu + kısa Türkçe özet + M9 Part 3 prompt'unu ver. Session KAPANMAYACAK.
```
