# M7 · Part 1 — Yetki sunucuda (session prompt'u)

> M6 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M7 iki part hâlinde yapılıyor; bu PART 1. Ortak talimat plan/oturum-promptlari/M7.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md'de (Part 1'de "## M6 ilerleme › Part 4 ÇIKIŞ = M6 ÇIKIŞ"; bu part "## M7 ilerleme"yi açar);
sohbete güvenme, git ile doğrula. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: M6 ÇIKIŞ git ile doğru mu (Part 4 PR'ları birleşik, açık PR/worktree yok)? "M7'nin bilmesi gerekenler"i oku. DURUM'a
   "## M7 ilerleme" bölümünü aç (M6'daki tablo biçimi). Disk; K-308 durumu.
0a) Para/mağaza kapısı (M7.md › Dış kapılar): AskUserQuestion ile toplu sor — RevenueCat hesabı/projesi hazır mı, App Store Connect
   abonelik grubu + ürün kimlikleri + 7 gün deneme hazır mı, Paid Applications sözleşmesi, sandbox test hesabı, RevenueCat'e giden tek
   alanın opak uygulama kullanıcı kimliği olması (veri dışarı → ADR-012 eki). Cevaplar ADR-012'ye ek; hazır olmayan değer yapılandırmadan
   okunur, kod beklemeden yazılır. M6 sonundan açık kalan sorular varsa onlar da.

Kapsam, sırayla:
1) K-701 RevenueCat webhook ve yetki (subscription modülü): webhook kimlik doğrulaması (RevenueCat'in yetki başlığı — biçimi resmî
   dokümandan, sır ortam değişkeninden, sabit zamanlı karşılaştırma), olay → abonelik durumu (deneme, aktif, iptal edildi ama süresi
   bitmedi, süresi doldu, duraklatıldı, iade) — durum makinesi saf ve özellik testli; aynı olay iki kez gelirse bir kez işlenir (olay
   kimliği); sıra dışı gelen olay geri götürmez (olay zamanı). Yetki sorgusu diğer modüllere API (`Entitlements.active(account, now)`).
   Göç (`subscription` şeması). Hesap silinince abonelik kaydı da (K-214 kalıbı) + dışa aktarmada.
2) K-703 premium uçlarda yetki: koç (K-505/K-508) ve fotoğraf analizi (K-514) yetki ister; kayıt, karar kartı, temel görünüm çalışır
   (deterministik mod); yetkisiz cevap kodu sözleşmede (ör. ENTITLEMENT_REQUIRED) — sözleşme önce. Kota (ADR-012, quota.yaml) yetkiyle
   birlikte: kota bitince yine deterministik mod, "kredi" kelimesi yok.

Bitiş: DURUM › M7 ilerleme › "Part 1 ÇIKIŞ (tarih)"; backlog status + sync; kısa özet + Part 2 prompt'u (M7-part2.md, gerekirse
güncelle). Session KAPANMAYACAK: döndüğümde Part 1'i aktarırsın (docs/aktarim/M7/).
```
