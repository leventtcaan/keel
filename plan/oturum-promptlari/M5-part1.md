# M5 · Part 1 — Motor ve check-in (session prompt'u)

> M4 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M5 dört part hâlinde yapılıyor; bu PART 1. Ortak talimat plan/oturum-promptlari/M5.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md'de (Part 1'de "## M4 ilerleme › Part 4 ÇIKIŞ = M4 ÇIKIŞ"; bu part "## M5 ilerleme"yi açar);
sohbete güvenme, git ile doğrula. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: M4 ÇIKIŞ git ile doğru mu (K-410 #253/#254, K-411 #256, K-412 ve varsa K-423 birleşik)? "M5'in bilmesi
   gerekenler"i oku. DURUM'a "## M5 ilerleme" bölümünü aç (M4'teki tablo biçimi).
0a) Disk: `df -h ~`. Levent'in cevapladığı sorular ADR'ye işlendi mi (M4 sonu)?

Önce — M4 sonu cevaplarından kalan işler (ADR-037, kartlar backlog'da; DURUM › M4 ilerleme › "ADR-037 işleri"):
  K-429 rıza metni + sürüm `2-draft` (telefon + sunucu; 13 backend test dosyasındaki 26 sabit `1-draft` rıza isteği tek bir
  test sabitine bağlanır — istek değişir, iddia değil; CI'da izle) · K-428 geri çekmede açık "yükü tut" biter · K-431 yalnız
  setli antrenman sayılır (ConsistencyApiTests fikstürüne set — ADR-037 #39 K1 onaylı) · K-430 sıçrama sınırı → tekrar
  (Java + TS + ortak vakalar) · K-432 son seans düzenlenince hedef yeniden · K-434 onboarding hatırlatma adımı (akış
  testinin adım yürüyüşü iki yerde değişir: yeni adım — davranışı bilerek değiştirir, Levent'e K1 notu).

Kapsam, sırayla — hepsi LLM'siz, deterministik:
1) K-516 durum modu: önce ikiye böl (engine + mobile, backlog'a yaz). Motor: Traveling/Sick/Pain/Busy/New gym →
   NO_DECISION_YET (context), af haftası yanmaz, "paused" sayaç, 7+ gün sonra suçlamasız dönüş + 1 hafta yeniden
   baseline; dönüş yükü/minimum doz kaynaklı değilse o alt madde bekler (U14, soruyu DURUM'a). Mobil: beyan ekranı +
   K-410'un `muted` kancasına bağla (ADR-036 #7).
2) K-512 proaktif tetikleyiciler (en az dört; her biri kural kimliği + kaynak; uygulama içi soru, bildirim değil).
3) K-513 ilk 8 hafta + 5. hafta risk skoru: önce ikiye böl; girdiler parametreden ve kaynaklı; riskte soru bütçesi ≤5.
4) K-501 pazartesi check-in ekranı (sunucunun soruları, sırası, nedeni; V4; APPETITE seçenekleri).
5) K-502 karar kartı varyantları + gerekçe sayfası.
Zaman kalırsa: M4'ten kalan K-423 (tarifler telefonda) — DURUM'da durumu yazılı.

Bitiş: DURUM › M5 ilerleme › "Part 1 ÇIKIŞ (tarih)"; backlog status + sync; Part 2 başında Levent'e sorulacak sağlayıcı
sorularını (aday listesi, ölçüm planı, bütçe, anahtar yönetimi) DURUM'a hazırla; kısa özet + Part 2 prompt'u
(M5-part2.md). Session KAPANMAYACAK: döndüğümde Part 1'i aktarırsın (docs/aktarim/M5/).
```
