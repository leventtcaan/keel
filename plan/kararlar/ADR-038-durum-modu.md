# ADR-038 · Durum modu: beyan edilen bağlam yeni veridir, hafta duraklar, karar bekler
- **Durum:** KABUL (teknik, agent — ADR-019). Kaynaksız iki alt madde (dönüş yükü, minimum doz) U14 gereği **bekler** →
  soru 60. "Herhangi bir gün" duraklatma kuralı ürün tarafı → soru 61.
- **Tarih:** 2026-10-02 · **Karar veren:** agent · **Görev:** K-516 (motor + sunucu), K-518 (mobil)

## Bağlam
L3 §4.2: hayat araya girer (seyahat, hastalık, ağrı, yoğun hafta, yeni salon). Beyan edilen durum **yeni veridir** (U2) —
kararı değiştirir, ısrar değildir; sayaç sıfırlanmaz (U7); "henüz karar yok" nedeni görünür (U3). Kaynak taraması
(`plan/oturum-promptlari/M5-part1-kaynaklar.md`): tartı gürültüsü H1 `### Gürültü ne kadar?` (su, sodyum, glikojen; günlük
1-3 kg normal), hastalıkta kilo kaybı yağ değil (G2 K-87), 1 hafta af (04 §7.3, I1 F3). **Dönüş yükü oranı, minimum doz hacmi,
gürültü süresi, yeniden-baseline kuralı: kaynak yok.**

## Karar
1. **Beş durum:** `TRAVELING`, `SICK`, `PAIN`, `BUSY`, `NEW_GYM`. Kayıt `decision.declared_state` (tür, başlangıç günü,
   isteğe bağlı bitiş günü — ikisi de kullanıcının takviminde, dahil). Hastalık ve ağrı sağlık verisidir → tablo HEALTH_DATA
   rızasının altında: rızasız 403, geri çekmede ve hesap silmede silinir, dışa aktarılır (K-214, K-231).
2. **API** `/v1/state`: `GET` (yürürlükteki durum ya da 404), `PUT {kind, until?}` bugünden başlatır (açık bir durum varsa
   dün biter, yenisi bugün başlar; aynı gün başladıysa yerine geçer), `DELETE` "döndüm": açık durum dün biter (bugün başladıysa
   kayıt silinir). Geçmiş kayıtlar kalır (geçmiş haftaların duraklaması onlardan okunur).
3. **Motor:** `Snapshot.context` — check-in haftasının (bugün ve önceki 6 gün) herhangi bir gününde yürürlükte olan durum.
   Varsa karar `NO_DECISION_YET` / kural `declared_context`, kaynak H1 `### Gürültü ne kadar?` (LITERATURE): rutini bozulmuş
   haftanın tartısı okunmaz. Sıra: **güvenlik ağı önce** (U13, hiçbir beyan susturamaz) → mini cut'ın tarihli bitişi → durum →
   gerisi (ön, deload merdiveni, omurga). Hasta haftanın kaçan seansları "aşırı antrenman molası"na (G7 K-70) dönmez.
4. **Duraklayan hafta (paused):** bir hafta (Pzt-Paz) herhangi bir günü beyan altındaysa ne on-track ne kaçırılmış sayılır:
   tutarlılık kaydında atlanır (af haftası yanmaz, seri bozulmaz — `Consistency.record`), kaçan plan haftası sayılmaz
   (`TrainingStatuses.weeksPlanMissed`, mola haftası gibi). Bu haftanın tutarlılığı `paused: true` taşır.
5. **3. ardışık duraklayan hafta:** check-in tek bir neden-gösteren soru sorar (`STATE_STILL`: "Hâlâ …?" YES/NO), haftalık soru
   bütçesinin içinde. NO → durum dün biter. Kötüye kullanım sınırı (L3 §4.2): ertelemek kullanıcının hakkı, değiştirmek değil (U2).
