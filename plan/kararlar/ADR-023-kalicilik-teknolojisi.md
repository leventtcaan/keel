# ADR-023 · Persistence: Spring Data JDBC, one schema per module, migration-owned event registry
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-09-29 · **Karar veren:** agent

## Bağlam
ADR-005 PostgreSQL + Flyway'i ve "her modül kendi tablosunun sahibidir"i seçti; erişim teknolojisini, modül sınırının
veritabanında nasıl korunacağını ve Modulith olaylarının nasıl kalıcı olacağını açık bıraktı. ADR-020: yerel veritabanı
Docker Compose, testler Testcontainers. K-202 bu üçünü kurar. Sürümler Boot 4.1.1 BOM'undan doğrulandı (Flyway 12.4.0,
PostgreSQL sürücüsü 42.7.13, Testcontainers 2.0.5); sunucu imajı PostgreSQL 18.6 (Docker Hub, 19 beta).

## Karar sürücüleri
- Levent her satırı anlatabilmeli: sihirli davranış (tembel yükleme, kirli kontrol, proxy) az olmalı.
- Modül sınırı (ADR-015) veritabanında da kırılamamalı ve bir testle yakalanmalı.
- Hesap silme gibi modüller arası olaylar yeniden başlatmada kaybolmamalı (V6, K-214).

## Karar
1. **Spring Data JDBC** (+ gerektiğinde `JdbcClient` ile açık SQL). JPA/Hibernate yok.
2. **Her modül bir PostgreSQL şeması:** `identity.account`, `profile.goal`… Göç dosyaları `V<n>__<modül>_<ne>.sql`,
   1'den boşluksuz; bir modülün göçü yalnız kendi şemasındaki tabloları oluşturur, değiştirir, dizinler ve **referans
   verir** — modüller arası yabancı anahtar yok (kimlik değer olarak taşınır). İki kat kontrol: `MigrationConventionTests`
   dosyaları tarar (tırnaklı ad yasak, tablo adı geçen her yer); `MigrationTests` göçlerden sonra **PostgreSQL
   kataloğuna** bakar: şemalar arası yabancı anahtar ya da görünüm yok, `public`'te yalnız çerçeve tabloları.
3. **Modulith olay kaydı** (`event_publication`) `public` şemasında, **Flyway göçüyle** (V1, kurulu jar'ın v2 şemasından);
   Modulith kendi tablosunu oluşturmaz (`schema-initialization.enabled: false`). `public`'te yalnız o ve Flyway geçmişi.
4. **Yerel:** `backend/compose.yaml`, PostgreSQL 18.6, host portu **55432** (makinede kurulu PostgreSQL 5432'yi tutuyor);
   `local` profili ona bağlanır. **Parola yok** (V5: repoda parola olmaz): port yalnız 127.0.0.1'de, konteyner yerel
   bağlantıya güvenir (`POSTGRES_HOST_AUTH_METHOD: trust`). Dağıtılmış ortam kimlik bilgilerini ortamdan alır (`KEEL_DB_URL/USER/PASSWORD`, V5).
5. **Testler:** Testcontainers + `@ServiceConnection`, compose ile aynı imaj; imaj sürümü tek yerde
   (`libs.versions.toml › postgres-image`), compose'daki satır bir testle ona bağlı.

## Neden
- Spring Data JDBC aggregate'i olduğu gibi yazar/okur: bir `save` bir SQL; ne yaptığı SQL loguyla birebir anlatılabilir.
  Modulith'in "modül = aggregate kümesi" yaklaşımıyla örtüşür.
- Şema başına modül, sahipliği veritabanının kendi ad alanıyla gösterir; yabancı anahtar yasağı, modülün silme olayını
  kendi başına işleyebilmesini sağlar (K-214: her modül kendi verisini siler; FK sırası dayatmaz).
- Olay kaydını göçle yönetmek şemayı tek yerde (Flyway) tutar; sürüm yükseltmede değişiklik göç olarak görünür.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| JPA/Hibernate | Tembel yükleme, oturum, kirli kontrol: davranış koddan okunmuyor; anlatım yükü yüksek |
| jOOQ | Kod üretimi + ek araç; bu ölçekte `JdbcClient` yeter |
| Tek şema, tablo önekleri | Sınır yalnız adlandırma kuralı olur; şema, izinler ve silmede daha net |
| Modüller arası FK | Silme sırasını dayatır, modül bağımsızlığını kırar |
| Modulith'in tabloyu kendisinin kurması | Şema iki yerde yönetilir; sürüm geçişi görünmez |
| Varsayılan 5432 portu | Levent'in makinesinde PostgreSQL 16/17 kurulu ve 5432'de |

## Sonuçlar
Olumlu: sınır testle korunuyor; her şema değişikliği göç ve kural testinden geçiyor. Olumsuz: modüller arası
tutarlılık (ör. hesap silinince her modülde veri kalmaması) FK ile değil olay + test ile sağlanır (K-214 testi şart).

## Geri dönmenin maliyeti
Orta: erişim katmanı modül içinde kalır; JPA'ya geçiş modül modül yapılabilir. Şema düzeni değişirse göç gerekir.

## Etkilenen
`backend/build.gradle.kts`, `gradle/libs.versions.toml`, `compose.yaml`, `application*.yml`, `db/migration/`,
`app.keel.persistence` testleri; ADR-005'i ayrıntılandırır; K-203…K-219'daki her tablo.

## Ek (30 Eyl 2026, K-214 incelemesi)
Olay kaydı bir yayını **saklar ama kendiliğinden yeniden göndermez** (Modulith 2.1.1: `republish-outstanding-events-on-restart`
varsayılanı false, `resubmit` çağıran yok). Hesap silme için: yeniden başlatmada bekleyen yayınlar yeniden gönderilir,
10 dk'dan uzun takılan yayın `staleness` ile FAILED olur, `DeletionRetry` FAILED silme yayınlarını 5 dk'da bir yeniden
gönderir (yalnız `AccountDeletionRequested`: her modülün silmesi idempotent). Silmenin ikinci geçişi için
`privacy.deletion` (V7) mezar taşı tablosu.
