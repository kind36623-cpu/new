import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Brain, Map, Mic, Bookmark, Shield, ArrowRight, Zap, TrendingUp, Activity, ChevronDown } from 'lucide-react';

const FEATURES = [
  { icon: Globe,    title: 'Global News Feed',       desc: 'Real-time world events across 6 intelligence domains — security, economics, culture, sports, and local.',   color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  { icon: Brain,    title: 'AI Intelligence Briefs',  desc: 'Transform headlines into deep analytical reports with background, causes, impacts and predictive timelines.', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  { icon: Map,      title: 'Radar Map',               desc: 'Visualize global events on an interactive intelligence map and see where the world is moving in real-time.',   color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
  { icon: Mic,      title: 'Voice AI — Kira',         desc: 'Speak naturally with your embedded voice assistant. Navigate, ask questions, and get spoken intelligence.',     color: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
  { icon: Bookmark, title: 'Saved Intelligence',      desc: 'Bookmark critical briefs and build a personal intelligence archive accessible at any time.',                   color: '#f59e0b', glow: 'rgba(245,158,11,0.3)'  },
  { icon: Shield,   title: 'Multi-Domain Monitoring', desc: 'Track Security, Economic, Cultural, Sports, and Local feeds — all in one unified command center.',            color: '#ef4444', glow: 'rgba(239,68,68,0.3)'  },
];

const SOURCES = ['Reuters', 'AP News', 'BBC', 'Al Jazeera', 'Bloomberg', 'The Guardian', 'CNN', 'Financial Times', 'The Hindu', 'CNBC', 'Wired', 'TechCrunch'];

function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);
  const sources = useCounter(50, 1800, statsVisible);
  const users   = useCounter(2400, 2000, statsVisible);
  const briefs  = useCounter(18000, 2200, statsVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#06071a', color: '#f1f5f9', fontFamily: "'Inter','Outfit',sans-serif", overflowX: 'hidden' }}>

      {/* ── Animated background ───────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {/* Floating orbs */}
        {[
          { w:600,h:600,top:'-10%',left:'-5%',  color:'rgba(79,70,229,0.12)',  anim:'orbFloat1 18s ease-in-out infinite' },
          { w:500,h:500,top:'30%', right:'-8%', color:'rgba(124,58,237,0.10)', anim:'orbFloat2 22s ease-in-out infinite' },
          { w:400,h:400,bottom:'5%',left:'20%', color:'rgba(59,130,246,0.08)', anim:'orbFloat3 16s ease-in-out infinite' },
        ].map((o, i) => (
          <div key={i} style={{
            position: 'absolute', width: o.w, height: o.h, borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color}, transparent 70%)`,
            top: o.top, left: o.left, right: o.right, bottom: o.bottom,
            filter: 'blur(40px)', animation: o.anim,
          }} />
        ))}
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Noise grain */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 56px', height: 70,
        background: 'rgba(6,7,26,0.7)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#3730a3,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(109,40,217,0.5)',
          }}>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:800, color:'#fff' }}>K</span>
          </div>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:20, fontWeight:700, letterSpacing:'0.06em', background:'linear-gradient(135deg,#a5b4fc,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Kenshiki
          </span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link to="/login" style={{ padding:'9px 22px', borderRadius:30, border:'1px solid rgba(139,92,246,0.35)', color:'#c4b5fd', fontSize:13, fontWeight:600, textDecoration:'none', transition:'all .2s', background:'transparent' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor='#8b5cf6';}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(139,92,246,0.35)';}}>
            Sign In
          </Link>
          <Link to="/login?signup=1" style={{ padding:'9px 22px', borderRadius:30, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 0 24px rgba(109,40,217,0.4)', transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(109,40,217,0.55)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 0 24px rgba(109,40,217,0.4)';}}>
            Get Started →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'100px 24px 80px' }}>

        {/* Live badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 18px', borderRadius:30, border:'1px solid rgba(99,102,241,0.3)', background:'rgba(99,102,241,0.08)', marginBottom:36, animation:'fadeSlideUp 0.8s ease' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#a5b4fc', textTransform:'uppercase' }}>AI-Powered Global Intelligence Platform</span>
        </div>

        <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(38px,6vw,80px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 auto 28px', maxWidth:960, animation:'fadeSlideUp 0.9s 0.1s ease both' }}>
          <span style={{ background:'linear-gradient(135deg,#e2e8f0 0%,#a5b4fc 45%,#c084fc 75%,#818cf8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Monitor the World.
          </span>
          <br />
          <span style={{ background:'linear-gradient(135deg,#c084fc 0%,#818cf8 50%,#a5b4fc 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Understand It Instantly.
          </span>
        </h1>

        <p style={{ fontSize:'clamp(16px,2vw,20px)', color:'#64748b', lineHeight:1.75, maxWidth:580, margin:'0 auto 56px', animation:'fadeSlideUp 1s 0.2s ease both' }}>
          Kenshiki is your AI intelligence command center — combining live news feeds,
          deep AI analysis, an interactive radar map, and a voice assistant in one elegant interface.
        </p>

        <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', animation:'fadeSlideUp 1.1s 0.3s ease both' }}>
          <Link to="/login?signup=1" style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'17px 40px', borderRadius:50, background:'linear-gradient(135deg,#3730a3,#6d28d9,#7c3aed)', color:'#fff', fontSize:16, fontWeight:700, textDecoration:'none', boxShadow:'0 0 48px rgba(109,40,217,0.5)', transition:'all .3s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px) scale(1.03)'; e.currentTarget.style.boxShadow='0 20px 64px rgba(109,40,217,0.65)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 0 48px rgba(109,40,217,0.5)';}}>
            Start Free <ArrowRight size={18}/>
          </Link>
          <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'17px 40px', borderRadius:50, border:'1px solid rgba(148,163,184,0.2)', background:'rgba(255,255,255,0.04)', color:'#94a3b8', fontSize:16, fontWeight:600, textDecoration:'none', transition:'all .3s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(139,92,246,0.4)'; e.currentTarget.style.color='#c4b5fd';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(148,163,184,0.2)'; e.currentTarget.style.color='#94a3b8';}}>
            Sign In
          </Link>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:40, left:'50%', transform:'translateX(-50%)', animation:'bounce 2s ease-in-out infinite', opacity:0.4 }}>
          <ChevronDown size={24} style={{ color:'#64748b' }} />
        </div>
      </section>

      {/* ── MARQUEE SOURCES ──────────────────────────────── */}
      <div style={{ position:'relative', zIndex:1, overflow:'hidden', padding:'24px 0', borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)' }}>
        <div style={{ display:'flex', gap:48, animation:'marquee 22s linear infinite', width:'max-content' }}>
          {[...SOURCES, ...SOURCES].map((s, i) => (
            <span key={i} style={{ fontSize:12, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#334155', whiteSpace:'nowrap' }}>
              <Activity size={12} style={{ display:'inline', marginRight:8, color:'#4f46e5', verticalAlign:'middle' }} />{s}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ────────────────────────────────────────── */}
      <section ref={statsRef} style={{ position:'relative', zIndex:1, padding:'96px 24px', textAlign:'center' }}>
        <div style={{ display:'flex', justifyContent:'center', gap:'clamp(32px,6vw,96px)', flexWrap:'wrap' }}>
          {[
            { val: sources, suffix:'+', label:'Global Sources' },
            { val: users,   suffix:'+', label:'Active Users' },
            { val: briefs,  suffix:'+', label:'AI Briefs Generated' },
          ].map(({ val, suffix, label }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'clamp(40px,5vw,64px)', fontWeight:800, fontFamily:"'Cinzel',serif", background:'linear-gradient(135deg,#a5b4fc,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1 }}>
                {val.toLocaleString()}{suffix}
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginTop:10, letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:1, padding:'0 24px 100px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:72 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:30, border:'1px solid rgba(139,92,246,0.25)', background:'rgba(139,92,246,0.06)', marginBottom:20 }}>
            <Zap size={13} style={{ color:'#a78bfa' }} />
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#a78bfa', textTransform:'uppercase' }}>Capabilities</span>
          </div>
          <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(26px,3.5vw,42px)', fontWeight:700, color:'#e2e8f0', margin:'0 0 16px' }}>Everything You Need to Stay Ahead</h2>
          <p style={{ fontSize:16, color:'#475569', maxWidth:520, margin:'0 auto' }}>Built for analysts, decision-makers, and curious minds who demand more than headlines.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:24 }}>
          {FEATURES.map(({ icon: Icon, title, desc, color, glow }) => (
            <div key={title}
              style={{ padding:'36px 32px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:28, backdropFilter:'blur(12px)', transition:'all .3s', cursor:'default', position:'relative', overflow:'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor=`${color}30`; e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow=`0 24px 60px ${glow}`; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
            >
              {/* Glow orb */}
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:`radial-gradient(circle, ${color}18, transparent 70%)`, pointerEvents:'none' }} />
              <div style={{ width:56, height:56, borderRadius:18, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
                <Icon size={26} style={{ color }} />
              </div>
              <h3 style={{ fontSize:18, fontWeight:700, color:'#e2e8f0', marginBottom:12 }}>{title}</h3>
              <p style={{ fontSize:14, color:'#475569', lineHeight:1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:1, padding:'0 24px 100px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(24px,3.5vw,38px)', fontWeight:700, color:'#e2e8f0', marginBottom:16 }}>How Kenshiki Works</h2>
          <p style={{ fontSize:15, color:'#475569', maxWidth:480, margin:'0 auto' }}>From raw news to actionable intelligence in seconds.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:2, position:'relative' }}>
          {[
            { step:'01', title:'News Ingestion',      desc:'We aggregate real-time feeds from 50+ trusted global sources across all major categories.',            icon:'📡' },
            { step:'02', title:'AI Processing',       desc:'Groq LLaMA 3.3 analyzes, contextualizes, and generates structured intelligence briefs in seconds.',    icon:'🧠' },
            { step:'03', title:'Map Intelligence',    desc:'Events are geocoded and placed on an interactive radar map so you can see where the world is moving.', icon:'🗺️' },
            { step:'04', title:'Voice Interaction',   desc:'Ask KIRA anything — navigate, get briefings, or explore topics using natural voice commands.',          icon:'🎙️' },
          ].map((s, i) => (
            <div key={s.step} style={{ padding:'36px 28px', background:i%2===0?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.06)', position:'relative', overflow:'hidden' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>{s.icon}</div>
              <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.18em', color:'#3730a3', textTransform:'uppercase', marginBottom:10 }}>Step {s.step}</div>
              <h3 style={{ fontSize:17, fontWeight:700, color:'#e2e8f0', marginBottom:10 }}>{s.title}</h3>
              <p style={{ fontSize:13.5, color:'#475569', lineHeight:1.7 }}>{s.desc}</p>
              <div style={{ position:'absolute', top:16, right:20, fontSize:48, opacity:0.04, fontWeight:900, fontFamily:'monospace' }}>{s.step}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DAILY BRIEF PREVIEW ──────────────────────────── */}
      <section style={{ position:'relative', zIndex:1, padding:'0 24px 100px', maxWidth:960, margin:'0 auto' }}>
        <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:28, padding:'48px 40px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)', pointerEvents:'none' }} />
          <div style={{ display:'flex', alignItems:'flex-start', gap:32, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:280 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:20, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', marginBottom:20 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#818cf8', letterSpacing:'0.1em', textTransform:'uppercase' }}>✦ Daily Brief</span>
              </div>
              <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#e2e8f0', marginBottom:16 }}>Your Morning Intelligence Report</h2>
              <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, marginBottom:24 }}>Every day, Kenshiki's AI compiles the top 5 global events you need to know — delivered right to your dashboard before your first coffee.</p>
              <Link to="/login?signup=1" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:30, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none', boxShadow:'0 8px 32px rgba(79,70,229,0.35)', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';}}>
                Get Daily Briefs →
              </Link>
            </div>
            {/* Mock brief card */}
            <div style={{ flex:1, minWidth:280, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'24px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#4ade80', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', display:'inline-block', boxShadow:'0 0 8px #4ade80' }} /> Today's Top Stories
              </div>
              {[
                { tag:'🌍 Geopolitics', text:'Tensions escalate in Eastern Mediterranean as naval exercises begin' },
                { tag:'📈 Economics',   text:'Fed signals pause amid cooling inflation data; markets rally 2.3%' },
                { tag:'🔐 Security',    text:'Critical infrastructure vulnerability patched across 14 nations' },
                { tag:'🚀 Technology', text:'Breakthrough in quantum computing achieves 1,000-qubit milestone' },
                { tag:'🌱 Climate',     text:'IPCC emergency summit called after Arctic temperature anomalies' },
              ].map((item, i) => (
                <div key={i} style={{ padding:'10px 0', borderBottom:i<4?'1px solid rgba(255,255,255,0.05)':'none' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#475569', marginBottom:4, letterSpacing:'0.06em' }}>{item.tag}</div>
                  <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:1, padding:'0 24px 100px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(24px,3vw,36px)', fontWeight:700, color:'#e2e8f0', marginBottom:12 }}>What Our Users Say</h2>
          <p style={{ fontSize:15, color:'#475569' }}>Intelligence professionals, students, and curious minds worldwide.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
          {[
            { quote:"Kenshiki gives me the situational awareness I used to spend hours building manually. The AI briefs are surprisingly deep.", name:'Marcus T.', role:'Policy Analyst, Washington DC', avatar:'MT' },
            { quote:"I love that KIRA can navigate the app and read me headlines while I'm getting ready. It's like a smarter version of the morning news.", name:'Priya S.', role:'Product Manager, Bangalore', avatar:'PS' },
            { quote:"The radar map is incredible. Being able to see geopolitical events mapped in real-time is something I've never seen elsewhere.", name:'James L.', role:'Journalist, London', avatar:'JL' },
          ].map(({ quote, name, role, avatar }) => (
            <div key={name} style={{ padding:'32px 28px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:24, transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(139,92,246,0.25)'; e.currentTarget.style.transform='translateY(-4px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.transform='none';}}>
              <div style={{ fontSize:32, color:'rgba(139,92,246,0.4)', lineHeight:1, marginBottom:16, fontFamily:'Georgia' }}>"</div>
              <p style={{ fontSize:15, color:'#94a3b8', lineHeight:1.75, marginBottom:24, fontStyle:'italic' }}>{quote}</p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>{avatar}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{name}</div>
                  <div style={{ fontSize:11, color:'#475569' }}>{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:1, padding:'80px 24px 120px', textAlign:'center' }}>
        <div style={{ maxWidth:660, margin:'0 auto', padding:'72px 48px', background:'linear-gradient(135deg,rgba(79,70,229,0.12),rgba(124,58,237,0.12))', border:'1px solid rgba(139,92,246,0.2)', borderRadius:36, backdropFilter:'blur(20px)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,0.2),transparent 70%)', pointerEvents:'none' }} />
          <div style={{ width:72, height:72, borderRadius:22, margin:'0 auto 28px', background:'linear-gradient(135deg,#3730a3,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 48px rgba(109,40,217,0.5)' }}>
            <TrendingUp size={32} style={{ color:'#fff' }} />
          </div>
          <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:'clamp(22px,3vw,32px)', fontWeight:700, color:'#e2e8f0', marginBottom:16 }}>Ready to Monitor the World?</h2>
          <p style={{ fontSize:16, color:'#475569', marginBottom:40, lineHeight:1.7 }}>Join Kenshiki and gain AI-powered intelligence that keeps you one step ahead of the world.</p>
          <Link to="/login?signup=1" style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'18px 48px', borderRadius:50, background:'linear-gradient(135deg,#3730a3,#7c3aed)', color:'#fff', fontSize:16, fontWeight:700, textDecoration:'none', boxShadow:'0 0 48px rgba(109,40,217,0.45)', transition:'all .3s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 64px rgba(109,40,217,0.65)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 0 48px rgba(109,40,217,0.45)';}}>
            Create Free Account <ArrowRight size={18}/>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px 56px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <span style={{ fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:700, background:'linear-gradient(135deg,#a5b4fc,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Kenshiki</span>
        <div style={{ display:'flex', gap:24, fontSize:13, color:'#334155' }}>
          <Link to="/about" style={{ color:'#334155', textDecoration:'none' }} onMouseEnter={e=>e.currentTarget.style.color='#a5b4fc'} onMouseLeave={e=>e.currentTarget.style.color='#334155'}>About</Link>
          <Link to="/privacy" style={{ color:'#334155', textDecoration:'none' }} onMouseEnter={e=>e.currentTarget.style.color='#a5b4fc'} onMouseLeave={e=>e.currentTarget.style.color='#334155'}>Privacy</Link>
          <Link to="/terms" style={{ color:'#334155', textDecoration:'none' }} onMouseEnter={e=>e.currentTarget.style.color='#a5b4fc'} onMouseLeave={e=>e.currentTarget.style.color='#334155'}>Terms</Link>
          <Link to="/login" style={{ color:'#334155', textDecoration:'none' }} onMouseEnter={e=>e.currentTarget.style.color='#a5b4fc'} onMouseLeave={e=>e.currentTarget.style.color='#334155'}>Sign In</Link>
        </div>
        <span style={{ fontSize:12, color:'#1e293b' }}>© {new Date().getFullYear()} Kenshiki</span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbFloat1  { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
        @keyframes orbFloat2  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,40px)} }
        @keyframes orbFloat3  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-50px)} }
        @keyframes marquee    { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes bounce     { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(8px)} }
        @keyframes pulse      { 0%,100%{opacity:1;box-shadow:0 0 8px #4ade80} 50%{opacity:0.6;box-shadow:0 0 16px #4ade80} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
