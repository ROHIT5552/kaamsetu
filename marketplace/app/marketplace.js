'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Handshake, ShieldCheck, ClipboardPlus, ClipboardList, Crosshair, HardHat, MapPin, MessageSquare, PaintRoller, PlugZap, Search, UsersRound, Droplets, Hammer, BrickWall } from 'lucide-react';
import { areas, categories, transitions } from '../lib/domain';
import { translate } from './copy';
import { WorkerVerification,VerificationReview } from './verification-panel';

const icons={plumbing:Droplets,electrical:PlugZap,carpentry:Hammer,painting:PaintRoller,masonry:BrickWall,general:HardHat};
const initial={jobs:[],people:[],threads:[],messages:[],offers:[],checks:[]};
const pausedError=['unavailable','geoError'];
const paise=value=>Math.round(Number(value)*100);
const coordinates=position=>({lat:position.coords.latitude,lng:position.coords.longitude});
const fields=event=>Object.fromEntries(new FormData(event.currentTarget));

function tiltTrades(event){
  if(event.pointerType!=='mouse'||!matchMedia('(prefers-reduced-motion: no-preference)').matches)return;
  const stage=event.currentTarget;
  const box=stage.getBoundingClientRect();
  const x=(event.clientX-box.left)/box.width-.5;
  const y=(event.clientY-box.top)/box.height-.5;
  stage.style.setProperty('--pitch',(-y*12).toFixed(2)+'deg');
  stage.style.setProperty('--yaw',(x*16).toFixed(2)+'deg');
}
function resetTilt(event){
  event.currentTarget.style.removeProperty('--pitch');
  event.currentTarget.style.removeProperty('--yaw');
}

