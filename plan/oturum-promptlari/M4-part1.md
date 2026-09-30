# M4 · Part 1 — Bugün ve ölçüm (session prompt'u)

> M3 aktarımı bittikten sonra, yeni session `~/Projects/keel` klasöründen açılır. Aşağıdaki blok olduğu gibi yapıştırılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme;
docs/aktarim-protokolu.md › Toplu mod). M4 dört part hâlinde yapılıyor; bu PART 1. Ortak talimat
plan/oturum-promptlari/M4.md — önce onu oku ve harfiyen uygula. Hafıza DURUM.md › "## M4 ilerleme"de; sohbete güvenme.
Ben paralelde başka işteyim; part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron (M4.md › başında): DURUM › M3 ilerleme › "Part 3 ÇIKIŞ = M3 ÇIKIŞ" bloğu git ile doğru mu? #211 (K-227)
   birleşik mi? Kalan varsa ÖNCE onu bitir. ADR-030'u oku.
0a) Disk: `df -h ~` (5 GB altı → önbellek temizliği, hâlâ azsa dur, sor).
0b) K-308 (M3'ten açık çıkış kriteri, ADR-030): docs/eas-derleme.md'deki komutları sırayla hazırla ve bana ver —
   `eas init` (Expo hesabı), simülatör derlemesi (bulut), cihaz derlemesi + dahili TestFlight. Hesap/Apple adımlarını
   ben kendi terminalimde onaylayıp çalıştırırım; sen çıktıyı doğrula, `app.config.ts`/`eas.json`'a yalnız sır olmayan
   değerleri (projectId gibi) işle. Cevabımı beklerken engellenmeyen işe geç.

Kapsam, sırayla: K-231 privacy (rıza geri çekilince bağlı veri silinir + ADR-030 #27) → K-230 engine (LEA ağı RFM
bandının temkinli ucu, ADR-028 #22) → K-401 Bugün ekranı (karar kartı genel etiketle, mini cut metinleri) → K-409 kalan
bütçe + Hedefler (K-216 kriterleri) → K-402 tartı girişi + HealthKit kilo (ADR-030 #25: girişte rıza) → K-404 HealthKit
adım ve uyku (iki rıza: HEALTH_DATA + APPLE_HEALTH). K-313 yalnız referans çizimler geldiyse (ADR-030 #28).

Bitiş: DURUM › M4 ilerleme › "Part 1 ÇIKIŞ (tarih)" bloğu (M4.md › sonunda); backlog status + sync; kısa Türkçe özet
+ Part 2 prompt'unu (plan/oturum-promptlari/M4-part2.md) ver. Session KAPANMAYACAK: döndüğümde Part 1'i bana aktarırsın
(skill aktarim; docs/aktarim/M4/).
```
