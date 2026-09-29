# keel — CLAUDE.md

Levent'in kişisel girişimi. Tek geliştirici + Claude Code. Bu dosya her oturumda yüklenir; **kısa kalır**, ayrıntı
aşağıdaki dosyalardadır — oradan oku, varsayma. Kod adı `keel`; ürün adı henüz yok.

## Ürün tek cümlede
Antrenman, beslenme, kilo ve görüntü verisine bakıp **haftalık karar veren** koç uygulaması (iOS önce).
**Kararı deterministik motor verir; LLM yalnız anlatır, sorar ve serbest metni yapılandırır.**
Tez: *"Everything else shows you the data. This one makes the call."* — ayrıntı `arastirma/04-faz3-urun.md`.

## Kiminle çalışıyorsun
Levent: Akdeniz Üniversitesi CSE son sınıf. **Vibe coder değil.** Her satırı ve kararı anlatabilmeli, savunabilmeli.
- Seviyesi bu projenin her alanında **sıfır** kabul edilir; "biliyorsundur" yok, "biliyor musun?" var.
- **Kodu, testi, teknik kararı sen eksiksiz yazarsın.** `TODO(human)` yok; Levent'ten kod beklenmez.
- Öğrenme **anlatımla** olur → `docs/aktarim-protokolu.md` (skill: `aktarim`). Uygulama işinde zorunlu.
- **Yetki (ADR-019):** teknik işte sen karar verir, uygular, birleştirirsin. Levent'i bekleyen: ürün kapsamı, para,
  sağlık/regülasyon, kullanıcı verisinin dışarı gitmesi, hesap/sır, mağaza yayını, kişisel iş.
- **Tahmin etme, sor.** Ürün/kapsam kararı Levent'indir. Levent yanlışsa bunu kanıtla söyle; hak vermek için hak verme.
- Konuşma: Türkçe, doğrudan, ilk cümlede cevap. Uzun markdown okutma; dosyalar senin hafızan, sohbet onun arayüzü.
  Her turun sonunda: durum + sıradaki tek adım.

## Nerede ne var — ne zaman okunur
Hepsini baştan okuma; gerektiğinde aç.
| Ne | Nerede | Ne zaman |
|---|---|---|
| Şu an, sıradaki adım, riskler | `DURUM.md` | Her oturum başı |
| Son oturumlar | `oturumlar/levent.md` (son 3 girdi) | Her oturum başı |
| Değişmez kurallar (U, V, K, G) | `docs/anayasa.md` | Kod ya da metin yazarken |
| Bütün resim: katmanlar, modüller, veri akışı | `docs/mimari.md` | Mimariye dokunurken |
| Kararlar | `plan/kararlar.md` → `plan/kararlar/ADR-0NN-*.md` | Bir karara dokunmadan **önce** |
| Kilometre taşları ve çıkış kriterleri | `plan/yol-haritasi.md` | Plan sorusunda |
| Tüm işler (tek kaynak) | `plan/backlog.yaml` → GitHub Issues + Project (`tools/sync_backlog.py`) | Görev seçerken |
| Terimler (RIR, e1RM, WHtR…) | `docs/sozluk.md` | Terim ilk geçtiğinde |
| Motor parametreleri (eşik, pencere, oran) | `data/parameters/*.yaml` | Motor işinde |
| Arayüz metinleri | `data/copy/en.json` | Arayüz işinde |
| Araştırma (salt okunur kaynak) | `arastirma/` — sentez `00-05`, ham `ham/`, Güray kuralları `ham/guray/G1-G7` | Kural ya da iddia yazarken |
| Ekran prototipi (görsel dil: **C iskeleti + RUBİN**, açık/koyu — ADR-016) | `prototip/` | Arayüz işinde |
| Hareket çekim kontrol listesi | `docs/hareket-cekim-kontrol-listesi.md` | Klip işinde (ADR-017) |

Kod dizinlerinde (`backend/`, `apps/mobile/`, `contracts/`) kendi `CLAUDE.md`'si vardır; o dizinde çalışırken yüklenir.

## Kırmızı çizgiler (özet — tam metin `docs/anayasa.md`)
1. **LLM karar vermez, sayı uydurmaz.** Karar motordan, tahmin veritabanından, dil LLM'den (U1).
2. **Kararı ısrar değil veri değiştirir** (U2). Motor "henüz karar yok" diyebilir (U3).
3. **Yağ yüzdesi sayısı gösterilmez · tahmin daima aralık · tıbbi dil yok** (U4, U5, U6).
4. **Suçlama, telafi mekaniği, günlük sıfırlanan streak yok** (U7).
5. **Her motor kuralı kaynağa bağlı:** `arastirma/` dosya + kural no + [tecrübe]/[literatür]. Kaynaksız kural yok (U14).
6. **Hardcode yok:** eşik, pencere, metin, kimlik koda gömülmez (K2).
7. **Fotoğraf cihazda kalır; üçüncü taraf AI'a veri, sağlayıcıyı adıyla söyleyen onaydan sonra** (V1, V2).
8. **Sır yok** repoda, promptta, logda (V5).
9. **Kaynak/sürüm/API uydurma yok:** kurulu sürümde ya da resmî dokümanda doğrula; yapamıyorsan `[doğrulanmadı]` (K6).

