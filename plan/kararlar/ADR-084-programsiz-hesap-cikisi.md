# ADR-084 · Programsız hesabın çıkışı: "Build my program" (yeniden yapım Evre 1, K-1 + K-2)
- **Durum:** KABUL (agent, yeniden yapım; Levent 29 Eki: ara kapı yok, tasarım ve kapsam kararını agent verir)
- **Tarih:** 2026-10-29 · **Karar veren:** agent

## Bağlam
Envanter (`plan/envanter-2026-10-29.md` K-1, K-2; denetim A1, A2), gerçek sunucuda doğrulandı: profili olan ama programı olmayan hesap
(`GET /v1/program` 404) uygulamada program yaptıramaz. Train yalnız "No program yet." der, This Week'te antrenman kartı çıkmaz, "+" › Workout
Train'e atar, Ayarlar › Training days ve Cardio yalnız "Back" düğmeli boş sayfa açar. Program yaptırmanın tek yolu onboarding'dir; profili olan
hesap da onboarding'i bir daha görmez (`profileStatus.ts`: profil 200 + açık işaret yok = done). Bu duruma üç yol düşürür: hazırlıkta hata
→ çıkış → yeniden giriş; uygulamayı silip kurmak; eski derlemelerde Apple Health adımı. Üretimde bu durumda hesap var (Levent'in hesabı).

Seçenekler:
1. Açılışta program yoksa onboarding'in hazırlığını yeniden koşmak (denetimin önerisi). Hazırlık taslaktaki gün seçimiyle program kurar; taslak
   telefonda tutulur ve çıkış ya da yeniden kurulumla kaybolur. Kayıp taslakla hazırlık ne kuracağını bilmez: soruyu yine sormak gerekir.
2. Programın görüneceği her yerde tek bir çıkış: "Build my program" → tek soru (kaç gün) → program. Onboarding'e dokunmaz, taslağa dayanmaz.

## Karar
1. **Seçenek 2.** Yeni ekran `/build-program`: onboarding'in gün sorusunun aynısı (2-5 gün kutuları, aynı metin ve bileşen;
   gün yerleşimi `defaultTrainingDays`), seçince `POST /v1/program/generate` (`trainingDays`) → başarıda Train sekmesi. Başlangıç ağırlığı
   sorulmaz: ilk seans bulur ("Session 1 finds your weights", ADR-072 #5'in yolu). Hata: bağlantı yok ile sunucu hatası ayrı metin, yeniden dene.
2. **Çıkışın göründüğü yerler** (program 404 iken): Train boş durumu (başlık + bir satır açıklama + birincil "Build my program"); This Week'te
   antrenman kartının yeri (aynı düğme); Ayarlar › Training days / Cardio (`/edit-program`) boş sayfa yerine aynı çıkış. "+" › Workout zaten
   Train'e gider; orada çıkış vardır.
3. **K-2 bu çıkışla kapanır:** profili olup programı olmayan hesap girişte sekmelere gelir ve çıkışı ilk ekranda (This Week) görür. Onboarding
   yeniden açılmaz (profil cevaplarını yeniden sormak gereksiz ve U2'nin "ısrar" kokusunu taşır).
4. Kendi programını getirmek (ADR-073) bu ekranın işi değildir: Ayarlar › Import workouts ve Edit program yolu kalır.
5. Prototip (`prototip/yeni-yuz.html`) Train boş durumu ve `/build-program` ile güncellenir; görsel dil Evre 2'nin düğme sistemine uyar.

## Sonuç
- Programsız hesap hiçbir ekranda çıkmaza girmez; üretimdeki etkilenen hesaplar güncellemeyle kendiliğinden çıkış bulur.
- Sunucu değişmez (uç ve sözleşme var). Kanıt: gerçek sunucuya karşı simülatörde programsız hesap → Build my program → Train'de program.
