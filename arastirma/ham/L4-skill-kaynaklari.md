# keel için dış skill / plugin araştırması (29 Eyl 2026)

Hiçbir şey kurulmadı, repoya yazılmadı. Yıldız / son push / lisans değerleri `gh api repos/<o>/<r>` ile 29 Eyl 2026'da
alındı. "Okundu" denilen her SKILL.md ve script `gh api .../contents` ile açılıp okundu. Anthropic resmî pluginleri yerel
kopyadan okundu (`~/.claude/plugins/marketplaces/claude-plugins-official`, dizin tarihi 8 Eyl 2026; uzak repo 29 Eyl'de
güncellenmiş, yani yerel kopya ~3 hafta eski olabilir).

Karar dili: **kur (plugin)** · **vendor et** (kopyala + kaynak/lisans notu, `.claude/skills/` altına) ·
**uyarla** (kendi skill'imize fikir) · **alma**.

---

## Kısa liste (sıralı)

### 1 · obra/superpowers — TDD, sistematik debug, bitirmeden önce doğrulama
- **Repo:** https://github.com/obra/superpowers · MIT · 292.693★ · son push 2026-09-27
- **Yollar:** `skills/test-driven-development/SKILL.md` (330 satır) · `skills/systematic-debugging/SKILL.md` (283) ·
  `skills/verification-before-completion/SKILL.md` (120)
- **Ne yapar:** "Iron Law" tarzı disiplin: test önce + **RED'i gözle gör** (test *error* değil, beklenen sebeple *fail*
  etmeli) · kök neden bulunmadan düzeltme yok (4 faz) · "bitti" demeden taze komut çıktısı + exit code.
- **keel'e neden uyuyor:** K1, K9 ve `gorev-baslat` adım 4 / `gorev-kapat` adım 1'in birebir daha sıkı hali.
  "Agent completed → VCS diff shows changes" satırı alt-agent kullanımında kanıt kuralı olarak değerli.
- **Okuduktan sonra riskler:**
  - **Plugin olarak kurulursa** `hooks/session-start` her oturum başında `using-superpowers` içeriğini
    `<EXTREMELY_IMPORTANT>` ile enjekte ediyor: "%1 ihtimal bile varsa skill'i MUTLAKA çağır", plan moduna girmeden
    önce `brainstorming`. Bu, `oturum-baslat` önceliğiyle ve Levent'le konuşma düzeniyle çakışır; sürekli token maliyeti.
  - `brainstorming` tasarımı `docs/superpowers/specs/…` altına yazıp **commit'liyor** (bizim yer `plan/kararlar/`);
    ayrıca `127.0.0.1`'de yerel bir web sunucusu açabiliyor (onayla).
  - `finishing-a-development-branch` seçeneklerinden biri base dala **yerel merge** → G1 ile çakışır (kod `main`'e
    doğrudan girmez). Force-push/`--force` için açıkça "sorulmadan yok" diyor — iyi.
  - TDD skill'inde "Test passes? … Fix test." RED fazına ait; K1 ile çelişmiyor ama `pending` spesifikasyon testleri
    (ADR-009) için "etiketi kaldır → kırmızıyı göster" olarak yorumlanmalı. Örnekler TypeScript.
  - `systematic-debugging/find-polluter.sh`: yerel bisection scripti, ağ yok; npm test'e göre yazılmış.
- **Kurallarla çakışma:** AI imzası/auto-commit yok (bu 3 skill'de). Plugin bütünü: G1 (merge seçeneği), oturum düzeni.
- **Öneri: vendor et** — yalnız bu 3 skill; MIT başlığı + kaynak commit notu. Plugin olarak **alma**.

### 2 · anthropics/claude-plugins-official → `pr-review-toolkit`
- **Repo:** https://github.com/anthropics/claude-plugins-official · Apache-2.0 · 37.186★ · son push 2026-09-29
- **Yol:** `plugins/pr-review-toolkit/` (6 agent + `/review-pr` komutu)
- **Ne yapar:** Diff üzerinde uzman agent'lar: `pr-test-analyzer` (davranışsal kapsam boşluğu, sınır değer, negatif
  test), `silent-failure-hunter` (yutulan hata, sessiz fallback), `type-design-analyzer`, `comment-analyzer`,
  `code-reviewer`, `code-simplifier`.
