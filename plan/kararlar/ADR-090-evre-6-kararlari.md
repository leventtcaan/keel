# ADR-090 · Evre 6 kararları: ABD yemek verisi, öğün hatırlatması, 7 gün, prototipsiz arayüz
- **Durum:** KABUL (Levent, 29 Eki 2026)
- **Tarih:** 2026-10-29 · **Karar veren:** Levent

## Bağlam
Build 8 incelemesi (plan/evre-6-ortalamayi-yakala.md): yemek kaydı ABD kullanıcısı için kullanılamaz (veri Türkiye alt kümesi, birimler
gram), kayıt hatırlatması yok, 7 gün antrenman akışı yok.

## Karar
1. **Yemek verisi:** USDA FoodData Central (kamu malı; temel gıdalar porsiyon ve adet ölçüleriyle, ör. "1 large egg") + markalı ürünler ve
   barkod için Open Food Facts'in ABD alt kümesi (ODbL, ADR-088'deki atıf ve paylaşım düzeniyle). Türkiye alt kümesi kalır. ADR-088'e ek.
2. **Öğün hatırlatması dördüncü tür olur** (ADR-036 #1 ve ADR-089 Ek 2'deki "dördüncü tür yok" bu tür için kalkar): kullanıcının kendi
   yemek saatlerinden öğrenir, günde en çok iki, kapatılabilir, izin yoksa sessiz; Ayarlar metni dört türü söyler.
3. **7 gün antrenman serbest, uyarıyla** (ADR-027 #15'e ek): yedinci gün tek dokunuşla eklenir; ekranda kısa not (bir dinlenme günü gelişimi
   hızlandırır). Motor yükü buna göre okur; `max_training_days` 7.
4. **Arayüzde prototip onayı yok:** agent doğrudan kodlar, simülatörde kanıtlar; Levent TestFlight'ta inceler.
5. **Tek sayı, aralık detayda (U5 değişir):** kayıt ekranlarında tek sayı (aralığın ortası; etiket değeri varsa o), aralık dokununca açılan detayda ve karar ekranında. Hesap ve saklama aralık kalır.

## Sonuç
- ADR-036, ADR-027, ADR-088 bu ADR'ye atıfla güncellenmiş sayılır; ilgili parametreler (`max_training_days`, bildirim türleri) bu kararla değişir.

## Ek 1 · Antrenman günlerinin tek kaynağı program; gün ekleme tek yol; 7 gün (K-1060, #670, agent, teknik; ürün tarafı #3 Levent'in)
- **Sorun (denetim `plan/evre-6-denetim/antrenman.md`):** antrenman günü iki yerde tutuluyordu (profil `schedule.trainingDays`, program günleri) ve birbirini
  dinlemiyordu: hatırlatma eski günde çalıyor, "Rebuild for me" kullanıcının eklediği günü siliyor, 7. gün boş bir "Day 7"di ve `too_many_days` "5 yeter" diyordu.
  Yeni kullanıcıya antrenman hatırlatması hiç kurulmuyordu (`usualTrainingTime` artık sorulmuyor, ADR-072 #4).
- **Karar 1, tek kaynak = program, sunucu yazar:** programın günlerini yazan her yol (`ProgramStore.replace` ve `rewrite`: generate, PUT, PATCH, gün ekle, review
  uygula/geri al, bugünlük olmayan takas) profilin `schedule.trainingDays`'ini programın hafta günleriyle eşler (`Profiles.keepTrainingDays`). **Reddedilen:** profil
  alanını programdan türetmek (profil modülü eğitimi göremez, modül döngüsü; `GET /v1/profile` programı okuyamaz) · yalnız telefonun `keepSchedule`'u programla çağırması
  (sunucu tarafı yedekler, ör. kardiyo ve ilk hafta kararı, yine bayat okurdu). Sözleşme anlamı: `Schedule.trainingDays` programdan sonra programın günleridir
  (açıklama eklendi); hiçbir günü hafta gününde olmayan programda profilin listesi dokunulmadan kalır. Telefonda: tüm program yanıtları tek yerden izlenir
  (`api/programFollower.ts`, her `/v1/program*` yanıtı): kopya, hatırlatmalar (`reminders.keepProgramDays`) ve ekranlar (kaydedilen değişiklik sinyali) buradan güncellenir;
  "Rebuild for me" programın günleriyle kurar.
- **Karar 2, hatırlatma saati:** `usualTrainingTime` yoksa hatırlatma `default_training_time` (18:00, `urun`, ürün sahibinin onayına açık seçim) ile planlanır; kullanıcının
  verdiği saat kazanır. Ayarlar'a saat formu eklenmedi.
- **Karar 3, gün ekleme tek yol:** `POST /v1/program/days` her gün sayısında (şablonu olan N+1, en çok 7) ve her kaynakta çalışır; Train, Edit ve 1. hafta kararı aynı uca gider
  (Train'de görünür "Add a day", hafta gününü tek dokunuşla seçtiren sayfa). İçerik hep üretecin (yeni koçluk kuralı yok, U14). **İki yol, programın ne olduğuna göre**
  (ADR-073 Ek 9'un ölçümü, bkz. `add_day_balanced_days`): şablondan sapmamış üretilmiş program (2 günlük hariç; o adımın dengesi ölçüldü ve 1. hafta çağrısının yoludur)
  N+1 günlük programa **yeniden kurulur**: günler hafta günlerinde ve kimlikleriyle kalır, aynı hareketin satırı, hedefi ve başlangıç ağırlığı taşınır; ekleme geri alınırsa
  program olduğu gibi döner. Kullanıcının değiştirdiği ya da getirdiği programa (ve bugün başlamış bir seans varken her programa) yalnız gün **eklenir**, mevcut günler
  aynen kalır. Gerekçe: yalnız eklemek 3'ten 4'e, 4'ten 5'e, 5'ten 6'ya ardışık aynı bölge ve eksik set verir (Ek 9'un simülasyonu); yeniden kurmak kullanıcının
  düzenlemesini siler, bu yüzden yalnız düzenlenmemiş programda. Ek 9'un "kendi programı 409" kararı kalktı: boş günü elle doldurmak (~10 dokunuş) eksik akıştı; kendi
  programına eklenen gün kullanıcının bölünmesine dokunmaz, yalnız üretecin günüdür ve düzenlenebilir. Geriye uyum: `add_day_from_days` → `add_day_balanced_days` (aynı değer 2).
- **Karar 4, 7 gün (#3 uygulaması):** `max_training_days` 7 (`ProgramRequest.trainingDays` maxItems 7), `data/programs/7-days.yaml` (itiş/çekiş/bacak ×2 + kol ve omuz günü, taslak,
  ürün sahibinin koçluk onayına açık). Program incelemesi kullanıcının seçebileceği gün sayısını (`training_days_free_max` 7) birleştirmeyi **önermez**; Güray'ın 5 günlük
  tavanı (G6 K-36, `training_days_max`) motorda durur ve yalnız bu sayının üstünü işaretler. Yerine Train'de kısa not: `rest_note_above_days` (5) üstünde bir program "A rest day helps
  you grow faster." der. Onboarding'in gün sorusu 2-5 kalır (6, K-1059'da).
- **Etki:** sözleşme (`ProgramRequest` maxItems 7, `/v1/program/days` ve `canAddDay` anlamı, `Schedule.trainingDays` açıklaması); parametreler (`training_days_free_max`,
  `add_day_balanced_days`, `max_training_days`, `rest_note_above_days`, `default_training_time`); veri tabanı ve göç değişmez.
