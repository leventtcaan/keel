# ADR-036 · Bildirimler: yalnız yerel, üç tür, telefonda planlanır
- **Durum:** KABUL (teknik, agent — ADR-019). Ürün tarafı (saat, nerede açılır) soru 50-51'de Levent'e.
- **Tarih:** 2026-10-02 · **Karar veren:** agent · **Görev:** K-410

## Bağlam
04 §7.4 ve I1 F4 üç bildirim türü tanımlıyor, dördüncüsü eklenmez (Levent 29 Eyl: bütçe tür sayısı): antrenmandan
30 dk önce kullanıcının kendi cümlesiyle · Pazartesi sabah check-in · 7 gün sessizlikte tek öz-şefkat mesajı. Profil
(`Schedule`) antrenman günlerini, olağan saati ve check-in gününü tutuyor; rutin cümlesi ve durum modu (K-516, M5) yok.

## Karar
1. **`expo-notifications` 57.x, yalnız yerel bildirim.** Push token istenmez, sunucuya bir şey gitmez (V2'ye dokunmaz,
   backend işi yok). Expo Go'da iOS'ta çalışır (docs v57: Expo Go'dan kalkan yalnız Android'de uzak push).
2. **Plan telefonda, saf fonksiyon** (`src/notifications/plan.ts`): profil programı + cümle + son açılış → en fazla
   7 + 1 + 1 bildirim (iOS'un 64 bekleyen sınırının çok altında). Haftalık tetikleyici telefonun takvimi (1 = Pazar).
3. **Her değişiklik hatırlatmaların hepsini yeniden kurar** (`replace`: önce `reminder:` önekli olanları sil, sonra planı
   kur; başka bildirim — K-411'in dinlenme sayacı — dokunulmaz) ve değişiklikler **sırayla**
   işlenir (tek zincir): yavaş bir telefon eski planı yenisinin üstüne yazamaz; çıkış, yoldaki bir değişiklikten sonra
   da temiz biter. Tetikleyiciler: profil okundu/kaydedildi (`onProfile`, beklenmez — yönlendirme bildirim merkezine
   takılmaz), uygulama öne geldi, cümle değişti, açıldı/kapandı.
4. **Kapalı başlar.** Kullanıcı açınca iOS izni istenir (rozet yok — kırmızı sayı U7'ye aykırı); izin sonra iOS
   Ayarları'ndan kapatılırsa sonraki değişiklik temizler, yeniden verilince geri gelir.
5. **Rutin cümlesi telefonda** (kv), sözleşmeye girmez: kişisel serbest metin, sunucunun işine yaramaz; yeni telefonda
   yeniden yazılır. Boşsa düz bir satır (`reminders.training.body`).
6. **"Sessizlik" = uygulamanın açılmaması** (son ön plana gelme). 7 takvim günü sonrası aynı saatte bir kez; geçmişte
   kalan mesaj yeniden kurulmaz → sessizlik başına bir mesaj.
7. **Durum modu** (`muted`) plan ve serviste hazır, bugün hep `false`: K-516 beyan edilen durumu buraya bağlar.
8. Hepsi hesaba aittir: çıkışta zamanlananlar ve kv anahtarları silinir.
9. Parametreler `data/parameters/notifications.json` (ADR-029); saat 09:00 `urun` (kaynak yalnız "sabah" diyor).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Sunucudan push (APNs) | Token, sunucu zamanlayıcısı, kullanıcı verisinin dışarı çıkışı; üç yerel slot için gereksiz |
| Notifee / react-native-push-notification | Expo birinci taraf modülü SDK'yla birlikte sürümlenir, Expo Go'da yerel bildirim çalışır |
| Değişen bildirimi tek tek güncellemek | Hangi slotun çıktığını izlemek gerekir; "hatırlatmaları sil, planı kur" 9 bildirimde ucuz ve hatasız |
| Cümleyi profile yazmak | Sözleşme + backend + göç; değeri telefonda kullanılıyor |

## Sonuçlar
- Dinlenme sayacının bildirimi (K-411) bu planın parçası değildir ve **üç türden sayılmaz**: kullanıcının seansta
  başlattığı bir sayaçtır, hatırlatma değil. Kendi kimliğiyle (`rest`) zamanlanır ve iptal edilir, hatırlatmaların
  temizliği ona dokunmaz (önek). İzni kendisi istemez (`AlertAccess`'te `request` yok): iOS izni Ayarlar'dan verilmişse
  çalışır, seans ortasında iOS sayfası çıkmaz. Uygulama öndeyken iOS göstermez (ön plan işleyicisi yok); ekrandaki sayaç
  zaten oradadır. Live Activity K-426'ya bölündü (cihaz derlemesi + App Group).
- Mola haftası (ADR-037 › 51b, K-435): `restUntil` sürerken haftalık antrenman hatırlatması kurulmaz (haftalık tetikleyici bir
  haftayı atlayamaz); molanın ardından `rest_resume_weeks` haftanın antrenman günleri **tarihli** kurulur → uygulama açılmasa
  da döner, sonraki açılış haftalığa çevirir. Mola günü programı okuyan iki yerden gelir (Bugün, Antrenman kopyası).
