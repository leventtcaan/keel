# Aktarım protokolü — Levent'in öğrenme standardı

> NutriScan'deki standardın keel'e uyarlanmış hali (kaynak: NutriScan `CLAUDE.local.md`, 28 Eyl 2026).
> Amaç "promptçu" değil **yetkin mühendis**: her satır ve karar anlatılabilir ve savunulabilir olacak. Hız bunun önüne geçmez.

## Temel
- **Seviye: her alanda sıfır** (Java/Spring, React Native/Expo, veri, LLM, DevOps). Seviye yalnız Levent'in beyanıyla ya
  da önünde ürettiği çıktıyla yükselir.
- **Kodu agent yazar ve bitirir.** Levent'in aksiyonu: kapsam/ürün, para, sağlık, veri paylaşımı kararları (ADR-019). PR'ı agent birleştirir; aktarım yine yapılır.
- **Terminoloji İngilizce kalır** (contract, endpoint, schema, test…); anlatım Türkçe; terim ilk geçtiğinde yanına kısa
  Türkçe açıklama.

## Üç aşamalı sıra (her görev)
1. **Ön aktarım** — koda geçmeden: bu görev projenin neresinde, neden şimdi; yazılacak kodun kavramları basitten başlayarak.
2. **Uygulama** — test önce, sonra kod.
3. **Referanslı son aktarım** — yazılanın üzerinden dosya dosya, tıklanabilir `dosya:satır` bağlantılarıyla.
   İş mantığında istisnasız **satır satır**; iskelet/yapılandırmada yalnız kritik kısım.

### Toplu mod (Levent kararı, 29 Eyl 2026 — M1'den itibaren)
Levent paralelde başka iş yaparken agent bir kilometre taşını baştan sona uygular; aktarım sonra, toplu yapılır.
- Ön aktarım **yazılı** hazırlanır: her görev için `docs/aktarim/<M>/<K-ID>.md` (basamak merdiveni, satır satır
  anlatılacak yerler, canlı kanıt, soru bankası). Koda geçmek için Levent'in "devam"ı beklenmez.
- Her görev kapanınca aktarım dosyası **gerçek `dosya:satır` referanslarıyla** güncellenir (birleşen koddan).
- Aktarım oturumu: Levent döner → merdiven sıfırdan, 2-3 basamak/mesaj, kendi cümleleri → Apple Notes (son adım).
- Hakimiyet ölçütü değişmez: birleşmiş kod, Levent anlatabilene kadar "aktarılmamış" sayılır (DURUM'da işaretli).

## Seviye merdiveni
- Önce **hedef ve basamaklar:** iş 10 üzerinden kaç seviyedeyse o seviyeye çıkan basamak listesi Levent'e gösterilir.
  Her basamak tek kavram, bir sonrakinin ön koşulu.
- **Basamak 0 = gündelik bilgi.** Somut örnek (gerçek dosya satırı, gerçek çıktı) kavramın adından **önce** gelir.
- Her basamağın beş parçası: ① ne (örnekle) ② hangi sorunu çözüyor ③ sektörde nasıl yapılır ④ bu projede nerede
  (`dosya:satır`) ⑤ **aktarım:** başka projede aynı amaca nasıl ulaşırım (kalıbın adı + 2-3 alan örneği).
- **Bir mesajda en fazla 2-3 basamak**; her parçanın sonunda "devam / burayı aç". Levent geçirmeden geçilmez.
- **Tek koşan örnek:** merdiven projedeki tek bir somut senaryo üzerine kurulur (ör. "kullanıcı pazartesi check-in yaptı
  → motor karar verdi → ekranda kart"). Önce senaryo uçtan uca izlenir, sonra çeşitlendirilir.
- Her 2-3 basamakta kısa **harita**; son basamaklardan biri **bütün resim** (diyagram + tek hikâye).
- Mümkünse **canlı kanıt:** kuralı bilerek bozup testin yakaladığını göstermek.

## Kapanış
Hedef seviyeye gelince: (a) tek paragraf bütün resim (b) soru bankası ve cevapları (mülakat, jüri, yatırımcı)
(c) projenin geri kalanıyla bağlantılar. Sonra **Levent kendi cümleleriyle anlatır**; ölçüt "karşıdaki anladı mı".
Kuramıyorsa eksik basamak aranır, aynı seviyeden yeniden anlatılmaz.

## Apple Notes — son adım
Merdivenin tamamı (basamaklar, şema, soru bankası) `ders-notu` standardıyla Apple Notes **Keel** klasörüne işlenir.
Aktarım bitmeden yazılan not merdivenle yeniden yazılır.

## Her mimari karar için üç cevap hazır
Neden bu · alternatifi neydi · neden o değil (ADR ile aynı).
