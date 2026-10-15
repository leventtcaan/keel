# ADR-082 · API hız sınırı: süreç içi token bucket, hesap başına (girişte adres başına), 429 RATE_LIMITED + Retry-After (K-817)
- **Durum:** KABUL (agent, teknik — ADR-019)
- **Tarih:** 2026-10-15 · **Karar veren:** agent

## Bağlam
K-812 incelemesi: `POST /v1/account/apple-revocation` her istekte bir ES256 imzası ve Apple'a iki çağrı yapar; koç ve fotoğraf uçları her
istekte bir dil modeli çağrısı (para); giriş oturumsuz. Hiçbirinde istek sınırı yok. `RATE_LIMITED` (429) kodu `ErrorCode`'da (backend) tanımlıydı ama hiçbir yerde
kullanılmıyordu. Günlük kotalar (`coach_messages_per_day` 25, `photo_analyses_per_day` 10,
`data/parameters/quota.yaml`) tek kullanıcının günlük harcamasını sınırlar; kısa sürede art arda gelen bir döngüyü ya da başka bir
hesabın spam'ini durdurmaz.

## Karar
1. **Süreç içi sınırlayıcı, yeni bağımlılık yok.** Tek VPS, tek süreç; Bucket4j/Resilience4j gibi kitaplık ya da Redis gerekmez.
   `shared.web.RateLimiter`: istemci başına tek sayı (token bucket'ın sanal zamanlama biçimi, GCRA: "kovanın yeniden dolacağı an");
   `burst` kadar istek bir anda, sonra her `refill-every`'de bir. Saat enjekte edilir (`java.time.Clock`).
2. **Gruplar** (`RateLimitGroup`, yol `@RateLimited(grup)` ile uçta işaretli): `SIGN_IN` (`POST /v1/auth/apple`, **adres başına**),
   `APPLE_REVOCATION` (`POST /v1/account/apple-revocation`), `COACH` (`POST /v1/coach/messages` ve `POST /v1/meals/parse`, ikisi de
   metin için model çağrısı, **tek sayaç**), `MEAL_PHOTO` (`POST /v1/meals/photo`); hesap uçları **hesap başına** (oturum jetonunun
   `sub`'ı, veritabanı sorgusu yok). Hesap anahtarı bulunamazsa adrese düşer (serbest kalmaz). `POST /v1/photo-checks` bir fotoğraf
   değil bir kayıt satırıdır (görüntü gitmez): kapsam dışı. `POST /v1/auth/refresh` ve `sign-out` kapsam dışı (kart girişi ister, maliyetleri
   bir veritabanı okuması; gerekirse ayrı iş).
3. **Sayılar yapılandırmada** (`keel.rate-limit`, `application.yml`, K2); eksik grup ya da 0 sayı sunucuyu başlatmaz:
   `sign-in` 20 / 30 sn (saatte ~120: kurulum başına bir giriş; paylaşılan adres, ör. operatör NAT'ı, birkaç düzine kullanıcıyı
   aynı anda görebilir) · `apple-revocation` 3 / 1 dk (silme başına bir; kapanan Apple sayfası bir iki yeniden dener) · `coach` 10 /
   20 sn · `meal-photo` 5 / 30 sn (günlük kotaların altında kalır, yalnız döngüyü durdurur). `max-account-keys` 50000, `max-address-keys` 10000.
4. **Bellek sınırlı, sınır asla sayımsız geçirmez:** iki ayrı tablo: hesap anahtarlı (para harcayan gruplar) ve adres anahtarlı (giriş;
   herkesin doldurabileceği, bu yüzden küçük olan). Oturumsuz bir adres seli hesap tablosuna dokunamaz: koç, yemek fotoğrafı ve iptal
   sınırı o selde de işler. Tablo dolunca yeni istemci **sayılır**: bucket'ı en erken dolacak istemci (unutulmaya en yakın, en az
   kaybeden) yerini bırakır ve sonraki isteği taze burst ile başlar. (İlk taslakta dolu tabloda yeni istemci sayılmadan geçiyordu;
   inceleme bunu seli parayla ödenen uçlara açık bir delik buldu, tasarım değişti.) Yeniden dolmuş bucket'lar sıranın başındadır ve
   her istekte baştan atılır: tarama yok, zamanlayıcı yok; iki adım da O(log n). Bellek: istemci başına ~300 bayt (iki harita girişi,
   kutulanmış sayı, anahtar metni); sınırlarda ~15 MB (hesap) + ~3 MB (adres).
5. **Yanıt:** 429, gövde sözleşmenin `Error`'ı (`RATE_LIMITED`, sabit mesaj), `Retry-After` tam saniye (yukarı yuvarlanır, en az 1).
   Sınırlayıcı yöntemden **önce** çalışır (`HandlerInterceptor`, güvenlikten sonra): reddedilen isteğin gövdesi okunmaz. Reddedilen istek
   sayacı ilerletmez.
6. **V3:** sayaç yalnız anahtar (`grup|account:<sub>` ya da `grup|address:<adres>`) ve bir zaman tutar; gövde, başlık, sağlık verisi yok;
   anahtar loga yazılmaz (reddi `SafeLog` kodla ve türle yazar). Adres bellekte kalır, diske yazılmaz (Caddy erişim günlüğü de tutmaz).
7. **İstemci adresi yalnız güvenilen vekilden:** `getRemoteAddr()`. `server.forward-headers-strategy: native` ile Tomcat
   (`RemoteIpValve`) bağlantının adresini `X-Forwarded-For`'dan **yalnız bağlantı** `server.tomcat.remoteip.internal-proxies`'ten
   gelirse değiştirir; bu liste tam olarak `deploy/compose.yaml`'ın sabitlediği `edge` ağının alt ağı: `172.30.250.0/24` (ipam). Ağda
   yalnız Caddy ve backend var; ikisinin eşleşmesini ve bu üyeliği `tools/test_deploy.py` denetler. Daha geniş bir aralık (172.16/12,
   192.168/16: başka bir konteynerin ya da başka bir Docker ağının bağlantısı da vekil sayılırdı) bilerek yok. Uygulama hiçbir başlığı
   kendisi okumaz. IPv6 istemci /64'ü ile sayılır (bir ev/telefon /64 alır; tek adresle saymak döndürerek aşmayı bedava yapar).
   Alt ağ değişince compose `edge` ağını yeniden yaratır: ilk yayında `deploy.sh` kısa bir kesintiyle konteynerleri yeniden kurar.
   **Caddy (K6):** `reverse_proxy`, `trusted_proxies` verilmedikçe gelen `X-Forwarded-*` değerlerini yok sayar ve gördüğü adresi yazar:
   "By default, the proxy will ignore their values from incoming requests, to prevent spoofing"
   (https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#defaults; belge metni
   https://raw.githubusercontent.com/caddyserver/website/master/src/docs/markdown/caddyfile/directives/reverse_proxy.md,
   15 Eki 2026'da okundu). Davranış 2.5.0'dan beri (sürüm notu: "Incoming X-Forwarded-* headers will no longer be automatically
   trusted", https://github.com/caddyserver/caddy/releases/tag/v2.5.0); `deploy/compose.yaml` Caddy 2.11.6. `Caddyfile`'da
   `trusted_proxies` yok (`tools/test_deploy.py` korur).
   **Bilinen risk, IPv6 ve docker-proxy:** Docker, köprü ağına IPv6 ile gelen bağlantıyı kullanıcı alanı vekiliyle (docker-proxy)
   iletirse Caddy istemciyi köprünün geçit adresi (`172.30.250.1`) olarak görür; o durumda tüm IPv6 istemciler tek anahtara çöker
   (giriş sınırı herkes için paylaşılır, 429 görülür) ve başlık sahteciliği değil sayım bozulur. Önlem: sunucunun alan adına AAAA kaydı
   eklememek (yalnız IPv4) ve `daemon.json`'da ip6tables kapalı kalır. Yayında şöyle anlaşılır: sessiz mağaza yayınından önce IPv6
   olan bir ağdan (ör. telefon verisi) giriş uç noktasına art arda 21 istek, sonra başka bir IPv6 ağından bir istek; ikincisi de 429 ise çökmüş
   demektir. Başlangıçta uyarı günlüğü bilerek yok: başlangıçta istek ya da istemci adresi yok; kod eklemek bu riski ölçmez.
8. **Sözleşme:** `components/responses/RateLimited` (kod `RATE_LIMITED`, `Retry-After` başlığı) ve beş işlemde `"429"`.
   Telefon: 429 bugün genel hata yoluna düşer (`load` → `failed`), sakin metin zaten orada; ek metin yok.

## Neden
- Kitaplık: bir kovanın 40 satırı için ek bağımlılık, sürüm ve BOM yönetimi (K6) değmez; tek süreçte dağıtık sayaç gerekmez. Çok
  süreçli düzene geçilirse (ayrı iş) sayaç Redis'e ya da kitaplığa taşınır; arayüz (`tryAcquire`) küçük.
- GCRA: istemci başına tek `long`; boşta olanı atmak = kovası dolu olanı atmak, ayrı zamanlayıcı yok.
- Başlığa güvenmemek: sınırı aşmak için istemcinin kendi anahtarını seçebilmesi sınırı anlamsız kılar.

## Alternatifler ve neden o değil
- **Bucket4j/Resilience4j:** gereksiz bağımlılık (yukarıda).
- **Caddy `rate_limit` modülü:** resmî imajda yok (eklenti derlemesi gerekir), hesap başına sayamaz (oturum jetonunu çözmez).
- **Veritabanında sayaç:** her istekte yazma; zaten pahalı uçların başına bir yazma daha, V3 yüzeyi büyür.

## Sonuçlar
- Sunucu yeniden başlayınca sayaçlar sıfırlanır (kasıtlı: kısa pencereli bir koruma).
- Çok vekilli kurulum (CDN önde) `internal-proxies` ve Caddy `trusted_proxies` ile birlikte ayrıca ele alınır.
- Telefondaki yeniden deneme (kuyruk, 429 geçici sayılır, `sync/queue.ts`) `Retry-After`'ı okumaz; kendi aralığıyla dener. Okumak ayrı iş.

## Geri dönmenin maliyeti
Düşük: işaretler ve yapılandırma kalkar; sözleşmeye 429 eklemek geriye uyumludur.

## Etkilenen
`backend/.../shared/` (`RateLimited`, `RateLimitGroup`, `RateLimitedException`), `shared/web/` (`RateLimiter`, `RateLimitInterceptor`,
`RateLimitProperties`, `ClientAddress`, `ApiErrorHandler`), `identity/AuthController`, `privacy/AppleRevocationController`,
`coach/CoachController`, `application.yml`, `contracts/openapi.yaml`, `deploy/compose.yaml` (edge alt ağı), `deploy/Caddyfile` (yorum), `tools/test_deploy.py`.

## Doğrulama
`RateLimiterTests` (pencere, patlama, boşta silme, bellek sınırı, saat enjekte), `RateLimitInterceptorTests` (429 + Retry-After, hesap/adres
anahtarı, başlık yok sayılır), `RateLimitApiTests` (dört grup, gerçek uçlar; CI), `RateLimitForwardedAddressTests` ve
`RateLimitBehindProxyTests` (gerçek Tomcat'te güvenilmeyen/güvenilen vekil; CI), `RateLimitConfigTests` (yapılandırma, sözleşmede 429),
`tools/test_deploy.py` (Caddy `trusted_proxies` yok).
