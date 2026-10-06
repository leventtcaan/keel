# M9 Part 2 · Cihaz kontrol listesi (TestFlight derlemesi, gerçek sunucu)

> Levent iPhone'da yürür, agent simülatörde ve kayıtta. Her madde: **sonuç** (✅ / ❌ + ne oldu / — kapsam dışı) ve ekran görüntüsü
> `docs/aktarim/M9/img/<madde>.png` (iPhone'dan AirDrop → Mac İndirilenler; agent taşır ve adlandırır). Sıra önemli: **hesap silme en sonda.**
> Derleme: TestFlight `1.0.0 (n)` · sunucu `https://keel-beta.duckdns.org` (`prod`: koç AI kapalı, SANDBOX sayılır).

| # | Madde | Ne yap | Ne görmelisin | Sonuç | Görüntü |
|---|---|---|---|---|---|
| 0 | Kurulum | TestFlight'tan kur, aç | Açılış ekranı, çökme yok | | `0-acilis` |
| 1 | Apple ile giriş (K-308, K-305) | "Sign in with Apple" | Apple sayfası → onboarding (sunucu hesabı açtı) | | `1-giris` |
| 2 | HealthKit izni + okuma (K-308, K-403) | Onboarding › Apple Health › Connect | Apple'ın izin sayfası, metin `permissions.healthRead`; izin sonrası Health'teki kilo/adım görünüyor | | `2-health-izin` |
| 3 | Abonelik kapısı | Onboarding sonu | RevenueCat anahtarı yok → kapı açık, sekmelere geçiliyor (ADR-058 #107) | | `3-kapi` |
| 4 | Kayıt → sunucu | Today › tartı kaydı; bir set | Kaydedildi; uçak modunda kayıt kuyruğa, açınca gidiyor | | `4-kayit` |
| 5 | HealthKit yazma (K-412) | Ayarlar › Health'e yazma anahtarı → izin → tartı kaydı | Kayıt Sağlık uygulamasında | | `5-health-yaz` |
| 6 | Kamera: barkod (K-407) | Öğün › barkod, bir ürün | Kamera izni (metin `permissions.camera`) → ürün bulundu | | `6-barkod` |
| 7 | Kamera: öğün fotoğrafı (K-408) | Öğün › fotoğraf | Koç AI kapalı → fotoğraf analizi "kullanılamaz" yolu, çökme yok | | `7-ogun-foto` |
| 8 | İlerleme fotoğrafı (K-601, K-618) | Photos › Take photos, ön + yan | Seviye göstergesi; kayıt; sayaç "Never uploaded, not even to backups." | | `8-ilerleme` |
| 9 | Karşılaştırma + paylaşım kartı (K-602, K-612) | Compare; paylaşım kartı | Kart cihazda üretilir; yağ %, vücut fotoğrafı, before/after yok; kilo varsayılan gizli | | `9-paylasim` |
| 10 | K-617 fotoğraf sahipliği | Ayarlar › Sign out (uyarı) → aynı hesapla giriş | Çıkış uyarısı fotoğrafların silineceğini söylüyor; çıkışta silinir (elle çıkış) | | `10-cikis` |
| 11 | Widget (K-515) | — | **Kapsam dışı:** native widget hedefi yok (K-515 `doing`) | — | — |
| 12 | Live Activity (K-426) | — | **Kapsam dışı:** K-426 `todo` (expo-widgets + App Group) | — | — |
| 13 | Sandbox satın alma / geri yükleme / iptal (K-702) | — | **Bekliyor:** RevenueCat hesabı + `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` (K-704) | — | — |
| 14 | Erişilebilirlik (K-815) — AX5 | Ayarlar › Erişilebilirlik › Daha Büyük Metin › en büyük | Giriş, Today, kayıt, karar + Why, koç, Ayarlar: kesilen/taşan metin yok | | `14-ax5-*` |
| 15 | K-815 — VoiceOver | VoiceOver açık, aynı görevler | Her düğme ad + rol; koç cevabı ve kaydetme hatası duyuruluyor | | `15-vo-*` |
| 16 | K-815 — Reduce Motion | Açık | Koçta yeni mesaj, barkod sayfası hareketsiz; yerel geçişler not | | — |
| 17 | K-815 — Bold Text + Increase Contrast + Reduce Transparency | Açık, iki temada | Okunmayan metin yok | | `17-kontrast-*` |
| 18 | K-815 — Grayscale | Açık | Seçili çip, uyarı, karar durumu renksiz ayırt ediliyor | | `18-gri` |
| 19 | **Hesap silme + Apple iptali (K-812) — EN SON** | Ayarlar › Delete account → Apple yeniden onay → sil | Hesap gitti; iPhone Ayarlar › Apple ID › Oturum Açma ve Güvenlik › Apple ile giriş listesinde uygulama **yok** | | `19-silme` |

Agent simülatörde: 14, 16, 17, 18 oturumsuz ekranlarda (`xcrun simctl ui booted content_size …`); K-618 klasör bayrağı `xattr` ile.

## Simülatör sonuçları (6 Eki gece, EAS `development-simulator` derlemesi `40e9cfce`, iPhone 16 Pro Max iOS 18.1)
- **0 · Açılış:** derleme kuruldu, Metro'ya bağlandı, giriş ekranı `https://keel-beta.duckdns.org` ile açıldı — ✅ (`img/0-giris-sim.png`).
- **K-618 · yedek bayrağı:** modülün Swift gövdesi simülatörde uygulamanın kendi `Documents/progress-photos` klasörüne ve bir dosyaya →
  `xattr`: `com.apple.metadata:com_apple_backup_excludeItem: com.apple.MobileBackup` (ikisinde de); olmayan dosya reddedildi — ✅.
  Modülün mağaza derlemesinde kayıtlı olduğu cihazda (madde 8) görülür. Metro hata ayıklayıcısından (CDP) uygulama içinden çağrı denendi:
  bağlantı uygulama tarafında 1006 ile kapandı — bu yol bırakıldı.
- **14 · AX5 (giriş ekranı):** metin büyüyor, satır kırıyor, kesilme/taşma yok — ✅ (`img/14-ax5-giris-acik-sim.png`). Apple düğmesi sistemin
  (sabit boyut, iOS'un dilinde). Oturumlu ekranlar cihazda.
- **17 · koyu + Increase Contrast + AX5:** okunuyor — ✅ (`img/17-ax5-giris-koyu-kontrast-sim.png`).

## Cihaz sonuçları (7 Eki gece, iPhone 11 · iOS 18.6.2 · EAS development build `c9e4678f`, JS `main` `3507e91`, sunucu `prod`)
Ekran görüntüleri kablodan (`pymobiledevice3 developer dvt screenshot`, `~/.venvs/pmd3`, tünel `sudo … remote tunneld`); kanıtın bir kısmı sunucu günlüğü
(yol + durum kodu; hesap kimliği yok).

| # | Sonuç | Kanıt |
|---|---|---|
| 0 Kurulum | ✅ development build `devicectl` ile kuruldu, Metro'ya bağlandı | — |
| 1 Apple ile giriş | ✅ `POST /v1/auth/apple` 200 → `GET /v1/profile` 404 → onboarding → `PUT /v1/profile` 200 | sunucu günlüğü |
| 2 HealthKit izni + okuma | ✅ izin sayfası açıldı (Levent); Today'de adım 2/2, tartı, "steps fell" kartı Health verisinden; `PUT /v1/activity-days` ×29 | `img/2-today-health-okuma.png` |
| 3 Abonelik kapısı | ✅ RevenueCat anahtarı yok → kapı açık | — |
| 4 Kayıt → sunucu | ✅ `POST /v1/weigh-ins` 201, Today "Weigh-in done 70.0 kg" | `img/4-tarti-kaydi.png` |
| 5 Health'e yazma | ✅ yalnız "Ağırlık" yazma izni, metin `permissions.healthWrite`; yeni tartı Sağlık'ta keel kaynaklı (Levent gördü) | `img/5-health-yazma-izni.png` |
| 6 Barkod | ✅ kamera izni (metin bizim), barkod okundu → `POST /v1/foods/barcode-lookup` 404: **ürün FDC'de yok** (Türk paketli ürünleri — beta kohortunun yerine göre önemli) | `img/6-kamera-izni.png`, `img/6-barkod-sonuc.png` |
| 7 Öğün fotoğrafı | ⚠️ çökme yok, ama **çıkmaz sokak**: "needs the AI consent… give it in Settings" — prod'da bu rıza yok → K-909 (koç da aynı, `POST /v1/coach/messages` 403) | `img/7-ogun-foto.png` |
| 8 İlerleme fotoğrafı (K-618) | ✅ ön + yan; "1 photo day on this phone. Never uploaded, not even to backups."; Metro'da `BackupExclusionMissing/Failed` yok | `img/8-ilerleme-foto.png` |
| 9 Paylaşım kartı | ⏸ yeni hesapta paylaşılacak yok ("Nothing to share yet"); UX: boş sayfaya giden düğme | `img/9-paylasim-karti.png` |
| 10 Çıkış (K-617) | ⏸ yeni tasarımdan sonra (ADR-067) | — |
| 14 AX5 | ❌ başlıklar kelime ortasından bölünüyor (WEIGH-/IN, SETTING/S, PROGRE/SS); Today'de "Settings" düğmesi taşıyor; koçta çipler notun üstüne biniyor; "Ask the coach" çubuğu ekranın ¼'ü. Gövde metni, düğmeler, alanlar ✅ | `img/14-ax5-*.png` |
| 15 VoiceOver | ✅ düğmeler ad + rol; koç cevapları duyuruluyor (K-815). Not: "Log a meal in words" çipinin cevabı `announce` çağırmıyor (kod incelemesi) | `img/15-vo-*.png` |
| 16 Reduce Motion | ⏸ yeni tasarımdan sonra | — |
| 17 Kalın + Kontrast + Saydamlık (açık tema) | ❌ Kalın Metin tek satır etiketlerin sonunu kesiyor ("Log a mea", "Your recipe:", "Just moved les", "This week's cal") → K-910. Kontrast okunur ✅ | `img/17-kontrast-acik-*.png` |
| 18 Gri tonlama | ✅ seçili çip dolu/çerçeveli, seçili sekme kutulu, karar durumu kelimeyle | `img/18-gri-*.png` |
| 19 Hesap silme + Apple iptali | ⏸ yeni tasarımdan sonra (ADR-067); silme akışı sunucuda testli (K-802, K-812) | — |
| 11-13 | — kapsam dışı / RevenueCat bekliyor | — |

**Levent'in genel değerlendirmesi:** "isteğimin uzağında", onboarding karmaşık, koyu tema iç karartıcı (açık tema iPhone ayarıyla geliyor — uygulama içi seçici yok),
metin çok ve düz, "test ederken bile ne nerede anlamıyorum" → **ADR-067: UI/UX revizyonu, M9 Part 3'ten önce.**
