# ADR-071 · Faz 5 Part 3 cevapları: 2 haftalık deneme, telafinin tanımı, rekabet yok, pazarlama sonra, kalıcı logo, kardiyo kaynağı, 3 gün tabanı
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (AskUserQuestion, üç tur); öneren: agent

## Bağlam
Prototip tur 3 onaylandı (`plan/faz5-rota.md` §8). Açık kalanlar: deneme süresi (para), Meta App ID zamanı (hesap), `arastirma/06-faz5-yuz.md`
§7'nin B1, B3, B9, B12 adayları. ADR'leri yazarken iki kaynak çelişkisi daha çıktı: prototipin kardiyo varsayılanı ve 1. hafta ayarının
gün sayısı.

## Karar
1. **Deneme 2 hafta** (ADR-058 Ek 1). App Store yalnız sabit süre kabul ediyor (3 gün, 1 hafta, 2 hafta, 1-2-3-6 ay, 1 yıl; Apple,
   "Set up introductory offers", 7 Eki'de doğrulandı). "İlk karar + 3 gün" niyetini karşılayan en kısa sabit süre 2 hafta: ilk pazartesi kararı en
   geç 7. günde, ücrete en az 4 gün kalır.
2. **Meta App ID (Instagram Story) Story görevine gelince** açılır (Levent). O zamana kadar paylaşım sistem sayfasıyla çalışır (ADR-076).
3. **B1 · U7'nin "telafi"si:**
   - **Yasak:** kaçırılan seansı sonraki haftaya ek yük olarak bindirmek; seriyi parayla ya da ek eylemle geri satın aldırmak.
   - **Serbest:** geri döneni olumlu karşılamak (M3: +%27, n=61.293); geç girilen kaydı kendi haftasında saymak (Levent, tur 3); seansı aynı
     hafta içinde başka güne taşımak.
   - Uygulama: oturum haftasını `startedAt` belirler; "sonra doldur" ve geriye tarihli kayıt o haftayı sayar (ADR-075).
4. **B3 · rekabet v1'de yok.** Lider tablosu, rütbe, başkasıyla kıyas yok; kıyas yalnız kişinin kendi geçmişiyle ("geçen seferi geç", rekor).
   İsteğe bağlı arkadaş grubu v1.x adayı (Levent: "güzel özellik, sonradan eklenebilir"); gerçek kullanıcı verisinden sonra ayrı ADR.
5. **B9 · pazarlama sonra, birlikte.** Levent: içerik AI ile üretilir (Higgsfield) ve Levent'in kendi YouTube kanalından; "kullanıcı bazında
   risk almayız". Önerilen anayasa maddesi (U16: kullanıcı verisi ve içeriği reklamda yok, önce/sonra beden yok, AI içerik etiketli) **eklenmedi**:
   Levent "pazarlama noktasını Apify entegre raporlarımızla beraber düşünürüz, şu an gerek yok" dedi. Bu turdan bağlayıcı olan yalnız Levent'in
   kendi ifadesi: **kullanıcı verisi ve içeriği pazarlamada kullanılmaz**. Apple 5.1.3(i) (sağlık verisi pazarlamada yasak) ve U4, U6 zaten
   geçerli. Meta'nın kilo verme reklamlarında önce/sonra görsel kuralının güncel hâli `[doğrulanmadı]` (resmî sayfa 7 Eki'de 404; bir üçüncü
   taraf Temmuz 2026'da gevşediğini yazıyor); pazarlama turunda yeniden bakılır.
6. **B12 · paylaşım imzası:** çıkartmada ürün logosu **her zaman** görünür, kapatılamaz (Levent: "bir marka olduğumuzdan kullanıcılar ekli
   paylaşmak isteyecek"; Strava'yı reels ve story'lerden tanıması örneği). Otomatik paylaşım yok: her paylaşım kullanıcının dokunuşuyla.
   Logo henüz belli değil (K-1001); o zamana kadar kelime işareti.
7. **Kardiyo varsayılanı Güray'ın solo kaynağından + kullanıcı özgürlüğü** (ADR-074). Prototipin "2 × 30 dk"sı YAG25 podcast'indendi;
   `arastirma/ham/guray/G2-kilo-verme.md` başlığı YAG25'in konuşmacısının belirsiz olduğunu ve kurallarının "Güray'ın kuralı olarak koda
   gömülmemesi" gerektiğini söylüyor. Solo kaynak KRD24 (G2 K-32, K-35, K-36): yağ kaybında haftada 3-5 gün, ağırlıktan sonra en fazla
   20-30 dk, off gün tam off. Kullanıcı süreyi, günü değiştirir ya da kaldırır.
8. **Motor 3 günün altını önermez** (G6 K-36: "4-5 ideal, 3 taban"; G7 K-79 aynı tabanı bağımsız kaynakla doğruluyor). 2 gün yalnız
   kullanıcının kendi seçimi (onboarding ve "Change it"). 1. hafta ayarı (B4) kaçan seansı uyan bir güne taşır; "3 değil 2 gün" önerisi kalkar
   (ADR-077). Ayrıca 3'te 2 (%67) Güray'ın "önce uyumu çöz" eşiğinin (%50) üstünde; o eşik bu örneği zaten tetiklemiyordu.

## Neden
Madde 1-6 Levent'in cevabı. Madde 7-8 U14: "çelişkide Güray kazanır"; tur 3'te iki varsayılan yanlış kaynağa dayanıyordu, düzeltme Levent'in
"Güray'ı dinle" kararının doğru uygulanması.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| 1 hafta deneme (ADR-058 olduğu gibi) | Pazartesi kaydolan kişide ilk karar ücret sabahına düşer |
| Kapatılabilir logo | Levent: marka büyümesi; otomatik paylaşım olmadığı için Runna'nın şikâyet konusu durumu oluşmuyor |
| Kardiyoda 2 × 30 (ürün kararı etiketiyle) | Levent Güray solo varsayılanını seçti |
| 2 gün önerisini korumak | Güray tabanı 3; Levent önerilen yolu seçti |

## Sonuçlar
- Prototipte değişen: kardiyo satırları (örnek kişi 3 × 30 dk), 1. hafta kararı ("Move Wednesday"), hoş geldin örneklerinden "2 days, not 3",
  program incelemesinde hamstring örneği (G1 K-11: alt sınır 4 set, "4 set aralığın altında" değil; ADR-073). Kod session'ı prototipteki
  değil bu ADR'lerdeki değeri uygular.
- Para: App Store Connect'te tanıtım teklifi 2 haftaya alınır (Levent, hesap).

## Geri dönmenin maliyeti
Düşük: deneme süresi App Store Connect'te; kardiyo ve gün tabanı parametre.

## Etkilenen
ADR-058 (Ek 1), ADR-054 (→ ADR-076), ADR-073, ADR-074, ADR-075, ADR-077, `docs/anayasa.md` (U7 açıklaması), `data/parameters/`
(training, cardio), App Store Connect (Levent).

## Doğrulama
U7 açıklaması anayasada · paywall zaman çizelgesi testi 2 hafta (RevenueCat `introPrice`'tan) ·
`Consistency` testi: geriye tarihli oturum kendi haftasını sayar · motor testi: önerilen gün sayısı hiçbir girdide `training_days_min`'in altına
inmez.
