# ADR-060 · Veri envanteri koddan, yasal metinler repoda ve GitHub Pages'te (K-801, K-803, K-806)
- **Durum:** KABUL (agent, teknik — ADR-019; yayın yeri ADR-059 #3'te Levent'in)
- **Tarih:** 2026-10-04 · **Karar veren:** agent

## Bağlam
M8 Part 1: gizlilik politikası, kullanım şartları, sağlık feragatnamesi; App Store gizlilik etiketi ve yaş derecelendirmesi taslağı;
AI sağlayıcısının saklama/eğitim şartları. Metinlerin söylediği veri, kodun sakladığı veriyle aynı kalmalı (M8.md: "envanterle kod
çelişirse kod doğrudur"). Metinler herkese açık adres ister (ADR-059 #3: bu repodan GitHub Pages). Yasaklı ifade taraması (U4, U6)
metinlere de uygulanır — ama feragatname tanımı gereği "does not diagnose or treat" gibi olumsuzlayan cümleler içerir.

## Karar sürücüleri
- Metin ile kod testle bağlı: yeni bir tablo ya da sütun envantere girmeden CI yeşil olmaz.
- Tek kaynak: politikadaki veri listesi, App Store etiketi taslağı ve silme/dışa aktarma davranışı aynı dosyadan okunur.
- Yayın repodan, elle kopya yok; adres yapılandırmada (ADR-057 D3).
- Feragatname U6'yı delmez: istisna cümle cümle, veri dosyasında ve testli.

## Karar
1. **Envanter `docs/yasal/veri-envanteri.json`** (makine okunur, İngilizce anahtarlar ve değerler — politika metni buradan yazılır): her sunucu tablosu için modül,
   amaç, **sütunlar**, veri sınıfı (`health` / `training` / `account` / `subscription` / `technical` / `reference`), hukuki dayanak,
   yazmayı açan rıza, silinme olayları (hesap silme, rıza geri çekme, süre), dışa aktarmada mı, politikadaki bölüm kimliği, App Privacy
   türü; ayrıca **telefonda kalanlar** (izinler, Health türleri, yerel dosyalar) ve **dışarı giden akışlar** (alıcı, veri, ne zaman,
   dayanak).
2. **Envanter testi `tools/test_veri_envanteri.py`** (CI › Tooling): (a) göçlerdeki her tablo envanterde, envanterdeki her tablo göçlerde;
   (b) her tablonun sütunları göçlerdekiyle birebir (`create table` + `alter table … add/drop column`); (c) envanterin her `policy`
   bölümü gizlilik politikasında bir başlık kimliği olarak var ve politikanın her veri bölümüne en az bir envanter kaydı bağlı;
   (d) `apps/mobile/app.json`'daki her iOS izin açıklaması envanterin telefon izinlerinde; (e) App Privacy taslağındaki her tür envanterden
   gelir. Yalnız standart kütüphane (CI Tooling işinde `pip install` yok) → envanter JSON.
3. **Metinler `docs/yasal/site/`** (Markdown, Jekyll ön bilgisiyle `permalink`): `privacy.md`, `terms.md`, `health.md` (feragatname), `index.md`.
   Türkçe iç belgeler `docs/yasal/` kökünde: App Privacy + yaş derecelendirmesi taslağı (`app-store-beyanlari.md`), AI sağlayıcı şartları
   (`ai-saglayici-sartlari.md`).
4. **Yayın:** `.github/workflows/pages.yml` — GitHub'ın resmî Jekyll şablonu (actions/starter-workflows `pages/jekyll-gh-pages.yml`), kaynak
   yalnız `docs/yasal/site`, tetik `main`'e push (yalnız o klasör) + elle; eylemler SHA'ya sabit (configure-pages v6.0.0, jekyll-build-pages
   v1.0.13, upload-pages-artifact v5.0.0, deploy-pages v5.0.1 — 2026-10-04 `gh api repos/<r>/tags`). Adresler
   `https://leventtcaan.github.io/keel/privacy/`, `/terms/`, `/health/`.
5. **Telefon:** `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` `eas.json`'ın her derleme profilinin `env`'inde (gizli değil; Expo:
   `env` "should only be used for values you would commit to your git repository" — docs.expo.dev/eas/json, 2026-10-04). Test: her profilde
   iki adres var, https, ve `docs/yasal/site`'taki bir sayfanın `permalink`'ine çıkıyor.
6. **Yasaklı ifade taraması metinlerde:** `forbidden-phrases.test.ts` `docs/yasal/site/*.md`'yi de tarar. Feragat istisnası
   `data/copy/forbidden-phrases.json › legalNegations`: tam cümleler; her biri bir olumsuzlama içerir ("not", "does not", "never") ve bir
   metinde birebir geçer (bayat istisna kalmaz); tarama yalnız bu cümleleri çıkarıp kalanı tarar. Kişi adı taraması da metinlere uygulanır
   (veri sorumlusunun adı yapılandırmadan: ön bilgide yer tutucu — Levent'in vereceği değer, bkz. DURUM soruları).

## Neden
- Sütun düzeyinde bijeksiyon, "metinde olmayan veri saklıyoruz" hatasını CI'da yakalar; tablo düzeyi yetmez (V21 `note` gibi serbest
  metin sütunları sonradan eklendi).
- JSON: `tools/` testleri standart kütüphaneyle koşuyor (CI Tooling işinde `pip install` yok); YAML ayrıştırıcı eklemek bir bağımlılık.
- Resmî şablon ve SHA sabitleme CI'daki diğer eylemlerle aynı disiplin (Dependabot günceller).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Pages "branch'ten yayın", `/docs` | Bütün `docs/` (aktarım, anayasa) site olur |
| `gh-pages` dalına elle kopya | Metin iki yerde; unutulan kopya eski politikayı yayında bırakır |
| Envanter YAML + PyYAML | CI Tooling'e bağımlılık; kazanç yalnız yorum satırı |
| Feragatnameyi taramadan muaf tutmak | U6'yı tüm dosyada delerdi |

## Sonuçlar
Olumlu: yeni bir göç envantere ve politikaya girmeden birleşemez; App Store taslağı aynı kaynaktan. Olumsuz: her göç PR'ı bir JSON satırı
ekler (bilinçli bedel).

## Geri dönmenin maliyeti
Düşük — dosyalar ve bir iş akışı.

## Etkilenen
`docs/yasal/`, `tools/test_veri_envanteri.py`, `.github/workflows/ci.yml` (Tooling), `.github/workflows/pages.yml`, `apps/mobile/eas.json`,
`apps/mobile/src/__tests__/forbidden-phrases.test.ts`, `data/copy/forbidden-phrases.json`.

## Doğrulama
`python3 tools/test_veri_envanteri.py` yeşil; bir sütun envanterden silinince kırmızı (mutasyon); `npm run check` yeşil; yayından sonra üç
adres HTTP 200.
