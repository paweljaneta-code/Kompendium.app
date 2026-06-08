// Pilot rekonstrukcji HTML z PDF — 3× bdd-dys + 2× gad.
// Reużywa shell (head+CSS+ikony) z modułu gad; body odtworzone z ekstrakcji PDF.
// Wynik do scripts/pilot-output/ (NIE nadpisuje oryginałów w public/).
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "scripts/pilot-output");
const shell = fs.readFileSync(path.join(outDir, "_shell-gad.html"), "utf8");

// BDD: brak koloru marki w danych — używamy domyślnego sage (#3d6b30) z shella; DO POTWIERDZENIA.
function assemble({ file, title, body }) {
  let head = shell.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  return head + body + "\n</body></html>\n";
}

const foot = (mod, n, total) =>
  `<div class="foot"><span><strong>Kompendium Narzędzi Terapeutycznych · ${mod} · lineart v2</strong></span><span class="pg-num">str. ${n} / ${total}</span></div>`;

const scale = (lblTop, lblBot, lo, hi) => `<div class="mood-scale">
<div class="ms-lbl">${lblTop}<br><span style="font-weight:400">${lblBot}</span></div>
<span class="ms-end">${lo}</span>
<div class="ms-row">${[0,1,2,3,4,5,6,7,8,9,10].map(i=>`<div class="ms-num">${i}</div>`).join("")}</div>
<span class="ms-end">${hi}</span></div>`;

const lines = (n) => `<div class="write-lines">${Array.from({length:n},()=>'<div class="nln"></div>').join("")}</div>`;

const items = [];

