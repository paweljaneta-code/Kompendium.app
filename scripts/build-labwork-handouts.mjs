// Generator handoutów do druku dla modułu „Badania laboratoryjne" (tab-labwork).
//
// Tworzy zwięzłe arkusze-notatki z DOKŁADNĄ listą badań do zlecenia dla każdego
// narzędzia omawiającego badania pod określoną trudność kliniczną (lęk, depresja,
// zmęczenie, bezsenność, psychoza, mania, zaburzenia odżywiania, zaburzenia
// poznawcze, ADHD). Treść (panele badań, progi, źródła) przepisana 1:1 z kart
// modułu w kompendium.html (sekcja „Instrukcja"), z poprawą oczywistych literówek.
//
// Każdy plik trafia do public/handouts/print/labwork/<id>.html, gdzie <id> == id
// karty wywoływanej przez openHandout('<id>'). Po wygenerowaniu uruchom
// `npm run build-print-handout-index`, aby resolver wskazał nowe pliki.
//
// Styl: „lineart v2" (spójny z pozostałymi handoutami), akcent = kolor modułu.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public/handouts/print/labwork");

const ACCENT = "#5a7a3a"; // kolor modułu labwork
const ACCENT_SOFT = "#eef2e4";

/** Panel: lista grup; element grupy to badanie {t, why} albo notatka {note}. */
const HANDOUTS = [
  {
    id: "lab-lek",
    title: "Lęk — badania wykluczające",
    h1: `Lęk — badania <em>wykluczające</em>`,
    diff: 2,
    sub: `Panel wykluczający somatyczne przyczyny lęku. Nadczynność tarczycy u 10–15% pacjentów z lękiem.`,
    kiedy: `Objawy lękowe, napady paniki, GAD, OCD z somatyzacją. Szczególnie: **każdy pierwszy epizod** GAD/lęku napadowego, lęk **oporny na SSRI**, dominujące objawy somatyczne, pacjentki w okresie peri-menopauzalnym.`,
    dlaczego: `Lęk bywa objawem nadczynności tarczycy (10–15% — Simon 2002), niedoboru magnezu (Boyle 2017), hipoglikemii, niedokrwistości, guza chromochłonnego, nadmiaru kofeiny lub arytmii. SSRI nie naprawia źródła somatycznego — lęk lekooporny często jest somatyczny.`,
    panels: [
      {
        group: "Badania podstawowe",
        items: [
          { t: "TSH (hormon tyreotropowy)", why: `Nadczynność tarczycy (TSH niski + fT3/fT4 wysokie = lęk, drżenie, tachykardia, spadek wagi)` },
          { t: "Morfologia krwi (CBC)", why: `Niedokrwistość (Hb niskie = lęk, tachykardia, duszność — objawy jak panika)` },
          { t: "Ferrytyna", why: `Niedobór żelaza — nawet bez anemii (ferrytyna **<30** = zmęczenie, lęk, zaburzenia snu)` },
          { t: "Magnez (Mg)", why: `Niedobór = lęk, drżenie, skurcze mięśni, bezsenność` },
          { t: "Glukoza na czczo", why: `Hipoglikemia = kołatanie, pocenie, lęk (mylone z paniką)` }
        ]
      },
      {
        group: "Badania rozszerzone (jeśli wskazane)",
        items: [
          { t: "Katecholaminy w moczu", why: `Guz chromochłonny (pheochromocytoma) — epizodyczne napady lęku + nadciśnienie` },
          { t: "EKG", why: `Arytmie (kołatanie serca)` },
          { t: "Kortyzol", why: `Zespół Cushinga (lęk + otyłość centralna + rozstępy)` }
        ]
      }
    ],
    tip: `Kołatanie serca + pocenie + drżenie = może być **PANIKA**. Ale może też być **TARCZYCA**. Jedno badanie krwi rozstrzygnie.`,
    sources: `Simon i in. (2002) · Boyle i in. (2017) · NICE CG113 (2019) · Sadock i in. (2015)`
  },

  {
    id: "lab-depresja",
    title: "Depresja — badania wykluczające",
    h1: `Depresja — badania <em>wykluczające</em>`,
    diff: 2,
    sub: `Panel wykluczający. 10–15% depresji ma przyczynę somatyczną.`,
    kiedy: `Objawy depresyjne, zmęczenie, anhedonia, **brak odpowiedzi na SSRI**. Szczególnie: każdy pierwszy epizod MDD, depresja lekooporna, depresja wieku podeszłego, pacjenci wegańscy/wegetarianie (B12).`,
    dlaczego: `Depresja bywa objawem niedoczynności tarczycy (~10% — Hage & Azar 2012), niedoboru witaminy D (Anglin 2013: 2× ryzyko), B12, żelaza, niskiego testosteronu u mężczyzn, choroby Addisona, cukrzycy. Suplementacja często działa zanim sięgniemy po lek.`,
    panels: [
      {
        group: "Badania podstawowe",
        items: [
          { t: "TSH + fT4", why: `Niedoczynność tarczycy (TSH wysoki + fT4 niskie = spowolnienie, przyrost wagi, depresja)` },
          { t: "Morfologia (CBC)", why: `Niedokrwistość = zmęczenie, apatia` },
          { t: "Ferrytyna", why: `Niedobór żelaza (ferrytyna **<30**, nawet bez anemii)` },
          { t: "Witamina D (25-OH-D)", why: `**<20 ng/ml** = niedobór (2× ryzyko depresji). W Polsce ~90% populacji ma niedobór zimą` },
          { t: "Witamina B12", why: `**<200 pg/ml** = objawy neuropsychiatryczne (zmęczenie, depresja, pamięć)` },
          { t: "Kwas foliowy", why: `Niedobór = gorsza odpowiedź na SSRI` },
          { t: "Glukoza na czczo + HbA1c", why: `Cukrzyca = 2× ryzyko depresji` }
        ]
      },
      {
        group: "Badania rozszerzone",
        items: [
          { t: "Testosteron całkowity (mężczyźni >40 r.ż.)", why: `Niski T = zmęczenie, anhedonia, spadek libido` },
          { t: "Wątroba (ALT, AST)", why: `Choroby wątroby = zmęczenie` },
          { t: "Nerki (kreatynina, eGFR)", why: `Niewydolność nerek = zmęczenie, zaburzenia poznawcze` },
          { t: "CRP", why: `Stan zapalny (podwyższone u ~30% depresji)` }
        ]
      }
    ],
    tip: `Pacjent „z depresją" z **TSH = 8** nie potrzebuje SSRI — potrzebuje **LEWOTYROKSYNY**. Jedno badanie może zmienić cały plan leczenia.`,
    sources: `Hage & Azar (2012) · Anglin i in. (2013) · Syed i in. (2013) · Fava & Mischoulon (2009) · Mezuk i in. (2008)`
  },

  {
    id: "lab-zmeczenie",
    title: "Zmęczenie przewlekłe — diagnostyka różnicowa",
    h1: `Zmęczenie przewlekłe — <em>diagnostyka różnicowa</em>`,
    diff: 2,
    sub: `Szeroka diagnostyka różnicowa. W ~50% przypadków współistnieje przyczyna somatyczna.`,
    kiedy: `Zmęczenie **>4 tyg.**, brak poprawy po zmianie stylu życia, wypalenie bez odpowiedzi na interwencję. Różnicowanie CFS vs depresja; integracja z medycyną wewnętrzną.`,
    dlaczego: `Zmęczenie to objaw, nie diagnoza — występuje w 50+ chorobach: niedoczynność tarczycy, anemia, niedobór żelaza/B12/D, cukrzyca, choroby wątroby i nerek, autoimmunologiczne, infekcje (post-COVID), bezdech senny. Systematyczne wykluczanie zapobiega błędnej diagnozie „wypalenia".`,
    panels: [
      {
        group: "Panel badań (zmęczenie >4 tyg.)",
        items: [
          { t: "Morfologia (CBC)", why: `Anemia, infekcja (leukocyty), nowotwory krwi` },
          { t: "Ferrytyna", why: `Niedobór żelaza (**<30 ng/ml** = zmęczenie nawet bez anemii)` },
          { t: "TSH + fT4", why: `Tarczyca (najczęstsza przyczyna endokrynna)` },
          { t: "Glukoza + HbA1c", why: `Cukrzyca / insulinooporność` },
          { t: "Witamina D (25-OH-D)", why: `Niedobór = zmęczenie mięśniowe, apatia` },
          { t: "Witamina B12", why: `Niedobór = zmęczenie neurologiczne` },
          { t: "ALT, AST", why: `Wątroba` },
          { t: "Kreatynina, eGFR", why: `Nerki` },
          { t: "CRP", why: `Stan zapalny, infekcja ukryta` },
          { t: "OB (odczyn Biernackiego)", why: `Nieswoisty marker stanu zapalnego` },
          { t: "Elektrolity (Na, K, Ca, Mg)", why: `Zaburzenia równowagi = osłabienie` }
        ]
      },
      {
        group: "Rozszerzone (jeśli wskazane)",
        items: [
          { t: "Kortyzol poranny", why: `Choroba Addisona (niski) lub Cushinga (wysoki)` },
          { t: "ANA (przeciwciała przeciwjądrowe)", why: `Choroby autoimmunologiczne` },
          { t: "Anty-TPO", why: `Hashimoto (autoimmunologiczne zapalenie tarczycy)` }
        ]
      }
    ],
    tip: `Zmęczenie to **nie diagnoza** — to **objaw**. Zanim nazwiesz je „wypaleniem" lub „depresją" — wyklucz ciało.`,
    sources: `NICE CG53 (2007) · Sharpe & Wilks (2002) · Sadock i in. (2015)`
  },

  {
    id: "lab-bezsennosc",
    title: "Bezsenność — przyczyny somatyczne do wykluczenia",
    h1: `Bezsenność — przyczyny <em>somatyczne</em>`,
    diff: 1,
    sub: `Somatyczne wykluczenia: bezdech senny, RLS, nadczynność tarczycy, kortyzol wieczorny.`,
    kiedy: `Bezsenność przewlekła, **nieodpowiadająca na CBT-I**, podejrzenie RLS. Szczególnie: pierwsza wizyta z bezsennością, pacjenci chrapiący (OBS), kobiety w ciąży/po porodzie (RLS).`,
    dlaczego: `Bezsenność bywa wtórna do nadczynności tarczycy, niedoboru magnezu, niedoboru żelaza (RLS — ferrytyna <50), hiperkortyzolizmu lub bezdechu sennego (OBS). Leki nasenne bez wykluczenia OBS pozostawiają pacjenta bez CPAP i z ryzykiem sercowo-naczyniowym.`,
    panels: [
      {
        group: "Badania",
        items: [
          { t: "TSH", why: `Nadczynność tarczycy (TSH niski = bezsenność + pobudzenie nocne)` },
          { t: "Ferrytyna", why: `RLS / niespokojne nogi (**<50 ng/ml** = suplementacja żelaza). Pytaj: „Czy masz niespokojne nogi wieczorem?"` },
          { t: "Magnez (Mg)", why: `Niedobór = trudność z zasypianiem, skurcze, niepokój` },
          { t: "Morfologia", why: `Anemia = zmęczenie dzienne, zaburzona architektura snu` },
          { t: "Glukoza", why: `Hipoglikemia nocna = przebudzenia z poceniem` }
        ]
      },
      {
        group: "Rozszerzone",
        items: [
          { t: "Kortyzol (poranny + wieczorny)", why: `Zaburzona krzywa dobowa (wysoki wieczorem = bezsenność)` },
          { t: "Polisomnografia (skierowanie, nie badanie krwi)", why: `Bezdech senny. Pytaj: „Czy chrapiesz? Budzisz się z dusznością? Partner zauważył przerwy w oddychaniu?"` },
          { t: "Progesteron (kobiety)", why: `Niski = bezsenność w II fazie cyklu` }
        ]
      }
    ],
    tip: `Pacjent z RLS i ferrytyną 20 ng/ml nie potrzebuje CBT-I — potrzebuje **ŻELAZA**. Bez badania nie wiesz.`,
    sources: `Allen i in. (2013) · Abbasi i in. (2012) · NICE NG215 (2021) · Sateia i in. (2017, AASM)`
  },

  {
    id: "lab-psychoza",
    title: "Psychoza — badania wykluczające (1. epizod)",
    h1: `Psychoza — badania <em>wykluczające</em> (1. epizod)`,
    diff: 3,
    sub: `Pierwszy epizod psychozy (FEP): pełna, obligatoryjna diagnostyka — Freudenreich i in. (2007).`,
    kiedy: `**Każdy pierwszy epizod psychozy**, psychoza atypowa, brak odpowiedzi na leki. Szczególnie pacjenci młodzi (<35 r.ż.) i z towarzyszącymi objawami neurologicznymi.`,
    dlaczego: `Pierwszy epizod wymaga szerokiego panelu. Przyczyny organiczne: autoimmunologiczne zapalenie mózgu (**anty-NMDAR** — często mylone ze schizofrenią, ale leczone immunoterapią!), neurosyfilis, HIV, choroby tarczycy, niedobór B12, porfiria, SLE, guz mózgu, substancje. Pominięcie anty-NMDAR = utrata szansy na wyleczenie.`,
    panels: [
      {
        group: "Panel obowiązkowy (1. epizod)",
        items: [
          { t: "Morfologia (CBC)", why: `Infekcje, nowotwory krwi` },
          { t: "TSH + fT4", why: `Tarczyca (nadczynność = psychoza pobudzeniowa, niedoczynność = psychoza ze spowolnieniem)` },
          { t: "Glukoza", why: `Cukrzyca / hipoglikemia` },
          { t: "Wątroba (ALT, AST) + nerki (kreatynina)", why: `Encefalopatia wątrobowa / mocznicowa` },
          { t: "Elektrolity (Na, K, Ca)", why: `Hiponatremia = zaburzenia świadomości` },
          { t: "Witamina B12", why: `Niedobór = psychoza megaloblastyczna` },
          { t: "CRP / OB", why: `Stan zapalny, infekcja` },
          { t: "Toksykologia moczu (narkotyki)", why: `Substancje psychoaktywne (amfetamina, MDMA, NPS)` },
          { t: "Kiła — VDRL / RPR", why: `Neurosyfilis` },
          { t: "HIV", why: `Neuro-HIV` }
        ]
      },
      {
        group: "Rozszerzone (jeśli podejrzenie)",
        items: [
          { t: "Anty-NMDAR (surowica i PMR)", why: `Autoimmunologiczne zapalenie mózgu. Podejrzewaj: młoda kobieta + psychoza + drgawki + zaburzenia ruchu` },
          { t: "ANA, anty-dsDNA", why: `SLE z zajęciem OUN` },
          { t: "MRI mózgu", why: `Guz, stwardnienie rozsiane, zmiany naczyniowe` },
          { t: "EEG", why: `Padaczka skroniowa (psychoza iktalna)` }
        ]
      }
    ],
    tip: `Zapalenie mózgu anty-NMDAR **wygląda** jak schizofrenia. Różnica: jedno się **LECZY** (immunoterapia), drugie **kontroluje**. Jedno badanie może uratować życie.`,
    sources: `Freudenreich i in. (2007) · Dalmau i in. (2008) · NICE CG178 (2014) · Sadock i in. (2015)`
  },

  {
    id: "lab-mania",
    title: "Mania — badania wykluczające",
    h1: `Mania — badania <em>wykluczające</em>`,
    diff: 2,
    sub: `Wykluczenie organiczne + badania obowiązkowe przed wdrożeniem litu.`,
    kiedy: `Pierwszy epizod manii, mania nietypowa, **przed wdrożeniem litu**, pacjenci na sterydach; różnicowanie CHAD I vs mania wtórna.`,
    dlaczego: `Manię może wywołać nadczynność tarczycy (częsta imitacja), substancje (amfetamina, kokaina, steroidy), wysoki kortyzol (Cushing / sterydy egzogenne — prednizon → mania w 5–10%), SM, guz mózgu. Przed litem badania nerek, tarczycy i wapnia są **obowiązkowe** (NICE CG185).`,
    panels: [
      {
        group: "Badania podstawowe",
        items: [
          { t: "TSH + fT4", why: `Nadczynność = imituje manię (pobudzenie, gadatliwość, bezsenność, spadek wagi)` },
          { t: "Toksykologia moczu (narkotyki)", why: `Amfetamina, kokaina, syntetyczne kannabinoidy` },
          { t: "Morfologia, wątroba, nerki", why: `Stan ogólny + baseline przed leczeniem` },
          { t: "Elektrolity (Na, K, Ca)", why: `Hiperkalcemia = pobudzenie, dezorientacja` }
        ]
      },
      {
        group: "Przed litem (obowiązkowo)",
        items: [
          { t: "Kreatynina + eGFR", why: `Lit jest nefrotoksyczny` },
          { t: "TSH", why: `Lit powoduje niedoczynność u 20–30%` },
          { t: "Wapń (Ca)", why: `Lit może powodować nadczynność przytarczyc` },
          { t: "EKG", why: `Lit wpływa na serce (baseline)` }
        ]
      },
      {
        group: "Monitoring litu",
        items: [
          { t: "Litemia (poziom litu we krwi)", why: `Co 3–6 mies. — **0,6–0,8 mmol/l** = terapeutyczny; **>1,5** = toksyczny` }
        ]
      }
    ],
    tip: `Lit jest skuteczny, ale wymaga **monitorowania**. Terapeuta powinien znać te wymagania, by koordynować z psychiatrą.`,
    sources: `NICE CG185 (2014) · Bocchetta & Loviselli (2006) · Yatham i in. (CANMAT/ISBD 2018) · Sadock i in. (2015)`
  },

  {
    id: "lab-eating",
    title: "Zaburzenia odżywiania — badania monitorujące",
    h1: `Zaburzenia odżywiania — <em>monitoring</em>`,
    diff: 2,
    sub: `Monitoring laboratoryjny powikłań zagrażających życiu. AN ma najwyższą śmiertelność ze wszystkich zaburzeń psychicznych.`,
    kiedy: `Każdy pacjent z AN/BN/BED, przed i w trakcie leczenia. Szczególnie: hospitalizacja AN, rozpoczęcie refeedingu, ciężka BN z przeczyszczaniem.`,
    dlaczego: `Zaburzenia odżywiania powodują zagrażające życiu powikłania. Najgroźniejsza: **HIPOKALIEMIA** (niskie K+ = arytmia = nagła śmierć sercowa). Refeeding syndrome (spadek fosforu) to najczęstsza przyczyna śmierci w AN. Regularne badania są obowiązkowe (NICE NG69).`,
    panels: [
      {
        group: "Panel obowiązkowy",
        items: [
          { t: "Potas (K+)", why: `**NAJWAŻNIEJSZE.** <3,5 mmol/l = ryzyko arytmii. Wymioty = utrata K+` },
          { t: "Sód (Na+)", why: `Polidypsja lub ograniczanie płynów` },
          { t: "Wapń (Ca²⁺) + fosfor", why: `Osteoporoza (AN); fosfor kluczowy w refeedingu` },
          { t: "Magnez (Mg²⁺)", why: `Niski = arytmie, skurcze` },
          { t: "Morfologia", why: `Anemia, leukopenia (AN z niedożywieniem)` },
          { t: "Glukoza", why: `Hipoglikemia (niskie zapasy glikogenu)` },
          { t: "Albumina + białko całkowite", why: `Stan odżywienia` },
          { t: "Wątroba (ALT, AST)", why: `Podwyższone w AN (stłuszczenie z głodu) i w BN` },
          { t: "Amylaza", why: `Podwyższona w BN (wymioty = zapalenie ślinianek)` },
          { t: "EKG", why: `Wydłużenie **QTc** = ryzyko nagłej śmierci` },
          { t: "DEXA (densytometria)", why: `Osteoporoza u AN >6 mies.` }
        ]
      },
      {
        group: "Monitoring — refeeding syndrome",
        items: [
          { note: `Przy rozpoczynaniu żywienia po długim głodzie **fosfor, K+ i Mg²⁺ mogą gwałtownie spaść** — zagrożenie życia. Monitoruj je codziennie w fazie refeedingu.` }
        ]
      }
    ],
    tip: `AN zabija **częściej niż jakiekolwiek inne** zaburzenie psychiczne. Badania krwi mogą uratować życie — nie są opcjonalne.`,
    sources: `NICE NG69 (2017) · Mehler & Walsh (2016) · APA Practice Guidelines for Eating Disorders (2023)`
  },

  {
    id: "lab-poznawcze",
    title: "Zaburzenia poznawcze — wykluczenie odwracalnych przyczyn",
    h1: `Zaburzenia poznawcze — przyczyny <em>odwracalne</em>`,
    diff: 2,
    sub: `Otępienie / MCI: wyklucz ODWRACALNE przyczyny przed rozpoznaniem. ~5–15% otępień jest odwracalnych.`,
    kiedy: `Pogorszenie pamięci, „mgła mózgowa", podejrzenie demencji, wiek >50. Każda nowa diagnoza otępienia, MCI z progresją, depresja wieku podeszłego z deficytami poznawczymi.`,
    dlaczego: `Zaburzenia poznawcze bywają odwracalne: niedobór B12 (10–15% osób >60), niedoczynność tarczycy, neurosyfilis, niedobór folianów, niewydolność wątroby/nerek, hiponatremia, hiperkalcemia, depresja pseudodemencyjna. Badania krwi są **obowiązkowe PRZED** rozpoznaniem otępienia (NICE NG97).`,
    panels: [
      {
        group: "Panel obowiązkowy (pogorszenie poznawcze)",
        items: [
          { t: "Witamina B12", why: `**KLUCZOWE.** <200 pg/ml = objawy neuropsychiatryczne. Nieleczony niedobór = nieodwracalne uszkodzenie neurologiczne` },
          { t: "Kwas foliowy", why: `Niedobór = zaburzenia poznawcze, depresja` },
          { t: "TSH + fT4", why: `Niedoczynność = spowolnienie, „mgła"` },
          { t: "Morfologia", why: `Anemia megaloblastyczna (B12 / foliany)` },
          { t: "Glukoza + HbA1c", why: `Cukrzyca (neuropatia, zaburzenia poznawcze)` },
          { t: "Wątroba (ALT, AST)", why: `Encefalopatia wątrobowa` },
          { t: "Nerki (kreatynina, eGFR)", why: `Encefalopatia mocznicowa` },
          { t: "Wapń (Ca)", why: `Hiperkalcemia = splątanie` },
          { t: "Elektrolity (Na)", why: `Hiponatremia = dezorientacja` },
          { t: "Kiła — VDRL / RPR", why: `Neurosyfilis` }
        ]
      },
      {
        group: "Rozszerzone",
        items: [
          { t: "HIV", why: `Otępienie w przebiegu HIV` },
          { t: "Borelia", why: `Neuroborelioza` },
          { t: "MRI mózgu", why: `NPH (wodogłowie normotensyjne), zmiany naczyniowe, guz` },
          { t: "EEG", why: `Diagnostyka napadowa (jeśli wskazane)` }
        ]
      }
    ],
    tip: `Zanim powiesz „demencja" — wyklucz wszystko, co **da się leczyć**. B12 kosztuje kilka złotych. Demencja — bezcenna.`,
    sources: `NICE NG97 (2018) · Stabler (2013) · Sadock i in. (2015)`
  },

  {
    id: "lab-adhd",
    title: "ADHD u dorosłych — wykluczenie somatyczne",
    h1: `ADHD u dorosłych — <em>wykluczenie somatyczne</em>`,
    diff: 1,
    sub: `Wyklucz przyczyny somatyczne (zwłaszcza bezdech senny) PRZED rozpoznaniem ADHD.`,
    kiedy: `Diagnostyka ADHD u dorosłych, **przed leczeniem farmakologicznym**, objawy nietypowe. Szczególnie: >25 r.ż., chrapanie/senność dzienna, pacjenci wegańscy/wegetarianie, współwystępujące lęk/depresja.`,
    dlaczego: `Objawy „ADHD-podobne" (rozproszenie, impulsywność, zapominanie) mogą wynikać z chorób tarczycy, niedoboru żelaza (ferrytyna <30 — Konofal 2008), bezdechu sennego (OBS — fragmentacja snu), używania substancji lub depresji. Stymulanty **zaostrzają** nierozpoznany OBS — diagnozę ADHD stawiaj PO wykluczeniu.`,
    panels: [
      {
        group: "Badania podstawowe",
        items: [
          { t: "TSH", why: `Tarczyca (nad- i niedoczynność mogą imitować ADHD)` },
          { t: "Ferrytyna", why: `Niedobór żelaza koreluje z nasileniem objawów ADHD` },
          { t: "Morfologia", why: `Anemia = zmęczenie, rozproszenie` },
          { t: "Witamina D", why: `Niedobór = zmęczenie poznawcze` }
        ]
      },
      {
        group: "Przed stymulantami (metylfenidat)",
        items: [
          { t: "RR (ciśnienie tętnicze) + tętno", why: `Baseline (stymulanty podwyższają)` },
          { t: "EKG", why: `Jeśli rodzinna historia chorób serca` },
          { t: "Waga + wzrost", why: `Monitoring (stymulanty zmniejszają apetyt)` }
        ]
      },
      {
        group: "Dodatkowo",
        items: [
          { t: "Badanie snu (wywiad / aktygrafia)", why: `Bezdech senny = „ADHD za dnia". Skrining STOP-BANG; polisomnografia jeśli ≥3` },
          { t: "Toksykologia (substancje)", why: `Kannabinoidy, amfetamina` }
        ]
      }
    ],
    tip: `Ferrytyna 15 ng/ml + objawy ADHD = **najpierw żelazo**, potem diagnostyka. Tanio, bezpiecznie, skutecznie.`,
    sources: `NICE NG87 (2018) · Konofal i in. (2008) · Elshorbagy i in. (2018) · CADDRA`
  }
];

