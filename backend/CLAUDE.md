# backend/ — CLAUDE.md

Spring Boot 4.1 + Spring Modulith 2.1 modüler monolit, Java 25, Gradle 9 (Kotlin DSL). Kök kurallar: `../CLAUDE.md`,
`../docs/anayasa.md`.

## Komutlar
- Derleme + tüm testler: `./gradlew build` (her zaman wrapper; sistem `gradle` değil)
- Yalnız testler: `./gradlew test`
- Bekleyen spesifikasyonlar: `./gradlew pendingTest` (kasıtlı kırmızı — ADR-009)

## Kurallar
- `app.keel` altındaki her doğrudan alt paket bir modül; liste `ModularityTests` ile sabit (ADR-015). Değişiklik ADR ile (K5, ADR-019).
- Her modülün `package-info.java`'sı `allowedDependencies`'i açıkça yazar. Listeyi genişletmek gerekçe + ADR ister (K5, ADR-019).
- `shared` paylaşılan modül: herkes kullanır, hiçbir şeye bağlı değil.
- **`engine` saf:** Spring, veritabanı, saat, ağ yok. Zaman girdi olarak gelir (ADR-003).
- **`coach` karar üretmez;** `engine`'e değil `decision`'a bağlı (U1).
- Sürümler yalnız `gradle/libs.versions.toml`'da; `VersionCatalogTests` satır içi sürümü yakalar.
- Motor eşikleri kodda değil `../data/parameters/*.yaml`'da; `ParameterProvenanceTests` kaynaksızı yakalar.
- Modülün temel paketindeki tipler API'sidir; alt paketler iç ayrıntıdır, başka modül göremez.
- **Veritabanı (ADR-023):** göç `src/main/resources/db/migration/V<n>__<modül>_<ne>.sql`, 1'den boşluksuz; modül yalnız
  kendi şemasına (`<modül>.<tablo>`) dokunur, tırnaklı ad yok, başka modüle yabancı anahtar ya da görünüm yok
  (`MigrationConventionTests` dosyada, `MigrationTests` veritabanı kataloğunda). Yayınlanmış
  göç değiştirilmez, yenisi yazılır. Her yabancı anahtara dizin; zaman serisinde `(account_id, zaman)` dizini; para/kcal
  aralığı `low`/`high` iki sütun. Yerel: `docker compose up -d` (port 55432) + `SPRING_PROFILES_ACTIVE=local`.
  Entegrasyon testi: `@Import(PostgresTestConfiguration.class)` (Testcontainers, compose ile aynı imaj).
- Spesifikasyon testi `@Tag("pending")` ile başlar; görevi başlatan ilk iş etiketi kaldırmaktır. Satır silerek yeşile çevirmek yasak.
