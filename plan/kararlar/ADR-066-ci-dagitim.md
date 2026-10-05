# ADR-066 · CI'dan dağıtım: imaj CI'da, deposuz SSH ile, zorunlu komutlu anahtar
- **Durum:** KABUL (teknik — agent, ADR-019)
- **Tarih:** 2026-10-05 · **Karar veren:** agent

## Bağlam
K-902: `main`'e birleşme → test → imaj → VPS; geri alma yolu yazılı; dağıtım sırrı GitHub'da (Levent ekler); repo public (iş akışı
günlükleri herkese açık). ADR-065: VPS'te `release.sh` (sağlık ucu, geri alma), `keel` kullanıcısı fiilen root (docker grubu + sudo).

## Karar sürücüleri
1. CI'daki anahtar çalınırsa zarar en küçük olsun (repo public, anahtar GitHub'da).
2. İmaj hiçbir yerde yayımlanmasın; VPS'te yeni bir okuma jetonu (sır) olmasın.
3. Test edilmiş commit dağıtılsın; eski commit yenisinin üstüne geçmesin; doküman commit'i sunucuyu yeniden başlatmasın.

## Karar
- **Tetik:** `workflow_run` — CI `main`'e push'ta **başarılı** bitince; o koşunun `head_sha`'sı checkout edilir (en yeni `main` değil).
  `concurrency: deploy`, yarıda iptal yok. GitHub Environment `production`: anahtar yalnız bu işe açılır.
- **İmaj CI koşucusunda** `deploy/backend.Dockerfile` ile; **depo (registry) yok**: `docker save | gzip | ssh … image <commit>` → VPS'te
  `docker load` → `release.sh keel-backend:<commit>`. `deploy/` da aynı commit'ten (`git archive | ssh … files <commit>`).
- **CI anahtarı zorunlu komutlu:** `authorized_keys`'te `restrict,command="/opt/keel/deploy/ci-deploy.sh"` — kabuk yok, yönlendirme yok;
  `ci-deploy.sh` yalnız `released`, `files <40 hex>`, `image <40 hex>` kabul eder; `files` tar'ında `deploy/` dışında bir şey varsa reddeder.
  Sunucunun ana anahtarı sabit (`KEEL_DEPLOY_KNOWN_HOSTS`, `StrictHostKeyChecking=yes`).
- **Sıra ve gereksizlik:** çalışan commit (`release.sh` → `/opt/keel/release-current`) yeni commit'in atası değilse ya da aradan `backend/`,
  `data/`, `deploy/` değişmediyse dağıtım atlanır.
- **Sırlar/değişkenler:** sır `KEEL_DEPLOY_SSH_KEY` (Levent, `gh secret set --env production < dosya`); değişkenler `KEEL_DEPLOY_HOST`,
  `KEEL_DEPLOY_KNOWN_HOSTS` (gizli değil). İş akışında `${{ }}` hiçbir `run:` betiğine yapıştırılmaz (enjeksiyon), `env:` ile gelir.
- **Geri alma:** `ssh keel-vps /opt/keel/deploy/release.sh --rollback` (ADR-065); CI geri almaz — başarısız sürümü `release.sh` zaten geri koyar.

## Neden
**(Ek 1: bu paragraf yanlıştı — aşağıya bak.)** Zorunlu komut, `keel`'in fiilen root olmasını CI anahtarı için etkisizleştirir: anahtar çalınsa yapılabilecek tek şey bu repodaki bir
commit'in imajını dağıtmak — ki imaj da saldırganın elinden çıkar: **kalan risk** sahte bir imaj (`image <commit>` stdin'den gelir). Bu,
anahtarın sızmasının gerçek bedeli; anahtar yalnız `production` ortamında, korunan `main`'den tetiklenen işe açık.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| GHCR + VPS'te çekme | İmaj ya herkese açık ya VPS'te okuma jetonu (yeni sır) |
| VPS'te derleme (deploy.sh gibi) | Her birleşmede VPS'te Gradle (CPU/disk); CI koşucusu ücretsiz |
| Tam yetkili `keel` anahtarı | Public repodaki sır = sunucuda root |
| `appleboy/ssh-action` vb. | Üçüncü taraf eylem gizli anahtarı görür; düz `ssh` yeter |

## Geri dönmenin maliyeti
Düşük: iş akışı tek dosya; elle `deploy/deploy.sh` her zaman çalışır.

## Etkilenen
`.github/workflows/deploy.yml`, `deploy/ci-deploy.sh`, `deploy/authorize-ci.sh`, `deploy/release.sh` (`release-current`), `tools/test_deploy.py`.

## Doğrulama
`tools/test_deploy.py` (tetik, eşzamanlılık, sırların yolu, sabitlenmiş eylemler, zorunlu komutun reddettikleri — gerçek koşu); ilk başarılı
Deploy koşusu (Actions) ve `https://<alan>/health`.

## Ek 1 (5 Eki) — güvenlik incelemesi: ilk tasarım CI anahtarını root yapıyordu
**Yanlış olan:** "Zorunlu komut, `keel`'in fiilen root olmasını CI anahtarı için etkisizleştirir" — değildi. `files <commit>` istemciden gelen
tar'la `deploy/`'u (zorunlu komutun kendisi, `release.sh`, `compose.yaml` dahil) değiştiriyordu; commit kimliği tar'la hiç karşılaştırılmıyordu.
Çalınan anahtar: `files` ile kendi `ci-deploy.sh`'ini koyar → sonraki bağlantıda istediği komut → `sudo` → root (inceleme bunu koşturdu).
**Şimdi:**
- CI yalnız **imaj + commit kimliği** gönderir (`deploy <commit>`); `files` yok.
- Sunucu `main`'i **kendisi** herkese açık repodan çeker (`/opt/keel/source.git`); commit `main`'de ve çalışandan yeni değilse reddeder
  (sıra denetimi artık koşucuya güvenmez); `deploy/`'u o commit'ten alır — yani çalışan her betik gözden geçmiş `main` kodudur.
- Zorunlu komut root'a ait `/usr/local/lib/keel/ci-deploy` (`keel` yazamaz); `release.sh` `main` sürümüyle günceller.
- İmaj tar'ı yüklenmeden önce `manifest.json`: tam bir imaj, etiketi yalnız `keel-backend:<commit>` (ikinci etiket `previous`/`current`'ı
  saldırganın imajına çevirebilirdi).
- `released` yalnız 40 hex döner; iş akışı `merge-base` çıkış kodunu ayırır (1 → atla, başka → iş kırmızı).
- `release.sh` `flock` ile tek seferde bir; iş akışı `shell: bash` (pipefail).
**Kalan risk (açıkça):** çalınan CI anahtarıyla sahte bir imaj dağıtılabilir — o kapsayıcı `.env`'i (DB parolası, Apple anahtarı, oturum
anahtarı) ve veritabanındaki **bütün kullanıcı verisini** okur; ana makineye erişemez. Önlem: anahtar yalnız `production` ortamında; sızarsa
`authorized_keys`'ten silinir, sırlar döndürülür.
