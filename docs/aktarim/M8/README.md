# M8 aktarım planı — Uyum ve yasal

> Toplu mod (`docs/aktarim-protokolu.md`). Kod birleşti; Levent anlatabilene kadar "aktarılmamış".
> Her görev dosyası: projede nerede · neden · basamaklar · satır satır anlatılacak yerler · canlı kanıt · soru bankası.

## Aktarım sırası (Part 1 · Metinler ve envanter)
1. K-801 veri envanteri ve yasal metinler (`K-801.md`, ADR-059, ADR-060) — envanter koddan, sütun düzeyinde bağ, katı SQL okuyucu, GDPR Md. 13, olumsuzlama istisnası, Pages
2. K-806 AI sağlayıcısının saklama/eğitim şartları (`K-806.md`, ADR-044, ADR-041 #71) — ZDR vs eğitim yok, işleyen (processor), istisnalar
3. K-803 App Store gizlilik etiketi + yaş anketi (`K-803.md`) — Apple'ın "collect" tanımı, 9+ hesaplanır / 18+ zorunlu override, Usage Data
4. K-809 yasal adresler mağaza derlemesinde (`K-809.md`, ADR-057 D3) — `EXPO_PUBLIC_*` derleme anında, dev-client neden okumaz
5. K-808 sağlık rızası metni koda uyar (`K-808.md`, ADR-059 #2, soru 57) — metin sürümü, GDPR Md. 7(1), K1


## Aktarım sırası (Part 2 · Denetimler ve teslim)
6. K-802 silme + dışa aktarma uçtan uca, envantere bağlı (`K-802.md`) — `completion-mode`, "hiçbir sütunda" taraması, başarısız yayın, V34 testi, `export_key`
7. K-804 anayasa denetimi tek komut, mağaza metni, rota koruması (`K-804.md`, ADR-061) — expo-router rota kaydı, `_sitemap`, Guideline 2.3
8. K-810 yenileme jetonu ailesi gece silinir (`K-810.md`) — rotasyon, yeniden kullanım tespiti, saklama sınırı
9. K-814 RevenueCat olay kayıtları 30 gün (`K-814.md`) — idempotency penceresi, durum makinesi
12. K-807 erişilebilirlik denetimi + Besin Etiketi taslağı (`K-807.md`) — VoiceOver/RN erişilebilirlik ağacı, WCAG kontrastı, Dynamic Type