/* ─────────────── 1. bdd-dys/bdd-czym-jest ─────────────── */
items.push({
  file: "bdd-dys/bdd-czym-jest",
  title: "Czym jest BDD",
  body: `<div class="page"><header>
<div class="eyebrow">BDD · Psychoedukacja · Podstawy</div>
<h1 class="hdr-title">Czym jest <em>BDD</em></h1>
<div class="hdr-sub">Dysmorficzne zaburzenie ciała (ang. <em>body dysmorphic disorder</em>) — uporczywe, bolesne zaabsorbowanie wyobrażoną lub przesadzoną wadą wyglądu. Nie próżność, nie kaprys. Realne zaburzenie z konkretnymi kryteriami i skuteczną terapią.</div>
<div class="hdr-meta"><span><strong>Czas:</strong> 15 min — przeczytanie</span><span>Wstęp do tematu BDD</span><span><strong>Źródło:</strong> Phillips (2009); DSM-5-TR (2022); ICD-11 (2022)</span></div>
</header>
<div class="intro-box-row">
<div class="intro-box"><span class="intro-lbl">Jak używać</span>
<p>BDD — dysmorficzne zaburzenie ciała (ang. <em>body dysmorphic disorder</em>) to zaburzenie polegające na uporczywym, bolesnym zaabsorbowaniu wyobrażoną lub przesadzoną wadą wyglądu. Osoba widzi w swoim ciele „<strong>defekt</strong>", którego inni nie widzą — albo widzą jako drobny i nieistotny. Najczęściej dotyczy: <strong>skóry</strong> (trądzik, blizny, asymetria) — 73%, <strong>włosów</strong> — 56%, <strong>nosa</strong> — 37%, masy ciała i sylwetki — 22%, genitaliów — 8%. Kryteria DSM-5-TR: 1) zaabsorbowanie wadą niewidoczną lub minimalną, 2) powtarzane zachowania (sprawdzanie w lustrze, kamuflaż, porównywanie, pytanie o zapewnienie) lub akty mentalne, 3) klinicznie istotne cierpienie lub upośledzenie, 4) nie jest lepiej wyjaśnione przez zaburzenie odżywiania.</p></div>
<div class="intro-box"><span class="intro-lbl">Dlaczego to działa</span>
<p>Phillips (2009) w pierwszym dużym przeglądzie wykazała, że BDD dotyczy <strong>1,7–2,4% populacji</strong> — częstość porównywalna z anoreksją czy OCD. Mimo to BDD jest często <em>niediagnozowane</em>: 30–60% pacjentów nigdy nie ujawnia objawów lekarzom, bo wstyd lub obawa, że „to próżność". Bez leczenia BDD jest poważnym zaburzeniem: <strong>80% pacjentów ma myśli samobójcze, 25% próbuje samobójstwa</strong> — najwyższe wskaźniki wśród zaburzeń lękowych. Współistnieje z depresją (75%), fobią społeczną (37%), OCD (32%). Skuteczność leczenia jest dobra: CBT specyficzne dla BDD (Wilhelm 2013) i SSRI (fluoksetyna, escitalopram w wyższych dawkach) dają <strong>60–80% poprawy</strong>. Pierwszy krok to rozpoznanie.</p></div>
</div>
<div class="sec">
<h2 class="sec-h"><span class="num">01</span><svg class="ico-svg ico-sage"><use href="#i-board"/></svg> Kryteria DSM-5-TR — szczegółowo</h2>
<p class="prose"><strong>A.</strong> Zaabsorbowanie jednym lub większą liczbą wyobrażonych defektów lub wad wyglądu fizycznego, które są niewidoczne lub minimalne dla innych.</p>
<p class="prose"><strong>B.</strong> Powtarzane zachowania (sprawdzanie w lustrze, nadmierna pielęgnacja, skubanie skóry, poszukiwanie zapewnień) lub powtarzane akty mentalne (porównywanie własnego wyglądu z wyglądem innych) w odpowiedzi na obawy dotyczące wyglądu.</p>
<p class="prose"><strong>C.</strong> Zaabsorbowanie powoduje klinicznie istotne cierpienie lub upośledzenie w obszarze społecznym, zawodowym lub innym ważnym.</p>
<p class="prose"><strong>D.</strong> Zaabsorbowanie wyglądem nie jest lepiej wyjaśnione przez obawy dotyczące tkanki tłuszczowej lub masy ciała u osoby z zaburzeniem odżywiania.</p>
<div class="callout"><strong>Specyfikator:</strong> z <em>dysmorfią mięśniową</em> (ang. muscle dysmorphia) — zaabsorbowanie myślą, że ciało jest za małe lub niewystarczająco umięśnione. Częściej u mężczyzn. Czasem nazywane „bigoreksją".</div>
<div class="callout"><strong>Specyfikator wglądu:</strong> dobry · słaby · brak wglądu (z urojeniami). 30–40% osób z BDD ma słaby wgląd („naprawdę tak wyglądam") — to nadal BDD, nie psychoza.</div>
</div>
${foot("BDD",1,2)}
</div><div class="page"><div class="sec" style="margin-top:0">
<h2 class="sec-h"><span class="num">02</span><svg class="ico-svg ico-sage"><use href="#i-scale"/></svg> BDD vs zwykłe niezadowolenie z wyglądu</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:5px">
<div style="border:0.8px solid var(--line);border-top:2.5px solid var(--mute);padding:9px 12px;border-radius:3px;font-size:8.5pt;line-height:1.6">
<div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.1em;color:var(--mute);font-weight:700;text-transform:uppercase;margin-bottom:5px">Zwykłe niezadowolenie</div>
• Myśli o wyglądzie: kilka razy dziennie, krótko<br>• Można je odsunąć, gdy są inne sprawy<br>• Nie przeszkadza w pracy, relacjach<br>• Sprawdzanie w lustrze: rano, wieczorem<br>• Refleksja po komplemencie: krótko<br>• Wygląd to jeden z wielu wymiarów tożsamości</div>
<div style="border:0.8px solid var(--line);border-top:2.5px solid var(--sage);padding:9px 12px;border-radius:3px;font-size:8.5pt;line-height:1.6">
<div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.1em;color:var(--sage);font-weight:700;text-transform:uppercase;margin-bottom:5px">BDD</div>
• Myśli o defekcie: <strong>3–8 godzin dziennie</strong>, intruzywne<br>• Niemożliwe do odsunięcia, mimo wysiłku<br>• Upośledzenie pracy, izolacja społeczna<br>• Sprawdzanie w lustrze: <strong>30+ razy dziennie</strong><br>• Niedowierzanie komplementom („kłamie")<br>• Wygląd dominuje tożsamość („jestem tym defektem")</div>
</div></div>
<div class="sec" style="margin-top:10px">
<h2 class="sec-h"><span class="num">03</span><svg class="ico-svg ico-sage"><use href="#i-pencil"/></svg> Sygnały, że warto skonsultować się ze specjalistą</h2>
<div style="font-size:8.5pt;line-height:1.45;margin-top:4px">
${[`Myślę o swojej „wadzie" więcej niż <strong>godzinę dziennie</strong>, codziennie, od miesięcy`,
`Sprawdzam w lustrze (lub unikam luster) kompulsywnie — wiem, że za dużo`,
`Wychodzę z domu tylko po intensywnym kamuflażu (makijaż, ubrania, fryzura)`,
`Wycofuję się z pracy, szkoły, randek, spotkań z powodu wyglądu`,
`Kompulsywnie pytam bliskich, czy „jest źle widoczne"`,
`Wydaję dużo czasu i pieniędzy na zabiegi kosmetyczne, które nie pomagają`,
`Mam myśli o samobójstwie związane z wyglądem`,
`Bliscy mówią, że „nie widzą tego problemu", ale czuję, że nie rozumieją`,
`Skubam skórę, włosy, paznokcie, aby „poprawić"`,
`Po komplemencie wierzę, że kłamie lub nie zauważył/-a`]
.map(t=>`<div style="display:flex;gap:8px;margin-bottom:3px"><span style="color:var(--mute);font-size:10pt">☐</span><div>${t}</div></div>`).join("")}
</div></div>
<div class="callout" style="margin-top:8px"><strong>Klucz:</strong> Phillips (2009): „BDD jest jednym z najbardziej niedodiagnozowanych zaburzeń psychicznych. Cierpienie jest realne, ale wstyd blokuje wielu pacjentów przed szukaniem pomocy". Jeśli rozpoznajesz w sobie te wzorce — to <em>nie próżność, nie słabość, nie kaprys</em>. To prawdopodobnie BDD — leczalne zaburzenie z konkretnymi metodami terapii. <strong>Pierwsza wizyta u psychologa lub psychiatry znającego BDD jest najważniejszym krokiem.</strong> Pomoc istnieje.</div>
${foot("BDD",2,2)}
</div>`,
});

/* ─────────────── 2. gad/gad-defuzja ─────────────── */
items.push({
  file: "gad/gad-defuzja",
  title: "Defuzja poznawcza",
  body: `<div class="page"><header>
