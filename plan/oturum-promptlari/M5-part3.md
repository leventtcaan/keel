# M5 · Part 3 — Koç yüzü ve sağlayıcı (session prompt'u)

> Part 2 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır. Part 2 sonunda güncellendi (3 Eki).

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M5 dört part hâlinde yapılıyor; bu PART 3. Ortak talimat plan/oturum-promptlari/M5.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md › "## M5 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 2 ÇIKIŞ" git ile doğru mu (K-430, K-523, K-525, K-526, K-527, K-524, K-503, K-505, K-506, K-508, K-504
   birleşik)? 0a) Disk (5 GB altıysa önce önbellek temizliği).
0b) Levent'in cevapları: soru 74-77 (DURUM). **76 K-509'dan önce şart** — koçun sesi: model serbest cümle mi yazar (bugün:
   ReplyCheck + guards.json, sınırı heldOut ölçümünde) yoksa mesajı sınıflandırıp ürün metni mi seçer? Cevap ADR'ye; (a) ise
   Explanation'ın yapılandırılmış çıktısı (kategori + gerekçe kuralı) ve kopya metinleri K-509'dan önce ayrı görev.
   Sağlayıcı: ADR-041 — gerçek çağrı yok, harcama yok, anahtar yok; tekrar sorma.

Kapsam, sırayla:
1) K-509 koç sohbet ekranı (mobil): POST /v1/coach/messages (cevap: mode, text|copyKey, call) ve POST /v1/meals/parse
   (taslak: aday besinler, confident, tek dokunuş); her cevapta karar kartı (CoachCall); DETERMINISTIC görünür (kota dolunca
   coach.answer.daily_limit); plan değişikliği sohbetten değil, mevcut uygulama akışından (applyCall); o günün verisinden çipler.
2) K-507 gün içi yemek önerileri: kullanıcının yiyebildiklerinden, kalori veritabanından aralıkla, telafi dili yok (U7).
3) K-517 haftalık kısa koç notu: ADR-043'e göre her zaman deterministik şablon (karar başlığı + baştaki kuralın cümlesi + tek odak); sayılar kararla birebir.
4) K-511 sağlayıcı — ADR-041'e göre **belgesel karşılaştırma**: en az üç aday, resmî sayfalardan (K6) sıfır veri saklama +
   eğitimde kullanmama (yoksa elenir), yapılandırılmış çıktı, liste fiyatı; ADR + rıza metni taslağı (V2: sağlayıcı adı +
   veri türleri — bugün kodun istediği adlar `keel.coach.data-types`: "coach question", "meal note"; rıza metni Levent'te).
   Gerçek ölçüm (K-506 seti dahil) yayına çıkarken: ölçüm betiğini hazırla, koşmayı DURUM'a.
5) Kalanlar (Part 2'den): K-528 (yoğun hafta minimum dozu programda), K-522 (kural cümleleri), K-521 (ilk 8 hafta telefonda) —
   sırayla, bağımlılıklarına göre.

Part 2'nin bıraktığı teknik notlar: DURUM › M5 ilerleme › "Part 2 ÇIKIŞ".
Bitiş: DURUM › M5 ilerleme › "Part 3 ÇIKIŞ (tarih)"; backlog + sync; kısa özet + Part 4 prompt'u (M5-part4.md).
Session KAPANMAYACAK: döndüğümde Part 3'ü aktarırsın (docs/aktarim/M5/).
```
