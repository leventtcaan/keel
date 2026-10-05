# ADR-064 · M9 başı cevapları (Levent, 5 Eki)
- **Durum:** KABUL (Levent — para, hesap, veri; AskUserQuestion, M9 Part 1 başı)
- **Tarih:** 2026-10-05 · **Karar veren:** Levent (öneren: agent)

## Bağlam
M9 Part 1 (sunucu ayakta) dış kapıları: VPS, alan adı, yedeğin VPS dışındaki yeri, Apple Developer üyeliği, üretimde AI sağlayıcısı
(`plan/oturum-promptlari/M9.md › Dış kapılar`). Levent ayrıca "VPS + Dokploy + Appwrite" sekansını sordu.

## Kararlar
1. **VPS:** ADR-013'teki Contabo VPS (Almanya; politika `server_region: "Germany (EU)"` ile tutarlı). Bu Mac'te SSH anahtarı yoktu (giriş
   parolayla yapılmış) → anahtarla giriş (`~/.ssh/keel_vps`, takma ad `keel-vps`), sunucuda parola girişi kapanır. Kaynaklar bağlanınca doğrulanır.
2. **Alan adı:** beta için **ücretsiz alt alan** (DuckDNS türü; hesabı Levent açar). Ürün adı M10'da; geçişte uygulamada yalnız adres değişir.
3. **Yedek VPS dışına: Levent'in Mac'ine çekilir.** Üçüncü taraf ve ücret yok. Yedek VPS'te `age` ile şifrelenir (özel anahtar yalnız Mac'te
   ve Levent'in çevrim dışı kopyasında); Mac uyanıkken çeker. Bedel: Mac kapalı kaldığı günlerde yedek yalnız VPS'tedir (VPS dışına günlük
   **garanti değil**) — beta ölçeğinde kabul. Saklama süreleri politikaya girmeden yedek açılmaz (M8'in sözü).
4. **Apple Developer Program: aktif.** Team ID, Sign in with Apple anahtarı (`.p8`) ve Key ID'yi Levent oluşturur; agent yalnız adlarını ve
   VPS'te nereye gireceğini söyler (V5). Anahtar yoksa üretim sunucusu açılmaz (ADR-062 #3).
5. **Koç AI'sı beta'da kapalı başlar.** Üretimde `fake` sağlayıcı yok (son 100 isteği bellekte tutar — M8 envanter açığı 7); AI açıkça kapalı,
   uygulama AI özelliklerini kapalı gösterir. Gerçek sağlayıcı (ADR-044 listesi, K-533 ölçümü) ayrı iş, Levent'in para/veri kararıyla.
6. **Dokploy / Appwrite yok.** Appwrite bir BaaS'tır: kendi kimlik doğrulaması, veritabanı ve API'siyle Spring backend'in **yerine** geçer
   (ADR-013'ün Supabase'i reddettiği gerekçe: ikinci sistem). Dokploy (dağıtım paneli) yerine düz Compose + Caddy: Dokploy internete açık bir
   yönetim paneli (port 3000) ekler, en az 2 GB RAM ister, yedek dokümanında istemci tarafı şifrelemeden söz etmez; panelde tıklanan kurulum
   repoda görünmez ve test edilemez; K-901'in öğrenme hedefi (Docker, ters vekil/TLS, yedek) bir arayüzün arkasında kalır.
   Kaynak: docs.dokploy.com/docs/core/installation ve /docs/core/backups (5 Eki 2026 okundu).

## Etkilenen
K-901, K-902 (teknik tasarım ADR-065), `docs/yasal/site/privacy.md` (yedek ve günlük saklama), `docs/yasal/veri-envanteri.json`,
`backend` üretim profili (AI kapalı, Apple anahtarı zorunlu).
