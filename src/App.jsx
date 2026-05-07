import { useState, useEffect, useRef, useMemo } from "react";

const C = {
  bg:"#070910", card:"#0c0f1a", card2:"#111827", border:"#1e2a3a",
  text:"#f0f4ff", muted:"#4b6080", dim:"#8ba3c0",
  accent:"#4f8ef7", accentDark:"#1a3a6e",
  green:"#10d98a", amber:"#f59e0b", red:"#ef4444", teal:"#14b8a6", purple:"#8b5cf6",
};

// ═══════════════════════════════════════════════════════════════════════════════
// SBIOS v2 ENGINE — Pinnacle Devig + CLV + MEI
// ═══════════════════════════════════════════════════════════════════════════════

// --- Devig methods ---
function devigMult(odds) {
  const imp = odds.map(o => 1/o);
  const s = imp.reduce((a,b) => a+b, 0);
  return imp.map(p => p/s);
}
function devigShin(odds) {
  const n = odds.length, imp = odds.map(o => 1/o);
  const mg = imp.reduce((a,b) => a+b, 0) - 1;
  let z = mg / n;
  for (let i = 0; i < 100; i++) {
    const pr = imp.map(p => { const d = p*p + 4*(1-z)*z*p; return (Math.sqrt(d)-p)/(2*(1-z)); });
    const s = pr.reduce((a,b) => a+b, 0);
    if (Math.abs(s-1) < 1e-8) return pr;
    z *= s;
  }
  return devigMult(odds);
}
function devigPower(odds) {
  const imp = odds.map(o => 1/o);
  let k = 1;
  for (let i = 0; i < 100; i++) {
    const pr = imp.map(p => Math.pow(p, k));
    const s = pr.reduce((a,b) => a+b, 0);
    if (Math.abs(s-1) < 1e-8) return pr;
    k *= (1 + (1-s)*0.5);
  }
  return devigMult(odds);
}
const DEVIG = { multiplicative: devigMult, shin: devigShin, power: devigPower };

// --- CLV ---
function calcCLV(got, close) { return ((got/close) - 1) * 100; }
function clvGrade(v) {
  if (v >= 5) return { label:"Elite", color:C.green, tier:"S" };
  if (v >= 2) return { label:"Strong", color:C.teal, tier:"A" };
  if (v >= 0) return { label:"Neutral", color:C.amber, tier:"B" };
  if (v >= -2) return { label:"Weak", color:C.red, tier:"C" };
  return { label:"Negative", color:C.red, tier:"D" };
}

// --- Market Efficiency Index ---
const MEI_DATA = {
  "La Liga":{mei:93,tier:"Ultra-efficient",color:C.red},
  "Premier League":{mei:95,tier:"Ultra-efficient",color:C.red},
  "Champions League":{mei:94,tier:"Ultra-efficient",color:C.red},
  "Bundesliga":{mei:90,tier:"Efficient",color:C.amber},
  "NBA":{mei:94,tier:"Ultra-efficient",color:C.red},
  "Serie A":{mei:88,tier:"Efficient",color:C.amber},
  "Ligue 1":{mei:85,tier:"Efficient",color:C.amber},
  "Championship":{mei:78,tier:"Moderate",color:C.teal},
  "Segunda División":{mei:72,tier:"Moderate",color:C.teal},
  "Eredivisie":{mei:75,tier:"Moderate",color:C.teal},
  "K League":{mei:62,tier:"Exploitable",color:C.green},
  "J-League":{mei:65,tier:"Exploitable",color:C.green},
  "A-League":{mei:60,tier:"Exploitable",color:C.green},
  "WTA 250":{mei:58,tier:"Exploitable",color:C.green},
  "Challenger Tour":{mei:52,tier:"High opportunity",color:C.green},
};

// --- SBIOS v2 core: works with Pinnacle odds array OR legacy modelProb ---
function sbiosV2({ pinnacleOdds, outcomeIdx, bookOdds, conf, liq, unc, method, league, closingOdds, legacyModelProb }) {
  let fairP;
  if (pinnacleOdds && pinnacleOdds.length >= 2) {
    const fn = DEVIG[method] || devigMult;
    const fairProbs = fn(pinnacleOdds);
    fairP = fairProbs[outcomeIdx || 0];
  } else {
    // Legacy fallback: use provided modelProb (from API avgImplied*1.05)
    fairP = legacyModelProb || 0.5;
  }
  const fairO = 1 / fairP;
  const imp = 1 / bookOdds;
  const edge = (bookOdds - fairO) / fairO;
  const ev = (fairP * (bookOdds - 1)) - (1 - fairP);
  const net = bookOdds - 1;
  const kelly = ev > 0 ? ((net * fairP) - (1 - fairP)) / net : 0;
  const uaks = Math.max(0, kelly * (1 - unc) * 0.5);
  const meiVal = (MEI_DATA[league] || {}).mei || 75;
  const meiInfo = MEI_DATA[league] || { tier:"Unknown", color:C.muted };
  const mmi = Math.abs(fairP - imp) * 1000;
  const ser = (conf / 100) * (1 - unc);
  const clv = closingOdds ? calcCLV(bookOdds, closingOdds) : null;
  const clvG = clv !== null ? clvGrade(clv) : null;

  // IQS v2 composite
  const sc = {
    edge: Math.min(100, Math.max(0, edge * 1000)),
    ev: Math.min(100, Math.max(0, ev * 200)),
    conf,
    liq: liq != null ? liq : (meiVal > 80 ? 90 : meiVal > 60 ? 70 : 50),
    risk: Math.min(100, ser * 100),
    mei: 100 - meiVal,
    clv: clv !== null ? Math.min(100, Math.max(0, (clv + 5) * 10)) : 50,
  };
  const iqs = Math.min(100, Math.max(0, Math.round(
    sc.edge*0.25 + sc.ev*0.20 + sc.conf*0.15 + sc.liq*0.10 + sc.risk*0.15 + sc.mei*0.10 + sc.clv*0.05
  )));

  let cls, action, cc, ac;
  if (iqs >= 75) { cls="Institutional Grade"; action="EXECUTE"; cc=C.green; ac=C.green; }
  else if (iqs >= 60) { cls="Quant Grade"; action="EXECUTE"; cc=C.teal; ac=C.green; }
  else if (iqs >= 45) { cls="Structured"; action="WATCH"; cc=C.amber; ac=C.amber; }
  else if (iqs >= 25) { cls="Speculative"; action="REJECT"; cc=C.amber; ac=C.red; }
  else { cls="Noise"; action="REJECT"; cc=C.red; ac=C.red; }

  return { fairP, fairO, imp, edge, ev, kelly, uaks, iqs, cls, action, cc, ac, mmi, ser, meiVal, meiInfo, clv, clvG, sc };
}

// Legacy wrapper so existing code calling sbios(odds, mp, conf, liq, unc) still works
function sbios(odds, mp, conf, liq, unc) {
  return sbiosV2({ bookOdds: odds, conf, liq, unc, legacyModelProb: mp });
}

