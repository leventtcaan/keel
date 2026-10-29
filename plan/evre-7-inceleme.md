# Evre 7 · Acımasız ekran incelemesi (30 Eki 2026, build 9 yürüyüşü)

Bakış: iki şapka birden. (1) 30 yaşında, haftada 4 gün kaldıran, yağ yakmak isteyen, akademik olmayan, orta telefon becerili ABD'li kullanıcı. (2) 2026 health & fitness standardında kıdemli mobil tasarımcı (Apple HIG, iOS 26 sheet/menu/search kalıpları, MFP/MacroFactor/Lose It/Hevy/Strong/Fitbod çıtası).
Salt okuma: kod değişmedi. Dayanak: 82 ekranlık yürüyüş (`G/`) + `D/ A/ B/ E/ F/ G2/ k1057/ k1058-*` klasörleri + `apps/mobile/src` kodu + `data/copy/en.json`. Rakip araştırması (`arastirma/ham/evre7-rakip-kaliplari.md`) başka ajanın işi; buradaki kalıp adları genel sektör bilgisidir, o dosyayla çapraz kontrol edilmeli.

**İşaretler.** `[kod]` = ekran görüntüsü yok, koddan/metinden değerlendirildi. `◆` = gizli durum (dokununca/açılınca/ilk kez/boş-hata hâli) bulgusu. `◆sim` = o gizli durum simülatörde açılıp görüldü (ekran görüntüsü `E7-review/`). Önem: **P0** vaadi bozar (iş yapılamaz / yapıldığı anlaşılmaz / Levent'in açık şikâyeti sürüyor) · **P1** ucuz ya da zor hissettirir · **P2** cila.

## Sınırlar (dürüstlük)
- **Simülatör yürüyüşü (30 Eki, `main` d8255805, #688-#692 dahil).** Kısmi yapıldı: envanterin 292 elemanından aşağıdaki sayıda eleman açıldı (`[x]`), kalanı açılmadı; ekran görüntüleri `side-session-notes/…/E7-review/` altında, adı `<envanter-kimliği>-<eleman>.png` (kimlik → § eşlemesi Ek'teki grup harfleridir: T=§7, C=§8, R=§9, A=§10/16, E=§11-15, W=§17-18, X=§19-21, L=§22/27/28, M=§23-24, F=§25, P=§26, S=§29-33, Y=§1-6). Sistem seçicileri (Choose a file, Gallery, Camera, Choose from library) **bilerek tamamlanmadı**: simülatörde Levent'in gerçek dosya/fotoğraf listesini gösteriyor; bir kez açılıp iptal edildi, o görüntüler silindi. Metro ve fixture bitişte durduruldu.
- Levent'in dört "hata"sının (#3 Log again +, #7 Add a day hareketsiz, #11 Rebuild, #12 antrenman bitmiyor) **kök nedeni bu belgenin işi değil** (parça 1). Burada yalnız ekranda ne görüldüğü ve kullanıcıya ne yaşattığı var.
- Ekran görüntülerindeki `Geri`, `Bitti`, `TR EN` simülatörün Türkçe yerel ayarından gelen sistem metinleri; ABD kullanıcıda `Back/Done` olur. Hata sayılmadı. `[RevenueCat] Purchase was cancelled` toast'ı (G/17) geliştirme logu; release'te görünmediği doğrulanmadı.
- `RETIRED` yüzeyler (`coach`, `meal-photo`, `recipes`, `recipe`, `why`, `scoff`, `projection`, `ledger`, `what-if`, `workout-summary`) değerlendirilmedi. Ayrıca **hiçbir yerden bağlanmayan ölü bileşenler** var (bkz. Ek, "Ölü kod"): `PromptCard`, `CheckInCard`, `ConsistencyCard`, `FirstWeeksCard`, `TodayList`, `CoachEntry`. Bunların metinleri (`first_weeks.*`, `prompt.*`) ekrana hiç çıkmıyor; yalnız `en.json`'u şişiriyor ve "bilimsel metin" izlenimini bu belgeye yanlış taşımamak için not düşüyorum.

## Levent'in 21 maddesi nerede ele alındı
| # | Madde | Nerede |
|---|---|---|
| 1 | Find a food + öğün seçici modern olsun | §23 |
| 2 | Today's food gizli; Log a meal'den erişim + öğün özeti | §7, §23, §25 |
| 3 | Log again + loglamıyor | §23 (satır "Log again") |
| 4 | Favori/Recent/kalp | §23, §24 |
| 5 | MFP'den kullanışlı, "harmoni ve zekâ" | §23-25, Çapraz §B |
| 6 | Kullanıcı gibi acımasız sorgu | tüm belge |
| 7 | Add a day hareketsiz | §10, §12 |
| 8 | Add a move düz liste | §12 |
| 9 | Remove day "kaldır" görünümünde değil | §12 |
| 10 | Cardio düz yazı, Split bilgi, bilimsel metin | §13, §14, Çapraz §D |
| 11 | Rebuild hiçbir yere atmıyor | §15 |
| 12 | Antrenman bitmiyor, döngüler | §17-20 |
| 13 | Öncesi / an / sonrası / kesinti | §16-20 |
| 14 | "Wow" farklı sayfalarda, gizlenmiş hissi | Çapraz §B, §7, §22 |
| 15 | Arka plan zekâsı gerçek mi? | Çapraz §B ("zekâ var, ekranda görünmüyor") |
| 16 | Vurgu, kart, font, renk, buton tutarlılığı; üst vurgulu alt düz | Çapraz §A |
| 17 | Logic + ne vaat/ne uyandırıyor | §6, §8, Çapraz §E ("call" kelimesi) |
| 18 | Gerçek dünya akışları, karar/takip/unutma | §7, §8, §22, §28 |
| 19 | Progress: gelişim, motivasyon, renk | §26 |
| 20 | Hardcoded doğrular, akademi değil | Çapraz §D |
| 21 | Teknik, temel, marka, pazarlama | §6, Çapraz §E |

---

## 1. Onboarding · soru ekranları (Goal, Experience, Program, Days, Activity) — G/01-04, G/09
**Hüküm:** Temiz, kısa, tek soru/ekran; ilk açılış gerçekten güzel. Sorun alt yarının boş kalması, onay butonunun olmaması ve üç farklı seçenek-kartı stili.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Her soru ekranında alt %55 boş; seçim anında ilerliyor, "Continue" yok. Yanlış dokunuş geri oku gerektirir. Days'te "3" önceden siyah ama onay yok: seçili mi, öneri mi belli değil. | P2 | Alt dock'ta tek **Continue** (seçilince siyah), önerilen seçenek önceden işaretli. Boşluğa kısa "neden soruyoruz" ikonlu satırı (modern: Cal AI / Fitbod onboarding). |
| Goal: siyah "Decide for me · We read your numbers and pick." boy/kilo sorulmadan ÖNCE sorulan ekranda "numaralarını okuruz" demek: vaat dayanaksız. | P2 | "We pick after your numbers." ya da hedefi boy-kilo ekranından sonraya al. |
| Üç kart stili: siyah "Recommended", düz gri, ikonlu gri (yalnız Experience). | P2 | Tek `OptionCard`; siyah yalnız "öneri" için, ekranda en fazla bir tane. |
| "I have my own · We review it." belirsiz (kim neyi inceliyor?). | P2 | "I have my own · Import from Strong or Hevy, or type it". |
| Days: yalnız 2-5; uygulama 7 güne kadar destekliyor. | P2 | Not satırı: "More days later in Train". |
| ◆ [kod] "I have my own" yolu: program import/type ekranları + program **review** (`onboarding/review.tsx`): her öneri için `Switch` + "Coaching rule" açılır satırı + "Use mine with 3 changes". Kural metni açılınca düz yazı. | P1 | Her öneri: tek satır + [Apply] çipi; "Coaching rule" yerine ⓘ → küçük sheet. Switch yerine onay çipi (toggle'ın "uygulandı mı" anlamı belirsiz). |

## 2. Onboarding · Your health data (rıza) — G/05
**Hüküm:** İyi örnek: 3 ikonlu satır + "Read the full text". Düz yazı yok.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| "Not now" ile "Continue" aynı boyda; reddedince ne kaybedileceği (haftalık call yok) bu ekranda söylenmiyor. | P2 | "Not now" altına tek satır: "Without it there are no weekly calls." |
| ◆ [kod] "Read the full text" tam metni inline açıyor (consent metni 4 başlık). | P2 | Sheet (detent: büyük), kapatılabilir. |

## 3. Onboarding · About you — G/06-08
**Hüküm:** Üç tekerlek yan yana doğru kalıp, ama "ayarlanmış mı ayarlanmamış mı" belirsiz: değerler görünüyor, Continue kilitli.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Tekerlekler 178 / 84.0 / 1999 gösteriyor (dolu görünür) ama Continue gri; kullanıcı neden basamadığını anlamaz. Eksik alan söylenmiyor. | P1 | Tüm tekerlekleri makul varsayılanla "set" say; yalnız Sex zorunlu. Eksik varsa Continue altında tek satır "Pick sex", eksik alan turkuaz vurgulu. |
| "Sex, for the energy math" yalnız Male/Female. | P2 | Ürün kararı (Levent): "Prefer not to say" için sağlıklı alternatif hesap var mı? Kanıtla karar ver. |
| Metric/Imperial küçük gri pill; ABD yerel ayarında Imperial önceden seçili olmalı. | P2 | `Locale` ABD → Imperial. |

## 4. Onboarding · Your working weights — G/10-12, k1058-onboarding/2-3
**Hüküm:** Fikir güçlü (başlangıç ağırlığı), uygulama kötü: "Not set" kalın görünüm bir değer gibi, çıkış yolları ikiye bölünmüş, tekerlek satır içinde açılıp altındakileri itiyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| İki çıkış: "Skip, find them in session 1" gri pill (açık) ve "Continue" gri-kilitli. Hiçbir şey seçmeyince tek yol küçük pill. | P1 | Tek dock butonu: boşken **"Skip for now"**, ≥1 lift girilince **"Continue"**. Pill'i kaldır. |
| 3 satır "Not set" kalın display fontla; boş durum değer gibi okunuyor. | P1 | Boş durum soluk "+ Add"; ya da boy-kilo-deneyimden **tahmin** "≈ 135 lb" ve tek dokunuşla "Use ≈135" çipi (zekâ burada görünür: wow #2). |
| Tekerlek satırı açınca alttaki satırları itiyor; "Clear" teal mikro link tekerleğin altında. | P2 | iOS inline picker kalıbı; "Clear" tekerlek yanında ikon. |
| "Tap a lift, flick to your number. Your first session checks it." UI talimatı yazıyla. | P2 | İlk satırın tekerleği zaten açık gelsin; talimat satırını sil. |

## 5. Onboarding · Preparing + Your plan — G/13-14, k1058-onboarding/1
**Hüküm:** Uygulamanın en güçlü ekranı: karar (kcal, protein, ilk call) ve ilk antrenman tek bakışta; "form değil koç" hissi veren tek yer. Sorun: iki siyah kart üst üste, altta düz gri.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| İki büyük siyah kart (call + Today first workout) üst üste, sonra düz "Cardio" satırı ve toggle: üst ağır, alt düz (Levent'in şikâyeti, minyatür). | P1 | Tek siyah "call" kartı; antrenman kartı açık yüzey kart; Cardio satırı antrenman kartının içine çip olarak. |
| "Your scale corrects it in 14 days." iyi. Ama "neden 2,430" yok. | P2 | "Why this number" çipi → küçük sheet: "Maintenance 2,730 − 300". |
| Beklenen sonuç yok: kullanıcı "ne zaman sonuç" diye bakar. | P1 | Karta tek satır: "Expect about 0.5-1 lb a week" (motor çıktısı, U1 uyumlu). |
| "Tell me Monday morning" bildirim izni isteği gibi duruyor, soluk. | P2 | "Remind me Monday morning", ikon + toggle; izin o zaman istenir. |
| Üstteki 3 çip (Goal / 4 days / Mon, Tue, Thu, Fri) filtre çipi gibi ama statik. | P2 | Düzenlenebilir yap ya da düz metin. |
| Preparing: boş ekran, ortada ince çizgi, dipte "See my plan". | P2 | Hazırsa doğrudan plan; hazırlama varsa yüzdeli çizgi. |
| ◆ [kod] Preparing hata/bağlantı yok: "Bring it in again / Try again / Sign out" üç buton aynı ağırlık (`preparing.tsx`). | P2 | Tek birincil "Try again"; Sign out metin linki. |

## 6. Paywall — G/15-16, G2/09, k1058-onboarding/4
**Hüküm:** Dönüşüm açısından güçlü (kişisel "Your plan" kartı, deneme çizelgesi). Ama kaydırmadan plan fiyatlarını kıyaslayamıyorsun ve aynı bilgi dört kez tekrarlanıyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Plan seçici (Yearly/Monthly) kıvrımın altında; üstte siyah kart + başlık + 3 fayda yer kaplıyor. Monthly kartı G/15'te yarım. | P1 | Faydaları tek satıra indir, plan kartlarını başlığın hemen altına çek. |
| "Nothing is charged until Thu, Nov 12" + çizelge ("Thu, Nov 12 · $59.99 a year starts") + CTA altı "No charge today. Then $59.99…" + "When the trial ends: $59.99…" = aynı bilgi 4 yerde. | P1 | Tek kaynak: çizelge + CTA altı tek satır; küçük yazıdan trial cümlesini sil (Apple'ın zorunlu "Charged to your Apple ID…" kalsın). |
| "Account" sağ üst: kapatılamayan paywall'da tek çıkış, etiket çıkış gibi okunmuyor. | P2 | "Sign out / Restore" için profil ikonu + menü. ◆ [kod] "Account" sheet'i (`AccountSheet`) pageSheet; içerik ayrıca denenmeli. |
| Fayda satırları jenerik ("Program built for your days", "Weight and reps for every set"). | P1 | Üç somut vaat: "A call every Monday, with the reason" · "Your weights, set by set, from last time" · "Cardio and food that adjust to your week". |
| Marka: üstte "N. Next Call" logosu; CLAUDE.md "ürün adı henüz yok" derken UI'da `app.name = "Next Call"`. ABD kullanıcısı "Next Call"ı telefon/satış uygulaması gibi okur (Çapraz §E). | P1 | Marka kararı Levent'te; App Store adı, ikon, paywall tutarlı mı kontrol et. |
| ◆ [kod] Satın alma hataları (`tryAgain`, `lookAgain`, "Waiting for the App Store…"), Restore: durumlar düz metin. | P2 | Tek `inline banner` bileşeni (ikon + 1 satır + eylem). |

## 7. This week (ana ekran) — G/17-20, G/31, G/40-41, G/78, G/81, k1058-counter
**Hüküm:** Hafta şeridi + tek siyah "hero" + bugünkü antrenman iyi iskelet. Ama **gün içinde en çok kullanılan iş (yemek) en sönük kart**, ve hero'daki metin duvarları (weigh-in sayacı) form hissi veriyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| "Food left 2,273 kcal ⓘ Log" kartı sayfanın en altında, düz gri, FAB'ın altında; satırın kendisi `/food`a gidiyor ama dokunulabilir görünmüyor (chevron yok). Today's food keşfi buradan kopuyor (Levent #2). | P0 | Yemek kartını ikinci büyük kart yap: kcal ilerleme çubuğu (yenen/hedef), altında protein çubuğu, sağda **Log** dolu buton, kartın tamamı dokunulabilir + `chevron.right`. İçinde bugünkü öğünler mini satır: "Breakfast ✓ 487 · Lunch +". |
| Hero (Week 1): "Weigh-ins this week 2 of 4" + 7 harfli segment çubuğu + "2 more before Monday's call, and it can read your week." + Weigh in butonu + "First call Monday 4 days": 5 ayrı bilgi, 2 cümle düz yazı. | P1 | Hero: büyük "FIRST WEEK", altında "Weigh-ins 2/4" noktalı gösterge + **Weigh in** çipi; "can read your week" cümlesini sil; yeterli olunca tek kelime "Enough ✓". |
| "Week 1 · Counted by week" (sağ üst): "Counted by week" ne demek? | P1 | Sil. |
| Hafta şeridi M T W T F S S; içi dolu tik / halka / nokta; açıklama yok, dokunulamıyor. | P1 | Güne dokun = o günün özeti (antrenman + yemek). |
| Bugünün kartında sağ üstte etiketsiz teal slider ikonu: "Short on time / Gym busy / Move / Skip" (en iyi düşünülmüş özellikler) bu ikonun altında gizli. Train'de aynı iş "Change" butonu: iki kalıp. | P1 | Start'ın yanına **Change** (Train ile aynı) ya da Start altında çipler: "Short on time · Gym busy · Move". |
| Antrenman kartı hedefi: ilk hafta "3 × 6-10", sonra "28 × 6" (birim yok: lb mi kg mi?). | P1 | Birim ve fark çipi: "28 lb × 6 · +1 rep"; önceki seferi gri küçük: "Last 28 × 5". |
| FAB (+) Food kartının sağ ucuna biniyor (`PLUS_GUTTER` boşluğu bırakılmış). | P2 | FAB yerine tab bar ortasında "+"; kartlar kendi "Log" butonunu taşısın. |
| Hero'nun iki hâli (First week / MOVE MORE) aynı ağırlıkta ama chevron yalnız ikincide. | P2 | Tüm kart dokunulabilir, chevron tutarlı. |
| Üç ad: sayfa "THIS WEEK", hero "Your week", `thisWeek.hero.yourWeek`. | P2 | Tek ad: "This week". |
| ◆ [kod] Monday hâli: siyah blokta iki ekran yüksekliğinde **yuvarlak "Open your call" düğmesi** (ritüel). Görsel olarak ürünün en ayırt edici anı; ama altındaki cümle "Your week 12 call is ready. 2 questions first." düz yazı. | P1 | Düğme kalsın (güçlü); altına çipler: "2 questions · 30 s". Sayacı (kaç gün sonra) kaldır. |
| ◆ [kod] `callsOff` hero ("Weekly calls are off · Train, and see how it feels. · Settings"), `pending` ("Not applied yet · Use this call"), `declined` ("Last week's plan stays.") durumları: üç farklı metin, hepsi küçük ghost buton. | P1 | Tek "decision state" bileşeni: durum rozeti (Applied / Pending / Off) + birincil eylem. |
| ◆ [kod] Durum kartı: "Paused: sick, since …  [I'm back]" ve "Life got in the way?" metin satırı. | P2 | "Life got in the way?" satırı yalnız `+` sheet'inde kalsın (zaten orada); ana ekranda yalnız duraklatılmışken kart görünsün. |
| ◆ [kod] Rehber (GuideOverlay, 4 adım, `Modal`): iyi; "Skip" küçük teal. Ekranın yarısı karartılıp tek kutu vurgulanıyor. | P2 | Adım göstergesi noktalar yeter ("Step 1 of 4" metnini sil). |
| ◆ [kod] OpenElsewhere (başka telefonda başlamış antrenman): Continue here / Fill in later / Discard üç eşit buton. | P1 | Birincil Continue, diğerleri metin; Discard alert'le. |

## 8. Weekly call + check-in — G/79-80, G/78
**Hüküm:** Ürünün tezi ("This one makes the call") burada ödeniyor; şu hâliyle tezin kanıtı ekranda yok: tek cümle gerekçe, geri kalan boşluk.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Call ekranı: siyah kart "MOVE MORE", bir satır değişiklik (Steps 7,000 → 10,000), bir satır gerekçe ("A lower target would crowd out training fuel."), "Confidence Medium", sonra ekranın %45'i boş. | P1 | Gerekçeyi **veri çipleri** yap: "Weight −0.1 lb/wk · Logged 6 of 7 days · Lifts +2". Altında önce→sonra satırları, sparkline (son 4 hafta trend). |
| "Confidence Medium": ne demek? | P1 | Kaldır ya da 3 noktalı gösterge + "Based on 5 weigh-ins". |
| İki buton: **Got it** (siyah) / "Keep last week's plan" (gri). "Got it" kabul mü, okudum mu? | P1 | **"Apply this week's plan"** / "Keep last week's". Ya da uygulanmışsa "Done" + "Undo". |
| Gerekçe kural kütüphanesinden (`decision.rule.*`, 60+ cümle: "When most of the plan didn't happen, the plan can't be judged yet: doing it comes before changing it."). Kullanıcıya kural değil kendi verisi gerekir. | P1 | Her kural için 2 çip + 1 kısa cümle ("Not enough weigh-ins yet. 3 more this week."). Uzun açıklama "Why?" sheet'inde. |
| Check-in (G/80): "How did training go this week? / It decides what changes: food or training." + 3 çip düzensiz sarıyor (2+1) + disabled "Get this week's call". | P1 | Üç eşit büyük kart (ikon + etiket), dokununca otomatik ilerle; üstte "1 of 2" noktaları. Gerekçe satırı iyi, kalsın. |
| ◆ [kod] Check-in diğer sorular: recovery (2 uzun seçenek: "Still tired, sore or sleeping badly"), appetite, cycle_stopped (metinde "A missed period is the clearest sign your plan is too low…"), 1-10 ölçek çipleri, waist cm/inç `TextField`. | P1 | Ölçek: slider/segment; waist: stepper + son değer; hassas soru (cycle) tek ekran, "Why we ask" ⓘ. |
| ◆ [kod] Call ekranı durumları: `none` ("No call yet. Your first one comes after your first check-in."), subscription kilidi ("Your weekly call comes with a subscription." + See plans), failed. Üçü düz metin + ghost buton. | P1 | Boş durum: ikon + 1 satır + 1 birincil buton; ortak `EmptyState`. |
| Ekran başlığı yok, tarih küçük ("Tue, Oct 27"). | P2 | Başlık: "Your call · Tue, Oct 27". |

## 9. Train — G/31-34, A/01-07
**Hüküm:** Bugünün kartı ve haftanın listesi temiz; "Add a day" görünür oldu. Ama hafta listesi ölü (dokununca açılmıyor), Today kartında 9 swap ikonu gürültü yapıyor, kalıcı "rest day" notu sürekli konuşuyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| "This week" satırları dokunulamıyor (chevron yok, içerik görünmüyor); yalnız bugünden başka güne "Start" verilebiliyor. | P1 | Satıra dokun = o günün hareket listesi (sheet), orada Start / Move / Skip. Chevron ekle. |
| 6-7 günde kalıcı turkuaz not: "A rest day helps you grow faster." her ziyarette, üstelik bilimsel bir iddia. | P1 | Sil; gerekirse **Add a day**'de bir kez. |
| Başlık altı düz gri metin: "Upper / Lower · 4 days". | P2 | Çip: `Upper/Lower` · `4 days`; çipe dokun = Edit program. |
| Bugünün kartında her hareket satırında bir ⇆ (swap) kutusu (9 tane): sıkışık. | P1 | Swap'ı satır kaydırma ya da uzun basma menüsü yap (`UIContextMenu`). |
| FAB (+) "Done" etiketini örtüyor (A/05, A/07). | P2 | Liste altına `PLUS_CLEARANCE` kadar boşluk ya da FAB'ı tab bar'a taşı. |
| "Edit" teal metin sağ üst; ayarlar dişlisi This week'te, Train'de yok. | P2 | Edit'i ⋯ menüsüne çevir: Edit program · Rebuild · Import. |
| ◆ [kod] Program yok: "No program yet." + BuildProgramPrompt; çevrimdışı: "You're offline. This is your program as it was last loaded."; yük hatası: "Your program couldn't load." + Try again. Üç durum üç farklı düz metin. | P1 | Ortak `EmptyState`/`InlineNotice`. |
| ◆ [kod] "N changes applied · Undo" kartı (review değişiklikleri): turkuaz çerçeve, ama "Undo" gerçekte Edit program › changes sayfasına gidiyor (etiket eylemi yanlış anlatıyor). | P1 | Etiket "Review changes ›". |
| ◆ [kod] Today kartı durumları: rest day / moved / skipped / done / "Continue workout" / short version ("Full workout" geri alma) / "Undo" — metinler `train.*`. | P1 | Her durum: tek rozet + tek eylem (ayrıntı §16). |

## 10. Add a day (sheet) — G/32, A/02
**Hüküm:** Doğru kalıp: sunucu günü hareketlerle dolduruyor (Levent #7 çözülmüş görünüyor: A/03-04'te günler hareketli). Sorun: eklemeden önce ne ekleneceğini göstermiyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| "Add Wednesday" siyah buton + "Or another day: Sat Sun" çipleri. Eklenecek içerik önizlenmiyor; sonra Train'de aramak gerekiyor. | P1 | Önizleme: "Adds Pull B · 5 moves". Eklenince **toast + Undo**, Train yeni güne kaydırır ve vurgular. |
| "Your coach fills it with moves." "Coach" kim? Koç ekranları kapalı; motor. | P2 | "We fill it with moves." |
| Alt tam genişlik gri "Close": sheet zaten aşağı çekilerek kapanıyor. | P2 | Kaldır; detent + tutamaç yeterli. |
| ◆ [kod] Başarısız/çakışma/çevrimdışı mesajları (`addDay.conflict/offline/failed`) düz metin. | P2 | Sheet içinde kırmızı olmayan inline notice + "Try again". |

## 11. Edit program · kök liste — A/08, `edit-program.tsx`
**Hüküm:** Beş-altı satırlık düz liste; her satır ayrı sayfa; birinde (Split) hiçbir eylem yok. Settings'in ListGroup'undan farklı bir satır stili (chevron yok). Sayfa "program düzenleme"den çok "program arşivi".
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Satırlar (`Training days / Moves / Cardio / Split / Rebuild for me`) kart ama chevron yok, ikon yok, değer soluk: dokunulur mu belli değil. Settings satırlarıyla (ikon + değer + chevron) farklı. | P1 | Tek `ListRow` (ikon + etiket + değer + chevron), yukarıdaki iki grup: "Your week" (Days, Moves, Cardio) / "Tools" (Rebuild). Split satırı kalkar (§14). |
| "Training days" ve "Moves" **aynı editörü** açıyor (`part='days'` ve `part='moves'` ikisi de `ProgramEditor`; Moves'ta altına Review ekleniyor). | P1 | Tek sayfa: "Your program" (günler kart, içinde hareketler) + üstte "Review · 2 flags" rozeti. İki satır tek olur. |
| "Rebuild for me / A new program from your training days" Edit listesinin en altında, diğer sakin satırlarla aynı ağırlıkta; yıkıcı eylem. | P1 | Ayrı grup, kırmızı olmayan ama ayrık; dokununca action sheet (§15). |
| ◆ [kod] Üstte koşullu satır: "3 changes applied · Undo" (review). Etiketteki "Undo" gerçekte changes sayfasına gidiyor. | P1 | "3 review changes ›". |
| ◆ [kod] Kaydedilmemiş düzenleme varken: üstte turkuaz not "Your edits aren't saved yet. Save them, or leave with Back." + kenardan geri kaydırma kapalı + "Leave without saving / Keep editing" iki buton. Üç farklı uyarı aynı şeyi söylüyor (`leaveWarn`, `unsavedNote`, `targetsLost`). | P1 | Tek davranış: otomatik kaydet + Undo toast (modern); olmuyorsa native "Discard changes?" action sheet. |

## 12. Edit program › Training days / Moves (günler ve hareket editörü) — G/66 (aynı editör Settings'ten de açılıyor), `ProgramEditor.tsx`
**Hüküm:** Hevy/Strong'un rutin editörünün çok gerisinde: tek tek açılıp kapanan gün kartları, her hareket için üç ayrı − / + stepper, düz metin "Remove". Anlaşılır "hareket seçici" yok.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| **Remove this day** = gri hayalet buton, kırmızı yok, çöp ikonu yok; "Remove" (hareket) küçük metin buton. Levent #9: eylemi yansıtmıyor. | P1 | Gün başlığında `⋯` menü → "Remove day" (kırmızı, `trash` ikonu, onay: action sheet + sonra Undo toast). Hareket satırında sola kaydır = kırmızı Delete (iOS swipe action) + Undo. |
| Her hareket için 3 stepper (Sets / Min reps / Max reps) = 9 +/− düğmesi; başlık satırı "Sets  Min reps  Max reps" soluk. Rep aralığı iki ayrı sayı olarak düzenleniyor. | P1 | Satır: ad + tek "3 × 6-10" çipi; dokununca küçük sheet: Sets stepper + "Reps" aralık seçici (6-10 / 8-12 / 10-15 hazır çipleri) + Custom. |
| "Add a move" (ghost buton, gün içinde en altta) → pageSheet: `Search moves` TextField + **alfabetik düz liste** (isim + sağda "6-10") + en altta "Add my own move". Levent #8: herkes hareket adını bilmez. | P1 [kod] | Arama + kas grubu çipleri (Chest, Back, Legs…) + ekipman çipleri (Dumbbell/Machine/Cable/Barbell/Bodyweight) + her satırda `MoveThumb` ikon + "Chest · Dumbbell" alt satırı + "Popular / Recently used" bölümleri; satırdaki `+` çoklu seçim (eklendi ✓), sheet'te "Done · 3 added". Hareket seçilince varsayılan set/rep gösterilsin. |
| "Add my own move" → `OwnMoveForm`: 5 soru (Several joints? What do you lift? Add weight? One side?) çip grupları. Mantıklı ama sheet içinde sheet gibi gidiş. | P2 | Aynı sheet'te adım adım (progress noktaları), son adım önizleme "Cable curl · Isolation · Cable". |
| Gün kartı açılınca: "Day name" TextField (tam genişlik), "Remove this day", 7 gün çipi, 3 başlık, hareketler, "Add a move". Açıkken uzun kaydırma; aynı anda yalnız bir gün açık. | P1 | Gün adı satır içi düzenle (kalem), hafta günü tek sıra `Mon Tue …` çip, hareketler sürüklenebilir (`reorder` tutamacı: **sıra değiştirme yok**, [kod] doğrulanmadı). |
| Gün sırası/hareket sırası değiştirilemiyor [kod: `ProgramEditor` içinde reorder yok]. | P1 | Uzun bas + sürükle (`reorderable list`). |
| "Add a day" burada `canAddDay` ise `/add-day` sheet'i; değilse editörün kendi boş günü ("We can't fill in a new day for this plan. {day} is marked: add its moves, then save."). | P2 | İkinci yolu kaldır; sunucu "add day" yoksa "Duplicate a day" (var olanı kopyala). |
| Üst özet "6 days · 29 moves" soluk 13pt. | P2 | Başlık altı çip. |
| ◆ [kod] Review bölümü ("Review / Good as it is." ya da öneri kartları: başlık + gövde + [Apply]): kural dili ("Isolation lifts don't judge your progress; the big lifts do." gibi). Kartlar turkuaz-soft, gövde düz. | P1 | Öneri: tek satır başlık + `[Apply]`; "Why" ⓘ. "Your own moves aren't reviewed: 2" satırı kaldır. |

## 13. Edit program › Cardio — G/67
**Hüküm:** Levent'in şikâyeti haklı: düz yazı + form. 7 gün çipi + metin satırları + 3 buton + kayıt düğmesi.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Açıklama paragrafı: "The coach's default for your phase. Change it and it's yours: the coach won't change it again." İçerik gerçek ama dil kural-dili ve "coach" kavramı ekranda başka yerde yok. | P1 | Rozet: `Coach's plan` / `Yours` + `↺ Reset` ikonu. Cümle yok. |
| Dakika: `− 30 min +` stepper (5'er mi 1'er mi belli değil). | P2 | Hazır çipler `20 · 30 · 45 · 60` + özel. |
| 7 gün çipi: seçilince siyah dolu; altında düz metin satırları "Mon · after lifting / Tue · after lifting …". "after lifting" (`AFTER_LIFT`) ve "easy, no weights" (`OFF_DAY_LOW_INTENSITY`) jargon. | P1 | Her gün çipinin altına küçük noktalı gösterge (● lift günü / ○ dinlenme günü); düz satırları sil; yer bilgisi çipe "Mon · after weights" tek etiket. |
| 3 buton: **Save my cardio** (siyah), "Turn cardio off", "Back to the coach's default". Üç eylem eşit düzey, ikisi sıfırlama. | P1 | Otomatik kaydet + "Saved · Undo" toast; "Cardio on/off" üstte switch; reset ⋯ menüde. |
| Metin: "Cardio after the weights works best kept short; a longer session is your call." (`afterLiftOverLine`) bilimsel öneri. | P1 | Sil; 60 dk üstünde yalnız küçük sarı çip "Long session". |
| ◆ [kod] "Saved. This is your cardio now." / "Back to the coach's default for your phase." sayfa sonunda düz metin. | P2 | Toast. |

## 14. Edit program › Split
**Hüküm:** Salt bilgi sayfası; eylemi yok. Kullanıcı bu sayfaya hiçbir iş için gelmez.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| İçerik: "Push / Pull / Legs" başlık + "Push A · Pull A · Legs A…" liste + "Your split follows your training days. Rebuild for me makes a new program from them." Bu zaten Train başlığında ("Push / Pull / Legs · 6 days") ve Today'de var. | P1 | **Sayfayı ve satırı sil.** Split adı Edit program başlığının altında alt başlık ("Push / Pull / Legs · 6 days"); `splitName` Train'de çip. |
| "Split" kavramı normal kullanıcıya "bölünme": jargon. | P2 | "Program type" ya da hiç gösterme. |

## 15. Edit program › Rebuild for me — A/09-10
**Hüküm:** Levent #11 "hiçbir yere atmıyor": şimdi Train'e atıyor ama **sonucu söylemiyor**; onay sayfası düz yazı duvarı + kırmızı metin-link.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Rebuild sonrası Train'e dönüyor, ama A/10'da hiçbir şey "yeniden kuruldu" demiyor; bugün "Arms and shoulders" gibi bir ad görünüyor (7 günlük kurulumda). Kullanıcı ne olduğunu anlamıyor. | P0 | Toast/banner "Program rebuilt · 7 days · 34 moves · **Undo**" ve Train'de yeni kart kısa vurgu (highlight). Undo için sunucuda snapshot (karar Levent). |
| Onay sayfası 5 satır paragraf: "This replaces your program with a new one built from your training days. What goes: every move's next targets and starting weights, this week's changes to your sessions (moved, skipped, short, swapped), the changes from the review, and your own program with your own moves in it. Your logged workouts stay." | P1 | `UIAlertController`/action sheet: başlık "Rebuild your program?", **tek satır**: "Replaces your days and moves. Logged workouts stay." + [Rebuild] (kırmızı) / [Cancel]. Kaybedilecekleri sayı çipleriyle: "3 own moves · 2 review changes". |
| "Rebuild my program" = ortalanmış kırmızı metin-link; buton gibi görünmüyor. | P1 | Yukarıdaki sheet'te standart destructive buton. |
| Antrenman sürerken: "Finish or end today's workout first: a rebuild would replace the day it is on." düz metin, buton yok. | P2 | Buton devre dışı + tek satır neden; "Open workout" çipi. |
| ◆ [kod] Hata durumları (`rebuildRefused`: "Rebuild can't make a program for {count} training days. Change your training days in Settings, then try again.") uzun, kullanıcıyı Settings'e yolluyor (ama günler Edit'te). | P1 | "Pick up to 7 days" + `Fix days` düğmesi → Training days. |

## 16. Antrenmandan önce: Today kartı (This week + Train) ve "Change today" — G/20, G/31, G/78, A/04-07, `today-change.tsx`
**Hüküm:** Kartta güç var (hedefler, "Start"). Motivasyon yok: "bugün ne yenilecek" söylenmiyor; "değiştir" seçenekleri gizli.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Kart yalnız liste ("Incline dumbbell press 3 × 6-10 … and 6 more · Cardio, 30 min"). Önceki sefer, hedef farkı, tahmini süre yok. | P1 | Üst satır çipleri: `~55 min` · `9 moves` · `2 targets to beat`; en önemli hareketin yanında "Last 75 × 10 → today 75 × 11". |
| "Start" siyah tam genişlik; antrenman sürerken "Continue workout". Eski başlangıç saati yok: "Finish within 12 hours of starting." (`openSets`) düz metin. | P2 | Kartta ilerleme çubuğu (3/9 moves) + "Continue". |
| "Change today" sheet (6 seçenek: Gym is busy / Short on time / Full workout / Undo / Move it / Skip today, her birinin başlık+gövde metni; `todayChange.*`): kart başına 2 satır düz yazı, 6 satır liste, alt "Close". | P1 ◆ [kod] | İki grup çip-kart: "How's today?" → [Short on time] [Gym is busy] [Not today ›] ; ikincilde Move/Skip. Gövde cümleleri ("No catch-up. {day} reads what happened.") sil. |
| Gym is busy → "Which one is taken?" → hareket listesi → "Swap {move}" seçenekleri → kapsam seçimi ("Today only / From now on") → bitti. 4 adım. B/07-08. | P1 ◆ | Tek sheet: üstte "Which is taken?" chip listesi; seçilince altında alternatifler (aynı sheet), tek dokunuş = bugün için değiştir; "Make permanent" küçük seçenek. |
| "Taken" jargonu ABD'de "busy / in use". | P2 | "Busy?" + makine ikonu. |
| ◆ [kod] OpenElsewhere (başka cihazda başlamış): üç eşit buton. | P1 | Birincil/ikincil ayrımı. |

## 17. Antrenman anı: ana set ekranı — G/21, G/25, B/01-06, `workout.tsx`
**Hüküm:** Odak modu doğru (koyu), tek "Log set" dock'ta, hareketler arası "Up next", "Taken?" gibi gerçek hayat çözümleri var. Zayıf yerler: ilk set boş ağırlık, jargon ("Reps left", "Taken?"), 5 metin linki satırı, sayaç.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| İlk karşılaşmada ağırlık "Pick a weight" boş, "Log set 1" soluk; "+" boştan **5 lb**'a gidiyor (G/25: "Starting weight found: 5 lb."). Kullanıcı 95 lb için ~18 kez dokunur ya da sayının yazılabilir olduğunu keşfetmeli (stepper ortası input, görsel olarak input değil). | P1 | Boş durumda hızlı seçim çipleri `45 · 65 · 95 · 115 · 135` (boş bar/kullanıcı kilosuna göre); ortadaki sayı dokununca sayı klavyesi (belirgin kalem ikonu). "Starting weight found: 5 lb" cümlesi 25 lb altında hiç gösterilmesin. |
| "Reps left · Aim for 0-1" + `0 | 1 | 2+` çipleri: RIR jargonu. "Aim for 0-1" ne? | P1 | "How many more could you do?" + `None · 1 · 2+`; "Aim for 0-1" kaldır; ilk haftalarda varsayılan "1" önceden seçili. |
| Başlık altında 5 metin linki: How to · History · Swap · Taken · More. Hepsi aynı (teal metin, küçük). | P1 | `More` menü (⋯) yap: Swap, Taken, History, Superset, Skip. How to = hareket adına dokun / (i). |
| "Up next · Cable fly · Taken?" + "Add a move" alt alta; ilkinde "Taken?" ikinci "Taken" (üstteki link) = aynı eylem iki yerde. | P1 | "Taken?" yalnız Up next'te ikon; üstteki linki sil. |
| Set kartı: iki stepper kutusu + "Pick a weight to log this set." yardım satırı + RIR + "Add a note" + "Too heavy?" linki. Üst üste 5 öğe. | P1 | Kart: [Weight][Reps] yan yana büyük sayılar (Hevy gibi), altta tek satır RIR çipleri; "Add a note"/"Too heavy?" ⋯ menüde. |
| Dinlenme sayacı üstte: "0:02 Rest · 2:00-3:00 [Ready]". **Yukarı sayıyor** ve aralık metin. | P1 | Büyük **geri sayım** halkası (hedef 2:00) + ±15 sn + titreşim/ses; Live Activity/kilit ekranı; aralık "Rest 2:00" tek sayı. |
| İlerleme: "0 of 9 exercises" + 9 segment çubuğu iyi. Ama set ilerlemesi (Set 1 of 3) karttan okunuyor. | P2 | Set noktaları ○○○ kartın başlığında. |
| Her hareket başlığında küçük ikon kutusu (MoveThumb): demo/animasyon yok. | P1 | 2026'da hareket kartında 3 sn'lik loop (klip henüz yok — ADR-017); o zamana kadar kas haritası mini ikonu. |
| ◆ [kod] Warm-up bölümü ("Warm-up 3 sets · Log warm-up 1" ve katlanır). Buton "Log warm-up 1" ikinci birincil gibi. | P2 | Kapalı gelsin; açık değilken tek satır "Warm-up · 3". |
| ◆ [kod] `LoadNote`: "That weight is light. Next set 135? [Use 135] [Keep]" — kalibrasyon önerisi; akıllı ve güzel ama küçük düz satır. | P1 | Banner kartı: ikon + "Light. Try 135?" + iki çip. (wow #2'nin parçası.) |
| ◆ [kod] Bitmiş set satırına dokununca `EditSet` sheet (Weight/Reps stepper + Delete set + Done). "Opens it to correct or delete." Keşfedilemez: satır dokunulabilir görünmüyor. | P1 | Satır sağında kalem/chevron; sola kaydır = delete. |
| ◆ [kod] "Skip set" soluk metin dock'ta; "Skip move" ⋯ menüde. | P2 | İkisi de ⋯; dock'ta yalnız Log. |
| ◆ [kod] Superset ("Superset with…" → partner seçimi). Gizli ama doğru yerde (More). | P2 | OK. |

## 18. Antrenman sırasında kesintiler: Taken / Swap / Pause / End sheet — B/01-08, G/23-26
**Hüküm:** Senaryo kapsamı güçlü (Levent #13): Do it later, Swap, Undo bar, Pause, Fill in later, Discard, ofline. Sorun görünüm: her sheet düz liste + "Close"; End sheet'te 4 seçenek + açıklama paragrafları.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Taken sheet (G/23): başlık "Incline dumbbell press is taken", "Do it later / It moves to the end of today." kartı, "Or do instead" liste (ikon + ad), "More swaps", "Close". Sheet tam ekran mod gibi (üstte zaman çubuğu duruyor). | P1 | Bottom sheet detent (yarım): üstte iki büyük çip [Do it later] [Swap], altında alternatifler `You've done this one` etiketiyle, "More swaps" listenin son satırı. Close yok, aşağı çek. |
| Swap sonrası bar: "Swapped to Machine chest press for today. Undo" iyi (G/24). | - | - |
| End sheet (G/26): "End the workout?" + 3 kart (Finish and save / "Sets not logged stay unlogged." • Fill in the rest later / "Still counts for this week." • Discard this workout / "Nothing is saved.") + "Back to the workout". Dört seçenek, her biri açıklama cümleli. | P1 | Native **action sheet**: Finish workout · Save and continue later · Discard workout (kırmızı) · Cancel. Alt cümleleri sil (tek kez toast'ta söylenir). |
| `Pause` (sağ üst teal metin) ve `End` (sol üst düz metin): `End` metin olarak "kapat" gibi, tehlikeli. | P2 | `End` → `Done` ya da ⋯; `Pause` ikon. |
| ◆ [kod] Pause durumu: sayaç "paused" + "Paused. Take your time." düz bant. | P2 | Ekranı bulanıklaştır, ortada büyük "Resume". |
| ◆ [kod] Açık antrenman 12+ saat: süre gizlenir, "can only be finished or discarded" (`stale`): açıklama yok. | P2 | "Left open yesterday" kartı + [Save what I did] [Discard]. |
| ◆ [kod] Çevrimdışı: "You're offline. Everything you log is saved on the phone and sent later." her seferinde düz bant. | P2 | Üst durum çubuğunda küçük bulut-slash ikonu. |

## 19. How to (hareket sayfası) — G/22, F/exercise-screen, `exercise.tsx`
**Hüküm:** Kısa ipuçları iyi; ama demo yok (büyük boş kas haritası), alt kısımda **düz TextField'lar** ("Bench angle", "Back pad", "Foot position") ve "Save setup" butonu.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| "Your setup: Kept on this phone. Set it the same way every time." + boş TextField + "Save setup" gri küçük buton (Levent: kötü input). | P1 | Setup'ı stepper/çip yap ("Bench angle: 30° ± ", "Back pad: 4"), değişince otomatik kaydet; hareketin set kartında "Bench 30° ✎" çipi göster. |
| Çipler "Dumbbell" ve "Compound": "Compound" jargon. | P2 | "Compound" sil; ekipman çipi kalsın. |
| Büyük kas haritası sayfanın yarısı, demo yerine. | P1 | Klip gelene kadar harita küçük (120pt) ve "Works: Chest · Front delts · Triceps" altında; üstüne "Tips" kısa. |
| ◆ [kod] "This move isn't in the catalog on this phone yet. Open it again when you're online." bilinmeyen hareket durumu. | P2 | Boş durum bileşeni. |
| ◆ [kod] History (exercise-history): hareketin geçmiş oturumları + "Edit this session" (workout-edit: set ekle/sil, hareket seç çipleri). | P1 [kod] | Grafik üstte (e1RM), liste altta; "Edit" ⋯ menüsü. |

## 20. Antrenman sonrası: End ekranı (form + Workout complete) — G/27-29, `workout-end.tsx`, `FinishForm.tsx`
**Hüküm:** Bitirmek için fazladan bir adım var ("How was your form?") ve bitiş ekranı "başardım" hissini sönük veriyor: küçük onay kutusu, 3 küçük istatistik, büyük boş harita, Apple Health kartı araya giriyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Finish'e basınca **"How was your form?"** ara ekranı: "A move whose form wasn't clean keeps its weight and reps next time, until it is." + her hareket için Clean / Not clean + "Note on this workout (optional)" TextField + Finish + Keep going. Levent #12 "bitiremedim": bitirme yolunda 3 ekran (End sheet → form → complete). | P1 | Formu kaldır: varsayılan "clean"; sonuç ekranında hareket başına küçük "Form off?" çipi ya da set satırında. Not alanı ⋯ ile. Finish = tek dokunuş → complete. |
| "Workout complete" hero: küçük turkuaz onay kutusu + 3 istatistik kutusu (1 minute / 600 lb lifted / 2 sets). Kutlama (konfeti/halka/haptic dizisi) yok; PR varsa titreşim var (`haptics.record`) ama görsel yok. | P1 | Büyük animasyonlu tamamlama halkası (Apple Fitness gibi), PR varsa altın çip + sayı sayarak artan "lb lifted"; "This week 2 of 4" segmentleri hero'nun hemen altında. |
| "Baseline set / Next time every set has a target to beat." (ilk antrenman) iyi, ama metin. | P2 | "First numbers saved" + sonraki hedef çipi. |
| **What moved** (move başına önceki karşılaştırma) kartı, `MovedCard`: kullanıcının en çok merak ettiği şey; ekranda en altta ve G/28'de hiç yok (ilk antrenman). | P1 | Birinci blok yap: "+1 rep on 3 moves · +5 lb on Bench". |
| "Worked today" büyük koyu kas haritası (yarım ekran) bilgi taşımıyor (1 kas turkuaz). | P1 | Küçült; ya da kas başına set çubukları. |
| Apple Health kartı (G/28-29): "Use Apple Health? Reads steps, sleep, weight, active energy and workouts / Writes weigh-ins back, if you allow / What we read / Continue / Not now" ekranın ortasında, hero'nun altında. Kutlamanın içine izin isteği. | P1 | Bitişte hiç sorma; ilk **weigh-in** sonrası ya da Settings. Soracaksan alt toast. |
| Butonlar: "Share your workout" (gri) + "Done" (turkuaz, dolu, koyu temada). Share ikincil doğru; ama "Share your workout" etiketi PR yokken de aynı. | P2 | PR varsa: **"Share your PR"** birincil. |
| ◆ [kod] Pending/failed: "Your numbers show once this workout reaches the server. It's saved on this phone." + Try again; düz yazı. | P2 | İskelet kartlar + "Saved on phone" rozeti. |

## 21. Share — G/30, `share.tsx`
**Hüküm:** Önizleme kartı çoğunlukla boş siyah (üst %60), seçim çipleri iki sıra ağır; ama fikir (hikâye çıkartması) pazarlama için değerli.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Önizlemede içerik alt 1/3'te, üst boş. | P1 | Sticker'ı dikey ortala/büyüt; arka plan seçenekleri (Gallery / Camera / Dark / In Instagram) küçük ikon segmenti. |
| Çip sıraları (Workout/PR; Gallery/Camera/Dark/In Instagram) iki satır, hepsi aynı ağırlık. "In Instagram" ne demek? | P2 | Üstte kapsamlı `Segmented` (Workout · PR · Week), altta 4 ikon. |
| "Made on this phone. No body weight. Your photo stays yours. Save, TikTok and more are in the share sheet." 3 cümle. | P2 | Tek ikonlu satır "Made on this phone". |
| Sistem geri etiketi dışında kapat yok; "Share to Story" + "Share" iki birincil. | P2 | Tek "Share" + menüde "Instagram Story". |

## 22. Log (+) sheet ve FAB — G/54
**Hüküm:** İyi fikir: tek giriş, 3 büyük karo + iki satır. Statik: kullanıcıyı tanımıyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Karolar (Weigh-in / Meal / Workout "Push B") etiket + ikon; "Meal" karosu "hangi öğün", "Weigh-in" "dün 183.4 lb" demiyor. | P1 | Karolara canlı alt satır: "Weigh-in · 183.4 yesterday", "Meal · Lunch, 2,113 left", "Workout · Push B". Saat 7'de Meal karosu "Breakfast" ile açılır. |
| "Cardio ›" ve "Life got in the way ›" iki ListRow. "Life got in the way" belirsiz. | P2 | "Pause my week" ya da "Something came up". |
| FAB her sekmede, içerikle çakışıyor; Plus'ın kendi "Log something" ikonu. | P2 | Tab bar ortası + (iOS 26 `tabViewBottomAccessory`). |
| ◆ [kod] `plus` karo hedefleri: Workout karosu oturum varsa `/workout`, yoksa `/train`; yeni kullanıcıda ikincisi karışık. | P2 | Karo alt satırı hedefi söylesin. |

## 23. Log a meal · açılış + arama (Find a food, öğün çipleri, Recent/Frequent/Favorites/Log again) — G/37, G/45, D/01, D/07-08, `meal.tsx`, `FoodPicker.tsx`, `FoodBrowse.tsx`
**Hüküm:** MFP'den temiz ve hızlı arama var; ama "kullanıcıyı tanıyan" katman ekranda yok ve **bu öğünde bugün ne yediğini göstermiyor**. Bir plus'a basınca sheet kapanıyor, çok öğeli kahvaltı için sheet'i tekrar açmak gerekiyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Sheet'te bu öğüne (ve güne) ait ne loglandığı **yok**. Today's food'a geçiş yok (Levent #2). | P0 | Öğün çiplerinin altında **öğün tepsisi (meal tray)**: "Breakfast · 2 items · 387 kcal ›" (dokununca o öğünün özeti sheet içinde açılır, "Open Today's food" linki). Alt dock'ta "Done · 387 kcal". |
| Bir `+` (Recent/Frequent/Favorites/arama sonucu) o öğeyi **hemen loglayıp sheet'i kapatıyor** (`logAtOnce` → `router.back()`). İkinci yiyecek için yeniden açmak gerekiyor. | P1 | Plus: satırda `✓` + "Added" + tepsiye ekle; sheet açık kalsın; **Done** ile kapan. Banner/Undo korunur. |
| **Log again** (Levent #3, "+ basıyorum loglanmıyor"): sekmedeki satırlarda `+` yalnız **çizili ikon** (`drawnPlus`, dokunulabilir değil); satırın kendisi loglıyor. Plus'a basan kullanıcı bir şey olmaması gibi yaşıyor. [kod; simülatörde doğrulanmadı] | P0 | Plus'ı gerçek buton yap, satır tek dokunuşla "açar" (porsiyon), plus "loglar"; Log again satırı tüm öğünü gösterir "Oats + Milk + Banana · 487 kcal" ve `[Log all]` etiketli buton. |
| Sıra: öğün çipleri → "Logging into Yesterday" → arama (boş) → "Try rice." → iki teal metin link (Quick add / Create my own food) → ancak sonra Recent/… sekmeleri. Modern arayüzde son yenenler **arama çubuğunun hemen altında**. | P1 | Arama çubuğu → hemen "Your usual breakfast" kartı (aşağıda) → Recent listesi. Quick add / Create my own food = arama çubuğunun sağında `+` menüsü (UIMenu). |
| "Try rice." ipucu satırı, boşta ve sonuç yokken de duruyor. | P2 | Placeholder'a taşı: "Search 2.8M foods". Satırı sil. |
| Arama çubuğu: kalın dış çizgili kutu + "Scan" teal metin; iOS 26 `searchable` pill'inden farklı. Etiket "Find a food" ayrı satırda küçük. | P1 | Yuvarlak köşeli arama pill'i (ikon + placeholder), sağda barkod ikonu (metin değil); etiketi sil. |
| Öğün çipleri: 4 eşit çerçeveli pill (Breakfast/Lunch/Dinner/Snack), "Other" ek. Hangisi doldu/boş belli değil, saate göre otomatik seçim var ama söylenmiyor. | P1 | Segmented kontrol; seçili olan saatten gelir, dolu öğünün yanında küçük nokta/sayı (●2). |
| Sekmeler: "Recent / Frequent / Favorites / Log again" dört kelime, ayırt etmesi zor. Recent aslında **öğüne göre** (`recentFoods(slot)`) ama sekme adı bunu söylemiyor (Levent #4). | P1 | Sekmeleri üçe indir: **For breakfast** (öğüne göre son+sık) · **Favorites** · **Meals** (Log again). "Frequent" birleşir. Başlık dinamik. |
| Favori: yalnız porsiyon kartındaki **yıldız** (başlıkta küçük, etiketsiz); liste satırında kalp yok. "Star a food to keep it here." boş durum. Levent: "nasıl favorilenir?" | P1 | Her satırda kalp (dokun = favori, haptic) ya da sola kaydır "♡ Favorite"; boş durum: "Tap ♡ on any food". |
| Sonuç satırı: "Egg, whole, boiled / 1 large · 78 kcal · P 7 · C 1 · F 6" tek satır soluk, P/C/F harfleri. | P1 | Satır: ad (kalın) + sağda büyük "78 kcal"; altında "1 large" + renk noktalı makro mini çipleri. |
| Sonuç sıralaması/markalı: "Greek yogurt, plain · Fage" markalı barkod ürünü ilk sonuçlarda değil [kod]; "Egg, whole, raw" 2. satırda. | P2 | Popülerlik sıralaması + "Branded / Generic" filtre çipleri. |
| ◆ [kod] Arama durumları: `tooShort` ("Type at least 2 letters."), `searching`, `none` ("Nothing found. Try other words."), `failed`, `serverError`: düz soluk metin satırı. | P1 | Boş sonuç: "No match. [Create 'egg' as your own food]" birincil çip (şu an ayrı link). |
| ◆ [kod] Barkod: kamera sheet'i ("Scan a barcode" başlık, **ekranın ortası tamamen boş**, altta "Or type the number" alanı + Look up + Close; G/49). İzin yoksa "Try the camera again". | P1 | Tam ekran kamera, çerçeve+köşeler, el feneri; sayı girişi alt çekmece. Başlık kamera üstünde. |
| ◆ [kod] Barkod bulunamadı: "That product isn't in the database yet. [Add it] [Search instead]" (D/10b) — iyi, ölü uç değil. Ama "Add it" → 7 alanlı form (§24). | P1 | Etiket fotoğrafı OCR (Cal AI) ya da yalnız kcal+protein ile başla, kalanı sonra. |
| ◆ [kod] Consent adımı (sheet içinde ilk kullanım): "Your health data" metni + Continue / Not now. Meal sheet'ini kullanıcı yemek loglamak için açtı. | P2 | Onboarding'de zaten alınmış; atlanmışsa tek satır + Allow. |

## 24. Log a meal · porsiyon adımı, düzeltme, Quick add, Create my own food — G/38, D/02, D/04, D/09, D/10c
**Hüküm:** Porsiyon kartı iyi (tek sayı kcal, doğal birim, ½ 1 2 3 hızlı çipleri). Fazla kontrol (birim çipi + stepper + hızlı çipler) ve "Remove" kırmızı metin, "Details" aralığı güven kıran.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Karttaki "Remove" kırmızı metin: az önce eklediğin şeyi "silmek" kırmızı uyarı gibi; yıldız etiketsiz. | P1 | Sağ üstte `✕` (nötr) + `♡`. |
| Miktar için **üç kontrol**: birim çipleri `[1 large][g][oz]`, `− 1 × 1 large +` stepper, `½ 1 2 3` çipleri. "× 1 large" soluk. | P1 | Tek satır: büyük sayı + `−/+`; birim `Menu` (Large ▾); ½/1/2/3 çipleri kalsın (en hızlı). Birim çipi satırlarını sil. |
| **Details**: "110-204 kcal; 9-18 g protein" — 2 haşlanmış yumurta için iki katlık aralık. Kullanıcı "uygulama yumurtayı bilmiyor" okur. "Details" üç yerde (portion, Today's food, This week ⓘ). Levent #20 (hardcoded doğru). | P1 | Aralık gösterme; tek sayı yeter (ADR-090 #5). Belirsizliği "≈" ve "Weighed" anahtarı (kantar ikonu) ile ver; kesin tartım toggle'ı kalsın. |
| Makrolar "P 7 · C 1 · F 6" harf kısaltması. | P2 | "7g protein · 1g carbs · 6g fat" ya da renk noktalı üç mini çip (protein turkuaz). |
| Kart altında arama alanı açık kalıyor + "Try rice." + iki link: porsiyon adımında dikkat dağıtıyor; "Log it" dock'ta. | P1 | Porsiyon kartı açıkken arama/sekmeler kapalı (`Add another food` çipi). Kart üstte ekranı doldursun. |
| **Quick add** (D/09): "Quick add / Remove / Calories (tek büyük alan) / Protein Carbs Fat (3 küçük, '−')" 4 düz TextField; "Log it" gri disabled. Klavye "Done" ayrı çubuk. | P1 | Kcal büyük sayı klavyesi + hızlı çipler `100 200 300 500`; makrolar "Add macros" ile açılır. |
| **Create my own food** (D/10c): 7 alan (Name, Serving size, Calories, Protein, Carbs, Fat + barcode) ve "Save and add" / "Cancel". Klavye doldurması. Levent: "kötü input'lar". | P1 | Önce yalnız Name + Calories; "Add nutrition" ile makrolar; "Serving" stepper/çip. Etiket fotoğrafı seçeneği (Scan label). |
| Düzeltme modu (D/04 "CORRECT A MEAL"): tüm öğeler aynı anda açık, her biri bir kart (3 öğede 3 kart). "Weighed" toggle, "Unit" çipleri, "Amount" stepper; Save dock'ta. | P1 | Öğeler kapalı satır; birine dokununca açılır (tek açık). "Weighed" ⓘ ile gizle. |
| ◆ [kod] "A meal holds up to 12 items. Log the rest as another meal." sınır mesajı düz. | P2 | Çip. |
| ◆ [kod] `fromCoach` (fotoğraf/koç) yolu kapalı; ilgili `notChecked` metni erişilmez. | - | Ölü metin. |

## 25. Today's food (`/food`) — G/42-48, G/52-53, D/03-07, G2/01-03
**Hüküm:** İyi iskelet: gün şeridi (son ay), tek sayı kcal, öğünler, kaydırarak sil, yerinde düzelt, geçmiş güne yaz, Undo banner. Ama gizli ve ağır: sayfaya yalnız kcal satırına basarak gidiliyor (Levent #2), üstte dev "Log a meal", altı düz.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Keşif: yalnız This week'teki "Food left" satırı (§7). | P0 | Hem This week'te kart olarak (§7) hem `+` sheet'inde "Today's food ›" satırı; Log a meal içinde öğün tepsisi → buraya link. |
| Üst kart: "2,273 kcal left" büyük; sonra "Protein 14 / 173 g, Carbs 1 g, Fat 12 g" üç düz sütun; "4 meals a day, about 600 kcal each" + "Details". Hedefi olan protein ile olmayan karbonhidrat/yağ aynı satırda tutarsız. | P1 | Halka/çubuk: kcal ilerleme çubuğu (turkuaz) + üç makro mini çubuk (protein/karb/yağ) hepsinde "x / y g". "meals a day…" ipucunu sil (hardcoded, "doğru" iddiası). |
| "Log a meal" tam genişlik siyah, kartın hemen altında: sayfanın tek vurgusu; sonra düz liste. Öğün başlıkları ("Breakfast 157 kcal ⋯") kalın 22pt. | P1 | Birincil eylem alta (dock) ya da öğün satırı `+`; üstte yalnız özet. |
| İki farklı "ekle" kalıbı: dolu öğünde "Add to Breakfast" teal metin link; boş öğünde "Lunch Nothing yet ⊕" satırı. | P1 | Tek kalıp: öğün başlığının sağında `+`. Boş öğün kartı: "Lunch ⊕ Usually 12:30" + "Your usual: Chicken + Rice [Log]" önerisi. |
| Öğün `⋯` menüsü (D/05c) iOS Alert/ActionSheet: "Log again today / Delete meal / Cancel" — ortada küçük, beyaz-saydam, eski görünüm (action sheet). | P1 ◆ | `UIMenu` (⋯ context menu): Log again today · Copy to… · Delete meal (kırmızı). |
| "Log again today" / "Copy a day's meals" (alt, küçük teal link) / "Same as yesterday" teklifleri (RepeatOffers) / "Fits what's left today" (Suggestions, **sayfanın en altında**) — akıllı özelliklerin hepsi kaydırmanın sonunda. | P1 | "Fits what's left" (örn. "~620 left · P 48 g short: Chicken breast 150 g [+]") üstte, Log butonunun altında yatay çip şeridi; "Copy a day" `⋯` başlık menüsü. |
| Kaydırarak sil (D/05a): kırmızı Delete tam yükseklik, sağda; Undo banner siyah. İyi. | - | - |
| Kalem yok: yerinde düzeltme için satıra dokunmak gerekiyor, belli değil (`correct` erişilebilirlik etiketi var). | P2 | Satır sonunda soluk `›`. |
| Gün şeridi iyi (nokta = o gün loglu). Başlık "TODAY'S FOOD" → "YESTERDAY'S FOOD" → "SUN, OCT 25" (düzeltilmiş, G2/03). Başlık ve "Today / Yesterday" etiketi tekrarı (G2/03). | P2 | Tek başlık "Food"; gün adı şeritte. |
| Önceki günde kart "About at today's target / Protein 123 / 175 g…" (D/04b): tarih geçmişte ama "today's target". | P1 | "On target ✓" / "−120 kcal" tek durum çipi; geçmiş günde hedef = o günün hedefi. |
| ◆ [kod] Durumlar: consent yok ("Your food budget and targets need the health data consent." + Open Settings), failed (Try again), `noTarget` ("Your food budget comes with your first calorie target."), "Not sent yet" (ofline sıradaki öğün): hepsi düz metin. | P1 | Ortak `EmptyState`. |
| ◆ [kod] `CopyDay`: "Copy into {day}" liste + "Done" metin link (bir gün seç: "3 meals · 1,640 kcal"). | P2 | Sheet; seçince Undo toast. |
| ◆ [kod] "Your targets" kartı sayfa sonunda: "2,430 kcal a day · Protein 173 g · Carbs … · Fat … · 10,000 steps a day · 4 training sessions a week". | P2 | Settings ya da This week'e taşı; burada gereksiz. |

## 26. Progress — G/35-36, G/82, G2/10, k1057/1, F/progress-anim
**Hüküm:** Hero + hedef karoları + güç grafiği doğru fikirler, ama 2026 standardında "gelişim" hissi eksik: hedef (yağ yakmak) hero'da yok, görseller (dev kas haritası) bilgi taşımıyor, boş durumlar çubuk + metin.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Hero hedefe bakmıyor: "STRONGER ON 25 OF 25 LIFTS." (w12) ve ilk günlerde "FIRST WORKOUT IN. TODAY'S TARGETS. Tap one to log it." Yağ yakmak isteyen kullanıcının ana sayısı (kilo trendi) yok. | P1 | Hedefe göre hero: "−2.1 lb in 4 weeks" + 7-günlük ortalama sparkline + "9/11 weeks on track" çipi. Güç ikinci blok. |
| Hedef karoları "Calories 309-571 / 1,770" (G2/10): **aralık**; Today's food'da tek sayı. Tutarsız. | P1 | Karolarda tek sayı + ince halka. |
| İlk gün hero metni "Tap one to log it." talimat: hero'da iş emri. | P2 | Hero: "Day 1. Log a weigh-in to start your trend." + tek buton. |
| "This week's muscles" dev kas haritası (kartın yarısı ekranın üçte biri) çoğu gri; bilgi: hangi kas "planned/done". Sayfanın ilk bölümünde yer işgal ediyor. | P1 | Küçült (yan yana, yarım yükseklik) ya da "Sets per muscle" çubukları öne; harita dokununca açılan detay. |
| "Weight trend 1 of 7 · Shows after 7 weigh-ins." kilitli kart: ilerleme çubuğu + metin. Hedefin kendisi, kilitli ve soluk. | P1 | Üst kart olarak "Weigh in 6 more times to unlock your trend" + 7 noktalı gösterge + Weigh in butonu. |
| Strength kartı: çip satırı yatay kayıyor ("D…" kesik, G/82), grafik iki seviyeli basamak ("75 kg", "72.5 kg" iki etiket), "Started at 72.5 kg × 7" + "Up 4 reps at 75 kg since Aug 31." İyi içerik ama grafik iskelet. | P1 | Çipleri `Menu` (Bench press ▾); çizgi grafik + PR noktaları (turkuaz yıldız) + "+2.5 kg" etiketi; dokununca nokta tooltip. |
| Birim: w12 ekranında "kg"; kullanıcı Imperial (Settings ekranında lb): fixture farkı olabilir [doğrulanmadı]. | P2 | Birimler tüm kartlarda tek kaynak. |
| "Consistency" ızgarası (hafta kareleri) + legend + "A missed week never resets your record." (`consistency.note`) not düz yazı. | P1 [kod] | Isı haritası kareleri + üstte "9 of 11 weeks"; notu sil ("never resets" hâlen kural: Settings > How it works). |
| "Calls" listesi (`CallsCard`): başlıklar tekrar ediyor ("Keep going exactly as you are." ×6, k1057/1; "First, finding your real maintenance." ×2). Başlıklar listede ayırt edilemiyor. | P1 | Başlık yerine **değişiklik**: "Calories 2,050 → 1,800", "Steps +1,000", "No change"; tarih sağda. |
| Photos kartı: "Your first photo is due in week 4. Same spot, same light, every time." + dev siyah "Take photos" butonu + "Delete all photos" kırmızı link kartın içinde. Kullanıcı verisi yokken en baskın düğme. | P1 | Boş durum kartı: ikon + 1 satır + ikincil "Remind me week 4"; "Delete all photos" Settings > Data'ya. |
| "Share your progress" satırı + altında 2 cümle (`share.openNote`). | P2 | Satır tek; not sil. |
| Animasyon (F/progress-anim-frame-1…3): veri bağlı geçişler eklendi; iyi. | - | - |
| ◆ [kod] Hata/yükleme: "Some of this didn't load. [Try again]" + `Parts` ("Needs your OK for health data" kilit). | P2 | Kartların kendi iskelet/yeniden dene. |
| ◆ [kod] Hedef karolarına dokunma: Calories/Protein → `/meal` (yemek logu), Steps → Apple Health / Settings, Cardio → `/cardio`: ilk iki hedefin gittiği yer Today's food olmalı. | P1 | Calories/Protein → `/food`. |

## 27. Weigh-in — F/keyboard-weigh-in, k1058-counter/3
**Hüküm:** Hızlı: son değer önceden dolu, tek sayı. Ama kaydet düğmesinin altında Apple Health izin kartı (düz yazı) görev anında araya giriyor.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| "Use Apple Health? Reads steps, sleep, weight, active energy and workouts / Writes weigh-ins back, if you allow / What we read / Continue / Not now" kartı weigh-in'in içinde. | P1 | Weigh-in'de hiç gösterme; kaydettikten sonra "Add to Apple Health?" tek satır toast; asıl izin Settings/onboarding. |
| "2 of 7 weigh-ins for your trend" çubuk + sayı iyi. Kaydedince trend sonucu gösterilmiyor ("7-day avg 182.1 ↓0.3"). | P1 | Kayıttan sonra sheet küçük sonuç kartına döner: "182.4 · avg 182.1 (↓0.3)" + Done. |
| Son 4 hafta grafiği (`weighIn.chart`) [kod] sheet'te görünmüyor (G'de yok). | P2 | Ekle ya da kaldır. |
| ◆ [kod] "This isn't a weight. Check the number." düz hata. | P2 | Alan altında kırmızı olmayan inline. |

## 28. Pause this week (Life got in the way) — G/55
**Hüküm:** Gerçek dünya akışı (Levent #18) doğru ele alınmış; ton iyi ("Nothing counts against you"). Seçim hâli belirsiz, "Safety checks still run" jargon.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| 5 karo (Traveling/Sick/In pain/Busy week/New gym) 2 sütun, seçili hâl belirgin değil; "How long?" ve disabled "Pause my week" sıra. | P2 | Karo seçilince doldur + ikon; "How long" çipleri altta belirir; buton etkinleşir. |
| "Safety checks still run." ne? | P2 | "We still watch for anything risky." ya da sil. |
| ◆ [kod] Sick/In pain için consent adımı sheet içinde: "Sick and In pain are health data, so they need your OK first." | P2 | Zaten onboarding'de verilmişse hiç görünmesin. |
| ◆ [kod] Durum kartı This week'te ("Paused: sick, since Mon [I'm back]") + `welcomeBack`. | P2 | OK; "I'm back" birincil. |

## 29. Settings · ana — G/56-58, G/65, G/70
**Hüküm:** On iki grup, hepsi düz liste; kullanıcı için kritik olanlar (Training, Reminders) ortada. Üstte Appearance/Units segmentleri.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Sıra: Appearance, Units, Training, Food, About you, Reminders, Health and data, Subscription, Data sources, Legal, How it works, Account. | P2 | Profil kartı (ad, hedef, plan) üstte; sonra Training, Food, Reminders, Health; Appearance/Units en alta "App". |
| Training days satırı iki satıra sarıyor ("Training days  Mon · Tue · Wed · Thu · Fri · Sat"). | P2 | Değeri kısalt "6 days". |
| Reminders: 1 anahtar ("Reminders") + "Your routine ›" + "Meal reminders" anahtarı + "Remind me before it ends ›" + gri 2 satır not. Dört ayrı mekanizma, birinde (routine) sentence düzenleniyor. | P1 | Tek "Reminders ›" alt sayfası: Training (saat), Check-in morning, Meals (öğün saatleri), Quiet-week note — her satırda anahtar + saat. Not metni sil. |
| Subscription satırı "Free trial until Nov 12, 2026." düğme gibi (ikon + metin), eylem değil; hemen altında "Cancel or change plan" + teal "Restore purchases". | P2 | Durum rozeti + tek "Manage". |
| "How it works" satırı (rehberi yeniden oynat) iyi. | - | - |
| ◆ [kod] Sign out / Delete account: `askFirst` sistem alert'i (iyi); "Export my data" doğrudan paylaşım sayfası. | - | - |

## 30. Settings · profil alt sayfaları (Goal, Check-in day, Height, Activity, Born, Your routine) — G/59-64, E/04-08, E/11, E/21
**Hüküm:** Yedi ayrı sayfa, hepsi "seç + Save (gri)" şablonu. İşlev doğru; ama bir ayar için sayfa → seç → Save → geri = 4 dokunuş, modern kalıp satır içi.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Her sayfada gri disabled "Save" tam genişlik; değişince siyah. | P1 | Otomatik kaydet + "Saved · Undo" toast. Goal: Segmented 3'lü satırın içinde. Check-in day: gün çipi satırı doğrudan Settings satırında `Menu`. |
| Height/Born: tekerlek sayfası; satır içi genişleyen picker yeter. | P2 | Inline expand (iOS Settings tarzı). |
| "Your routine" (E/11): "The training reminder says this." + 4 hazır cümle çipi + "Your routine, in your words" TextField. Hatırlatma **cümlesini** düzenletiyor; kullanıcı saat bekler. | P1 | Sayfayı sil; Training reminder = saat seçici (`Remind me at 6:30 pm` / "30 min before"). |
| Activity: OptionCard radyo (iyi). | - | - |
| ◆ [kod] `Born` yalnız yıl; "year" etiketi tekerleğin altında soluk. | P2 | "Age 27" önizleme. |

## 31. Settings · Foods you avoid — G/69, E/09-10
**Hüküm:** Çip seçimi doğru (düz metin yerine), ama "Add your own" davranışı tuhaf.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| "Add your own" çipine basınca yazdığın harf canlı olarak siyah "K" çipi gibi görünüyor (E/10); "Save" küçük siyah pill, diğer sayfalarda tam genişlik. | P2 | Çipe basınca inline TextField + "Add" klavye tuşu; Save tutarlı. |
| Etkisi: arama ve barkod sonuçlarında "You avoid this" işareti (`avoided`) var ama sonuçlar gizlenmiyor/soluklaşmıyor [kod]. | P1 | Satırda uyarı ikonu + soluk; "Hide foods I avoid" toggle. |

## 32. Settings · Health data consent / Apple Health / Add to Apple Health / Import weigh-ins — E/13-19, G/74-77
**Hüküm:** Hukuken doğru, kullanım olarak ağır: duvar metni, yan yana View/Withdraw, iki adımlı import.
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Health data consent sayfası: satır "Health data · Allowed [View] [Withdraw]" — **Withdraw** (yıkıcı) View'in hemen yanında, aynı ağırlık; View'e basınca ~350 kelimelik 4 başlıklı metin (E/13). | P1 | Metin: 4 madde → akordeon (başlık + 1 satır, açılır). Withdraw: sayfa altında kırmızı metin ayrı satır. |
| Withdraw onayı metnin **altına** eklenen inline panel ("Withdraw the health data consent? Deleted for good: … [Export my data first] Withdraw / Keep it") (E/14): görmek için kaydırmak gerekiyor. Diğer yıkıcı işlemler (sign out, delete account, meal delete) sistem alert'i. | P1 | `askFirst` sistem alert'i (zaten var); kural: tüm yıkıcı onay = alert. |
| Apple Health sayfası tek satır "Apple Health · Not allowed [View][Turn on]" + boş sayfa. | P2 | Durum ikonu + "Turn on" tek buton; View metni sheet. |
| Add to Apple Health: iki anahtar + bir cümle; iyi. Anahtarlar küçük; etiket "So your rings count them." jargon (Apple halkaları). | P2 | "Show in Apple Fitness". |
| Import weigh-ins (E/18): "Older weigh-ins from Apple Health. They never change a call." + [Import] + "Needs your OK for Apple Health." + Apple Health satırı [View][Turn on]. İzin yoksa iki adım. | P1 | Tek buton "Allow and import". Sonuç: "Nothing new." (E/19) yerine "Already up to date ✓". |

## 33. Settings · Import workouts, Data sources, How it works, Subscription, Legal
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Import workouts (E/20, `import.tsx`): iki paragraf + "Choose a file". Dosya seçilince: unit seçimi çipleri ("What unit are the weights in?"), dumbbell soru ("How does this file count dumbbells? Here a dumbbell move is logged with one dumbbell's weight."), her hareket için eşleştirme listesi (Search moves / Leave out / My own move) ◆ [kod]. | P1 | Sihirbaz: 1) dosya 2) otomatik algıla (unit tahmini) "lb? [Yes] [Change]" 3) eşleşmeyen yalnız 4-5 hareket. Dumbbell sorusu: ikon+kısa. |
| Data sources (E/22): USDA/OFF bağlantı satırları; lisans metni. | P2 | Legal grubuna taşı; satır tek "Food data sources". |
| Subscription: "Remind me before it ends" satırı (TrialReminderRow) Reminders grubunda; abonelik grubunda değil. | P2 | Subscription kartına taşı. |
| Legal: Terms/Privacy dış link ikonu; iyi. | - | - |
| ◆ [kod] `AccountSheet` ve `PaywallView` içindeki "Try again/Check again/Continue" durumları. | P2 | Ortak inline notice. |

## 34. Fotoğraf çekimi / karşılaştırma — yalnız kod+metin `[kod]`
| Sorun | Önem | Somut çözüm |
|---|---|---|
| Capture intro: 4 satır talimat ("Same spot and light each time, ideally in the morning." / "Fitted clothes, arms a little away from your body." / "Phone upright at hip height on a stand, or hand it to someone." / "Two photos: front, then side. They stay on this phone.") + zamanlayıcı segmenti. | P1 | Talimatlar 3 ikonlu mini kart (carousel), "Start" birincil; ayrıntılar ⓘ. |
| Çekim: hayalet (önceki fotoğraf) + eğim göstergesi + zamanlayıcı: iyi, 2026 düzeyi. | - | - |
| Compare: "Side by side / Slide" çipleri + anchor çipleri (Day 1, 4 weeks earlier…) + Front/Side. 3 çip satırı. | P2 | Segmented + tek `Menu` (Compare with ▾). |
| Done: "Week 4 photos saved · Compare opens with your second set, side by side with this one." | P2 | Tek satır. |

---

# Yürüyüş bulguları (`◆sim`, 30 Eki, `main` d8255805)
Açılan: **81 / 292** (+1 kısmi `[~]`). Senaryolar: regular-midweek, regular-w12-mon, return-8d, no-consent. Açılmayanlar: new-user onboarding ve paywall (önceki `G/` görüntüleri geçerli), food-history'ye özgü durumlar, barkod kamerası, tüm sistem seçicileri, çoğu hata/çevrimdışı hâli (fixture'la tetiklenmedi), Settings alt sayfalarının çoğu (zincirli dokunuşlar yanlış sayfaya düştü; o görüntüler silindi, eleman `[ ]` kaldı).

## Yeni `◆sim` P0
| Bulgu | Kanıt | Çözüm |
|---|---|---|
| **Rebuild bitti ama hiçbir şey söylemiyor** (Levent #11 sürüyor). Onay sayfası kısaldı (tek cümle) ve kırmızı metin-link duruyor; basınca doğrudan Train'e dönüyor, ilk karede bile "working" işareti, toast ya da fark yok, Train aynı görünüyor. | `E30-rebuild-confirm-page`, `E30-rebuild-working`, `E30-rebuild-after` | Train'e dönünce banner "Program rebuilt · 4 days · 27 moves · Undo" + yeni kart vurgusu; onay = action sheet. |

## Yeni `◆sim` P1
| Bulgu | Kanıt | Çözüm |
|---|---|---|
| **Birim dönüşümü ham ondalık, plaka hesabı kg'da kalıyor** (Imperial seçiliyken): This week/Train "396.8 × 8", "242.5 × 10"; antrenmanda "209.4 lb" ve altında "25 + 10 + 2.5 kg a side"; geçmiş "104.7 lb warm-up"; Progress "165.3 lb". | `S2`, `R0-train-tab`, `W0-workout-start`, `W6-history-page`, `P0-progress-tab` | lb'da 5'e yuvarla (ya da salon adımına); plaka satırı da lb ("45 + 10 + 2.5 lb a side"). Kullanıcının gördüğü "doğru" sayı bu, kg'ı kimse bilmez. |
| **Dinlenme sayacı yukarı sayıyor** ("0:03  Rest · 2:00-3:00") ve çubuk eklenince set kartı ~55pt aşağı kayıyor (dokunuşlar yanlış hedefe düşüyor; yürüyüşte iki kez kaçırıldı). | `W20-log-set-rest-timer`, `W9-more-menu` | Geri sayım halkası, sabit yükseklikli yer (kart kaymasın). |
| **Düzenlemede "unsaved" notu en üste ekleniyor ve sayfayı aşağı itiyor**; "Add a day" kaydedilmemiş düzenlemede **hiçbir görünür yanıt vermiyor** (uyarı Save'in altında, kıvrımın dışında, yalnız kenarı görünüyor). | `E10`, `E11`, `E17-add-a-day-with-dirty-b/-c` | Otomatik kaydet; uyarı yeri sabit/sticky; ya da Save'siz akış. |
| **Kayıt geri bildirimi**: "Saved." düz metin + tam genişlik gri **Undo** butonu Save'in altında; Cardio'da kayıttan sonra "Cardio after the weights works best kept short…" cümlesi çıktı; "Turn cardio off" sonrası tüm çipler boş + "Saved. This is your cardio now." (kapalı olduğu söylenmiyor); "Back to the coach's default" sonrası sayfa 35 dk / Çarşamba'yı gösteriyor, satır "4 × 30 min" diyor. | `E18`, `E20`, `E26`, `E27`, `E28` | Toast + Undo; Cardio'ya açık/kapalı anahtarı; reset sonrası taze veri. |
| **Workout complete olumsuz çerçeve**: 1 set yapınca "1,257 lb lifted  −94% vs last time", "What moved: Squat 209.4 × 6  4 reps fewer": kutlama ekranında suçlayıcı fark (U7 ruhuna ters). Apple Health kartı + "What we read" 6 satırlık paragraf hâlâ araya giriyor; "This week 4 of 4" iyi. | `X6-workout-complete`, `X8-workout-complete-bottom`, `X8-healthjit-what-we-read` | Eksik antrenmanda fark gösterme ("1 of 4 moves"); sağlık kartını bitişten çıkar. |
| **Details aralığı saçma**: "Eaten: 0-0 kcal; protein 0-0 g; carbs 0-0 g; fat 0-0 g / Left: 2,050-2,050 kcal" (Today's food) ve "110-204 kcal; 9-18 g protein" (2 yumurta). | `F4-food-totals-details`, `M15-portion-star-2x-details` | Tek sayı; Details'i kaldır. |
| **Yinelenen/belirsiz teklifler**: "Same as yesterday" listesi ve altındaki "Copy a day's meals" → "Copy into Today: Yesterday 3 meals" aynı şeyi iki kez sunuyor; "Fits what's left today" satırları dokunulabilir ama `+`/ok yok; banner ("Removed… Undo") sayfa içi akışta bölüm başlığının üstüne biniyor. | `F11`, `F12-copy-days-meals`, `F8-swipe-delete-row` | Tek "Copy from…" menüsü; öneri satırlarına `+`; banner alt sabit. |
| **Edit-meal sheet'inde tüm kayıt arayüzü** (arama, Quick add/Create, Recent·**Frequent**·Favorites·Log again) ve Save dock'u ilk liste satırının üstüne biniyor. | `M18-edit-meal-sheet` | Düzeltme = yalnız miktar/öğün; arama kapalı. |
| **Boş Quick add kartı "Log it"i kilitliyor**: yumurta hazır, kart boş → buton gri; "Quick add" linki kart açıkken de duruyor. | `M8-quick-add-with-draft` | Boş kartı yok say ya da kartı otomatik kapat. |
| **Recent'te `+` sheet'i kapatıyor**, banner "Saved Snack, 1 item" Start butonunu örtüyor; varsayılan öğün "Snack" ve Recent listesi Snack için kahvaltı/akşam yemeği öğeleri gösteriyor (öğüne göre filtre görünmüyor). | `M11-recent-plus-logs`, `M2-log-a-meal-open` | Çoklu ekleme için sheet açık kalsın; Recent gerçekten öğüne göre olsun. |
| **İlk kullanım rehberi hedefi olmayan ekranlara biniyor**: "Your weekly call · One call a week" Welcome-back ekranının (return-8d) ve "WEEKLY CALLS ARE OFF" hero'nun üstünde (no-consent). | `Y24-return-8d`, `T22-no-consent-thisweek` | Rehber yalnız hedef bileşen varsa; yoksa adımı atla. |
| **Settings › Training days** Edit program kökünü değil doğrudan editörü açıyor (ilk gün açık, "Remove this day" gri); Train'den Edit farklı kapı → aynı içeriğe iki yol. | `S3-training-days-row` | Tek yol. |
| **Add a move**: düz alfabetik liste (ad + "6-10 reps"), filtre/ikon yok, **Close listenin en altında** (kaydırmadan görünmez). | `E12-add-a-move-sheet`, `E13-add-move-search-none` | Kas/ekipman çipleri, ikon, Close yerine sheet tutamacı. |
| **History** ("RIR 1" jargonu, ondalık lb) başlığında geri oku yok; "Edit this session" her kartta ayrı buton. | `W6-history-page` | RIR → "1 left"; tek ⋯ menü. |
| **Antrenman içi Swap** panel olarak (sheet değil) iki prose satırıyla ("Same muscles, and your gym has these. The new move has no target of its own: its weight is yours." + "This workout only. Your program stays as it is."); **End** da yerel menü değil satır içi panel; **FinishForm** (Clean / Not clean) hâlâ ara adım. | `W7-swap-sheet`, `W1-end-sheet`, `W29-finish-form` | Yerel action sheet; prose sil. |
| **Gym is busy**: 3 dokunuş (Change → Gym is busy → hareket → alternatif) ve alternatif seçilince Train'de onay/Undo **yok** (kart sessizce değişiyor). | `A5-today-change-sheet`, `A5-gym-busy-which-taken`, `A13-swap-alternatives`, `A13-swap-scope` | Banner + Undo. |
| **Hafta şeridi dokunulamıyor** (`[kod]` doğrulandı). Today's food'a giden Food kartı satırı çalışıyor ama chevron yok (`[kod]` doğrulandı). | `T2-weekstrip-day-tap`, `T00-thisweek-regular-midweek` | Bkz. §7. |
| **Progress'te kilo trendi (en önemli grafik) dördüncü blok**: Strength → Muscles → Sets per muscle → Weight; çizgi grafik aslında iyi (7 günlük ortalama, "192.7 lb"). Calls listesi başlıkları tekrar ediyor (×3 "Keep going exactly as you are."). | `P8-progress-scroll2`, `P10-progress-scroll4` | Hedefe göre sırala; Calls'ta değişikliği yaz. |
| **Today's food swipe**: hızlı uzun kaydırma satırı **anında siler** (Delete düğmesini göstermeden), yalnız Undo banner'ı kurtarıyor. | `F8-swipe-delete-row` | Tam kaydırma onayı için eşik/haptic. |

## Olumlu doğrulamalar (`◆sim`)
- **Return / Welcome back** (`Y24-return-8d-clean`): üç seçenek kartı, tek "Suggested" siyah kart, Continue/Not now: uygulamanın en tutarlı ikincil ekranı; diğer seçim ekranlarının örneği olmalı.
- **Monday ritüeli** (`T7-monday-ritual`): turkuaz yuvarlak "Open your call" blokta güçlü bir an; yalnız alt cümle sade tutulabilir.
- **Call ekranı, "Keep last week's plan" sonrası** (`C2-keep-last-weeks-plan`): "Not applied. Kept on record." + "Steps, in force 7,000" + "Use this call" net ve suçlamasız; `Confidence Medium` ve boş alt yarı sorunları sürüyor.
- **Koyu tema** (`S1-appearance-dark`) Settings'te temiz çalışıyor.
- **Share çıkartmaları** (`X9-share-screen`, `X11-share-*`): "8 of 10", "10 weeks in" içerikleri iyi; üst %60 boş.

## Eski `[kod]` yargılarından değişenler
| Eski yargı | Yürüyüş sonucu |
|---|---|
| §16 "Change today" 6 satırlık düz liste (push sayfa) | **Düzeldi:** orta boy bottom sheet, 4 seçenek kartı (Undo/Full workout yalnız ilgili durumda). P1 → P2 (açıklama satırları + "Close" kalıyor). |
| §16 Gym busy "4 adım, kapsam seçimi" | Bugün için kapsam sorusu **yok**, 3 dokunuş; sorun adım sayısından çok sessiz sonuç (yeni P1 satırı). |
| §15 Rebuild onay sayfası "5 satır paragraf" | **Kısalmış** (tek cümle, #690); kırmızı metin-link ve **sonucun görünmezliği** (P0) sürüyor. |
| §23 Log again `+` yalnız çizili ikon (P0) | #688 birleşti; Log again sekmesi yürüyüşte **yeniden denenmedi** (Recent `+` çalışıyor, sheet'i kapatıyor). Durum belirsiz, P0 → "doğrulanmadı, yeniden dene". |
| §7 Hafta şeridi dokunulamaz, Food kartında chevron yok | Doğrulandı. |
| §12 Editörde sıra değiştirme yok | Doğrulandı (sürükleme tutamacı yok). |
| §9 Train "Today kartında 9 ⇆" | Düzeltme: ⇆ **yalnız hedef yükü olmayan** satırlarda var (Leg press'te var, Hip thrust'ta yok): sorun gürültü değil tutarsızlık. |
| §12 "Remove this day" | Onaysız silme + satır içi Undo doğrulandı; kabul edilebilir, ama gri/ikonsuz görünüm sürüyor. |
| §26 "Weight trend kilitli kart" | Veri varken **gerçek bir çizgi grafik** (iyi); sorun yeri (4. blok), kilidi değil. |
| §14/§13 Cardio ve Split içerikleri | Cardio sayfası beklenenden kötü: reset sonrası bayat veri, kapalıyken yanlış "Saved" (yeni satırlar). Split sayfası yürütülmedi (E4 `[ ]`). |
| §23 "Recent öğüne göre" | Sheet'te "Snack" için kahvaltı/akşam öğeleri çıkıyor: öğüne göre filtre **gözlemlenmedi**. |

---

# Çapraz bölüm

## Çapraz §A · Tutarlılık kuralları (tek kart, tek buton hiyerarşisi, tek boş durum, tek satır, tek bölüm başlığı)
Bugünkü durum: aynı iş için 3-5 farklı görünüm var. Kural + o kurala uymayan yerler:
| Kural | Bugün | Olması gereken |
|---|---|---|
| **Vurgu = önem × sıklık, konum değil.** Siyah blok yalnız **karar/hero** (Plan, call, Today kartı); ekranda en fazla 1-2. | Plan ekranı iki siyah kart; This week'te hero siyah ama günde 5 kez kullanılan Food kartı soluk; Today's food'ta dev siyah "Log a meal"; Progress hero siyah, altı düz. | Hero siyah, birincil eylem tek dolu buton, geri kalan yüzey kartı. Sık kullanılan iş (yemek) hero'dan sonra ikinci en güçlü kart. |
| **Tek kart stili:** `surface` dolgu, tek köşe yarıçapı, çerçeve yok; seçili = turkuaz halka. | Seçenek kartı 3 stil (siyah öneri / gri / ikonlu gri); Edit program satırı kart ama chevron yok; Progress kartları başlığı küçük gri 15pt; çip çerçeveli pill, bazı yerde çerçevesiz. | `Card` + `ListRow` + `Chip` tek set; `OptionCard` ikon opsiyonlu. |
| **Tek buton hiyerarşisi:** Birincil = siyah dolu tam genişlik (koyu temada turkuaz), ekranda 1. İkincil = gri dolu. Üçüncül = teal metin. Yıkıcı = kırmızı metin **yalnız** sistem alert'inde/action sheet'te. | Siyah dolu (Log a meal, Save, Continue), turkuaz dolu (Start workout, Log set, Done), gri dolu (Change, Add a day, Close), gri hayalet (Remove this day), teal metin (Add to Breakfast, Quick add, Edit), kırmızı metin-link (Rebuild my program, Delete all photos, Remove), küçük siyah pill (Import, Save compact), disabled gri Save (7 sayfa). | Yukarıdaki 3+1 kalıp; boyut tek (`primary` 52pt, `secondary` 44pt, `text`). Disabled durum "gri" yerine soluk birincil + nedeni söyleyen tek satır. |
| **Tek boş durum:** ikon (SF Symbol) + 1 satır + 1 eylem. | "Nothing yet ⊕" satırı, "Nothing logged this day." metin, "Shows after 7 weigh-ins." çubuk+metin, "No steps yet", "No program yet." + buton, "Nothing found. Try other words.", "Star a food to keep it here." | `EmptyState` bileşeni: ikon + başlık + eylem; kart içi/tam sayfa iki boyut. |
| **Tek hata/bilgi bandı** (`InlineNotice`): ikon + 1 satır + eylem; sayfa altında düz metin değil. | `ProblemText` düz metin her ekranda, ekranın en altında (kaydırmadan görünmez) — Edit program, Meal, Train. | Hatalar ilgili alanın hemen altında / üstte band. |
| **Tek geri bildirim:** işlem sonrası alt toast + Undo (zaten `UndoBanner` var, iyi). | Bazı yerler toast (meal saved, deleted), bazı yerler sayfa altı düz "Saved.", "Undone." metin (Edit program, Cardio), bazı yerler tek-satırlık "Day added." | Her kaydet/sil/uygula = toast + Undo. Edit sayfalarında otomatik kayıt. |
| **Tek satır (list row):** ikon + etiket + (değer) + chevron/anahtar; yükseklik 52. | Settings `ListRow`, Edit program `Row` (chevron yok), Food `FoodRow` (plus), Train hafta satırı (tarih rozeti), Calls satırı (chevron), `Pressable` düz metin. | `ListRow` varyantları: navigate / value / toggle / action (+). |
| **Tek bölüm başlığı:** sayfa başlığı display kondanse büyük harf; bölüm başlığı 13pt kalın gri üst-küçük (Settings stili) **ya da** 22pt kalın (Train "This week", Food "Breakfast") — şu an ikisi de. | Settings bölüm: küçük gri; Train/Food bölüm: 22 kalın; Progress kart başlığı: 15 gri; Today kart başlığı: kondanse. | Tek ölçü: bölüm = 17pt semibold; kart içi başlık = 15 semibold gri. |
| **Tek kapat/geri:** modal sheet = aşağı çek + sağ üst `✕` (başlıksız); push = sistem geri. Tam genişlik "Close" butonu yok. | Log a meal: "Close" teal metin sağ üst; Add a day, Swap, Taken, Scan, Pause: alt tam genişlik gri "Close"; Meal: "Close meal log"; Edit program: sistem geri + "Leave without saving". | Tek kalıp. |
| **Tek sayı biçimi:** kcal tek sayı; birim her yerde; makro "P/C/F" harfi yerine renk noktalı etiket. | Today's food tek sayı; Progress aralık "309-571"; "Details" aralık ×3; This week "2,430"; antrenmanda birimsiz "28 × 6". | Tek biçim (ADR-090 #5). |
| **Tek sheet kalıbı:** detent'li bottom sheet (medium/large) + tutamaç; kenar boşluğu aynı. Tam ekran sayfa yalnız akışlar için (workout, camera). | Sheet'ler "pageSheet" tam yükseklik, üstte siyah boşluk bandı (sheet arkası siyah, açık temada ağır); bazı "sheet"ler push sayfa (Add a day, Swap, Today-change). | iOS 26 detent'li sheet'ler; üst arkaplan bulanık. |

## Çapraz §B · "Zekâ var, ekranda görünmüyor" ve 10 "wow" anı
**Tespit (Levent #15):** Arka planda gerçek, kullanım durumuna özgü mantık var: öğüne göre son yenenler (`recentFoods(slot)`), saatten varsayılan öğün (`defaultSlot`), kullanılan öğün çipleri, "Same as yesterday", barkod, 7 güne kadar gün ekleme + sunucu doldurma, "gym busy" → farklı ekipman + kendi son ağırlığı (B/04), kalibrasyon ("That weight is light. Next set 135?"), deload/short sürüm, "Fits what's left today", ilk hafta sayacı. Hepsi **düz metin satırı ya da gizli link** olarak duruyor; kullanıcı "bu uygulama beni tanıyor" demiyor. Çözüm yeni özellik değil, **görünür kılmak**:
| # | Wow anı | Bugün | Ekranda nasıl görünür |
|---|---|---|---|
| 1 | **"Your usual breakfast"** — saate göre öğün, son 3 aynı-öğün kaydından en yaygın birleşim | `recentFoods(slot)` + `Log again` ayrı sekmelerde | Log a meal açılışında büyük kart "Your usual breakfast · Oats + Milk + Banana · 487 kcal [Log all]"; dokun = porsiyon düzenleme sheet'i. |
| 2 | **Tahmin edilen başlangıç ağırlıkları** | Onboarding "Not set"; antrenmanda boş "Pick" ve 5 lb | Boy-kilo-deneyimden "≈ 135 lb" çipi, tek dokunuş; ilk sette "Start at 95? [95] [Other]". |
| 3 | **"Beat last time" hedef çipleri** (bugünkü antrenman kartında ve set kartında) | Satırda "28 × 6" birimsiz; set kartında "Last time" kutusu | "Last 75 × 10 → today 75 × 11 (+1 rep)" yeşil çip; set kaydedince çip tikli. |
| 4 | **Set yaparken anlık fark ve dinlenme halkası** | Yukarı sayan sayaç, "+1 rep vs last time." (insight) küçük satır | Geri sayım halkası + haptic; log sonrası kartın üstünde "+1 rep ↑" çipi (turkuaz). |
| 5 | **Bitişte "What moved"** (hareket başına fark, PR, sonraki hedef) | Ekran sonunda küçük kart, ilk antrenmanda yok | Hero'nun altında "Moved: Bench +5 lb · Row +1 rep"; PR'de altın çip + hazır paylaşım çıkartması. |
| 6 | **Haftalık call = kanıt çipleri** | Tek cümle kural gerekçesi + "Confidence Medium" | "Weight −0.1 lb/wk · Logged 6/7 · Lifts +2" üç çip + önce→sonra satırı. |
| 7 | **Progress hero = hedefine göre sayı** | "Stronger on 25 of 25 lifts" herkese | Yağ yakma: "−2.1 lb in 4 weeks" + sparkline; kas kazanma: güç. |
| 8 | **Hafta şeridine dokun** | Dokunulamaz noktalar | Güne dokun → o günün antrenmanı + yemek + weigh-in özeti. |
| 9 | **"Fits what's left"** (akşam yemeği önerisi) | Today's food'un en altında | Log a meal'de Dinner seçilince üstte "~620 left · P 48 g short: Chicken breast 150 g [+]". |
| 10 | **Gym busy, tek dokunuş** (aynı kas, başka ekipman, kendi son ağırlığıyla) | Üç adımlı sheet, "Taken" jargonu | Antrenman ekranında "Busy?" çipi → alternatifler "Chest-supported row · last 52.5 kg" tek dokunuş; Undo bar var. |
Ek (ücretsiz küçük "wow"lar): Weigh-in sonrası "avg 182.1 ↓0.3" sonucu; Monday'de yuvarlak "Open your call" ritüeli (zaten var, iyi); Apple Health'ten gelen adım/kilo "from Health" rozeti.

## Çapraz §C · Kırpma listesi (gereksiz iş, tekrar, bilgi sayfası)
| Kırp | Neden | Yerine |
|---|---|---|
| Edit program › **Split** sayfası ve satırı | Hiçbir eylem yok; bilgi başlıkta zaten var | Başlık altı çip |
| Edit program › **Moves** satırı (aynı editör) | Training days ile aynı sayfa | Tek "Your program" sayfası |
| Train'deki sürekli "A rest day helps you grow faster." | Nag + bilimsel iddia | Hiç / Add a day'de bir kez |
| "Counted by week" (This week sağ üst) | Anlamsız | — |
| "Details / ⓘ" aralık (3 yer) | Güven kırar, tek sayı kararı var | Tek sayı |
| Weigh-in içindeki Apple Health izin kartı; workout complete içindeki aynı kart | Görev anına izin isteği | Settings/onboarding |
| "How was your form?" ara adımı | Bitirme yolunda ekstra ekran | Sonuç ekranında çip |
| Settings › **Your routine** (cümle düzenleme) | Hatırlatma cümlesini kimse düzenlemek istemez | Saat seçici |
| "Confidence Medium" (call) | Anlamsız | Veri çipleri |
| Üç ayrı "Taken" girişi → bir ("Busy?" Up next) | Tekrar | — |
| Dock'ta "Skip set" | Dikkat dağıtır | ⋯ menü |
| Add a day sheet "Close" butonu, tüm sheet'lerde alt "Close" | Aşağı çek yeter | — |
| Onboarding Goal "Decide for me" metni "We read your numbers" (sayı gelmeden) | Dayanaksız vaat | — |
| Progress: dev kas haritası üst bölümde, Photos kartında siyah "Take photos" butonu veri yokken, "Delete all photos" kırmızı link kart içinde | Boş durumda en baskın öğeler | Küçük harita; photos boş kart |
| "Your targets" kartı Today's food sayfa sonunda | Başka yerde var | Settings |
| 5 hazır "routine" cümle çipi | Aynı | — |
| Paywall'da tekrarlanan trial cümleleri (4 yerde) | Tekrar | Tek kaynak |
| Ölü kod/metin: `PromptCard`, `CheckInCard`, `ConsistencyCard`, `FirstWeeksCard`, `TodayList`, `CoachEntry` + `en.json` `first_weeks.*`, `prompt.*`, `coach.*`, `today.list.*`, retired yüzeylerin metinleri (en.json'da toplam ≈2.200 kelime; 16.338 kelimenin %14'ü) | Erişilemiyor, bütçe testlerini şişiriyor, bilimsel/hardcoded "doğru" kataloğu | Sil (ayrı PR; K1 değil, ölü kod) |

## Çapraz §D · Hardcoded "doğrular" ve düz yazı (alıntı + karar)
Normal kullanıcı bunları okumaz; bilimsel iddia/gerekçe cümleleri **çipe, satıra ya da ikona** inmeli. Ekranda gerçekten çıkanlar (erişilemeyenler hariç):
| Metin (`anahtar`) | Nerede | Karar |
|---|---|---|
| "A rest day helps you grow faster." (`train.restNote`) | Train, 6-7 gün | Kes |
| "The coach's default for your phase. Change it and it's yours: the coach won't change it again." (`editProgram.cardio.coach`) | Cardio | Rozet "Coach's plan/Yours" |
| "Cardio after the weights works best kept short; a longer session is your call." (`decision.rule.cardio_after_lift_over_line`) | Cardio | Kes |
| "Your split follows your training days. Rebuild for me makes a new program from them." (`editProgram.splitBody`) | Split | Sayfayı sil |
| "A new program from your training days. Goes: targets, starting weights, this week's changes, your own program and moves. Logged workouts stay." (`rebuildBody`) | Rebuild | Tek satır |
| "4 meals a day, about 600 kcal each" (`food.totals.hint`) | Today's food | Kes |
| "Details: 110-204 kcal; 9-18 g protein" (`meal.item.detailRange`) | Porsiyon | Kes (tek sayı) |
| "A lower target would crowd out the protein and carbs your training runs on, so movement goes up instead." (`decision.rule.carb_squeeze`) ve 60+ kural cümlesi | Call ekranı | Veri çipi + 1 kısa cümle |
| "A weight you lift about 8 times. Skip any." / "Tap a lift, flick to your number. Your first session checks it." | Onboarding weights | Tek satır |
| "A move whose form wasn't clean keeps its weight and reps next time, until it is." (`workout.form.note`) | Bitirme formu | Formla birlikte kes |
| "Easy sets, nowhere near failure." (`warmup.note`), "Bike, incline walk or cross-trainer. No sprints." / "You can talk, in short sentences" / "After lifting, not before." (`workout.cardio.*`) | Antrenman, Cardio adımı | Cardio adımı: süre + tek çip "Easy pace"; diğerleri ⓘ |
| "Sets not logged stay unlogged." / "Still counts for this week." / "Nothing is saved." | End sheet | Kes |
| "Same muscles, and your gym has these. The new move has no target of its own: its weight is yours." (`swap.why`) | Swap | Kes |
| "Made on this phone. No body weight. Your photo stays yours. Save, TikTok and more are in the share sheet." (`share.note`) | Share | Tek ikonlu satır |
| "Reads steps, sleep, weight, active energy and workouts / Writes weigh-ins back, if you allow" (`health.jit`) | Weigh-in, Workout complete | Bu kartı kaldır |
| ~350 kelimelik health consent metni (View) | Settings | Akordeon + "Read full text" |
| "A missed week never resets your record." (`progress.consistency.note`) | Progress | Kes (kural zaten How it works'te) |
| `onboarding.expectations.*` ("Visible change takes 4 to 8 weeks.") | [kod: kullanılıyor mu doğrulanmadı] | Kullanılıyorsa tek ekran 3 ikon |
| "In gym data, people who reach about nine sessions in six weeks tend to keep going." (`first_weeks.week5.body`), "Most of your strength gain so far is your nervous system learning the moves, not muscle yet." (`week4.body`) | **Ölü** (`FirstWeeksCard` bağsız) | Sil |
| "Hunger usually arrives around day 3 or 4, and after your first heavy leg day." (`prompt.*`) | **Ölü** (`PromptCard` bağsız) | Sil |
Kural: kullanıcıya gösterilen her sayı veriden (kendi geçmişinden), her gerekçe en çok bir satır; "neden"i isteyen ⓘ'ye basar (sheet). Hiçbir yerde ders/makale cümlesi yok.

## Çapraz §E · "Call" kelimesi, marka ve vaat (Levent #17, #21)
- **"call"** `en.json` içinde 2.859 stringin **121**'inde geçiyor (weekly call, first call, next call, open the call, your call, use this call, call ready…). ABD'li normal kullanıcı "call"ı **telefon görüşmesi/satış araması** olarak okur; "This week's call" bir koç kararı olduğunu söylemez. Ürünün sloganı "This one makes the call" (karar verir) ve marka "Next Call" iki anlamla oynuyor, ama UI içinde 121 yerde tek başına "call" kullanmak **anlam açığı**. Öneri (ürün/marka kararı Levent'te): kullanıcıya dönük kelime "**Your plan update**" / "Monday check-in" / "This week's plan", marka adı "Next Call" olarak kalabilir (slogan yerinde). En azından ilk karşılaşmada bir kez tanım: "Every Monday we make **the call**: what to eat and lift next."
- **"coach"**: ekranlarda hâlâ var ("Your coach fills it with moves", "The coach's default"), oysa koç yüzeyi kapalı ve "kararı deterministik motor verir". Kullanıcı bir insan/AI koç bekler. Ya "we" kullan ya da motoru adlandır.
- **Jargon listesi (ekranda, tanımsız):** RIR/"Reps left", Compound, Split, Phase (Cutting/Building), Taken, Deload/Short version, Baseline set, Confidence, Spare week, Weighed, Plate-loaded, Unilateral ("One side at a time?"). Hepsi ya günlük dile ya ikona.
- **Vaat/his:** "Your plan adjusts every week, and tells you why." (welcome) doğru; "why" kısmı (call ekranı) en zayıf halka (§8). "Stop guessing in the gym." vaadi için gym içinde ilk antrenman (boş ağırlık, 5 lb) ters gidiyor (§17).
- **Marka/pazarlama:** App Store ekran görüntüleri için en güçlü 4 ekran: Plan reveal (G/14), Monday ritüeli (hero), antrenman ekranı (koyu odak, B/04), Workout complete + PR stickerı (Share). Bunlar düzeltildikten sonra çekilmeli. Paylaşım çıkartması "Next Call" damgası taşıyor (iyi, viral).

---

# Ek · Etkileşim envanteri (kod kaynaklı, ekran ekran)
Kaynak: `apps/mobile/src` içinde her `onPress/onLongPress/Switch/Modal/Alert/askFirst/Swipeable/router.*/Chip/Segmented/Stepper/TextField` ve her boş/hata/ilk-kez durumu. Biçim: `- [ ] ID · eleman → nereye gider / ne olur`. `[x]` = simülatörde açılıp ekran görüntüsü alındı (`E7-review/<ekran>-<eleman>.png`). `[~]` = dokunuldu ama durum görüntülenemedi. Durumlar (boş/hata/ilk kez) ayrı "Durum" satırlarıdır.
**Ölü kod (hiçbir yerden bağlı değil, envantere alınmadı):** `PromptCard`, `CheckInCard`, `ConsistencyCard`, `FirstWeeksCard`, `TodayList`, `CoachEntry`. **Kapalı (RETIRED) yüzeyler:** coach, meal-photo, recipes, recipe, why, scoff, projection, ledger, what-if, workout-summary.

## G · Genel (her ekran)
- [x] G1 · `+` FAB (PlusEntry) → `/plus` sheet
- [ ] G2 · Tab: This week → `/(tabs)/index`
- [ ] G3 · Tab: Train → `/(tabs)/train`
- [ ] G4 · Tab: Progress → `/(tabs)/progress`
- [x] G5 · UndoBanner "Undo" (siyah alt bant, her kaydet/sil sonrası) → işlemi geri alır; hata durumu (`undoFailed`)
- [ ] G6 · Klavye "Done" çubuğu (Stepper/TextField) → klavyeyi kapatır
- [x] G7 · Sistem geri (sol üst, önceki ekranın adı) → pop
- [ ] G8 · Çevrimdışı bant/durum ("You're offline…") → Train, Workout, Meal'de farklı metin

## T · This week (`(tabs)/index`)
- [x] T1 · Gear → `/settings`
- [x] T2 · Hafta şeridi günleri (7 hücre) → dokunulabilir mi? (kodda `WeekStrip` accessibilityLabel var; dokunma yok)
- [ ] T3 · Hero hâli firstWeek: başlık, WeighInCounter "Weigh in" → `/weigh-in`
- [ ] T4 · Hero hâli firstWeek (kısa hafta): "Training goes on as planned" metni
- [ ] T5 · Hero hâli call: tüm blok → `/call`
- [ ] T6 · Hero hâli call (pending/declined): "Use this call" → inline uygula; hata metni
- [x] T7 · Hero hâli monday: yuvarlak "Open your call" → `/check-in`
- [x] T8 · Hero hâli callsOff: "Settings" → `/settings`
- [ ] T9 · StateCard (durumlu hafta): "I'm back" → inline sıfırla; "Welcome back" mesajı
- [ ] T10 · Bugünkü antrenman kartı: "Start" → `/workout?day=`
- [ ] T11 · Bugünkü antrenman kartı: slider ikonu (Change today) → `/today-change`
- [ ] T12 · Bugünkü antrenman kartı: "Full workout" (kısa sürüm) → inline geri al
- [ ] T13 · Bugünkü antrenman kartı: "Undo" (taşınan/atlanan gün) → inline
- [ ] T14 · Kart hâli: "Continue" (açık antrenman) → `/workout`
- [ ] T15 · Kart hâli: OpenElsewhere (Continue here / Fill in later / Discard → alert)
- [ ] T16 · Kart hâli: dinlenme günü ("Next session: …")
- [ ] T17 · Kart hâli: bitti ("Today · done" + tik, "2 sets · 600 lb lifted")
- [ ] T18 · Kart hâli: taşındı/atlandı/dinlenme haftası
- [x] T19 · Food kartı: satır → `/food`
- [ ] T20 · Food kartı: ⓘ → aralık aç/kapat (inline)
- [ ] T21 · Food kartı: "Log" → `/meal`
- [x] T22 · Food kartı: rıza yok → kilit satırı + "Settings"
- [ ] T23 · Program yok → "Build my program" kartı → `/build-program`
- [ ] T24 · Hata bandı "Couldn't load today." + "Try again"
- [x] T25 · Rehber (GuideOverlay) 4 adım: Next / Skip / Got it / ekrana dokun
- [ ] T26 · Rehber yeniden: Settings › How it works → `/` + overlay

## C · Call / Check-in
- [x] C1 · `/call` "Got it" → geri
- [x] C2 · `/call` "Keep last week's plan" → uygulamama
- [ ] C3 · `/call` "Use this call" (uygulanmamış) → uygula
- [ ] C4 · `/call` "Weigh in" (az weigh-in) → `/weigh-in`
- [ ] C5 · `/call` durum: none / abonelik kilidi ("See plans" → `/paywall`) / failed ("Try again") / rıza ("Open Settings")
- [ ] C6 · `/call?id=&from=progress` salt okunur
- [x] C7 · `/check-in` soru seçenek çipleri (training/recovery/appetite/state_still/week1_feel) → seçim
- [ ] C8 · `/check-in` 1-10 ölçek çipleri
- [ ] C9 · `/check-in` waist TextField (cm/inç)
- [x] C10 · `/check-in` "Get this week's call" → `/call`
- [ ] C11 · `/check-in` durum: none / answered / moved / failed ("Try again") / rıza ("Open Settings")
- [ ] C12 · Week-1 check-in: "Sounds right" / "Change it" → gün çipleri / "Keep the suggestion" / "Done" / "Open Edit"

## R · Train (`(tabs)/train`)
- [ ] R1 · "Edit" → `/edit-program`
- [ ] R2 · "N changes applied · Undo" kartı → `/edit-program?part=changes`
- [ ] R3 · CallRow "Use this call" (declined) → uygula
- [x] R4 · Bugünün kartı "Start workout" → `/workout`
- [x] R5 · Bugünün kartı "Change" → `/today-change`
- [ ] R6 · Bugünün kartı hareket satırı ⇆ (swap) → `/swap`
- [ ] R7 · Bugünün kartı hareket satırı (history) → `/exercise-history`
- [ ] R8 · Bugünün kartı "Continue workout" / "Undo" / "Full workout"
- [ ] R9 · Hafta satırı "Start" (günsüz gün, `pick`) → `/workout?day=`
- [ ] R10 · Hafta satırları (ölü? dokunma) → davranış
- [ ] R11 · "Add a day" → `/add-day`
- [ ] R12 · Rest-day notu (6-7 gün)
- [ ] R13 · Durum: program yok / yüklenemedi ("Try again") / çevrimdışı (kept) / dinlenme haftası / deload / busy hafta / back after break notları
- [ ] R14 · "Build my program" → `/build-program`

## A · Add a day / Change today / Swap / Build program
- [ ] A1 · `/add-day` önerilen gün butonu → ekle + geri
- [ ] A2 · `/add-day` "Or another day" çipleri → ekle
- [ ] A3 · `/add-day` "Close"
- [ ] A4 · `/add-day` durum: conflict / offline / failed / full
- [x] A5 · `/today-change` Gym is busy → `/swap?scope=today`
- [ ] A6 · `/today-change` Short on time → uygula
- [ ] A7 · `/today-change` Full workout
- [ ] A8 · `/today-change` Undo
- [ ] A9 · `/today-change` Move it (yarına; kayma listesi `Shifts:`)
- [ ] A10 · `/today-change` Skip today
- [ ] A11 · `/today-change` Close; durumlar: started / none / offline / conflict
- [x] A12 · `/swap` "Which one is taken?" hareket seçimi
- [x] A13 · `/swap` alternatif satırı → `Today only / From now on` kapsam seçimi
- [ ] A14 · `/swap` "Skip today instead" → `/today-change`
- [ ] A15 · `/swap` "Close"; durumlar: not found / none / conflict / offline
- [ ] A16 · `/build-program` gün sayısı seçimi → oluştur → `/train`; "Try again"

## E · Edit program
- [x] E1 · Satır Training days → `part=days`
- [ ] E2 · Satır Moves → `part=moves`
- [x] E3 · Satır Cardio → `part=cardio`
- [ ] E4 · Satır Split → `part=split`
- [x] E5 · Satır Rebuild for me → `part=rebuild`
- [x] E6 · Günler: gün başlığı (aç/kapat)
- [ ] E7 · Günler: Day name TextField
- [x] E8 · Günler: "Remove this day" → silinir + Undo bar
- [ ] E9 · Günler: 7 gün çipi (dolu gün devre dışı)
- [x] E10 · Günler: hareket stepperları (Sets / Min reps / Max reps) − +
- [x] E11 · Günler: hareket "Remove" → Undo bar
- [x] E12 · Günler: "Add a move" → pageSheet arama
- [x] E13 · Add a move: Search moves TextField
- [ ] E14 · Add a move: sonuç satırı → ekle
- [x] E15 · Add a move: "Add my own move" → OwnMoveForm (kind / equipment / added weight / one side çipleri, name, Save and add, Back, "Is it one of these?" listesi)
- [x] E16 · Add a move: "Close"
- [x] E17 · Günler: "Add a day" (canAddDay → `/add-day`; değilse editör boş gün)
- [x] E18 · Günler: "Save changes"; hedef kaybı uyarısı "Save anyway / Keep editing"
- [ ] E19 · Günler: kaydedilmemiş not + geri → "Leave without saving / Keep editing"
- [x] E20 · Günler: kayıt sonrası "Undo" (son düzenleme)
- [ ] E21 · Moves: Review önerileri "Apply" (her bayrak)
- [ ] E22 · Moves: "Your own moves aren't reviewed: N"
- [ ] E23 · Changes: her değişiklik "Undo"
- [x] E24 · Cardio: dakika stepper − +
- [x] E25 · Cardio: 7 gün çipi
- [x] E26 · Cardio: "Save my cardio"
- [x] E27 · Cardio: "Turn cardio off"
- [x] E28 · Cardio: "Back to the coach's default"
- [ ] E29 · Split: statik sayfa
- [x] E30 · Rebuild: "Rebuild my program" → `/train`; antrenman sürerken engel metni
- [ ] E31 · Durumlar: program yok (BuildProgramPrompt), offline, conflict (stale/kept/cleared), refused, failed

## W · Workout (`/workout`, dark)
- [x] W1 · "End" → End sheet
- [ ] W2 · "Pause" / "Resume"
- [ ] W3 · Zaman göstergesi; MoveDots (9 nokta) → dokun = o harekete atla
- [ ] W4 · Hareket ikon kutusu / başlık → How to (`/exercise`)
- [x] W5 · "How to" → `/exercise?exercise=`
- [x] W6 · "History" → `/exercise-history`
- [x] W7 · "Swap" → SwapSheet
- [ ] W8 · "Taken" → TakenSheet
- [x] W9 · "More" → MoveMenu (Superset with… / Not a superset / Skip move)
- [x] W10 · Superset partner seçimi (çipler, Cancel)
- [ ] W11 · "Bring it back" (atlanan hareket)
- [ ] W12 · Hedef kutusu ("First time / Match last time / Beat last time")
- [ ] W13 · Warm-up: katlanır başlık + "Log warm-up N"
- [ ] W14 · Ağırlık stepper (− + yazılabilir sayı)
- [ ] W15 · Reps stepper
- [ ] W16 · RIR çipleri 0 / 1 / 2+
- [ ] W17 · "Add a note" → TextField
- [ ] W18 · "Too heavy?" → LoadNote (Use / Keep)
- [ ] W19 · LoadNote "That weight is light. Next set …?" (Use / Keep)
- [x] W20 · "Log set N" (dock)
- [ ] W21 · "Skip set"
- [ ] W22 · Biten set satırı → EditSet sheet (stepperlar, Delete set → "Yes, delete it / Keep it", Done)
- [x] W23 · Rest timer "Ready" / "End the rest"
- [ ] W24 · Undo bar (skip/swap/later)
- [ ] W25 · "Up next · Taken?" → TakenSheet (sonraki hareket)
- [ ] W26 · "Add a move" → arama (Find a move, sonuç, "Create “name”", Close)
- [ ] W27 · "Next: <move>" (dock)
- [ ] W28 · Cardio adımı: "Next: cardio" → sayfa (Done N min / Later today / Skip today / Undo / Finish workout)
- [x] W29 · "Finish workout" (dock) → FinishForm
- [ ] W30 · FinishForm: Clean / Not clean (her hareket)
- [ ] W31 · FinishForm: Note TextField
- [x] W32 · FinishForm: "Finish" → `/workout-end`; "Keep going" → geri
- [x] W33 · End sheet: "Finish and save"
- [ ] W34 · End sheet: "Fill in the rest later" → kaydet + geri
- [ ] W35 · End sheet: "Discard this workout" → alert (Discard / Keep it)
- [ ] W36 · End sheet: "Back to the workout"
- [ ] W37 · Discarded paneli: "Undo" / "Close"
- [ ] W38 · Durumlar: stale (12+ saat), paused, offline, dayGone, loadFailed, finishFailed, saveFailed, unknownMove, taken-state, move skipped, OpenElsewhere

## X · Hareket / geçmiş / düzenleme / bitiş / paylaş
- [ ] X1 · `/exercise` Setup TextField'ları + "Save setup"
- [ ] X2 · `/exercise` geri / unknown durumu
- [ ] X3 · `/exercise-history` oturum satırı → "Edit this session" → `/workout-edit`
- [ ] X4 · `/exercise-history` "Done"
- [ ] X5 · `/workout-edit` set satırı (Delete → Yes/Keep), "Add a set", yan çipleri (L/R), hareket çipleri, steppers
- [x] X6 · `/workout-end` Retry (pending/failed)
- [ ] X7 · `/workout-end` MovedCard "and N more" (aç/kapat)
- [x] X8 · `/workout-end` HealthJit: Continue / Not now / "What we read" (aç/kapat)
- [x] X9 · `/workout-end` "Share your workout" → `/share?workout=`
- [x] X10 · `/workout-end` "Done" → `/train`
- [x] X11 · `/share` tür çipleri (Workout / PR / Weeks on track / Progress)
- [ ] X12 · `/share` arka plan çipleri (Gallery / Camera / Dark / In Instagram) → izin/fotoğraf seçici
- [ ] X13 · `/share` "Share to Story"
- [ ] X14 · `/share` "Share" → sistem paylaşım sayfası
- [ ] X15 · `/share` durum: nothing / failed / partial / denied / video uzun

## L · Log (+), Weigh-in, Cardio, State
- [ ] L1 · `/plus` Weigh-in karosu → `/weigh-in`
- [x] L2 · `/plus` Meal karosu → `/meal`
- [ ] L3 · `/plus` Workout karosu → `/workout` ya da `/train`
- [ ] L4 · `/plus` Cardio satırı → `/cardio`
- [ ] L5 · `/plus` "Life got in the way" → `/state`
- [ ] L6 · `/weigh-in` Stepper − + yazılabilir
- [ ] L7 · `/weigh-in` Save
- [ ] L8 · `/weigh-in` 4 weeks / Year segmenti (grafik)
- [ ] L9 · `/weigh-in` HealthJit kartı (Continue / Not now / What we read)
- [ ] L10 · `/weigh-in` rıza adımı (Continue / Not now)
- [ ] L11 · `/weigh-in` Close
- [ ] L12 · `/cardio` dakika stepper, "Log cardio", "Undo", "Done"
- [ ] L13 · `/state` 5 karo
- [ ] L14 · `/state` "Until I'm back / 3 days / 7 days" çipleri
- [ ] L15 · `/state` "Pause my week"
- [ ] L16 · `/state` rıza adımı (Continue / Not now)

## M · Log a meal / Today's food
- [x] M1 · Close (sağ üst)
- [x] M2 · Öğün çipleri Breakfast / Lunch / Dinner / Snack / Other
- [ ] M3 · "Same as yesterday" satırı (QuickAdds, `+`) → logla + kapan
- [x] M4 · Arama alanı yaz → sonuç satırı (aç) / `+` (hemen logla)
- [ ] M5 · Arama durumları: kısa / aranıyor / bulunamadı / bağlantı yok / sunucu hatası
- [ ] M6 · "Scan" → barkod sheet (kamera / "Or type the number" / Look up / Close / "Try the camera again")
- [ ] M7 · Barkod bulundu → porsiyon; bulunamadı → "Add it" / "Search instead"; kötü numara; hata
- [x] M8 · "Quick add" → kart (Calories, Protein, Carbs, Fat, Remove)
- [ ] M9 · "Create my own food" → form (Name, Serving size, Calories, Protein, Carbs, Fat, "Save and add", "Cancel")
- [ ] M10 · Sekmeler Recent / Frequent / Favorites / Log again
- [x] M11 · Recent/Frequent satırı aç + `+` logla
- [ ] M12 · Favorites satırı aç + `+`
- [ ] M13 · Log again satırı (tek dokunuşla tüm öğün)
- [ ] M14 · Boş sekmeler (4 metin)
- [x] M15 · Porsiyon kartı: yıldız (favori), Remove, birim çipleri, ½ 1 2 3, stepper, Details (aç/kapat), Weighed anahtarı
- [ ] M16 · Estimate kartı (2+ öğe): Details
- [ ] M17 · "Log it" (dock)
- [x] M18 · Düzeltme modu (`?edit=`): öğe kartları, slot çipleri, "Delete this meal" → alert (Delete/Keep), Save
- [ ] M19 · Rıza adımı (Continue / Not now)
- [ ] M20 · Durumlar: meal full (12), offline düzeltme, gone, not checked
- [x] F1 · `/food` geri
- [ ] F2 · `/food` gün oku ‹ ›
- [ ] F3 · `/food` gün şeridi hücreleri (son ay)
- [x] F4 · `/food` toplam kartı "Details" (aç/kapat)
- [ ] F5 · `/food` "Log a meal" / "Add food to this day"
- [x] F6 · `/food` öğün `⋯` menüsü (Alert: Log again today / Delete meal / Cancel)
- [x] F7 · `/food` öğe satırı → düzeltme (`/meal?edit=`)
- [x] F8 · `/food` öğe satırı sola kaydır → Delete (Undo bar)
- [ ] F9 · `/food` "Add to <slot>" metin linki
- [ ] F10 · `/food` boş öğün `⊕`
- [x] F11 · `/food` "Same as yesterday/the day before" teklifleri
- [x] F12 · `/food` "Copy a day's meals" → CopyDay listesi + "Done"
- [x] F13 · `/food` "Fits what's left today" önerisi "Log <food>"
- [ ] F14 · `/food` Your targets kartı
- [ ] F15 · `/food` geçmiş gün: "Log again today" (gün başlığında)
- [ ] F16 · `/food` durumlar: rıza yok ("Open Settings"), yükleme hatası ("Try again"), hedef yok, "Not sent yet"

## P · Progress
- [x] P1 · Hero (statik)
- [ ] P2 · Karo Calories → `/meal`
- [ ] P3 · Karo Protein → `/meal`
- [ ] P4 · Karo Steps → Apple Health / `/settings`
- [ ] P5 · Karo Cardio → `/cardio`
- [ ] P6 · Muscles kartı (dokunma?) + Sets per muscle çubukları
- [ ] P7 · Strength: lift çipleri (kaydırılır) + grafik noktası dokunma
- [x] P8 · Weight trend kartı (kilitli/açık) + grafik dokunma
- [x] P9 · Consistency ızgarası
- [x] P10 · Calls satırı → `/call?id=&from=progress`
- [ ] P11 · Photos: "Take photos" → `/photo-capture`
- [ ] P12 · Photos: "Compare" → `/compare`
- [ ] P13 · Photos: "Delete all photos" → alert (Keep them / Delete photos)
- [ ] P14 · "Share your progress" → `/share`
- [ ] P15 · Durumlar: ilk gün / kilitli (rıza yok) / hata ("Try again") / adım yok
- [ ] P16 · `/photo-capture` intro: kurulum segmenti, Start, Close
- [ ] P17 · `/photo-capture` kamera: zamanlayıcı seçenekleri, kamera çevir, deklanşör, "Choose from library", kapat
- [ ] P18 · `/photo-capture` önizleme: Retake / Use photo
- [ ] P19 · `/photo-capture` bitti: Compare / Done
- [ ] P20 · `/photo-capture` kamera yok: Open Settings / Choose from library / Close
- [ ] P21 · `/compare` anchor çipleri, Side by side / Slide, Front/Side çipleri, kaydırıcı, Close

## S · Settings
- [x] S1 · Appearance segmenti (Light / Dark / System)
- [x] S2 · Units segmenti (Metric / Imperial)
- [x] S3 · Training days → `/edit-program?part=days`
- [x] S4 · Cardio → `/edit-program?part=cardio`
- [x] S5 · Import workouts → `/import`
- [ ] S6 · Foods you avoid → detail `food`
- [ ] S7 · Goal / Check-in day / Height / Activity / Born (5 satır) → detail sayfaları
- [ ] S8 · Reminders anahtarı (aç/kapat + izin; "Open iOS Settings"; "Turn on all four")
- [ ] S9 · Your routine → detail `routine`
- [ ] S10 · Meal reminders anahtarı
- [ ] S11 · Remind me before it ends (trial hatırlatma)
- [ ] S12 · Health data consent → detail `consent`
- [ ] S13 · Apple Health → detail `apple`
- [ ] S14 · Add to Apple Health → detail `write` (2 anahtar)
- [ ] S15 · Import weigh-ins → detail `import`
- [ ] S16 · Subscription: durum satırı, "Cancel or change plan" (Apple), "Restore purchases", "See plans" → `/paywall`
- [ ] S17 · Food data → detail `sources` (3 dış link)
- [ ] S18 · Terms of Use / Privacy Policy (dış link)
- [ ] S19 · How it works → rehber
- [ ] S20 · Export my data → paylaşım sayfası
- [ ] S21 · Sign out → alert
- [ ] S22 · Delete account → alert
- [ ] S23 · Detail goal: 3 seçenek + Save
- [ ] S24 · Detail checkin: 7 gün çipi + Save
- [ ] S25 · Detail height: tekerlek + Save
- [ ] S26 · Detail activity: 4 seçenek + Save
- [ ] S27 · Detail born: tekerlek + Save
- [ ] S28 · Detail food: 10 çip + "Add your own" (alan + Add) + Save
- [ ] S29 · Detail routine: 4 çip + alan + Save
- [ ] S30 · Detail consent: View / Hide / Withdraw (inline onay: Export first / Withdraw / Keep it)
- [ ] S31 · Detail apple: View / Turn on / Withdraw
- [ ] S32 · Detail write: Finished workouts / Weigh-ins you type anahtarları
- [ ] S33 · Detail import: Import (rıza yoksa kilit + Continue)
- [ ] S34 · Durumlar: rıza yok (Food/Health kilitli satırlar), yükleme hatası ("Try again"), bildirim kapalı ("Open iOS Settings")
- [~] S35 · `/import`: Choose a file, birim çipleri, dumbbell çipleri, eşleştirme satırları (pick / Other / Leave out / My own move + arama), "Import N sessions", Done; hatalar

## Y · Paywall / Sign-in / Onboarding
- [ ] Y1 · Paywall plan seçimi Yearly / Monthly
- [ ] Y2 · "Start 2-week free trial" (satın alma yok)
- [ ] Y3 · Restore purchases / Terms of Use / Privacy Policy
- [ ] Y4 · "Account" → AccountSheet (Sign out, Done)
- [ ] Y5 · Settings'ten: Close
- [ ] Y6 · Paywall durumları: yükleniyor, "Try again", "Check again", "Waiting for the App Store…"
- [ ] Y7 · `/sign-in` Sign in with Apple, Terms/Privacy
- [ ] Y8 · `/checking` Try again / Sign out
- [ ] Y9 · Onboarding goal 3 seçenek + Sign out
- [ ] Y10 · Experience 4 seçenek
- [ ] Y11 · Program 2 seçenek → Bring my own: Import / Type it in
- [ ] Y12 · program-import: Choose file, satır Change / Leave out, "Use this program"
- [ ] Y13 · program-type: editör + "Use this program"
- [ ] Y14 · review: öneri anahtarları, "Coaching rule" aç/kapat, Use mine / Keep mine
- [ ] Y15 · Days: 4 karo
- [ ] Y16 · Health data: Continue / Not now / Read the full text / Withdraw / Continue without
- [ ] Y17 · About: Metric/Imperial, 3 tekerlek, Male/Female, Continue
- [ ] Y18 · Activity 4 seçenek
- [ ] Y19 · Weights: 3 satır aç/kapat, tekerlek, Clear, Skip, Continue
- [ ] Y20 · Preparing: See my plan / Bring it in again / Try again / Sign out
- [ ] Y21 · Plan: "Tell me Monday morning" anahtarı (+ izin), Continue
- [ ] Y22 · Onboarding apple-health: Connect / Not now / Start
- [ ] Y23 · Geri oku (‹), ilerleme çubuğu
- [x] Y24 · `/return` (8+ gün): Ease back in / Pick up where I left off / Rebuild my plan seçenekleri, Continue, Not now, Try again
