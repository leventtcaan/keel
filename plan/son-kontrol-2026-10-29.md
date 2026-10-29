# Evre 5 · Pazara çıkmadan son kontrol (29 Eki 2026)

Levent'in isteği (29 Eki): parçalar bitti; artık bütün satar mı, vaadi karşılıyor mu. Uygulamayı indirmiş, spora gidip gelen, yemek yiyen,
bazen unutan ya da eksik giren bir ABD'li kullanıcı gözüyle acımasızca yargıla: ihtiyaçlarını vaat ettiği ölçüde karşılıyor mu, UI çekici ve
modern mi, alıştığı uygulamalarla uyumlu mu, her işlev kolay mı, zamanla oluşan çıktı (haftalık karar) mantıklı ve işe yarar mı; indirme, dikkat
çekme ve ödeme noktası dahil. Web, ego, Reddit, X, YouTube taraması; ne gerekiyorsa yap. Sonra pazarlama ve kullanıcı geri bildirimiyle güncelleme.

## Bacaklar
1. **Pazar (araştırma, ego):** rakipler (vaat, fiyat, deneme, puan, şikâyetler, ekran görüntüleri) · kullanıcının sesi (Reddit, X, YouTube:
   işe aldıkları iş, bıkkınlıklar, neye para verir, kaçırılan gün beklentisi) · çıkış (abonelik ölçütleri, paywall, onboarding, ürün sayfası, ASO,
   ilk kanallar). Ham: `arastirma/ham/pazar-*-2026-10-29.md`.
2. **Persona yürüyüşü:** 4 haftalık zaman çizelgesi (tam hafta, unutulan günler, yarım öğün, atlanan antrenman, tatil haftası); her hafta uygulamanın
   gösterdiği ve verdiği karar; ekran ekran yargı (UI, UX, anlaşılırlık, güven, değer). Kanıt: gerçek sunucu + simülatör ekranları; zaman
   simülasyonu için geçmiş tarihli kayıt ya da motor senaryoları.
3. **Satış hunisi:** App Store ürün sayfası (başlık, alt başlık, ilk 3 ekran görüntüsü, anahtar kelime), onboarding → değer → paywall sırası,
   fiyat ve deneme, ilk açılıştaki "aha" anı.
4. **Düzeltme:** bulgular önem sırasıyla (P0 vaadi bozuyor · P1 güveni ya da ödemeyi bozuyor · P2 cila); her biri PR + test + simülatör kanıtı.
   Ürün, para ve marka kararları Levent'e (ADR-019): fiyat, deneme, mağaza metni.
5. **Build 8** → TestFlight → Levent cihazda (kamera dahil) → ASC gönderim (ELLE).