<div class="eyebrow">GAD · Procesy ACT</div>
<h1 class="hdr-title">Defuzja <em>poznawcza</em></h1>
<div class="hdr-sub">Myśl to nie fakt, to słowo w głowie. Zauważ ją, nazwij ją, idź dalej.</div>
<div class="hdr-meta"><span><strong>Czas:</strong> 3–5 min na ćwiczenie</span><span>Codziennie, krótko</span><span><strong>Źródło:</strong> Hayes i wsp. (2012); Harris (2009)</span></div>
</header>
<div class="intro-box-row">
<div class="intro-box"><span class="intro-lbl">Jak używać</span>
<p>Gdy pojawia się trudna myśl — zamiast z nią <strong>walczyć lub jej wierzyć</strong>, zastosuj jedną z technik poniżej. Każda zmienia <em>relację do myśli</em>, nie samą myśl. Ćwicz codziennie z 1–2 myślami; po 2 tygodniach przyjdzie automatycznie.</p></div>
<div class="intro-box"><span class="intro-lbl">Dlaczego to działa</span>
<p>„Fuzja poznawcza" = mózg traktuje myśl jak rzeczywistość („zachoruję" = już choruję). Defuzja to <strong>zmiana perspektywy</strong>: zaczynasz widzieć myśl <em>jako myśl</em>, nie jako fakt. Nie chodzi o pozbycie się jej (to nie działa) — chodzi o to, żeby nie sterowała Twoim zachowaniem. Można mieć myśl „nie dam rady" i jednocześnie zrobić to, co zaplanowano.</p></div>
</div>
<div class="fill-field" style="height:auto">
<div class="lbl" style="color:var(--mute);font-size:7.5pt">Przed <span class="lbl-sub">Zaznacz „lepkość" myśli — jak bardzo Cię trzyma, zanim zastosujesz technikę.</span></div>
${scale("Lepkość","myśli","lekko trzyma","mocno trzyma")}
</div>
<div class="sec">
<h2 class="sec-h"><span class="num">01</span><svg class="ico-svg ico-sage"><use href="#i-pencil"/></svg> Wybierz myśl do pracy</h2>
<p class="prose">Jedna myśl, która Cię dziś trzyma. Zapisz dokładnie tak, jak brzmi w Twojej głowie.</p>
<div class="write-label">Moja trudna myśl</div>${lines(2)}
</div>
<div class="sec">
<h2 class="sec-h"><span class="num">02</span><svg class="ico-svg ico-sage"><use href="#i-bulb"/></svg> 6 technik defuzji <span style="font-family:'Fraunces';font-style:italic;font-weight:500;color:var(--mute);font-size:10pt">— wypróbuj wszystkie, zatrzymaj 2–3 najlepsze</span></h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:4px;font-size:9pt;line-height:1.45">
${[[`A · „Mam myśl, że…"`,`Zamiast „nie dam rady", powiedz w głowie: „<strong>Mam myśl, że</strong> nie dam rady". Potem: „<strong>Zauważam, że mam myśl</strong>, że nie dam rady". Każda warstwa = większy dystans.`],
[`B · Powtórz głośno`,`Powtórz myśl na głos przez 30 s, szybko (lub powoli zniekształconym głosem). Słowa stają się dźwiękami, znaczenie się rozluźnia. Demonstrowane od Titchenera 1916.`],
[`C · Nadaj nazwę`,`„O, znowu <em>Historia o porażce</em>." „Znowu <em>Radio Katastrofa</em>." Powtarzające się wzorce dostają imiona — łatwiej rozpoznać je za następnym razem.`],
[`D · Liście na strumieniu`,`Zamknij oczy, wyobraź sobie strumień z liśćmi. Każdą myśl kładziesz na liściu i puszczasz z prądem. 5 minut. Nie próbujesz ich zatrzymać ani odepchnąć.`],
[`E · Komputer w głowie`,`Wyobraź sobie, że myśl pojawia się na <em>ekranie komputera</em>. Zmień jej czcionkę. Kolor. Animuj. Daj jej kaczy głos. To <strong>tekst</strong>, nie rzeczywistość.`],
[`F · Dzięki, umyśle`,`Powiedz w głowie: „<em>Dzięki, umyśle, że próbujesz mnie chronić</em>". Mózg ostrzega — to jego praca. Możesz mu podziękować i robić dalej swoje.`]]
.map(([h,b])=>`<div style="border:0.6px solid var(--line);border-left:2.5px solid var(--sage);border-radius:0 3px 3px 0;padding:7px 10px"><div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink);font-weight:600;margin-bottom:3px">${h}</div><div style="color:var(--soft)">${b}</div></div>`).join("")}
</div></div>
${foot("GAD",1,2)}
</div><div class="page"><div class="sec" style="margin-top:0">
<h2 class="sec-h"><span class="num">03</span><svg class="ico-svg ico-sage"><use href="#i-cal"/></svg> Wybór i test <span style="font-family:'Fraunces';font-style:italic;font-weight:500;color:var(--mute);font-size:10pt">— tydzień prób</span></h2>
<p class="prose">Każdego dnia zastosuj 1 technikę (A–F) na 1 trudnej myśli. Oceń, czy „odlepiła" się od Ciebie. Po 7 dniach zobaczysz, które działają dla Ciebie.</p>
<table class="work-table"><thead><tr>
<th style="width:34px">Dz.</th><th>Myśl</th><th style="width:60px">Technika A–F</th><th style="width:64px">Lepkość przed 0–10</th><th style="width:64px">Lepkość po 0–10</th><th style="width:64px">Działa?</th></tr></thead><tbody>
${["Pn","Wt","Śr","Cz","Pt","Sb","Nd"].map(d=>`<tr><td style="padding:5px 8px;font-weight:600">${d}</td><td class="col-divider"></td><td class="col-divider"></td><td class="col-divider"></td><td class="col-divider"></td><td class="col-divider"><span class="cell-hint">○ ✓&nbsp;&nbsp;○ ✗</span></td></tr>`).join("")}
</tbody></table></div>
<div class="sec" style="margin-top:10px">
<h2 class="sec-h"><span class="num">04</span><svg class="ico-svg ico-sage"><use href="#i-check"/></svg> Po tygodniu — moje 2 techniki</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
<div class="fill-field"><div class="lbl">Technika nr 1 <span class="lbl-sub">litera + dlaczego działa dla mnie</span></div>${lines(3)}</div>
<div class="fill-field"><div class="lbl">Technika nr 2 <span class="lbl-sub">litera + dlaczego działa dla mnie</span></div>${lines(3)}</div>
</div></div>
<div class="callout" style="margin-top:8px"><strong>Defuzja ≠ pozbywanie się myśli.</strong> Cel nie jest „myśl znikła" — to walka, która nakręca lęk. Cel: <em>myśl jest, ale mniej steruje Twoim zachowaniem</em>. Jeśli po technice nadal robisz to, co zaplanowano (mimo myśli „nie dam rady") — defuzja zadziałała.</div>
<div class="fill-field" style="height:auto;margin-top:8px">
<div class="lbl" style="color:var(--mute);font-size:7.5pt">Po <span class="lbl-sub">Po wybranej technice zaznacz „lepkość" myśli teraz.</span></div>
${scale("Lepkość","myśli","lekko trzyma","mocno trzyma")}
</div>
${foot("GAD",2,2)}
</div>`,
});

/* ─────────────── 3. gad/gad-mapa-martwienia ─────────────── */
items.push({
  file: "gad/gad-mapa-martwienia",
  title: "Mapa martwienia",
  body: `<div class="page"><header>