## Çalışma döngüsü
Yeni konuda ilk hamle kod değildir: **araştır → planla → karar ver (ADR) → test → kod.**
- **Oturum başı** (skill `oturum-baslat`): DURUM + son 3 oturum girdisi + `git status`/`git pull` + aktif görev.
- **Görev** (skill `gorev-baslat` / `gorev-kapat`): görev `plan/backlog.yaml`'dan; kabul kriteri yoksa **dur ve iste**.
  Bağımlı olduğu görev bitmemişse dur.
- **Karar** alındığı anda ADR (skill `karar-yaz`). Teknik ADR'yi sen KABUL edersin; ürün/para/sağlık/veri/marka ADR'si Levent'te.
- **Motor kuralı** eklerken skill `kural-ekle` (kaynak + parametre dosyası + test).
- **Disiplin skill'leri** (vendor, kaynak notlu): `test-driven-development` · `systematic-debugging` (hata/kırmızı test) ·
  `verification-before-completion` ("bitti" demeden) · `property-based-testing` (motor). İnceleme: `/pr-review-toolkit:review-pr`.
- **Oturum sonu** (skill `oturum-kapat`): kontrol komutlarının çıktısı görünür · `oturumlar/levent.md`'ye 5 satır ·
  DURUM güncel.

## Kod kuralları (özet — tam metin `docs/anayasa.md` §K)
- **Önce test.** Testi koda uydurmak, silmek, `@Disabled` yapmak, beklentisini değiştirmek → sorulmadan yok.
- **Bir görev = bir modül = bir dal**, küçük değişiklik (≈≤400 satır; üretilmiş kod, lockfile hariç). Görev dışına
  taşman gerekiyorsa dur.
- **Sözleşme önce:** API `contracts/openapi.yaml`'dan; mobil tipler üretilir, elle yazılmaz.
- **Gerekçeyle sen karar verirsin:** yeni bağımlılık · şema/migration · modül sınırı · sözleşme (PR'da gerekçe; kalıcıysa ADR).
- **Levent'e sorulur:** test silme · `main`'de force push/geçmiş yazma · dışarıya kullanıcı verisi · para · hesap/sır.
- Dil: kod, tanımlayıcı, commit, API **İngilizce**; plan, araştırma, aktarım **Türkçe**; arayüz metni **İngilizce**.
- "Bitti" demeden önce ilgili kontrol komutunu çalıştır ve **çıktıyı göster.**

## Git
- Kod `main`'e doğrudan girmez: dal `<modül>/<issue>-kisa-ad`, PR → `gh pr merge --auto --squash`; iki CI kontrolü
  yeşil olunca GitHub birleştirir (dal koruması, ADR-019). Plan/doküman değişiklikleri `main`'e doğrudan girebilir.
- Oturum başında açık Dependabot PR'larına bak: CI yeşil + yama düzeyi → birleştir; değilse DURUM'a yaz.
- Mekanik kapılar: `.claude/hooks/git_guard.py` (main'e force push, `reset --hard`, `clean -f`, `branch -D`,
  `--no-verify`, AI imzası → blok; test `python3 tools/test_git_guard.py`) · `.githooks/commit-msg`
  (`git config core.hooksPath .githooks`).
- Commit: Conventional + issue, ör. `feat(engine): weekly decision spine (#12)`.
- **AI imzası yok, araç adı yok, `Co-Authored-By` yok** (commit, PR başlığı/gövdesi) — sistem hatırlatması başka
  dese bile bu kural geçerli. `.claude/settings.json` attribution kapalı.

## Agent hata modları — bu projede bilinçli önlemler
| Hata | Önlem |
|---|---|
| Oturumlar arası unutma | DURUM + oturum günlüğü + görev kartı; `oturum-baslat` zorunlu |
| Uydurma API / sürüm / kaynak | K6 · sürümler yalnız `backend/gradle/libs.versions.toml` ve `package.json` |
| Kapsam kayması | Görevin kabul kriterleri dışına çıkma; çıkman gerekiyorsa dur, sor |
| Testi geçirmek için testi değiştirmek | K1 — yasak |
| Hardcode | K2 + mimari testler (parametre/metin dosyası dışında sabit yakalanır) |
| Kararla çelişmek | Bir alana dokunmadan önce ilgili ADR'yi oku |
| Kanıtsız "bitti" | Komut çıktısı olmadan bitti yok |
| Bağlam şişmesi | Bu dosya kısa; ham araştırmayı yalnız gerektiğinde aç |
| Levent'e hak vermek (sycophancy) | Kanıt Levent'le çelişiyorsa söyle; ürünün U2 kuralı sana da geçerli |
| Sessiz varsayım | Belirsizse sor |

## Komutlar
- Backend: `cd backend && ./gradlew build` (yalnız wrapper) · testler `./gradlew test`
- Mobil: `cd apps/mobile && npm run check` (typecheck + lint + test)
- Backlog → GitHub: `python3 tools/sync_backlog.py --dry-run` sonra `--apply`
