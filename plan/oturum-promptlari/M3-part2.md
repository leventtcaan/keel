# M3 · Part 2 — Veri ve kimlik (session prompt'u)

> Part 1 bittikten sonra, yeni session `~/Projects/keel` klasöründen açılır. Aşağıdaki blok olduğu gibi yapıştırılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri; docs/aktarim-protokolu.md › Toplu mod).
M3 üç part hâlinde yapılıyor; bu PART 2. Ortak talimat plan/oturum-promptlari/M3.md — önce onu oku ve harfiyen uygula.
Hafıza DURUM.md › "## M3 ilerleme"de; sohbete güvenme. Ben paralelde başka işteyim; part'ı baştan sona uygularsın,
aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron (M3.md › başında): DURUM › M3 ilerleme › "Part 1 ÇIKIŞ" bloğu var ve git ile doğru mu? K-301, K-302, K-303,
   K-307 birleşik, ADR-028 yazılmış mı? Part 1'de kalan varsa ÖNCE onu bitir. Part 1 ÇIKIŞ'taki teknik kararları oku
   (tasarım token'ları, istemci yapısı) — bu part onların üstüne kurar. Yarım kalmış bir "M3-part1-devam.md" varsa önce
   onu uygula.
0a) Disk: `df -h ~` (5 GB altı → dur, sor).

Kapsam, sırayla: K-304 yerel depo + senkron kuyruğu (offline-first, SQLite; clientId idempotency ADR-024; tek uçuşlu
refresh ADR-025 — kabul kriteri olarak karta ekle) → K-305 Sign in with Apple (K-203; kimlikler ADR-028'den,
yapılandırmadan; .p8 repoya girmez; kimlik yoksa sahte/yapılandırılabilir sağlayıcıyla test et, DURUM'a yaz) → K-310
birim sistemi kg/lb, cm/in (sunucu metrik saklar; dönüşüm yalnız istemcide, yuvarlama kuralı testli).

Çıkış: çevrimdışıyken yapılan kayıt kuyruğa girer, bağlantı gelince bir kez gönderilir (tekrar gönderim aynı sonucu
alır); aynı anda biten istekler tek refresh yapar; Apple ile giriş akışı çalışır (ya da neyin eksik olduğu DURUM'da);
birimler ayarlanabilir. Sonra M3.md › "her part'ın SONUNDA": "Part 2 ÇIKIŞ" bloğu, commit + push, kısa Türkçe özet, DUR.
Session kapanmaz; Part 3 prompt'u plan/oturum-promptlari/M3-part3.md'de.
```
