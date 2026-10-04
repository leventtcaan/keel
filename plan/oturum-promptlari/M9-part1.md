# M9 · Part 1 — Sunucu ayakta (session prompt'u)

> M8 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M9 üç part hâlinde yapılıyor; bu PART 1. Ortak talimat plan/oturum-promptlari/M9.md — önce onu oku ve harfiyen uygula.
Hafıza DURUM.md › "## M9 ilerleme"de (yoksa aç); sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "## M8 ilerleme › Part 2 ÇIKIŞ = M8 ÇIKIŞ" git ile doğru mu? Açık PR (K-812 mobil yarısı?) varsa önce onu bitir.
1) Dış kapıları AskUserQuestion ile toplu sor (M9.md › Dış kapılar): VPS (Contabo mu, hangi plan — para), alan adı (geçici mi, ürün adına mı — M10),
   Apple Developer üyeliği durumu, sırların kimde olduğu (yalnız adlar; değerler asla sohbete değil). Cevaplar → ADR (karar-yaz).

Kapsam, sırayla:
1) Üretim profili (başlangıç denetimi, test önce): eksik sır → açılmaz; Apple iptal anahtarı yok → açılmaz (ADR-062 #3); AI sağlayıcısı `fake` ise ya
   AI kapalı ya da açılmaz (FakeLanguageModel belleği — M8 açık 7); SANDBOX beta boyunca kalır (M9.md). `application-prod.yml` + test.
2) K-901 VPS: Compose (backend + PostgreSQL + ters vekil), HTTPS (sertifika otomatik), sırlar ortam değişkeninde (dosya izinleri), günlük pg_dump VPS
   dışına (nereye — para/hesap gerekiyorsa Levent) + geri yükleme provası (çıktıyla). ÖNCE politika: yedek ve ters vekil günlüğü saklama süreleri
   (envanter + politika + test aynı PR'da; M8'in sözü). Sunucu bölgesi `_config.yml › server_region` ile tutarlı.
3) K-902 CI'dan dağıtım: `main`'e birleşme → test → imaj (sürüm/özetle) → VPS; geri alma yolu yazılı. Dağıtım sırrı GitHub Secrets'ta (Levent ekler;
   agent adını söyler). Repo public: iş akışı günlüklerinde sır yok.
4) Disk/maliyet notu: imaj boyutu, VPS kaynakları, aylık maliyet (para → Levent'e bilgi).

Bitiş: "Part 1 ÇIKIŞ" bloğu (M9.md › Senkron kuralı SONUNDA) + kısa Türkçe özet + M9 Part 2 prompt'unu ver. Session KAPANMAYACAK.
```
