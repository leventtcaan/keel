# Motor parametreleri

Karar motorunun her eşiği, penceresi ve oranı burada — kodda değil (anayasa K2, ADR-010).

Her parametre:
| Alan | Zorunlu | Anlam |
|---|---|---|
| `key` | ✓ | Kodun okuduğu ad (snake_case) |
| `value` ya da `by_sex` | ✓ | Değer; cinsiyete göre değişiyorsa `by_sex: {male, female}` |
| `unit` | ✓ | Birim (`kg`, `kcal`, `g_per_kg`, `days`, `ratio`, `count`…) |
| `tag` | ✓ | `tecrube` (Güray) · `literatur` · `urun` (ürün kararı) |
| `source` | ✓ | `arastirma/...md#kural` — çapa zorunlu ve dosyada bir başlık (`### K-17 ·`, `## 3.4`) olmalı (ADR-020) |
| `note` | — | Çelişki, türetme, sınır |

**Telefonun okuduğu parametreler** (`*.json`, ADR-029): aynı alanlar; kaynak bir `arastirma/…md#başlık` ya da bir
YAML tanımı (`contracts/openapi.yaml#NewWeighIn` — o adın kendi satırında tanımlı olması). Doğrulama: mobil
`parameters.test.ts` (köken + sözleşmedeki hassasiyetle eşleşme).

Çelişkide **Güray kazanır**, literatür boşluk doldurur (U14). Değişiklik: skill `kural-ekle`.
Doğrulama: `ParameterProvenanceTests` + `SourceAnchorTests` (backend).
