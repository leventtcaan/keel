# M8 · Part 2 — Denetimler ve teslim (session prompt'u)

> Part 1 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M8 iki part hâlinde yapılıyor; bu PART 2 (son). Ortak talimat plan/oturum-promptlari/M8.md — önce onu oku ve harfiyen
uygula. Hafıza DURUM.md › "## M8 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 1 ÇIKIŞ" git ile doğru mu? Yasal kapı cevaplandı (ADR-059 + Ek 1: hukuki inceleme yok, Pages canlı, ASC M10, vergi M11);
   açık yalnız iletişim adresi (Levent açacak → `docs/yasal/site/_config.yml › contact_email`). Disk (K-807 simülatör ister, Docker budandı).

Kapsam, sırayla:
1) K-802 hesap silme + dışa aktarma uçtan uca: tek test, gerçek sunucu (DB, CI'da): bir hesap her modüle veri yazar (envanterdeki her tablo —
   `docs/yasal/veri-envanteri.json`, `account_deletion` diyenler), siler; sonra hiçbir tabloda o hesabın satırı yok, oturum 401. Dışa aktarma
   her modülün bölümünü içerir (`exported: true` diyenler). Telefonda silme akışı zaten var (K-309) — testle bağla.
   **Part 1'in envanteri yedi açık buldu (DURUM › M8 ilerleme › "Envanterin bulduğu açıklar") — K-802'nin kabulüne girer, ürün/sır gerekeni Levent'e:**
   `event_publication` tamamlananları silmiyor (silinen hesabın UUID'si kalıyor — politika "değiştiriyoruz" diyor; düzelince politika ve
   envanter `erased_by` güncellenir) · Sign in with Apple jetonu iptal edilmiyor (Apple REST API; istemci sırrı Levent'te) · silme onayı
   aboneliğin Apple'da süreceğini söylemiyor · RevenueCat müşteri kaydı (K-704) · süresi geçmiş yenileme jetonları ve `webhook_event`
   temizliği · telefonda öğün fotoğrafı önbelleği · `FakeLanguageModel` belleği (M9 kontrol listesi).
2) K-804 anayasa denetimi CI'da: yasaklı ifade (U4/U6) + hardcode (K2) taraması bugün mobil ve sunucuda ayrı; yasal sayfalar Part 1'de
   eklendi (`forbidden-phrases.test.ts › legal texts`, `legalNegations`, Pages iş akışı yayından önce koşar) — App Store açıklaması taslağını
   da kapsasın; tek komut, CI'da kırmızı. Ek: telefondaki anahtarlar (kv-store `const KEY`) envantere bağlansın (Part 1 test analizi, puan 6);
   "her rota bir korumalı grupta" (M7'den).
3) K-807 erişilebilirlik: Dynamic Type en büyük boyutta taşma yok, VoiceOver ile ana görevler (kayıt, karar, koç, paywall, ayarlar › abonelik
   iptali); testle denetlenebilen kısım (rol/etiket, `allowFontScaling`) + simülatör kaydı (disk izin verirse; yoksa DURUM'a). App Store
   Accessibility Nutrition Label cevapları gerekçeli taslak.
4) K-805 M11'e taşındı (ADR-059 #5: "bir satsın") — takip yok. Paid Apps Agreement + banka/vergi formu mağaza kurulumunun parçası (ADR-012 Ek 1).

Bitiş:
1) plan/yol-haritasi.md › M8 çıkış kriterlerini tek tek kontrol et, çıktıyla göster; eksikleri DURUM'a yaz.
2) Birikmiş soruları AskUserQuestion ile toplu sor, cevapları ADR'ye işle, kalan uygulanabilir işi bitir.
3) M9 · Beta için part prompt'larını bu yapının kalıbıyla yaz: plan/oturum-promptlari/M9.md + M9-part1.md … (M9 kapıları: VPS ve alan adı —
   para, Levent; TestFlight dış test — Apple incelemesi; beta kohortu başvurusu — kullanıcı verisi, Levent; SANDBOX'ı ortamlardan çıkar).
   Commit.
4) DURUM › M8 ilerleme › "Part 2 ÇIKIŞ = M8 ÇIKIŞ" bloğu; kısa Türkçe özet + M9 Part 1 prompt'u ver.
Session KAPANMAYACAK: döndüğümde Part 2'yi aktarırsın (docs/aktarim/M8/).
```
