# M8 · Part 2 — Denetimler ve teslim (session prompt'u)

> Part 1 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M8 iki part hâlinde yapılıyor; bu PART 2 (son). Ortak talimat plan/oturum-promptlari/M8.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md › "## M8 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 1 ÇIKIŞ" git ile doğru mu? Yasal kapının cevapları (hukuki inceleme, URL'ler, App Store Connect beyanları) — eksik olan
   varsa engellemeyen işle devam, sonda sor. Disk (K-807 simülatör ister).

Kapsam, sırayla:
1) K-802 hesap silme + dışa aktarma uçtan uca: tek test, gerçek sunucu (DB, CI'da): bir hesap her modüle veri yazar (envanterdeki her tablo —
   Part 1'in dosyası), siler; sonra hiçbir tabloda o hesabın satırı yok, oturum 401. Dışa aktarma her modülün bölümünü içerir. Telefonda
   silme akışı zaten var (K-309) — testle bağla.
2) K-804 anayasa denetimi CI'da: yasaklı ifade (U4/U6) + hardcode (K2) taraması bugün mobil ve sunucuda ayrı; mağaza metinlerini (App Store
   açıklaması taslağı, `docs/yasal/` metinleri) de kapsasın; tek komut, CI'da kırmızı.
3) K-807 erişilebilirlik: Dynamic Type en büyük boyutta taşma yok, VoiceOver ile ana görevler (kayıt, karar, koç, paywall, ayarlar › abonelik
   iptali); testle denetlenebilen kısım (rol/etiket, `allowFontScaling`) + simülatör kaydı (disk izin verirse; yoksa DURUM'a). App Store
   Accessibility Nutrition Label cevapları gerekçeli taslak.
4) K-805 takibi: mali müşavir görüşü geldi mi; App Store Connect vergi/banka (Levent) — yalnız DURUM'a.

Bitiş:
1) plan/yol-haritasi.md › M8 çıkış kriterlerini tek tek kontrol et, çıktıyla göster; eksikleri DURUM'a yaz.
2) Birikmiş soruları AskUserQuestion ile toplu sor, cevapları ADR'ye işle, kalan uygulanabilir işi bitir.
3) M9 · Beta için part prompt'larını bu yapının kalıbıyla yaz: plan/oturum-promptlari/M9.md + M9-part1.md … (M9 kapıları: VPS ve alan adı —
   para, Levent; TestFlight dış test — Apple incelemesi; beta kohortu başvurusu — kullanıcı verisi, Levent; SANDBOX'ı ortamlardan çıkar).
   Commit.
4) DURUM › M8 ilerleme › "Part 2 ÇIKIŞ = M8 ÇIKIŞ" bloğu; kısa Türkçe özet + M9 Part 1 prompt'u ver.
Session KAPANMAYACAK: döndüğümde Part 2'yi aktarırsın (docs/aktarim/M8/).
```
