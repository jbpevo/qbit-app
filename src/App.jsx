import { useState, useMemo } from "react";

const COLORS = {
  bg: "#0a0c10", bgCard: "#111318", bgCard2: "#161a22",
  border: "#1e2330", text: "#e8ecf4", textMuted: "#6b7591", textDim: "#8a92aa",
  accent: "#4f8ef7", accentDim: "#1e3a6e",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
  purple: "#a78bfa", teal: "#14b8a6",
};

const PROXY = "https://qbit-proxy-production.up.railway.app";

const SPORTS = [
  { key:"soccer_spain_la_liga", label:"La Liga" },
  { key:"soccer_epl", label:"Premier League" },
  { key:"soccer_uefa_champs_league", label:"Champions League" },
  { key:"soccer_germany_bundesliga", label:"Bundesliga" },
  { key:"basketball_nba", label:"NBA" },
  { key:"tennis_atp_french_open", label:"Roland Garros" },
];

function sbios(odds, modelProb, confidence, liquidity, uncertainty) {
  const imp = 1 / odds;
  const net = odds - 1;
  const edge = modelProb - imp;
  const ev = (modelProb * net) - (1 - modelProb);
  const kelly = ((net * modelProb) - (1 - modelProb)) / net;
  const uaks = Math.max(0, kelly * (1 - uncertainty) * 0.5);
  const iqs = Math.min(100, Math.max(0, Math.round(
    Math.min(100,Math.max(0,edge*400))*0.25 +
    Math.min(100,Math.max(0,ev*200))*0.2 +
    confidence*0.2 + liquidity*0.15 +
    Math.max(0,100-uncertainty*200)*0.2
  )));
  let cls, action, cc, ac;
  if (iqs<=20){cls="Noise";action="REJECT";cc=COLORS.red;ac=COLORS.red;}
  else if(iqs<=40){cls="Speculative";action="REJECT";cc=COLORS.amber;ac=COLORS.red;}
  else if(iqs<=60){cls="Structured";action="WATCH";cc=COLORS.amber;ac=COLORS.amber;}
  else if(iqs<=80){cls="Quant Grade";action="EXECUTE";cc=COLORS.teal;ac=COLORS.green;}
  else{cls="Institutional Grade";action="EXECUTE";cc=COLORS.green;ac=COLORS.green;}
  return { imp, edge, ev, kelly, uaks, iqs, cls, action, cc, ac };
}

function bestOdd(bookmakers, name) {
  let best = null;
  for (const bm of bookmakers) {
    const o = bm.markets?.find(m=>m.key==="h2h")?.outcomes?.find(o=>o.name===name);
    if (o && (!best || o.price > best.price)) best = { price: o.price, bm: bm.title };
  }
  return best;
}

function avgImp(bookmakers, name) {
  const ps = bookmakers.map(bm=>bm.markets?.find(m=>m.key==="h2h")?.outcomes?.find(o=>o.name===name)?.price).filter(Boolean).map(p=>1/p);
  return ps.length ? ps.reduce((a,b)=>a+b,0)/ps.length : null;
}

function Badge({ color, children }) {
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:500}}>{children}</span>;
}

const pct = v => (v*100).toFixed(1)+"%";
const d2 = v => v.toFixed(2);