export default function Marketplace(){
  const [locale,setLocale]=useState('en'),[view,setView]=useState('find'),[data,setData]=useState(initial);
  const [trade,setTrade]=useState(''),[areaFilter,setAreaFilter]=useState(''),[search,setSearch]=useState('');
  const [near,setNear]=useState(null),[thread,setThread]=useState(''),[apply,setApply]=useState('');
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false),[signup,setSignup]=useState(false),[sharing,setSharing]=useState(false);
  const [signupRole,setSignupRole]=useState('employer');
  const sharingRef=useRef(null),requestVersion=useRef(0);
  const t=key=>translate(locale,key);
  const cash=value=>new Intl.NumberFormat(locale+'-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value)/100);
  const date=value=>new Intl.DateTimeFormat(locale+'-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  const refresh=useCallback(async()=>{
    const version=++requestVersion.current;
    const params=new URLSearchParams(thread?{thread}:{});
    if(near){params.set('lat',near.lat.toFixed(3));params.set('lng',near.lng.toFixed(3));}
    try {
      const res=await fetch('/api/market?'+params,{cache:'no-store'});
      const next=await res.json();
      if(!res.ok) throw Error(next.error);
      if(version===requestVersion.current){setData(next);setLoaded(true);setError(current=>current==='unavailable'?'':current);}
    }catch{if(version===requestVersion.current){setError('unavailable');setLoaded(true);}}
  },[thread,near]);
  useEffect(()=>{refresh(); const timer=setInterval(refresh,5000);return()=>clearInterval(timer);},[refresh]);
  useEffect(()=>{const saved=localStorage.getItem('ks_language');if(['en','mr','hi'].includes(saved))setLocale(saved);},[]);
  useEffect(()=>{document.documentElement.lang=locale;localStorage.setItem('ks_language',locale);},[locale]);
  async function request(action,input){
    const res=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,input})});
    const result=await res.json();
    if(!res.ok)throw Error(result.error);
    return result;
  }
  async function send(action,input,done){
    setBusy(true);setError('');setNotice('');
    try {const result=await request(action,input);done?.(result);await refresh();setNotice('saved');}
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  function go(next){setView(next);setError('');setNotice('');}
  function startJourney(){
    if(role){go(role==='worker'?'profile':'post');return;}
    setSignupRole(view==='work'?'worker':'employer');
    setSignup(true);
    go('auth');
  }
  function locate(){
    if(!navigator.geolocation){setError('geoError');return;}
    navigator.geolocation.getCurrentPosition(p=>{setNear(coordinates(p));setError('');},()=>setError('geoError'),{timeout:12000});
  }
  const conversationCurrent=data.thread===thread;
  const selected=data.threads.find(row=>row.id===thread);
  useEffect(()=>{setSharing(false);},[view]);
  const booking=selected?.booking;
  useEffect(()=>{
    if(!sharing || !thread || booking!=='en_route' || view!=='inbox')return;
    let latest=0;
    const watch=navigator.geolocation.watchPosition(position=>{
      const now=Date.now();
      if(now-latest<4500)return;
      latest=now;
      const pending=request('location',{id:thread,point:coordinates(position)}).catch(()=>setError('geoError'));
      sharingRef.current=pending;
    },()=>{setError('geoError');setSharing(false);},{enableHighAccuracy:true,timeout:15000});
    return ()=>{
      navigator.geolocation.clearWatch(watch);
      Promise.resolve(sharingRef.current).then(()=>request('location',{id:thread,point:null})).catch(()=>{});
    };
  },[sharing,thread,booking,view]);
  function select(id){setSharing(false);setThread(id);}
  const list=(view==='find'?data.people:data.jobs).filter(item=>
    (!trade||item.category===trade)&&(!areaFilter||item.area===areaFilter)&&
    [item.name,item.title,item.area,t(item.category),item.bio,item.description].join(' ').toLowerCase().includes(search.toLowerCase()));
  const role=data.user?.role;
  const browse=view==='find'||view==='work';
  const actions=Object.entries(transitions[selected?.booking]||{}).filter(([,who])=>who==='either'||who===role);
  const categoryField=(value)=> <label>{t('category')}<select name="category" defaultValue={value}>{categories.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></label>;
  const areaField=(value)=> <label>{t('area')}<select name="area" defaultValue={value}>{areas.map(a=><option key={a}>{a}</option>)}</select></label>;
  const quoteFields=(value)=> <><label>{t('amount')}<input required name="amount" type="number" min="50" max="1000000" step=".01" defaultValue={value}/></label><label>{t('note')}<textarea name="note" required maxLength={500}/></label></>;

  return <>
    <header className="top"><div className="top-inner">
      <button className="brand" onClick={()=>go('find')}><span><HardHat size={21}/></span>SWABHIMAN</button>
      <nav aria-label={t('find')}>
        <button aria-current={view==='find'?'page':undefined} onClick={()=>go('find')}>{t('find')}</button>
        <button aria-current={view==='work'?'page':undefined} onClick={()=>go('work')}>{t('work')}</button>
        {role&&<button aria-current={view==='inbox'?'page':undefined} onClick={()=>go('inbox')}>{t('inbox')}</button>}
        {data.user?.reviewer_account&&<button aria-current={view==='review'?'page':undefined} onClick={()=>go('review')}>{t('review')}</button>}
      </nav>
      <div className="tools"><select aria-label="Language" value={locale} onChange={e=>setLocale(e.target.value)}><option value="mr">मराठी</option><option value="hi">हिन्दी</option><option value="en">English</option></select>
        {role?<button className="quiet" disabled={busy} onClick={()=>{setSharing(false);send('logout',{},()=>{select('');setData(current=>({...current,user:null,threads:[],messages:[],offers:[]}));go('find');});}}>{t('logout')}</button>:<button className="quiet" onClick={()=>{setSignup(false);go('auth');}}>{t('login')}</button>}
      </div>
    </div></header>

    <main>
      {browse&&<section className="hero"><div className="hero-content">
        <h1>{t(view==='work'?'workerHero':'hero')}</h1>
        <div className="place"><MapPin size={16}/> {t('city')}</div>
        <p>{t(view==='work'?'workerIntro':'intro')}</p>
        <div className="buttons">
          <button className="primary" onClick={startJourney}>{t(role==='worker'?'profile':!role&&view==='work'?'workerStart':'post')} <ArrowRight size={17}/></button>
          <button className="on-dark" onClick={locate}><Crosshair size={17}/> {t(near?'nearbyOn':'nearby')}</button>
        </div>
      </div><section className="hero-trades" aria-labelledby="trade-title">
        <h2 id="trade-title">{t('browseTrades')}</h2>
        <div className="trade-stage" onPointerMove={tiltTrades} onPointerLeave={resetTilt}>
          <div className="trade-grid">{categories.map(category=>{
          const Icon=icons[category];
          return <button key={category} data-trade={category} aria-pressed={trade===category} aria-controls="market-results"
            onClick={()=>setTrade(trade===category?'':category)}><span className="icon" aria-hidden="true"><Icon size={29} strokeWidth={1.75}/></span><span>{t(category)}</span></button>;
          })}</div>
        </div>
      </section></section>}
      {browse&&<section className="journey" aria-labelledby="journey-title">
        <h2 id="journey-title">{t(view==='find'?'howHire':'howWork')}</h2>
        <ol>{(view==='find'?[[ClipboardPlus,'stepPost'],[MessageSquare,'stepCompare'],[Handshake,'stepBook']]:[[ShieldCheck,'stepVerify'],[Search,'stepFind'],[Handshake,'stepAgree']]).map(([Icon,key])=>
          <li key={key}><Icon size={20} aria-hidden="true"/><div><strong>{t(key)}</strong><small>{t(key+'Detail')}</small></div></li>)}</ol>
      </section>}
      {!browse&&<div className="page-heading"><h1>{t(view==='auth'?(signup?'signup':'login'):view)}</h1>{data.user&&<p>{data.user.name} · {t(role)}</p>}</div>}
      {error&&<div role="alert" className="feedback error">{t(error)} {pausedError.includes(error)&&<button className="quiet" onClick={error==='geoError'?locate:refresh}>{error==='geoError'?t('nearby'):t('loading')}</button>}</div>}
      {notice&&<div role="status" className="feedback">{t(notice)}</div>}
      {!loaded&&<p role="status">{t('loading')}</p>}

      {browse&&<section className="results" id="market-results">
        <div className="section-head"><div className="result-title"><h2>{t(view)}{trade?' · '+t(trade):''}</h2>
          {trade&&<button className="quiet" onClick={()=>setTrade('')}><UsersRound size={17}/>{t('all')}</button>}</div>
          {near&&<small>{t('nearest')}</small>}</div>
        <div className="filters"><label className="search"><Search size={18}/><input aria-label={t('search')} placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/></label>
          <select aria-label={t('area')} value={areaFilter} onChange={e=>setAreaFilter(e.target.value)}><option value="">{t('allAreas')}</option>{areas.map(a=><option key={a}>{a}</option>)}</select>
        </div>
        {loaded&&list.length===0&&<p className="empty">{t('noResults')}</p>}
        <div className="cards">{list.map(item=>{const Icon=icons[item.category];return <article className="card" key={item.id} data-trade={item.category}>
          <div className="card-top"><span className="icon"><Icon size={22}/></span><div><h3>{item.title||item.name}</h3><p>{t(item.category)} · {item.area}{item.km!=null?' · '+item.km+' km':''}</p></div></div>
          <p className="description">{item.description||item.bio}</p>
          {item.starts&&<small>{date(item.starts)} · {item.hours} h</small>}
          <footer><div><strong>{cash(item.amount||item.rate)}</strong>{item.rate&&<small> {t('hour')}</small>}</div>
            {item.rate?<><span className="verified"><ShieldCheck size={16}/>{t(item.demo?'demoVerified':'verified')}</span>{role==='employer'&&<button className="quiet" onClick={()=>setApply(apply===item.id?'':item.id)}>{t('invite')}</button>}</>:
              role!=='employer'&&<button className="quiet" onClick={()=>role?setApply(apply===item.id?'':item.id):go('auth')}>{t('offer')}</button>}
          </footer>
          {apply===item.id&&role==='employer'&&item.rate&&<form className="stack inline" onSubmit={e=>{e.preventDefault();const f=fields(e);send('invite',{worker:item.id,job:f.job,amount:paise(f.amount),note:f.note},r=>{select(r.thread);setApply('');go('inbox');});}}>
            {(data.owned||[]).some(j=>j.category===item.category)?<><label>{t('draft')}<select name="job">{data.owned.filter(j=>j.category===item.category).map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label>{quoteFields()}<button className="primary" disabled={busy}>{t('invite')}</button></>:<button type="button" className="quiet" onClick={()=>go('post')}>{t('post')}</button>}</form>}
          {apply===item.id&&role==='worker'&&<form className="stack inline" onSubmit={e=>{e.preventDefault();const f=fields(e);send('apply',{job:item.id,amount:paise(f.amount),note:f.note},r=>{select(r.thread);setApply('');go('inbox');});}}>
            {quoteFields(Number(item.amount)/100)}<button className="primary" disabled={busy}>{t('offer')}</button></form>}
        </article>;})}</div>
      </section>}

      {view==='auth'&&<div className="auth-grid"><form className="panel stack" onSubmit={e=>{e.preventDefault();const f=fields(e);send(signup?'signup':'login',f,()=>go('find'));}}>
        {signup&&<label>{t('name')}<input name="name" required maxLength={70} autoComplete="name"/></label>}
        <label>{t('email')}<input name="email" required type="email" maxLength={254} autoComplete="email"/></label>
        <label>{t('password')}<input name="password" required type="password" minLength={signup?12:1} maxLength={128} autoComplete={signup?'new-password':'current-password'}/></label>
        {signup&&<label>{t('profile')}<select name="role" defaultValue={signupRole}><option value="employer">{t('employer')}</option><option value="worker">{t('worker')}</option></select></label>}
        <button className="primary" disabled={busy}>{t(busy?'saving':signup?'signup':'login')}</button>
        <button type="button" className="quiet" onClick={()=>setSignup(!signup)}>{t(signup?'login':'signup')}</button>
      </form>{data.demo&&<form className="panel stack" onSubmit={e=>{e.preventDefault();send('demo',{role:e.nativeEvent.submitter.value,room:fields(e).room},()=>go(e.nativeEvent.submitter.value==='worker'?'profile':'find'));}}>
        <h2>{t('demo')}</h2><p>{t('demoHelp')}</p><label>{t('room')}<input name="room" required minLength={8} maxLength={50} defaultValue="local-pilot"/></label>
        <div className="buttons"><button className="quiet" value="employer" disabled={busy}>{t('demoEmployer')}</button><button className="primary" value="worker" disabled={busy}>{t('demoWorker')}</button></div>
      </form>}</div>}

      {view==='post'&&role==='employer'&&<form className="panel stack narrow" onSubmit={e=>{
        e.preventDefault();const f=fields(e);send('job',{...f,amount:paise(f.amount),hours:Number(f.hours),starts:new Date(f.starts).toISOString(),...(near?{point:{lat:Number(near.lat.toFixed(2)),lng:Number(near.lng.toFixed(2))}}:{})},()=>go('work'));
      }}>
        <label>{t('draft')}<input name="title" required maxLength={90}/></label><div className="pair">{categoryField()}{areaField()}</div>
        <label>{t('description')}<textarea name="description" required maxLength={1400}/></label>
        <div className="pair"><label>{t('amount')}<input required name="amount" type="number" min="50" max="1000000" step=".01"/></label><label>{t('hours')}<input required name="hours" type="number" min="1" max="48"/></label></div>
        <label>{t('starts')}<input required name="starts" type="datetime-local"/></label><div className="buttons"><button className="primary" disabled={busy}>{t('submit')}</button><button className="quiet" type="button" onClick={locate}>{t(near?'nearbyOn':'nearby')}</button></div>
      </form>}

      {view==='profile'&&role==='worker'&&<div className="auth-grid">
        <form className="panel stack" key={data.user.id} onSubmit={e=>{e.preventDefault();const f=fields(e);send('profile',{...f,available:f.available==='on',rate:paise(f.rate),point:near?{lat:Number(near.lat.toFixed(2)),lng:Number(near.lng.toFixed(2))}:data.profile?.lat!=null?{lat:data.profile.lat,lng:data.profile.lng}:undefined});}}>
          <div className="pair">{categoryField(data.profile?.category)}{areaField(data.profile?.area)}</div>
          <label>{t('bio')}<textarea name="bio" required maxLength={400} defaultValue={data.profile?.bio}/></label>
          <label>{t('rate')}<input name="rate" required type="number" min="50" max="1000000" step=".01" defaultValue={data.profile?Number(data.profile.rate)/100:''}/></label>
          <label className="check"><input type="checkbox" name="available" defaultChecked={data.profile?.available??true}/>{t('available')}</label>
          <div className="buttons"><button className="primary" disabled={busy}>{t('save')}</button><button className="quiet" type="button" onClick={locate}>{t(near?'nearbyOn':'nearby')}</button></div>
        </form>
        <WorkerVerification data={data} t={t} date={date} send={send} busy={busy}/>
      </div>}

      {view==='review'&&data.user?.reviewer_account&&<VerificationReview t={t} date={date} send={send} busy={busy} reviewer={data.user.reviewer}/>}
      {view==='inbox'&&role&&<div className="inbox">
        <aside className="panel threads">{data.threads.length===0&&<p>{t('noThreads')}</p>}{data.threads.map(x=><button key={x.id} aria-pressed={x.id===thread} onClick={()=>select(x.id)}><MessageSquare size={18}/><span><strong>{x.title}</strong><small>{role==='worker'?x.employer_name:x.worker_name} · {t(x.booking||x.state)}</small></span></button>)}</aside>
        {selected?<section className="panel stack">
          <h2>{selected.title}</h2><p>{date(selected.starts)} · {t(selected.booking||selected.state)}</p>
          <div className="quote"><strong>{cash(selected.amount)}</strong><p>{selected.note}</p></div>
          {selected.state==='pending'&&selected.author!==data.user.id&&<>
            <div className="buttons"><button className="primary" disabled={busy} onClick={()=>send('decide',{id:thread,decision:'accept',version:selected.version})}>{t('accept')}</button><button className="quiet" disabled={busy} onClick={()=>send('decide',{id:thread,decision:'decline',version:selected.version})}>{t('decline')}</button></div>
            <details><summary>{t('counter')}</summary><form className="stack inline" onSubmit={e=>{e.preventDefault();const f=fields(e);send('counter',{id:thread,amount:paise(f.amount),note:f.note,version:selected.version});}}>{quoteFields(Number(selected.amount)/100)}<button className="primary" disabled={busy}>{t('counter')}</button></form></details>
          </>}
          {conversationCurrent&&data.offers.length>0&&<details><summary>{t('history')}</summary><ol>{data.offers.map(o=><li key={o.version}>{cash(o.amount)} · {o.note}</li>)}</ol></details>}
          {actions.length>0&&<div className="buttons">{actions.map(([state])=><button className="quiet" key={state} disabled={busy} onClick={()=>send('state',{id:thread,state},()=>setSharing(false))}>{t(state)}</button>)}</div>}
          {booking==='en_route'&&<div className="tracking stack">
            {role==='worker'&&<button className="quiet" onClick={()=>navigator.geolocation?setSharing(!sharing):setError('geoError')}><Crosshair size={17}/> {t(sharing?'stop':'share')}</button>}
            {selected.located_at?<p>{t('update')} · {date(selected.located_at)} · <a target="_blank" rel="noreferrer" href={'https://www.openstreetmap.org/?mlat='+selected.lat+'&mlon='+selected.lng+'#map=17/'+selected.lat+'/'+selected.lng}>{t('map')}</a></p>:<p>{t('waiting')}</p>}
          </div>}
          <h3>{t('messages')}</h3><div className="messages">{conversationCurrent&&data.messages.map(m=><p className={m.author===data.user.id?'mine':''} key={m.id}>{m.body}<small>{date(m.created)}</small></p>)}</div>
          {selected.state!=='declined'&&<form className="message-form" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;send('message',{id:thread,body:fields(e).body},()=>form.reset());}}><input required name="body" maxLength={1200} aria-label={t('messages')}/><button className="primary" disabled={busy}>{t('send')}</button></form>}
        </section>:<div className="panel empty">{t('choose')}</div>}
      </div>}
    </main>
    <div className="foot"><ClipboardList size={16}/> SWABHIMAN · {t('city')}</div>
  </>;
}