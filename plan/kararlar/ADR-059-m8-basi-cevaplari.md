# ADR-059 · M8 başı cevapları: hukuki inceleme yok, soru 57, yasal metinler GitHub Pages'te, ASC ve vergi sonra
- **Durum:** KABUL (Levent, 2026-10-04)
- **Tarih:** 2026-10-04 · **Karar veren:** Levent (öneren: agent)

## Bağlam
M8 Part 1 (`plan/oturum-promptlari/M8-part1.md` 0a) yasal ve mağaza kapısını toplu sordu: yasal metinlerin hukuki incelemesi kimde,
soru 57 (sağlık rızası metninin ilk cümlesi antrenman kaydını "health data" sayıyor, ADR-007/K-429 saymıyor ve rıza geri çekilince
silmiyor — metin kendi içinde çelişiyor), gizlilik politikası ve kullanım şartlarının herkese açık adresi (App Store + paywall, ADR-057
D3: `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`; ikisi yoksa satış yok ve zorunlu paywall kapısı açık — ADR-058), App Store
Connect beyanları, mali müşavir (K-805), disk.

## Karar sürücüleri
- Ürün/hukuk/para kararı Levent'in (ADR-019); agent hukuki ya da vergisel hüküm vermez.
- Adres yoksa paywall satmaz ve dış TestFlight'a gizlilik politikası adresi verilemez.
- Para gerektirmeyen, yeni hesap açtırmayan geçici çözüm; ürün adı (M10) gelince yalnız yapılandırma değişir.

## Karar
1. **Hukuki inceleme yok (Levent):** "Agent'a güveniyorum, ekstra incelemeye gerek yok." Agent metinleri resmî kaynaklardan (GDPR
   metni, Apple'ın yönergeleri ve App Privacy sayfası, sağlayıcıların politika sayfaları — bağlantı + tarih) ve koddan türetilmiş veri
   envanterinden yazar; metinler yayımlanır ("Last updated" tarihiyle), "taslak" etiketi taşımaz. Agent "uyumlu" demez: metinlerin
   avukattan geçmediği bu ADR'de ve DURUM › Riskler'de yazılı kalır.
2. **Soru 57 — metin koda uyar:** sağlık rızasının ilk cümlesi ADR-007/K-429'un sınıflamasına göre yazılır (antrenman kaydı rızanın
   kapsamı dışında, geri çekmede silinmez); rıza metninin sürümü artar. Gizlilik politikası aynı sınıflamayı kullanır.
3. **Yayın yeri — bu repodan GitHub Pages (geçici):** politika ve şartlar `https://leventtcaan.github.io/keel/...` altında. Adreste GitHub
   kullanıcı adı ve kod adı görünür (Levent kabul etti); M10'da alan adı gelince yalnız `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`
   ve mağaza kaydı değişir. Pages'i agent açar (Levent'in onayı bu ADR). Teknik biçim (hangi klasör yayımlanır, nasıl derlenir) agent'ın
   kararı → K-801 PR'ı.
4. **App Store Connect beyanları M10'a:** agent App Privacy etiketi ve yaş derecelendirmesi cevaplarını envanterden gerekçeli taslak olarak
   şimdi hazırlar (K-803); ASC'ye girmek M10'da (Levent). Dış TestFlight'ın (M9) neyi istediği M9 başında doğrulanır.
5. **Vergi (K-805) satıştan sonra:** "Bir satsın, o zaman düşünürüz" — mali müşavir görüşü için madde/liste açılmaz; K-805 M11'e taşınır.
   Tek olgu kayda geçer (Apple, *Sign and update agreements*, 2026-10-04): "To sell your apps on the App Store or offer In-App Purchases,
   the Account Holder must sign the Paid Apps Agreement." — sözleşme ve ASC'nin istediği banka/vergi bilgisi ilk satıştan önce gerekir;
   bu zaten mağaza kurulumunun parçası (ADR-012 Ek 1, Levent), ayrı iş açılmaz.
6. **Disk:** Levent'in onayıyla Docker budandı (durmuş konteynerler, build önbelleği, kullanılmayan imajlar, anonim volume'lar; başka
   projelerin adlandırılmış veritabanı volume'ları **silinmedi**). Disk 1,5 → 20 GB.

## Neden
- 1: Levent'in kararı; bedeli aşağıda açık.
- 2: Kendi içinde çelişen rıza metni (bir cümle "sağlık verisi" diyor, öbürü geri çekmede silmiyor) kullanıcıyı yanıltır; kod ve ADR-007
  doğru kabul edilir (M8.md: "envanterle kod çelişirse kod doğrudur, metin düzeltilir").
- 3: Repo zaten public (ücretsiz Pages), yeni hesap ve para yok; adres yapılandırmadan okunduğu için değişimi ucuz.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Avukat incelemesi (M9 ya da M10 öncesi) | Levent seçmedi |
| Antrenmanı da sağlık verisi saymak | Rıza geri çekilince antrenman kaydı da silinmeliydi → ADR-007 ve kod değişirdi |
| Ayrı GitHub organizasyonu + Pages | Yeni hesap (Levent'in işi); adresin kişi adı taşımaması tek kazanç |
| M10'a kadar adres yok | Paywall satmaz, zorunlu paywall kapalı, dış TestFlight bloklanır |

## Sonuçlar
- Olumlu: paywall ve kapı yasal bağlantılarla çalışabilir; metinler koddan türetilmiş envantere testle bağlı (K-801).
- Olumsuz (kabul edilen bedel): metinler hukukçudan geçmedi — sağlık verisi (GDPR Md. 9) ve AB kullanıcısı varken hata riski Levent'te.
  Adreste kişisel kullanıcı adı görünür (M10'a kadar).

## Geri dönmenin maliyeti
Düşük: avukat incelemesi her an eklenebilir; adres yapılandırmada; K-805 tek kart.

## Etkilenen
K-801, K-803, K-805 (M11), K-806; `data/copy/en.json` (sağlık rızası metni); `apps/mobile` yapılandırması (`EXPO_PUBLIC_*_URL`); repo ayarı
(Pages); DURUM › Riskler.

## Doğrulama
K-801 PR'ı: envanter testi (göçlerdeki her tablo envanterde, envanterdeki her tablo göçlerde), yasaklı ifade taraması metinlerde, yayımlanan
adresler HTTP 200, paywall yapılandırması iki adresi okuyor.
