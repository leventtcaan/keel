oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri; docs/aktarim-protokolu.md › Toplu mod).
Önceki bağlam compact edildi; DURUM.md › "▶ DEVAM NOKTASI (30 Eyl, üçüncü oturum)" tam olarak nerede kalındığını yazıyor —
oradan devam et, hiçbir şeyi baştan yapma. Ben paralelde başka işteyim; M2'yi baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Kapsam, sırayla:
1) Açık zincir: K-206 PR #160 → K-210 (rebase --onto origin/main 6754823 → PR) → K-214 (önce inceleme ajanları:
   code-reviewer + silent-failure-hunter; bulgular TDD; sonra rebase --onto origin/main 9aa255c → PR). DEVAM NOKTASI 1.
2) Kalan M2, DEVAM NOKTASI 2'deki sırayla: K-218 → K-219 → K-211 → K-208 → K-209 → K-212 → K-213 → K-216 → K-217.
   Sonraki göç V7. DEVAM NOKTASI 3'teki kurallar (rıza kapısı, ApiLimits, 400-asla-500, Decimals.plain, idempotency/409,
   *AccountData silme+dışa aktarma, katı JSON) her yeni uç noktada geçerli.

Her görev döngüsü (değiştirme): gorev-baslat → test önce (geçerli RED; derleme hatası/exception RED değil) → kod →
./gradlew build (+ gerekiyorsa npm run check ve contracts'ta npm run check) → pr-review-toolkit ajanları (code-reviewer +
pr-test-analyzer, gerekirse silent-failure-hunter) → bulguları TDD ile düzelt, mutasyonla kanıtla
(plan/oturum-promptlari/mutate.py; yedekten geri yükler, git checkout değil) → docs/aktarim/M2/<K-ID>.md (basamaklar,
satır satır yerler, canlı kanıt, soru bankası, gerçek dosya:satır) + README tablosu → PR gh pr merge --auto --squash →
DURUM tablosu. Her görev sonunda DURUM › DEVAM NOKTASI'nı güncelle (bağlam yine dolabilir; bir sonraki oturum yalnız
dosyadan devam eder). Paralel iş için git worktree; göç numarası çakışmasın diye veri tutan görevler zincir halinde.

Kararlar: teknik olanlar sende (ADR-019). Sağlık/ürün/para/hesap/veri-dışarı/lisans kararlarını TAHMİN ETME: engellemeyen
işe geç, soruyu DURUM'daki listeye ekle. Eksik eşik → araştırmadan kaynakla koy, onay listesine yaz.

Bitiş: uygulanabilir her şey bitince DUR. Soruları (DURUM listesi) AskUserQuestion ile toplu sor, cevapları ADR'ye işle,
kalan işi bitir. Sonra plan/oturum-promptlari/M3.md'yi bu prompt'un kalıbıyla (M3 · Mobil kabuk) yaz, commit'le, kısa özet +
M3 prompt'u ver. Session KAPANMAYACAK: boş olduğumda bu sohbete dönerim ve M1 (akşam kısmı) + M2'nin yaptıklarını SEN bana
aktarırsın (skill aktarim; docs/aktarim/M1/ ve M2/ dosyalarından, temelden, basamak basamak, satır satır).