const DIFF_LABEL = { 1: "Podstawowy", 2: "Średni", 3: "Zaawansowany" };

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// mini-markup: **pogrubienie** + escape reszty
function mark(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function diffDots(n) {
  let dots = "";
  for (let i = 1; i <= 3; i++) dots += `<span class="dd${i <= n ? " on" : ""}"></span>`;
  return `<span class="diff-dots">${dots}</span>`;
}

function renderRows(panels) {
  let rows = "";
  for (const p of panels) {
    rows += `<tr class="grp"><td colspan="4">${esc(p.group)}</td></tr>\n`;
    for (const it of p.items) {
      if (it.note) {
        rows += `<tr class="note"><td class="c-chk"></td><td colspan="3">${mark(it.note)}</td></tr>\n`;
      } else {
        rows += `<tr><td class="c-chk"><span class="chk"></span></td><td class="c-test">${mark(it.t)}</td><td class="c-why">${mark(it.why)}</td><td class="c-res"></td></tr>\n`;
      }
    }
  }
  return rows;
}

function page(h) {
  return `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(h.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,400;9..144,0,500;9..144,0,600;9..144,1,400;9..144,1,500&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#1c2620;--soft:#4a554d;--mute:#8a9089;--line:#c9c2b0;--line2:#e3ddc8;
  --accent:${ACCENT};--accent-soft:${ACCENT_SOFT};--warm:#b8693f;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff}
body{font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:var(--ink);font-size:10pt;line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:13mm 13mm 12mm;background:#fff;position:relative;display:flex;flex-direction:column}

/* nagłówek */
.eyebrow{font-size:8pt;letter-spacing:0.22em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:5px;display:flex;align-items:center;gap:10px}
h1.hdr-title{font-family:'Fraunces',serif;font-size:21.5pt;font-weight:500;letter-spacing:-0.025em;line-height:1.05;color:var(--ink);margin-bottom:3px}
h1.hdr-title em{font-style:italic;color:var(--accent);font-weight:500}
.hdr-sub{font-family:'Fraunces',serif;font-style:italic;font-size:10pt;color:var(--soft);margin-bottom:6px;line-height:1.28}
.hdr-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:8pt;color:var(--mute);letter-spacing:0.06em;padding:5px 0;border-top:1.2px solid var(--ink);border-bottom:0.5px solid var(--line);margin-bottom:8px}
.hdr-meta strong{color:var(--ink);font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-right:3px}

/* wskaźnik trudności */
.diff-dots{display:inline-flex;gap:3px;align-items:center}
.diff-dots .dd{width:6px;height:6px;border-radius:50%;border:1px solid var(--accent)}
.diff-dots .dd.on{background:var(--accent)}

/* boksy wprowadzenia */
.intro-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 8px}
.intro-box{border:0.8px solid var(--line);padding:7px 11px;font-size:8.7pt;color:var(--soft);line-height:1.42;text-align:justify;hyphens:auto;-webkit-hyphens:auto}
.intro-box .lbl{font-size:7pt;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);font-weight:600;margin-bottom:3px;display:block}
.intro-box strong{color:var(--ink);font-weight:600}

/* wiersz danych pacjenta */
.pt-row{display:flex;gap:16px;font-size:8.5pt;color:var(--mute);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:7px}
.pt-row .f{flex:1;display:flex;align-items:flex-end;gap:6px}
.pt-row .ln{flex:1;border-bottom:0.6px solid var(--line);height:6mm}

/* sekcja listy badań */
.sec-h{font-family:'Fraunces',serif;font-size:12pt;font-weight:600;letter-spacing:-0.015em;color:var(--ink);margin-bottom:5px;display:flex;align-items:center;gap:9px}
.sec-h .num{font-size:8.5pt;font-weight:600;color:var(--ink);letter-spacing:0.06em;border:1px solid var(--ink);padding:1px 6px;border-radius:2px;min-width:22px;text-align:center}

/* tabela badań */
table.lab{width:100%;border-collapse:collapse;font-size:8.9pt}
table.lab thead th{font-size:7.5pt;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink);font-weight:600;text-align:left;padding:5px 7px;border-bottom:1.4px solid var(--ink)}
table.lab .c-chk{width:9mm;text-align:center}
table.lab .c-test{width:47mm}
table.lab .c-res{width:33mm}
table.lab tbody td{padding:3px 7px;border-bottom:0.6px solid var(--line);vertical-align:top;height:6.8mm}
table.lab .c-test{font-weight:600;color:var(--ink);line-height:1.28}
table.lab .c-why{color:var(--soft);line-height:1.3}
table.lab .c-why strong{color:var(--ink);font-weight:600}
table.lab .c-test strong{color:var(--accent)}
.chk{display:inline-block;width:3.6mm;height:3.6mm;border:1.1px solid var(--ink);border-radius:0.6mm;vertical-align:middle;margin-top:1px}
table.lab tr.grp td{background:var(--accent-soft);font-size:7.5pt;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:var(--accent);padding:4px 7px;border-bottom:0.6px solid var(--line)}
table.lab tr.note td{color:var(--soft);font-style:italic;line-height:1.38;background:#fff}
table.lab tr.note strong{color:var(--ink);font-style:normal;font-weight:600}
table.lab tr{break-inside:avoid;page-break-inside:avoid}

/* wskazówka */
.callout{border:0.6px solid var(--line);border-left:2.5px solid var(--accent);padding:8px 11px;margin:8px 0 0;font-size:9.3pt;color:var(--soft);border-radius:0 3px 3px 0;text-align:justify;line-height:1.42}
.callout .lbl{font-size:7pt;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:3px;display:block}
.callout strong{color:var(--ink);font-weight:600}

/* stopka */
.foot{margin-top:auto;padding-top:7px;border-top:0.5px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;font-size:7.5pt;color:var(--mute);letter-spacing:0.06em;gap:12px}
.foot .src{flex:1;text-transform:none;letter-spacing:0.02em;line-height:1.35}
.foot .src strong{color:var(--soft);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-right:4px}
.foot .brand{text-transform:uppercase;font-weight:600;color:var(--soft);white-space:nowrap}

@media print{
  body{background:#fff}
  .page{width:auto;min-height:0;padding:0;margin:0}
  @page{size:A4;margin:14mm 13mm}
  table.lab thead{display:table-header-group}
}
@media screen{
  body{padding:24px 16px;background:#e8e3d4}
  .page{box-shadow:0 4px 24px rgba(0,0,0,0.10)}
}
</style>
</head>
<body>
<div class="page">
<header>
<div class="eyebrow">Badania laboratoryjne w psychiatrii ${diffDots(h.diff)} <span style="letter-spacing:.08em">${esc(DIFF_LABEL[h.diff])}</span></div>
<h1 class="hdr-title">${h.h1}</h1>
<div class="hdr-sub">${mark(h.sub)}</div>
<div class="hdr-meta"><span><strong>Materiał:</strong> lista badań do zlecenia</span><span><strong>Trudność:</strong> ${esc(DIFF_LABEL[h.diff])}</span><span><strong>Druk:</strong> A4</span></div>
</header>

<div class="intro-row">
<div class="intro-box"><span class="lbl">Kiedy zlecić</span>${mark(h.kiedy)}</div>
<div class="intro-box"><span class="lbl">Dlaczego to ważne</span>${mark(h.dlaczego)}</div>
</div>

<div class="pt-row"><span class="f">Pacjent / inicjały <span class="ln"></span></span><span class="f">Data <span class="ln"></span></span><span class="f">Lekarz kierujący <span class="ln"></span></span></div>

<h2 class="sec-h"><span class="num">✓</span> Dokładna lista badań do wykonania</h2>
<table class="lab">
<thead><tr><th class="c-chk">✓</th><th class="c-test">Badanie</th><th class="c-why">Co wyklucza / na co wskazuje</th><th class="c-res">Wynik · data</th></tr></thead>
<tbody>
${renderRows(h.panels)}</tbody>
</table>

<div class="callout"><span class="lbl">Wskazówka kliniczna</span>${mark(h.tip)}</div>

<div class="foot"><span class="src"><strong>Źródła</strong>${esc(h.sources)}</span><span class="brand">Kompendium · Badania laboratoryjne</span></div>
</div>
</body></html>
`;
}

fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (const h of HANDOUTS) {
  const file = path.join(outDir, `${h.id}.html`);
  fs.writeFileSync(file, page(h), "utf8");
  n++;
  console.log("  +", path.relative(root, file));
}
console.log(`\nWygenerowano ${n} handoutów do druku → public/handouts/print/labwork/`);
