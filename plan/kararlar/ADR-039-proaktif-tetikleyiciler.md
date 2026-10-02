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
2. **Kurallar:**
   - **T-13 `steps_dropped`:** son 7 tam günün adım ortalaması planın adım hedefinin altında, önceki 7 günün ortalaması hedefte
     ya da üstünde; iki haftanın her birinde en az `min_logged_days_per_week` adımlı gün (az veri → sessiz).
   - **T-4 `sessions_missed`:** programın son `missed_sessions_in_a_row` (2, G5 T-4) planlı günü geçti ve ilkinden bu yana tek seans
     (ısınma dışı setli antrenman, K-431) yok. İlk seans hiç kaydedilmemişse sessiz (U3, U7: kaydetmemek antrenmanı kaçırmak değil).
   - **T-5 `loads_dropped`:** `TrainingStatus.loadsBelowLastWeek` (G7 K-73'ün okuduğu veri). Mesaj: kas kaybı değil; setler ve
     protein (Güray: "Kas kaybediyorsun mesajı verme").
   - **T-2 `hunger_first_days`:** bir açık (CUT) planın ilk `hunger_question_days` (2) günü. Cevap "hiç aç değilim" → açlık tipik
     olarak 3-4. günde ve ilk ağır bacak antrenmanından sonra gelir (başarı sayılmaz).
3. **Durum beyanı varken soru yok** (ADR-038: hafta duraklar; soruların çoğu beyanla zaten açıklanır).
4. **Bir kez:** her soru bir **oluş anahtarıyla** (tetiklendiği haftanın Pazartesi'si; T-2'de planın başladığı gün) cevaplanınca bir
   daha gelmez. Cevaplar `decision.prompt_answer`'da (V26), sağlık verisi → HEALTH_DATA rızası, geri çekme ve hesap silmede silinir.
5. **Cevaplar karar değiştirmez** (U1-U2: karar haftalık motordan). Cevap ya kısa bir yanıt metni döndürür (T-2, T-5, T-13), ya da
   telefonda bir yere götürür (T-4: hatırlatma ayarı ya da durum beyanı; T-13: durum beyanı).
6. API: `GET /v1/prompts` (bugünün cevaplanmamış soruları), `POST /v1/prompts/{rule}/answers {key, choice}` → `{replyCopyKey?}`.
7. Telefon (K-520): Bugün'de kart; seçenek ya yanıtı gösterir ya ilgili ekranı açar.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Push bildirimi | ADR-036: üç tür sınırı; tetikleyici, kullanıcı uygulamadayken sorulur |
| Kural telefonda | Veri sunucuda (adım günleri, seanslar, set kaydı); motor deterministik ve tek yerde (U1) |
| Cevabı kararın girdisi yapmak | Kararı ısrar değil veri değiştirir (U2); haftalık check-in zaten bütçeli sorularla okur |

## Sonuçlar
- Parametreler: `missed_sessions_in_a_row` (2, tecrube, G5 T-4), `hunger_question_days` (2, tecrube, G5 T-2) → `windows.yaml`.
- Göç V26, sözleşme `/v1/prompts`, `Prompt`, `PromptAnswer`.