- **keel'e neden uyuyor:** `gorev-kapat` adım 2 ("kendi incelemen") için somut araç. Motorun "henüz karar yok" yolu,
  LLM çıktısının şemaya karşı doğrulanıp **atılması** (U1) ve kota/yetki hataları tam da sessiz-hata avcısının alanı.
- **Riskler:** Hook yok, script yok, ağ yok (okundu). `code-reviewer` ve `code-simplifier` `model: opus` sabit →
  pahalı; `code-reviewer` açıklaması "proactively" diyor → kendiliğinden tetiklenebilir. Built-in `/code-review` ile
  kısmi örtüşme.
- **Çakışma:** Yok (review-pr içindeki "commit/push" yalnız öneri metni; attribution yok).
- **Öneri: kur (plugin)** — `/pr-review-toolkit:review-pr tests errors` şeklinde hedefli kullan.

### 3 · trailofbits/skills → `property-based-testing`
- **Repo:** https://github.com/trailofbits/skills · **CC-BY-SA-4.0** · 7.286★ · son push 2026-09-28
- **Yol:** `plugins/property-based-testing/skills/property-based-testing/SKILL.md` (68 satır) + `references/`
  (generating, refactoring, reviewing, interpreting-failures, libraries)
- **Ne yapar:** Özellik kataloğu (invariant, idempotence, oracle, roundtrip…), "tautoloji" ve "vacuity" tuzakları,
  kütüphane seçimi — **Java: jqwik, TS: fast-check** (libraries.md'de doğrulandı).
- **keel'e neden uyuyor:** Karar motoru saf ve deterministik (ADR-003) → PBT'nin en verimli olduğu kod tipi.
  Örnek özellikler: aynı girdi → aynı karar (determinizm), "bir seferde tek değişken değişir" (U3), RED-S hard stop
  tetiklenince kalori düşürme kararı **hiçbir** girdide çıkmaz (U13), haftalık kayıp tavanı aşılmaz.
- **Riskler:** Script/hook yok. Skill "PBT kütüphanesi eklemek kullanıcının kararı, bir kez teklif et" diyor —
  keel'de ADR-019/K5 gereği bu agent kararı (PR'da gerekçe); vendor ederken bu satırı uyarlamak gerek.
- **Çakışma:** Lisans ShareAlike: vendor edilen dosya CC-BY-SA kalmalı, atıf şart (kod değil doküman olduğu için sorun
  değil, ama not düşülmeli).
- **Öneri: vendor et** (jqwik bağımlılığı ilk motor kuralı görevinde K5 gerekçesiyle).

### 4 · safaiyeh/app-store-review-skill
- **Repo:** https://github.com/safaiyeh/app-store-review-skill · MIT · 358★ · son push 2026-09-25 (v1.3.2)
- **Yol:** `SKILL.md` (~200 satır) + `rules/1-safety.md … 5-legal.md` (~3.000 satır, talep üzerine yüklenir)
- **Ne yapar:** Apple App Review Guidelines'a karşı kod taraması; Swift **ve React Native/Expo**. 8 Haz 2026
  güncellemesine kadar işlenmiş (skill'in kendi iddiası). 5.1.1/5.1.2 (üçüncü taraf **AI** paylaşımının açıklanması
  dahil), 5.1.3 Health/HealthKit, 1.4.1 medikal, hesap silme, 4.8 Sign in with Apple, 3.1 RevenueCat + restore.
- **keel'e neden uyuyor:** V2 (AI onayı, 5.1.2(i)), V6 (hesap silme), U6 (tıbbi dil), ADR-011/012/018 doğrudan kapsamda.
- **Riskler:** Script yok. SKILL.md sonunda "Reporting Skill Issues" bölümü: agent'a, skill hatalı görünürse
  kullanıcıya **`gh issue create --repo safaiyeh/...`** teklif etmesini söylüyor (onaysız göndermeyi yasaklıyor ama
  dışarıya veri yolu açıyor). Açıklaması geniş ("payments, user data" işlerinde tetiklen) → gereksiz tetiklenme.
  Kılavuz değişir: vendor edilen kopya donar.
- **Çakışma:** Yok; "doktora danışın" önerisi U6 ile uyumlu.
- **Öneri: vendor et** — feedback bölümünü sil, açıklamayı "mağaza gönderimi / App Review hazırlığı" ile daralt,
  başlığa kaynak commit + tarih yaz; her mağaza gönderiminden önce upstream ile diff (K6).

