# ADR-009 · Test stratejisi ve CI
- **Durum:** ÖNERİ
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Levent'in istediği akış (TDD): özellik → kabul kriteri → test → kod. Agent'ın "testi geçirmek için testi değiştirme"
hatası mekanik olarak engellenmeli (K1). CI her zaman yeşil kalmalı ama spesifikasyon testleri koddan önce yazılabilmeli.

## Karar
1. **Test piramidi:**
   - **Motor tablo testleri** (JUnit 5 parameterized): girdi Snapshot → beklenen Decision; sınır değerleri dahil.
     Test kodunda sayı yok; beklenen eşikler parametre dosyasından.
   - **Mimari testler:** Spring Modulith `verify()` (döngü yok, iç pakete erişim yok, `allowedDependencies`),
     modül listesi sabit, `VersionCatalogTests` (satır içi sürüm yok), `ParameterProvenanceTests` (her parametrenin
     `source` + `tag` alanı dolu, kaynak dosya var).
   - **Entegrasyon testleri:** API + veritabanı (ilk veritabanı görevinde Testcontainers önerisiyle, K5).
   - **Sözleşme:** üretilen TS tipleri sözleşmeyle aynı (CI'da yeniden üret, diff yoksa geç).
   - **Mobil:** `tsc` + ESLint + Jest.
2. **Bekleyen spesifikasyon testleri:** koddan önce yazılan testler JUnit `@Tag("pending")` ile işaretlenir. Normal
   `test` görevi bu etiketi hariç tutar (CI yeşil kalır); `./gradlew pendingTest` yalnız onları çalıştırır.
   **Görevi başlatan ilk iş etiketi kaldırmak ve testin kırmızı olduğunu göstermektir** (skill `gorev-baslat`).
   Bu, "testi atla" değil, "sırası gelmemiş spesifikasyon"dur; sayısı DURUM'da izlenir.
3. **CI (GitHub Actions):** her push/PR'da backend `./gradlew build` + mobil `npm run check`. Kırmızı CI ile birleştirme yok.

## Neden
Tablo testleri Güray'ın karar ağacını birebir çalıştırılabilir spesifikasyona çevirir. `pending` etiketi TDD'yi
görünür kılar ve CI'ı yalan söyletmeden kırmızı-yeşil döngüsünü korur.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| `@Disabled` | Neden devre dışı olduğu kaybolur; K1'in yasakladığı şeye benzer |
| Testleri görevle birlikte yazmak (önceden değil) | Gece hazırlanan spesifikasyon sabah ön aktarımın malzemesi olamaz |
| Kırmızı testlerle CI | CI'ın "yeşil = sağlam" anlamı kaybolur |

## Geri dönmenin maliyeti
Düşük.

## Etkilenen
`backend/build.gradle.kts`, `.github/workflows/ci.yml`, tüm testler.

## Doğrulama
CI yeşil; `./gradlew pendingTest` bekleyen spesifikasyonları kırmızı gösterir.
