# ADR-022 · Karar sırasının ayrıntısı (ADR-003 §4'ü genişletir)
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-09-29 · **Karar veren:** agent

## Bağlam
ADR-003 §4 sırayı sabitler: güvenlik ağı → veri yeterli mi → yön → görüntü → antrenman → toparlanma → kalori; K-112 kartı
"güvenlik → veri yeterliliği → faz → haftalık omurga → kalori/antrenman". M1'de iki şey eklendi ve sıraya nereye
gireceği ADR'de yoktu: deload merdiveninin iki "antrenman kötü" sinyali (ADR-020 L-12: plan iki hafta kaçtı → tam mola,
kilolar geriliyor → beslenme/uyku) ve plato basamakları (yükü tut, deload; K-110), bir de mini cut (G7 K-102) ve
bakım gözlemi (K-114). Tartı verisi ile set kaydı ayrı veridir: tartı eksikken antrenman kararı verilebilir.

## Karar — `DecisionPipeline.decide`
1. **Güvenlik ağı** (U13) — değişmedi, hep ilk.
2. **Antrenman kötü** (tam mola, beslenme/uyku) — tartı verisinden **önce**. Güray'ın ağacı "antrenman kötü → önce
   antrenmanı düzelt, kalori kararı verme" der (03 §2.4); set kaydı tartı penceresine bağlı değildir.
3. **Henüz değil** — bakım gözlemi (K-114), sonra veri yeterliliği (K-103). Bu hafta bir plato kararı varsa "henüz değil"
   yerine o döner: kilo için erken olması antrenman kararını geciktirmemeli.
4. **Yön** — faz kapısı (K-105), sonra mini cut (G7 K-102).
5. **Haftalık omurga** (K-106) → kalori merdiveni (K-107, BMR = Mifflin K-114).
6. **Sakin hafta** (devam ya da "henüz değil") → plato basamakları. Kalori değişen hafta plato bekler: bir seferde tek
   değişken (K-106 kabul kriteri).
7. Bir kalori kararı plan hedefi ya da (aşağı adımda) profil olmadan istenirse motor çökmez, eksik girdiyi adıyla sorar.

## Neden
Güray'ın "önce antrenman" kuralı ve "tek değişken" kuralı birlikte; tartı ve set verisinin bağımsızlığı; spesifikasyon
WC-16…19, WC-23 bu sırayla yazıldı.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Tüm deload merdiveni kaloriden sonra | Aşırı antrenmanlı kullanıcı, kalori değişen haftada mola yerine kalori alır; Güray'ın "önce antrenman"ına ters |
| Tüm merdiven en başta | Her plato (sık görülür) haftalık kalori kararını bir hafta erteler |
| Veri yeterliliği her şeyi durdursun | İlk 14 günde ya da her kalori değişikliğinden sonra 21 gün boyunca antrenman kararı verilemez |

## Geri dönmenin maliyeti
Düşük: sıra tek sınıfta (`DecisionPipeline`), testleri `DecisionPipelineTests`.

## Etkilenen
`engine/DecisionPipeline.java`, spesifikasyon başlığı, `docs/mimari.md` madde 3.