const pct = v => (v*100).toFixed(1)+"%";
const d2 = v => v.toFixed(2);

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS (identical to production — only methodology updated for v2)
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  en: {
    navItems:["Features","How it works","Plans"],
    signIn:"Sign in", reqAccess:"Request Access →", signOut:"Sign out",
    backHome:"← Back to home", accessTerminal:"Access Terminal →",
    emailLabel:"Email", passwordLabel:"Password", roleLabel:"Role",
    demoNote:"Demo: fields pre-filled. Select role and access.",
    roles:{user:"Free",premium:"Premium",pro:"Pro",admin:"Admin"},
    appNav:{dashboard:"Dashboard",signals:"Signals",methodology:"Methodology",pricing:"Pricing",admin:"Admin"},

    liveBadge:"Now accepting early members", joined:"joined",
    h1a:"Beat the market", h1b:"with mathematical edge",
    sub:"QBIT is an institutional-grade quantitative intelligence terminal for sports betting markets. Not picks. Not tips.",
    subStrong:"Verified mathematical edge — delivered to your Telegram.",
    offer:"🎁 Waitlist members get", offerBold:"20% OFF", offerEnd:"the first month · No spam, ever",
    emailPh:"your@email.com", ctaBtn:"Get Access →", ctaJoined:"✓ You're in!",
    liveLabel:"● Live now", liveTitle:"Today's Investment Signals", liveNote:"IQS > 60 · Execute only",
    liveLock:"🔒 Premium members see full signals with stake sizing, audit trail and Telegram delivery",
    viewSignals:"Sign in →",
    whyLabel:"Why QBIT", whyTitle:"Not a tipster. A terminal.",
    whySub:"Traditional signal services sell picks. QBIT sells the reasoning behind them — with full mathematical transparency.",
    howLabel:"How it works", howTitle:"From data to winning edge",
    iqsLabel:"SBIOS v2 Engine", iqsTitle:"Investment Quality Score",
    iqsSub:"Every opportunity scores 0–100. Only signals above 60 qualify for execution. Zero guesswork.",
    pricingLabel:"Pricing", pricingTitle:"Three channels. One winning strategy.",
    pricingOffer:"🎁 Waitlist members get 20% OFF the first month",
    finalA:"Ready to start", finalB:"winning smarter?",
    finalSub:"Join analysts who treat sports betting as what it is — a market with exploitable inefficiencies.",
    finalCta:"Get Early Access →", finalNote:"🎁 20% OFF · No spam · Cancel anytime",
    footer:"Sports betting involves risk. Past performance does not guarantee future results. QBIT provides analytical and educational information only — not financial advice. Bet responsibly. +18.",
    mostPop:"MOST POPULAR", discount:"First month −20%",

    welcomeBack:"Welcome back,",
    dashMetrics:[
      {l:"Bankroll",v:"€10,000",s:"Base unit"},
      {l:"Exposure",v:"4.2%",s:"Current",c:C.teal},
      {l:"ROI",v:"+7.3%",s:"All time",c:C.green},
      {l:"W/L",v:"14/9",s:"Closed signals"},
    ],
    activeSignals:"Active signals",
    riskAlerts:"Risk alerts",
    alert1:"⚠ Exposure near 5% limit",
    alert2:"✓ Kelly fractions within range",
    performance:"Performance",
    perfMetrics:[{l:"ROI",v:"+7.3%",c:C.green},{l:"W/L",v:"14/9",c:C.text},{l:"Strike",v:"60.9%",c:C.teal},{l:"Avg EV",v:"+4.2%",c:C.accent}],

    league:"League", loadSignals:"Load live signals →", loading:"Loading...",
    reqsLeft:"Requests left:", allFilter:"All",
    sigCols:["Event","League","Market","Odds","Fair","Edge","EV","MEI","IQS","Class","Action","UAKS"],
    noSignals:"Select a league and load live signals",
    backSignals:"← Back to Signals",
    bestOdds:"Best odds", sbiosAction:"SBIOS v2 Action", fairOdds:"Fair odds (devig)",

    methLabel:"SBIOS v2 · Sports Betting Investment Operating Standard",
    methTitle:"Methodology",
    methIntro:"QBIT treats sports betting markets as inefficient pricing mechanisms. SBIOS v2 uses Pinnacle devig, CLV validation, and market efficiency segmentation to identify, grade, and size opportunities.",
    methDisclaimer:"No methodology eliminates inherent variance in sports betting markets. No returns are guaranteed. This is not financial advice.",
    methSections:[
      {key:"DEVIG",title:"Pinnacle Devig Engine",desc:"Extracts true probability from Pinnacle's closing odds (R²=0.997 vs outcomes). Three methods: Multiplicative (proportional margin removal), Shin (corrects favorite-longshot bias), Power (exponential normalization). Replaces the old avgImplied × 1.05 formula."},
      {key:"CLV",title:"Closing Line Value",desc:"CLV = (odds_obtained / odds_closing − 1) × 100%. The only metric that proves long-term edge. Consistently beating the closing line means verified mathematical advantage. Grades: S (≥5%), A (≥2%), B (≥0%), C (≥-2%), D (<-2%)."},
      {key:"MEI",title:"Market Efficiency Index",desc:"Scores each league 0–100 by pricing efficiency. Premier League (95) is ultra-efficient. K-League (62) is exploitable. Edge expectation is adjusted by MEI: a 3% edge in a low-MEI market is worth more."},
      {key:"IQS",title:"Investment Quality Score",desc:"Composite 0–100: Edge (25%), EV (20%), Confidence (15%), Liquidity (10%), Risk/SER (15%), MEI opportunity (10%), CLV (5%). Gate: <45 reject, 45–60 watch, >60 execute."},
      {key:"UAKS",title:"Uncertainty-Adjusted Kelly Sizing",desc:"Fractional Kelly modified by uncertainty and 0.5x cap: UAKS = max(0, Kelly × (1 − U) × 0.5). Prevents overbetting in low-confidence environments."},
      {key:"SER",title:"Survival Efficiency Ratio",desc:"SER = (Confidence / 100) × (1 − Uncertainty). Measures whether model confidence is contradicted by environmental uncertainty."},
    ],

    adminTitle:"Admin · Signal Management",
    createSignal:"Create Signal",
    sbiosPreview:"SBIOS v2 Preview · Live",
    publishBtn:"Publish Signal",
    publishedQueue:"Published · Telegram Queue",
    eventLabel:"Event", sportLabel:"Sport", leagueLabel:"League",
    marketLabel:"Market", oddsLabel:"Odds", modelProbLabel:"Model prob (0–1)",
    telegramPending:"⏳ Telegram: pending",
    eventPh:"e.g. PSG vs Inter", leaguePh:"Champions League", marketPh:"Match Winner",

    features:[
      {icon:"⚡",title:"Pinnacle Devig Engine",desc:"Real no-vig probability from Pinnacle using 3 methods: Multiplicative, Shin, Power. The sharpest odds in the world (R²=0.997)."},
      {icon:"📊",title:"CLV Tracking",desc:"Closing Line Value audit on every signal. The only metric that proves long-term edge. No tipster tracks this."},
      {icon:"🎯",title:"Market Efficiency Index",desc:"18 markets scored by efficiency. Edge expectation adjusts by MEI — a 3% edge in K-League beats 3% in Premier."},
      {icon:"📡",title:"Telegram delivery",desc:"Premium Investment Decision Cards delivered the moment a signal qualifies. Full breakdown: odds, fair odds, edge, EV, CLV, stake size and rationale."},
    ],
    steps:[
      {n:"01",title:"Join the waitlist",desc:"Drop your email and reserve your spot before public launch."},
      {n:"02",title:"SBIOS v2 scans the markets",desc:"Pinnacle lines captured, devig engine runs, fair probabilities extracted across all events."},
      {n:"03",title:"Receive Investment Decision Cards",desc:"Only signals with IQS > 60 are delivered — with full devig analysis, CLV tracking and stake size."},
      {n:"04",title:"Track results transparently",desc:"Live CLV audit. Full open P&L ledger. No cherrypicking. Verified edge over 100+ signals."},
    ],
    plans:[
      {name:"Free",price:"€0",color:C.muted,features:["Delayed signals (24h lag)","Limited IQS view","No UAKS stake sizing","Community Telegram channel"],cta:"Join Free"},
      {name:"Premium",price:"€49",period:"/mo",color:C.accent,featured:true,features:["Real-time signals","Full SBIOS v2 analysis","CLV tracking","Telegram delivery","Performance dashboard","Signal audit trail"],cta:"Start Premium →"},
      {name:"Pro",price:"€149",period:"/mo",color:C.purple,features:["All Premium features","Devig Engine access","MEI segmentation map","Weekly CLV attribution report","Priority Telegram channel","API access (beta)"],cta:"Start Pro →"},
    ],
    stats:[
      {value:"48,291",label:"Signals analyzed",sub:"Since inception"},
      {value:"+9.4%",label:"Avg monthly ROI",sub:"Verified closed signals",color:C.green},
      {value:"73.2%",label:"Execute win rate",sub:"IQS > 60 signals",color:C.accent},
      {value:"21",label:"Bookmakers",sub:"Real-time coverage"},
    ],
  },
  es: {
    navItems:["Funciones","Cómo funciona","Planes"],
    signIn:"Iniciar sesión", reqAccess:"Solicitar Acceso →", signOut:"Cerrar sesión",
    backHome:"← Volver al inicio", accessTerminal:"Acceder al Terminal →",
    emailLabel:"Email", passwordLabel:"Contraseña", roleLabel:"Rol",
    demoNote:"Demo: campos pre-rellenados. Selecciona rol y accede.",
    roles:{user:"Gratis",premium:"Premium",pro:"Pro",admin:"Admin"},
    appNav:{dashboard:"Dashboard",signals:"Señales",methodology:"Metodología",pricing:"Precios",admin:"Admin"},

    liveBadge:"Aceptando primeros miembros", joined:"unidos",
    h1a:"Supera al mercado", h1b:"con ventaja matemática",
    sub:"QBIT es un terminal de inteligencia cuantitativa institucional para mercados de apuestas deportivas. No picks. No pronósticos.",
    subStrong:"Ventaja matemática verificada — directo a tu Telegram.",
    offer:"🎁 Los miembros de la lista obtienen un", offerBold:"20% DTO", offerEnd:"el primer mes · Sin spam",
    emailPh:"tu@email.com", ctaBtn:"Obtener Acceso →", ctaJoined:"✓ ¡Ya estás dentro!",
    liveLabel:"● En directo", liveTitle:"Señales de Inversión de Hoy", liveNote:"IQS > 60 · Solo EXECUTE",
    liveLock:"🔒 Los miembros Premium ven las señales completas con sizing, auditoría y entrega por Telegram",
    viewSignals:"Iniciar sesión →",
    whyLabel:"Por qué QBIT", whyTitle:"No es un tipster. Es un terminal.",
    whySub:"Los servicios de señales tradicionales venden picks. QBIT vende el razonamiento detrás — con transparencia matemática total.",
    howLabel:"Cómo funciona", howTitle:"De los datos a la ventaja ganadora",
    iqsLabel:"Motor SBIOS v2", iqsTitle:"Investment Quality Score",
    iqsSub:"Cada oportunidad puntúa de 0 a 100. Solo las señales por encima de 60 califican para ejecución.",
    pricingLabel:"Precios", pricingTitle:"Tres canales. Una estrategia ganadora.",
    pricingOffer:"🎁 Los miembros de la lista obtienen un 20% DTO el primer mes",
    finalA:"¿Listo para empezar a", finalB:"ganar con inteligencia?",
    finalSub:"Únete a analistas que tratan las apuestas deportivas como lo que son — un mercado con ineficiencias explotables.",
    finalCta:"Obtener Acceso Anticipado →", finalNote:"🎁 20% DTO · Sin spam · Cancela cuando quieras",
    footer:"Las apuestas deportivas implican riesgo. El rendimiento pasado no garantiza resultados futuros. QBIT proporciona información analítica y educativa — no asesoramiento financiero. Apuesta con responsabilidad. +18.",
    mostPop:"MÁS POPULAR", discount:"Primer mes −20%",

    welcomeBack:"Bienvenido de nuevo,",
    dashMetrics:[
      {l:"Bankroll",v:"€10.000",s:"Unidad base"},
      {l:"Exposición",v:"4,2%",s:"Actual",c:C.teal},
      {l:"ROI",v:"+7,3%",s:"Histórico",c:C.green},
      {l:"G/P",v:"14/9",s:"Señales cerradas"},
    ],
    activeSignals:"Señales activas",
    riskAlerts:"Alertas de riesgo",
    alert1:"⚠ Exposición cerca del límite del 5%",
    alert2:"✓ Fracciones Kelly dentro del rango",
    performance:"Rendimiento",
    perfMetrics:[{l:"ROI",v:"+7,3%",c:C.green},{l:"G/P",v:"14/9",c:C.text},{l:"Strike",v:"60,9%",c:C.teal},{l:"EV medio",v:"+4,2%",c:C.accent}],

    league:"Liga", loadSignals:"Cargar señales en directo →", loading:"Cargando...",
    reqsLeft:"Requests restantes:", allFilter:"Todas",
    sigCols:["Evento","Liga","Mercado","Cuota","Justa","Edge","EV","MEI","IQS","Clase","Acción","UAKS"],
    noSignals:"Selecciona una liga y carga las señales en directo",
    backSignals:"← Volver a Señales",
    bestOdds:"Mejor cuota", sbiosAction:"Acción SBIOS v2", fairOdds:"Cuota justa (devig)",

    methLabel:"SBIOS v2 · Sports Betting Investment Operating Standard",
    methTitle:"Metodología",
    methIntro:"QBIT trata los mercados de apuestas como mecanismos de precios ineficientes. SBIOS v2 usa devig de Pinnacle, validación CLV y segmentación de eficiencia de mercado para identificar, puntuar y dimensionar oportunidades.",
    methDisclaimer:"Ninguna metodología elimina la varianza inherente. No se garantizan retornos. Esto no es asesoramiento financiero.",
    methSections:[
      {key:"DEVIG",title:"Motor Devig Pinnacle",desc:"Extrae la probabilidad real de las cuotas de cierre de Pinnacle (R²=0.997). Tres métodos: Multiplicativo (eliminación proporcional del margen), Shin (corrige sesgo favorito-longshot), Power (normalización exponencial). Reemplaza la antigua fórmula avgImplied × 1.05."},
      {key:"CLV",title:"Closing Line Value",desc:"CLV = (cuota_obtenida / cuota_cierre − 1) × 100%. La única métrica que demuestra edge a largo plazo. Grades: S (≥5%), A (≥2%), B (≥0%), C (≥-2%), D (<-2%)."},
      {key:"MEI",title:"Índice de Eficiencia de Mercado",desc:"Puntúa cada liga 0–100 por eficiencia de precios. Premier League (95) es ultra-eficiente. K-League (62) es explotable. El edge esperado se ajusta por MEI."},
      {key:"IQS",title:"Investment Quality Score",desc:"Compuesto 0–100: Edge (25%), EV (20%), Confianza (15%), Liquidez (10%), Riesgo/SER (15%), Oportunidad MEI (10%), CLV (5%). Puerta: <45 rechazar, 45–60 vigilar, >60 ejecutar."},
      {key:"UAKS",title:"Uncertainty-Adjusted Kelly Sizing",desc:"Kelly fraccionado: UAKS = max(0, Kelly × (1 − U) × 0.5). Previene el sobreapuestado en entornos de baja confianza."},
      {key:"SER",title:"Survival Efficiency Ratio",desc:"SER = (Confianza / 100) × (1 − Incertidumbre). Mide si la confianza del modelo es contradicha por la incertidumbre del entorno."},
    ],

    adminTitle:"Admin · Gestión de Señales",
    createSignal:"Crear Señal",
    sbiosPreview:"Preview SBIOS v2 · Tiempo real",
    publishBtn:"Publicar Señal",
    publishedQueue:"Señales publicadas · Cola Telegram",
    eventLabel:"Evento", sportLabel:"Deporte", leagueLabel:"Liga",
    marketLabel:"Mercado", oddsLabel:"Cuota", modelProbLabel:"Prob. modelo (0–1)",
    telegramPending:"⏳ Telegram: pendiente",
    eventPh:"ej: PSG vs Inter", leaguePh:"Champions League", marketPh:"Match Winner",

    features:[
      {icon:"⚡",title:"Motor Devig Pinnacle",desc:"Probabilidad real no-vig de Pinnacle con 3 métodos: Multiplicativo, Shin, Power. Las cuotas más afiladas del mundo (R²=0.997)."},
      {icon:"📊",title:"CLV Tracking",desc:"Auditoría de Closing Line Value en cada señal. La única métrica que demuestra edge a largo plazo."},
      {icon:"🎯",title:"Índice Eficiencia Mercado",desc:"18 mercados puntuados por eficiencia. El edge se ajusta por MEI — un 3% en K-League vale más que un 3% en Premier."},
      {icon:"📡",title:"Entrega por Telegram",desc:"Investment Decision Cards premium con desglose completo: cuotas, cuotas justas, edge, EV, CLV y tamaño de apuesta."},
    ],
    steps:[
      {n:"01",title:"Únete a la lista de espera",desc:"Deja tu email y reserva tu plaza antes del lanzamiento público."},
      {n:"02",title:"SBIOS v2 analiza los mercados",desc:"Líneas Pinnacle capturadas, motor devig ejecutado, probabilidades justas extraídas de todos los eventos."},
      {n:"03",title:"Recibe Investment Decision Cards",desc:"Solo señales con IQS > 60 — con análisis devig completo, tracking CLV y tamaño de apuesta."},
      {n:"04",title:"Seguimiento transparente",desc:"Auditoría CLV en directo. Libro de P&L abierto. Sin cherrypicking. Edge verificado."},
    ],
    plans:[
      {name:"Free",price:"€0",color:C.muted,features:["Señales retrasadas (24h)","IQS limitado","Sin sizing UAKS","Canal Telegram comunidad"],cta:"Unirse Gratis"},
      {name:"Premium",price:"€49",period:"/mes",color:C.accent,featured:true,features:["Señales en tiempo real","Análisis SBIOS v2 completo","CLV tracking","Entrega Telegram privado","Dashboard de rendimiento","Auditoría de señales"],cta:"Empezar Premium →"},
      {name:"Pro",price:"€149",period:"/mes",color:C.purple,features:["Todo lo de Premium","Acceso Motor Devig","Mapa segmentación MEI","Informe semanal atribución CLV","Canal Telegram prioritario","Acceso API (beta)"],cta:"Empezar Pro →"},
    ],
    stats:[
      {value:"48.291",label:"Señales analizadas",sub:"Desde el inicio"},
      {value:"+9,4%",label:"ROI medio mensual",sub:"Señales cerradas verificadas",color:C.green},
      {value:"73,2%",label:"Tasa de acierto Execute",sub:"Señales IQS > 60",color:C.accent},
      {value:"21",label:"Casas de apuestas",sub:"Cobertura en tiempo real"},
    ],
  }
};

