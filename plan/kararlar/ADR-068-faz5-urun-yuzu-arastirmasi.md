# ADR-068 · Faz 5 — ürünün yüzü: önce pazar ve akış araştırması, sonra prototip
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (öneren: agent)

## Bağlam
ADR-067 UI/UX revizyonunu beta kohortunun önüne aldı. Levent revizyonun da yanlış yerden başlayacağını söyledi: tasarım,
tutan ürünlerin nasıl göründüğü, nasıl reklam verdiği ve insanları nasıl tuttuğu bilinmeden yapılırsa aynı hata tekrar eder.
`arastirma/` ne inşa edileceğini ve nasıl satılacağını kapsıyor (E, F, I1, I2, K1-K6, L2, L3, 05); şu dört şeyi kapsamıyor:
reklam istihbaratı, rakiplerin ekran ekran akışı, dikkat/tutundurma tasarımı, sosyal medyaya uygun ürün içi anlar.
Araştırma ekrana hiç çevrilmedi ve ekranlar gerçek elde sınanmadı (ADR-067).

## Karar
1. **Faz 5 · Ürünün yüzü**, UI/UX prototipinden önce. Dört hat, her biri `arastirma/ham/` altında kaynaklı bir dosya:
   - **R1 Reklam istihbaratı:** Meta Ad Library (ve TikTok Creative Center) — Apify ile. Uzun süre yayında kalan reklam = para kazandıran
     reklam (vekil ölçü); kanca, vaat, format, CTA, götürdüğü onboarding.
   - **R2 Akış kıyası:** kategorinin tutan 8-10 uygulaması — onboarding ekran ekran (soru sayısı, paywall yeri, "aha" anı), ana ekran,
     kayıt kaç dokunuş; insanların alışkın olduğu kalıplar.
   - **R3 Dikkat ve tutundurma:** D1/D7/D30 kıyasları, işe yarayan mekanikler, sıkıcı işi hafifleten tasarım.
   - **R4 Sosyal döngü:** paylaşılabilir anlar, içerik formatları, kreatöre uygun özellikler.
   Sentez `arastirma/06-faz5-yuz.md` → ürün yüzü özeti → bütün ekranların artifact prototipi → Levent onayı → kod.
2. **Pazar:** global İngilizce (ABD, UK, AU, CA).
3. **Anayasa:** U1-U6 dokunulmaz (LLM karar vermez, ısrar kararı değiştirmez, "henüz karar yok", yağ % yok, aralık, tıbbi dil yok).
   Diğer kurallar (ör. U7 streak, U8 ilk 14 gün, U12 before/after) kanıt gelirse ADR olarak Levent'e gelir.
4. **Apify:** hesap ve API anahtarı Levent'te; anahtar `~/.keel-secrets/apify-token` (600), repoya, prompt'a, loga girmez (V5).
   Ücretsiz planla başlanır; ilk taramada maliyet ölçülür, planı aşacaksa durulur ve sorulur. Toplanan veri kamuya açık reklamlar —
   kullanıcı verisi yok.

## Sonuçlar
- Olumlu: tasarım kanıta dayanır; reklam ve ürün aynı vaadi taşır (pazarlama ile ürün yüzü birlikte kurulur).
- Olumsuz: kod öncesi birkaç oturum daha; beta daha da gecikir.

## Etkilenen
`plan/oturum-promptlari/UIUX.md` (Faz 5 ile değişti), `arastirma/` (yeni hatlar), ADR-016, ADR-067, `docs/anayasa.md` (olası ADR'ler).
