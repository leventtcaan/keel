# M3 · Part 1 — Temel (session prompt'u)

> Yeni session `~/Projects/keel` klasöründen açılır. Aşağıdaki blok olduğu gibi yapıştırılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri; docs/aktarim-protokolu.md › Toplu mod).
M3 üç part hâlinde yapılıyor; bu PART 1. Ortak talimat plan/oturum-promptlari/M3.md (senkron kuralı, görev döngüsü,
sınırlar, devralınan kriterler) — önce onu oku ve harfiyen uygula. Hafıza DURUM.md › "## M3 ilerleme"de; sohbete güvenme.
Ben paralelde başka işteyim; part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron (M3.md › başında): M2 bitmiş olmalı — DURUM › DEVAM NOKTASI 0, K-222 #186 birleşik, açık worktree yok.
   DURUM'da "## M3 ilerleme" bölümü yoksa oluştur (part tablosu + görev tablosu, M3.md'deki gibi).
0a) Disk: `df -h ~`. 5 GB'tan az boşsa DUR, bana sor. Docker açılabiliyorsa DB testlerini yerelde de koş.
0b) AskUserQuestion ile TEK seferde sor: Apple kimlikleri (Team ID, Bundle ID, Services ID; .p8 repoya girmez) ·
    DURUM soruları 21, 22, 23, 24 · referans görünüş görselleri (Ö-4/K-224: 7 seviye × 2 cinsiyet; kim çeker/lisans).
    Cevapları plan/kararlar/ADR-028-m3-basi-cevaplari.md'ye işle (+ plan/kararlar.md dizini). Backend'e dokunan cevap
    (21-24) için backlog'a görev ekle (K-228…), M3 part 3'e ya da M4'e yerleştir; kodlama bu part'ta değil.

Kapsam, sırayla: K-301 tasarım sistemi (C iskeleti + RUBİN, açık/koyu; ADR-014, ADR-016; prototip/) → K-302 metin sistemi
ve yasaklı ifade taraması (data/copy/en.json; U4/U6) → K-303 üretilen API istemcisi (contracts/openapi.yaml → schema.ts,
elle tip yok) → K-307 gezinme (sistem sekme çubuğu; ekranlar boş iskelet) → Dependabot #2.

Çıkış: uygulama simülatörde açılıyor — sekmeler, RUBİN açık/koyu, metinler en.json'dan, tipli istemci hazır; ekran
görüntüsüyle kanıt. Sonra M3.md › "her part'ın SONUNDA": DURUM › M3 ilerleme › "Part 1 ÇIKIŞ" bloğu, commit + push,
kısa Türkçe özet, DUR. Session kapanmaz; Part 2 prompt'u zaten plan/oturum-promptlari/M3-part2.md'de.
```