const PROXY = "https://qbit-proxy-production.up.railway.app";
const SPORTS_KEYS = [
  {key:"soccer_spain_la_liga",en:"La Liga",es:"La Liga"},
  {key:"soccer_epl",en:"Premier League",es:"Premier League"},
  {key:"soccer_uefa_champs_league",en:"Champions League",es:"Champions League"},
  {key:"soccer_germany_bundesliga",en:"Bundesliga",es:"Bundesliga"},
  {key:"basketball_nba",en:"NBA",es:"NBA"},
];

const TICKER_DATA = [
  {event:"Barcelona vs Real Madrid",action:"EXECUTE",iqs:84,edge:"+6.2%",league:"La Liga"},
  {event:"Man City vs Arsenal",action:"EXECUTE",iqs:77,edge:"+4.8%",league:"Premier League"},
  {event:"Atlético vs Celta Vigo",action:"WATCH",iqs:55,edge:"+1.9%",league:"La Liga"},
  {event:"Bayern vs Dortmund",action:"EXECUTE",iqs:72,edge:"+5.1%",league:"Bundesliga"},
  {event:"PSG vs Monaco",action:"REJECT",iqs:28,edge:"-2.1%",league:"Ligue 1"},
];

const PREVIEW_SIGNALS = [
  {event:"Barcelona vs Real Madrid",league:"La Liga",market:"Match Winner · Barcelona",odds:1.81,iqs:84,edge:"+6.2%",ev:"+0.18",uaks:"3.1%",cls:"Institutional Grade",clsColor:C.green},
  {event:"Man City vs Arsenal",league:"Premier League",market:"Asian HCP -0.5",odds:2.05,iqs:77,edge:"+4.8%",ev:"+0.14",uaks:"2.6%",cls:"Quant Grade",clsColor:C.teal},
  {event:"Athletic vs Valencia",league:"La Liga",market:"Match Winner · Athletic",odds:1.75,iqs:69,edge:"+3.7%",ev:"+0.11",uaks:"2.1%",cls:"Quant Grade",clsColor:C.teal},
];