### 5 · mattpocock/skills → `git-guardrails-claude-code` (fikir) + `tdd` anti-pattern'leri
- **Repo:** https://github.com/mattpocock/skills · MIT · 271.703★ · son push 2026-09-24
- **Yol:** `skills/misc/git-guardrails-claude-code/{SKILL.md, scripts/block-dangerous-git.sh}` · `skills/engineering/tdd/SKILL.md`
- **Ne yapar:** PreToolUse(Bash) hook'u tehlikeli git komutlarını (`push`, `reset --hard`, `clean -f`, `branch -D`,
  `checkout .`) exit 2 ile bloklar. `tdd`: tautolojik test, implementasyona bağlı test, "horizontal slicing" tuzakları.
- **keel'e neden uyuyor:** G3/G4 şu an yalnız metin kuralı. Deterministik hook ile zorlanabilir.
- **Riskler / çakışma:** Script **her `git push`'u** blokluyor → ADR-019 (agent dal push'lar, auto-merge) ile çakışır.
  `tdd` skill'i "test yazmadan önce seam'leri kullanıcıyla onayla" diyor → Levent seviye 0 ve kabul kriterleri
  backlog'da; ADR-019 ile çakışır. Plugin 25 skill → açıklama token maliyeti.
- **Öneri: uyarla** — kendi hook'umuz: `push --force`/`-f`, `push … main`, `reset --hard`, `branch -D`, `clean -f`,
  `commit --no-verify` blok + commit mesajında `Co-Authored-By` / araç adı varsa blok (G3). Kurulum Levent'in
  onayıyla `.claude/settings.json`'a (kalıcı yapılandırma).

### 6 · supabase/agent-skills → `supabase-postgres-best-practices`
- **Repo:** https://github.com/supabase/agent-skills · MIT · 2.662★ · son push 2026-09-28 (Supabase org)
- **Yol:** `skills/supabase-postgres-best-practices/SKILL.md` (66 satır) + `references/` (~30 kural dosyası)
- **Ne yapar:** Öncelikli Postgres kuralları: eksik/kompozit/kısmi index, FK index, constraint, veri tipi, pagination,
  kilit/deadlock, EXPLAIN. Her kural yanlış/doğru SQL örneğiyle.
- **keel'e neden uyuyor:** ADR-005 (PostgreSQL + Flyway, zaman serisi, karar denetim kaydı) planlı; şema/migration
  agent kararı (K5) → karar kalitesi için referans.
- **Riskler:** Saf doküman, script yok. Supabase'e özgü notlar (RLS, pooler) keel'de geçersiz → ayıkla.
  JetBrains/skills bu skill'in doğrulanmış kopyasını da tutuyor (aynı içerik).
- **Öneri: vendor et** — ilk DB/Flyway görevi başladığında (şimdi değil).

### 7 · rrezartprebreza/spring-boot-skills → `spring-boot-4/spring-modulith` (+ `flyway-migrations`)
- **Repo:** https://github.com/rrezartprebreza/spring-boot-skills · MIT · 290★ · son push 2026-09-21 ·
  **tek yazar, 3 commit** (düşük provenans)
- **Yol:** `skills/spring-boot-4/spring-modulith/SKILL.md` · `skills/spring-boot-4/flyway-migrations/SKILL.md`
- **Ne yapar:** Modulith 2.x / Boot 4 çizgisi; `ApplicationModules.verify()` CI'da; `allowedDependencies`;
  **kalıcı event publication registry'nin şemasını migration'la yönet**; handler idempotency; resmî doküman linkleri.
- **keel'e neden uyuyor:** ADR-015 (12 modül) ve `ModularityTests.java` zaten var; event registry + Flyway kesişimi
  ADR-005'e girecek. "İlgisiz işte modül yeniden yapılandırma" uyarısı K4 ile uyumlu.
