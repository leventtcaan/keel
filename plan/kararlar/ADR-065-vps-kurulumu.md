# ADR-065 · VPS kurulumu: Compose + Caddy, şifreli yedek Mac'e, journald 14 gün
- **Durum:** KABUL (teknik — agent, ADR-019)
- **Tarih:** 2026-10-05 · **Karar veren:** agent (ADR-064'ün dış kapılarıyla)

## Bağlam
K-901 (ADR-013): tek VPS'te backend + PostgreSQL + ters vekil, HTTPS, günlük yedek VPS dışına + geri yükleme provası, sırlar ortamda.
ADR-064: Contabo (Almanya), ücretsiz alt alan, yedek Levent'in Mac'ine çekilir, AI kapalı, Dokploy yok. Politika M8'de söz verdi:
yedek ve ters vekil günlüğünün saklama süresi politikaya girmeden yedek açılmaz.

## Karar sürücüleri
1. Levent her satırı anlatabilmeli (panel yok, her şey repoda `deploy/` altında, testli).
2. Sağlık verisi: yedek sunucudan **şifreli** çıkar; günlükte kimlik/gövde/sağlık verisi yok (V3); süreler politikada ve testte.
3. Sıfır ek maliyet, tek VPS, imajlar sürüm + özetle sabit (K6).

## Karar
- **İmaj:** `deploy/backend.Dockerfile`, bağlam **repo kökü** (backend derlemede `../data/*`'yı jar'a alır). Çok aşamalı: `eclipse-temurin`
  25 JDK'da `./gradlew bootJar`, `eclipse-temurin` 25 JRE'de root olmayan kullanıcıyla çalışır. Testler imajda değil CI'da koşar (K-902).
- **Compose (`deploy/compose.yaml`):** `postgres` (yalnız iç ağ, port yayımlanmaz) · `backend` (`SPRING_PROFILES_ACTIVE=prod`, K-907; port
  yayımlanmaz) · `caddy` (80/443, Let's Encrypt otomatik, HTTP→HTTPS). Sırlar `/opt/keel/keel.env` (sahibi `keel`, mod 600); repoda yalnız
  ad listesi (`deploy/keel.env.example`). FDC dosyaları `/opt/keel/fdc` salt okunur (ADR-008).
- **Ters vekil = Caddy**, nginx/Traefik değil: sertifikayı kendisi alır ve yeniler (Caddyfile 3-4 satır); erişim günlüğü varsayılan **kapalı**
  ve kapalı kalır. Çalışma günlüğü (TLS el sıkışma hatasında IP olabilir) journald'a gider.
- **Günlükler:** Docker `journald` sürücüsü; `journald` `MaxRetentionSec=14day` → sunucu günlükleri en çok **14 gün**.
- **Yedek:** systemd zamanlayıcısı her gün 02:30 UTC `pg_dump -Fc` → `age` ile açık anahtara şifreli dosya `/var/backups/keel/`; VPS'te **7 gün**.
  Mac'te launchd işi uyanıkken saatte bir `rsync` ile çeker (salt okunur, `rrsync -ro`, yalnız bu klasöre izinli ayrı anahtar); Mac'te **14 gün**,
  sonra silinir. Özel `age` anahtarı yalnız Mac'te + Levent'in çevrim dışı kopyasında; sunucu yedeği **açamaz**.
- **Geri yükleme provası (`deploy/restore-drill.sh`):** son yedek Mac'te açılır, SSH üzerinden VPS'te geçici (diski olmayan) bir PostgreSQL
  kabına `pg_restore`; canlı veritabanıyla tablo başına satır sayıları karşılaştırılır; kap silinir. Çıktı PR'da.
- **Sunucu sertleştirme (`deploy/provision.sh`, bir kez):** güncellemeler + `unattended-upgrades`, Docker resmî apt deposundan, `keel`
  (dağıtım) ve `keel-backup` (yalnız yedek çekme) kullanıcıları, SSH yalnız anahtarla, root girişi kapalı, UFW 22/80/443.
- **Dağıtım (`deploy/deploy.sh`):** dosyaları VPS'e eşitler, imajı derler (K-902'de CI derler ve özetle çeker), `compose up -d`,
  `https://<alan>/health` 200 bekler; olmazsa önceki imaja döner (geri alma yolu yazılı: `deploy/README.md`).

## Neden
Caddy'nin otomatik HTTPS'i ve kapalı erişim günlüğü politika sözünü en az parçayla tutar. `age` tek dosyalık, anahtar yönetimi basit
(GPG'nin güven ağı yok). Mac'e **çekme** (itme değil): Mac NAT arkasında; VPS'in Mac'e erişimi olmaz, Mac'in VPS'te yalnız şifreli dosyaları
okuma yetkisi olur — VPS ele geçirilse Mac'e yol yok, Mac anahtarı çalınsa yalnız şifreli dosya.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| nginx + certbot | İki parça, yenileme zamanlayıcısı ayrı; Caddy'de yerleşik |
| Traefik | Etiket tabanlı yapılandırma, tek servis için fazla |
| Dokploy | ADR-064 #6 |
| Buildpacks (`bootBuildImage`) | Dockerfile kadar okunur değil; aynı Dockerfile CI'da ve VPS'te |
| GPG ile şifreleme | Anahtar yönetimi ağır; `age` aynı işi tek komutla |
| Yedeği VPS'ten Mac'e itmek | Mac'e gelen bağlantı açmak gerekir (NAT, güvenlik) |

## Sonuçlar
- Olumlu: her parça repoda, testli; sertifika ve yedek kendiliğinden; sunucu yedeği açamaz.
- Olumsuz (kabul): Mac kapalıyken yedek yalnız VPS'te (ADR-064 #3). Bir geri yükleme, yedekten sonra yapılmış değişiklikleri — bir hesap
  silmesi dahil — kaybeder; o aralıkta silinen hesap geri gelir (yedek ≤ 24 saat eski). Politika bunu söyler; Levent'e soru (Part 1 sonu).
- Şifreli yedekler Levent'in Mac'inde, Türkiye'de durur: politika bunu söyler (sunucu AB'de, yedek kopyası sorumlunun kendi bilgisayarında).

## Geri dönmenin maliyeti
Düşük: Compose dosyası her VPS'e taşınır; yedek hedefi tek betikte.

## Etkilenen
`deploy/` (yeni), `docs/yasal/site/privacy.md` (yedek + günlük süresi), `docs/yasal/veri-envanteri.json` (`operations`),
`tools/test_veri_envanteri.py`, `tools/test_deploy.py` (yeni, CI Tooling), K-902.

## Doğrulama
`tools/test_deploy.py` (imajlar sürüm+özetle, postgres sürümü katalogla aynı, port yayımlanmayan servisler, sürelerin politika ve envanterle
aynı olması); `https://<alan>/health` 200; geri yükleme provası çıktısı (satır sayıları eşit).

## Ek 1 (5 Eki) — güvenlik incelemesinden sonra
- **Günlük yalnız journald'da:** Ubuntu journald'ı rsyslog'a aktarıyor (`/var/log/syslog`, haftalarca) → rsyslog kaldırılır; drop-in
  `zz-keel.conf` adıyla Ubuntu'nun `syslog.conf`'undan sonra uygulanır (`ForwardToSyslog=no`), `MaxFileSec=1day` (yaş silmesi yalnız
  kapanmış dosyada çalışır; varsayılan bir ay). PostgreSQL `log_error_verbosity=terse`, `log_min_error_statement=panic` (satır ve sorgu
  günlüğe girmez, V3).
- **SSH sertleştirmesi ayrı adım (`harden-ssh.sh`):** önce Mac'ten `keel` olarak anahtarla giriş + `sudo` denenir, sonra root/parola kapanır.
- **`release.sh`:** imaj kimliğiyle karşılaştırır (aynı imaj yeniden → `previous` korunur), başarısızlıkta `current`/`previous` eski hâline
  döner, geri alma ikisini takas eder; Caddyfile değişince Caddy yeniden yaratılır; systemd/journald dosyaları değişince ana makineye kopyalanır;
  yalnız `current`/`previous` kalır. `/health` canlılıktır, hazırlık değil → 30 sn yerleşme beklemesi; kalıcı çözüm **K-908**.
- **Yedek:** her yedeğin yanında o anki tablo sayımları (`.counts`, kişisel veri değil); prova bunlarla karşılaştırır (canlı veri 02:30'dan sonra
  değişir). Mac kopyaları Time Machine dışında (`tmutil addexclusion`) — yoksa 14 gün sözünü aşarlar; en yeni yedek 26 saatten eskiyse bildirim.
- **`init-env.sh`:** Compose'un `.env` okuyucusunun değiştireceği karakterleri reddeder. `/opt/keel/fdc` 755 (kapsayıcı kullanıcısı okur).