<div class="eyebrow">GAD · Praca poznawczo-behawioralna</div>
<h1 class="hdr-title">Mapa <em>martwienia</em></h1>
<div class="hdr-sub">Pętla, w której utykasz: wyzwalacz → myśl → emocja → reakcja → konsekwencje. Mapuj na papierze, by zobaczyć z zewnątrz.</div>
<div class="hdr-meta"><span><strong>Czas:</strong> 20–25 min</span><span>1 wpis dziennie przez 2 tyg.</span><span><strong>Źródło:</strong> Borkovec i wsp. (2004); Beck (1979); Wells (2009)</span></div>
</header>
<div class="intro-box-row">
<div class="intro-box"><span class="intro-lbl">Jak używać</span>
<p>Wybierz jedną sytuację martwienia z <strong>ostatnich 24 h</strong>. Wypełnij pięć pól mapy (sekcja 02): co było wyzwalaczem, jaka myśl, jaka emocja, co zrobiłeś/-aś, jakie konsekwencje. Po 2 tyg. zauważysz powtarzające się wzorce — to materiał do dalszej pracy.</p></div>
<div class="intro-box"><span class="intro-lbl">Dlaczego to działa</span>
<p>W GAD martwienie wydaje się <em>jedną falą</em>, której nie da się rozłożyć. W rzeczywistości to <strong>5-elementowa pętla</strong>, w której każde ogniwo można zauważyć i przerwać. Mapowanie pętli osłabia jej automatyczność: zaczynasz <em>obserwować zamiast wpadać</em>. Po kilkunastu wpisach pojawia się efekt „o, znowu ten sam wzorzec" — i to jest moment, w którym wybierasz inną reakcję.</p></div>
</div>
<div class="fill-field" style="height:auto">
<div class="lbl" style="color:var(--mute);font-size:7.5pt">Przed <span class="lbl-sub">Zaznacz „świadomość pętli" — na ile widzisz to, co Cię uruchamia.</span></div>
${scale("Świadomość","pętli","nie widzę","widzę jasno")}
</div>
<div class="sec">
<h2 class="sec-h"><span class="num">01</span><svg class="ico-svg ico-sage"><use href="#i-arr"/></svg> Pięcioelementowa pętla — wzorzec</h2>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:6px">
${[[`1`,`Trigger`,`co uruchomiło? obraz, słowo, sygnał`],
[`2`,`Myśl`,`„a co jeśli…" scenariusz w głowie`],
[`3`,`Emocja + ciało`,`lęk, napięcie — czuję się jak…`],
[`4`,`Reakcja`,`co zrobiłem/-am? sprawdziłem, pytałem…`],
[`5`,`Konsekw.`,`co się stało? krótko / długo`]]
.map(([n,h,s])=>`<div style="border:0.8px solid var(--line);border-top:2.5px solid var(--sage);border-radius:3px;padding:7px 8px;text-align:center"><div style="font-family:'Fraunces';font-size:13pt;color:var(--sage);font-weight:600">${n}</div><div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;color:var(--ink);margin:2px 0 3px">${h}</div><div style="font-size:7pt;color:var(--mute);line-height:1.3">${s}</div></div>`).join("")}
</div>
<div style="text-align:center;margin-top:8px;font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.08em;text-transform:uppercase;color:var(--warm);font-weight:600">↻ Pętla — konsekwencje karmią następny wyzwalacz <span style="text-transform:none;font-style:italic;font-family:'Fraunces';color:var(--mute)">— i tak w kółko, dopóki nie zauważysz</span></div>
</div>
${foot("GAD",1,2)}
</div><div class="page"><div class="sec" style="margin-top:0">
<h2 class="sec-h"><span class="num">02</span><svg class="ico-svg ico-sage"><use href="#i-board"/></svg> Mapa — konkretna sytuacja z ostatnich 24 h</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 14px;margin-top:4px">
<div class="fill-field"><div class="lbl">1. Trigger <span class="lbl-sub">co konkretnie uruchomiło?</span></div>${lines(3)}</div>
<div class="fill-field"><div class="lbl">2. Myśl <span class="lbl-sub">pierwsza myśl / „a co jeśli…"</span></div>${lines(3)}</div>
<div class="fill-field"><div class="lbl">3. Emocja + ciało <span class="lbl-sub">nazwa emocji, gdzie w ciele, intensywność (0–10)</span></div>${lines(3)}</div>
<div class="fill-field"><div class="lbl">4. Reakcja <span class="lbl-sub">co konkretnie zrobiłem/-am?</span></div>${lines(3)}</div>
</div>
<div class="fill-field" style="margin-top:12px"><div class="lbl">5. Konsekwencje <span class="lbl-sub">krótkoterminowo (czy lęk spadł?) ORAZ długoterminowo (czy to wzmocniło pętlę?)</span></div>${lines(3)}</div>
</div>
${foot("GAD",2,2)}
</div>`,
});

/* ─────────────── 4. bdd-dys/bdd-model-cbt ─────────────── */
items.push({
  file: "bdd-dys/bdd-model-cbt",
  title: "Model poznawczo-behawioralny BDD",
  body: `<div class="page"><header>
