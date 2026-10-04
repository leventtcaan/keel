# AI sağlayıcısının veri saklama ve eğitim şartları (K-806)

> İç belge (Türkçe). Gizlilik politikasındaki "The AI coach" bölümünün (`docs/yasal/site/privacy.md#ai`) dayanağı. Sağlayıcı henüz seçilmedi:
> seçim yayına çıkarken ölçümle (K-533, M10; ADR-044). Bu belge üç adayın **bugünkü** resmî şartlarını kaynağıyla tutar; seçim günü
> yeniden okunur (şartlar değişir — Mistral'inki 25 Eylül 2026'da, OpenAI'ın veri sayfası tarihsiz).

## Bugünkü durum (kod)
- Tek adaptör sahte (`keel.coach.provider: fake`, `provider-name: none`); AI rızası verilemiyor (`keel.consent.third-party-ai` yapılandırmada yok).
  Hiçbir sağlayıcıya veri gitmiyor.
- Gidecek veri (ADR-043, ADR-046): koç sorusu (≤2000 karakter) + kararın türü ve kural kimlikleri (sayı/tarih yok); öğün notu (≤500 karakter);
  analiz için seçilen öğün fotoğrafı (≤1024 px, sunucuda yeniden kodlanmış JPEG, üst veri yok). Hesap kimliği, profil, geçmiş gitmez; her çağrı tek tur.
- Şart (ADR-041 #71): **sıfır veri saklama (ZDR) + API verisiyle eğitim yok** resmî metinde yazılı değilse sağlayıcı kullanılmaz.

## Adaylar — resmî metinden (okuma: 4 Eki 2026)
| Aday (ADR-044 sırası) | Eğitim | Varsayılan saklama | ZDR | Kaynak |
|---|---|---|---|---|
| OpenAI API | "data sent to the OpenAI API is not used to train or improve OpenAI models (unless you explicitly opt in to share data with us)" | "By default, abuse monitoring logs are generated for all API feature usage and retained for up to 30 days, unless longer retention is required by law, or is reasonably necessary to protect our services or any third party from harm." | "subject to prior approval by OpenAI and acceptance of additional requirements"; **ZDR altında da istisna:** "If the classifier detects potential CSAM content, the image will be retained for manual review, even if Zero Data Retention, Modified Abuse Monitoring, or Private Retention with PSP is enabled." (öğün fotoğrafı görseldir); AB veri konumu için "you must be approved for abuse monitoring controls, and execute a Modified Retention amendment" | https://developers.openai.com/api/docs/guides/your-data |
| Google Vertex AI (Gemini) | "Google won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction" | İstem, kötüye kullanım izlemesi için kaydedilebilir (GCP ToS 4.3); bellek içi önbellek 24 saat ("does not violate zero data retention", proje düzeyinde kapatılabilir); istek-yanıt kaydı varsayılan kapalı | Kötüye kullanım izlemesi için istisna istenir ("you can request an exception for abuse monitoring"); Search/Maps grounding kullanılmaz | https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention |
| Mistral (Studio API) | Ticari şartlar (yürürlük 25 Eyl 2026): "Mistral AI will not use Customer Data or Outputs to train its artificial intelligence models except …" — istisnalar: varsayılanı açık üründe kapatmamak, geri bildirim, sipariş formu, **Labs/Preview modelleri** | Gizlilik politikası (yürürlük 3 Eyl 2026): "for thirty (30) rolling days to monitor abuse (unless zero data retention is activated)" | Başvuruyla, takdire bağlı (H10 §2.5, 3 Eki) | https://legal.mistral.ai/terms/commercial-terms-of-service · https://legal.mistral.ai/terms/privacy-policy/ |

Anthropic (yedek aday, AB konumu yok) ve Gemini Developer API (elendi) için ADR-044 ve `arastirma/ham/H10-llm-saglayici.md`.

## Seçim günü yapılacaklar (M10, K-533 ile)
1. Seçilen sağlayıcının eğitim ve saklama sayfasını yeniden oku; alıntı + tarih bu belgeye.
2. ZDR onay yazısı (ya da Vertex'te kötüye kullanım istisnası + önbellek kapalı) kayda geçer (ADR-044 Doğrulama). Onay yoksa sağlayıcı açılmaz.
3. DPA/işleyici şartları imzalanır; AB'den aktarım güvencesi (SCC ya da veri konumu) politikaya yazılır.
4. `keel.coach.provider` + `provider-name` + `keel.consent.third-party-ai` yapılandırılır; rıza metni (ADR-044 taslağı) sağlayıcı adıyla, sürümü artar.
5. ZDR'nin de istisnaları var (OpenAI: işaretlenen görsel; Google: 24 saatlik bellek içi önbellek ZDR sayılıyor ama kapatılabilir) — politikaya seçilenin
   istisnaları adıyla yazılır (ADR-044 › Açık).
6. Politikanın "The AI coach" bölümü: "not active yet" cümlesi kalkar; sağlayıcının adı, ülkesi, saklama ("keeps none of it" yalnız ZDR onayıyla) ve
   eğitim şartı yazılır. `tools/test_veri_envanteri.py` bunu zorlar: sağlayıcı `fake` değilse politika onu adıyla anar ve "not active" demez.