function Nav({ page, setPage, user, onLogout }) {
  const items = [
    {key:"landing",label:"Home"},
    {key:"signals",label:"Signals"},
    {key:"methodology",label:"Methodology"},
    {key:"pricing",label:"Pricing"},
  ];
  if (user) items.splice(1,0,{key:"dashboard",label:"Dashboard"});
  if (user?.role==="admin") items.push({key:"admin",label:"Admin"});
  return (
    <div style={{background:COLORS.bgCard,borderBottom:`1px solid ${COLORS.border}`,display:"flex",alignItems:"center",padding:"0 1.5rem",height:52,gap:4,position:"sticky",top:0,zIndex:100}}>
      <span onClick={()=>setPage("landing")} style={{fontWeight:600,fontSize:15,color:COLORS.text,letterSpacing:"0.04em",marginRight:16,cursor:"pointer"}}>
        <span style={{color:COLORS.accent}}>Q</span>BIT
      </span>
      <div style={{flex:1,display:"flex",gap:2}}>
        {items.map(({key,label})=>(
          <button key={key} onClick={()=>setPage(key)} style={{background:page===key?COLORS.accentDim:"transparent",color:page===key?COLORS.accent:COLORS.textMuted,border:"none",borderRadius:6,padding:"5px 12px",fontSize:13,cursor:"pointer",fontWeight:500}}>{label}</button>
        ))}
      </div>
      {!user ? (
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPage("auth")} style={{background:"transparent",color:COLORS.textMuted,border:`1px solid ${COLORS.border}`,borderRadius:6,padding:"5px 14px",fontSize:13,cursor:"pointer"}}>Sign In</button>
          <button onClick={()=>setPage("auth")} style={{background:COLORS.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:13,cursor:"pointer",fontWeight:500}}>Request Access</button>
        </div>
      ) : (
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Badge color={user.role==="admin"?COLORS.purple:user.role==="pro"?COLORS.teal:COLORS.accent}>{user.role.toUpperCase()}</Badge>
          <div style={{width:30,height:30,borderRadius:"50%",background:COLORS.accentDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:COLORS.accent,fontWeight:600}}>{user.initials}</div>
          <button onClick={onLogout} style={{background:"transparent",color:COLORS.red,border:`1px solid ${COLORS.red}44`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>Sign out</button>
        </div>
      )}
    </div>
  );
}

function LandingPage({ setPage }) {
  return (
    <div style={{maxWidth:800,margin:"0 auto",padding:"3rem 1.5rem"}}>
      <div style={{textAlign:"center",marginBottom:"4rem"}}>
        <div style={{fontSize:11,letterSpacing:"0.15em",color:COLORS.accent,marginBottom:12,textTransform:"uppercase"}}>Quantitative Intelligence Terminal</div>
        <h1 style={{fontSize:38,fontWeight:600,color:COLORS.text,margin:"0 0 1rem",lineHeight:1.2}}>
          <span style={{color:COLORS.accent}}>QBIT</span> · Sports Betting<br/>Investment Intelligence
        </h1>
        <p style={{fontSize:16,color:COLORS.textDim,maxWidth:520,margin:"0 auto 2rem",lineHeight:1.7}}>
          Sports betting decisions measured as investment-grade opportunities. Institutional-grade quantitative analysis, not tipster picks.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={()=>setPage("auth")} style={{background:COLORS.accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,cursor:"pointer",fontWeight:500}}>Request Access</button>
          <button onClick={()=>setPage("methodology")} style={{background:"transparent",color:COLORS.textMuted,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"10px 24px",fontSize:14,cursor:"pointer"}}>View Methodology</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:"2rem"}}>
        {[["0-20","Noise",COLORS.red],["21-40","Speculative",COLORS.amber],["41-60","Structured",COLORS.amber],["61-80","Quant Grade",COLORS.teal],["81-100","Institutional",COLORS.green]].map(([range,label,c])=>(
          <div key={range} style={{background:c+"15",border:`1px solid ${c}44`,borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:12,fontWeight:600,color:c}}>{range}</div>
            <div style={{fontSize:11,color:COLORS.textDim,marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{background:COLORS.bgCard2,borderRadius:10,padding:"1rem 1.25rem",borderLeft:`3px solid ${COLORS.amber}`,fontSize:12,color:COLORS.textDim,lineHeight:1.7}}>
        <strong style={{color:COLORS.amber}}>Disclaimer:</strong> QBIT provides analytical and educational information only. This is not financial advice. No returns are guaranteed. Sports betting involves risk of capital loss.
      </div>
    </div>
  );
}

function AuthPage({ setUser, setPage }) {
  const [email, setEmail] = useState("admin@qbit.io");
  const [role, setRole] = useState("admin");
  const [pw, setPw] = useState("demo1234");
  const submit = () => {
    setUser({ email, role, initials: email.slice(0,2).toUpperCase() });
    setPage(role==="admin"?"admin":"dashboard");
  };
  const inp = {width:"100%",background:COLORS.bgCard2,border:`1px solid ${COLORS.border}`,borderRadius:6,padding:"8px 10px",color:COLORS.text,fontSize:13,boxSizing:"border-box"};
  return (
    <div style={{maxWidth:380,margin:"5rem auto",padding:"0 1.5rem"}}>
      <div style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1.5rem"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:20,fontWeight:600,color:COLORS.text}}><span style={{color:COLORS.accent}}>QBIT</span> Terminal</div>
          <div style={{fontSize:12,color:COLORS.textMuted,marginTop:4}}>Institutional-grade access</div>
        </div>
        <div style={{background:COLORS.accentDim,borderRadius:6,padding:"8px 10px",marginBottom:12,fontSize:11,color:COLORS.accent}}>Demo: selecciona rol y accede</div>
        <div style={{marginBottom:10}}><div style={{fontSize:12,color:COLORS.textDim,marginBottom:3}}>Email</div><input value={email} onChange={e=>setEmail(e.target.value)} style={inp}/></div>
        <div style={{marginBottom:10}}><div style={{fontSize:12,color:COLORS.textDim,marginBottom:3}}>Password</div><input type="password" value={pw} onChange={e=>setPw(e.target.value)} style={inp}/></div>
        <div style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:12,color:COLORS.textDim,marginBottom:3}}>Rol</div>
          <select value={role} onChange={e=>setRole(e.target.value)} style={inp}>
            <option value="user">Free</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button onClick={submit} style={{width:"100%",background:COLORS.accent,color:"#fff",border:"none",borderRadius:7,padding:"10px",fontSize:14,cursor:"pointer",fontWeight:500}}>Acceder al Terminal</button>
      </div>
    </div>
  );
}

function Dashboard({ user }) {
  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem"}}>
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:13,color:COLORS.textMuted}}>Welcome back,</div>
        <div style={{fontSize:20,fontWeight:500,color:COLORS.text}}>{user?.email}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.25rem"}}>
        {[{l:"Bankroll",v:"€10,000",s:"Base unit"},{l:"Exposure",v:"4.2%",s:"Current",c:COLORS.teal},{l:"ROI",v:"+7.3%",s:"All time",c:COLORS.green},{l:"W/L",v:"14/9",s:"Closed signals"}].map(m=>(
          <div key={m.l} style={{background:COLORS.bgCard2,borderRadius:8,padding:"0.85rem 1rem"}}>
            <div style={{fontSize:11,color:COLORS.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{m.l}</div>
            <div style={{fontSize:22,fontWeight:500,color:m.c||COLORS.text}}>{m.v}</div>
            <div style={{fontSize:11,color:COLORS.textDim,marginTop:2}}>{m.s}</div>
          </div>
        ))}
      </div>
      <div style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
        <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Risk alerts</div>
        <div style={{fontSize:12,color:COLORS.amber,marginBottom:6}}>⚠ Exposure near 5% limit</div>
        <div style={{fontSize:12,color:COLORS.green}}>✓ Kelly fractions within range</div>
      </div>
    </div>
  );
}

