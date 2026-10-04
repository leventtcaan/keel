# M7 · Part 2 — Paywall ve teslim (session prompt'u)

> Part 1 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M7 iki part hâlinde yapılıyor; bu PART 2 (son). Ortak talimat plan/oturum-promptlari/M7.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md › "## M7 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 1 ÇIKIŞ" git ile doğru mu (K-701, K-703)? K-308? Disk. Para/mağaza kapısının cevapları (ADR-012 eki) — eksik
   olan varsa engellemeyen işle devam, sonda sor.

Kapsam, sırayla:
1) K-702 paywall, satın alma, geri yükleme, duraklat/iptal (telefon): `react-native-purchases` — `npx expo install` ile SDK 57 uyumlu
   sürüm (K5 gerekçesi PR'da, ADR-012'deki sürümü güncelle); native modül → Expo Go'da yok: satın alma bir **port** arkasında
   (bildirim/HealthKit kalıbı), testte sahte, cihazda gerçek. Fiyatlar mağazadan okunur (kodda fiyat yok, K2); deneme ve yenileme dili
   açık (Apple 3.1.2 — metin en.json'da); geri yükleme düğmesi; duraklat ve iptal iki dokunuşta (Apple'ın abonelik yönetimine derin
   bağlantı); satın alma sonrası yetki sunucudan okunur (istemciye güvenilmez, ADR-012). Paywall'ın ne zaman göründüğü (deneme bitince,
   premium bir özelliğe dokununca) — ürün sorusuysa Levent'e.
2) Cihaz adımları (K-308 yapıldıysa): sandbox satın alma, geri yükleme, iptal; yapılmadıysa DURUM'a.

Bitiş:
1) plan/yol-haritasi.md › M7 çıkış kriterlerini tek tek kontrol et, çıktıyla göster; eksikleri DURUM'a yaz.
2) Birikmiş soruları AskUserQuestion ile toplu sor, cevapları ADR'ye işle, kalan uygulanabilir işi bitir.
3) M8 · Uyum ve yasal için part prompt'larını bu yapının kalıbıyla yaz: plan/oturum-promptlari/M8.md + M8-part1.md … (M8 kapıları:
   gizlilik politikası/kullanım şartları/sağlık feragatnamesi metinleri hukuki — Levent; vergi/W-8BEN mali müşavirle — Levent;
   App Store gizlilik etiketleri ve yaş derecelendirmesi — Levent onayı). Commit.
4) DURUM › M7 ilerleme › "Part 2 ÇIKIŞ = M7 ÇIKIŞ" bloğu; kısa Türkçe özet + M8 Part 1 prompt'u ver.
Session KAPANMAYACAK: döndüğümde Part 2'yi aktarırsın (docs/aktarim/M7/).
```
