# Yol haritası

> Kilometre taşları sıralıdır; her birinin **çıkış kriteri** karşılanmadan sonrakine geçilmez. Görevlerin tamamı
> `plan/backlog.yaml`'da (tek kaynak), görsel hali GitHub Project'te. Tarih yok, sıra var (Levent: mükemmeliyetçilik
> tuzağına düşmeden, "her noktasını savunabildiğimizde" yayına).
> **MVP diye kısma yok** (Levent, 9 Eyl): aşağıdaki her şey ilk yayının parçası; yalnız regülasyon/sağlık riski iptal ettirir.

## Kritik yol
```
M0 Temel ─► M1 Karar motoru ─► M2 Backend ─┬─► M4 Günlük akış ─► M5 Karar + koç ─► M6 İlerleme ─┐
                               M3 Mobil kabuk ┘                                                    ├─► M9 Beta ─► M10 Lansman
                                                              M7 Abonelik ─► M8 Uyum ve yasal ─────┘
```
M1 bilerek erken: ürünün tezi motorda, saf Java olduğu için veritabanı ve arayüz beklemeden test edilebilir, ve
öğrenmenin en temiz başlangıcı (Java + test + alan bilgisi, altyapı gürültüsü yok).

---

## M0 · Temel
**Hedef:** agent'ın saçmalamadığı, unutmadığı, yolu kaybetmediği bir depo.
**Çıkış:** anayasa + skill'ler + ADR'ler + backlog + GitHub Project · backend ve mobil iskelet derleniyor · CI yeşil ·
motor spesifikasyon testleri `pending` olarak hazır · prototip tüm akışlarla.
**Öğrenme:** monorepo, Gradle, Spring Modulith modül kavramı, Expo projesi, CI.

## M1 · Karar motoru çekirdeği
**Hedef:** Güray karar omurgası + literatür boşlukları, saf ve deterministik Java olarak; tablo testleriyle kanıtlı.
**Çıkış:** haftalık check-in omurgası, kalori merdiveni, makrolar, progresyon, deload merdiveni, güvenlik ağı,
tutarlılık sayısı, cinsiyet parametreleri — hepsi parametre dosyasından, her kural kaynaklı · ~20 altın senaryo yeşil.
**Öğrenme:** Java record/enum/sealed tipler, saf fonksiyon, JUnit 5 parameterized test, alan modelleme.
**Kaynak:** `arastirma/03-guray-karar-omurgasi.md`, `ham/guray/G1-G7`, `ham/H3`, `ham/J1`.

## M2 · Backend temel servisler
**Hedef:** motoru gerçek veriyle besleyen API.
**Çıkış:** PostgreSQL + Flyway · Sign in with Apple · profil, rıza, ölçüm, beslenme, antrenman API'leri · Snapshot kurma
ve karar kaydı · tek egress kapısı · hesap silme olayı · sözleşme v1.
**Öğrenme:** REST, OpenAPI, JPA/JDBC, migration, Testcontainers, JWT, modüller arası olay.

## M3 · Mobil kabuk
**Hedef:** C görsel dilinde, offline-first, sözleşmeden tipli bir uygulama iskeleti.
**Çıkış:** RUBİN token'ları (açık + koyu) ve temel bileşenler · metin sistemi · üretilen API istemcisi · yerel depo + senkron ·
giriş · onboarding (içe aktarma, Health okuma/yazma izni dahil) · sistem sekme çubuğu · **cihazda development build + dahili
TestFlight** · Ayarlar · kg/lb.
**Öğrenme:** React bileşen modeli, TypeScript, expo-router, SQLite, senkron kuyruğu.

## M4 · Günlük akış
**Hedef:** kullanıcının günü ~40 saniye (`arastirma/04-faz3-urun.md` §2).
**Çıkış:** Bugün ekranı · tartı · HealthKit (adım, uyku, kilo) · antrenman seansı ve özeti · öğün kaydı (metin, barkod,
fotoğraf → aralık + gram sorusu) · kalan bütçe · tutarlılık sayısı · **hareket gösterimi (kendi çekimler, ilk/son tekrar)** ·
bildirimler · dinlenme sayacı + Live Activity · Health'e yazma · tarif hafızası · salon profili · PR/geçmiş/süperset.
**Öğrenme:** native köprü, kamera, görüntü küçültme, form UX, performans.

## M5 · Karar anları + koç
**Hedef:** ürünün tezi ekranda: karar kartı, gerekçe, itiraza dayanan koç.
**Çıkış:** pazartesi check-in · karar kartı varyantları + gerekçe · LLM portu ve yapılandırılmış çıktı · karar anlatımı ·
soru bütçesi · gün içi öneriler · kota · "hayır diyen koç" değerlendirme seti CI'da · Apple FM spike · **dil modeli sağlayıcısı seçimi (ölçümle)** · proaktif
tetikleyiciler · ilk 8 hafta akışı + 5. hafta risk skoru · kilit ekranı karar widget'ı · durum modu · haftalık koç notu.
**Öğrenme:** LLM API, JSON şema, prompt tasarımı, değerlendirme (eval), maliyet kontrolü.

