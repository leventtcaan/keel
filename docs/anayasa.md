# Anayasa — değişmez kurallar

> Bir kural buraya **gerekçesi ve kaynağıyla** girer. Değiştirmek bir ADR ister ve yalnız Levent onaylar.
> Kod ve metin yazarken bu dosya bağlayıcıdır. Kısaltmalar: **U** ürün · **V** veri/gizlilik · **K** kod · **G** git.
> Kaynak yolları `arastirma/` altındadır.

---

## U · Ürün

**U1 · LLM karar vermez, sayı uydurmaz.**
Karar (kalori hedefi, program değişikliği, deload, faz geçişi) yalnız **karar motorundan**; tahmin (öğün kalorisi,
porsiyon) yalnız **veritabanı eşlemesinden**; LLM yalnız anlatır, soru sorar ve serbest metni yapılandırılmış veriye
çevirir — çıktısı şemaya karşı doğrulanır, doğrulanmayan çıktı atılır.
*Gerekçe:* sycophancy (ELEPHANT 2025: LLM'ler kullanıcıyı insanlardan +50 puan fazla doğruluyor; MedPRESS: tek
itirazda güvenli tavsiye %84,3 → %19,9) · maliyet · regülasyon · tutarlılık. Ham LLM kalori tahmini MAE 652 kcal,
veritabanı eşlemesiyle 171-191. *Kaynak:* `04-faz3-urun.md` §1, §8.2 · `ham/C-ai-koc.md` · `ham/I2-etkilesim-modeli.md`.

**U2 · Kararı ısrar değil veri değiştirir.**
Kullanıcı itirazı yeni veri içermiyorsa karar aynı kalır; cevap kararı tekrarlar, gerekçeyi söyler ve **neyin kararı
değiştireceğini** söyler. *Kaynak:* `04-faz3-urun.md` Ö-6.

**U3 · Her karar dört parçalıdır:** eylem · gerekçe (hangi veri, hangi kural) · güven düzeyi · sonraki değerlendirme
tarihi. **"Henüz karar yok, veri yetersiz" geçerli bir çıktıdır.** Bir seferde tek değişken değişir.
*Kaynak:* `03-guray-karar-omurgasi.md` §2.4 · `04-faz3-urun.md` Ö-1, Ö-25.

