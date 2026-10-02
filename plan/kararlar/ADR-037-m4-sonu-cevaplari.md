# ADR-037 · M4 sonu: Levent'in cevapları (sorular 33-54)
- **Durum:** KABUL (Levent, 2 Eki 2026 — AskUserQuestion, M4 Part 4 sonu; 48 ve 51 "sen karar ver" → agent, gerekçeyle)
- **Tarih:** 2026-10-02 · **Karar veren:** Levent (sağlık/veri/ürün); 48, 51 ve uygulama ayrıntısı agent

## Bağlam
M4'ün dört part'ındaki incelemelerden ve görevlerden 22 soru birikti (DURUM 33-54): rıza ve silme, yük yuvarlama, ısınma,
rekorlar, tutarlılık sayımı, öğün ve tarif, hatırlatmalar, Health'e yazma, ve üç K1 (test) onayı.

## Kararlar
| # | Konu | Karar | Etki |
|---|---|---|---|
| 33 | Apple Health rızası geri çekilince | **(a)** Okuma durur, sunucudaki Health kaynaklı kayıtlar kalır (saklama dayanağı HEALTH_DATA) | Değişiklik yok |
| 34 | Sağlık rızası geri çekilince açık "yükü tut" | **(a) Geri çekmede biter**, antrenman normal ilerler | İş: K-428 (training) |
| 35 | K1: K-231 test istekleri + K-401/409/402 fikstürleri | **Onay** | Değişiklik yok |
| 36 | Sağlık verisi rıza metni | **(a) Şimdi:** "geri çekince bu veriler silinir" eklenir, sürüm artar (`2-draft`) | İş: K-429 (metin + sunucu sürümü) |
| 37 | Dış antrenmanlar | **(a)** Yalnız aktif enerji | Değişiklik yok |
| 38 | Yuvarlamada büyük sıçrama | **(b)** En yakın ağır yük motor adımının 2 katından uzaksa yük tutulur, **tekrar artırılır** (TÜRETİLMİŞ sınır, `urun`) | İş: K-430 (training + mobil, ortak vakalar) |
| 39 | Setsiz antrenman sayımı | **(a)** Sunucu yalnız çalışma seti olan antrenmanı sayar (tutarlılık + uyum); fikstüre set eklenmesi K1 onaylı | İş: K-431 (decision/training) |
| 40 | Isınma merdiveni (TÜRETİLMİŞ) | **Onay** | Değişiklik yok |
| 41 | Mola haftasında Start | **(a)** Kalsın | Değişiklik yok |
| 42 | K1: Part 2 fikstürleri + "setli bitişte özet açılır" | **Onay** | Değişiklik yok |
| 43 | Hafif yük yoksa ısınma | **(a)** Isınma gösterilmez | Değişiklik yok |
| 44 | İzolasyonda rekor | **(a) Kart:** izolasyonda yük rekoru yok, tekrar/efor rekoru ve kıyas var | Değişiklik yok |
| 45 | Tarif sağlık verisi mi | **(a) Evet** (ADR-034 #5) | Değişiklik yok |
| 46 | Öğün türü varsayılanı | **(a)** 04 / 11 / 16 / 22 | Değişiklik yok |
| 47 | Tarif porsiyonu | **(a)** Kesin pay | Değişiklik yok |
| 48 | Geçmiş seans düzenlenince hedef | **Agent: (b)** programın son bitmiş seansı düzenlenince sonraki hedefler yeniden hesaplanır. Gerekçe: düzenleme veriyi düzeltir, U2 "kararı veri değiştirir"; yanlış veriden türemiş hedefi notla korumak yanlış hedefle antrenman yaptırır | İş: K-432 (training) |
| 49 | Kas haritası figürü | **(b)** Profildeki cinsiyete göre | İş: K-433 (mobil) |
| 50 | Check-in hatırlatma saati | **(a)** 09:00 | Değişiklik yok |
| 51 | Hatırlatmalar nerede önerilir | **Agent: onboarding'in sonunda bir adım** (kendi cümlesi + aç / şimdi değil); Ayarlar bölümü kalır. Gerekçe: I1 C3 — rutin cümlesi onboarding'de kurulur; antrenman saati de orada soruluyor; iOS izni bağlamıyla sorulur | İş: K-434 (mobil) |
| 51b | Mola haftasında antrenman hatırlatması | **Sustur** | İş: K-435 (mobil) |
| 52 | Dinlenme bildirimi | **(a)** Böyle (üç türden sayılmaz, izin varsa, son setten sonra da) | Değişiklik yok |
| 53 | K1: Part 4 app-config beklentisi + fikstürler | **Onay** | Değişiklik yok |
| 54 | Health'e enerji | **(a)** Yazılmaz (U1) | Değişiklik yok |

## Uygulama notu (K-432, 2 Eki)
#48 **hareket başına** uygulandı: bir hareketin hedefi hangi seanstan geldiyse o seansın düzenlenmesi o hedefi yeniden türetir
(`setNext` en yeni kaynağı korur). "Son seans" çoğu zaman aynı şeydir; fark: yeni seans bir hareketi atladıysa o hareketin hedefi
hâlâ eski seanstandır ve eski seansın düzeltmesi onu düzeltir (U2: hedef geldiği veriye bağlı). Kaynağı kalmayan hedef silinir.

## Sonuç
İş doğuran cevaplar backlog'da: K-428 (34), K-429 (36), K-430 (38), K-431 (39), K-432 (48), K-433 (49), K-434 (51), K-435 (51b).
Mobil olanlar M4 kapanışında, backend olanlar M5 Part 1'in başında yapılır (DURUM). Açık soru kalmadı; açık kalan: K-308
cihaz adımları, K-419 klipler, K-313 çizimler.
