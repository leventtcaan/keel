# ADR-073 · Program: kendi programı, program incelemesi, bugünü ve programı değiştirme, hareket değiştirme
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (tur 3 notu "programımı değerlendirmedi, ikna etmeye çalışmadı"; "dayatma yok, özgürlük";
  prototip onayı); öneren: agent

## Bağlam
Bugün kendi programı yalnız elle girilebiliyor (`PUT /v1/program`, `OwnProgram`). Strong/Hevy içe aktarma yalnız **geçmiş** olarak giriyor
(ADR-053), program olmuyor. Programı Güray kurallarına göre değerlendiren bir motor yeteneği yok: `weekly_sets_per_muscle` ve sıklık parametreleri
yalnız şablon testinde okunuyor (`ProgramTemplateTests`). Hareket kataloğunda `muscles`, `equipment` ve `alternatives` var (`data/exercises/`).
Seansta hareket değiştirme düğmesi yok; bugünü kısaltma, taşıma ve atlama da yok.

## Karar sürücüleri
- Kullanıcı da karar verir: uygulama önerir, dayatmaz (Levent, tur 3).
- Her öneri kaynaklı bir kurala bağlı (U14); arayüzde kişi adı yok, kaynak türü "Coaching rule".
- Telafi yok, aynı hafta içinde taşıma serbest (ADR-071 #3).

## Karar
1. **Kendi programı iki yoldan girer** (`ob-own`): (a) Strong/Hevy içe aktarma: geçmişin yanında son haftalardaki rutinlerden **program
   taslağı** çıkarılır (rutin adı → gün, hareketler, set sayısı, görülen tekrar aralığı, hafta günü düzeni); kullanıcı taslağı görür ve onaylar.
   Katalogda eşleşmeyen hareket kendi hareketi olur (`OwnMoveForm` kalıbı). (b) Elle girme (bugünkü `OwnProgram`).
2. **Program incelemesi** motorda saf bir kuraldır (`kural-ekle`). Girdi program, çıktı en çok `review_max_suggestions` (3) öneri, öncelik
   sırasıyla:
   - **Gün sayısı > 5** → 5'e indir (G6 K-36 "6-7 önerilmez", G2 K-36, G7 K-79).
   - **Kas başına haftalık set > 15** → 12'ye kırp (G1 K-11: üst sınır seviyeye göre 12-15).
   - **Kas başına haftalık set < 4** (kolda < 6) → alt sınıra tamamla, katalogdan o kasın izolasyon hareketiyle (G1 K-11, K-61).
   - **Kas başına haftada 1 kez** (set ≥ 4 iken) → iki güne böl (G1 K-22).
   - **Tekrar aralığı K-21 dışında** → bileşikte 6-10, izolasyonda 8-12 (mevcut parametreler).
   Set sayımı birincil kasa göre (şablon testleriyle aynı). Her öneri somut bir değişiklik taşır ("diff"); uygulanınca inceleme yeniden koşar
   ve o bulgu kalkar. Öneri bulunamayan bulgu gösterilmez.
3. **Kullanıcı seçer:** her öneri aç/kapa; "Use mine with N changes" ya da "Keep mine as is". Hangisi seçilirse seçilsin pazartesi kararları
   çalışır. Uygulanan değişiklikler Antrenman sekmesinde "N changes applied · Undo" ile geri alınır.
4. **Programı düzenle** (Antrenman › Edit): günler (seç, taşı; seanslar yeniden yerleşir), hareketler (ekle, çıkar, değiştir; kas aralık dışına
   düşerse inceleme işaretler), kardiyo (ADR-074), split (full body / upper-lower / push-pull-legs; inceleme yeniden koşar), "Rebuild for me"
   (bugünkü üreteç). Program kaynağı `GENERATED`/`OWN` korunur; düzenlenen üretilmiş program `OWN` olmaz, değişiklik kaydı tutulur.
5. **Bugünü değiştir** (Antrenman › Change):
   - **Short on time:** programdaki sıraya göre ilk `short_session_moves` (3) hareket; seans haftayı sayar. Ürün kararı (`tag: urun`).
   - **Gym is busy:** hareket değiştir (madde 6).
   - **Move it:** yarına taşı; aynı haftanın içinde kalır (pazar sınırını geçmez). Telafi değil, taşıma (ADR-071 #3).
   - **Skip today:** "No catch-up. Monday reads what happened." Kaçan seans eklenmez; tutarlılık olduğu gibi sayar.
6. **Hareket değiştir:** seçenekler katalogdaki `alternatives`, aynı kas ve kullanıcının salonundaki ekipmanla süzülür (ADR-032). Seansta
   değiştirme yalnız o seans içindir; Antrenman sekmesinden değiştirmede "Today only / From now on" sorulur. Değiştirilen hareketin kendi
   geçmişi ve hedefi vardır (çift ilerleme hareket başına).

## Neden
Kendi programı olan tecrübeli kullanıcı, programı değerlendirilmeden reddedildiğini hissediyor (Levent, tur 3). İnceleme Güray'ın 2026
hacim, sıklık ve tekrar kurallarını kullanıcının kendi programına uygulayıp ikna eder ama zorlamaz. Bu, U2'nin ruhuyla tutarlı: öneri veriye
dayanır, ısrar etmez. Bugünü değiştirme seçenekleri kategorinin normu (Fitbod, Hevy) ve "dayatma yok" ilkesi.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Kendi programını olduğu gibi almak, inceleme yok | Tur 3'ün ana eleştirisi |
| İncelemeyi zorunlu uygulamak | Dayatma; kullanıcı kaçar |
| Prototipteki "hamstring 4 set aralığın altında" | Yanlış: G1 K-11 alt sınırı 4; işaret < 4'te |
| İçe aktarmayı yalnız geçmiş bırakmak | Kendi programı olanı elle 21 hareket girmeye zorlar |

## Sonuçlar
- Olumlu: tecrübeli kullanıcı için giriş kapısı; motorun hacim parametreleri ilk kez çalışma zamanında kullanılır.
- Olumsuz: içe aktarmadan program çıkarmak sezgiseldir (rutin adı olmayan geçmişte zayıf); taslak onayı bu yüzden zorunlu.

## Geri dönmenin maliyeti
Orta: yeni motor kuralı, iki uç (inceleme, öneri uygulama), içe aktarma genişlemesi.

## Etkilenen
`backend` engine (yeni `ProgramReview`), training (öneri uygulama, değişiklik kaydı, geri alma), import (program taslağı), `contracts/openapi.yaml`
(review, apply, undo, swap kapsamı, today change), `data/parameters/training.yaml` (`review_max_suggestions`, `weekly_sets_trim_to`,
`training_days_max`, `short_session_moves`), mobil Antrenman sekmesi, `ob-own`, `ob-review`, ADR-053, ADR-032.

## Doğrulama
`ProgramReview` tablo testleri (her kuralın eşiğinin altı, kendisi, üstü; öncelik ve en çok 3 öneri) + özellik testi (öneri uygulanınca aynı
bulgu tekrar çıkmaz; determinizm) · içe aktarma testi: rutinli Strong dosyasından taslak program · taşıma testi: pazar sınırı · değiştirme
testi: seçenekler salon ekipmanıyla süzülür.