<div class="eyebrow">BDD · Konceptualizacja · Model CBT</div>
<h1 class="hdr-title">Model <em>poznawczo-behawioralny</em> BDD</h1>
<div class="hdr-sub">CBT-BDD (Wilhelm 2013) opiera się na konkretnym modelu: jak myśli, percepcja, zachowania i emocje tworzą błędne koło, które utrzymuje BDD. Zrozumienie modelu pozwala zobaczyć, gdzie można je przerwać.</div>
<div class="hdr-meta"><span><strong>Czas:</strong> 15 min — przeczytanie</span><span>Wstęp do mechanizmu BDD</span><span><strong>Źródło:</strong> Wilhelm, Phillips &amp; Steketee (2013); Veale (2004)</span></div>
</header>
<div class="intro-box-row">
<div class="intro-box"><span class="intro-lbl">Jak używać</span>
<p>Model poznawczo-behawioralny BDD opisuje <em>jak utrzymuje się</em> zaburzenie — nie jak powstaje. Pięć elementów połączonych w <strong>błędne koło</strong>: 1) wyzwalacz (lustro, zdjęcie, komentarz, sytuacja społeczna), 2) uwaga wybiórcza (mózg skupia się na „defekcie" detalicznie, „pod lupą"), 3) myśli interpretujące („jestem brzydka", „wszyscy widzą"), 4) emocje (wstyd, lęk, smutek, gniew na siebie), 5) zachowania bezpieczeństwa (sprawdzanie w lustrze, kamuflaż, unikanie, pytanie o zapewnienie). Każde z tych zachowań chwilowo obniża dystres, ale długoterminowo <strong>wzmacnia BDD</strong>. Mózg uczy się: „tylko te zachowania mnie chronią". Cykl się zamyka.</p></div>
<div class="intro-box"><span class="intro-lbl">Dlaczego to działa</span>
<p>Wilhelm i Steketee (2013) na podstawie modelu Veale (2004) stworzyli pierwszy w pełni manualizowany protokół CBT dla BDD. Model jest <em>empirycznie potwierdzony</em>: zmiana każdego z pięciu elementów (uwaga, myśli, zachowania) prowadzi do redukcji innych. Cel terapii: identyfikacja własnego błędnego koła i systematyczna praca nad każdym elementem. Praktyczna konsekwencja: nie musisz „przestać czuć" o swoim wyglądzie, by się poprawić. Wystarczy zmienić jeden lub dwa elementy cyklu — i reszta podąża. Zwykle najłatwiejsze są zachowania, najtrudniejsze emocje (przychodzą same). Stąd CBT pracuje „od zewnątrz do środka".</p></div>
</div>
<div class="sec">
<h2 class="sec-h"><span class="num">01</span><svg class="ico-svg ico-sage"><use href="#i-brain"/></svg> Pięć elementów błędnego koła</h2>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:6px">
${[[`1`,`Wyzwalacz`,`lustro · zdjęcie · komentarz`],
[`2`,`Uwaga wybiórcza`,`detaliczne patrzenie na defekt`],
[`3`,`Myśli`,`„jestem odrażający, wszyscy widzą"`],
[`4`,`Emocje`,`wstyd · lęk · smutek · gniew`],
[`5`,`Zachowania`,`sprawdzanie · kamuflaż · unikanie`]]
.map(([n,h,s])=>`<div style="border:0.8px solid var(--line);border-top:2.5px solid var(--sage);border-radius:3px;padding:7px 8px;text-align:center"><div style="font-family:'Fraunces';font-size:13pt;color:var(--sage);font-weight:600">${n}</div><div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;color:var(--ink);margin:2px 0 3px">${h}</div><div style="font-size:7pt;color:var(--mute);line-height:1.3">${s}</div></div>`).join("")}
</div>
<div style="text-align:center;margin-top:8px;font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.08em;text-transform:uppercase;color:var(--warm);font-weight:600">↻ Każde ogniwo wzmacnia kolejne</div>
<p class="prose" style="margin-top:8px">Każde z 5 ogniw wzmacnia kolejne. Zachowania bezpieczeństwa (sprawdzanie, kamuflaż) chwilowo obniżają dystres — i jednocześnie <strong>wzmacniają cały cykl</strong>. Mózg uczy się: „tylko te zachowania mnie chronią — bez nich byłoby gorzej". To nieprawda — ale tylko ekspozycja na sytuacje bez zachowań może to udowodnić.</p>
</div>
${foot("BDD",1,2)}
</div><div class="page"><div class="sec" style="margin-top:0">
<h2 class="sec-h"><span class="num">02</span><svg class="ico-svg ico-sage"><use href="#i-x"/></svg> Czynniki utrzymujące <span style="font-family:'Fraunces';font-style:italic;font-weight:500;color:var(--mute);font-size:10pt">— dlaczego cykl się nie przerywa</span></h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:4px;font-size:8.5pt;line-height:1.45">
${[[`Zachowania bezpieczeństwa`,`Każde sprawdzenie w lustrze: chwilowa ulga + wzmocnienie potrzeby sprawdzania. Krótko działa, długo utrzymuje.`],
[`Unikanie`,`Każde unikanie sytuacji społecznej z powodu wyglądu wzmacnia przekonanie: „gdybym poszedł/-a, byłoby źle". Bez ekspozycji nie ma dowodu, że nie.`],
[`Porównania społeczne`,`Porównywanie się z innymi — w mediach, na ulicy, w pracy. Mózg zawsze znajdzie kogoś „lepszego". To wzmacnia poczucie wady.`],
[`Poszukiwanie zapewnień`,`Pytanie partnera, mamy, przyjaciela: „czy widać?". Zapewnienie działa godzinami, potem trzeba znowu pytać. Wzmacnia rytuał.`]]
.map(([h,b])=>`<div style="border:0.6px solid var(--line);border-left:2.5px solid var(--mute);border-radius:0 3px 3px 0;padding:7px 10px"><div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink);font-weight:600;margin-bottom:3px">${h}</div><div style="color:var(--soft)">${b}</div></div>`).join("")}
</div></div>
<div class="sec" style="margin-top:10px">
<h2 class="sec-h"><span class="num">03</span><svg class="ico-svg ico-sage"><use href="#i-target"/></svg> Gdzie CBT przerywa cykl</h2>
<p class="prose"><strong>Element 2 (uwaga):</strong> trening uwagi — świadome przesuwanie z detalu na całość. Mirror retraining, ekspozycja zewnętrzna.</p>
<p class="prose"><strong>Element 3 (myśli):</strong> restrukturyzacja poznawcza — identyfikacja zniekształceń (czytanie w myślach, katastrofizacja), kwestionowanie dowodów.</p>
<p class="prose"><strong>Element 5 (zachowania):</strong> drabina ekspozycji + zapobieganie reakcji (ERP). Sytuacje unikane są wprowadzane stopniowo, bez zachowań bezpieczeństwa. Mózg uczy się: „nie sprawdziłem — i nie wydarzyło się nic strasznego".</p>
<p class="prose"><strong>Element 4 (emocje):</strong> nie pracuje się na nich wprost. Zmieniają się automatycznie, gdy zmieniają się elementy 2, 3, 5. To dlatego CBT pracuje „od zewnątrz do środka".</p>
</div>
<div class="callout" style="margin-top:8px"><strong>Klucz:</strong> Wilhelm (2013): „w CBT-BDD nie próbujemy zmienić tego, jak Twoja twarz wygląda — bo nie jest tam problem. Próbujemy zmienić, jak Twój mózg ją przetwarza. Każda technika służy temu jednemu celowi: <em>nauczyć mózg widzieć siebie inaczej</em>". Cykl, w którym jesteś — nie jest wadą charakteru. Jest wzorcem, którego mózg się nauczył. Czego się nauczył — może oduczyć.</div>
${foot("BDD",2,2)}
</div>`,
});

/* ─────────────── 5. bdd-dys/bdd-drabina-ekspozycji ─────────────── */
items.push({
  file: "bdd-dys/bdd-drabina-ekspozycji",
  title: "Drabina ekspozycji w BDD",
  body: `<div class="page"><header>
