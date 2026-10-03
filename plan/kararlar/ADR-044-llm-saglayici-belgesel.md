# ADR-044 · Dil modeli sağlayıcısı: belgesel karşılaştırma ve ölçüm listesi (K-511)
- **Durum:** ÖNERİ — sağlayıcı seçimi, rıza metni ve sözleşmeler Levent'in (veri dışarı + para, ADR-019). Gerçek çağrı yok (ADR-041).
- **Tarih:** 2026-10-03 · **Karar veren:** Levent (öneren: agent)

## Bağlam
ADR-041 #67-#71: şimdi belgesel karşılaştırma (resmî sayfalar), gerçek maliyet/kalite ölçümü yayına çıkarken; **sıfır veri saklama
(ZDR) + API verisiyle eğitim yok** resmî sayfada yazılı değilse sağlayıcı elenir. ADR-043 #76 gönderilen veriyi küçülttü: koç mesajında
kullanıcının mesajı + kararın **türü ve kural kimlikleri** (sayı/tarih yok); öğün notunda kullanıcının yazdığı metin. Çıktılar küçük JSON
(`{"topic","rule"}` ~20 token; `{"items":[…]}`). Kaynak: `arastirma/ham/H10-llm-saglayici.md` (tüm iddialar URL + 3 Eki 2026 okuma tarihiyle;
okunamayan `[doğrulanmadı]`).

## Karar sürücüleri
1. ZDR + eğitim yok (şart, ADR-041 #71). 2. Veri konumu (TR/AB kullanıcısı; KVKK yurt dışı aktarım — hukuki soru). 3. Yapılandırılmış
çıktı (JSON şeması). 4. İstek başı maliyet (kota ile çarpılır, K-508). 5. Model ömrü.

## Bulgu (özet; ayrıntı H10 §1-§2)
| Sağlayıcı · model | $/1M giriş/çıkış | ZDR | Eğitim | AB işleme | Kapı |
|---|---|---|---|---|---|
| OpenAI · gpt-6-luna (alt: gpt-5-nano) | 0,10 / 0,50 | ön onay + ek şart | varsayılan hayır | **var** (`eu.api.openai.com`, onay + ~%10) | koşullu geçer |
| Google **Vertex AI** · Gemini 3.1 Flash-Lite | 0,25 / 1,50 (AB 0,275 / 1,65) | kötüye kullanım izleme istisnası + önbellek kapalı | **hayır** (Service Specific Terms) | **var** (`eu` çoklu bölge) | koşullu geçer |
| Mistral · Ministral 3 8B / Small 4 | 0,15 / 0,15 · 0,15 / 0,60 | gerekçeli başvuru, takdire bağlı | şartlarda yok, **varsayılan ayar [doğrulanmadı]** | **varsayılan AB** | koşullu geçer (eğitim anahtarı doğrulanmalı) |
| Anthropic · Claude Haiku 4.5 | 1 / 5 | satış + onay | hayır (ticari şartlar) | **yok** (`global`/`us`) | koşullu geçer; emeklilik "en erken 15 Eki 2026" |
| Google Gemini Developer API (AI Studio) | — | garanti yok (55 gün kayıt) | ücretsiz katmanda evet | [doğrulanmadı] | **elenir** |

**Hiçbirinde ZDR varsayılan değil** — hepsi başvuru/onay ister; onay garanti değil, bazıları tüzel kişilik isteyebilir (H10 §4 #5).
İstek başı maliyet (alt sınır, H10 §3): sınıflandırma $0,00004-0,0007, öğün $0,00008-0,00115. Günde 25 mesajlık kota (K-508) en kötü
durumda kullanıcı başı ayda ~$0,05 (Luna) - ~$0,5 (Haiku).

## Öneri (Levent onaylarsa KABUL)
1. **Ölçüm listesi (yayına çıkarken, bu sırayla):** OpenAI gpt-6-luna (AB işleme) · Vertex Gemini 3.1 Flash-Lite (`eu`) · Mistral Ministral 3 8B
   (eğitim anahtarı kapalı, Labs/Preview değil). Anthropic Haiku 4.5 yedek: AB konumu yok, en pahalı, ömrü kısa.
2. **Ölçüt:** `tools/llm_eval.py` (bu ADR ile gelir): 54 itirazda **konu doğruluğu** (`expectedTopic`), şemaya uyma oranı (düşen = motorun
   sözü), öğün setinde **veritabanı eşleşmesi** (K-504), gecikme (p50/p95), token ve maliyet. Kazanan: şema ≥ %99 ve konu doğruluğu en
   yüksek olanlar arasında istek başı maliyeti en düşük (kâr, ADR-041 #67).
3. **Gönderilen veri en az:** ADR-043'teki gibi kalır (sayı/tarih yok). Fotoğraf (K-514) ayrı değerlendirilir.
4. **Rıza metni taslağı** (V2: sağlayıcı adıyla + veri türleri; `consent.third_party_ai`, sürüm yükselir; **metin Levent'te**):
   > To answer your messages and read the meals you describe, the app sends to {provider}: what you write to the coach, with this week's
   > call's kind and the rules behind it (no numbers); meal notes you type; and meal photos you choose to analyze. Never your progress
   > photos, weight, Health data, name or email. {provider} keeps none of it and doesn't train on it. The AI sorts and reads; it doesn't
   > decide — weekly calls come from fixed rules you can read in every "Why this call". You can withdraw this in Settings at any time.

   "keeps none of it" **ancak ZDR onayı alındıktan sonra** yazılabilir; onay yoksa sağlayıcı kullanılmaz (ADR-041 #71).
   Kodun istediği veri türü adları (`keel.coach.data-types`): "coach question", "meal note" (+ fotoğrafta "meal photo").

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Şimdi tek sağlayıcı seçmek | ADR-041: gerçek ölçüm yayında; belgeler eşit ölçüde "koşullu" |
| Gemini Developer API | Garanti edilen ZDR yok → elendi |
| Kendi barındırdığımız model | Tek VPS ve maliyet (ADR-004); ölçek ve kalite belirsiz — yayında yeniden bakılabilir |

## Sonuçlar
Olumlu: seçim ölçümle ve tek betikle; rıza metni gerçeği söyler. Olumsuz: ZDR onay süreci takvim riski; AB işleme bazılarında ek ücret.

## Geri dönmenin maliyeti
Düşük: sağlayıcı `keel.coach.provider` yapılandırması + bir adaptör (ADR-042); rıza metni sürümü yükselir, kullanıcı yeniden onaylar.

## Etkilenen
`keel.coach.*` yapılandırması, `consent.third_party_ai` metni ve sürümü, `tools/llm_eval.py`, ADR-041, ADR-042, ADR-043.

## Açık (hukuki — H10 §4, yorum yok)
KVKK m.6/m.9 (özel nitelik, yurt dışı aktarım, standart sözleşme bildirimi), DPA, ZDR ek şartları ve tüzel kişi şartı, ZDR altındaki
saklama istisnalarının aydınlatmada anlatımı, V2 onayı ile KVKK açık rızası ilişkisi. **Yayından önce hukuki görüş.**

## Doğrulama
Yayın öncesi: `tools/llm_eval.py` sonuç tablosu bu ADR'ye eklenir; seçilen sağlayıcının ZDR onay yazısı ve eğitim ayarı ekran görüntüsü
kayıt altına alınır (sır değil).
