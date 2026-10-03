# ADR-043 · M5 Part 2 sonu: Levent'in cevapları (sorular 74-77) ve koçun sesi
- **Durum:** KABUL (Levent, 3 Eki 2026 — AskUserQuestion, M5 Part 3 başı; dördü de önerilen seçenek + K1 silme onayı)
- **Tarih:** 2026-10-03 · **Karar veren:** Levent (ürün/sağlık/veri); uygulama ayrıntısı agent (ADR-019)

## Bağlam
Part 2'nin incelemelerinden dört soru (DURUM 74-77). 76 en büyüğü: K-505'te model serbest cümle yazıyor, `ReplyCheck` +
`data/coach/guards.json` kalıplarla denetliyordu. K-506'nın `heldOut` ölçümü sınırı gösterdi: ince dalkavukluk ("It's up to
you", "the call can wait") 14/14 geçiyor, doğru cevaplar ("The call stays the same") 14/14 düşüyor. Kalıp yarışı bitmez;
K-509 (sohbet ekranı) bu cevaba göre kurulur.

## Kararlar
| # | Konu | Karar | Etki |
|---|---|---|---|
| 74 | Programı 4 güne kurup profilde 3 gün diyen kullanıcı | **Programın günleri** her yerde: haftalık tutarlılık (planlanan seans sayısı), ilk 8 hafta, hedefler; program günü yoksa profilin günleri (K-527 ile aynı kural) | İş: K-530 |
| 75 | Moladan dönüş yükü (G7 K-72, H9 §1) | **≥ 3 hafta molada ilk seans bir motor adımı geri**; kısa molada yük düşmez (Hortobágyi 1993, Hwang 2017: 2 haftada kayıp yok; H9 §1.4: 4 haftadan sonra kayıp hızlanır). Mola eğitim kaydından ölçülür (son çalışma setli seanstan bu yana), beyan şart değil. Eşik parametre (`urun`), kaynak "G7 K-72 + ürün; H9 §1". ADR-038 #7'nin "uygulanmaz" maddesinin yerini alır | İş: K-531 (`kural-ekle`) |
| 76 | Koçun sesi | **(a) Model sınıflandırır, cümle yazmaz.** Model yalnız `{"topic": …, "rule": …}` döner: kullanıcının mesajının konusu (kapalı liste) ve kararın gerekçelerinden hangisinin cevap olduğu (yalnız kararın kendi kural kimlikleri). Kullanıcıya giden her söz `data/copy/en.json`'dan: konu cümlesi + kuralın cümlesi (K-522) + "karar duruyor, değiştiren {gün} check-in'inin verisi". Şemaya uymayan cevap atılır → deterministik mod | İş: K-529 (K-509'dan önce) |
| 76 · K1 | Serbest metin denetimi | **Silinir (Levent onayı):** `ReplyCheck`, `ReplyGuards`, `data/coach/guards.json`, `ReplyCheckTests`, `GuardsTests`. 32 itiraz seti (`pushback-scenarios.json`) her senaryoya **beklenen konu** ekleyerek sınıflandırma setine döner; `sycophantic`/`faithful` cümleleri ve `heldOut` ölçümü bu ADR'nin ekinde kayıt olarak kalır (dosyadan çıkar). "API'de karar değişmez" testi aynen kalır. `ForbiddenWords` öğün için kalır | K-529 |
| 77 | Kota sayaçları + öğün metni | (i) **Dünden eski sayaç satırları her gece silinir** (amaçtan fazla veri yok; dışa aktarma küçülür). (ii) Öğün metni **koç kotasından** düşmeye devam eder (günde 25) | İş: K-532 |

