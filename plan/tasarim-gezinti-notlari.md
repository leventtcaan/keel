# Tasarım gezintisi notları (Levent, 25 Kas 2026, simülatör)

**Karar (Levent):** 1.0.1 tasarım bitene kadar çıkmaz: "içimize her noktası sinmeden çıkarmayalım". Production derlemesi ve TestFlight bekler.
Gezinti bitince bu notlar tek bir tasarım işine dönüşür: görsel yön araştırması → 2-3 yön (taslak) → Levent seçer → bütün uygulamaya.

## Durak 1 · Ana ekran (Bu hafta)
- **Kalan yiyecek kartı sağda boşluklu.** Neden: kartın sağına "+" düğmesi için sabit pay (`FoodLine.tsx › clear: paddingRight: PLUS_GUTTER`); düğme kartın
  üstünde olmasa da duruyor. Her telefonda var. Çakışmanın yaması, tasarım değil → düzelt.
- **Gün şeridi** (tik, nokta, boş daire): yalnız haftayı sayıyor; nerede olduğumu, nereye gittiğimi söylemiyor, insan psikolojisine dokunmuyor, teşvik
  etmiyor. Daha modern ve bize özgü olmalı.
- **Güne basınca açılan hareket listesi**, sağdaki tekrar ve kg sayıları: tasarım olarak zayıf.
- **Karar kartı ("DAHA ÇOK HAREKET"):** beyaz zemin üstünde siyah kart + cırtlak turkuaz, bu yapıya çok sert. Altındaki yazılar motomot olmamalı.
  Rakip araştırmasına (Antigravity) yeniden bakılmalı.
- **Karar detay sayfası** (karta basınca): ekran olarak çok zayıf. "Daha düşük hedef antrenman yakıtını sıkıştırır" gibi saçma cümleler yerine tasarımı
  güzel bir sayfa. (Not: bu cümle onay sayfasında "onaylanan" Türkçe maddelerdendi; onaylar gezinti sonrası yeniden ele alınacak.)
- **"Bu kararı sor" → koç sohbet ekranı** ve alttaki klavye düzeni: hiç uğraşılmamış, çok zayıf.
- **Bugün › antrenman (Alt vücut A):** fena değil, daha iyi yapılabilir.
- **Genel:** ilk açılış vurucu değil; renkler rahatsız edici; görünüş zayıf. Bu sayfa kesinlikle iyileşmeli, bütüne bağlı olarak diğer sayfalardaki
  ilgili kısımlar da.

## Durak 2 · Antrenman sekmesi
- **Renkler:** yine en rahatsız eden nokta; inanılmaz tutarsız ve itici ("biz nasıl onayladık bu renkleri").
- "+" düğmesi "Kardiyo, hafif" satırının değerini örtüyor (agent gördü).
- Başka rahatsız eden yok.

## Durak 3 · Antrenman akışı (Levent kendisi yürüdü)
- **"Yedek tekrar" → "cepte kalan tekrar"** daha iyi tanım.
- **Daha fazla › Nasıl yapılır:** hareket döngüsü çok iyi; çalışan kaslar fena değil; **"Kurulumun" bölümü anlaşılmıyor**.
- **Geçmiş sayfası** çok vasat; çok çok fazla yazı, kayıt geldikçe uzayıp gidiyor. Yerine daha temiz, grafiksel: sete girmeden "kaç yaptım, kaç yapacağım,
  iyi noktada mıyım" hissi.
- **"Değiştir", "Dolu", "Çok ağır mı" ve diğer düğmeler:** kullanıcı bazlı ve senaryo içinde düşünülmeli: ne zaman tetiklenir, ardındaki mantık doğru mu?
  Örn. "çok ağır mı" 1-2 denemeden sonra da, seti attıktan sonra hissiyatla da denebilir. **Not** neye yarıyor, bir yere bağlanıyor mu? Bütün düğmeler
  bütün varyasyon ve senaryolarda mantıklı, sonrası akılcı hesaplanmış ve öngörülmüş olmalı. **Bir yere bağlanmıyorsa o kadar alan verilmemeli.**
  Bazıları ücretli üyeye kilitli olabilir (ardı zeki kurgulanırsa).
- **Dinlenme:** erken "Hazır"a basıp sete girersem bu da kayıt olarak alınabilir; kullanıcı sonra olumsuz bir şeyle gelirse (ör. yorgunluk) bununla bağlanır,
  düzeltilebilir bilgi.
- **Süperset:** çıkan düğmeler çok zayıf, görünüş daha güzel kurgulanmalı. Süperset ardı ardına demektir, **arada dinlenme olmamalı**.
- **"Formun nasıldı" / hissiyat:** yüzdesel çok şey söylemese de (kişi farklı hissetse de hipertrofi olur) "yapıldı" olarak görmek değerli. Ama formu
  **antrenman sonunda sormak saçma**: her hareketin formu sonda hatırlanmaz.
