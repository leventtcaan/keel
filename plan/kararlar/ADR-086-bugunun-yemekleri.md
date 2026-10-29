# ADR-086 · Bugünün yemekleri: kaydı görme, düzeltme, silme (yeniden yapım Evre 1, K-3; ADR-069 #3'e ek)
- **Durum:** KABUL (agent, yeniden yapım; Levent 29 Eki: ara kapı yok)
- **Tarih:** 2026-10-29 · **Karar veren:** agent

## Bağlam
ADR-069 #3 beslenme sekmesini ana yüzeyden indirdi: öğün "+"tan girilir, kalan bütçe This Week'te tek satır durur. Sekmeyle birlikte günün yemek
listesi (`app/food.tsx`, `MealList` → `/meal?edit=`) de kalktı ve yerine bir şey konmadı. Sonuç (envanter K-3, gerçek sunucuda): kaydedilen yemek
hiçbir yerde görülemez, düzeltilemez, silinemez; yanlış miktar bütçeyi kalıcı bozar. Bu, ADR-069'un amacı (sade yüzey) değil, yan etkisidir.

## Karar
1. "Food left" satırına (This Week) dokunmak **bugünün yemekleri** sayfasını açar: günün öğünleri (`MealList`, mevcut bileşen), her biri dokununca
   `/meal?edit=` ile düzeltilir ve oradan silinir (mevcut düzeltme/silme akışı); üstte kalan bütçe (aralık, U5), altta "Log a meal".
   Satırdaki "Log" düğmesi doğrudan `/meal` açmaya devam eder.
2. Sayfa `food` rotasıdır, sekme değil: ADR-069'un 3 sekme iskeleti değişmez. Emekli listesinden (`navigation/tabs.ts` RETIRED) yalnız `food` çıkar;
   sayfadaki koç girişi, öğün fotoğrafı ve tarif bağlantıları AI kapalıyken görünmez (K-909, ADR-069 #3 aynen).
3. Yemek kaydından sonra This Week'te kısa bir onay + "Undo" (tartı ve kardiyodaki gibi; envanter T-11) — bu paketin değil Evre 2'nin işi.

## Sonuç
- Kayıt düzeltilebilir ve silinebilir; yüzey yine 3 sekme + "+".
- Kanıt: gerçek sunucuya karşı simülatörde yemek kaydı → Food left → liste → düzelt → sil.
