# ADR-081 · Öncü göstergeler: üç sayı, sunucunun zaten tuttuğu tablolardan türetilir; yeni olay tablosu, analitik SDK, telefon telemetrisi yok

- **Durum:** ÖNERİLDİ (teknik kısım uygulandı; Karar 5 veri sınırı olduğu için Levent'in onayını bekler, ADR-019)
- **Tarih:** 2026-10-15 · **Kart:** K-905 (issue #87)
- **Dayanak:** `arastirma/05-faz4-pazarlama.md` §2 (değer merdiveni; "ölçüm sonuçla değil öncü göstergeyle": ilk değere kadar süre,
  2. hafta retention, "sistem planımı değiştirdi anını gören kullanıcı %'si"), ADR-080 #3 (yayın gününden ölçmek), V3, K2, ADR-023.

## Bağlam
ADR-080 8 haftalık betayı kaldırdı; 8. hafta retention'ı yayından önce olmayacak. Apple sıralaması retention'a bakar ve H&F'te 30. gün
medyanı ~%3'tür (araştırma §2); değerimiz 4-8 haftada gelir. Bu yüzden yayın gününden itibaren üç **öncü** sayı gerekir. Kart "analitikte
sağlık verisi yok (V3)" der, gizlilik politikası "analitik hizmeti yok" der (`docs/yasal/site/privacy.md`).

## Karar
1. **Üç sayı da zaten tutulan tablolardan türetilir.** Yeni tablo, olay günlüğü, migration yok. Çıktı: salt okunur bir rapor
   (`deploy/weekly-report.sql` + `deploy/weekly-report.sh`), VPS'te SSH ile çalışır. Uç yok, port yok, sır yok.
2. **Tanımlar** (rapor dosyasının başlığı aynısını söyler):
   - **Başlayan:** bir hesap; oluştuğu haftanın pazartesisine (UTC) göre gruplanır ("kayıt haftası").
   - **İlk değere kadar süre:** hesabın oluşmasından, ilk **gerçek haftalık karara** kadar gün. Gerçek karar: `decision.weekly_call` satırı
     ve eylemi `NO_DECISION_YET` olmayan (U3: "henüz karar yok" karar değildir; `CONTINUE` dahil, çünkü motor veriye bakıp konuştu).
     Medyan, ona ulaşanlar üzerinden; yanında "kaç kişi ulaştı". Gerekçe: araştırmanın merdiveninde 0-5 dk'daki plan hesabın kendisidir (anlık,
     ölçülecek bir şey yok); ölçülebilir ilk değer "sistem bir şey söyledi" anıdır, o da haftalık kararla gelir ve ilk haftada beklenir
     (araştırma: "koçluk hissi 1 haftada gelmeli"). Hedef 7-14 gün.
   - **2. hafta retention:** en az 14 gün önce kaydolanların içinde, hesabın 7. gününden 14. gününe kadar (7 ≤ gün < 14) **kendi yaptığı
     bir şey** olanların oranı. Yapılan şey: antrenman başlatma (içe aktarılan değil), kardiyo seansı (Apple Health'ten gelen değil), elle
     kilo (Apple Health değil), bel, fotoğraf karşılaştırması, öğün, haftalık check-in (karar). Sayılmayan: kendiliğinden gelenler
     (Apple Health kilo/kardiyo, içe aktarma) ve oturum yenileme. Payda: kayıt olan herkes (hiç bir şey yapmayan dahil); böylece "başladı
     sonra bıraktı" gizlenmez.
   - **"Plan değişti" anını gören:** en az bir kararı planı oynatıp uygulanmış (`applied_at` dolu) olan hesapların, tüm başlayanlara oranı;
     sonradan geri alınmış ya da "eski planla devam" denmiş olsa da sayılır (kullanıcı gördü). Hiç uygulanmamış reddedilen sayılmaz.
     Gerekçe: karar kullanıcının kendi check-in cevabıyla oluşur ve sonuç aynı ekranda gösterilir (ADR-077 #3); sunucu ekran görüntülenmesini
     göremez, "uygulandı" en yakın ölçülebilir karşılığıdır.
3. **Kaynaklar:**

   | Sayı | Tablolar | Sütunlar |
   |---|---|---|
   | Başlayan, kayıt haftası | `identity.account` | `created_at` |
   | İlk değer | `decision.weekly_call` | `decided_at`, `decision -> 'action' ->> 'type'` |
   | Aktiflik | `training.workout`, `training.cardio_session`, `measurement.weigh_in`, `measurement.waist`, `measurement.photo_check`, `nutrition.meal`, `decision.weekly_call` | yalnız zaman ve geliş yolu (`source`, `imported_from`) |
   | Plan değişti | `decision.weekly_call` | `applied_at` |

4. **Neden türetilir, saklanmaz.** Her olay tablosu bir veri envanteri satırı, gizlilik metni, hesap silmeye bağlama, saklama süresi (K2) ve
   sağlık alanı yasağı denetimi demektir; hesap silinince giden tablolardan türetilen sayı bunların hiçbirini istemez ve silinen hesap
   kendiliğinden sayıdan çıkar. Üç sayının hepsi tablolardan çıkarılabildi; olay tablosu ancak aşağıdaki durumlarda gerekir.
   Reddedilenler: (a) üçüncü taraf analitik (politika "yok" der, V2); (b) telefondan telemetri (yeni egress, mağaza gizlilik etiketi,
   onay ekranı); (c) herkese açık/yönetici uç (yeni saldırı yüzeyi; SSH zaten tek yönetim yolu, ADR-065/066); (d) SQL görünümü
   (ADR-023: modül başka şemaya dokunmaz, görünüm yok; rapor modüllerin dışında, `table-counts.sql` gibi).
5. **Veri sınırı (V3) ve Levent'e açık nokta.** Rapor sağlık sınıfındaki tabloların (kilo, bel, fotoğraf, öğün, karar) **değerini
   okumaz**; yalnız satırın ne zaman ve hangi yoldan geldiğini okur, çıktıda hesap yok, yalnız gruplar. Bunu iki test bağlar: statik test
   (`tools/test_deploy.py › WeeklyReport`) raporun, veri envanterinin sağlık sütunlarından zaman/anahtar dışındakilerden hiçbirini
   adlandırmadığını ve çıktıda hesap olmadığını doğrular; veritabanı testi (`WeeklyReportTests`) çıktı sütunlarının tam listesini ve oturumun
   salt okunur çalıştığını doğrular. Yine de "kilo kaydı var mı" bilgisi hukuken sağlık verisi sayılabilir; katı yol: `activity` ifadesinden
   sağlık tablolarını silmek (yalnız antrenman ve kardiyo kalır, öğün/kilo/check-in ile aktif olan sayılmaz, retention düşük çıkar).
   Bu, tek yerde (`weekly-report.sql › activity`) değişir. Karar Levent'in.
6. **Gizlilik metni ve envanter:** politikaya (`#data-technical`) ve envantere (`operations › weekly usage counts`) bir madde eklendi:
   sayılar tüm kullanıcılar için, sunucuda, saklanmadan, kişi başına listelenmeden hesaplanır; analitik hizmeti ve izleme yok.

## Bilinen sınırlar (rapor sayıları okunurken)
- **Sağlık rızasını geri çeken** kullanıcının kilo/öğün/karar satırları silinir; yalnız onlarla aktif olan "terk etmiş" görünür. Retention
  alttan sapar. Hesabını silen kullanıcı paydadan da çıkar (sağ kalım yanlılığı).
- **İlk değer medyanı sansürlüdür:** genç bir kayıt haftasında henüz ulaşmayanlar medyana girmez, yani sayı düşük görünür; "ulaşan" sütunuyla
  birlikte okunur. İlk karar en erken ilk haftanın sonunda gelebildiği için sayı alt sınırdan (≈7 gün) başlar.
- Gün sınırları UTC; geçmişe dönük kayıt (bugün girilen dünkü öğün) kayıt tarihiyle sayılır. Kendi hesabımız ve test hesapları sayılara girer
  (hesap listesi yok, ayıklama yok); küçük örneklemde yüzdeler oynaktır, sayılar yanında verilir.
- Rapor "kayıt olmadan bırakanı" (hesap açmayan) görmez; ürün tarafında hesap açma anı için olay gerekirse ayrı karar.

## Olay tablosu ne zaman gerekir
Yalnız bir sayı tablolardan çıkarılamazsa: tam ekran görüntülenmesi, hesap açılmadan önceki adımlar, bir özelliğin kullanım sayısı. O zaman
yeni ADR: asgari şema (hesap kimliği yok ya da hesaba bağlı ve hesapla silinir, olay türü, zaman; sağlık alanı yok, test ile), saklama süresi
`data/parameters` ya da yapılandırmada (K2), hesap silme testine bağlama, envanter ve politika satırı.

## Testler (kabul ↔ test)
- İlk değer, retention, plan değişti tanımları sentetik satırlarda: `backend/src/test/java/app/keel/persistence/WeeklyReportTests.java` +
  `backend/src/test/resources/report/leading-indicators-fixture.sql` (CI'da gerçek PostgreSQL; kayıt haftası, "henüz karar yok" sayılmaz,
  kendiliğinden gelen sayılmaz, 14. gün sınırı, uygulanıp geri alınan sayılır, reddedilen sayılmaz, rapor sonrası kayıt ve 8 hafta öncesi
  sayılmaz, boş pencerede paylar boş).
- "Analitikte sağlık alanı yok": `tools/test_deploy.py › WeeklyReport` (CI "Tooling"), `WeeklyReportTests` sütun listesi + salt okunur oturum,
  `tools/test_veri_envanteri.py` (olay tablosu yok, politika cümlesi).
- Yerelde doğrulama: rapor aynı sentetik satırlarla geçici bir yerel PostgreSQL'de çalıştırıldı; beklenen sayılar elle hesaplanandan çıktı.

## Çalıştırma
`ssh keel-vps /opt/keel/deploy/weekly-report.sh` (isteğe bağlı `--as-of YYYY-MM-DD`, `--weeks N`). Pazartesi sabahı bir kez; çıktı bir tablo.