**U4 · Yağ yüzdesi sayısı hiçbir yerde gösterilmez.** Yağ oranı motorda yalnız görsel/bel proxy'siyle iç değişkendir.
Kapsam: uygulamanın her ekranı, bildirimi ve metni; kullanıcının istediği ham dışa aktarma dosyası bunun dışında (GDPR erişim hakkı — ADR-063 #1).
*Gerekçe:* yağ yüzdesi değişimi izlenemiyor (R² 0,23-0,25), yağ kütlesi izlenebiliyor (R² 0,75-0,86); Güray da sayı
vermiyor. *Kaynak:* `ham/H1-olcum.md` · `03-guray-karar-omurgasi.md` §8.

**U5 · Tahmin daima aralıktır** (öğün kalorisi, porsiyon, projeksiyon süresi). Hedef ve karar tek sayı olabilir.
Belirsizlik itiraf edilmez, **çözülebilir** kılınır: karar ver + güveni nicelle + tek dokunuşluk düzeltme sun.
*Kaynak:* `04-faz3-urun.md` Ö-12, §8.1.

**U6 · Tıbbi/klinik dil yok.** Teşhis, hastalık adı (insülin direnci dahil), "tedavi eder, önler, iyileştirir" yok.
Metabolik mantık motorda çalışır, kullanıcıya adı konmadan sunulur. Kan tahlili yorumlanmaz; doktora yönlendirilir.
*Gerekçe:* FDA General Wellness (6 Oca 2026), AB MDR Rule 11, Apple yaş derecelendirmesi. *Kaynak:* `ham/D-pazar-regulasyon.md`.

**U7 · Suçlama ve utandırma yok. Telafi mekaniği yok. Günlük sıfırlanan streak yok.**
Tutarlılık haftalık, kümülatif ve 1 hafta aflıdır ("12 haftanın 11'i"). Kaçan gün sessizce haftalık ortalamaya yayılır.
*Kaynak:* `04-faz3-urun.md` §5, §7.3 · `ham/I1-onboarding-aliskanlik.md`.

**U8 · Ölç sık, yorumla seyrek.** Günlük veri alınır; ilk 14 gün trend yorumu yok; kilo trendi 7 günlük gösterilir,
karar penceresi erkekte 2-3 hafta, kadında 28 gün (döngü gürültüsünü matematiksel olarak sıfırlar).
Değerlendirme penceresi 3 ay; karar penceresi 1-2 hafta; ikisi arayüzde ayrıdır.
İçe aktarılan geçmiş (Apple Health, Strong/Hevy) trendi hemen gösterir, ama ilk karar yine en erken ilk pazartesi check-in'de
gelir (ADR-018).
*Kaynak:* `03-guray-karar-omurgasi.md` §8 · `ham/J1-cinsiyet.md` · `04-faz3-urun.md` Ö-23.

**U9 · Veri talebi.** Sistem soru sormak için **sebep göstermek** zorundadır ve nedeni sorunun yanında yazar.
Haftalık soru bütçesi normalde ≤2, anomalide ≤5. Emin olunmayan alan önceden doldurulmaz.
*Kaynak:* `04-faz3-urun.md` §3, §8.5 (CAT: kazanç susmaktan gelir).

**U10 · Ses: isimsiz ürün sesi.** Karakter, isim, "AI arkadaşın" konumlandırması yok. Koç araçsaldır.
*Kaynak:* Levent kararı (29 Eyl) · `04-faz3-urun.md` §5.

**U11 · Global ürün.** Ulusal/yerel hardcoding yok. Arayüz yalnız İngilizce; metinler `data/copy/`'de.
*Kaynak:* Levent kararları (10 Eyl, 29 Eyl).

**U12 · Projeksiyon** yüzsüz parametrik şekildir: üç uyum senaryosu (%60/%80/%95) + aralık; yalnız ileri yönde
görselleşir; varsayılan kapalı; ilk 4 hafta / 2 ölçümden önce gösterilmez. Dışlama: 18 yaş altı · BMI<20'de zayıflama
yönü kapalı · SCOFF ≥2 → özellik hiç açılmaz. **Fotogerçekçi vücut/yüz üretimi yasak.**
*Kaynak:* `ham/H2-projeksiyon.md` (EU AI Act Md. 50, Apple 1.4.1).

**U13 · Güvenlik ağı önce çalışır.** Düşük enerji mevcudiyeti (RED-S/LEA) kontrolü her kalori kararından önce çalışır;
hard stop tetiklenirse kalori düşürme kararı verilmez. *Kaynak:* `ham/J1-cinsiyet.md` §RED-S (IOC 2023).

**U14 · Her motor kuralı kaynağa bağlıdır.** Kural = `arastirma/` dosyası + kural numarası + etiket
`[tecrübe]` / `[literatür]`. Kaynaksız kural eklenmez. **Çelişkide Güray Hoca kazanır; literatür yalnız boşluk
doldurur** (Levent kararı, 9 Eyl). *Kaynak:* `03-guray-karar-omurgasi.md` · `ham/guray/G1-G7`.

**U15 · Değer 1 haftada görünür.** Sonuç 4-8 haftada gelir; kullanıcı ilk hafta içinde "sistem planımı değiştirdi ve
nedenini söyledi" anını yaşamalıdır. Günlük sayı: **tutarlılık.** *Kaynak:* `05-faz4-pazarlama.md` §2 · Levent kararı (29 Eyl).

## V · Veri ve gizlilik

**V1 · Fotoğraf cihazda kalır.** Sunucuya yalnız türetilmiş değer gider. Analiz için dışarı çıkması gerekirse istemcide
≤1024 px'e küçültülür (görüntü maliyetinde %74 düşüş). *Kaynak:* `ham/H1-olcum.md` · `ham/K5-fiyat-kota-maliyet.md`.

**V2 · Üçüncü taraf AI'a veri, onaydan sonra.** Onay ekranı sağlayıcıyı adıyla ve gönderilen veri türünü söyler.
Onay yoksa çağrı yapılmaz. *Kaynak:* Apple App Review 5.1.2(i) (13 Kas 2025) · EU AI Act Md. 50.

**V3 · Sağlık verisi özel kategoridir** (GDPR Art. 9): kilo, ölçü, uyku, nabız, beslenme, fotoğraf. Ayrı ve açık rıza;
logda, hata izinde, analitikte **yok.**

**V4 · Sorulmayacaklar:** menstrüel döngü, doğum kontrolü, teşhis. Adet kaybı sorusu yalnız LEA bandında sorulur,
cevap **saklanmaz.** *Kaynak:* `ham/J1-cinsiyet.md`.

**V5 · Sır yok:** anahtar, parola, token repoya, prompta, loga girmez; ortam değişkeni ya da kasa.

**V6 · Silinebilirlik:** hesap silme kullanıcının tüm verisini uçtan uca siler.

## K · Kod

**K1 · Önce test.** Her kabul kriterine en az bir test. Test, kodun davranışına uydurulmaz. Geçmeyen testi silmek,
devre dışı bırakmak, beklentisini değiştirmek **sorulmadan yapılmaz.** Bekleyen spesifikasyon testleri `pending`
etiketiyle ayrılır (ADR-009); görevi başlatan ilk iş etiketi kaldırmaktır.

**K2 · Hardcode yok.** Eşik, pencere, oran, tarih, kimlik ve kullanıcıya görünen metin koda gömülmez →
`data/parameters/*.yaml`, `data/copy/en.json` ya da yapılandırma. Sihirli sayı ve geçici yama yok.

**K3 · Sözleşme önce.** API `contracts/openapi.yaml`'dan; mobil istemci tipleri üretilir, elle düzenlenmez.

**K4 · Küçük adım.** Bir görev = bir modül = bir dal, ≈≤400 satır (üretilmiş kod, lockfile, veri hariç).

**K5 · Gerekçesiz yapılmaz, bazıları hiç sorulmadan yapılmaz** (ADR-019):
- **Agent karar verir, PR'da gerekçe + alternatif yazar:** yeni bağımlılık · şema/migration · modül sınırı
  (`allowedDependencies`) · sözleşme. Kalıcı olanlar (şema, modül sınırı, sözleşme) ayrıca ADR.
- **Levent'e sorulur:** test silme · `main`'de force push ya da geçmiş yeniden yazma · dışarıya kullanıcı verisi
  gönderen komut · para · hesap/sır · mağaza yayını · sağlık/regülasyon · ürün kapsamı.

**K6 · Uydurma yok.** Kaynak, sürüm, API, parametre adı: kurulu sürümde ya da resmî dokümanda doğrulanır.
Doğrulanamayan `[doğrulanmadı]` diye işaretlenir ve söylenir.

**K7 · Basitlik.** İkinci kullanımı olmayan soyutlama kurulmaz.

**K8 · Dil.** Kod, tanımlayıcı, commit, API, log İngilizce · plan, araştırma, aktarım Türkçe · arayüz metni İngilizce.

**K9 · Kanıt.** "Bitti" demeden önce ilgili kontrol komutu çalıştırılır ve çıktısı gösterilir.

**K10 · Her değişiklikten sonra ≤5 satır:** ne değişti · neden · alternatif neydi · hangi test neyi kanıtlıyor ·
Levent'in kontrol etmesi gereken satır.

## G · Git

**G1** Kod `main`'e doğrudan girmez; dal `<modül>/<issue>-kisa-ad`; PR ile birleşir; onay Levent'te.
Plan ve doküman değişiklikleri `main`'e doğrudan girebilir.
**G2** Conventional commit + issue: `feat(engine): weekly decision spine (#12)`.
**G3** AI imzası yok, araç adı yok (commit, PR başlığı ve gövdesi).
**G4** Force push, dal silme, geçmiş yeniden yazma sorulmadan yapılmaz.
