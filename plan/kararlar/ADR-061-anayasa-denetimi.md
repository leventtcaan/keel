# ADR-061 · Anayasa denetimi tek komut, mağaza metni taslağı veri dosyasında (K-804, K-813)
- **Durum:** KABUL (agent, teknik — ADR-019)
- **Tarih:** 2026-10-05 · **Karar veren:** agent

## Bağlam
U4 (yağ yüzdesi sayısı yok), U6 (tıbbi dil yok), kişi adı yok (K-523) ve K2 (hardcode yok) bugün üç yerde denetleniyor: mobil Jest
(`forbidden-phrases.test.ts` — `en.json` + yasal sayfalar; `copy-literals.test.ts` + `scanners.test.ts` — koddaki ham metin/renk), sunucu
mimari testleri (`app.keel.architecture.*` — kişi adı, parametre kökeni, sır ortamdan) ve envanter testi (`tools/test_veri_envanteri.py`).
Hepsi CI'da koşuyor ama "anayasa denetimi" diye çalıştırılabilen tek bir şey yok; mağaza metni (App Store açıklaması) hiç yok, dolayısıyla
taranmıyor. Ayrıca expo-router'da `Stack.Screen` ile bir korumalı gruba (`Stack.Protected`) konmayan bir rota dosyası **korumasız**
kayda girer — oturumsuz açılabilir; bunu yakalayan test yok (M7'den devreden madde). Telefonun kv anahtarları envantere bağlı değil
(M8 Part 1 test analizi, puan 6).

## Karar sürücüleri
- Kural tek yerde uygulanır (K7): yasaklı ifade desenleri JS'te bir kez çalışır; ikinci bir dilde aynı tarayıcı yazılmaz.
- Mağaza metni de ürün metnidir: aynı kurallar, Apple'ın uzunluk sınırları, kişi adı yok, ürün adı yok (M10).
- Denetim tek komutla yerelde koşar; CI'da her parçası zorunlu bir kontrolün içinde kırmızı olur.
- Denetime yeni bir tarama eklendiğinde komuttan düşmesi mekanik olarak yakalanır.

## Karar
1. **Mağaza metni taslağı `data/copy/store.en.json`** — `subtitle`, `promotionalText`, `description`, `keywords` (ürün adı yok, M10'da gelir).
   Apple'ın sınırları dosyanın `limits` alanında, kaynağıyla (developer.apple.com/help/app-store-connect/reference/app-information/…,
   2026-10-05): ad ve alt başlık 30 karakter, tanıtım metni 170 karakter, açıklama 4000 karakter, anahtar kelimeler 100 bayt.
   Taslak — ASO (anahtar kelime seçimi, yerelleştirme) M10'da.
2. **Tarama:** `forbidden-phrases.test.ts › store texts` mağaza metnine U4/U6 kurallarını, kişi adı desenini ve sınırları uygular
   (`en.json`'daki gibi, yasal sayfalardaki olumsuzlama istisnası **yok** — pazarlama metni "not a medical device" demek zorunda değil).
3. **Tek komut `tools/anayasa-denetimi.sh`:** sırayla envanter testi, mobil denetim takımları (Jest, adlarıyla), sunucu mimari testleri
   (`./gradlew test --tests 'app.keel.architecture.*'`, DB yok). Bir parça kırmızıysa komut kırmızı. **CI:** her parça zaten zorunlu
   bir işte koşuyor (Tooling, Mobile, Backend); ayrıca Tooling `tools/test_anayasa_denetimi.py`'yi koşar: komutun listelediği her Jest
   dosyası var, ve `data/copy/forbidden-phrases.json`'ı ya da kaynak tarayıcılarını (`support/sourceScan`) okuyan her Jest dosyası
   komutta listeli — yeni bir anayasa taraması komuttan düşemez.
4. **Rota koruması:** `routes-protected.test.ts` — `src/app` altındaki her rota (dosya ya da grup klasörü) kök `_layout.tsx`'te tam
   bir `Stack.Screen` olarak ve bir `Stack.Protected` içinde; korumasız tek istisna yok (giriş ekranı da `!signedIn` korumalı).
5. **Telefon anahtarları (K-813):** envanterin `phone.stored` kayıtları kullandıkları kv anahtarlarını listeler; test telefon kodundaki
   her kv okuma/yazma çağrısının anahtarını (AST ile) envanterle iki yönlü karşılaştırır.

## Neden
- Python'da ikinci bir tarayıcı (CI Tooling'de Node yok) desenlerin iki regex motorunda farklı davranma riskini getirirdi; tek uygulama
  Jest'te kalır, komut onu çağırır.
- Mağaza metni `data/copy/`'de: arayüz metniyle aynı kurallar, aynı yer (U11, K2); `docs/` altında Markdown olsa tarayıcının ayrı ayrıştırıcısı gerekirdi.
- Yeni zorunlu CI kontrolü eklemek dal koruması ayarını değiştirmeyi gerektirirdi; mevcut işlerin içinde kalmak yeter.

## Alternatifler ve neden o değil
- **Ayrı "Constitution audit" CI işi:** Node + Java kurulumunu tekrarlar (~3 dk), dal korumasında yeni zorunlu kontrol ister. Değeri yok:
  parçalar zaten kırmızı oluyor.
- **Mağaza metni M10'a kadar yok:** denetim boş bir hedefi tarardı; M10'da metin yazılınca kural sonradan bağlanırdı.

## Sonuçlar
- `npm run check` ve `./gradlew build` değişmez; anayasa denetimi ayrıca adıyla koşulabilir.
- Mağaza metni değişince aynı PR'da tarama koşar; Apple sınırı aşılırsa CI kırmızı.

## Geri dönmenin maliyeti
Düşük: bir betik, bir veri dosyası, iki test.

## Etkilenen
`data/copy/store.en.json`, `apps/mobile/src/__tests__/forbidden-phrases.test.ts`, `routes-protected.test.ts`, `tools/anayasa-denetimi.sh`,
`tools/test_anayasa_denetimi.py`, `.github/workflows/ci.yml` (Tooling), `docs/yasal/veri-envanteri.json` (K-813).

## Doğrulama
`tools/anayasa-denetimi.sh` yerelde yeşil; bir mutant (mağaza metnine yasaklı ifade, korumasız rota, listeden düşen tarama) kırmızı.
