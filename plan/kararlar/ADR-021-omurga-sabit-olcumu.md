# ADR-021 · Haftalık omurga: "sabit" ve "bekle" nasıl ölçülür
- **Durum:** KABUL (teknik, agent — ADR-019) · **ADR-027:** madde 2 değişti (K-64 beklemesi herkese, K-223), madde 4 kalıcı
- **Tarih:** 2026-09-29 · **Karar veren:** agent

## Bağlam
K-106 (Güray'ın haftalık ağacı, 03 §2.4) ADR-020'nin L-5/L-6/L-9/L-10 kararlarıyla yazılırken dört uygulama sorusu çıktı.
İlk sürüm G2 K-64'ü ("tek haftalık durgunluk plato değildir") penceyi haftalık kaydırarak uyguladı; inceleme bunun kalori
kararını bir hafta **geciktirdiğini** gösterdi: 21 günlük pencere 14 gün arayla iki haftayı karşılaştırdığı için pencere
ancak ~2 sabit haftadan sonra "sabit" okunuyor; üstüne bir hafta beklemek G2 karar tablosunun "2+ hafta sabit → harekete
geç" ve G3 K-10'un "2 hafta artmadıysa +250" kurallarıyla çelişiyordu.

## Karar
> **ADR-027 #0 güncellemesi (K-223):** penceresi paydan dolayı "sabit" okunan yavaş kaybedende de K-64 işler. Haftalık
> adım payı = `flat_margin_kg` ÷ haftalık adım sayısı (erkek 0,29, kadın 0,19 kg; parametrenin "≈0,3 kg/hafta hareket"
> notuyla aynı türetme). Cut'ta: bu haftanın adımı payı bulduysa ve önceki hafta bir yükseliş değilse → hedef yönde
> (devam); yalnız önceki adım bulduysa → ilk sabit hafta, bekle; ikisi de küçükse plato → madde 2'deki kalori kuralı.
> Sonuç: haftada 0,5 kg veren erkeğin tek sabit haftası artık kesinti değil (GS-24), 0,29 kg/hafta düzenli kayıp
> "devam" (GS-23).

1. **Sabit hafta sayısı:** karar penceresinin haftalık ortalamaları (erkek 3, kadın 4); son haftaya `flat_margin_kg`
   içinde kalan **ardışık önceki hafta** sayısı. 1 = "bir haftadır aynı", 2 = "iki haftadır aynı".
2. **Bekleme:** pencere hedef yönde değilse — cut: sabit hafta ≤ `flat_wait_weeks` (1) ve bel yukarı gitmiyorsa bekle;
   bulk: sabit hafta < `bulk_stall_weeks` (2) ise bekle; aksi hâlde kalori. **Ters yön (pencerede ya da bu hafta pay
   ötesinde) bekleme değildir**, hemen kaloriye gider (K-64 bir durgunluk kuralıdır). Bel koşulu yalnız cut'ta (K-64);
   G3 K-10'da bel yok. Sonuç: erkekte 21 günlük pencere, net bir düşüşten sonraki tek sabit haftayı zaten "hareket"
   okur — K-64 yapısal olarak sağlanır; açık bekleme kadında ve pencerenin içinde yakın zamanda düşüş olan durumlarda çıkar.
3. **Düz bulk'ta antrenman kapısı yok:** ağacın "hedef yönde değil" dalı yalnız "kaloriyi ayarla" der; antrenman kırmızı
   alarmı (G7 K-98, G2 karar tablosu) cut kuralıdır. Duran bulk G3 K-10 ile kalori artırır.
4. **(ADR-027 #4 ile kalıcı)** Görünüş SAME ya da UNKNOWN (bu hafta fotoğraf yok) → devam. Ağaç "daha iyi mi?" diye sorar; "aynı"yı
   "hayır" saymak, fotoğrafın 4 haftada bir anlamlı fark gösterdiği bir üründe (H1 §2.5, LSC 1,2-1,5 kg) neredeyse her
   hafta "genetik limit → kaloriyi geri çek" üretirdi. Devam, kaloriyi değiştirmeyen taraftır. **Levent'e soru**
   (DURUM › sorulacaklar); cevap gelince bu madde güncellenir.
5. **Kalori her dalda ancak plana uyulduysa oynar** (G2 K-60): genetik limit dalında da uyum kapısı çalışır.
6. **Eksik sinyal hangisiyse o sorulur:** `check_in_needed_training` / `_recovery` / `_adherence` (U2, U3: hangi cevabın
   kararı açacağı söylenebilsin).

## Neden
Kaynaklara sadakat (G2 karar tablosu, G3 K-10, K-64'ün "bel ve kilo sabit" koşulu), ölçülebilir tanım (L-10'un payı
iki haftalık ortalamayı karşılaştırmak için türetildi — aynı test komşu haftalara da uygulanır), gereksiz gecikme yok.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Pencereyi haftalık kaydırıp "önceki pencere hareketliydi" (ilk sürüm) | Hızlı düşüşten sonra kararı bir hafta geciktirir (erkekte 3, kadında 4 sabit hafta) |
| Son haftayı öncekiyle tek adımda karşılaştırmak, hedef yöndeki pencerede de "bekle" demek | 0,3-0,5 kg/hafta kaybeden herkes her hafta "durdu" mesajı alır (tek adım payın altında) |
| Beklemeyi tamamen kaldırmak | Kadın penceresinde ve pencere içi dalgalanmada K-64'ün korumasını kaybeder |

## Geri dönmenin maliyeti
Düşük: `WeeklySpine.Window` içinde iki fonksiyon ve iki parametre.

## Etkilenen
`engine/WeeklySpine.java`, `WeeklySpineTests`, spesifikasyon WC-08 (kadın penceresinde gerçekleşir, K-112).
