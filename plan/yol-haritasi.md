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
**Çıkış:** token'lar ve temel bileşenler · metin sistemi · üretilen API istemcisi · yerel depo + senkron · giriş ·
onboarding akışı · sekmeler.
**Öğrenme:** React bileşen modeli, TypeScript, expo-router, SQLite, senkron kuyruğu.

## M4 · Günlük akış
**Hedef:** kullanıcının günü ~40 saniye (`arastirma/04-faz3-urun.md` §2).
**Çıkış:** Bugün ekranı · tartı · HealthKit (adım, uyku, kilo) · antrenman seansı ve özeti · öğün kaydı (metin, barkod,
fotoğraf → aralık + gram sorusu) · kalan bütçe · tutarlılık sayısı.
**Öğrenme:** native köprü, kamera, görüntü küçültme, form UX, performans.

## M5 · Karar anları + koç
**Hedef:** ürünün tezi ekranda: karar kartı, gerekçe, itiraza dayanan koç.
**Çıkış:** pazartesi check-in · karar kartı varyantları + gerekçe · LLM portu ve yapılandırılmış çıktı · karar anlatımı ·
soru bütçesi · gün içi öneriler · kota · "hayır diyen koç" değerlendirme seti CI'da · Apple FM spike.
**Öğrenme:** LLM API, JSON şema, prompt tasarımı, değerlendirme (eval), maliyet kontrolü.

## M6 · İlerleme
**Hedef:** "gelişiyorum" duygusunu kanıtla vermek (karşılaştırma çıpası, efor grafikleri, projeksiyon).
**Çıkış:** rehberli fotoğraf · karşılaştırma · kompozisyon mesajı · efor grafikleri + iki pencere · şekil projeksiyonu
(dışlama kurallarıyla) · tutarlılık geçmişi.
**Öğrenme:** grafik çizimi, cihaz üstü işleme, fizyolojik model (Hall), güvenli tasarım.

## M7 · Abonelik
**Çıkış:** RevenueCat · paywall · sunucu tarafı yetki · kota bağlantısı · duraklatma/iptal görünür.
**Öğrenme:** StoreKit kavramları, webhook, yetkilendirme.

## M8 · Uyum ve yasal
**Çıkış:** gizlilik politikası, kullanım şartları, sağlık feragatnamesi · hesap silme ve veri dışa aktarma uçtan uca ·
App Store gizlilik etiketleri ve yaş derecelendirmesi · yasaklı ifade taraması testte · vergi/W-8BEN (Levent, mali müşavir).
**Öğrenme:** GDPR, App Review kuralları, sağlık iddia sınırları.

## M9 · Beta
**Çıkış:** VPS'te Docker Compose + HTTPS + yedek · TestFlight · başvurulu beta kohortu (zaten kayıt tutan ileri kullanıcı) ·
öncü göstergeler (ilk değere kadar süre, 2. hafta retention, "plan değişti" anını gören %) · geri bildirim döngüsü.
**Öğrenme:** Docker, dağıtım, gözlemlenebilirlik, ürün metrikleri.

## M10 · Lansman
**Çıkış:** ürün adı + marka kontrolü · ASO (başlık/alt başlık/keyword, 3 yerelleştirme hilesi) · ilk 2 ekran görüntüsü mesajı
taşıyor · LLM'in çıkarabileceği açıklama (GEO) · Custom Product Pages · Featuring başvurusu (≥3 hafta önce) · yorum cevap
rutini · Product Hunt + Show HN aynı 48 saat. **Ocak'ta lansman yok** (`arastirma/05-faz4-pazarlama.md` §1).
