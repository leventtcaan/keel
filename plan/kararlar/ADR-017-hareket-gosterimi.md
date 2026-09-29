# ADR-017 · Hareket gösterimi: kendi çekimler, ilk tekrar / son tekrar
- **Durum:** KABUL (yaklaşım) · bağımlılıklar görev anında onaylanır (K5)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Levent ADR incelemesinde hareket gösteriminin eksik olduğunu buldu. Sektörün üst segmenti gerçek insan videosuna geçmiş
(MacroFactor/Nippard 638, Alpha Progression 795 kendi çekimi). Hazır kaynakların lisansı sorunlu: free-exercise-db görsellerinin
kaynağı belirsiz; wger share-alike; ExerciseDB ücretsiz katmanı ticari kullanımı yasaklıyor; MuscleWiki offline saklamayı
yasaklıyor. **AI ile üretilmiş egzersiz videosu** göze gerçekçi ama eklem açıları anatomik olarak hatalı çıkabiliyor
(Stanford HumanScore, Nisan 2026). Kaynak: `arastirma/ham/L1-egzersiz-gosterimi.md`.

## Karar
- **Levent kendi çeker:** iPhone, salonda, yüz kadrajda değil, sessiz 3-5 sn döngü. Varsayılan programın hareketleri +
  alternatifler, ~30-40 hareket. Uygulamaya gömülü, internetsiz (~19 MB).
- **Her harekete iki klip: ilk tekrar ve son tekrar (RIR ~1).** Son tekrardaki istemsiz yavaşlama görünür (Güray G1 K-8).
- **İpucu katmanı Güray'dan:** tam ROM (sırt istisnası), kontrollü negatif / patlayıcı pozitif, son tekrar kendiliğinden yavaşlar.
  Saniye cinsinden tempo yok (Güray tempo sayısı vermiyor).
- **Kurulum kartı:** koltuk, ped, tutuş notu cihazda saklanır, hareket açılınca ilk görünür (Güray standardizasyon kuralı).
- **Kas haritası:** MIT lisanslı bileşen.
- **AI üretimi egzersiz görseli/videosu kullanılmaz.**
- **Form kontrolü:** uzman Levent. Her klip `docs/hareket-cekim-kontrol-listesi.md`'den geçer (Güray ipuçlarına göre).
- Hukuki: salondan çekim izni; kadrajda başka üye yok; başka biri oynarsa yazılı model izni.

## Neden
Sıfır bütçede tek temiz lisans yolu; Güray'ın standardı hazır kütüphanede yok; hareketli gösterim statik görselden güçlü
(meta-analiz d=1,06); "son tekrar" klibi insanların kalan tekrarı ~1 eksik tahmin etme hatasını hedefliyor; çekimler kanala
malzeme olur.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| MoveKit (~$299, 3D manken) | Bütçe; "son tekrar" ayrışması yapılamaz — yedek (Plan B) |
| ExerciseDB / MuscleWiki / free-exercise-db / wger | Lisans ya da offline kısıtı (yukarıda) |
| AI ile üretilmiş video | Biyomekanik hata riski, "AI slop" algısı |

## Geri dönmenin maliyeti
Düşük (katalog verisi medya kaynağından bağımsız).

## Etkilenen
`training` (egzersiz kataloğu), mobil egzersiz ekranı, `data/exercises/`.

## Doğrulama
Her katalog hareketinin iki klibi ve kontrol listesi kaydı var (katalog testi).
Önerilen bağımlılıklar (npm'de doğrulandı, MIT): `expo-video` 57.0.5, `react-native-body-highlighter` 3.2.0.
