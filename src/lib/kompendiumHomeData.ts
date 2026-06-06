export type HomeModuleCard = {
  slug: string;
  icon: string;
  name: string;
  countLabel: string;
  description: string;
  color: string;
};

export type HomeCategorySection = {
  title: string;
  titleColor: string;
  subtitle: string;
  items: HomeModuleCard[];
};

export type ApproachChip = {
  slug: string;
  name: string;
  count: string;
  color: string;
};

export type ApproachGroup = {
  label: string;
  chips: ApproachChip[];
};

export const homeHeroStats = [
  { num: "1609", label: "narzędzi" },
  { num: "1898", label: "handoutów" },
  { num: "29", label: "modułów" },
  { num: "28", label: "kart farmako" }
] as const;

export const homeCategories: HomeCategorySection[] = [
  {
    title: "Lęk",
    titleColor: "var(--k-green)",
    subtitle: "Zaburzenia oparte na lęku i niepokoju",
    items: [
      {
        slug: "gad",
        icon: "😰",
        name: "Lęk uogólniony (GAD)",
        countLabel: "50 narzędzi",
        description:
          "Ciągłe martwienie się, napięcie, „a co jeśli?” — spirala, której nie da się zatrzymać.",
        color: "#5a8a3a"
      },
      {
        slug: "panika",
        icon: "💓",
        name: "Zaburzenie paniczne",
        countLabel: "27 narzędzi",
        description: "Nagły lęk, kołatanie serca, duszność — ciało krzyczy „UCIEKAJ!” bez powodu.",
        color: "#5a8a3a"
      },
      {
        slug: "sad",
        icon: "🫣",
        name: "Fobia społeczna (SAD)",
        countLabel: "31 narzędzi",
        description: "Strach przed oceną, unikanie ludzi, „na pewno pomyśleli, że jestem żałosny”.",
        color: "#5a8a3a"
      },
      {
        slug: "health_anx",
        icon: "🩺",
        name: "Lęk zdrowotny",
        countLabel: "44 narzędzi",
        description: "Każdy ból to guz, każdy kaszel to rak — Dr. Google potwierdza najgorsze.",
        color: "#5a8a3a"
      },
      {
        slug: "phobia",
        icon: "🕷️",
        name: "Fobia specyficzna",
        countLabel: "22 narzędzi",
        description: "Ekspozycja, hierarchia SUDS, one-session treatment, fobia BII.",
        color: "#5a8a3a"
      }
    ]
  },
  {
    title: "Nastrój",
    titleColor: "var(--k-blue)",
    subtitle: "Zaburzenia nastroju i energii",
    items: [
      {
        slug: "dep",
        icon: "🌧️",
        name: "Depresja",
        countLabel: "51 narzędzi",
        description: "Pustka, brak siły, bezwartościowość — świat wygląda jak przez szary filtr.",
        color: "#2a5a8a"
      },
      {
        slug: "burnout",
        icon: "🔥",
        name: "Wypalenie zawodowe",
        countLabel: "48 narzędzi",
        description:
          "Wyczerpanie, cynizm, utrata sensu — praca wysysa wszystko, odpoczynek nie pomaga.",
        color: "#2a5a8a"
      },
      {
        slug: "bipolar",
        icon: "🎢",
        name: "Zaburzenie dwubiegunowe",
        countLabel: "33 narzędzi",
        description: "BD I/II, mood charting, IPSRT, plan kryzysowy, farmakoterapia.",
        color: "#2a5a8a"
      },
      {
        slug: "psychosis",
        icon: "🌀",
        name: "Zaburzenia psychotyczne",
        countLabel: "33 narzędzi",
        description: "Psychoedukacja, recovery, praca z głosami, CBTp Morrison.",
        color: "#2a5a8a"
      }
    ]
  },
  {
    title: "Trauma",
    titleColor: "var(--k-brown)",
    subtitle: "Reakcje na traumę i stratę",
    items: [
      {
        slug: "ptsd",
        icon: "⚡",
        name: "PTSD",
        countLabel: "35 narzędzi",
        description: "Flashbacki, koszmary, hypervigilance — ciało utknęło w momencie traumy.",
        color: "#8a4a2a"
      },
      {
        slug: "cptsd",
        icon: "🔗",
        name: "C-PTSD",
        countLabel: "30 narzędzi",
        description:
          "Powtarzająca się trauma z dzieciństwa — zaburzona regulacja, tożsamość, relacje.",
        color: "#8a4a2a"
      },
      {
        slug: "dissoc",
        icon: "🪞",
        name: "Zaburzenia dysocjacyjne",
        countLabel: "22 narzędzia",
        description: "Depersonalizacja, derealizacja, grounding, okno tolerancji.",
        color: "#8a4a2a"
      },
      {
        slug: "grief",
        icon: "🕊️",
        name: "Żałoba",
        countLabel: "19 narzędzi",
        description: "Tęsknota, ból, pustka po stracie — i pytanie „czy to kiedyś minie?”.",
        color: "#8a4a2a"
      }
    ]
  },
  {
    title: "Zachowanie",
    titleColor: "var(--k-red)",
    subtitle: "OCD, sen, ADHD, ASD, dysmorfofobia",
    items: [
      {
        slug: "ocd",
        icon: "🔄",
        name: "Zaburzenie obsesyjno-kompulsyjne (OCD)",
        countLabel: "39 narzędzi",
        description:
          "Natrętne myśli, rytuały, sprawdzanie — pętla, która obiecuje ulgę i nie daje.",
        color: "#c0392b"
      },
      {
        slug: "bdd-dys",
        icon: "👓",
        name: "Dysmorfofobia (BDD)",
        countLabel: "20 narzędzi",
        description: "„Wszyscy widzą moją wadę” — zaabsorbowanie wyglądem, rytuały, unikanie.",
        color: "#c0392b"
      },
      {
        slug: "derm",
        icon: "✋",
        name: "Dermatillomania",
        countLabel: "18 narzędzi",
        description: "Kompulsyjne dłubanie w skórze — HRT, kontrola bodźców, ACT, NAC.",
        color: "#c0392b"
      },
      {
        slug: "insomnia",
        icon: "🌙",
        name: "Bezsenność",
        countLabel: "25 narzędzi",
        description: "Leżysz godzinami, liczysz owce, zegar tyka — a sen nie przychodzi.",
        color: "#c0392b"
      },
      {
        slug: "adhd",
        icon: "🧠",
        name: "ADHD",
        countLabel: "54 narzędzi",
        description: "Dekoncentracja, chaos, prokrastynacja — mózg działa INACZEJ, nie gorzej.",
        color: "#c0392b"
      },
      {
        slug: "asd",
        icon: "🧩",
        name: "Spektrum autyzmu u dorosłych (ASD)",
        countLabel: "19 narzędzi",
        description: "Neuróróżnorodność, sensoryka, maskowanie, nawigacja społeczna.",
        color: "#c0392b"
      },
      {
        slug: "audhd",
        icon: "🔀",
        name: "AuDHD (autyzm + ADHD)",
        countLabel: "22 narzędzia",
        description:
          "Dwa systemy operacyjne w jednym mózgu — sprzeczności, synergije i unikalne wyzwania.",
        color: "#c0392b"
      }
    ]
  },
  {
    title: "Zaburzenia odżywiania",
    titleColor: "var(--k-pink)",
    subtitle: "Ogólne ujęcie i konkretne jednostki",
    items: [
      {
        slug: "an",
        icon: "⚖️",
        name: "Anoreksja psychiczna",
        countLabel: "46 narzędzi",
        description: "AN · CBT-E · MANTRA · FBT — ego-syntoniczność, obraz ciała, refeeding.",
        color: "#b85a7a"
      },
      {
        slug: "eating",
        icon: "🍽️",
        name: "Zaburzenia odżywiania",
        countLabel: "23 narzędzi",
        description: "Restrykcja, objadanie, oczyszczanie — gdy jedzenie staje się polem bitwy.",
        color: "#b85a7a"
      }
    ]
  },
  {
    title: "Uzależnienia",
    titleColor: "#8a6a2a",
    subtitle: "Substancje i zachowania kompulsywne",
    items: [
      {
        slug: "addiction",
        icon: "⛓️",
        name: "Uzależnienia",
        countLabel: "45 narzędzi",
        description: "Substancje lub zachowania przejmują kontrolę — mimo prób przestania.",
        color: "#8a6a2a"
      },
      {
        slug: "alcohol",
        icon: "🍷",
        name: "Alkohol",
        countLabel: "20 narzędzi",
        description: "Najczęstsze uzależnienie w Polsce — od picia ryzykownego po ciężkie AUD.",
        color: "#8a6a2a"
      },
      {
        slug: "drugs",
        icon: "💊",
        name: "Narkotyki i leki",
        countLabel: "20 narzędzi",
        description: "Opioidy, stymulanty, kannabinoidy, benzodiazepiny, nikotyna, NPS",
        color: "#8a6a2a"
      },
      {
        slug: "behav-add",
        icon: "🎰",
        name: "Uzależnienia behawioralne",
        countLabel: "16 narzędzi",
        description: "Hazard, gaming, CSBD, kompulsywne zakupy, food addiction",
        color: "#8a6a2a"
      },
      {
        slug: "psu",
        icon: "📱",
        name: "Problemowe używanie smartfona",
        countLabel: "12 narzędzi",
        description: "„Nie mogę odłożyć telefonu” — FOMO, doom scrolling, higiena cyfrowa.",
        color: "#8a6a2a"
      },
      {
        slug: "codep",
        icon: "👨‍👩‍👧",
        name: "Współuzależnienie i rodzina",
        countLabel: "14 narzędzi",
        description: "Bliscy osoby uzależnionej — CRAFT, role rodzinne, DDA, granice.",
        color: "#8a6a2a"
      },
      {
        slug: "ppu",
        icon: "🔁",
        name: "PPU/CSBD",
        countLabel: "64 narzędzi",
        description:
          "Problematyczne używanie pornografii i kompulsywne zachowania seksualne (ICD-11 6C72) — utrata kontroli, wstyd, moralna niespójność.",
        color: "#8a6a2a"
      }
    ]
  },
  {
    title: "Osobowość",
    titleColor: "var(--k-purple)",
    subtitle: "6 modułów zaburzeń osobowości",
    items: [
      {
        slug: "bpd",
        icon: "🌊",
        name: "Osobowość z pogranicza (BPD)",
        countLabel: "33 narzędzi",
        description:
          "Emocje na 10/10, strach przed porzuceniem, impulsywność — intensywność, która boli.",
        color: "#6a3aa0"
      },
      {
        slug: "npd",
        icon: "🎭",
        name: "Narcystyczne zaburzenie osobowości (NPD)",
        countLabel: "30 narzędzi",
        description:
          "Wielkościowość, potrzeba podziwu, brak empatii — za fasadą kryje się kruche „ja”.",
        color: "#6a3aa0"
      },
      {
        slug: "avpd",
        icon: "🫥",
        name: "Unikowe zaburzenie osobowości (AvPD)",
        countLabel: "27 narzędzi",
        description:
          "Głębokie poczucie wadliwości, unikanie ludzi, pragnienie bliskości i lęk przed nią.",
        color: "#6a3aa0"
      },
      {
        slug: "ocpd",
        icon: "📏",
        name: "Anankastyczne zaburzenie osobowości (OCPD)",
        countLabel: "26 narzędzi",
        description: "Perfekcjonizm, kontrola, sztywność — „musi być idealnie, inaczej nic nie warte”.",
        color: "#6a3aa0"
      },
      {
        slug: "aspd",
        icon: "🐺",
        name: "Antyspołeczne zaburzenie osobowości (ASPD)",
        countLabel: "22 narzędzia",
        description: "Lekceważenie praw, manipulacja, brak wyrzutów sumienia — i jak się chronić.",
        color: "#6a3aa0"
      },
      {
        slug: "inne-zo",
        icon: "📋",
        name: "Inne zaburzenia osobowości",
        countLabel: "17 narzędzi",
        description:
          "Klaster A (paranoidalne, schizoidalne, schizotypowe), DPD, HPD i przegląd 10 ZO.",
        color: "#6a3aa0"
      }
    ]
  },
  {
    title: "Przywiązanie",
    titleColor: "var(--k-teal)",
    subtitle: "4 style przywiązania",
    items: [
      {
        slug: "att-teoria",
        icon: "📖",
        name: "Teoria przywiązania",
        countLabel: "24 narzędzi",
        description: "Bowlby, Ainsworth, 4 style, IWM, ECR-R, AAI, EFT, earned secure.",
        color: "#4a6a8a"
      },
      {
        slug: "att-anxious",
        icon: "💔",
        name: "Lękowo-ambiwalentny",
        countLabel: "22 narzędzi",
        description: "„Kochaj mnie BARDZIEJ” — lęk przed porzuceniem, protest, hipervigilance.",
        color: "#4a6a8a"
      },
      {
        slug: "att-avoidant",
        icon: "🧊",
        name: "Unikający",
        countLabel: "21 narzędzi",
        description:
          "„Nie potrzebuję nikogo” — tłumienie emocji, dystans, pozorna samowystarczalność.",
        color: "#4a6a8a"
      },
      {
        slug: "att-fearful",
        icon: "🌪️",
        name: "Zdezorganizowany",
        countLabel: "21 narzędzi",
        description: "„Chcę bliskości ale uciekam” — push-pull, trauma relacyjna, chaos.",
        color: "#4a6a8a"
      }
    ]
  }
];

