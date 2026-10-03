# M6 · Part 1 — Geçmiş ve sinyaller (session prompt'u)

> M5 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M6 dört part hâlinde yapılıyor; bu PART 1. Ortak talimat plan/oturum-promptlari/M6.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md'de (Part 1'de "## M5 ilerleme › Part 4 ÇIKIŞ = M5 ÇIKIŞ"; bu part "## M6 ilerleme"yi açar);
sohbete güvenme, git ile doğrula. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: M5 ÇIKIŞ git ile doğru mu (K-514 #327, K-408 #328 ve Part 4'ün diğer PR'ları birleşik)? "M6'nın bilmesi
   gerekenler"i oku. DURUM'a "## M6 ilerleme" bölümünü aç (M5'teki tablo biçimi).
0a) Disk (soru 80 — Docker temizlendi mi?): `df -h ~`. Temizlendiyse M5'ten ertelenen **simülatör turu** ilk iş (M5 Part 4 ÇIKIŞ'taki
   liste). Levent'in M5 sonu cevapları ADR'ye işlendi mi?

Kapsam, sırayla — LLM'siz, deterministik:
1) K-535 geçmiş haftalar o haftanın program sayısıyla (ADR-045 #79): program geçmişini tarihli oku; tutarlılık, uyum, kaçan plan haftası,
   ilk 8 hafta aynı okumayı kullanır; "program 3 → 5 gün, geçmiş hafta değişmez" testi (DB, CI).
2) K-534 seyrek rafta tekrar tavanı (ADR-045 #73): skill `kural-ekle` (tavan parametresi, `urun`, kaynaksız → not), Java + TS ortak vakalar.
3) K-608 tutarlılık geçmişi ("12 haftanın 11'i · 1 af haftası kullanıldı"; sıfırlanmaz, U7) — K-535'in okumasıyla.
4) K-603 kompozisyon mesajı ("kilo sabit, bel düştü"; eşikler parametreden, ölçüm hatasının üstünde; kural-ekle).
5) K-611 karar defteri (K-212 kayıtları; "after" dili, nedensellik iddiası yok).
6) K-610 "kararı ne değiştirir?" (varsayımsal Snapshot motora; gerçek veriyle karışmaz, açık etiket; LLM yok).

Bitiş: DURUM › M6 ilerleme › "Part 1 ÇIKIŞ (tarih)"; backlog status + sync; Part 2 başında Levent'e sorulacak **sağlık kapısı**
sorularını (SCOFF metni/kaynağı/sürümü, destek kaynağı, saklamama, projeksiyon kapı eşikleri) DURUM'a hazırla; kısa özet +
Part 2 prompt'u (M6-part2.md). Session KAPANMAYACAK: döndüğümde Part 1'i aktarırsın (docs/aktarim/M6/).
```