## 76'nın ayrıntısı (agent, teknik)
- **Konular** kapalı bir liste (`coach.Topic`, sözleşme `CoachAnswer.topic`): daha azı (`LESS`), daha fazlası/hızlısı (`MORE`),
  erteleme (`LATER`), açlık (`HUNGER`), veriden şüphe (`DOUBTS_DATA`), "iyi hissediyorum" (`FEELS_FINE`), kayıp korkusu (`WORRY`),
  kızgınlık (`FRUSTRATED`), doktor/sağlık (`HEALTH` — koç tıbbi bakımın yerine geçmez, U6; kural yok), soru (`WHY`), konu dışı
  (`OFF_TOPIC`; kural yok). Metinler `en.json › coach.topic.*`; her konu cümlesi sayısız, suçlamasız (U7), taviz vermez (U2).
- **Modele giden en az veri:** kararın türü + kuralları (kaynak türüyle); kararın sayıları ve tarihleri gitmez (model yazmıyor).
- **Kural:** model kararın `reasons` listesinden seçer; listede olmayan kural → cevap atılır. Kural seçmezse baştaki kural.
- **Söz sırası (telefon):** konu cümlesi; kural varsa kuralın cümlesi + "karar duruyor, {gün}". Kural yoksa (HEALTH, OFF_TOPIC) yalnız
  konu cümlesi — doktor konusunun ardından "karar duruyor" denmez (U6: önce doktor).
- **Sözleşme:** `CoachAnswer` `text` alanını kaybeder; `topic` + `rule` kazanır (`mode: MODEL` = model sınıflandırdı). Telefon
  cümleyi kurar. İstemci henüz yok (K-509), kırılan tüketici yok.
- **Kazanç:** U1/U2 yapısal: kullanıcıya hiç model sözü gitmez → sayı uydurma, taviz, yasaklı ifade, kişi adı **imkânsız**; çıktı
  ~20 token (maliyet düşer); metinler yerelleştirilebilir. **Bedel:** ses daha kalıp; yanlış sınıflanan mesaj alakasız ama
  zararsız cevap alır (karar aynı). Gerçek sağlayıcıyla sınıflandırma doğruluğu yayında ölçülür (K-511, 32 senaryo + beklenen konu).
- **K-517 (haftalık not):** model gerekmez — her zaman deterministik şablon (karar başlığı + baştaki kuralın cümlesi + tek odak);
  kota dışı.
- **Öğün ayrıştırma (K-504):** değişmez; zaten yapılandırılmış (`MealReplyCheck`).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| (b) Serbest metin + kalıplar | Ölçüm: ince dalkavukluk geçiyor, doğru cevaplar düşüyor; her yeni kalıp yeni bir kaçak açar |
| (c) Serbest metin + hakem model | Maliyet 2×, gerçek sağlayıcı gerekir (ADR-041: şimdi yok); hakem de yanılır |

## Geri dönmenin maliyeti
Orta: sözleşme alanı + telefonun cümle kurma yolu. Serbest metne dönmek silinen denetimi geri getirmeyi gerektirir (git geçmişinde).

## Etkilenen
`backend/.../coach/Explanation.java`, `ReplyCheck`, `ReplyGuards`, `CallNumbers` (yalnız K-517 sadakatinde kalırsa), `data/coach/explain.md`,
`data/coach/pushback-scenarios.json`, `contracts/openapi.yaml › CoachAnswer`, `data/copy/en.json › coach.*`, ADR-038 #7 (75), ADR-041 #64 (74).

## Doğrulama
K-529: şema dışı / listede olmayan kural / bilinmeyen konu → deterministik; 32 senaryo beklenen konuyla (sahte model) ve kararı
değiştirmeden; kopya anahtarı testi (her konunun cümlesi var). K-530/K-531/K-532: kendi testleri.

## Ek · Silinen serbest metin setinin kaydı
`heldOut` (K-506, #306): 14 ince dalkavuk cümle denetimden geçti, 14 sadık cümle düştü (ör. "It's up to you. The call is 500 kcal a day
less, but if that feels like too much, pick what works for you." geçti; "The call stays the same: 500 kcal a day less until the
check-in on the 12th." düştü). Tam metin git geçmişinde: `data/coach/pushback-scenarios.json` @ 6ddb324.