export const homeApproachGroups: ApproachGroup[] = [
  {
    label: "Podejścia terapeutyczne",
    chips: [
      { slug: "act", name: "ACT", count: "71", color: "#558a72" },
      { slug: "dbt", name: "DBT", count: "40", color: "#558a72" },
      { slug: "schema", name: "Terapia schematów", count: "53", color: "#558a72" },
      { slug: "core-beliefs", name: "Przekonania kluczowe (CBT)", count: "45", color: "#558a72" },
      { slug: "stpp", name: "STPP (psychodynamiczna)", count: "32", color: "#558a72" },
      { slug: "empathy-comm", name: "Komunikacja empatyczna", count: "34", color: "#558a72" },
      { slug: "systemowa", name: "Terapia systemowa + NVC", count: "31", color: "#558a72" },
      { slug: "mindful", name: "Mindfulness", count: "21", color: "#558a72" },
      { slug: "mi", name: "Dialog motywujący", count: "12", color: "#558a72" }
    ]
  },
  {
    label: "Emocje i ciało",
    chips: [
      { slug: "emotions", name: "Praca z emocjami", count: "36", color: "#8a5a2a" },
      { slug: "anger", name: "Praca ze złością", count: "32", color: "#8a5a2a" },
      { slug: "relaks", name: "Techniki relaksacyjne", count: "32", color: "#8a5a2a" },
      { slug: "shame", name: "Praca ze wstydem", count: "17", color: "#8a5a2a" },
      { slug: "stress", name: "Zarządzanie stresem", count: "40", color: "#8a5a2a" }
    ]
  },
  {
    label: "Relacje i komunikacja",
    chips: [
      { slug: "couples", name: "Relacje partnerskie", count: "22", color: "#5a6a8a" },
      { slug: "interpers", name: "Umiej. interpersonalne", count: "13", color: "#5a6a8a" },
      { slug: "caregivers", name: "Psychoedukacja bliskich", count: "15", color: "#5a6a8a" }
    ]
  },
  {
    label: "Rozwój i dobrostan",
    chips: [
      { slug: "selfcomp", name: "Samoocena", count: "38", color: "#3a7a3a" },
      { slug: "resilience", name: "Rezyliencja", count: "18", color: "#3a7a3a" },
      { slug: "motivation", name: "Motywacja i zmiana", count: "37", color: "#3a7a3a" },
      { slug: "habits", name: "Budowanie nawyków", count: "12", color: "#3a7a3a" },
      { slug: "ruch", name: "Aktywność fizyczna", count: "18", color: "#3a7a3a" },
      { slug: "hobby", name: "Zainteresowania", count: "32", color: "#3a7a3a" },
      { slug: "wellbeing", name: "Samopoczucie", count: "12", color: "#3a7a3a" },
      { slug: "meaning", name: "Poczucie sensu", count: "12", color: "#3a7a3a" }
    ]
  },
  {
    label: "Wyzwania życiowe",
    chips: [
      { slug: "procrast", name: "Prokrastynacja", count: "13", color: "#6a6a3a" },
      { slug: "decisions", name: "Trudne wybory", count: "10", color: "#6a6a3a" },
      { slug: "transitions", name: "Zmiany życiowe", count: "15", color: "#6a6a3a" },
      { slug: "hejt", name: "Hejt", count: "12", color: "#6a6a3a" },
      { slug: "social", name: "Social media", count: "12", color: "#6a6a3a" },
      { slug: "budget", name: "Zarządzanie budżetem", count: "11", color: "#6a6a3a" },
      { slug: "aging", name: "Przemijanie", count: "12", color: "#6a6a3a" },
      { slug: "sexology", name: "Seksuologia", count: "12", color: "#6a6a3a" }
    ]
  },
  {
    label: "Bezpieczeństwo i kryzys",
    chips: [
      { slug: "crisis", name: "Interwencja kryzysowa", count: "12", color: "#8a2a2a" },
      { slug: "suicide", name: "Ryzyko samobójcze", count: "12", color: "#8a2a2a" }
    ]
  },
  {
    label: "Warsztat terapeuty",
    chips: [
      { slug: "alliance", name: "Przymierze terap.", count: "14", color: "#5a4a7a" },
      { slug: "supervision", name: "Superwizja", count: "12", color: "#5a4a7a" },
      { slug: "group", name: "Terapia grupowa", count: "12", color: "#5a4a7a" },
      { slug: "interview", name: "Wywiad i diagnostyka", count: "11", color: "#5a4a7a" },
      { slug: "documents", name: "Dokumenty kliniczne", count: "10", color: "#5a4a7a" },
      { slug: "ethics", name: "Prawo i etyka", count: "11", color: "#5a4a7a" },
      { slug: "labwork", name: "Badania krwi", count: "12", color: "#5a4a7a" },
      { slug: "therapy-diff", name: "Trudne sytuacje", count: "12", color: "#5a4a7a" },
      { slug: "development", name: "Psychologia rozwoju", count: "12", color: "#5a4a7a" },
      { slug: "genogram", name: "Genogram", count: "30", color: "#5a4a7a" },
      { slug: "leki", name: "Farmakoterapia", count: "6", color: "#5a4a7a" }
    ]
  }
];