6. **Yeniden baseline için yeni kural yok:** 7+ gün sessizlikten sonra veri yeterliliği (H1 §3.4, `min_weighins_per_week`)
   pencerenin her haftasında tartı ister → karar kendiliğinden "henüz değil" bekler. Suçlamasız dönüş metni mobilde (K-518).
7. **Bekleyen (U14) → literatür taraması (K-524, ADR-041 #60, `arastirma/ham/H9-donus-minimum-doz.md`, 3 Eki):**
   - **Dönüş yükü — uygulanmaz** *(→ ADR-043 #75: ≥3 hafta molada ilk seans bir motor adımı geri — K-531 ile uygulandı: `engine/ReturnLoad`, okuma anında; aşağısı kayıt için)*. İlk seansın önceki yükün yüzde kaçı olacağını test eden birincil çalışma yok (H9 §5); tek sayılı
     reçete CSCCa/NSCA 2019 uzman konsensüsü, yük değil hacim/sıklık tavanı, rabdomiyoliz önleme amaçlı, kolej sporcusu (H9 §1.7);
     dolaşımdaki "%85-95" sayılarının birincil kaynağı yok (H9 §3). Birincil veri antrenmanlı gençte 14 günlük tam aranın 1RM'i
     anlamlı düşürmediğini (Hortobágyi 1993, Hwang 2017) ve kuvvetin 3 haftaya kadar korunabildiğini (McMaster 2013) gösteriyor →
     literatür kısa molada yükü düşürmeyi gerektirmiyor, uzun mola için sayı vermiyor. **Güray G7 K-72 kuraldır** ("molanın ardından
     tam yüke dönülmez; yavaş yavaş girilir") ve motorun bugünkü davranışıyla (yük düşürülmez) **çelişir**; U14'e göre Güray kazanır,
     ama K-72 miktar vermediği için uygulanamaz (K2: sayı uydurulmaz). Yani yükün korunması kaynaklı bir tercih değil, sayılı kural
     olmadığı için olan şey → **soru 60 dönüş yükü için açık kalır** (Levent: K-72'ye sayı mı, literatüre göre "yük korunur" mu).
     `SICK`/`PAIN` literatürün kapsamı dışında (sağlıklı-inaktif denekler; U6).
   - **Yoğun hafta minimum dozu — kural (K-524):** `BusyWeekDose` — haftada 1 seans, egzersiz başına 1 set, yük korunur
     (Bickel 2011 1/9 doz; Rønnestad 2011; Spiering 2021); `busy_min_older_age` (60) ve üstünde 2 seans × 2 set (düşük güven).
     Parametreler `training.yaml › busy_min_*`. Programa ve telefona bağlanması **K-528** (gösterim, öneri olarak — zorunluluk değil:
     iki haftalık ara bile 1RM düşürmüyor).
   Ağrıda bölgeye göre ilerleme kapısı (L3 §4.2) kabul kriterinde yok → ayrı iş.
8. **Mobil (K-518):** beyan ekranı (Bugün'den), durum sürerken hatırlatmalar susar (ADR-036 #7 `muted`), dönüşte suçlamasız
   karşılama.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Durumu profile alan olarak koymak | Geçmiş haftaların duraklaması için zaman aralığı gerekir; profil anlık durum |
| Pencereyi uzatmak (L3 Traveling) | Pencere uzunluğu kaynaklı (J1 D1); uzatma oranı kaynaksız |
| Yarım haftadan az beyanı saymamak | Eşik kaynaksız; "herhangi bir gün" kötüye kullanıma 5. madde ile sınır koyar (soru 61) |
| Duraklamayı telefonda saymak | Tutarlılık sunucunun (K-420); telefon yalnız gösterir |

## Sonuçlar
- Sözleşme: `/v1/state`, `DeclaredState`, `Consistency.paused`, `QuestionKind.STATE_STILL`.
- Göç V25 (`decision.declared_state`). `DecisionAccountData` silme ve dışa aktarmaya eklenir.
