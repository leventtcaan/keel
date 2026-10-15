# ADR-081 · Öncü göstergeler: üç sayı, sunucunun zaten tuttuğu tablolardan türetilir; yeni olay tablosu, analitik SDK, telefon telemetrisi yok

- **Durum:** KABUL (Levent, 15 Eki: rapor sağlık sınıfı tabloların zaman damgalarını da okur; bu, onam metnine yazılır)
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
   - **2. hafta retention:** en az 14 gün önce kaydolanların içinde, hesabın 7. gününden 14. gününe kadar (7 ≤ gün < 14; gün = UTC takvim günü, hesabın açıldığı gün 0)
     **kendi yaptığı bir şey** olanların oranı. Yapılan şey: antrenman başlatma (içe aktarılan değil), kardiyo seansı (Apple Health'ten gelen değil), elle
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
5. **Veri sınırı (V3) — Levent'in kararı (15 Eki).** Rapor sağlık sınıfındaki tabloların (kilo, bel, fotoğraf, öğün, karar) **değerini
   okumaz**; yalnız satırın ne zaman ve hangi yoldan geldiğini ve bir kararın planı değiştirip değiştirmediğini okur. Çıktıda hesap yok, yalnız
   gruplar; **5'ten küçük grup sayı göstermez** (`keel.min_cell`, aşağıda), böylece "kişi başına listelenmez" gerçekten doğrudur. Levent tam raporu
   seçti (öğün/kilo/check-in ile aktif olanlar da sayılır); katı seçenek (yalnız antrenman ve kardiyo) `weekly-report.sql › activity` içinde tek
   yerde duruyor, gerekirse oraya dönülür. Bu okuma **onam metnine yazılır**: `consent.health_data.points.purpose` ("We also count, in totals
   across all users and never per person or by value, whether the coaching works") ve politika `#data-health` ile `#data-technical`. Onam
   **sürümü "5" kalır**: v5 hiçbir derlemede yayımlanmadı, yani kimse eski metne evet demedi; sürüm artırmak kimsenin cevabını geçersiz kılacak
   bir şey için gereksiz olurdu. (Bir derleme v5 ile yayımlanırsa bu cümle sonradan eklenemez, sürüm 6 olur.) İki test bağlar: statik test
   (`tools/test_deploy.py › WeeklyReport`) raporun, envanterin sağlık sütunlarından zaman/anahtar dışındakilerin hiçbirini adlandırmadığını, hesap
   göstermediğini, yazmadığını, `set_config`/`pg_*`/`dblink` çağırmadığını ve yalnız `keel.*` ayarlarını okuduğunu doğrular; veritabanı testi
   (`WeeklyReportTests`) çıktı sütunlarının tam listesini, küçük grup bastırmasını ve salt okunur oturumun yazmayı reddettiğini (SQLSTATE 25006) doğrular.
6. **Gizlilik metni ve envanter:** politikaya (`#data-technical`) ve envantere (`operations › weekly usage counts`) bir madde eklendi:
   sayılar tüm kullanıcılar için, sunucuda, saklanmadan, kişi başına listelenmeden hesaplanır; 5'ten küçük grup sayı göstermez; analitik hizmeti ve izleme yok.
   Metin "zaman zaman" der (rapor elle çalışır, zamanlanmış iş yok).

## Bilinen sınırlar (rapor sayıları okunurken)
- **Sağlık rızasını geri çeken** kullanıcının kilo/öğün/karar satırları silinir; yalnız onlarla aktif olan "terk etmiş" görünür. Retention
  alttan sapar. Hesabını silen kullanıcı paydadan da çıkar (sağ kalım yanlılığı).
- **İlk değer medyanı sansürlüdür:** genç bir kayıt haftasında henüz ulaşmayanlar medyana girmez, yani sayı düşük görünür; "ulaşan" sütunuyla
  birlikte okunur. İlk karar en erken ilk haftanın sonunda gelebildiği için sayı alt sınırdan (≈7 gün) başlar.
- Gün sınırları UTC takvim günüdür: yalnız günü olan kaynaklar (kardiyo, bel, fotoğraf) ile zamanı olanlar (antrenman, kilo, öğün, karar) aynı biçimde
  UTC gününe göre karşılaştırılır; 2. hafta, hesabın açıldığı günden sonraki 7. günün başından 14. günün başına kadardır. Telefonun yerel gün sınırından
  en çok bir günlük sapma olur. Geçmişe dönük kayıt (bugün girilen dünkü öğün) kayıt tarihiyle sayılır. Kendi hesabımız ve test hesapları sayılara girer
  (hesap listesi yok, ayıklama yok); küçük örneklemde yüzdeler oynaktır, sayılar yanında verilir.
- Rapor "kayıt olmadan bırakanı" (hesap açmayan) görmez; ürün tarafında hesap açma anı için olay gerekirse ayrı karar.

## Raporun parametreleri ve küçük grup kuralı
Raporun sayıları `weekly-report.sql` başındaki `params` sorgusunda tek yerde durur; ayar `keel.*` adlarıyla verilir, verilmezse varsayılan geçer:
`keel.report_as_of` (şimdi), `keel.week_days` (7), `keel.cohort_weeks` (8), `keel.min_cell` (5). Bunlar motor parametresi değil rapor
parametresidir (K2 "eşik koda gömülmez" için tek yer burası; `data/parameters` motoru içindir). **Küçük grup:** 5'ten az hesabı olan kayıt haftası yalnız
büyüklüğünü gösterir; sayısı ya da payı kendi grubu 5'ten küçük olan sütun (ilk karara ulaşanlar, iki haftalık olanlar) boş kalır. Toplam satırının adı
`total (window)`: gösterilen kayıt haftalarının toplamıdır, tüm zamanların değil. Sonuç: 5'ten az kullanıcılı bir betada rapor yalnız kayıt sayısını
söyler; bu bilerek böyledir. `--as-of` ileri bir tarihi reddeder.

## Olay tablosu ne zaman gerekir
Yalnız bir sayı tablolardan çıkarılamazsa: tam ekran görüntülenmesi, hesap açılmadan önceki adımlar, bir özelliğin kullanım sayısı. O zaman
yeni ADR: asgari şema (hesap kimliği yok ya da hesaba bağlı ve hesapla silinir, olay türü, zaman; sağlık alanı yok, test ile), saklama süresi
`data/parameters` ya da yapılandırmada (K2), hesap silme testine bağlama, envanter ve politika satırı.

## Testler (kabul ↔ test)
- İlk değer, retention, plan değişti tanımları sentetik satırlarda: `backend/src/test/java/app/keel/persistence/WeeklyReportTests.java` +
  `backend/src/test/resources/report/leading-indicators-fixture.sql` (CI'da gerçek PostgreSQL; kayıt haftası, yalnız günü olan kaynakların (kardiyo, bel, fotoğraf) 2. hafta kenar günleri, küçük grup bastırması, "henüz karar yok" sayılmaz,
  kendiliğinden gelen sayılmaz, 14. gün sınırı, uygulanıp geri alınan sayılır, reddedilen sayılmaz, rapor sonrası kayıt ve 8 hafta öncesi
  sayılmaz, boş pencerede paylar boş).
- "Analitikte sağlık alanı yok": `tools/test_deploy.py › WeeklyReport` (CI "Tooling"), `WeeklyReportTests` sütun listesi + salt okunur oturum,
  `tools/test_veri_envanteri.py` (olay tablosu yok, politika cümlesi).
- K1 listesi (onam testi): `consent-versions.test.ts` içindeki `purpose` beklentisi "nothing else" yerine yeni cümleyi arar (ADR'den doğan değişiklik, gevşetme değil);
  `test_veri_envanteri.py` politika cümlesi ve onam metni için güncellendi.
- Yerelde doğrulama: rapor aynı sentetik satırlarla geçici bir yerel PostgreSQL'de çalıştırıldı; beklenen sayılar elle hesaplanandan çıktı.

## Çalıştırma
`ssh keel-vps /opt/keel/deploy/weekly-report.sh` (isteğe bağlı `--as-of YYYY-MM-DD`, `--weeks N`). Pazartesi sabahı bir kez; çıktı bir tablo.
