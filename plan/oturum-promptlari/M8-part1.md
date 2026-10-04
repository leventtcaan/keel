# M8 · Part 1 — Metinler ve envanter (session prompt'u)

> M7 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M8 iki part hâlinde yapılıyor; bu PART 1. Ortak talimat plan/oturum-promptlari/M8.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md'de (Part 1'de "## M7 ilerleme › Part 2 ÇIKIŞ = M7 ÇIKIŞ"; bu part "## M8 ilerleme"yi açar);
sohbete güvenme, git ile doğrula. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: M7 ÇIKIŞ git ile doğru mu (K-705 #368, K-702 birleşik; açık PR/worktree yok)? "M8'in bilmesi gerekenler"i oku. DURUM'a
   "## M8 ilerleme" bölümünü aç (M7'deki tablo biçimi). Disk; K-308 durumu.
0a) Yasal/mağaza kapısı (M8.md › Dış kapılar): AskUserQuestion ile toplu sor — hukuki inceleme kimde (Levent mi, avukat mı, ne zaman);
   metinlerin geçici yayın yeri (GitHub Pages? başka?); App Store Connect beyanlarını Levent mi girer; mali müşavir randevusu (K-805);
   soru 57 (rıza metinleri hukuki bakış). Cevaplar ADR'ye (yeni ADR, "M8 başı cevapları"); hazır olmayan iş taslak olarak ilerler.

Kapsam, sırayla:
1) Veri envanteri (K-801/K-803'ün temeli): koddan türet — her modülün sakladığı tablo/alan, amacı, saklama süresi (silme: K-214, ADR-030),
   dışarı giden akışlar (RevenueCat: opak kimlik + SDK verisi, ADR-012 Ek 1; AI sağlayıcısı: rıza + veri türü, ADR-007/044; Apple ile giriş;
   HealthKit cihazda; fotoğraf cihazda V1). Makine okunur dosya (ör. `docs/yasal/veri-envanteri.yaml`) + test: göçlerdeki her tablo envanterde,
   envanterdeki her tablo göçlerde (ADR ile; biçim senin kararın).
2) K-801 taslakları (`docs/yasal/`): gizlilik politikası (envanterden; GDPR şeffaflık maddeleri resmî metinden doğrulanmış), kullanım şartları
   (abonelik: otomatik yenileme, iptal, iade Apple'da — ADR-012/057), sağlık feragatnamesi ("not a medical device…" ilk paragrafta, U6).
   Yasaklı ifade taraması bu metinlere de uygulanır. Hepsi "taslak — hukuki inceleme bekliyor".
3) K-806 AI sağlayıcısının saklama/eğitim şartları: ADR-044'teki adaylar için resmî politika metni (bağlantı + tarih); gizlilik politikasına
   madde. Sağlayıcı seçilmediyse (K-533, M10) koşullu yaz ve DURUM'a.
4) K-803 gizlilik etiketi + yaş derecelendirmesi: Apple'ın App Privacy kategorilerine (resmî sayfadan) envanteri eşle; yaş anketi cevapları
   gerekçeli; erişilebilirlik etiketi K-807'de. Hepsi Levent'in App Store Connect'e gireceği taslak.
5) Paywall'ın Terms/Privacy bağlantıları (ADR-057 D3): URL kararı (0a) → yapılandırma; yoksa DURUM'a (satın alma bağlantısız açılmaz).

Bitiş: DURUM › M8 ilerleme › "Part 1 ÇIKIŞ (tarih)"; backlog status + sync; kısa özet + Part 2 prompt'u (M8-part2.md, gerekirse
güncelle). Session KAPANMAYACAK: döndüğümde Part 1'i aktarırsın (docs/aktarim/M8/).
```