## Devam eden
- K-1055 (#656) fotoğraf akışı baştan: alt ajanda, prototip `prototip/yeniden-yapim.html` bölüm 10.
- ASC 1.0: build 7 bağlı, taslak, gönderilmedi (Levent durdurdu).

## Persona yürüyüşü — bulgular (29 Eki, öğleden sonra)
Persona: 30 yaşında ABD'li erkek, 5'10", 191 lb, masa başı iş, haftada 4 gün salon, hedef yağ kaybı, 1-3 yıl deneyim.
Gün 1: onboarding → plan → paywall, simülatörde sahte sunucuda (`keel-sim`, yeni `new-user` senaryosu; gerçek hesapta onboarding
yeniden açılamıyor). Sahte sunucu başlangıç kalorisini ve ilk kararı gerçek sunucu gibi üretecek biçimde yamandı; paywall gerçek
RevenueCat fiyatlarıyla. Haftalar 2-5: motor düzeneği GS-39 (#658, PR #659).

| # | Önem | Nerede | Bulgu | Öneri |
|---|---|---|---|---|
| 1 | P0 | This week, ilk karardan önce | Bir haftada 4'ten az tartı ilk kararı hafta 3'ten hafta 5'e atıyor (GS-39; kadında 4 → 6). İlk karar gelene kadar haftanın tartı sayısı hiçbir yerde görünmüyor (yalnız call ekranında "N more weigh-ins needed"); kart sadece "Weigh in most mornings." | Kararsız haftalarda kartta "Weigh-ins this week 3/4 · keeps Monday's call on time" + geride kalınca hafta içi tek hatırlatma. Prototip önce |
| 2 | P1 | Onboarding › Your plan | Yağ kaybı hedefinde asıl haber (kalori, ilk karar günü) 9 hareketlik listenin altında; protein hedefi yok | Üstte "Food to start 2,440 kcal · protein · First call Mon, Nov 2", antrenman 3 hareket + "and 6 more" |
| 3 | P1 | Onboarding › Working weights | 45 lb'den 5 lb adım, basılı tutunca hızlanmıyor, yazılamıyor: 185 lb bench = 28 dokunuş; çoğu kişi geçer | Kaydırmalı tekerlek (About you'daki gibi) ya da sayı klavyesi |
| 4 | P1 | Paywall | Örnek karar genel (2,050 → 1,800); kullanıcı az önce kendi 2,440'ını gördü | Üst kartta kullanıcının kendi başlangıcı + ilk karar günü (planPreview zaten taşıyor) |
| 5 | P1 | This week | "+" Food left kartının "Log" bağlantısını örtüyor (önceki not) | Kart içi boşluk ya da bağlantı solda |
| 6 | P1 | Progress › Photos | Silme onayı sistem uyarısı değil (ADR-087 ile tutarsız), "Keep them" sekme çubuğunun altında | Sistem uyarısı |
| 7 | P1 | Food search | OFF'ta akla yatmayan enerji (Lezita chicken 397-531 kcal) | Makul aralık dışı sonuçları alta it ya da işaretle |
| 8 | P2 | Meal edit | Düzeltme ekranında düğme "Log it" | "Save" |
| 9 | P2 | Onboarding › Goal | İlk soruda belirgin "Sign out", alt yarı boş, sorulardan önce değer vaadi yok | Sign out küçük metin bağlantı; başa tek değer ekranı (prototip) |
| 10 | P2 | Onboarding ilerleme çubuğu | Goal'den sonra parça sayısı 7'den 8'e çıkıyor | Sayı baştan sabit |
| 11 | P2 | Onboarding › Days | 3 önceden seçili, Continue yok (3 isteyen yeniden dokunmalı); 6 gün yok | Önseçim yok ya da Continue; 6 gün ürün kararı |
| 12 | P2 | Plan, Today | Chest-supported row simgesi dişli (ayar simgesi) | Doğru ekipman simgesi |
| 13 | P2 | Plan | Hayatındaki ilk antrenman "Upper B" | İlk seans A'dan başlasın ya da adsız "Upper" |
| 14 | P2 | About you | Geliştirme uyarısı: VirtualizedList ScrollView içinde | Tekerlekleri düz listeye al |
| 15 | P2 | Today's food, Progress | Tekrarlanan öğün gruplanmıyor; fotoğraf kartında son küçük resim yok (önceki not) | — |

Doğrulanan, sorun yok: birim varsayılanı cihaz bölgesinden (US → Imperial; simülatör en_TR olduğu için Metric açılıyordu) · sağlık
verisi onayı açık ve kısa · plan "Your scale corrects it in 14 days" ile dürüst · paywall: haftalık karar örneği, "A Monday call, with
the reason", zaman çizelgesi (bugün ücretsiz, 10 Kas hatırlatma, 12 Kas ücret), 2 hafta deneme, $59.99/yıl, $12.99/ay · Apple
Health'ten gelen tartılar karara sayılıyor (akıllı tartı kullanıcısı için unutma riski düşük; içe aktarılan eski geçmiş sayılmıyor).
Yürünmedi: hafta 2-4 ekranları keel-sim senaryolarında (karar durumları önceki turlarda yürünmüştü); gün 1 içi kayıt akışları bugünkü
QA turunda gerçek sunucuda yürünmüştü.
