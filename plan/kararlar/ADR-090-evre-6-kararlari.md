# ADR-090 · Evre 6 kararları: ABD yemek verisi, öğün hatırlatması, 7 gün, prototipsiz arayüz
- **Durum:** KABUL (Levent, 29 Eki 2026)
- **Tarih:** 2026-10-29 · **Karar veren:** Levent

## Bağlam
Build 8 incelemesi (plan/evre-6-ortalamayi-yakala.md): yemek kaydı ABD kullanıcısı için kullanılamaz (veri Türkiye alt kümesi, birimler
gram), kayıt hatırlatması yok, 7 gün antrenman akışı yok.

## Karar
1. **Yemek verisi:** USDA FoodData Central (kamu malı; temel gıdalar porsiyon ve adet ölçüleriyle, ör. "1 large egg") + markalı ürünler ve
   barkod için Open Food Facts'in ABD alt kümesi (ODbL, ADR-088'deki atıf ve paylaşım düzeniyle). Türkiye alt kümesi kalır. ADR-088'e ek.
2. **Öğün hatırlatması dördüncü tür olur** (ADR-036 #1 ve ADR-089 Ek 2'deki "dördüncü tür yok" bu tür için kalkar): kullanıcının kendi
   yemek saatlerinden öğrenir, günde en çok iki, kapatılabilir, izin yoksa sessiz; Ayarlar metni dört türü söyler.
3. **7 gün antrenman serbest, uyarıyla** (ADR-027 #15'e ek): yedinci gün tek dokunuşla eklenir; ekranda kısa not (bir dinlenme günü gelişimi
   hızlandırır). Motor yükü buna göre okur; `max_training_days` 7.
4. **Arayüzde prototip onayı yok:** agent doğrudan kodlar, simülatörde kanıtlar; Levent TestFlight'ta inceler.
5. **Tek sayı, aralık detayda (U5 değişir):** kayıt ekranlarında tek sayı (aralığın ortası; etiket değeri varsa o), aralık dokununca açılan detayda ve karar ekranında. Hesap ve saklama aralık kalır.

## Sonuç
- ADR-036, ADR-027, ADR-088 bu ADR'ye atıfla güncellenmiş sayılır; ilgili parametreler (`max_training_days`, bildirim türleri) bu kararla değişir.
