export const MODULE_HANDOUT_ALIASES: Record<string, string[]> = {
  bpd: ["borderline", "pogranicza", "pogranicze", "osobowosc", "bpd"],
  dep: ["depresja", "depresji", "smutek", "beck"],
  gad: ["lek", "martwienie", "uogolniony", "gad"],
  sad: ["sad", "lek spoleczny", "fobia spoleczna", "social", "rumieniec"],
  panika: ["panika", "atak", "agorafobia", "katastrofa"],
  adhd: ["adhd", "uwaga", "hiperaktywnosc"],
  ocd: ["ocd", "obsesja", "kompulsja"],
  ptsd: ["ptsd", "trauma", "flashback"],
  audhd: ["audhd", "autyzm", "adhd"],
  asd: ["autyzm", "asd", "spektrum"],
  grief: ["zaloba", "strata", "grief"],
  bipolar: ["dwubiegunowe", "mania", "chad", "bipolar"],
  health_anx: ["hipochondria", "lek zdrowotny", "cyberchondria"],
  insomnia: ["bezsenosc", "sen", "insomnia"],
  eating: ["jedzenie", "anoreksja", "bulimia", "ed"]
};

export function normalizeSearchText(value: string): string {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildModuleSearchKeywords(slug: string, title: string): string[] {
  const set = new Set<string>([slug]);
  for (const word of normalizeSearchText(title).split(" ")) {
    if (word.length >= 2) set.add(word);
  }
  for (const alias of MODULE_HANDOUT_ALIASES[slug] || []) {
    set.add(alias);
  }
  return [...set];
}
