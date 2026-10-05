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
