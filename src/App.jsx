import { useState, useEffect, useRef, useMemo } from "react";

const C = {
  bg:"#070910", card:"#0c0f1a", card2:"#111827", border:"#1e2a3a",
  text:"#f0f4ff", muted:"#4b6080", dim:"#8ba3c0",
  accent:"#4f8ef7", accentDark:"#1a3a6e",
  green:"#10d98a", amber:"#f59e0b", red:"#ef4444", teal:"#14b8a6", purple:"#8b5cf6",
};

// ─── SBIOS ENGINE ─────────────────────────────────────────────────────────────
function sbios(odds, mp, conf, liq, unc) {
  const imp=1/odds, net=odds-1, edge=mp-imp;
  const ev=(mp*net)-(1-mp), kelly=((net*mp)-(1-mp))/net;
  const uaks=Math.max(0,kelly*(1-unc)*0.5);
  const iqs=Math.min(100,Math.max(0,Math.round(
    Math.min(100,Math.max(0,edge*400))*0.25+Math.min(100,Math.max(0,ev*200))*0.2+
    conf*0.2+liq*0.15+Math.max(0,100-unc*200)*0.2
  )));
  let cls,action,cc,ac;
  if(iqs<=20){cls="Noise";action="REJECT";cc=C.red;ac=C.red;}
  else if(iqs<=40){cls="Speculative";action="REJECT";cc=C.amber;ac=C.red;}
  else if(iqs<=60){cls="Structured";action="WATCH";cc=C.amber;ac=C.amber;}
  else if(iqs<=80){cls="Quant Grade";action="EXECUTE";cc=C.teal;ac=C.green;}
  else{cls="Institutional Grade";action="EXECUTE";cc=C.green;ac=C.green;}
  return {imp,edge,ev,kelly,uaks,iqs,cls,action,cc,ac};
}
const pct=v=>(v*100).toFixed(1)+"%";
const d2=v=>v.toFixed(2);