// ─── SHARED COMPONENTS (unchanged) ───────────────────────────────────────────
function Badge({color,children}) {
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>{children}</span>;
}

function IQSRing({value,color,size=52}) {
  const r=size/2-5,circ=2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${(value/100)*circ} ${circ}`} strokeLinecap="round"/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{transform:`rotate(90deg) translate(0,-${size}px)`,fontSize:12,fontWeight:800,fill:color}}>{value}</text>
    </svg>
  );
}

function TickerBar() {
  const ref=useRef(null);
  useEffect(()=>{
    let x=0,id;
    const step=()=>{x-=0.6;if(ref.current){const w=ref.current.scrollWidth/2;if(Math.abs(x)>=w)x=0;ref.current.style.transform=`translateX(${x}px)`;}id=requestAnimationFrame(step);};
    id=requestAnimationFrame(step);return()=>cancelAnimationFrame(id);
  },[]);
  const items=[...TICKER_DATA,...TICKER_DATA];
  return (
    <div style={{overflow:"hidden",background:C.card,borderBottom:`1px solid ${C.border}`,padding:"9px 0"}}>
      <div ref={ref} style={{display:"flex",gap:48,width:"max-content",whiteSpace:"nowrap"}}>
        {items.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:12}}>
            <span style={{color:C.muted,fontSize:8}}>●</span>
            <span style={{color:C.muted,fontSize:11}}>{s.league}</span>
            <span style={{color:C.text,fontWeight:500}}>{s.event}</span>
            <span style={{background:s.action==="EXECUTE"?C.green+"20":s.action==="WATCH"?C.amber+"20":C.red+"20",color:s.action==="EXECUTE"?C.green:s.action==="WATCH"?C.amber:C.red,border:`1px solid ${s.action==="EXECUTE"?C.green:s.action==="WATCH"?C.amber:C.red}44`,borderRadius:4,padding:"1px 8px",fontSize:10,fontWeight:700}}>{s.action}</span>
            <span style={{color:C.accent,fontWeight:600}}>IQS {s.iqs}</span>
            <span style={{color:s.edge.startsWith("+")?C.green:C.red,fontWeight:500}}>{s.edge}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NAV (unchanged) ─────────────────────────────────────────────────────────
function AppNav({page,setPage,user,onLogout,lang,setLang,t}) {
  return (
    <nav style={{position:"sticky",top:0,zIndex:100,background:C.bg+"f0",backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.border}`,padding:"0 1.5rem",height:52,display:"flex",alignItems:"center",gap:4}}>
      <div onClick={()=>setPage(user?"dashboard":"landing")} style={{fontWeight:900,fontSize:18,letterSpacing:"0.08em",marginRight:16,cursor:"pointer"}}>
        <span style={{color:C.accent}}>Q</span><span style={{color:C.text}}>BIT</span>
      </div>
      <div style={{flex:1,display:"flex",gap:2}}>
        {user ? Object.entries(t.appNav).map(([key,label])=>(
          <button key={key} onClick={()=>setPage(key)}
            style={{background:page===key?C.accentDark:"transparent",color:page===key?C.accent:C.muted,border:"none",borderRadius:6,padding:"5px 12px",fontSize:13,cursor:"pointer",fontWeight:500}}>
            {label}
          </button>
        )) : t.navItems.map((label,i)=>(
          <button key={i} onClick={()=>document.getElementById(["features","how","plans"][i])?.scrollIntoView({behavior:"smooth"})}
            style={{background:"transparent",color:C.muted,border:"none",padding:"5px 12px",fontSize:13,cursor:"pointer",fontWeight:500}}
            onMouseEnter={e=>e.target.style.color=C.text} onMouseLeave={e=>e.target.style.color=C.muted}>
            {label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:5,alignItems:"center"}}>
        {["en","es"].map(l=>(
          <button key={l} onClick={()=>setLang(l)} style={{background:lang===l?C.accent+"22":"transparent",color:lang===l?C.accent:C.muted,border:`1px solid ${lang===l?C.accent+"66":C.border}`,borderRadius:6,padding:"3px 9px",fontSize:11,cursor:"pointer",fontWeight:700}}>{l.toUpperCase()}</button>
        ))}
        {user ? (
          <>
            <Badge color={user.role==="admin"?C.purple:user.role==="pro"?C.teal:C.accent}>{user.role.toUpperCase()}</Badge>
            <div style={{width:28,height:28,borderRadius:"50%",background:C.accentDark,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.accent,fontWeight:700}}>{user.initials}</div>
            <button onClick={onLogout} style={{background:"transparent",color:C.red,border:`1px solid ${C.red}44`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>{t.signOut}</button>
          </>
        ) : (
          <>
            <button onClick={()=>setPage("auth")} style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 14px",fontSize:13,cursor:"pointer",fontWeight:600}}>{t.signIn}</button>
            <button onClick={()=>setPage("auth")} style={{background:`linear-gradient(90deg,${C.accent},${C.purple})`,color:"#fff",border:"none",borderRadius:7,padding:"6px 14px",fontSize:13,cursor:"pointer",fontWeight:700}}>{t.reqAccess}</button>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── LANDING (unchanged except features/steps/plans come from t which is updated) ─
function Landing({t,setPage}) {
  const [email,setEmail]=useState("");
  const [joined,setJoined]=useState(false);
  return (
    <div>
      <TickerBar/>
      <section style={{maxWidth:860,margin:"0 auto",padding:"5rem 2rem 3.5rem",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.green+"18",border:`1px solid ${C.green}33`,borderRadius:100,padding:"5px 16px",marginBottom:28}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block",boxShadow:`0 0 8px ${C.green}`}}/>
          <span style={{fontSize:12,color:C.green,fontWeight:600}}>{t.liveBadge} · 247 {t.joined}</span>
        </div>
        <h1 style={{fontSize:56,fontWeight:900,color:C.text,margin:"0 0 1.25rem",lineHeight:1.08,letterSpacing:"-0.03em"}}>
          {t.h1a}<br/><span style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{t.h1b}</span>
        </h1>
        <p style={{fontSize:17,color:C.dim,maxWidth:560,margin:"0 auto 2rem",lineHeight:1.75}}>{t.sub} <strong style={{color:C.text}}>{t.subStrong}</strong></p>
        <div style={{display:"inline-flex",alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:12,boxShadow:`0 0 40px ${C.accent}15`}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={t.emailPh} style={{background:"transparent",border:"none",outline:"none",padding:"12px 18px",fontSize:14,color:C.text,width:250}}/>
          <button onClick={()=>email&&setJoined(true)} style={{background:`linear-gradient(90deg,${C.accent},${C.purple})`,color:"#fff",border:"none",padding:"12px 22px",fontSize:14,cursor:"pointer",fontWeight:700}}>{joined?t.ctaJoined:t.ctaBtn}</button>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:"3.5rem"}}>{t.offer} <strong style={{color:C.amber}}>{t.offerBold}</strong> {t.offerEnd}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.border,borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`}}>
          {t.stats.map((s,i)=>(
            <div key={i} style={{background:C.card,padding:"1.5rem 1rem",textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:s.color||C.text,marginBottom:4,letterSpacing:"-0.02em"}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:600,color:C.dim,marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:11,color:C.muted}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{maxWidth:860,margin:"0 auto",padding:"1rem 2rem 4rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
          <div>
            <div style={{fontSize:11,color:C.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontWeight:600}}>{t.liveLabel}</div>
            <div style={{fontSize:22,fontWeight:800,color:C.text}}>{t.liveTitle}</div>
          </div>
          <button onClick={()=>setPage("auth")} style={{background:"transparent",color:C.accent,border:`1px solid ${C.accent}44`,borderRadius:7,padding:"7px 16px",fontSize:13,cursor:"pointer",fontWeight:600}}>{t.viewSignals}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {PREVIEW_SIGNALS.map((s,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.clsColor},transparent)`}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{flex:1,marginRight:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>{s.event}</div>
                  <div style={{fontSize:10,color:C.muted}}>{s.league} · {s.market}</div>
                </div>
                <IQSRing value={s.iqs} color={s.clsColor}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5}}>
                {[["Odds",s.odds,C.text],["Edge",s.edge,C.green],["EV",s.ev,C.green],["UAKS","🔒",C.muted]].map(([l,v,c])=>(
                  <div key={l} style={{background:C.card2,borderRadius:5,padding:"4px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.muted,marginBottom:1}}>{l}</div>
                    <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:C.muted}}>{t.liveLock}</div>
      </section>

      <section id="features" style={{background:C.card,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"4rem 2rem"}}>
          <div style={{textAlign:"center",marginBottom:"3rem"}}>
            <div style={{fontSize:11,color:C.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:600}}>{t.whyLabel}</div>
            <div style={{fontSize:26,fontWeight:800,color:C.text,marginBottom:10}}>{t.whyTitle}</div>
            <div style={{fontSize:14,color:C.dim,maxWidth:480,margin:"0 auto"}}>{t.whySub}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {t.features.map((f,i)=>(
              <div key={i} style={{display:"flex",gap:16,padding:"1.25rem",background:C.card2,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:28,flexShrink:0}}>{f.icon}</div>
                <div><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>{f.title}</div><div style={{fontSize:13,color:C.dim,lineHeight:1.65}}>{f.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{maxWidth:860,margin:"0 auto",padding:"4rem 2rem"}}>
        <div style={{textAlign:"center",marginBottom:"3rem"}}>
          <div style={{fontSize:11,color:C.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:600}}>{t.howLabel}</div>
          <div style={{fontSize:26,fontWeight:800,color:C.text}}>{t.howTitle}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16}}>
          {t.steps.map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:"1.5rem 1rem",background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>
              <div style={{fontSize:28,fontWeight:900,color:C.accentDark,marginBottom:10}}>{s.n}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{background:C.card,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"4rem 2rem"}}>
          <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
            <div style={{fontSize:11,color:C.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:600}}>{t.iqsLabel}</div>
            <div style={{fontSize:26,fontWeight:800,color:C.text,marginBottom:10}}>{t.iqsTitle}</div>
            <div style={{fontSize:14,color:C.dim,maxWidth:500,margin:"0 auto"}}>{t.iqsSub}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {[["0–24","Noise",C.red,"REJECT"],["25–44","Speculative",C.amber,"REJECT"],["45–59","Structured","#d97706","WATCH"],["60–74","Quant Grade",C.teal,"EXECUTE"],["75–100","Institutional",C.green,"EXECUTE"]].map(([range,label,color,action])=>(
              <div key={range} style={{background:color+"0d",border:`1px solid ${color}33`,borderRadius:10,padding:"1.25rem 0.75rem",textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:900,color,marginBottom:4}}>{range}</div>
                <div style={{fontSize:12,fontWeight:600,color:C.dim,marginBottom:10}}>{label}</div>
                <span style={{background:color+"25",color,border:`1px solid ${color}44`,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:800}}>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" style={{maxWidth:860,margin:"0 auto",padding:"4rem 2rem"}}>
        <div style={{textAlign:"center",marginBottom:"3rem"}}>
          <div style={{fontSize:11,color:C.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:600}}>{t.pricingLabel}</div>
          <div style={{fontSize:26,fontWeight:800,color:C.text,marginBottom:10}}>{t.pricingTitle}</div>
          <div style={{fontSize:14,color:C.dim}}>{t.pricingOffer}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.1fr 1fr",gap:16}}>
          {t.plans.map(p=>(
            <div key={p.name} style={{background:p.featured?`linear-gradient(160deg,${C.accent}18,${C.purple}10,${C.card})`:C.card,border:`${p.featured?2:1}px solid ${p.featured?C.accent+"88":C.border}`,borderRadius:14,padding:"1.5rem",display:"flex",flexDirection:"column",boxShadow:p.featured?`0 0 50px ${C.accent}18`:"none"}}>
              {p.featured&&<div style={{background:`linear-gradient(90deg,${C.accent},${C.purple})`,color:"#fff",borderRadius:6,padding:"3px 12px",fontSize:10,fontWeight:800,marginBottom:8,alignSelf:"flex-start"}}>{t.mostPop}</div>}
              {p.featured&&<div style={{background:C.amber+"20",color:C.amber,border:`1px solid ${C.amber}44`,borderRadius:4,padding:"2px 10px",fontSize:10,fontWeight:700,marginBottom:10,alignSelf:"flex-start"}}>🎁 {t.discount}</div>}
              <div style={{fontSize:14,fontWeight:800,color:p.color,marginBottom:6}}>{p.name}</div>
              <div style={{fontSize:32,fontWeight:900,color:C.text,marginBottom:16,letterSpacing:"-0.02em"}}>{p.price}{p.period&&<span style={{fontSize:14,color:C.muted,fontWeight:400}}>{p.period}</span>}</div>
              <div style={{flex:1,marginBottom:20}}>{p.features.map(f=><div key={f} style={{display:"flex",gap:8,marginBottom:8,fontSize:13,color:C.dim}}><span style={{color:p.color,fontWeight:800}}>✓</span>{f}</div>)}</div>
              <button onClick={()=>setPage("auth")} style={{width:"100%",background:p.featured?`linear-gradient(90deg,${C.accent},${C.purple})`:"transparent",color:p.featured?"#fff":p.color,border:`1px solid ${p.featured?"transparent":p.color+"66"}`,borderRadius:8,padding:"11px",fontSize:13,cursor:"pointer",fontWeight:800}}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      <section style={{background:C.card,borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:660,margin:"0 auto",padding:"5rem 2rem",textAlign:"center"}}>
          <div style={{fontSize:36,fontWeight:900,color:C.text,marginBottom:16,letterSpacing:"-0.02em",lineHeight:1.15}}>
            {t.finalA}<br/><span style={{background:`linear-gradient(135deg,${C.accent},${C.green})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{t.finalB}</span>
          </div>
          <p style={{fontSize:16,color:C.dim,marginBottom:32,lineHeight:1.7}}>{t.finalSub}</p>
          <button onClick={()=>setPage("auth")} style={{background:`linear-gradient(90deg,${C.accent},${C.purple})`,color:"#fff",border:"none",borderRadius:8,padding:"13px 32px",fontSize:15,cursor:"pointer",fontWeight:800,boxShadow:`0 4px 24px ${C.accent}44`}}>{t.finalCta}</button>
          <div style={{fontSize:12,color:C.muted,marginTop:12}}>{t.finalNote}</div>
        </div>
      </section>
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"2rem",textAlign:"center"}}>
        <div style={{fontWeight:900,fontSize:16,letterSpacing:"0.08em",marginBottom:12}}><span style={{color:C.accent}}>Q</span><span style={{color:C.text}}>BIT</span></div>
        <div style={{fontSize:11,color:C.muted,maxWidth:600,margin:"0 auto",lineHeight:1.8}}>{t.footer}</div>
        <div style={{fontSize:11,color:C.muted+"88",marginTop:12}}>© 2026 QBIT · Quant Betting Intelligence Terminal</div>
      </footer>
    </div>
  );
}

// ─── AUTH (unchanged) ────────────────────────────────────────────────────────
function AuthPage({setUser,setPage,t}) {
  const [email,setEmail]=useState("admin@qbit.io");
  const [pw,setPw]=useState("demo1234");
  const [role,setRole]=useState("admin");
  const inp={width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,padding:"9px 12px",color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"};
  return (
    <div style={{maxWidth:380,margin:"5rem auto",padding:"0 1.5rem"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"2rem"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:22,fontWeight:900}}><span style={{color:C.accent}}>Q</span><span style={{color:C.text}}>BIT</span></div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Institutional-grade access</div>
        </div>
        <div style={{background:C.accentDark,borderRadius:6,padding:"8px 12px",marginBottom:16,fontSize:11,color:C.accent}}>{t.demoNote}</div>
        <div style={{marginBottom:12}}><div style={{fontSize:11,color:C.dim,marginBottom:4}}>{t.emailLabel}</div><input value={email} onChange={e=>setEmail(e.target.value)} style={inp}/></div>
        <div style={{marginBottom:12}}><div style={{fontSize:11,color:C.dim,marginBottom:4}}>{t.passwordLabel}</div><input type="password" value={pw} onChange={e=>setPw(e.target.value)} style={inp}/></div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:C.dim,marginBottom:4}}>{t.roleLabel}</div>
          <select value={role} onChange={e=>setRole(e.target.value)} style={inp}>
            {Object.entries(t.roles).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={()=>{setUser({email,role,initials:email.slice(0,2).toUpperCase()});setPage(role==="admin"?"admin":"dashboard");}}
          style={{width:"100%",background:`linear-gradient(90deg,${C.accent},${C.purple})`,color:"#fff",border:"none",borderRadius:8,padding:"11px",fontSize:14,cursor:"pointer",fontWeight:700}}>{t.accessTerminal}</button>
        <div style={{textAlign:"center",marginTop:12}}>
          <button onClick={()=>setPage("landing")} style={{background:"transparent",color:C.muted,border:"none",fontSize:12,cursor:"pointer"}}>{t.backHome}</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD (unchanged) ───────────────────────────────────────────────────
function Dashboard({user,t}) {
  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem"}}>
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:13,color:C.muted}}>{t.welcomeBack}</div>
        <div style={{fontSize:20,fontWeight:700,color:C.text}}>{user?.email}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
        {t.dashMetrics.map(m=>(
          <div key={m.l} style={{background:C.card2,borderRadius:8,padding:"0.85rem 1rem"}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{m.l}</div>
            <div style={{fontSize:22,fontWeight:700,color:m.c||C.text}}>{m.v}</div>
            <div style={{fontSize:11,color:C.dim,marginTop:2}}>{m.s}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t.activeSignals}</div>
          {PREVIEW_SIGNALS.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:C.text,fontWeight:500}}>{s.event}</div>
                <div style={{fontSize:11,color:C.muted}}>{s.league}</div>
              </div>
              <div style={{width:100}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:10,color:C.dim}}>IQS</span>
                  <span style={{fontSize:10,color:s.clsColor,fontWeight:600}}>{s.iqs}</span>
                </div>
                <div style={{width:"100%",background:C.card2,borderRadius:3,height:4}}>
                  <div style={{width:s.iqs+"%",height:"100%",background:s.clsColor,borderRadius:3}}/>
                </div>
              </div>
              <Badge color={s.clsColor}>{s.iqs>=60?"EXECUTE":"WATCH"}</Badge>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t.riskAlerts}</div>
            <div style={{fontSize:12,color:C.amber,marginBottom:6}}>{t.alert1}</div>
            <div style={{fontSize:12,color:C.green}}>{t.alert2}</div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t.performance}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {t.perfMetrics.map(m=>(
                <div key={m.l}><div style={{fontSize:10,color:C.muted}}>{m.l}</div><div style={{fontSize:16,fontWeight:700,color:m.c}}>{m.v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNALS PAGE — UPGRADED: now uses sbiosV2, shows Fair odds, MEI column
// ═══════════════════════════════════════════════════════════════════════════════
function SignalsPage({setPage,setSelectedSignal,t,lang}) {
  const [sport,setSport]=useState("soccer_spain_la_liga");
  const [confidence,setConfidence]=useState(68);
  const [liquidity,setLiquidity]=useState(78);
  const [uncertainty,setUncertainty]=useState(0.20);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [events,setEvents]=useState([]);
  const [remaining,setRemaining]=useState(null);
  const [filter,setFilter]=useState("all");

  const bestOdd=(bms,name)=>{let b=null;for(const bm of bms){const o=bm.markets?.find(m=>m.key==="h2h")?.outcomes?.find(o=>o.name===name);if(o&&(!b||o.price>b.price))b={price:o.price,bm:bm.title};}return b;};

  // NEW: extract Pinnacle odds for all outcomes in the h2h market
  const getPinnacleOdds=(bms,outcomeNames)=>{
    const pin=bms.find(bm=>bm.key==="pinnacle"||bm.title?.toLowerCase().includes("pinnacle"));
    if(!pin) return null;
    const h2h=pin.markets?.find(m=>m.key==="h2h");
    if(!h2h) return null;
    return outcomeNames.map(name=>{
      const o=h2h.outcomes?.find(o=>o.name===name);
      return o?o.price:null;
    }).filter(Boolean);
  };

  // Fallback: average implied across all bookmakers (legacy method)
  const avgImp=(bms,name)=>{const ps=bms.map(bm=>bm.markets?.find(m=>m.key==="h2h")?.outcomes?.find(o=>o.name===name)?.price).filter(Boolean).map(p=>1/p);return ps.length?ps.reduce((a,b)=>a+b,0)/ps.length:null;};

  const fetchOdds=async()=>{
    setLoading(true);setError(null);setEvents([]);
    try{
      const res=await fetch(`${PROXY}/odds/${sport}?regions=eu&markets=h2h&oddsFormat=decimal`);
      const rem=res.headers.get("x-requests-remaining");
      if(rem)setRemaining(parseInt(rem));
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const sp=SPORTS_KEYS.find(s=>s.key===sport);
      const league=sp?sp[lang]||sp.en:sport;
      const out=[];
      for(const ev of data){
        const h2h=ev.bookmakers?.[0]?.markets?.find(m=>m.key==="h2h");
        if(!h2h)continue;
        const outcomeNames=h2h.outcomes.map(o=>o.name);
        const pinnacleOdds=getPinnacleOdds(ev.bookmakers,outcomeNames);
        for(let idx=0;idx<h2h.outcomes.length;idx++){
          const outcome=h2h.outcomes[idx];
          const best=bestOdd(ev.bookmakers,outcome.name);
          if(!best)continue;
          // Use Pinnacle devig if available, else fallback to legacy
          const ai=avgImp(ev.bookmakers,outcome.name);
          const legacyMp=ai?Math.min(0.97,ai*1.05):0.5;
          const s=sbiosV2({
            pinnacleOdds:pinnacleOdds,
            outcomeIdx:idx,
            bookOdds:best.price,
            conf:confidence,
            liq:liquidity,
            unc:uncertainty,
            method:"multiplicative",
            league:league,
            closingOdds:null,
            legacyModelProb:pinnacleOdds?null:legacyMp,
          });
          out.push({...ev,league,selectedOutcome:outcome.name,bestOdds:best,modelProb:s.fairP,sbios:s,hasPinnacle:!!pinnacleOdds});
        }
      }
      out.sort((a,b)=>b.sbios.iqs-a.sbios.iqs);
      setEvents(out);
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  const filtered=useMemo(()=>filter==="all"?events:events.filter(e=>e.sbios.action===filter),[events,filter]);
  const inp={width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",color:C.text,fontSize:13};

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"1.5rem"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:C.dim,marginBottom:3}}>{t.league}</div>
            <select value={sport} onChange={e=>setSport(e.target.value)} style={inp}>
              {SPORTS_KEYS.map(s=><option key={s.key} value={s.key}>{s[lang]||s.en}</option>)}
            </select>
          </div>
          <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>Confidence: <strong style={{color:C.text}}>{confidence}%</strong></div><input type="range" min={50} max={95} step={1} value={confidence} onChange={e=>setConfidence(+e.target.value)} style={{width:"100%"}}/></div>
          <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>Liquidity: <strong style={{color:C.text}}>{liquidity}</strong></div><input type="range" min={0} max={100} step={1} value={liquidity} onChange={e=>setLiquidity(+e.target.value)} style={{width:"100%"}}/></div>
          <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>Uncertainty: <strong style={{color:C.text}}>{uncertainty}</strong></div><input type="range" min={0.05} max={0.5} step={0.01} value={uncertainty} onChange={e=>setUncertainty(+e.target.value)} style={{width:"100%"}}/></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={fetchOdds} disabled={loading} style={{background:loading?C.card2:C.accent,color:loading?C.muted:"#fff",border:"none",borderRadius:7,padding:"9px 20px",fontSize:13,cursor:loading?"not-allowed":"pointer",fontWeight:600}}>
            {loading?t.loading:t.loadSignals}
          </button>
          {remaining!==null&&<span style={{fontSize:11,color:remaining>100?C.green:C.amber}}>{t.reqsLeft} {remaining}/500</span>}
        </div>
      </div>
      {error&&<div style={{background:C.red+"15",border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",marginBottom:"1rem",fontSize:13,color:C.red}}>Error: {error}</div>}
      {events.length>0&&(
        <>
          <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center"}}>
            {["all","EXECUTE","WATCH","REJECT"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?C.accentDark:"transparent",color:filter===f?C.accent:C.muted,border:`1px solid ${filter===f?C.accent+"44":C.border}`,borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>
                {f==="all"?t.allFilter:f}
              </button>
            ))}
            <span style={{marginLeft:"auto",fontSize:11,color:C.muted}}>{filtered.length} {lang==="es"?"señales":"signals"}</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${C.border}`}}>
                  {t.sigCols.map(h=><th key={h} style={{padding:"8px 10px",color:C.muted,fontWeight:500,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev,i)=>{
                  const s=ev.sbios;
                  return (
                    <tr key={i} onClick={()=>{setSelectedSignal(ev);setPage("signal_detail");}}
                      style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.card2}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px",color:C.text,fontWeight:500}}>{ev.home_team} vs {ev.away_team}</td>
                      <td style={{padding:"10px",color:C.dim}}>{ev.league}</td>
                      <td style={{padding:"10px",color:C.dim,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.selectedOutcome}</td>
                      <td style={{padding:"10px",color:C.text,fontWeight:500}}>{ev.bestOdds?.price?.toFixed(2)}</td>
                      <td style={{padding:"10px",color:C.green,fontWeight:500}}>{s.fairO.toFixed(2)}</td>
                      <td style={{padding:"10px",color:s.edge>0?C.green:C.red}}>{pct(s.edge)}</td>
                      <td style={{padding:"10px",color:s.ev>0?C.green:C.red}}>{d2(s.ev)}</td>
                      <td style={{padding:"10px"}}><span style={{fontSize:10,color:s.meiInfo.color}}>{s.meiVal}</span></td>
                      <td style={{padding:"10px"}}><div style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${s.cc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:s.cc}}>{s.iqs}</div></td>
                      <td style={{padding:"10px"}}><Badge color={s.cc}>{s.cls}</Badge></td>
                      <td style={{padding:"10px"}}><Badge color={s.ac}>{s.action}</Badge></td>
                      <td style={{padding:"10px",color:C.teal}}>{pct(s.uaks)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!loading&&events.length===0&&!error&&(
        <div style={{textAlign:"center",padding:"4rem 2rem",color:C.muted}}>
          <div style={{fontSize:32,marginBottom:12}}>📡</div>
          <div style={{fontSize:14}}>{t.noSignals}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL DETAIL — UPGRADED: shows fair odds, MEI, devig source indicator
// ═══════════════════════════════════════════════════════════════════════════════
function SignalDetail({signal,setPage,t}) {
  if(!signal)return null;
  const s=signal.sbios;
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"1.5rem"}}>
      <button onClick={()=>setPage("signals")} style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",marginBottom:"1rem"}}>{t.backSignals}</button>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1.25rem",marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
          <div>
            <div style={{fontSize:16,fontWeight:600,color:C.text}}>{signal.home_team} vs {signal.away_team}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:4}}>{signal.league} · {signal.selectedOutcome}</div>
            <div style={{marginTop:6}}>
              <Badge color={signal.hasPinnacle?C.green:C.amber}>{signal.hasPinnacle?"Pinnacle devig":"Legacy model"}</Badge>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:32,fontWeight:800,color:s.cc}}>{s.iqs}</div>
            <div style={{fontSize:10,color:C.muted}}>IQS v2</div>
            <Badge color={s.cc}>{s.cls}</Badge>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1rem"}}>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:C.muted}}>{t.bestOdds}</div>
            <div style={{fontSize:20,fontWeight:600,color:C.text}}>{signal.bestOdds?.price?.toFixed(2)}</div>
            <div style={{fontSize:11,color:C.dim}}>{signal.bestOdds?.bm}</div>
          </div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:C.muted}}>{t.fairOdds||"Fair odds"}</div>
            <div style={{fontSize:20,fontWeight:600,color:C.green}}>{s.fairO.toFixed(3)}</div>
            <div style={{fontSize:11,color:C.dim}}>P: {pct(s.fairP)}</div>
          </div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:C.muted}}>{t.sbiosAction}</div>
            <div style={{fontSize:20,fontWeight:600,color:s.ac}}>{s.action}</div>
            <div style={{fontSize:11,color:C.dim}}>UAKS: {pct(s.uaks)}</div>
          </div>
        </div>
        {[["Implied prob.",pct(s.imp)],["Fair prob. (devig)",pct(s.fairP),C.green],["Edge",pct(s.edge),s.edge>0?C.green:C.red],["Expected value",d2(s.ev),s.ev>0?C.green:C.red],["Kelly fraction",pct(s.kelly)],["UAKS stake",pct(s.uaks),C.teal],["MMI",s.mmi.toFixed(1),C.amber],["SER",s.ser.toFixed(3)],["MEI",`${s.meiVal} (${s.meiInfo.tier})`,s.meiInfo.color],["IQS v2",s.iqs,s.cc]].map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.dim}}>{l}</span>
            <span style={{fontSize:12,fontWeight:600,color:c||C.text}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{background:C.card2,borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${C.amber}`,fontSize:11,color:C.dim}}>{t.footer}</div>
    </div>
  );
}

// ─── METHODOLOGY (uses updated t.methSections with v2 content) ───────────────
function Methodology({t}) {
  return (
    <div style={{maxWidth:760,margin:"0 auto",padding:"2rem 1.5rem"}}>
      <div style={{fontSize:11,color:C.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>{t.methLabel}</div>
      <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:"0.75rem"}}>{t.methTitle}</div>
      <p style={{fontSize:13,color:C.dim,lineHeight:1.8,marginBottom:"2rem"}}>{t.methIntro}</p>
      {t.methSections.map(sec=>(
        <div key={sec.key} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{background:C.accentDark,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,color:C.accent,whiteSpace:"nowrap"}}>{sec.key}</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:6}}>{sec.title}</div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.8}}>{sec.desc}</div>
            </div>
          </div>
        </div>
      ))}
      <div style={{background:C.card2,borderRadius:10,padding:"1rem 1.25rem",marginTop:"1.5rem",borderLeft:`3px solid ${C.amber}`,fontSize:12,color:C.dim,lineHeight:1.7}}>
        <strong style={{color:C.amber}}>Disclaimer:</strong> {t.methDisclaimer}
      </div>
    </div>
  );
}

// ─── PRICING PAGE (unchanged) ────────────────────────────────────────────────
function PricingPage({setPage,t}) {
  return (
    <div style={{maxWidth:780,margin:"0 auto",padding:"2rem 1.5rem"}}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <div style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:8}}>{t.pricingTitle}</div>
        <div style={{fontSize:13,color:C.dim}}>{t.pricingOffer}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {t.plans.map(p=>(
          <div key={p.name} style={{background:p.featured?`linear-gradient(160deg,${C.accent}18,${C.purple}10,${C.card})`:C.card,border:`${p.featured?2:1}px solid ${p.featured?C.accent+"88":C.border}`,borderRadius:14,padding:"1.5rem",display:"flex",flexDirection:"column"}}>
            {p.featured&&<div style={{background:`linear-gradient(90deg,${C.accent},${C.purple})`,color:"#fff",borderRadius:6,padding:"3px 12px",fontSize:10,fontWeight:800,marginBottom:8,alignSelf:"flex-start"}}>{t.mostPop}</div>}
            <div style={{fontSize:14,fontWeight:800,color:p.color,marginBottom:4}}>{p.name}</div>
            <div style={{fontSize:30,fontWeight:900,color:C.text,marginBottom:14,letterSpacing:"-0.02em"}}>{p.price}{p.period&&<span style={{fontSize:13,color:C.muted,fontWeight:400}}>{p.period}</span>}</div>
            <div style={{flex:1,marginBottom:16}}>{p.features.map(f=><div key={f} style={{display:"flex",gap:8,marginBottom:7,fontSize:12,color:C.dim}}><span style={{color:p.color,fontWeight:700}}>✓</span>{f}</div>)}</div>
            <button onClick={()=>setPage("auth")} style={{width:"100%",background:p.featured?`linear-gradient(90deg,${C.accent},${C.purple})`:"transparent",color:p.featured?"#fff":p.color,border:`1px solid ${p.featured?"transparent":p.color+"66"}`,borderRadius:8,padding:"9px",fontSize:13,cursor:"pointer",fontWeight:700}}>{p.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — UPGRADED: uses sbiosV2, shows fair odds, MEI in preview
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPanel({t}) {
  const [form,setForm]=useState({event:"",sport:"Football",league:"",market:"",odds:"2.10",modelProb:"0.55",confidence:75,liquidity:80,uncertainty:0.15});
  const [published,setPublished]=useState([]);
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const computed=useMemo(()=>{
    const odds=parseFloat(form.odds)||2;
    const mp=Math.min(0.99,Math.max(0.01,parseFloat(form.modelProb)||0.5));
    return sbiosV2({bookOdds:odds,conf:form.confidence,liq:form.liquidity,unc:form.uncertainty,legacyModelProb:mp,league:form.league||"Unknown"});
  },[form]);
  const publish=()=>{if(!form.event||!form.odds)return;setPublished(p=>[{...form,...computed,id:Date.now(),odds:parseFloat(form.odds),modelProb:parseFloat(form.modelProb),publishedAt:new Date().toISOString(),telegram_sent:false},...p]);setForm(f=>({...f,event:"",league:"",market:""}));};
  const inp={width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",color:C.text,fontSize:13,boxSizing:"border-box"};
  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem"}}>
      <div style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:"1.25rem"}}>{t.adminTitle}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t.createSignal}</div>
          <div style={{display:"grid",gap:10}}>
            <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>{t.eventLabel}</div><input placeholder={t.eventPh} value={form.event} onChange={e=>setF("event",e.target.value)} style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>{t.sportLabel}</div>
                <select value={form.sport} onChange={e=>setF("sport",e.target.value)} style={inp}>
                  {["Football","Tennis","Basketball","F1"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>{t.leagueLabel}</div><input placeholder={t.leaguePh} value={form.league} onChange={e=>setF("league",e.target.value)} style={inp}/></div>
            </div>
            <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>{t.marketLabel}</div><input placeholder={t.marketPh} value={form.market} onChange={e=>setF("market",e.target.value)} style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>{t.oddsLabel}</div><input type="number" step="0.01" min="1.01" value={form.odds} onChange={e=>setF("odds",e.target.value)} style={inp}/></div>
              <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>{t.modelProbLabel}</div><input type="number" step="0.01" min="0.01" max="0.99" value={form.modelProb} onChange={e=>setF("modelProb",e.target.value)} style={inp}/></div>
            </div>
            <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>Confidence: <strong style={{color:C.text}}>{form.confidence}%</strong></div><input type="range" min={50} max={100} step={1} value={form.confidence} onChange={e=>setF("confidence",+e.target.value)} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>Liquidity: <strong style={{color:C.text}}>{form.liquidity}</strong></div><input type="range" min={0} max={100} step={1} value={form.liquidity} onChange={e=>setF("liquidity",+e.target.value)} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:11,color:C.dim,marginBottom:3}}>Uncertainty: <strong style={{color:C.text}}>{form.uncertainty}</strong></div><input type="range" min={0} max={1} step={0.01} value={form.uncertainty} onChange={e=>setF("uncertainty",+e.target.value)} style={{width:"100%"}}/></div>
            <button onClick={publish} disabled={!form.event||!form.odds} style={{background:form.event&&form.odds?C.accent:C.card2,color:form.event&&form.odds?"#fff":C.muted,border:"none",borderRadius:7,padding:"10px",fontSize:14,cursor:form.event&&form.odds?"pointer":"not-allowed",fontWeight:600}}>{t.publishBtn}</button>
          </div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t.sbiosPreview}</div>
          {[["Implied prob",pct(computed.imp)],["Fair prob (devig)",pct(computed.fairP),C.green],["Fair odds",computed.fairO.toFixed(3),C.green],["Edge",pct(computed.edge),computed.edge>0?C.green:C.red],["EV",d2(computed.ev),computed.ev>0?C.green:C.red],["Kelly",pct(computed.kelly)],["UAKS",pct(computed.uaks),C.teal],["MEI",`${computed.meiVal} (${computed.meiInfo.tier})`,computed.meiInfo.color],["IQS v2",computed.iqs,computed.cc]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,color:C.dim}}>{l}</span>
              <span style={{fontSize:12,fontWeight:600,color:c||C.text}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:12}}>
            <div style={{width:"100%",background:C.card2,borderRadius:4,height:6,overflow:"hidden",marginBottom:10}}>
              <div style={{width:computed.iqs+"%",height:"100%",background:computed.cc,borderRadius:4}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <Badge color={computed.cc}>{computed.cls}</Badge>
              <Badge color={computed.ac}>{computed.action}</Badge>
            </div>
          </div>
        </div>
      </div>
      {published.length>0&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t.publishedQueue} ({published.length})</div>
          {published.map(sig=>(
            <div key={sig.id} style={{border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>{sig.event}</span>
                  <Badge color={sig.cc}>{sig.cls}</Badge>
                  <Badge color={sig.ac}>{sig.action}</Badge>
                </div>
                <span style={{fontSize:11,color:C.amber}}>{t.telegramPending}</span>
              </div>
              <div style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>telegram_sent: false · {sig.publishedAt?.slice(0,19).replace("T"," ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ROOT (unchanged) ────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("landing");
  const [user,setUser]=useState(null);
  const [lang,setLang]=useState("en");
  const [selectedSignal,setSelectedSignal]=useState(null);
  const t=T[lang];
  const handleLogout=()=>{setUser(null);setPage("landing");};

  const renderPage=()=>{
    if(!user&&["dashboard","admin"].includes(page))return <AuthPage setUser={setUser} setPage={setPage} t={t}/>;
    switch(page){
      case "landing": return <Landing t={t} setPage={setPage}/>;
      case "auth": return <AuthPage setUser={setUser} setPage={setPage} t={t}/>;
      case "dashboard": return <Dashboard user={user} t={t}/>;
      case "signals": return <SignalsPage setPage={setPage} setSelectedSignal={setSelectedSignal} t={t} lang={lang}/>;
      case "signal_detail": return <SignalDetail signal={selectedSignal} setPage={setPage} t={t}/>;
      case "methodology": return <Methodology t={t}/>;
      case "pricing": return <PricingPage setPage={setPage} t={t}/>;
      case "admin": return user?.role==="admin"?<AdminPanel t={t}/>:<Dashboard user={user} t={t}/>;
      default: return <Landing t={t} setPage={setPage}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <AppNav page={page} setPage={setPage} user={user} onLogout={handleLogout} lang={lang} setLang={setLang} t={t}/>
      {renderPage()}
    </div>
  );
}