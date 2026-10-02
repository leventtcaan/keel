# M4 · Part 3 — devam (compact sonrası)

> **BİTTİ (2 Eki gece):** aşağıdaki adımların hepsi uygulandı; Part 3 ÇIKIŞ `DURUM.md › ## M4 ilerleme`'de. Bu dosya
> yalnız tarihçe — Part 4 bunu yarım iş sayıp uygulamaz.

> Hafıza DURUM.md › M4 ilerleme › Part 3 tablosu + ▶ DEVAM NOKTASI. Sohbete güvenme; git ile doğrula.

## Neredeyiz (2 Eki akşam)
- **Bitti, birleşti:** K-407 (#236, #237, #240, #241; +#238 test yardımcısı), K-413 (#239), K-424 (#244),
  K-416 1/3 geçmiş seansı düzenle (#245).
- **Yarım:** K-416 2/3 dal `mobile/113-add-moves` (commit 5fb1341, push'lu, **PR yok, inceleme yok**):
  - `train/workout.ts` `extraPlan` (plan dışı hareket: yapılan setler + bir açık satır; öneri bu seanstan/geçen seferden,
    yoksa yük/tekrar null — uydurma yok), `train/moves.ts` `findMoves` (ad + takma ad, `move_search_results`),
    `app/workout.tsx` "Add a move" paneli, `SetRow.suggested.reps: number | null`, `TextField` boş sayı alanında soluk "–"
    (prototip `.fv.ghost`; kartta boş alan görünmüyordu).
  - Testler yeşil (1125/1125). Simülatörde görüldü: arama canlı süzüyor, eklenen hareket listede seçili.
  - **Eksik:** panelin "Kapat" düğmesi yok (seçmeden kapanmıyor) → test önce ekle. Sonra mutasyon + code-reviewer +
    pr-test-analyzer, bulgular TDD, PR `--auto --squash`. Önce dalı güncelle: `git rebase origin/main` (#245 birleşti;
    en.json çakışırsa iki tarafın anahtarlarını da tut).

## Sıradaki adımlar (sırayla)
1. K-416 2/3'ü bitir (yukarıdaki eksik + inceleme + PR).
2. **K-416 2b — kendi hareketi** (sunucu K-424'te hazır: `GET/POST /v1/custom-exercises`, kimlik `custom:<uuid>`):
   - `train/trainData.ts`: kullanıcının hareketleri de çevrimdışı kopyada (`train.customs`), `forget`'te silinir.
   - Adlar her yerde: `exerciseName` kimliği döndürüyor (`custom:…` görünür) → kendi hareketinin adı (workout, FinishForm,
     özet, geçmiş, düzenleme ekranı). Düzenleme ekranı `order` kendi hareketini katalogda bulamayıp gizliyor (inceleme notu).
   - "Add a move" panelinde katalogda yoksa "Kendi hareketini oluştur": ad + bileşik/izole + yük modeli + ekipman
     (bodyweight ⇔ bodyweight yük) + tek taraf; **önce katalog eşleşmeleri öner** (kabul kriteri); oluşturma çevrimiçi.
3. **K-416 3/3 — süperset:** seansta iki hareketi bağla, setler aynı `supersetId` (telefon üretir) taşısın, set sonrası
   eşe geç; geçmişte gruplu göster. Sonra K-416 aktarım dosyası (`docs/aktarim/M4/K-416.md`, README 17) + backlog done.
4. **K-418 hareket gösterimi** (ADR-017): `expo-video` + `react-native-body-highlighter` (K5: PR'da gerekçe; ADR-017'de
   önerilen sürümler, `npx expo install` ile doğrula). İki klip yan yana döngü/sessiz/internetsiz, Güray ipuçları + kurulum
   kartı (cihazda saklanır), kas haritası. **Klip yok** (40 hareketin hepsi `review: pending`, 80 klip eksik) → yer tutucu.
5. K-419 (Levent'in işi) eksik listesi: 40 hareket × 2 klip (`docs/hareket-cekim-kontrol-listesi.md`); `tools/` ffmpeg
   kesim betiği kabul kriterinde — teknik, yazılabilir.
6. K-423 (tarifler telefonda) Part 3 kapsamında değil; zaman kalırsa ya da Part 4'e.
7. Part 3 ÇIKIŞ (DURUM), backlog sync, `M4-part4.md` güncelle, kısa özet. **Aktarıma başlama**; Levent dönünce Part 3
   aktarımı (README 14-17+).

## Bilmen gerekenler (bu part'ın dersleri)
- Simülatör: Expo Go + geçici kök yaması (`_layout.tsx` guard'ları true/false; **commit'ten önce geri al**, yedeği
  scratchpad'te tut) + fikstür sunucusu `plan/oturum-promptlari/fixture-m4p3.js` (`node … &`, port 8099;
  `EXPO_PUBLIC_API_URL=http://127.0.0.1:8099 npx expo start --go --port 8081 --clear`). `data/*.json` değişince Metro
  `--clear` ile yeniden başlat, Expo Go'yu `xcrun simctl terminate booted host.exp.Exponent` ile kapat-aç.
  Eski açık antrenmanlar kalırsa Ayarlar › Sign out telefondaki kayıtları temizler. Simülatör klavyesi Türkçe: "i" → "ı".
- `copy-literals` testi koşullu JSX içindeki dizgileri (`variant="ghost"`) metin sanar → koşullu parçayı sabite çıkar.
- React derleyicisi: etkide `setState` yasak (başlangıç durumunda hesapla / okumaya bağla); `map` içinde ref okuyan
  işleve kapanış verme → işlevi dışarıda tanımla, bileşen kendi argümanıyla çağırsın.
- RNTL v14: `fireEvent` async (`await`); "aynı anda iki basış" testi: `props.onClick` iki kez tek `act` içinde.
- Sözleşmeyi her düzenlemeden sonra tipleri yeniden üret (`contracts/node_modules/.bin/openapi-typescript … --check`).
- DB testleri CI'da; RED'i ayrı commit'le CI'da göster. Saf backend testleri: Postgres/SpringBootTest içermeyen sınıflar
  (`${=ARGS}` zsh'de).
- `gh pr edit` "Projects classic" hatası veriyor → gövde için `gh api -X PATCH repos/leventtcaan/keel/pulls/N -F body=@dosya`.
- Squash'lı yerel dallar kalsın (zorla dal silme kancada yasak; komut metninde o ifadeyi geçirme, kanca yakalar).
- İkinci çalışma ağacı `../keel-main` (backend + DURUM işleri için); `main` ana ağaçta checkout'luyken orada dal aç.
- Disk: 6 GB civarı; Levent'in onayıyla önbellekler temizlendi (2 Eki).