function SignalsPage({ setPage, setSelectedSignal, user }) {
  const [sport, setSport] = useState("soccer_spain_la_liga");
  const [confidence, setConfidence] = useState(68);
  const [liquidity, setLiquidity] = useState(78);
  const [uncertainty, setUncertainty] = useState(0.20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchOdds = async () => {
    setLoading(true); setError(null); setEvents([]);
    try {
      const res = await fetch(`${PROXY}/odds/${sport}?regions=eu&markets=h2h&oddsFormat=decimal`);
      const rem = res.headers.get("x-requests-remaining");
      if (rem) setRemaining(parseInt(rem));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const league = SPORTS.find(s=>s.key===sport)?.label||sport;
      const out = [];
      for (const ev of data) {
        const h2h = ev.bookmakers?.[0]?.markets?.find(m=>m.key==="h2h");
        if (!h2h) continue;
        for (const outcome of h2h.outcomes) {
          const best = bestOdd(ev.bookmakers, outcome.name);
          const ai = avgImp(ev.bookmakers, outcome.name);
          if (!best||!ai) continue;
          const mp = Math.min(0.97, ai*1.05);
          const s = sbios(best.price, mp, confidence, liquidity, uncertainty);
          out.push({...ev,league,selectedOutcome:outcome.name,bestOdds:best,modelProb:mp,sbios:s});
        }
      }
      out.sort((a,b)=>b.sbios.iqs-a.sbios.iqs);
      setEvents(out);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(()=>filter==="all"?events:events.filter(e=>e.sbios.action===filter),[events,filter]);

  return (
    <div style={{maxWidth:1050,margin:"0 auto",padding:"1.5rem"}}>
      <div style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Liga</div>
            <select value={sport} onChange={e=>setSport(e.target.value)} style={{width:"100%",background:COLORS.bgCard2,border:`1px solid ${COLORS.border}`,borderRadius:6,padding:"7px 10px",color:COLORS.text,fontSize:13}}>
              {SPORTS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Confidence: <strong style={{color:COLORS.text}}>{confidence}%</strong></div>
            <input type="range" min={50} max={95} step={1} value={confidence} onChange={e=>setConfidence(+e.target.value)} style={{width:"100%"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Liquidity: <strong style={{color:COLORS.text}}>{liquidity}</strong></div>
            <input type="range" min={0} max={100} step={1} value={liquidity} onChange={e=>setLiquidity(+e.target.value)} style={{width:"100%"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Uncertainty: <strong style={{color:COLORS.text}}>{uncertainty}</strong></div>
            <input type="range" min={0.05} max={0.5} step={0.01} value={uncertainty} onChange={e=>setUncertainty(+e.target.value)} style={{width:"100%"}}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={fetchOdds} disabled={loading} style={{background:loading?COLORS.bgCard2:COLORS.accent,color:loading?COLORS.textMuted:"#fff",border:"none",borderRadius:7,padding:"9px 20px",fontSize:13,cursor:loading?"not-allowed":"pointer",fontWeight:500}}>
            {loading?"Cargando...":"Cargar señales reales →"}
          </button>
          {remaining!==null&&<span style={{fontSize:11,color:remaining>100?COLORS.green:COLORS.amber}}>Requests restantes: {remaining}/500</span>}
        </div>
      </div>
      {error&&<div style={{background:COLORS.red+"15",border:`1px solid ${COLORS.red}44`,borderRadius:8,padding:"10px 14px",marginBottom:"1rem",fontSize:13,color:COLORS.red}}>Error: {error}</div>}
      {events.length>0&&(
        <>
          <div style={{display:"flex",gap:8,marginBottom:"1rem"}}>
            {["all","EXECUTE","WATCH","REJECT"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?COLORS.accentDim:"transparent",color:filter===f?COLORS.accent:COLORS.textMuted,border:`1px solid ${filter===f?COLORS.accent+"44":COLORS.border}`,borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer"}}>
                {f==="all"?"Todos":f}
              </button>
            ))}
            <span style={{marginLeft:"auto",fontSize:11,color:COLORS.textMuted}}>{filtered.length} señales</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
                  {["Evento","Liga","Mercado","Odd","Edge","EV","IQS","Clasificación","Acción","UAKS"].map(h=>(
                    <th key={h} style={{padding:"8px 10px",color:COLORS.textMuted,fontWeight:500,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev,i)=>{
                  const s=ev.sbios;
                  return (
                    <tr key={i} onClick={()=>{setSelectedSignal(ev);setPage("signal_detail");}}
                      style={{borderBottom:`1px solid ${COLORS.border}`,cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background=COLORS.bgCard2}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <td style={{padding:"10px",color:COLORS.text,fontWeight:500}}>{ev.home_team} vs {ev.away_team}</td>
                      <td style={{padding:"10px",color:COLORS.textDim}}>{ev.league}</td>
                      <td style={{padding:"10px",color:COLORS.textDim,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.selectedOutcome}</td>
                      <td style={{padding:"10px",color:COLORS.text,fontWeight:500}}>{ev.bestOdds?.price?.toFixed(2)}</td>
                      <td style={{padding:"10px",color:s.edge>0?COLORS.green:COLORS.red}}>{pct(s.edge)}</td>
                      <td style={{padding:"10px",color:s.ev>0?COLORS.green:COLORS.red}}>{d2(s.ev)}</td>
                      <td style={{padding:"10px"}}><div style={{width:34,height:34,borderRadius:"50%",border:`2px solid ${s.cc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:s.cc}}>{s.iqs}</div></td>
                      <td style={{padding:"10px"}}><Badge color={s.cc}>{s.cls}</Badge></td>
                      <td style={{padding:"10px"}}><Badge color={s.ac}>{s.action}</Badge></td>
                      <td style={{padding:"10px",color:COLORS.teal}}>{pct(s.uaks)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!loading&&events.length===0&&!error&&(
        <div style={{textAlign:"center",padding:"4rem 2rem",color:COLORS.textMuted}}>
          <div style={{fontSize:32,marginBottom:12}}>📡</div>
          <div style={{fontSize:14}}>Selecciona liga y pulsa "Cargar señales reales"</div>
        </div>
      )}
    </div>
  );
}

function SignalDetail({ signal, setPage }) {
  if (!signal) return null;
  const s = signal.sbios;
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"1.5rem"}}>
      <button onClick={()=>setPage("signals")} style={{background:"transparent",color:COLORS.textMuted,border:`1px solid ${COLORS.border}`,borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",marginBottom:"1rem"}}>← Volver</button>
      <div style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1.25rem",marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
          <div>
            <div style={{fontSize:16,fontWeight:500,color:COLORS.text}}>{signal.home_team} vs {signal.away_team}</div>
            <div style={{fontSize:12,color:COLORS.textMuted,marginTop:4}}>{signal.league} · {signal.selectedOutcome}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:32,fontWeight:700,color:s.cc}}>{s.iqs}</div>
            <div style={{fontSize:10,color:COLORS.textMuted}}>IQS Score</div>
            <Badge color={s.cc}>{s.cls}</Badge>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1rem"}}>
          <div style={{background:COLORS.bgCard2,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:COLORS.textMuted}}>Mejor odd</div>
            <div style={{fontSize:22,fontWeight:500,color:COLORS.text}}>{signal.bestOdds?.price?.toFixed(2)}</div>
            <div style={{fontSize:11,color:COLORS.textDim}}>{signal.bestOdds?.bm}</div>
          </div>
          <div style={{background:COLORS.bgCard2,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:COLORS.textMuted}}>Acción SBIOS</div>
            <div style={{fontSize:22,fontWeight:500,color:s.ac}}>{s.action}</div>
            <div style={{fontSize:11,color:COLORS.textDim}}>UAKS: {pct(s.uaks)}</div>
          </div>
        </div>
        {[["Implied probability",pct(s.imp)],["Model probability",pct(signal.modelProb)],["Edge",pct(s.edge),s.edge>0?COLORS.green:COLORS.red],["Expected value",d2(s.ev),s.ev>0?COLORS.green:COLORS.red],["Kelly fraction",pct(s.kelly)],["UAKS stake",pct(s.uaks),COLORS.teal],["IQS final score",s.iqs,s.cc]].map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${COLORS.border}`}}>
            <span style={{fontSize:12,color:COLORS.textDim}}>{l}</span>
            <span style={{fontSize:12,fontWeight:500,color:c||COLORS.text}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{background:COLORS.bgCard2,borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${COLORS.amber}`,fontSize:11,color:COLORS.textDim}}>
        Disclaimer: Outputs analíticos. No asesoramiento financiero. El betting implica riesgo de pérdida de capital.
      </div>
    </div>
  );
}

function MethodologyPage() {
  const sections = [
    {key:"MMI",title:"Market Mispricing Index",desc:"Measures the absolute divergence between the market implied probability and the model estimated true probability. MMI = |ModelProb - ImpliedProb| × 1000."},
    {key:"PES",title:"Probabilistic Edge Score",desc:"Quantifies the risk-adjusted expected value per unit of exposure, derived from the Kelly equation incorporating net odds, model probability, and implied probability."},
    {key:"UAKS",title:"Uncertainty-Adjusted Kelly Sizing",desc:"Fractional Kelly modified by an uncertainty multiplier and a fixed 0.5x risk cap. Formula: UAKS = Kelly × (1 - U) × 0.5. Prevents overbetting in low-confidence environments."},
    {key:"SER",title:"Survival Efficiency Ratio",desc:"Composite resilience score relating confidence to uncertainty. SER = (Confidence / 100) × (1 - Uncertainty). High SER = model confidence not contradicted by environment."},
    {key:"SPR",title:"Skill Persistence Ratio",desc:"Rolling ratio of positive-EV closed signals to total closed signals. Validates whether historical edge is genuine or variance."},
    {key:"IQS",title:"Investment Quality Score",desc:"Composite 0-100 score: Edge (25%), EV (20%), Confidence (20%), Liquidity (15%), Risk/Uncertainty (20%). Primary decision gate: less than 40 reject, 40-60 watch, greater than 60 execute."},
  ];
  return (
    <div style={{maxWidth:760,margin:"0 auto",padding:"2rem 1.5rem"}}>
      <div style={{fontSize:11,color:COLORS.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>SBIOS · Sports Betting Investment Operating Standard</div>
      <div style={{fontSize:22,fontWeight:500,color:COLORS.text,marginBottom:"0.75rem"}}>Methodology</div>
      <p style={{fontSize:13,color:COLORS.textDim,lineHeight:1.8,marginBottom:"2rem"}}>QBIT treats sports betting markets as inefficient pricing mechanisms subject to quantitative exploitation. SBIOS applies institutional risk management principles to identify, grade, and size opportunities with statistical rigor.</p>
      {sections.map(sec=>(
        <div key={sec.key} style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{background:COLORS.accentDim,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,color:COLORS.accent,whiteSpace:"nowrap"}}>{sec.key}</div>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:COLORS.text,marginBottom:6}}>{sec.title}</div>
              <div style={{fontSize:12,color:COLORS.textDim,lineHeight:1.8}}>{sec.desc}</div>
            </div>
          </div>
        </div>
      ))}
      <div style={{background:COLORS.bgCard2,borderRadius:10,padding:"1rem 1.25rem",marginTop:"1.5rem",borderLeft:`3px solid ${COLORS.amber}`,fontSize:12,color:COLORS.textDim,lineHeight:1.7}}>
        <strong style={{color:COLORS.amber}}>Disclaimer:</strong> No methodology eliminates inherent variance in sports betting markets. No returns are guaranteed. This is not financial advice.
      </div>
    </div>
  );
}

function PricingPage({ setPage }) {
  const plans = [
    {name:"Free",price:"€0",period:"/month",color:COLORS.textMuted,features:["Delayed signals (24h lag)","Limited IQS visibility","No UAKS stake sizing","No Telegram delivery"],cta:"Get Started"},
    {name:"Premium",price:"€49",period:"/month",color:COLORS.accent,featured:true,features:["Full real-time signals","Full IQS (0-100)","UAKS stake recommendations","Telegram Investment Card delivery","Performance dashboard"],cta:"Join Premium"},
    {name:"Pro",price:"€149",period:"/month",color:COLORS.teal,features:["All Premium features","Advanced analytics suite","Bankroll optimization","Weekly performance attribution","Risk diagnostics report"],cta:"Join Pro"},
  ];
  return (
    <div style={{maxWidth:780,margin:"0 auto",padding:"2rem 1.5rem"}}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <div style={{fontSize:22,fontWeight:500,color:COLORS.text,marginBottom:8}}>Subscription plans</div>
        <div style={{fontSize:13,color:COLORS.textDim}}>Institutional-grade intelligence at every level</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        {plans.map(p=>(
          <div key={p.name} style={{background:COLORS.bgCard,border:`${p.featured?"2px":"1px"} solid ${p.featured?p.color+"66":COLORS.border}`,borderRadius:10,padding:"1.25rem",display:"flex",flexDirection:"column"}}>
            {p.featured&&<div style={{background:COLORS.accentDim,color:COLORS.accent,borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:500,marginBottom:10,alignSelf:"flex-start"}}>Most popular</div>}
            <div style={{fontSize:16,fontWeight:500,color:p.color,marginBottom:4}}>{p.name}</div>
            <div style={{fontSize:26,fontWeight:600,color:COLORS.text,marginBottom:2}}>{p.price}<span style={{fontSize:13,color:COLORS.textMuted,fontWeight:400}}>{p.period}</span></div>
            <div style={{flex:1,margin:"1rem 0"}}>
              {p.features.map(f=>(
                <div key={f} style={{display:"flex",gap:8,marginBottom:6,fontSize:12,color:COLORS.textDim}}>
                  <span style={{color:p.color}}>✓</span>{f}
                </div>
              ))}
            </div>
            <button onClick={()=>setPage("auth")} style={{width:"100%",background:p.featured?COLORS.accent:"transparent",color:p.featured?"#fff":p.color,border:`1px solid ${p.color+"66"}`,borderRadius:7,padding:"8px",fontSize:13,cursor:"pointer",fontWeight:500}}>{p.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel() {
  const [form, setForm] = useState({event:"",sport:"Football",league:"",market:"",odds:"2.10",modelProb:"0.55",confidence:75,liquidity:80,uncertainty:0.15});
  const [published, setPublished] = useState([]);
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const computed = useMemo(()=>{
    const odds=parseFloat(form.odds)||2;
    const mp=Math.min(0.99,Math.max(0.01,parseFloat(form.modelProb)||0.5));
    return sbios(odds,mp,form.confidence,form.liquidity,form.uncertainty);
  },[form]);
  const publish=()=>{
    if(!form.event||!form.odds) return;
    setPublished(p=>[{...form,...computed,id:Date.now(),odds:parseFloat(form.odds),modelProb:parseFloat(form.modelProb),publishedAt:new Date().toISOString(),telegram_sent:false,telegram_message_id:null,telegram_channel:null,telegram_sent_at:null},...p]);
    setForm(f=>({...f,event:"",league:"",market:""}));
  };
  const inp={width:"100%",background:COLORS.bgCard2,border:`1px solid ${COLORS.border}`,borderRadius:6,padding:"7px 10px",color:COLORS.text,fontSize:13,boxSizing:"border-box"};
  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem"}}>
      <div style={{fontSize:18,fontWeight:500,color:COLORS.text,marginBottom:"1.25rem"}}>Admin · Signal Management</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1.25rem"}}>
        <div style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
          <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.08em"}}>Crear señal</div>
          <div style={{display:"grid",gap:10}}>
            <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Evento</div><input placeholder="ej: PSG vs Inter" value={form.event} onChange={e=>setF("event",e.target.value)} style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Sport</div>
                <select value={form.sport} onChange={e=>setF("sport",e.target.value)} style={inp}>
                  {["Football","Tennis","Basketball","F1"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Liga</div><input placeholder="Champions League" value={form.league} onChange={e=>setF("league",e.target.value)} style={inp}/></div>
            </div>
            <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Mercado</div><input placeholder="Match Winner" value={form.market} onChange={e=>setF("market",e.target.value)} style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Odds</div><input type="number" step="0.01" min="1.01" value={form.odds} onChange={e=>setF("odds",e.target.value)} style={inp}/></div>
              <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Model prob (0-1)</div><input type="number" step="0.01" min="0.01" max="0.99" value={form.modelProb} onChange={e=>setF("modelProb",e.target.value)} style={inp}/></div>
            </div>
            <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Confidence: <strong style={{color:COLORS.text}}>{form.confidence}%</strong></div><input type="range" min={50} max={100} step={1} value={form.confidence} onChange={e=>setF("confidence",+e.target.value)} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Liquidity: <strong style={{color:COLORS.text}}>{form.liquidity}</strong></div><input type="range" min={0} max={100} step={1} value={form.liquidity} onChange={e=>setF("liquidity",+e.target.value)} style={{width:"100%"}}/></div>
            <div><div style={{fontSize:11,color:COLORS.textDim,marginBottom:3}}>Uncertainty: <strong style={{color:COLORS.text}}>{form.uncertainty}</strong></div><input type="range" min={0} max={1} step={0.01} value={form.uncertainty} onChange={e=>setF("uncertainty",+e.target.value)} style={{width:"100%"}}/></div>
            <button onClick={publish} disabled={!form.event||!form.odds} style={{background:form.event&&form.odds?COLORS.accent:COLORS.bgCard2,color:form.event&&form.odds?"#fff":COLORS.textMuted,border:"none",borderRadius:7,padding:"10px",fontSize:14,cursor:form.event&&form.odds?"pointer":"not-allowed",fontWeight:500}}>Publicar señal</button>
          </div>
        </div>
        <div style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
          <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:14,textTransform:"uppercase",letterSpacing:"0.08em"}}>SBIOS preview · tiempo real</div>
          {[["Implied prob",pct(computed.imp)],["Edge",pct(computed.edge),computed.edge>0?COLORS.green:COLORS.red],["Expected value",d2(computed.ev),computed.ev>0?COLORS.green:COLORS.red],["Kelly fraction",pct(computed.kelly)],["UAKS stake",pct(computed.uaks),COLORS.teal],["IQS score",computed.iqs,computed.cc]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${COLORS.border}`}}>
              <span style={{fontSize:12,color:COLORS.textDim}}>{l}</span>
              <span style={{fontSize:12,fontWeight:500,color:c||COLORS.text}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:12}}>
            <div style={{width:"100%",background:COLORS.bgCard2,borderRadius:4,height:6,overflow:"hidden",marginBottom:10}}>
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
        <div style={{background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"1rem 1.25rem"}}>
          <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.08em"}}>Señales publicadas · Cola Telegram ({published.length})</div>
          {published.map(sig=>(
            <div key={sig.id} style={{border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:500,color:COLORS.text}}>{sig.event}</span>
                  <Badge color={sig.cc}>{sig.cls}</Badge>
                  <Badge color={sig.ac}>{sig.action}</Badge>
                </div>
                <span style={{fontSize:11,color:COLORS.amber}}>⏳ Telegram: pendiente</span>
              </div>
              <div style={{fontSize:10,color:COLORS.textMuted,fontFamily:"monospace"}}>telegram_sent: false · telegram_message_id: null · telegram_sent_at: null</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const handleLogout = () => { setUser(null); setPage("landing"); };

  const renderPage = () => {
    if (!user && ["dashboard","admin"].includes(page)) return <AuthPage setUser={setUser} setPage={setPage}/>;
    switch(page) {
      case "landing": return <LandingPage setPage={setPage}/>;
      case "auth": return <AuthPage setUser={setUser} setPage={setPage}/>;
      case "dashboard": return <Dashboard user={user}/>;
      case "signals": return <SignalsPage setPage={setPage} setSelectedSignal={setSelectedSignal} user={user}/>;
      case "signal_detail": return <SignalDetail signal={selectedSignal} setPage={setPage}/>;
      case "methodology": return <MethodologyPage/>;
      case "pricing": return <PricingPage setPage={setPage}/>;
      case "admin": return user?.role==="admin"?<AdminPanel/>:<Dashboard user={user}/>;
      default: return <LandingPage setPage={setPage}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:COLORS.bg,color:COLORS.text,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <Nav page={page} setPage={setPage} user={user} onLogout={handleLogout}/>
      {renderPage()}
    </div>
  );
}