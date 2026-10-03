# ADR-041 · M5 Part 1 sonu: Levent'in cevapları (sorular 55-72)
- **Durum:** KABUL (Levent, 3 Eki 2026 — AskUserQuestion, M5 Part 1 sonu; 65 ve 72 "sen seç" → agent, gerekçeyle)
- **Tarih:** 2026-10-03 · **Karar veren:** Levent (ürün/para/veri/sağlık); 65, 72 ve uygulama ayrıntısı agent

## Bağlam
M5 Part 1'in görevlerinden ve incelemelerinden 13 soru (DURUM 55-66, 72) ve Part 2'nin sağlayıcı kapısı (67-71) birikti.

## Kararlar
| # | Konu | Karar | Etki |
|---|---|---|---|
| 55 | Seyrek plakada tutulan yük nasıl biter (K-430) | **e1RM eşdeğerliği:** biriken tekrarlar ağır yükü aralığın altında yapılabilir kılınca sıçrar (Epley, H3 B15). K-414 testinin 42×8 → 35×13 beklentisi bilerek değişir (K1 onaylı) | İş: K-430 #273 tamamlanır |
| 56 | Yalnız FAILURE/DROP setli antrenman seans sayılır | Bilgi — itiraz yok, kalır | Değişiklik yok |
| 57 | Rıza metninin ilk cümlesi "antrenman sağlık verisi" diyor | Açık: yayından önce hukuki bakış (metin `-draft`) | Bekler |
| 58 | Hatırlatma teklifi "What to expect"te | Bilgi — itiraz yok, kalır | Değişiklik yok |
| 59 | K1: bilerek genişleyen sabitleyen liste testleri | **Onay**; bu türde ileride yalnız PR notu, ayrıca sorulmaz (eskisi silinmediyse, iddia zayıflamadıysa) | Değişiklik yok |
| 60 | Dönüş yükü + yoğun hafta minimum dozu (K-516) | **Literatür taraması** (agent, kaynaklı, `arastirma/ham/`); sonra kural (`kural-ekle`) | İş: K-524 |
| 61 | Bir gün beyan = hafta duraklar | **Kalır** (herhangi bir gün) | Değişiklik yok |
| 62 | `STATE_STILL` sıklığı | **3 haftada bir** (`state_still_after_paused_weeks` aralığıyla; YES sonrası 3 hafta sessiz) | İş: K-525 |
| 63 | Uyum sayıları | **Yeni kararlar sayıları da saklar** ("19 eylemin 16'sı"); eskiler oranla kalır, sayı uydurulmaz | İş: K-526 |
| 64 | Kaçan seans hangi günlere bakar | **Programın günleri**; program günü yoksa profilin günleri | İş: K-527 |
| 65 | İlk 8 hafta metinleri | Agent yazar (ürün sesi, kaynağa sadık, kişi adı yok) | Değişiklik yok (taslaklar agent'ın) |
| 66 | "Uygulama açılmaması" sinyali | **Telefonda kalır**; sunucuya açılış günü gönderilmez | K-521 kabulü buna göre |
| 67 | Sağlayıcı adayları | Şimdi **belgesel/mantıksal karşılaştırma** (resmî sayfalar: saklama, yapılandırılmış çıktı, liste fiyatı) agent'ın seçtiği adaylarla; **gerçek maliyet/kalite ölçümü yayına çıkarken**, kârı en iyi kılan seçenekle | K-511 kabulü değişir |
| 68 | Ölçüm planı | 67 ile birlikte: gerçek koşu yayında | K-511 |
| 69 | Bütçe / harcama limiti | **Şimdi harcama yok**; ölçeğe göre yayına çıkarken konuşulur | Part 2-3 yalnız sahte sağlayıcı |
| 70 | Anahtar yönetimi | Şimdi gerekmiyor (gerçek çağrı yok); yayına çıkarken | Bekler |
| 71 | Sıfır veri saklama | **Şart** — saklamama ve eğitimde kullanmama taahhüdü resmî sayfada yoksa sağlayıcı elenir | K-511 kabulü |
| 72 | Kural cümleleri (K-522) | Agent yazar: ürün sesi, kaynağa sadık; **üründe kişi adı yok** (Levent: "profesyonel bir uygulama") | K-522; ayrıca K-523 |

**72'nin uzantısı (agent, teknik):** Levent'in "Güray adı hardcode edilmesin" kaygısı denetlendi. Arayüz metninde yok; ama API cevabındaki
kaynak yolu (`arastirma/ham/guray/...`), kod sabit adları (`GURAY_*`) ve sözleşme açıklaması kişi adını taşıyor. **K-523:** API kaynağın
yalnız türünü gönderir (yol sunucuda, denetim için), sabit adları ve açıklamalar nötr, yasaklı ifade taraması kişi adlarını yakalar; koç
anlatımı (K-505) kişi adı kullanmaz. `arastirma/` salt okunur iç kaynaktır, adı değişmez (dışarı çıkmaz).

## Sonuçlar
- Part 2 başında: K-430 (#273), K-523, K-525, K-526, K-527; K-524 (literatür) Part 2 içinde. Sonra Part 2 kapsamı (K-503, K-505, K-506, K-504, K-508).
- Part 2 ve Part 3 **yalnız sahte sağlayıcıyla**; K-511 belgesel karşılaştırma + ADR, gerçek ölçüm yayın öncesi ayrı iş.
