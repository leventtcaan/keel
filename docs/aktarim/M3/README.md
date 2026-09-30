# M3 aktarım planı — Mobil kabuk

> Toplu mod (`docs/aktarim-protokolu.md`). Kod birleşti; Levent anlatabilene kadar "aktarılmamış".
> Her görev dosyası: projede nerede · neden · basamaklar · satır satır anlatılacak yerler · canlı kanıt · soru bankası.

## Tek koşan örnek (bütün M3 boyunca)
Pazartesi sabahı telefon açılır: sistem koyu moddaysa uygulama da koyudur; **Bugün** sekmesinde haftanın kararı ters
renkli blokta durur ("EAT A LITTLE MORE"), altında kalori **aralığı** (1800–2100 kcal, U5). Metinlerin hepsi
`data/copy/en.json`'dan gelir ve tıbbi dil taşıyamaz (U6). Ekran sunucuya, sözleşmeden üretilmiş tiplerle konuşur.

## Aktarım sırası (bağımlılığa göre)
1. K-301 tasarım sistemi — token, tema bağlamı, ters yüzey, bileşen
2. K-302 metin sistemi — yasaklı ifade taraması, ham metin bekçisi
3. K-303 API istemcisi — sözleşmeden tip, kimlik ara katmanı
4. K-307 gezinme — sistem sekme çubuğu
5. K-311 oturum — tek uçuşlu yenileme, bellek + nesil sayacı
6. K-304 yerel depo + kuyruk — SQLite, clientId idempotency, NoAnswer
7. K-305 Apple ile giriş — nonce, Keychain, korumalı rota, servislerin tek kökü
8. K-310 birimler — tek yuvarlama noktası, gidiş-dönüş, tercih (profil + önbellek)