## M6 · İlerleme
**Hedef:** "gelişiyorum" duygusunu kanıtla vermek (karşılaştırma çıpası, efor grafikleri, projeksiyon).
**Çıkış:** rehberli fotoğraf · karşılaştırma · kompozisyon mesajı · efor grafikleri + iki pencere · şekil projeksiyonu
(dışlama kurallarıyla) · tutarlılık geçmişi · geçmiş içe aktarma · "kararı ne değiştirir" · karar defteri · paylaşım kartı.
**Öğrenme:** grafik çizimi, cihaz üstü işleme, fizyolojik model (Hall), güvenli tasarım.

## M7 · Abonelik
**Çıkış:** RevenueCat · paywall · sunucu tarafı yetki · kota bağlantısı · duraklatma/iptal görünür.
**Öğrenme:** StoreKit kavramları, webhook, yetkilendirme.

## M8 · Uyum ve yasal
**Çıkış:** gizlilik politikası, kullanım şartları, sağlık feragatnamesi · hesap silme ve veri dışa aktarma uçtan uca ·
App Store gizlilik etiketleri ve yaş derecelendirmesi · yasaklı ifade taraması testte · vergi/W-8BEN (Levent, mali müşavir).
**Öğrenme:** GDPR, App Review kuralları, sağlık iddia sınırları.

## M9 · Yayın öncesi (ADR-080)
**Çıkış:** VPS'te Docker Compose + HTTPS + yedek · TestFlight · 2 haftalık dış TestFlight (küçük grup, mağaza hazırlığıyla paralel) ·
öncü göstergeler yayın gününden ölçer · hız sınırı, `/health` hazır olma, metin dışı kontrast, RevenueCat tazeleme.
**Öğrenme:** Docker, dağıtım, gözlemlenebilirlik, ürün metrikleri.

## M9 ara · UI/UX revizyonu (ADR-067, ADR-068, ADR-069)
Faz 5 araştırması bitti (`arastirma/06-faz5-yuz.md`); yön ve kapsam ADR-069, rota `plan/faz5-rota.md` (odak: salonda ağırlık çalışan; 3 sekme + "+"; başlangıç kararı).
M9 Part 2 ile Part 3 arasında. **Çıkış:** ekran envanteri (her ekran: amaç, metin miktarı, karar) · bütün ekranların tıklanabilir artifact
prototipi, Levent telefonda onayladı · görsel dil ADR'si (ADR-016'nın yerine/ekinde; açık/koyu tema seçimi dahil) · onboarding sadeleşti ·
uygulamada metin azaldı · revizyon koda geçti ve TestFlight'ta cihazda gezildi. Sonra M9 Part 3 (beta kohortu).
**Durum (7 Eki):** araştırma, prototip (tur 3 onaylı) ve kararlar bitti (ADR-070..078). Kod kilometre taşı **M9a · Yeni yüz**
(`plan/backlog.yaml`, K-951..K-984 + K-910; kurallar `plan/yeni-yuz-kurallar.md`; dört part `plan/oturum-promptlari/YENI-YUZ-kod.md`). K-904 (beta kohortu) K-984'e bağlı.

## M10 · Mağazaya çıkış (sessiz yayın, ADR-080)
**Çıkış:** ürün adı + marka kontrolü · vergi + banka (Paid Applications Agreement) · EN-US ASO · ekran görüntüleri + açıklama ·
puan isteği değer anında · ASC beyanları, SANDBOX kapalı, AI kapalı yüzeyler dürüst · App Review → uygulama mağazada, reklam/itiş yok.

## M11 · Yayın sonrası: pazarlama + güncellemeler (ADR-080)
Pazarlama lansmanı ayrı planla, ilk gerçek kullanım verisiyle: Featuring (≥3 hafta önce), Product Hunt + Show HN aynı 48 saat,
Custom Product Pages, EN-UK + ES-MX yerelleştirme, yorum cevap rutini (**Ocak'ta pazarlama itişi yok**, `arastirma/05-faz4-pazarlama.md` §1).
Güncellemelerle: hareket klipleri, Live Activity, kilit ekranı, Siri ile kilo, AI sağlayıcı + koç AI katmanı, Apple Watch, videoya gömme.

> Not: `arastirma/ham/K1-lansman-otopsileri.md` "MVP = karar mantığı, kalanı v2" önerir; bu öneri **reddedildi**
> (Levent, 9 Eyl: MVP diye kısma yok).
