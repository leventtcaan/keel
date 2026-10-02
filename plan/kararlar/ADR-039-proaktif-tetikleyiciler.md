# ADR-039 · Proaktif tetikleyiciler: motorun sorusu, bildirim değil
- **Durum:** KABUL (teknik, agent — ADR-019). Eşiklerin ikisi Güray'dan (G5), ikisi mevcut parametrelerden.
- **Tarih:** 2026-10-03 · **Karar veren:** agent · **Görev:** K-512 (motor + sunucu), K-520 (telefon)

## Bağlam
Güray'ın 19 tetikleyicisi (`arastirma/ham/guray/G5-surec-supplement.md` §2) koçun haftalık karar dışında **ne zaman konuşacağını**
söyler. K-512 en az dördünü ister: adım düşüşü (T-13), ard arda 2 kaçan antrenman (T-4), çalışma seti yükünde düşüş (T-5),
"hiç aç değilim" ilk 2 günde (T-2). ADR-036: bildirim türleri üçle sınırlı → tetikleyici **uygulama içi soru**dur.

## Karar
1. **Saf motor kuralı** `Prompts.today(facts, parameters)` → bugünün soruları; her biri kural kimliği + kaynak (G5 T-x, EXPERIENCE),
   metin anahtarı, seçenekler. Sıra öncelikle: T-13 (Güray: "en yüksek öncelikli metabolik uyarı"), T-4, T-5, T-2.
2. **Kurallar** (inceleme sonrası yeniden tasarım, 3 Eki — aşağıdaki "Düzeltme" notu):
   - **T-13 `steps_dropped`:** **biten takvim haftasının** (Pzt-Paz) adım ortalaması planın adım hedefinin altında, ondan önceki
     takvim haftası hedefte ya da üstünde; **duraklayan günler sayılmaz**; her haftada en az `min_logged_days_per_week` sayılı gün
     (az veri → sessiz). Anahtar: düşen haftanın Pazartesi'si — hafta boyunca aynı, bir düşüş bir soru. Süren haftanın günleri
     hafta sayılmaz.
   - **T-4 `sessions_missed`:** **son seanstan sonraki** planlı günler — o günlerin planlandığı programdan (`trainingDaysSince`)
     itibaren, bugünden önce (bugün henüz kaçmadı), duraklayan günler hariç — `missed_sessions_in_a_row` (2, G5 T-4) sayısına
     ulaştı. Anahtar: son seanstan sonraki **ilk** planlı gün; sapma sürdükçe sabit. Hiç seans kaydı yoksa sessiz (U3, U7).
   - **T-5 `loads_dropped`:** **yalnız açıkta (CUT)**: biten takvim haftasının yükü bir öncekinin altında (G7 K-73'ün okuduğu
     veri, haftanın sonunda okunur). Bulk'ta haftalık motor düşen yükü toparlanma sorunu sayar (FIX_RECOVERY); "normal" diyen bir
     soru kararla çelişir. Karşılaştırılan iki haftada duraklayan ya da merdivenin hafiflettiği (LIGHTER_WEEK) bir gün varsa sessiz.
     Mesaj: kas kaybı değil; setler ve protein (Güray: "Kas kaybediyorsun mesajı verme"). Anahtar: düşen haftanın Pazartesi'si.
   - **T-2 `hunger_first_days`:** açığın (CUT) ilk `hunger_question_days` (2) günü. **Açığın ilk günü (`deficitBegan`):** bu açık
     fazında bakımın altındaki ilk hedefin başladığı gün — fazın başındaki bakım tahmini gözlemi (K-114, `observing_maintenance`)
     açık değildir; mini cut gözlemsiz başlar, ilk günü açığın ilk günüdür. Cevap "hiç aç değilim" → açlık tipik olarak 3-4.
     günde ve ilk ağır bacak antrenmanından sonra gelir (başarı sayılmaz). Anahtar: açığın ilk günü.
   - **Duraklayan gün (`pausedDays`):** beyan edilen durumun günleri (ADR-038) + merdivenin verdiği mola haftası (REST_WEEK).
3. **Durum yürürlükteyken soru yok** (ADR-038: hafta duraklar; soruların çoğu beyanla zaten açıklanır). Durum bitince de onun
   günleri kimsenin aleyhine sayılmaz (yukarıda).
4. **Bir kez:** her soru bir **oluş anahtarıyla** (yukarıda, kural başına) cevaplanınca bir daha gelmez. Cevaplar
   `decision.prompt_answer`'da (V26), sağlık verisi → HEALTH_DATA rızası, geri çekme ve hesap silmede silinir.
5. **Cevaplar karar değiştirmez** (U1-U2: karar haftalık motordan). Cevap ya kısa bir yanıt metni döndürür (T-2, T-5, T-13), ya da
   telefonda bir yere götürür (T-4: hatırlatma ayarı ya da durum beyanı; T-13: durum beyanı).
6. API: `GET /v1/prompts` (bugünün cevaplanmamış soruları), `POST /v1/prompts/{rule}/answers {key, choice}` → `{replyCopyKey?}`.
7. Telefon (K-520): Bugün'de kart; seçenek ya yanıtı gösterir ya ilgili ekranı açar.

## Düzeltme (3 Eki, #283 incelemesi)
İlk sürüm kayan 7 günlük pencereler ve "son N planlı gün" okuyordu. İnceleme beş kusur buldu: motorun kendi mola haftasında "iki
seans kaçırdın" diyordu; bulk'ta yük düşüşüne "normal" diyerek FIX_RECOVERY kararıyla çelişiyordu; anahtar her gün kaydığından
aynı sapma tekrar soruluyordu; Pazartesi pencere kayınca aynı düşüş ikinci kez soruluyordu; açığın başlangıcı faz başlangıcı
(bakım gözlemi) sayılıyordu. Yukarıdaki tanımlar bunların her biri için bir testle (PromptsTests) sabitlendi.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Push bildirimi | ADR-036: üç tür sınırı; tetikleyici, kullanıcı uygulamadayken sorulur |
| Kural telefonda | Veri sunucuda (adım günleri, seanslar, set kaydı); motor deterministik ve tek yerde (U1) |
| Cevabı kararın girdisi yapmak | Kararı ısrar değil veri değiştirir (U2); haftalık check-in zaten bütçeli sorularla okur |

## Sonuçlar
- Parametreler: `missed_sessions_in_a_row` (2, tecrube, G5 T-4), `hunger_question_days` (2, tecrube, G5 T-2) → `windows.yaml`.
- Göç V26, sözleşme `/v1/prompts`, `Prompt`, `PromptAnswer`.
