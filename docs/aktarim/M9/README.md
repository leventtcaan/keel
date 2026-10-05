# M9 aktarım planı — Beta

> Toplu mod (`docs/aktarim-protokolu.md`). Kod birleşti; Levent anlatabilene kadar "aktarılmamış".
> Her görev dosyası: projede nerede · neden · basamaklar · satır satır anlatılacak yerler · canlı kanıt · soru bankası.

## Aktarım sırası (Part 1 · Sunucu ayakta)
1. K-907 üretim profili (`K-907.md`, ADR-064 #5, ADR-062 #3) — Spring profilleri, fail closed, `@Value` kablolaması, YAML 1.1 `off` tuzağı
2. K-901 sunucu (`K-901.md`, ADR-064, ADR-065 + Ek 1) — Docker Compose, ağlar, Caddy/HTTPS, şifreli yedek + prova, journald, SSH sertleştirme
3. K-902 CI'dan dağıtım (`K-902.md`, ADR-066 + Ek 1) — `workflow_run`, Environment sırları, zorunlu komut, deposuz imaj, eski commit koruması

## Aktarım sırası (Part 2 · TestFlight ve cihaz)
4. K-903 EAS + TestFlight (`K-903.md`, `docs/eas-derleme.md`) — profil ↔ ortam, `EXPO_PUBLIC_`, ihracat beyanı, imza, `ascAppId`
5. K-618 yedekten hariç (`K-618.md`, ADR-047, ADR-055 #97) — yerel Expo modülü, Swift `URLResourceValues`, autolinking, `xattr` kanıtı
6. K-815 VoiceOver duyuruları (`K-815.md`) — `announceForAccessibility`, oluş kimliği, durum ↔ olay; cihaz turu (`cihaz-kontrol-listesi.md`)
