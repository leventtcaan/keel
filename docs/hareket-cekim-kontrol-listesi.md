# Hareket çekim kontrol listesi

> ADR-017. Klipleri Levent çeker ve denetler; bu liste o denetimin yapılandırılmış hali. Her klip yayına girmeden önce
> bu listeden geçer ve sonuç `data/exercises/<hareket>.yaml` içindeki `review:` alanına yazılır.
> Kaynak: `arastirma/ham/guray/G1-antrenman.md` (kural numaraları aşağıda).

## Her iki klip için
- [ ] **Tam hareket açıklığı** (K-50). İstisna yalnız sırt hareketleri (K-56); orada son tekrarların kısmi olması kabul.
- [ ] **Tempo:** kontrollü negatif, patlayıcı pozitif (K-45). Kasıtlı yavaş negatif yok.
- [ ] **Kurulum görünür:** koltuk, ped, tutuş, ayak yeri kadrajda seçilebiliyor (K-38 standardizasyon — kurulum kartına yazılacak).
- [ ] Cheat rep yok (K-47). Sırt hareketinde bilinçli kullanılıyorsa ayrı klip ve açık etiket.
- [ ] Yük kontrolsüz düşmüyor, ağırlık yığını çarpmıyor.

## "Son tekrar" klibi (RIR ~1)
- [ ] **İstemsiz yavaşlama görünüyor** (K-8): son tekrarın konsantrik kısmı ilk tekrardan belirgin yavaş, ama form bozulmuyor.
- [ ] Tükeniş ötesine geçilmiyor: zorla tekrar, drop set, yarım tekrar serisi yok (K-7).
- [ ] İlk tekrar klibiyle aynı açı, aynı ağırlık, aynı kurulum (yan yana izlenecek).

## Çekim
- [ ] Yüz kadrajda değil; kadrajda başka üye yok (yüz kişisel veri).
- [ ] Salonun çekim izni alındı.
- [ ] Yatay değil dikey, 3-5 sn, sessiz, sabit telefon (tripod ya da sabit yüzey), iyi ışık.
- [ ] Başka biri oynuyorsa yazılı model izni.

## Kayıt
`review: {date: "YYYY-AA-GG", by: levent, checklist: pass, notes: "..."}` — tarih **tırnak içinde** (tırnaksız YAML tarihi
gevşek okunur: 2026-02-30 → 2 Mart; uygulama tırnaksızı reddeder). Çekilmemiş hareket: `review: pending`.

## Kesim ve eksik listesi (K-419)
- Kes: `python3 tools/clip.py cut <ham.mov> <hareket> <first|last> --start 12.4 --end 16.1` — 3-5 sn, sessiz, dikey 960 px,
  H.264, hızlı başlar; YAML'daki yola yazar, ~240 KB bütçeyi aşarsa söyler.
- Ne kaldı: `python3 tools/clip.py missing` — çekilmemiş klipler ve denetimi geçmemiş hareketler.