// ─── FULL TRANSLATIONS ────────────────────────────────────────────────────────
const T = {
  en: {
    // NAV & AUTH
    navItems:["Features","How it works","Plans"],
    signIn:"Sign in", reqAccess:"Request Access →", signOut:"Sign out",
    backHome:"← Back to home", accessTerminal:"Access Terminal →",
    emailLabel:"Email", passwordLabel:"Password", roleLabel:"Role",
    demoNote:"Demo: fields pre-filled. Select role and access.",
    roles:{user:"Free",premium:"Premium",pro:"Pro",admin:"Admin"},
    appNav:{dashboard:"Dashboard",signals:"Signals",methodology:"Methodology",pricing:"Pricing",admin:"Admin"},

    // LANDING
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
    iqsLabel:"SBIOS Engine", iqsTitle:"Investment Quality Score",
    iqsSub:"Every opportunity scores 0–100. Only signals above 60 qualify for execution. Zero guesswork.",
    pricingLabel:"Pricing", pricingTitle:"Three channels. One winning strategy.",
    pricingOffer:"🎁 Waitlist members get 20% OFF the first month",
    finalA:"Ready to start", finalB:"winning smarter?",
    finalSub:"Join analysts who treat sports betting as what it is — a market with exploitable inefficiencies.",
    finalCta:"Get Early Access →", finalNote:"🎁 20% OFF · No spam · Cancel anytime",
    footer:"Sports betting involves risk. Past performance does not guarantee future results. QBIT provides analytical and educational information only — not financial advice. Bet responsibly. +18.",
    mostPop:"MOST POPULAR", discount:"First month −20%",

    // DASHBOARD
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

    // SIGNALS
    league:"League", loadSignals:"Load live signals →", loading:"Loading...",
    reqsLeft:"Requests left:", allFilter:"All",
    sigCols:["Event","League","Market","Odds","Edge","EV","IQS","Class","Action","UAKS"],
    noSignals:"Select a league and load live signals",
    backSignals:"← Back to Signals",
    bestOdds:"Best odds", sbiosAction:"SBIOS Action",

    // METHODOLOGY
    methLabel:"SBIOS · Sports Betting Investment Operating Standard",
    methTitle:"Methodology",
    methIntro:"QBIT treats sports betting markets as inefficient pricing mechanisms subject to quantitative exploitation. SBIOS applies institutional risk management principles to identify, grade, and size opportunities with statistical rigor.",
    methDisclaimer:"No methodology eliminates inherent variance in sports betting markets. No returns are guaranteed. This is not financial advice.",
    methSections:[
      {key:"MMI",title:"Market Mispricing Index",desc:"Measures the absolute divergence between market implied probability and model estimated true probability. MMI = |ModelProb - ImpliedProb| × 1000."},
      {key:"PES",title:"Probabilistic Edge Score",desc:"Quantifies risk-adjusted expected value per unit of exposure, derived from the Kelly equation incorporating net odds, model probability, and implied probability."},
      {key:"UAKS",title:"Uncertainty-Adjusted Kelly Sizing",desc:"Fractional Kelly modified by an uncertainty multiplier and 0.5x risk cap. Formula: UAKS = Kelly × (1 - U) × 0.5. Prevents overbetting in low-confidence environments."},
      {key:"SER",title:"Survival Efficiency Ratio",desc:"Composite resilience score: SER = (Confidence / 100) × (1 - Uncertainty). High SER = model confidence not contradicted by environment."},
      {key:"SPR",title:"Skill Persistence Ratio",desc:"Rolling ratio of positive-EV closed signals to total closed signals. Validates whether historical edge is genuine or variance."},
      {key:"IQS",title:"Investment Quality Score",desc:"Composite 0–100 score: Edge (25%), EV (20%), Confidence (20%), Liquidity (15%), Risk (20%). Gate: <40 reject, 40–60 watch, >60 execute."},
    ],

    // ADMIN
    adminTitle:"Admin · Signal Management",
    createSignal:"Create Signal",
    sbiosPreview:"SBIOS Preview · Live",
    publishBtn:"Publish Signal",
    publishedQueue:"Published · Telegram Queue",
    eventLabel:"Event", sportLabel:"Sport", leagueLabel:"League",
    marketLabel:"Market", oddsLabel:"Odds", modelProbLabel:"Model prob (0–1)",
    telegramPending:"⏳ Telegram: pending",
    eventPh:"e.g. PSG vs Inter", leaguePh:"Champions League", marketPh:"Match Winner",

    // PRICING
    features:[
      {icon:"⚡",title:"Real-time edge detection",desc:"SBIOS engine scans 21 bookmakers simultaneously, identifying mispricing before the market corrects. Every signal in under 200ms."},
      {icon:"📐",title:"Kelly-optimized sizing",desc:"Uncertainty-Adjusted Kelly prevents overbetting. Every signal includes a precise bankroll allocation based on model confidence."},
      {icon:"🎯",title:"Investment Quality Score",desc:"0–100 composite score integrating Edge, EV, Confidence, Liquidity and Risk. Only signals above 60 are eligible for execution."},
      {icon:"📡",title:"Telegram delivery",desc:"Premium Investment Decision Cards delivered the moment a signal qualifies. Full breakdown: odds, edge, EV, stake size and rationale."},
    ],
    steps:[
      {n:"01",title:"Join the waitlist",desc:"Drop your email and reserve your spot before public launch."},
      {n:"02",title:"SBIOS scans the markets",desc:"Every day the engine analyzes thousands of events across 21 bookmakers in real time."},
      {n:"03",title:"Receive Investment Decision Cards",desc:"Only signals with IQS > 60 are delivered — with full reasoning, odds, edge and stake size."},
      {n:"04",title:"Track results transparently",desc:"Live settlement updates. No cherrypicking. Full open P&L ledger updated daily."},
    ],
    plans:[
      {name:"Free",price:"€0",color:C.muted,features:["Delayed signals (24h lag)","Limited IQS view","No UAKS stake sizing","Community Telegram channel"],cta:"Join Free"},
      {name:"Premium",price:"€49",period:"/mo",color:C.accent,featured:true,features:["Real-time signals","Full IQS (0–100)","UAKS stake sizing","Private Telegram delivery","Performance dashboard","Signal audit trail"],cta:"Start Premium →"},
      {name:"Pro",price:"€149",period:"/mo",color:C.purple,features:["All Premium features","Advanced analytics suite","Bankroll optimizer","Weekly attribution report","Priority Telegram channel","API access (beta)"],cta:"Start Pro →"},
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
    iqsLabel:"Motor SBIOS", iqsTitle:"Investment Quality Score",
    iqsSub:"Cada oportunidad puntúa de 0 a 100. Solo las señales por encima de 60 califican para ejecución. Cero suposiciones.",
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
    sigCols:["Evento","Liga","Mercado","Cuota","Edge","EV","IQS","Clasificación","Acción","UAKS"],
    noSignals:"Selecciona una liga y carga las señales en directo",
    backSignals:"← Volver a Señales",
    bestOdds:"Mejor cuota", sbiosAction:"Acción SBIOS",

    methLabel:"SBIOS · Sports Betting Investment Operating Standard",
    methTitle:"Metodología",
    methIntro:"QBIT trata los mercados de apuestas deportivas como mecanismos de fijación de precios ineficientes sujetos a explotación cuantitativa. SBIOS aplica principios institucionales de gestión del riesgo para identificar, puntuar y dimensionar oportunidades con rigor estadístico.",
    methDisclaimer:"Ninguna metodología elimina la varianza inherente en los mercados de apuestas deportivas. No se garantizan retornos. Esto no es asesoramiento financiero.",
    methSections:[
      {key:"MMI",title:"Market Mispricing Index",desc:"Mide la divergencia absoluta entre la probabilidad implícita del mercado y la probabilidad verdadera estimada por el modelo. MMI = |ModelProb - ImpliedProb| × 1000."},
      {key:"PES",title:"Probabilistic Edge Score",desc:"Cuantifica el valor esperado ajustado al riesgo por unidad de exposición, derivado de la ecuación de Kelly incorporando cuotas netas, probabilidad del modelo e implícita."},
      {key:"UAKS",title:"Uncertainty-Adjusted Kelly Sizing",desc:"Kelly fraccionado modificado por un multiplicador de incertidumbre y un límite fijo del 0,5x. Fórmula: UAKS = Kelly × (1 - U) × 0,5. Previene el sobreapuestado."},
      {key:"SER",title:"Survival Efficiency Ratio",desc:"Puntuación de resiliencia compuesta: SER = (Confianza / 100) × (1 - Incertidumbre). SER alto = confianza del modelo no contradicha por el entorno."},
      {key:"SPR",title:"Skill Persistence Ratio",desc:"Ratio acumulado de señales cerradas con EV positivo sobre el total. Valida si el edge histórico es genuino o producto de la varianza."},
      {key:"IQS",title:"Investment Quality Score",desc:"Puntuación compuesta 0–100: Edge (25%), EV (20%), Confianza (20%), Liquidez (15%), Riesgo (20%). Puerta de decisión: <40 rechazar, 40–60 vigilar, >60 ejecutar."},
    ],

    adminTitle:"Admin · Gestión de Señales",
    createSignal:"Crear Señal",
    sbiosPreview:"Preview SBIOS · Tiempo real",
    publishBtn:"Publicar Señal",
    publishedQueue:"Señales publicadas · Cola Telegram",
    eventLabel:"Evento", sportLabel:"Deporte", leagueLabel:"Liga",
    marketLabel:"Mercado", oddsLabel:"Cuota", modelProbLabel:"Prob. modelo (0–1)",
    telegramPending:"⏳ Telegram: pendiente",
    eventPh:"ej: PSG vs Inter", leaguePh:"Champions League", marketPh:"Match Winner",

    features:[
      {icon:"⚡",title:"Detección de ventaja en tiempo real",desc:"El motor SBIOS analiza 21 casas simultáneamente, identificando precios erróneos antes de que el mercado corrija. Cada señal en menos de 200ms."},
      {icon:"📐",title:"Sizing optimizado con Kelly",desc:"El Kelly ajustado por incertidumbre evita el sobreapuestado. Cada señal incluye una asignación precisa de bankroll basada en la confianza del modelo."},
      {icon:"🎯",title:"Investment Quality Score",desc:"Puntuación compuesta 0–100 integrando Edge, EV, Confianza, Liquidez y Riesgo. Solo las señales por encima de 60 son elegibles para ejecución."},
      {icon:"📡",title:"Entrega por Telegram",desc:"Investment Decision Cards premium entregadas en el momento en que una señal califica. Desglose completo: cuota, edge, EV, tamaño de apuesta y razonamiento."},
    ],
    steps:[
      {n:"01",title:"Únete a la lista de espera",desc:"Deja tu email y reserva tu plaza antes del lanzamiento público."},
      {n:"02",title:"SBIOS analiza los mercados",desc:"Cada día el motor analiza miles de eventos en 21 casas de apuestas en tiempo real."},
      {n:"03",title:"Recibe Investment Decision Cards",desc:"Solo se entregan señales con IQS > 60 — con razonamiento completo, cuotas, edge y tamaño de apuesta."},
      {n:"04",title:"Seguimiento transparente",desc:"Actualizaciones en directo. Sin cherrypicking. Libro de P&L abierto actualizado diariamente."},
    ],
    plans:[
      {name:"Free",price:"€0",color:C.muted,features:["Señales retrasadas (24h)","IQS limitado","Sin sizing UAKS","Canal Telegram comunidad"],cta:"Unirse Gratis"},
      {name:"Premium",price:"€49",period:"/mes",color:C.accent,featured:true,features:["Señales en tiempo real","IQS completo (0–100)","Sizing UAKS de apuesta","Entrega Telegram privado","Dashboard de rendimiento","Auditoría de señales"],cta:"Empezar Premium →"},
      {name:"Pro",price:"€149",period:"/mes",color:C.purple,features:["Todo lo de Premium","Suite de analítica avanzada","Optimizador de bankroll","Informe semanal de atribución","Canal Telegram prioritario","Acceso API (beta)"],cta:"Empezar Pro →"},
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

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
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

// ─── NAV ──────────────────────────────────────────────────────────────────────
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
        )) : ["Features","Cómo funciona / How it works","Planes / Plans"].slice(0,3).map((_,i)=>(
          <button key={i} onClick={()=>document.getElementById(["features","how","plans"][i])?.scrollIntoView({behavior:"smooth"})}
            style={{background:"transparent",color:C.muted,border:"none",padding:"5px 12px",fontSize:13,cursor:"pointer",fontWeight:500}}
            onMouseEnter={e=>e.target.style.color=C.text} onMouseLeave={e=>e.target.style.color=C.muted}>
            {t.navItems[i]}
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

// ─── LANDING ──────────────────────────────────────────────────────────────────
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
            {[["0–20","Noise",C.red,"REJECT"],["21–40","Speculative",C.amber,"REJECT"],["41–60","Structured","#d97706","WATCH"],["61–80","Quant Grade",C.teal,"EXECUTE"],["81–100","Institutional",C.green,"EXECUTE"]].map(([range,label,color,action])=>(
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

// ─── AUTH ─────────────────────────────────────────────────────────────────────
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

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
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

// ─── SIGNALS ──────────────────────────────────────────────────────────────────
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
        for(const outcome of h2h.outcomes){
          const best=bestOdd(ev.bookmakers,outcome.name);
          const ai=avgImp(ev.bookmakers,outcome.name);
          if(!best||!ai)continue;
          const mp=Math.min(0.97,ai*1.05);
          const s=sbios(best.price,mp,confidence,liquidity,uncertainty);
          out.push({...ev,league,selectedOutcome:outcome.name,bestOdds:best,modelProb:mp,sbios:s});
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
    <div style={{maxWidth:1050,margin:"0 auto",padding:"1.5rem"}}>
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
                      <td style={{padding:"10px",color:s.edge>0?C.green:C.red}}>{pct(s.edge)}</td>
                      <td style={{padding:"10px",color:s.ev>0?C.green:C.red}}>{d2(s.ev)}</td>
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

// ─── SIGNAL DETAIL ────────────────────────────────────────────────────────────
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
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:32,fontWeight:800,color:s.cc}}>{s.iqs}</div>
            <div style={{fontSize:10,color:C.muted}}>IQS Score</div>
            <Badge color={s.cc}>{s.cls}</Badge>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1rem"}}>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:C.muted}}>{t.bestOdds}</div>
            <div style={{fontSize:20,fontWeight:600,color:C.text}}>{signal.bestOdds?.price?.toFixed(2)}</div>
            <div style={{fontSize:11,color:C.dim}}>{signal.bestOdds?.bm}</div>
          </div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:C.muted}}>{t.sbiosAction}</div>
            <div style={{fontSize:20,fontWeight:600,color:s.ac}}>{s.action}</div>
            <div style={{fontSize:11,color:C.dim}}>UAKS: {pct(s.uaks)}</div>
          </div>
        </div>
        {[["Implied prob.",pct(s.imp)],["Model prob.",pct(signal.modelProb)],["Edge",pct(s.edge),s.edge>0?C.green:C.red],["Expected value",d2(s.ev),s.ev>0?C.green:C.red],["Kelly fraction",pct(s.kelly)],["UAKS stake",pct(s.uaks),C.teal],["IQS final",s.iqs,s.cc]].map(([l,v,c])=>(
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

// ─── METHODOLOGY ──────────────────────────────────────────────────────────────
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

// ─── PRICING PAGE ─────────────────────────────────────────────────────────────
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

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminPanel({t}) {
  const [form,setForm]=useState({event:"",sport:"Football",league:"",market:"",odds:"2.10",modelProb:"0.55",confidence:75,liquidity:80,uncertainty:0.15});
  const [published,setPublished]=useState([]);
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const computed=useMemo(()=>{const odds=parseFloat(form.odds)||2;const mp=Math.min(0.99,Math.max(0.01,parseFloat(form.modelProb)||0.5));return sbios(odds,mp,form.confidence,form.liquidity,form.uncertainty);},[form]);
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
          {[["Implied prob",pct(computed.imp)],["Edge",pct(computed.edge),computed.edge>0?C.green:C.red],["EV",d2(computed.ev),computed.ev>0?C.green:C.red],["Kelly",pct(computed.kelly)],["UAKS",pct(computed.uaks),C.teal],["IQS",computed.iqs,computed.cc]].map(([l,v,c])=>(
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

// ─── ROOT ─────────────────────────────────────────────────────────────────────
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