# ADR-035 · Süperset ve kullanıcının kendi hareketi
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-10-02 · **Karar veren:** agent

## Bağlam
K-416 (L3 §1 #7, #10, #11, masa bahsi; L3 §7 #17 "mobile + training · L (bölünür)") sunucuda iki şey ister: art arda
yapılan hareketlerin setlerini birlikte göstermek (süperset) ve katalogda olmayan bir hareketi kaydetmek. Bugün set
`exerciseId`'si yalnız katalogdan (`ExerciseCatalog`, `data/exercises/`); motorun okuduğu yük modeli, bileşik/izole,
ekipman ve tek taraf katalogdan gelir (`SetRules`, `TrainingLog`). Program yalnız katalog hareketlerinden (K-211).

## Karar
1. **Süperset = setin üstünde bir kimlik:** `NewSet.supersetId` (isteğe bağlı uuid, telefon üretir). Aynı süpersetin
   setleri aynı kimliği taşır; başka hiçbir şey değişmez (her set yine kendi hareketinin seti; motor süperseti bilmez).
   Ayrı "süperset" kaydı yok: grup setlerden türetilir (K-405 kalıbı), çevrimdışı kuyruk değişmez.
2. **Kullanıcının kendi hareketi** `training.custom_exercise`: ad + **motorun ihtiyacı olan sınıflama kullanıcıya
   sorulur** (L3 §1 #10): bileşik/izole, yük modeli, ekipman, tek taraf. Kimliği `custom:<uuid>`; set onu bu kimlikle
   anar, yalnız sahibi. Set kuralları katalog hareketindeki gibi uygulanır (`SetRules`).
3. **Program katalogdan kalır:** üretici ve kullanıcının programı kendi hareketi almaz (ilerleme kuralları, alternatifler
   ve ısınma kaynaklı katalog verisine dayanır). Kendi hareketi seansta eklenen ya da değiştirilen hareket olarak yaşar;
   motorun haftalık okumaları program hareketleriyle sınırlı olduğundan onu görmez. Bitişte "form temiz değildi"
   listesinde kabul edilir, etkisi yoktur (tutulacak hedefi yok; inceleme: reddedilen bitiş kuyrukta kalırdı).
4. **Silme ve düzenleme yok (sürüm 1):** setler hareketi anıyor; silmek geçmişi adsız bırakırdı. Yanlış ad: yeni hareket.
   Kullanıcı başına en çok 100 (`keel.training.custom-exercise.max-count`), ad en çok 60 kod noktası.
5. **Antrenman verisi:** rıza istemez (ADR-026: antrenman V3'ün sağlık listesinde değil), dışa aktarımda var, hesap
   silinince gider.

## Neden
Süperset için ayrı tablo, sıralı grup üyeliği ve grup düzenleme demek olurdu; setin üstündeki tek kimlik geçmişi
gruplamaya yeter ve kuyruk/kimlik modelini (ADR-024) değiştirmez. Kendi hareketinin sınıflamasını sormak, motorun
"sayı uydurmaz" kuralını korur: yük modeli bilinmeyen bir set okunamaz.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Süperset kaydı (grup tablosu, sıra) | Çevrimdışı kuyrukta ikinci bir kayıt türü ve sıra çatışması; görünen fayda aynı |
| Kendi hareketi yalnız adla (sınıflamasız) | Set kuralları ve ilerleme yük modeline dayanır; tahmin etmek U1'e aykırı |
| Kendi hareketi programda | Alternatif/ısınma/ilerleme verisi yok; kaynaksız kural olurdu (U14) |
| Katalog önerisini sunucuda | Katalog adları ve takma adları telefonda (`data/copy/en.json`); öneri telefonda yapılır (K-416) |

## Geri dönmenin maliyeti
Düşük: bir sütun, bir tablo, iki uç nokta.

## Etkilenen
`training` (WorkoutController, WorkoutStore, CustomExerciseStore, TrainingAccountData, V23), `contracts/openapi.yaml`,
mobil K-416.

## Doğrulama
CustomExerciseTests, SupersetTests; gizlilik testleri (`AccountFixture`).