- **Riskler:** Script yok (repo'daki `scripts/*.py` yalnız repo doğrulaması). Örnekler Maven; flyway skill'i
  `spring-boot-starter-flyway` ve `flyway-database-postgresql` diyor — keel'in Boot 4.1.1 BOM'unda
  **[doğrulanmadı]**. Aynı repodaki `openapi-first` generator sürümünü (7.5.0) sabitliyor → K6 riski.
- **Öneri: uyarla** — `backend/CLAUDE.md`'ye ya da ileride `migration-yaz` skill'ine 5-6 madde.

### 8 · anthropics/claude-plugins-official → `claude-security`
- **Yol:** `plugins/claude-security/` · **lisans: Anthropic proprietary** (Claude Code ile iç kullanım; kopyalama değil
  kullanım lisansı) · v0.11.0
- **Ne yapar:** Oturum içinde çok-agent güvenlik taraması: tehdit modeli, her bulgu ayrı agent'la doğrulanır,
  sonra isteğe bağlı `.patch` dosyaları. "Scan changes" modu dal diff'i için.
- **keel'e neden uyuyor:** Sağlık verisi (V3), Sign in with Apple, RevenueCat webhook, tek egress (ADR-004) —
  mağaza gönderimi / kilometre taşı öncesi derin tarama. Kurulu `security-guidance` (desen hook'u) ve built-in
  `/security-review`'dan daha derin.
- **Riskler (okundu):** Hook'lar yalnız banner ve kendi script'leri sonrası "metrics"; README'ye göre kullanım sayıları
  Claude Code'un yerleşik telemetrisiyle gidiyor (`DISABLE_TELEMETRY=1` ile kapanır). Rapor klasörünü repo içine yazar
  (kendi `.gitignore`'uyla). Patch'leri **uygulamaz, commit etmez**. Tarama pahalı (tier seçilebilir).
- **Çakışma:** Yok.
- **Öneri: kur (plugin)** — ama yalnız kilometre taşlarında elle çalıştır.

### 9 · callstackincubator/agent-skills → `react-native-testing` (RNTL)
- **Repo:** https://github.com/callstackincubator/agent-skills · MIT · 1.658★ · son push 2026-09-16
- **Yol:** `plugins/vendored/.agents/skills/react-native-testing/SKILL.md` (161 satır) — kaynağı
  `callstack/react-native-testing-library` (RNTL'nin kendi bakımcıları; `skills-lock.json`'da doğrulandı)
- **Ne yapar:** RNTL v13/v14 sürüm tespiti, sorgu önceliği (`getByRole` > … > `getByTestId`), `userEvent`,
  erişilebilirlik matcher'ları (`toHaveAccessibleName` vb.).
- **keel'e neden uyuyor:** Mobil Jest + jest-expo var; bileşen testleri erişilebilirlik sorgularıyla yazılınca a11y
  de test edilmiş olur.
- **Riskler:** Skill'de script yok. `testing-react-native-apps` plugin'i ayrıca `agent-device` / `dogfood` (cihaz
  otomasyonu) getiriyor — gerek yok. keel'de `@testing-library/react-native` **henüz yok** → yeni bağımlılık (K5).
- **Öneri: vendor et** — yalnız bu skill, ilk bileşen testi görevinde.

### 10 · sivaprasadreddy/sivalabs-agent-skills → `spring-boot` (test seviyeleri referansı)
- **Repo:** https://github.com/sivaprasadreddy/sivalabs-agent-skills · MIT · 184★ · son push 2026-09-03 ·
  yazar bilinen Spring eğitmeni (JetBrains blogu Ağu 2026'da bu repoyu örnek gösteriyor)
- **Yol:** `skills/spring-boot/SKILL.md` + `references/testing-strategy.md` ve test referansları
- **Ne yapar:** Boot 4.x; test seviyeleri tablosu (unit / persistence slice + Testcontainers / web slice /
  `RestTestClient` e2e), context caching.
- **Riskler:** Maven, Thymeleaf, Taskfile odaklı. `spring-modulith-verifier` kendi isimlendirme kalıbını
  (`*Cmd`, `UsersAPI` facade, paket düzeni) dayatıyor → ADR-015 ile çakışabilir; alma. `install.sh` birden çok agent
  dizinine kopyalıyor (kullanma).
- **Öneri: uyarla** — test seviyeleri tablosunu `backend/CLAUDE.md`'ye.

---

## Reddedilenler
- **superpowers (plugin olarak):** SessionStart enjeksiyonu + brainstorming zorlaması + yerel merge seçeneği (bkz. #1).
- **affaan-m/ECC** (269.323★): plugin hook'ları her Bash/Write'ta `~/.claude` altında plugin kökü arayan uzun inline
  `node -e` bootstrap çalıştırıyor; skill'ler genel (Maven, "%80 JaCoCo"); ADR skill'i `docs/adr/` kullanıyor.
- **wshobson/agents** (40.079★): yüzeysel tarandı; genel ve büyük, bizdekilerle örtüşüyor.
- **semgrep (→ semgrep/guardian, 13★):** her Write/Edit/Bash ve SessionStart'ta opak derlenmiş binary hook + hesap girişi.
- **sonarqube plugin:** SonarQube sunucu/hesap gerekir; marketplace açıklamasına göre her düzenlemede PostToolUse analizi
  (derin okunmadı).
- **42crunch-api-security-testing** (1★): token/hesap (`~/.42crunch/conf/env`), `42c-ast` binary'sini sessizce
  güncelliyor; spec'in platforma gidip gitmediği **[doğrulanmadı]** → V5/K5.
- **RevenueCat resmî plugin** (`rc`/`revenuecat` → RevenueCat/ai-toolkit, MIT, 72★): uzak MCP (`mcp.revenuecat.ai`)
  OAuth ile **tüm RC projelerine** erişim (hesap → Levent); ~30 skill açıklaması; `entitlements-gate` istemcideki
  `customerInfo`'yu doğruluk kaynağı sayıyor → ADR-012 (sunucu tarafı yetki) ile çakışır. Abonelik görevinde yeniden bak.
- **nizos/tdd-guard** (2.354★): JUnit/Gradle desteği yok. Halefi **nizos/probity** (216★): npm dev bağımlılığı +
  AI-doğrulamalı kurallar her aksiyonda ek tur/token; genç. İzlemeye değer, şimdi değil.
- **dpearson2699/swift-ios-skills** (healthkit, ios-accessibility, app-store-review): **PolyForm Perimeter** lisansı
  (OSI değil, rekabet kısıtı) + Swift-native; keel Expo.
- **vercel-labs react-native-skills** ve **callstack react-native-best-practices:** kurulu `expo` plugin'iyle örtüşme;
  performans işi erken.
- **JetBrains/skills** (357★, lisans alanı yok, skill başına lisans): iyi vetting (CI'da Cisco skill-scanner) ama
  Kotlin odaklı; `schema-migration-planner`'ın kaynağı kişisel repo (yalishevant, 17★); zero-downtime planı tek VPS'te
  şimdilik gereksiz — ileride fikir kaynağı.
- **openai security-threat-model** (JetBrains aynası üzerinden): openai/skills'te repo lisansı yok → belirsiz.
- **GoldenWing-360/claude-security-skills** (19★, May 2026): vps/docker/github-actions kontrol listeleri makul ama
  düşük itibar; docker skill'i `sudo wget` ile sabitlenmemiş `master` scriptini `/usr/local/bin`'e indirtiyor → tedarik
  zinciri riski. Yalnız fikir.
- **rrezartprebreza openapi-first:** Maven + sabit `openapi-generator 7.5.0`; keel `openapi-typescript` kullanıyor.
  İyi bir contract-first skill bulunamadı → kendi skill'imiz (aşağıda).
- **trailofbits mutation-testing** (mewt/muton, Java/PIT değil) · **supply-chain-risk-auditor** (yalnız npm/PyPI/Go,
  Gradle yok; `uv run` + çok sayıda HTTP) · **agentic-actions-auditor** (CI'da AI agent yok) · **differential-review**
  (claude-security ile örtüşme).
- **anthropics/claude-code-security-review** (GitHub Action, 6.279★, son push 2026-02-11): CI'a `CLAUDE_API_KEY` sırrı
  (hesap → Levent), diff'i API'ye gönderir, README "prompt injection'a karşı sertleştirilmedi" diyor; built-in
  `/security-review` aynı işi yapıyor.
- **commit-commands** (Anthropic): `commit-push-pr` test/doğrulama olmadan commit+push+PR'ı tek mesajda yapıyor → K9 ve
  `gorev-kapat` ile çakışır.
- **hookify** (Anthropic): 4 olayda her araç çağrısında python çalıştırıyor; tek küçük hook yeterli (#5).
- **Spam:** `*/-Agent-Skills-SpringAI-` repoları (fvdggggg114, fgtegjh… 0★) — README Çince kurs reklamı + dış site
  linki; SEO spam, uzak dur.
- **yeochul-jeon/spring-boot-claude-skill** (3★): çok küçük, içerik okunmadı.
- **NVIDIA/SkillSpector** (18.570★, Apache-2.0): skill değil, skill tarayıcı. Vendor ettiğimiz skill'leri taramak için
  süreç aracı olabilir (OSV.dev'e ağ çağrısı, isteğe bağlı LLM aşaması).

### Kurulu pluginlerle ilgili not
- **expo** (kurulu): `hooks.json` her `Skill` çağrısında ve prompt genişlemesinde `node …/skill-event.cjs` çalıştırıyor.
  Kodda telemetri **opt-in, varsayılan kapalı** (`skill-event.cjs` satır 149). `expo-skill-feedback` skill'i
  `npx --yes submit-expo-feedback@latest` önerebilir → dışarı veri; Levent onayı olmadan çalıştırılmamalı.

---

## Mevcut 7 skill'imiz için somut iyileştirmeler
1. **Tüm açıklamalar (description):** superpowers `writing-skills` testine göre açıklama iş akışını özetlerse agent
   gövdeyi okumadan özete göre davranıyor. `gorev-baslat` ("Kabul kriterlerini doğrular, dalı açar, ön aktarımı yapar"),
   `gorev-kapat`, `oturum-kapat` açıklamalarından akış özetini çıkar, yalnız tetikleyicileri bırak. (Anthropic
   skill-creator ise az tetiklenmeye karşı "ısrarcı" açıklama öneriyor → ikisini skill-creator'ın eval döngüsüyle
   dene; `run_eval.py` `claude -p` alt süreci açıyor, token harcar.)
2. **oturum-baslat:** CLAUDE.md "oturum başında açık Dependabot PR'larına bak" diyor ama skill'de bu adım **yok** →
   adım 2'ye `gh pr list --author app/dependabot` ekle. Ayrıca `aktarim` için: önceki oturumun soru bankasından
   2 soruyla geri çağırma (mattpocock `teach`: retrieval practice, fluency ≠ storage strength).
3. **gorev-baslat adım 4:** "RED geçerli mi?" ölçütü: test *derleme hatası/exception* ile değil, **beklenen assertion**
   ile kırmızı olmalı; test ilk koşuda yeşilse var olan davranışı test ediyordur (superpowers TDD "Verify RED").
4. **kural-ekle adım 4:** tablo testlerine ek olarak **özellik testleri** (jqwik): determinizm, U3 tek değişken,
   U13 RED-S önceliği, tavan asla aşılmaz. **Anti-tautoloji kuralı:** beklenen değer `arastirma/` kaynağından gelir,
   kodun hesabı tekrarlanarak üretilmez (ToB PBT + mattpocock tdd).
5. **gorev-kapat:** adım 1'e "doğrulama kapısı": komut **aynı mesajda, taze** çalıştırılır, exit code okunur; alt-agent
   "bitti" dediyse `git diff` ile kanıtla (superpowers verification). Adım 2'ye `/pr-review-toolkit:review-pr tests
   errors`. Adım 5'teki "AI kullanımı:" satırı zaten araç adsız — G3 hook'u (#5) bunu mekanik olarak da korur.
6. **oturum-kapat:** "Sıradaki tek adım"ın yanına **hangi skill'le başlanacağı** (mattpocock `handoff`: "suggested
   skills"). Doğrulama kapısı burada da aynı.
7. **karar-yaz:** MADR'den iki alan: **Karar sürücüleri** (decision drivers) ve **Sonuçlar (olumlu / olumsuz)**;
   ayrıca "ADR gerekmez" ölçütü (geri dönüşü ucuz, tek dosyalık seçimler) → ADR enflasyonunu önler.
8. **Yeni skill boşlukları (dışarıda iyi örnek yok):**
   - `sozlesme-degistir`: `contracts/openapi.yaml` → lint (stoplightio/spectral 3.220★ ya da Redocly/redocly-cli
     1.517★) + kırıcı değişiklik kontrolü (oasdiff/oasdiff 1.393★, Apache-2.0) + `openapi-typescript` yeniden üretim.
   - `migration-yaz`: Flyway; uygulanmış migration düzenlenmez, expand/contract, FK index, event registry şeması
     (#6, #7'den).
   - `debug`: vendor edilen `systematic-debugging`.
   - HealthKit (Expo/RN) için güvenilir hazır skill bulunamadı → ADR-018 görevinde kendi skill'imiz.
9. **Yan bulgular (keel içi tutarsızlık):** `contracts/CLAUDE.md` "Sözleşme değişikliği sorulur (K5)" diyor; ADR-019 /
   anayasa K5 sözleşmeyi agent kararı sayıyor. CI'daki action'lar etiketle sabit (`actions/checkout@v7`), SHA ile değil
   (GitHub Actions sertleştirme kontrol listelerinin ilk maddesi).
