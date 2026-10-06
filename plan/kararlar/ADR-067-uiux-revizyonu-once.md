# ADR-067 · UI/UX revizyonu beta kohortundan önce: M9 Part 3 ertelendi
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (öneren: agent)

## Bağlam
M9 Part 2'de uygulama ilk kez gerçek iPhone'da, gerçek sunucuyla kullanıldı (development build, `https://keel-beta.duckdns.org`). Altyapı çalıştı:
Apple ile giriş uçtan uca, HealthKit okuma/yazma, kamera ve barkod, yerel yedek hariç tutma (K-618), VoiceOver duyuruları (K-815).
Ürün deneyimi çalışmadı. Levent'in gözlemi: "isteğimin uzağında"; onboarding'de karmaşa; koyu tema iç karartıcı, açık temanın yeri belli değil;
metin çok fazla ve çok düz, "insanlar kullanmaz"; "test ederken bile ne nerede anlamıyorum". Cihaz turunun bulguları bunu destekliyor
(`docs/aktarim/M9/cihaz-kontrol-listesi.md`): AX5'te başlıklar kelime ortasından bölünüyor, Kalın Metin etiketlerin sonunu kesiyor, AI kapalıyken
öğün fotoğrafı ve koç kullanıcıyı Ayarlar'da bulunmayan bir rızaya yönlendiriyor (çıkmaz sokak), boş "Share your progress".
Prototip (`prototip/`, ADR-016) vardı ama gerçek akışta, gerçek elde sınanmadı; ekranlar görev görev büyüdü.

## Karar
1. **M9 Part 3 (beta kohortu, öncü göstergeler, geri bildirim döngüsü) ertelenir.** Kullanılmayacağı düşünülen bir uygulamaya beta kohortu toplanmaz;
   kohortun ilk izlenimi tek seferliktir.
2. **Araya UI/UX revizyonu girer** (yol haritası › "M9 ara · UI/UX revizyonu"). Sıra: ekran envanteri → bütün ekranların tıklanabilir artifact prototipi
   (kod yok, derleme yok; Levent telefonda gezer, "kalsın/gitsin" der) → onaylanan tasarım ADR'lere (ADR-016 görsel dil yeniden ele alınır) → koda.
3. Değişecek arayüzün kalan cihaz maddeleri (çıkış, Reduce Motion, hesap silme + Apple iptali) yeni tasarımdan sonra bir kez yapılır.
   İşlevsel hatalar (AI kapalıyken rıza çıkmaz sokağı, Kalın Metin kesmesi) revizyonun girdisi olarak backlog'da (K-909, K-910).
4. TestFlight dahili derlemesi (K-903) sürer: revizyon da gerçek cihazda sınanacak.

## Sonuçlar
- Olumlu: beta kullanıcısının ilk izlenimi, düzeltilmiş üründen. Revizyon kodsuz prototiple hızlı döner.
- Olumsuz: beta ve öncü göstergeler gecikir; lansman tarihi kayar (Ocak'ta lansman yok kuralı zaten geçerli).
- Geri dönmenin maliyeti: düşük — Part 3'ün prompt'u ve görevleri (K-904, K-905, K-906, K-816) yerinde duruyor.

## Etkilenen
`plan/yol-haritasi.md` (ara durak), `plan/oturum-promptlari/M9-part3.md` (revizyondan sonra), ADR-016 (görsel dil), `docs/aktarim/M9/cihaz-kontrol-listesi.md`.
