# Oturum prompt'u — M1 kapanışı + M2 (devam)

oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim; docs/aktarim-protokolu.md › Toplu mod).
Önceki oturum bağlam dolmadan durdu; **DURUM.md › "▶ DEVAM NOKTASI"** tam olarak nerede kalındığını yazıyor — oradan
devam et, hiçbir şeyi baştan yapma. Ben paralelde başka işteyim; kilometre taşını baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Kapsam, sırayla:
1) M1'i kapat: #150 (K-112) · K-113 (dal engine/24-golden-scenarios) · K-115 (dal engine/99-intake-calibration) —
   DEVAM NOKTASI 1-4. İnceleme ajanlarını yeniden çalıştır (önceki oturumdakiler yarıda kaldı).
2) M2 · Backend temel servisler (K-201…K-219), bağımlılık sırasıyla (DEVAM NOKTASI 5). ADR-020 M2 ön kararları:
   Apple Developer hesabım VAR (Team ID / Bundle ID / Services ID'yi "sonra vereceğim" dedim: kod değer beklemeden
   yazılır, yapılandırmadan okunur; bitişte sor; anahtar dosyası repoya girmez), besin verisi YALNIZ USDA FDC, rıza
   metinleri taslak + benim onayım, yerel DB Docker Compose + Testcontainers.

Her görev döngüsü (değiştirme): gorev-baslat → test önce (geçerli RED; derleme hatası/exception RED değil) → kod →
./gradlew build (+ gerekiyorsa npm run check) → pr-review-toolkit ajanları (code-reviewer + pr-test-analyzer, gerekirse
diğerleri) → bulguları TDD ile düzelt, mutasyonla kanıtla (yedekten geri yükleyen betik; `git checkout` ile değil) →
docs/aktarim/<M>/<K-ID>.md (basamaklar, satır satır yerler, canlı kanıt, soru bankası, gerçek dosya:satır) →
PR `gh pr merge --auto --squash` → DURUM tablosu. **Her görev sonunda DURUM › DEVAM NOKTASI'nı güncelle** (bağlam
dolabilir; bir sonraki oturum yalnız dosyadan devam eder). Paralel iş için git worktree.

Kararlar: teknik olanlar sende (ADR-019). Sağlık/ürün/para/hesap/veri-dışarı/lisans kararlarını TAHMİN ETME: engellemeyen
işe geç, soruyu DURUM'daki listeye ekle. Eksik eşik → araştırmadan kaynakla koy, onay listesine yaz.

Bitiş: uygulanabilir her şey bitince DUR. Soruları AskUserQuestion ile toplu sor, cevapları ADR'ye işle, kalan işi bitir.
Sonra plan/oturum-promptlari/M3.md'yi bu prompt'un kalıbıyla (M3 · Mobil kabuk) yaz, commit'le, kısa özet + M3 prompt'u
ver. Session KAPANMAYACAK: boş olduğumda bu sohbete dönerim ve bu oturumun ve önceki (M1 kalanı) oturumun yaptıklarını
SEN bana aktarırsın (skill aktarim; docs/aktarim/M1/ ve M2/ dosyalarından, temelden, basamak basamak, satır satır).
