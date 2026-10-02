# M4 · Part 4 — Native ve teslim (session prompt'u)

> Part 3 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M4 dört part hâlinde yapılıyor; bu PART 4 (son). Ortak talimat plan/oturum-promptlari/M4.md — önce onu oku ve
harfiyen uygula. Hafıza DURUM.md › "## M4 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma
BAŞLAMAZSIN.

Başta:
0) Senkron: DURUM › M4 ilerleme › "Part 3 ÇIKIŞ" git ile doğru mu? K-407, K-413, K-424, K-416, K-418 birleşik mi
   (#236-#251)? Açık PR/worktree? Yarım bir "M4-part4-devam.md" varsa önce onu uygula.
0a) Disk: `df -h ~` (Part 3 sonu ~4,5 GB; native derleme 3-5 GB ister → önce Levent'e sor, önbellekleri temizle).

Kapsam, sırayla: K-410 bildirim sistemi (üç slot; izin metni en.json'dan) → K-411 dinlenme sayacı arka planda + Live
Activity (native; cihaz derlemesi gerekir — K-308 profili) → K-412 Apple Health'e antrenman yazma (okuma izninden AYRI
düğme, ADR-031). Native modül/yeni bağımlılık seçiminde K-403'ün kalıbı: spike + ADR + HealthAccess benzeri yetenek
arayüzü; Expo Go'da modül yoksa ekran nedenini söyler. Zaman kalırsa: K-423 tarifler telefonda (K-413'ün mobil kısmı).
K-425 (klip oynatma, expo-video) yalnız K-419'da en az bir klip denetimden geçtiyse (`python3 tools/clip.py missing`).

Bitiş:
1) plan/yol-haritasi.md › M4 çıkış kriterlerini tek tek kontrol et, çıktıyla göster; eksikleri DURUM'a yaz.
2) Birikmiş soruları AskUserQuestion ile toplu sor, cevapları ADR'ye işle, kalan uygulanabilir işi bitir.
3) M5 · Karar anları + koç için part prompt'larını bu yapının kalıbıyla yaz: plan/oturum-promptlari/M5.md +
   M5-part1.md … (bağımlılık + boyuta göre). Commit.
4) DURUM › M4 ilerleme › "Part 4 ÇIKIŞ = M4 ÇIKIŞ" bloğu; kısa Türkçe özet + M5 Part 1 prompt'u ver.
Session KAPANMAYACAK: döndüğümde Part 4'ü aktarırsın (docs/aktarim/M4/). Part 2 ve Part 3 aktarımları da bekliyor
(README 8-18) — Levent hangisini isterse.
```
