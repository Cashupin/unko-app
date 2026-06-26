const PLACE_ICONS: { icon: string; gradient: string; keywords: string[] }[] = [
  { icon: "⛩️",  gradient: "from-red-900 to-rose-950",        keywords: ["shrine","santuario","templo","temple","torii","jinja","taisha"] },
  { icon: "🌋",  gradient: "from-orange-900 to-red-950",      keywords: ["volcano","volcán","volcan","crater"] },
  { icon: "🏔️", gradient: "from-slate-700 to-slate-900",     keywords: ["mountain","montaña","cerro","cumbre","peak","fujisan","fuji","alps","alpes","hill","monte"] },
  { icon: "🏖️", gradient: "from-cyan-800 to-blue-950",       keywords: ["beach","playa","costa","bahia","bahía","bay","shore","isla","island"] },
  { icon: "🌊",  gradient: "from-blue-800 to-cyan-950",       keywords: ["ocean","mar","sea","rio","river","lago","lake","waterfall","cascada","falls"] },
  { icon: "🌸",  gradient: "from-pink-900 to-rose-950",       keywords: ["park","parque","garden","jardin","jardín","botanical","flores","sakura","forest","bosque"] },
  { icon: "🎭",  gradient: "from-purple-900 to-violet-950",   keywords: ["museum","museo","gallery","galería","galeria","theater","teatro","arte","art","exhibition"] },
  { icon: "🏟️", gradient: "from-zinc-700 to-zinc-900",       keywords: ["stadium","estadio","arena","coliseo","colosseum"] },
  { icon: "🗼",  gradient: "from-indigo-800 to-blue-950",     keywords: ["tower","torre","eiffel","skytree","tokyo tower"] },
  { icon: "🌉",  gradient: "from-slate-800 to-zinc-950",      keywords: ["bridge","puente","viaduct"] },
  { icon: "🎡",  gradient: "from-violet-800 to-purple-950",   keywords: ["amusement","disneyland","disney","universal","parque de diversiones","ferris","funfair"] },
  { icon: "🌄",  gradient: "from-amber-800 to-orange-950",    keywords: ["mirador","viewpoint","panorama","lookout","observatory","observatorio"] },
  { icon: "🏯",  gradient: "from-blue-800 to-indigo-950",     keywords: ["castle","castillo","fort","fortaleza","kumamoto","himeji","matsumoto","jo","jō"] },
  { icon: "🗿",  gradient: "from-stone-700 to-stone-900",     keywords: ["ruins","ruinas","ancient","antiguo","moai","archaeological","arqueológico","statue"] },
  { icon: "🕌",  gradient: "from-yellow-800 to-amber-950",    keywords: ["mosque","mezquita","cathedral","catedral","church","iglesia","basilica","basílica"] },
  { icon: "🌆",  gradient: "from-blue-900 to-slate-950",      keywords: ["city","ciudad","skyline","downtown","shibuya","shinjuku","akihabara","ginza"] },
  { icon: "⚡",  gradient: "from-yellow-600 to-amber-800",    keywords: ["pokemon","pokémon","pikachu","pokecenter","pokémon center","pokemon center","pokemart"] },
  { icon: "🎌",  gradient: "from-red-800 to-rose-950",        keywords: ["anime","manga","ghibli","studio ghibli","otaku","cosplay","maid cafe","maid café","akiba","nakano broadway","animate","jump"] },
];

const FOOD_ICONS: { icon: string; gradient: string; keywords: string[] }[] = [
  { icon: "🍣",  gradient: "from-rose-800 to-pink-950",       keywords: ["sushi","sashimi","nigiri","maki","omakase"] },
  { icon: "🍱",  gradient: "from-amber-800 to-yellow-950",    keywords: ["bento","izakaya","tempura","tonkatsu","katsu","yakitori","teriyaki","udon","soba"] },
  { icon: "🍕",  gradient: "from-red-800 to-orange-950",      keywords: ["pizza","italiana","italian","trattoria","pasta","risotto"] },
  { icon: "🍔",  gradient: "from-yellow-700 to-amber-900",    keywords: ["burger","hamburgesa","hamburguesa","smash","grill","bbq","americana"] },
  { icon: "🥩",  gradient: "from-red-900 to-rose-950",        keywords: ["steak","asado","parrilla","carne","wagyu","yakiniku","beef","barbecue"] },
  { icon: "🦞",  gradient: "from-orange-800 to-red-950",      keywords: ["seafood","mariscos","lobster","langosta","crab","cangrejo","oyster","ostra","fish","pescado"] },
  { icon: "☕",  gradient: "from-stone-700 to-stone-900",     keywords: ["café","cafe","coffee","espresso","brunch","bakery","panadería","pastelería"] },
  { icon: "🍦",  gradient: "from-pink-700 to-rose-900",       keywords: ["ice cream","helado","gelato","dessert","postre","dulce","sweet"] },
  { icon: "🍺",  gradient: "from-amber-700 to-yellow-900",    keywords: ["bar","cerveza","beer","pub","brewery","craft","cantina"] },
  { icon: "🥟",  gradient: "from-orange-800 to-amber-950",    keywords: ["ramen","gyoza","dumpling","dim sum","noodle","fideos","ichiran","ippudo"] },
];

const ACTIVITY_ICONS: { icon: string; gradient: string; keywords: string[] }[] = [
  { icon: "💍",  gradient: "from-amber-700 to-yellow-900",    keywords: ["anillo","ring","joyería","jewelry"] },
  { icon: "🧑‍🍳", gradient: "from-orange-800 to-red-950",     keywords: ["cooking class","clase de cocina","taller de cocina","ramen making","sushi making"] },
  { icon: "🎨",  gradient: "from-purple-800 to-violet-950",   keywords: ["taller","workshop","clase","class","craft","artesanía","pottery","cerámica"] },
  { icon: "👘",  gradient: "from-rose-800 to-pink-950",       keywords: ["kimono","yukata","disfraz","vestimenta"] },
  { icon: "🥋",  gradient: "from-red-800 to-rose-950",        keywords: ["dojo","artes marciales","martial arts","sumo","judo","karate"] },
  { icon: "🚣",  gradient: "from-cyan-800 to-blue-950",       keywords: ["tour","paseo en bote","crucero","cruise","kayak","rafting","excursion","excursión"] },
  { icon: "🎮",  gradient: "from-indigo-800 to-blue-950",     keywords: ["arcade","videojuego","game center","karaoke"] },
  { icon: "📸",  gradient: "from-zinc-700 to-zinc-900",       keywords: ["fotos","photoshoot","sesion de fotos","sesión de fotos"] },
];

export function getItemIcon(type: string, title: string): string {
  const lower = title.toLowerCase();
  const list = type === "FOOD" ? FOOD_ICONS : type === "ACTIVITY" ? ACTIVITY_ICONS : PLACE_ICONS;
  return list.find((e) => e.keywords.some((k) => lower.includes(k)))?.icon
    ?? (type === "FOOD" ? "🍜" : type === "ACTIVITY" ? "🎯" : "📍");
}

export function getItemGradient(type: string, title: string): string {
  const lower = title.toLowerCase();
  const list = type === "FOOD" ? FOOD_ICONS : type === "ACTIVITY" ? ACTIVITY_ICONS : PLACE_ICONS;
  return list.find((e) => e.keywords.some((k) => lower.includes(k)))?.gradient
    ?? (type === "FOOD" ? "from-orange-700 to-amber-900" : type === "ACTIVITY" ? "from-emerald-700 to-teal-900" : "from-zinc-700 to-zinc-900");
}
