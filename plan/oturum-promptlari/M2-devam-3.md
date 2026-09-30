oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri; docs/aktarim-protokolu.md › Toplu mod).
Önceki bağlam compact edildi; DURUM.md › "▶ DEVAM NOKTASI (30 Eyl, dördüncü oturum)" tam olarak nerede kalındığını yazıyor —
oradan devam et, hiçbir şeyi baştan yapma. Ben paralelde başka işteyim; M2'yi baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Kapsam, sırayla:
1) Açık iş: K-213 PR #171 (auto-merge kapalı) — CI sonucu (ccd_pr get_status), inceleme ajanları (code-reviewer +
   pr-test-analyzer), bulgular TDD, mutasyon, docs/aktarim/M2/K-213.md + README, sonra gh pr merge --auto --squash 171.
   DEVAM NOKTASI 1.
2) Kalan M2, DEVAM NOKTASI 2'deki sırayla: K-216 → K-220 → K-221 → K-217. Sonraki göç V12. DEVAM NOKTASI 3'teki kurallar
   (rıza kapısı, ApiLimits, 400-asla-500, idempotency, *AccountData, sözleşmede sınırlar, U4) her yeni uç noktada geçerli.
   Disk dolu: DB testleri yalnız CI'da; Docker'sız testler yerelde.

Her görev döngüsü (değiştirme): gorev-baslat → test önce (geçerli RED; derleme hatası/exception/NPE RED değil) → kod →
./gradlew build (Docker yoksa Docker'sız testler + CI) → pr-review-toolkit ajanları (code-reviewer + pr-test-analyzer,
gerekirse silent-failure-hunter) → bulguları TDD ile düzelt, mutasyonla kanıtla (plan/oturum-promptlari/mutate.py; tek test
sınıfı filtresi) → docs/aktarim/M2/<K-ID>.md (basamaklar, satır satır yerler, canlı kanıt, soru bankası) + README →
PR gh pr merge --auto --squash → DURUM tablosu. Her görev sonunda DURUM › DEVAM NOKTASI'nı güncelle.

Kararlar: teknik olanlar sende (ADR-019). Sağlık/ürün/para/hesap/veri-dışarı/lisans kararlarını TAHMİN ETME: engellemeyen
işe geç, soruyu DURUM'daki listeye ekle. Eksik eşik → araştırmadan kaynakla koy, onay listesine yaz.

Bitiş: uygulanabilir her şey bitince DUR. Soruları (DURUM listesi 0-18) AskUserQuestion ile toplu sor, cevapları ADR'ye
işle, kalan işi bitir. Sonra plan/oturum-promptlari/M3.md'yi bu prompt'un kalıbıyla (M3 · Mobil kabuk) yaz, commit'le, kısa
özet + M3 prompt'u ver. Session KAPANMAYACAK: boş olduğumda bu sohbete dönerim ve M1 (akşam kısmı) + M2'nin yaptıklarını SEN
bana aktarırsın (skill aktarim; docs/aktarim/M1/ ve M2/ dosyalarından, temelden, basamak basamak, satır satır).
