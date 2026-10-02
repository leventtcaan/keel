# M5 · Part 2 — Koç altyapısı (session prompt'u)

> Part 1 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M5 dört part hâlinde yapılıyor; bu PART 2. Ortak talimat plan/oturum-promptlari/M5.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md › "## M5 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 1 ÇIKIŞ" git ile doğru mu (K-516, K-512, K-513, K-501, K-502 birleşik)? Yarım devam dosyası varsa önce o.
0a) Disk. 0b) Sağlayıcı kapısı: Part 1'in hazırladığı soruları AskUserQuestion ile Levent'e sor (aday sağlayıcılar,
   ölçüm planı, aylık bütçe/harcama limiti, anahtarın nerede durduğu — repoda değil). Cevap ADR'ye; cevap yoksa bu part
   yalnız sahte sağlayıcıyla ilerler, gerçek çağrı yok.

Kapsam, sırayla:
1) K-503 LLM portu: `LanguageModel` arayüzü, sağlayıcı yapılandırmadan, model/token/fiyat koda gömülü değil, her çağrı
   privacy egress kapısından (K-214); sahte sağlayıcı testler için. Harcama limiti manuel adım → DURUM.
2) K-505 karar anlatımı + itiraz: sayılar kararla birebir (sadakat testi), itirazda karar tekrarlanır + neyin
   değiştireceği; yasaklı ifade taraması (U4, U6).
3) K-506 "hayır diyen koç": ≥30 itiraz senaryosu, her birinde karar korunur; CI'da sahte sağlayıcıyla, gerçek koşu
   haftalık (anahtar Levent'te).
4) K-504 yapılandırılmış çıktı: serbest metin → kayıt; şemaya uymayan atılır; kalori veritabanından (U1); düşük güvende
   tek dokunuş alternatifler (U5).
5) K-508 kota (subscription): sayaçlar quota.yaml'dan, dolunca deterministik mod, "kredi" kelimesi yok.

Bitiş: DURUM › M5 ilerleme › "Part 2 ÇIKIŞ (tarih)"; backlog + sync; kısa özet + Part 3 prompt'u (M5-part3.md).
Session KAPANMAYACAK: döndüğümde Part 2'yi aktarırsın (docs/aktarim/M5/).
```
