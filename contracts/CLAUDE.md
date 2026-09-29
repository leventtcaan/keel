# contracts/ — CLAUDE.md

API sözleşmesi tek kaynaktır (K3, ADR-006). Backend bu sözleşmeyi uygular; mobil tipler `openapi-typescript` ile
bundan üretilir: `cd contracts && npm ci && npm run generate` → `apps/mobile/src/api/schema.ts` (elle düzenlenmez);
`npm run check` CI'da (ADR-024). Kurallar ADR-024'te; `backend/…/architecture/ContractTests` korur.
- Sözleşme değişikliği gerekçe + ADR ister (K5, ADR-019) ve kendi commit'inde, kodu değiştiren commit'ten önce yapılır.
- Kalori alanları **aralıktır** (`low`/`high`, U5). Yağ yüzdesi alanı **yoktur** (U4). Hata mesajında sağlık verisi yok (V3).
- İsim uydurma: alan adı backlog görevinde ya da ADR'de yoksa `docs/sozluk.md`'ye bak; ürün anlamı belirsizse Levent'e sor.