<div class="eyebrow">BDD · ERP · Drabina ekspozycji</div>
<h1 class="hdr-title">Drabina <em>ekspozycji</em> w BDD</h1>
<div class="hdr-sub">ERP (ekspozycja + zapobieganie reakcji) jest centralnym narzędziem CBT-BDD. Drabina porządkuje pracę od najłatwiejszej do najtrudniejszej ekspozycji. Mózg uczy się stopniowo, że unikane sytuacje są bezpieczne.</div>
<div class="hdr-meta"><span><strong>Czas:</strong> 30 min — budowa drabiny</span><span>Z terapeutą</span><span><strong>Źródło:</strong> Wilhelm (2013); Foa &amp; Kozak (1986)</span></div>
</header>
<div class="intro-box-row">
<div class="intro-box"><span class="intro-lbl">Jak używać</span>
<p>Drabina ekspozycji to <strong>hierarchia sytuacji</strong>, których unikasz z powodu BDD, uporządkowana od najmniej do najbardziej trudnej (SUDS 0–10). Budujesz ją z terapeutą — zwykle 10–15 stopni. Każdy stopień ma: 1) konkretną sytuację (gdzie, kiedy, z kim), 2) SUDS przewidywany (0–10), 3) zachowania zapobiegające (czego <em>nie</em> robisz: nie sprawdzasz, nie kamuflujesz, nie pytasz). Zasady ERP: regularność (każdy stopień powtarzasz, aż SUDS spadnie o 50%), od dołu (zaczynasz od najłatwiejszych), bez bezpieczeństwa, długość (każda ekspozycja min. 30–60 min lub do spadku SUDS). Mózg uczy się: „wyszłam — i nic się nie wydarzyło".</p></div>
<div class="intro-box"><span class="intro-lbl">Dlaczego to działa</span>
<p>Foa i Kozak (1986) opracowali teoretyczne podstawy ERP: <em>habituacja</em> (spadek dystresu po długiej ekspozycji bez ucieczki) + uczenie się nowego skojarzenia (sytuacja → bezpieczeństwo, zamiast sytuacja → zagrożenie). Wilhelm (2013) zaadaptowała ERP do BDD: najważniejsze są <strong>zachowania zapobiegające reakcji</strong> — nie samo wyjście, lecz wyjście bez sprawdzania, bez kamuflażu. Bez tego ekspozycja jest pozorna („wyszłam, ale w pełnym makijażu — więc nie nauczyłam się niczego nowego"). Skuteczność: w RCT Wilhelm i wsp. (2014) ERP w protokole CBT-BDD daje <strong>70–80% odpowiedzi</strong>. Drabina to <em>plan</em>, nie kontrakt — cel to stopniowe rozszerzanie życia, nie heroiczne skoki.</p></div>
</div>
<div class="sec">
<h2 class="sec-h"><span class="num">01</span><svg class="ico-svg ico-sage"><use href="#i-board"/></svg> Trzy zasady drabiny</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:4px;font-size:8.5pt;line-height:1.45">
${[[`1 · Od dołu`,`Zaczynasz od najłatwiejszego stopnia (SUDS 2–3). Sukces buduje motywację. Nie zaczynaj od najtrudniejszego — to przepis na rezygnację.`],
[`2 · Powtarzaj, aż SUDS spadnie`,`Każdy stopień powtarzasz 3–5 razy, aż SUDS spadnie o połowę. Wtedy przechodzisz wyżej. Bez powtórzeń — habituacja się nie utrwala.`],
[`3 · Bez zachowań zapobiegających`,`Ekspozycja bez makijażu — to wyjście bez makijażu. Nie „z lekkim podkładem". Każde zachowanie ratunkowe niweluje efekt.`],
[`4 · Wystarczająco długo`,`Minimum 30–60 minut lub do spadku SUDS o 50%. Krótsze — mózg nie zdąży się nauczyć. Liczy się czas w sytuacji.`]]
.map(([h,b])=>`<div style="border:0.6px solid var(--line);border-left:2.5px solid var(--sage);border-radius:0 3px 3px 0;padding:7px 10px"><div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink);font-weight:600;margin-bottom:3px">${h}</div><div style="color:var(--soft)">${b}</div></div>`).join("")}
</div></div>
<div class="sec">
<h2 class="sec-h"><span class="num">02</span><svg class="ico-svg ico-sage"><use href="#i-arr"/></svg> Przykładowa drabina <span style="font-family:'Fraunces';font-style:italic;font-weight:500;color:var(--mute);font-size:10pt">— pacjentka z BDD twarzy</span></h2>
<div style="margin-top:4px;font-size:8pt;line-height:1.5">
${[[`2`,`Spacer w okolicy, jasno świeci słońce, bez okularów słonecznych`],
[`3`,`Zakupy w sklepie spożywczym, krótka rozmowa z kasjerem`],
[`4`,`Wyjście bez warstwy korektora na twarzy`],
[`5`,`Spotkanie z bliską przyjaciółką w kawiarni, bez makijażu`],
[`6`,`Praca w open space, jasne oświetlenie, bez czapki`],
[`7`,`Selfie zwykłym aparatem (bez filtra), bez wysyłania`],
[`7`,`Wyjście do galerii handlowej w sobotnie popołudnie`],
[`8`,`Randka z nowo poznaną osobą, bez warstwy makijażu`],
[`9`,`Wystąpienie publiczne, prezentacja w pracy`],
[`10`,`Zdjęcie publikowane na social media, bez filtra`]]
.map(([s,t])=>`<div style="display:flex;gap:10px;align-items:baseline;padding:2px 0;border-bottom:0.5px solid var(--line2)"><span style="font-family:'DM Sans';font-weight:700;font-size:7.5pt;color:var(--sage);min-width:54px">SUDS ${s}</span><span style="color:var(--soft)">${t}</span></div>`).join("")}
</div></div>
${foot("BDD",1,2)}
</div><div class="page"><div class="sec" style="margin-top:0">
<h2 class="sec-h"><span class="num">03</span><svg class="ico-svg ico-sage"><use href="#i-pencil"/></svg> Moja drabina ekspozycji</h2>
<table class="work-table"><thead><tr>
<th style="width:48px">SUDS</th><th>Sytuacja (gdzie, kiedy, z kim)</th><th style="width:46%">Zachowanie zapobiegające <span style="text-transform:none;font-weight:400;font-style:italic">— czego NIE robisz</span></th></tr></thead><tbody>
${["2","3","4","5","6","7","8","9","10"].map(s=>`<tr><td style="padding:5px 8px;font-weight:700;color:var(--sage)">${s}</td><td class="col-divider"></td><td class="col-divider"></td></tr>`).join("")}
</tbody></table></div>
<div class="sec" style="margin-top:10px">
<h2 class="sec-h"><span class="num">04</span><svg class="ico-svg ico-sage"><use href="#i-x"/></svg> Częste pułapki w drabinie</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:4px;font-size:8pt;line-height:1.45">
${[[`Ukryte zachowania bezpieczeństwa`,`„Wyszłam bez makijażu" — ale w kapturze, z fryzurą zasłaniającą, z opuszczoną głową. To nie jest pełna ekspozycja.`],
[`Skoki o 3 stopnie`,`„Już idzie OK, skoczę od razu wyżej" — często prowadzi do przeciążenia, rezygnacji. Idź krok po kroku.`],
[`Pojedyncza ekspozycja`,`„Raz wyszłam bez makijażu — dalej będzie łatwo". Habituacja wymaga powtórzeń. Każdy stopień min. 3–5 razy.`],
[`Sprawdzanie po ekspozycji`,`Po wyjściu od razu do lustra: „jak było widać?". To zachowanie kompensacyjne — niweluje efekt. Bez sprawdzania po.`]]
.map(([h,b])=>`<div style="border:0.6px solid var(--line);border-left:2.5px solid var(--mute);border-radius:0 3px 3px 0;padding:7px 10px"><div style="font-family:'DM Sans';font-size:7.5pt;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink);font-weight:600;margin-bottom:3px">${h}</div><div style="color:var(--soft)">${b}</div></div>`).join("")}
</div></div>
<div class="callout" style="margin-top:8px"><strong>Klucz:</strong> Foa &amp; Kozak (1986): „ekspozycja działa nie dlatego, że jesteś dzielny/-a — działa, ponieważ mózg uczy się nowego skojarzenia. Sytuacja bez katastrofy → bezpieczeństwo. To uczenie się wymaga powtórzeń, czasu i braku ucieczki". Drabina nie jest testem dzielności. Jest treningiem jak każdy inny. Krok po kroku — każdy zaplanowany, każdy z terapeutą.</div>
${foot("BDD",2,2)}
</div>`,
});

for (const it of items) {
  const html = assemble(it);
  const out = path.join(outDir, it.file.replace(/\//g, "__") + ".html");
  fs.writeFileSync(out, html);
  console.log(`✓ ${it.file}  →  ${path.relative(root, out)}  (${(html.length/1024).toFixed(1)} KB, ${(html.match(/class="page"/g)||[]).length} str.)`);
}
