# M5 · Part 2 — Koç altyapısı (session prompt'u)

> Part 1 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M5 dört part hâlinde yapılıyor; bu PART 2. Ortak talimat plan/oturum-promptlari/M5.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md › "## M5 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 1 ÇIKIŞ" git ile doğru mu (K-516, K-512, K-513, K-501, K-502 birleşik; açık PR yalnız #273)? Yarım devam dosyası varsa önce o.
0a) Disk (Part 1 sonu 4,9 GB — 5 GB altıysa önce önbellek temizliği).
0b) Sağlayıcı kapısı CEVAPLANDI → ADR-041 (67-71): şimdi harcama yok, gerçek çağrı yok, anahtar yok; bu part **yalnız sahte
   sağlayıcıyla**. Sıfır veri saklama şart (K-511'de elenme ölçütü). Tekrar sorma.

Önce — ADR-041 işleri (kartlar backlog'da):
  K-430 #273'ü bitir (e1RM eşdeğerliği: biriken tekrar ağır yükü aralık altında yapılabilir kılınca sıçra; Java + TS + ortak vakalar;
  K-414 testinin 35×13 beklentisi K1 onaylı) · K-523 üründe kişi adı yok (API Source yalnız tür; GURAY_* → nötr; sözleşme açıklamaları;
  yasaklı ifade taraması kişi adı yakalar — hafıza: urunde-kisi-adi-yok) · K-525 "hâlâ öyle mi" 3 haftada bir · K-526 uyum sayıları ·
  K-527 kaçan seans programın günleri · K-524 literatür (dönüş yükü, minimum doz; kaynak yetmezse ADR-038'e gerekçe).

Kapsam, sırayla:
1) K-503 LLM portu: `LanguageModel` arayüzü, sağlayıcı yapılandırmadan, model/token/fiyat koda gömülü değil, her çağrı
   privacy egress kapısından (K-214); sahte sağlayıcı testler için. Gerçek sağlayıcı adaptörü yok (ADR-041); harcama limiti yayında.
2) K-505 karar anlatımı + itiraz: sayılar kararla birebir (sadakat testi), itirazda karar tekrarlanır + neyin
   değiştireceği; yasaklı ifade taraması (U4, U6).
3) K-506 "hayır diyen koç": ≥30 itiraz senaryosu, her birinde karar korunur; CI'da sahte sağlayıcıyla (gerçek koşu yayına
   çıkarken, ADR-041). Koç anlatımı kişi adı kullanmaz (K-523).
4) K-504 yapılandırılmış çıktı: serbest metin → kayıt; şemaya uymayan atılır; kalori veritabanından (U1); düşük güvende
   tek dokunuş alternatifler (U5).
5) K-508 kota (subscription): sayaçlar quota.yaml'dan, dolunca deterministik mod, "kredi" kelimesi yok.

Bitiş: DURUM › M5 ilerleme › "Part 2 ÇIKIŞ (tarih)"; backlog + sync; kısa özet + Part 3 prompt'u (M5-part3.md).
Session KAPANMAYACAK: döndüğümde Part 2'yi aktarırsın (docs/aktarim/M5/).
```