- **Antrenman tamam sayfası:** fena değil, UI ve görünüş desteklenmeli, denetlenmeli. **Paylaş** kesinlikle daha pazarlanabilir hale gelmeli (oluşturma).
  **Alttaki düğmeler felaket vasat.**
- Genel: her şey tane tane, sakin sakin ele alınarak iyileştirilmeli.
- Agent: düğmelerin gerçekte ne yaptığı, nereye yazdığı, kimin okuduğu denetimi alt ajanda (`workout-controls-audit.md`, tasarım girdisi).

### Düğme denetimi (alt ajan, agent iki kritik bulguyu kodda doğruladı) · tam metin `plan/tasarim-antrenman-dugme-denetimi.md`
| Düğme | Nereye yazar | Kim okur | Hüküm |
|---|---|---|---|
| Çok ağır mı? | hiçbir yere (yalnız alandaki kilo) | yok | kendi çıktısı yok; 1-2 denemeden sonra değil, daha hafif kilo varsa her an çıkıyor |
| Not ekle | set/seans notu, sunucu | yalnız hareket geçmişi | yalnız gösterim, gömülü; set kaydedilince not eklenemiyor |
| Süperset | sete süperset kimliği | canlı seans | üyeler arası dinlenme yok (doğru), tur sonrası var; görünüş zayıf |
| Dinlenme / erken Hazır | sonraki sete gerçek saniye | **kimse** (doğrulandı) | okunmayan veri; K-1214'ün öğrenme kuralı yazılmadı |
| Cepte kalan tekrar | her sete | e1RM, rekor, efor satırı, TrainingTrend | **planın hedefiyle önceden dolu** (doğrulandı): tek dokunuş varsayımı gönderir, K-1218'in efor sinyalini körleştirir |
| Formun nasıldı | temiz olmayan hareketler | sonraki seansın yük tutma kuralı | yalnız en sonda, her hareket için; izolasyon/değiştirilen/eklenen harekette etkisiz |
| Seti atla / hareketi atla | yalnız telefon | canlı seans | sunucu atlanmışla yapılmamışı ayırmıyor |
| Değiştir, hareket ekle, erken bitir | değiştirme telefon; eklenen setler normal | geçmiş, rekor | motor değiştirilen/eklenen hareketi izlemiyor |
| Dolu (Taken) | seansa | yalnız testler | kaydediliyor, okunmuyor |
| Kurulumun | yalnız telefon | yalnız hareket ekranı | set ekranında gösterilmiyor, gerektiği anda yardım etmiyor |
| Geçmiş | okuma | | sayfa yok, bir yıllık bütün hareketleri indiriyor; 365 günden eskisi düşüyor (rekor dahil) |
| Bitiş ekranı / Paylaş | hiçbir şey | | not, form, efor göstermiyor |
Hiçbiri ücretli üyeye kilitli değil.

## Durak 4 · Gelişim sekmesi
- **Sayfa çok uzun.** Grafikler güzel ve mantıklı; takip edilmesi gerekenler takip edilmeli.
- **Güç bölümünde seçim düğmeleri** çok kötü görünüyor, UX'e uygun değil.
- **Bu haftanın kasları** daha etkileşimli olabilir. **Kas başına set** kıymetli ama bu kadar yer kaplamamalı (kimsenin pek umurunda olan bir metrik değil).
- **"Düzen" yazan kartı kaldır** ("çok ama çok kötü").
- **Kararlar listesi** bu kadar uzayıp gitmesi çok sağlıksız.
- **Fotoğraf ekleme** nerede, çok uzakta; kişi eklemek isteyecek. Fotoğraf belirli aralıkla ve ücretli üyelikle alınabilir (sınır + ücretliye yönlendirme).
  Not (agent): fotoğraflar cihazda kalıyor (V1), sunucu maliyeti yok; sınır tamamen ürün tercihi olur.

## Para ilkesi (Levent, Durak 4)
Her özelliğin **devamı, fazlası, artısı, dahası** ücretli: kullanıcı kullandıkça, daha fazlasını istediği noktada ücretliye geçsin. "Bir nevi freemium ama
tam da değil": çekirdek ücretsiz, derinlik ücretli. Tasarımda her özellik için "ücretsiz kısım nerede biter, dahası ne" sorusu sorulacak.

## Onaylar
"Hepsi onay" körlemesine verildi (Levent): #770 (görsel/döngü inceleme kayıtları, rıza metni 2, şartlar) otomatik birleşmeden çıkarıldı; gezinti sonrası
Levent'in gerçek kararıyla yeniden.
