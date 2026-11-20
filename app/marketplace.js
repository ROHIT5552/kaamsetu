'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, ChevronRight, Pause, Play, Bookmark, Handshake, ShieldCheck, ClipboardPlus, Crosshair, HardHat, MapPin, MessageSquare, PaintRoller, PlugZap, Search, Star, UsersRound, Droplets, Hammer, BrickWall, Wrench } from 'lucide-react';
import { areas, categories, transitions } from '../lib/domain';
import { translate } from './copy';
import BookingProgress from './booking-progress';
import { WorkPhoto,WorkPhotoField } from './work-photo';
import { WorkerVerification,VerificationReview } from './verification-panel';

const icons={plumbing:Droplets,electrical:PlugZap,carpentry:Hammer,painting:PaintRoller,masonry:BrickWall,general:HardHat};
const journeys={
  howHire:[[ClipboardPlus,'stepPost'],[MessageSquare,'stepCompare'],[Handshake,'stepBook']],
  howWork:[[ShieldCheck,'stepVerify'],[Search,'stepFind'],[Handshake,'stepAgree']]
};
const initial={jobs:[],people:[],threads:[],messages:[],offers:[],checks:[]};
const localInput=value=>{
  if(!value)return '';
  const time=new Date(value);
  return new Date(time.getTime()-time.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
const pausedError=['unavailable','geoError'];
const paise=value=>Math.round(Number(value)*100);
const coordinates=position=>({lat:position.coords.latitude,lng:position.coords.longitude});
const fields=event=>Object.fromEntries(new FormData(event.currentTarget));

function MotionBackdrop({paused}){
  return <div className="motion-backdrop" aria-hidden="true">
    <div className="motion-orbit" data-paused={paused}>
      <span className="motion-ring"/><span className="motion-ring"/><span className="motion-ring"/>
      <div className="tool-3d-node tool-carpentry" style={{'--orbit-angle':'0deg', '--orbit-dist':'48%', '--z-depth':'60px'}}>
        <div className="tool-badge" title="Carpentry"><Hammer size={22} strokeWidth={2.2}/></div>
      </div>
      <div className="tool-3d-node tool-electrical" style={{'--orbit-angle':'60deg', '--orbit-dist':'52%', '--z-depth':'-40px'}}>
        <div className="tool-badge" title="Electrical"><PlugZap size={22} strokeWidth={2.2}/></div>
      </div>
      <div className="tool-3d-node tool-plumbing" style={{'--orbit-angle':'120deg', '--orbit-dist':'46%', '--z-depth':'75px'}}>
        <div className="tool-badge" title="Plumbing"><Wrench size={22} strokeWidth={2.2}/></div>
      </div>
      <div className="tool-3d-node tool-painting" style={{'--orbit-angle':'180deg', '--orbit-dist':'50%', '--z-depth':'-30px'}}>
        <div className="tool-badge" title="Painting"><PaintRoller size={22} strokeWidth={2.2}/></div>
      </div>
      <div className="tool-3d-node tool-masonry" style={{'--orbit-angle':'240deg', '--orbit-dist':'44%', '--z-depth':'50px'}}>
        <div className="tool-badge" title="Masonry"><BrickWall size={22} strokeWidth={2.2}/></div>
      </div>
      <div className="tool-3d-node tool-general" style={{'--orbit-angle':'300deg', '--orbit-dist':'54%', '--z-depth':'-60px'}}>
        <div className="tool-badge" title="General Help"><HardHat size={22} strokeWidth={2.2}/></div>
      </div>
    </div>
  </div>;
}

function WorkBriefFields({t, listing, sample=false, disabled, onPreparingChange}){
  const [photoEdit,setPhotoEdit]=useState(null);
  const detailsId=useId();
  const detailsHintId=detailsId+"-hint";

  return <fieldset className="work-brief-fields stack">
    <legend>{t(sample?'sampleWork':'jobBrief')} <small>{t('optional')}</small></legend>
    <div className="work-brief-entry">
      <label htmlFor={detailsId}>{t(sample?'sampleDescription':'jobChecklist')}</label>
      <small id={detailsHintId}>{t(sample?'sampleHint':'jobChecklistHint')}</small>
      <textarea id={detailsId} name="workDetails" maxLength={1200} defaultValue={listing?.work_details} aria-describedby={detailsHintId}/>
    </div>
    <WorkPhotoField t={t} label={t(sample?'samplePhoto':'jobPhoto')} value={photoEdit??listing?.photo??''}
      onChange={setPhotoEdit} disabled={disabled} onPreparingChange={onPreparingChange}/>
    {photoEdit!==null&&<input type="hidden" name="photo" value={photoEdit}/>}
  </fieldset>;
}

function WorkBrief({listing, t, sample=false, includeDescription=false, heading:Heading='h3'}){
  if(!listing.photo&&!listing.work_details&&!(includeDescription&&listing.description))return null;

  return <section className="work-brief">
    <Heading className="work-brief-title">{t(sample?'sampleWork':'jobBrief')}</Heading>
    {includeDescription&&listing.description&&<p>{listing.description}</p>}
    <WorkPhoto src={listing.photo} alt={t(sample?'sampleWork':'jobPhotoAlt')}/>
    {listing.work_details&&<p>{listing.work_details}</p>}
  </section>;
}

export default function Marketplace(){
  const [locale,setLocale]=useState('en'),[view,setView]=useState('find'),[data,setData]=useState(initial);
  const [trade,setTrade]=useState(''),[areaFilter,setAreaFilter]=useState(''),[search,setSearch]=useState('');
  const [near,setNear]=useState(null),[thread,setThread]=useState(''),[apply,setApply]=useState('');
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false),[signup,setSignup]=useState(false),[sharing,setSharing]=useState(false);
  const [signupRole,setSignupRole]=useState('employer');
  const [sort,setSort]=useState('default'),[editing,setEditing]=useState(null);
  const [savedOnly,setSavedOnly]=useState(false);
  const [motionPaused,setMotionPaused]=useState(false);
  const [helpTopic,setHelpTopic]=useState('howHire');
  const [photoPreparing,setPhotoPreparing]=useState(false);
  const sharingRef=useRef(null),requestVersion=useRef(0),readAttempt=useRef('');
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
  function go(next){setView(next);setError('');setNotice('');if(next!=='post')setEditing(null);setSavedOnly(false);}
  function newJob(){setEditing(null);go('post');}
  function startJourney(){
    if(role){if(role==='worker')go('profile');else newJob();return;}
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
  const lastMessage=conversationCurrent?data.messages.at(-1)?.id:null;
  useEffect(()=>{
    if(view!=='inbox'||!selected?.unread||!lastMessage)return;
    const readKey=thread+':'+lastMessage;
    if(readAttempt.current===readKey)return;
    readAttempt.current=readKey;
    request('readThread',{id:thread,message:lastMessage}).then(refresh).catch(()=>{readAttempt.current='';});
  },[view,selected?.unread,lastMessage,thread,refresh]);
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
  const savedKind=view==='find'?'worker':'job';
  const savedIds=new Set((data.saved||[]).filter(item=>item.kind===savedKind).map(item=>item.item));
  const unread=data.threads.reduce((total,item)=>total+item.unread,0);
  const list=(view==='find'?data.people:data.jobs).filter(item=>
    (!savedOnly||savedIds.has(item.id))&&
    (!trade||item.category===trade)&&(!areaFilter||item.area===areaFilter)&&
    [item.name,item.title,item.area,t(item.category),item.bio,item.description,item.work_details].join(' ').toLowerCase().includes(search.toLowerCase()));
  const role=data.user?.role;
  const browse=view==='find'||view==='work';
  const invites=(data.owned||[]).filter(job=>job.status==='open');
  if(sort==='price')list.sort((a,b)=>Number(a.rate||a.amount)-Number(b.rate||b.amount));
  if(sort==='rated'&&view==='find')list.sort((a,b)=>Number(b.score||0)-Number(a.score||0)||(b.rating_count||0)-(a.rating_count||0));
  if(sort==='distance'&&near)list.sort((a,b)=>(a.km??Infinity)-(b.km??Infinity));
  const actions=Object.entries(transitions[selected?.booking]||{}).filter(([,who])=>who==='either'||who===role);
  const categoryField=(value)=> <label>{t('category')}<select name="category" defaultValue={value}>{categories.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></label>;
  const areaField=(value)=> <label>{t('area')}<select name="area" defaultValue={value}>{areas.map(a=><option key={a}>{a}</option>)}</select></label>;
  const quoteFields=(value)=> <><label>{t('amount')}<input required name="amount" type="number" min="50" max="1000000" step=".01" defaultValue={value}/></label><label>{t('note')}<textarea name="note" required maxLength={500}/></label></>;

  const motionToggle=<div className="motion-controls">
    <button className="scene-toggle" type="button" aria-label={t(motionPaused?'playMotion':'pauseMotion')}
      title={t(motionPaused?'playMotion':'pauseMotion')} onClick={()=>setMotionPaused(paused=>!paused)}>
      {motionPaused?<Play size={16} aria-hidden="true"/>:<Pause size={16} aria-hidden="true"/>}
    </button>
  </div>;

  return <>
    <a className="skip-main" href="#page-start">{t('skipMain')}</a>
    <header className="top" id="site-top" tabIndex={-1}><div className="top-inner">
      <button className="brand" onClick={()=>go('find')}><span aria-hidden="true"/>SWABHIMAN</button>
      <nav aria-label={t('find')}>
        <button aria-current={view==='find'?'page':undefined} onClick={()=>go('find')}>{t('find')}</button>
        <button aria-current={view==='work'?'page':undefined} onClick={()=>go('work')}>{t('work')}</button>
        {role==='employer'&&<button aria-current={view==='myJobs'?'page':undefined} onClick={()=>go('myJobs')}>{t('myJobs')}</button>}
        {role==='worker'&&<button aria-current={view==='profile'?'page':undefined} onClick={()=>go('profile')}>{t('profile')}</button>}
        {role&&<button aria-current={view==='inbox'?'page':undefined} onClick={()=>go('inbox')}>{t('inbox')}{unread>0&&<span className="unread" aria-label={t('unreadMessages')}>{unread}</span>}</button>}
        {data.user?.reviewer_account&&<button aria-current={view==='review'?'page':undefined} onClick={()=>go('review')}>{t('review')}</button>}
      </nav>
      <div className="tools"><select aria-label="Language" value={locale} onChange={e=>setLocale(e.target.value)}><option value="mr">मराठी</option><option value="hi">हिन्दी</option><option value="en">English</option></select>
        {role?<button className="quiet" disabled={busy} onClick={()=>{setSharing(false);send('logout',{},()=>{select('');setData(current=>({...current,user:null,threads:[],messages:[],offers:[]}));go('find');});}}>{t('logout')}</button>:<button className="quiet" onClick={()=>{setSignup(false);go('auth');}}>{t('login')}</button>}
      </div>
    </div></header>

    <main id="page-start" tabIndex={-1}>
      {browse&&<section className="hero scene-surface"><MotionBackdrop paused={motionPaused}/><div className="hero-content">
        <h1>{t(view==='work'?'workerHero':'hero')}</h1>
        <div className="place"><MapPin size={16}/> {t('city')}</div>
        <p>{t(view==='work'?'workerIntro':'intro')}</p>
        <div className="buttons">
          <button className="primary" onClick={startJourney}>{t(role==='worker'?'profile':!role&&view==='work'?'workerStart':'post')} <ArrowRight size={17}/></button>
          <button className="on-dark" onClick={locate}><Crosshair size={17}/> {t(near?'nearbyOn':'nearby')}</button>
        </div>
      </div><section className="hero-trades" aria-labelledby="trade-title">
        <h2 id="trade-title">{t('browseTrades')}</h2>
        <div className="trade-grid">{categories.map(category=>{
          const Icon=icons[category];
          return <button key={category} data-trade={category} aria-pressed={trade===category} aria-controls="market-results"
            onClick={()=>setTrade(trade===category?'':category)}><span className="icon" aria-hidden="true"><Icon size={19} strokeWidth={1.8}/></span><span>{t(category)}</span><ChevronRight className="trade-arrow" size={15} aria-hidden="true"/></button>;
        })}</div>
      </section>{motionToggle}</section>}
      {browse&&<section className="journey" aria-labelledby="journey-title">
        <h2 id="journey-title">{t(view==='find'?'howHire':'howWork')}</h2>
        <ol>{journeys[view==='find'?'howHire':'howWork'].map(([Icon,key])=>
          <li key={key}><Icon size={20} aria-hidden="true"/><div><strong>{t(key)}</strong><small>{t(key+'Detail')}</small></div></li>)}</ol>
      </section>}
      {!browse&&<div className="page-heading scene-surface"><MotionBackdrop paused={motionPaused}/><h1>{t(view==='auth'?(signup?'signup':'login'):view==='post'&&editing?'editJob':view==='help'?'supportLabel':view)}</h1>{data.user&&<p>{data.user.name} · {t(role)}</p>}{motionToggle}</div>}
      {error&&<div role="alert" className="feedback error">{t(error)} {pausedError.includes(error)&&<button className="quiet" onClick={error==='geoError'?locate:refresh}>{error==='geoError'?t('nearby'):t('loading')}</button>}</div>}
      {notice&&<div role="status" className="feedback">{t(notice)}</div>}
      {!loaded&&<p role="status">{t('loading')}</p>}

      {browse&&<section className="results" id="market-results">
        <div className="section-head"><div className="result-title"><h2>{t(view)}{trade?' · '+t(trade):''}</h2>
          {trade&&<button className="quiet" onClick={()=>setTrade('')}><UsersRound size={17}/>{t('all')}</button>}</div>
          {data.user&&<button className="quiet" aria-pressed={savedOnly} onClick={()=>setSavedOnly(!savedOnly)}><Bookmark size={16}/>{t('savedListings')}</button>}
          {loaded&&<small aria-live="polite">{new Intl.NumberFormat(locale).format(list.length)} {t('resultsShown')}</small>}</div>
        <div className="filters"><label className="search"><Search size={18}/><input aria-label={t('search')} placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/></label>
          <select aria-label={t('area')} value={areaFilter} onChange={e=>setAreaFilter(e.target.value)}><option value="">{t('allAreas')}</option>{areas.map(a=><option key={a}>{a}</option>)}</select>
          <select aria-label={t('sort')} value={view==='work'&&sort==='rated'?'default':sort} onChange={e=>setSort(e.target.value)}>
            <option value="default">{t('defaultSort')}</option><option value="price">{t('priceSort')}</option>
            {near&&<option value="distance">{t('nearest')}</option>}{view==='find'&&<option value="rated">{t('ratingSort')}</option>}</select>
        </div>
        {loaded&&list.length===0&&<p className="empty">{t(savedOnly?'noSaved':'noResults')}</p>}
        <div className="cards">{list.map(item=>{const Icon=icons[item.category];return <article className="card" key={item.id} data-trade={item.category}>
          <div className="card-top"><span className="icon"><Icon size={22}/></span><div><h3>{item.title||item.name}</h3><p>{t(item.category)} · {item.area}{item.km!=null?' · '+item.km+' km':''}</p></div>
            {data.user&&<button className="bookmark" disabled={busy} aria-pressed={savedIds.has(item.id)}
              aria-label={t(savedIds.has(item.id)?'unsaveListing':'saveListing')+' '+(item.title||item.name)}
              onClick={()=>send('saveListing',{id:item.id,kind:savedKind,saved:!savedIds.has(item.id)})}><Bookmark size={19}/></button>}
          </div>
          <p className="description">{item.description||item.bio}</p>
          <WorkBrief listing={item} t={t} sample={view==='find'} heading="h4"/>
          {item.rating_count>0&&<small className="rating"><Star size={16} aria-hidden="true"/>{item.score} · {item.rating_count} {t('ratings')}</small>}
          {item.reviews?.length>0&&<details className="reviews"><summary>{t('reviews')}</summary>
            {item.reviews.map((review,index)=><blockquote key={review.created_at+'-'+index}><p>{review.note}</p><small>{t(review.category)} · {review.score}/5{item.demo?' · '+t('demoReview'):''}</small></blockquote>)}
          </details>}
          {item.starts&&<small>{date(item.starts)} · {item.hours} h</small>}
          <footer><div><strong>{cash(item.amount||item.rate)}</strong>{item.rate&&<small> {t('hour')}</small>}</div>
            {item.rate?<><span className="verified"><ShieldCheck size={16}/>{t(item.demo?'demoVerified':'verified')}</span>{role==='employer'&&<button className="quiet" onClick={()=>setApply(apply===item.id?'':item.id)}>{t('invite')}</button>}</>:
              role!=='employer'&&<button className="quiet" onClick={()=>role?setApply(apply===item.id?'':item.id):go('auth')}>{t('offer')}</button>}
          </footer>
          {apply===item.id&&role==='employer'&&item.rate&&<form className="stack inline" onSubmit={e=>{e.preventDefault();const f=fields(e);send('invite',{worker:item.id,job:f.job,amount:paise(f.amount),note:f.note},r=>{select(r.thread);setApply('');go('inbox');});}}>
            {invites.some(j=>j.category===item.category)?<><label>{t('draft')}<select name="job">{invites.filter(j=>j.category===item.category).map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label>{quoteFields()}<button className="primary" disabled={busy}>{t('invite')}</button></>:<button type="button" className="quiet" onClick={newJob}>{t('post')}</button>}</form>}
          {apply===item.id&&role==='worker'&&<form className="stack inline" onSubmit={e=>{e.preventDefault();const f=fields(e);send('apply',{job:item.id,amount:paise(f.amount),note:f.note},r=>{select(r.thread);setApply('');go('inbox');});}}>
            {quoteFields(Number(item.amount)/100)}<button className="primary" disabled={busy}>{t('offer')}</button></form>}
        </article>;})}</div>
      </section>}

      {view==='help'&&<section className="help-topics narrow" key={helpTopic} aria-label={t('supportLabel')}>
        {Object.entries(journeys).map(([topic,steps])=><details className="panel" key={topic} open={helpTopic===topic||undefined}>
          <summary>{t(topic)}</summary>
          <ol>{steps.map(([,key])=><li key={key}><strong>{t(key)}</strong><p>{t(key+'Detail')}</p></li>)}</ol>
        </details>)}
        <details className="panel" open={helpTopic==='safeWork'||undefined}>
          <summary>{t('safeWork')}</summary>
          <p>{t('identityHelp')}</p>
        </details>
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

      {view==='myJobs'&&role==='employer'&&<section className="stack narrow">
        <div className="buttons"><button className="primary" onClick={newJob}><ClipboardPlus size={17}/>{t('post')}</button></div>
        {!(data.owned||[]).length&&<p className="empty">{t('noJobs')}</p>}
        {(data.owned||[]).map(job=><article key={job.id} className="panel stack job-row">
          <div className="job-title"><h2>{job.title}</h2><span className="job-status">{t(job.status==='closed'?'jobClosed':job.status)}</span></div>
          <p>{t(job.category)} · {job.area} · {date(job.starts)} · {cash(job.amount)}</p>
          <div className="buttons">
            {job.status==='open'&&job.offer_count===0&&<button className="quiet" onClick={()=>{setEditing(job);go('post');}}>{t('editJob')}</button>}
            {job.thread&&<button className="quiet" onClick={()=>{select(job.thread);go('inbox');}}>{t('booking')}</button>}
            {!job.thread&&job.offer_count>0&&<button className="quiet" onClick={()=>{const match=data.threads.find(item=>item.job===job.id&&item.state==='pending')||data.threads.find(item=>item.job===job.id);if(match)select(match.id);go('inbox');}}>{t('inbox')} · {job.pending_count}</button>}
          </div>
          <WorkBrief listing={job} t={t}/>
          {job.status==='open'&&<details><summary>{t('closeJob')}</summary><p>{t('closeJobHelp')}</p>
            <button className="quiet" disabled={busy} onClick={()=>send('closeJob',{id:job.id})}>{t('closeJob')}</button></details>}
        </article>)}
      </section>}
      {view==='post'&&role==='employer'&&<form className="panel stack narrow" key={editing?.id||'new'} onSubmit={e=>{
        e.preventDefault();if(photoPreparing)return;const f=fields(e);send(editing?'editJob':'job',{...f,...(editing?{id:editing.id}:{}),
          amount:paise(f.amount),hours:Number(f.hours),starts:new Date(f.starts).toISOString(),
          ...(near?{point:{lat:Number(near.lat.toFixed(2)),lng:Number(near.lng.toFixed(2))}}:{})},()=>go('myJobs'));
      }}>
        <label>{t('draft')}<input name="title" required maxLength={90} defaultValue={editing?.title}/></label>
        <div className="pair">{categoryField(editing?.category)}{areaField(editing?.area)}</div>
        <label>{t('description')}<textarea name="description" required maxLength={1400} defaultValue={editing?.description}/></label>
        <WorkBriefFields t={t} listing={editing} disabled={busy} onPreparingChange={setPhotoPreparing}/>
        <div className="pair"><label>{t('amount')}<input required name="amount" type="number" min="50" max="1000000" step=".01" defaultValue={editing?Number(editing.amount)/100:''}/></label>
          <label>{t('hours')}<input required name="hours" type="number" min="1" max="48" defaultValue={editing?.hours}/></label></div>
        <label>{t('starts')}<input required name="starts" type="datetime-local" defaultValue={localInput(editing?.starts)}/></label>
        <div className="buttons"><button className="primary" disabled={busy||photoPreparing}>{t(editing?'saveJob':'submit')}</button><button className="quiet" type="button" onClick={locate}>{t(near?'nearbyOn':'nearby')}</button></div>
      </form>}

      {view==='profile'&&role==='worker'&&<div className="auth-grid">
        <form className="panel stack" key={data.user.id} onSubmit={e=>{e.preventDefault();if(photoPreparing)return;const f=fields(e);send('profile',{...f,available:f.available==='on',rate:paise(f.rate),point:near?{lat:Number(near.lat.toFixed(2)),lng:Number(near.lng.toFixed(2))}:data.profile?.lat!=null?{lat:data.profile.lat,lng:data.profile.lng}:undefined});}}>
          <div className="pair">{categoryField(data.profile?.category)}{areaField(data.profile?.area)}</div>
          <label>{t('bio')}<textarea name="bio" required maxLength={400} defaultValue={data.profile?.bio}/></label>
          <WorkBriefFields t={t} listing={data.profile} sample disabled={busy} onPreparingChange={setPhotoPreparing}/>
          <label>{t('rate')}<input name="rate" required type="number" min="50" max="1000000" step=".01" defaultValue={data.profile?Number(data.profile.rate)/100:''}/></label>
          <label className="check"><input type="checkbox" name="available" defaultChecked={data.profile?.available??true}/>{t('available')}</label>
          <div className="buttons"><button className="primary" disabled={busy||photoPreparing}>{t('save')}</button><button className="quiet" type="button" onClick={locate}>{t(near?'nearbyOn':'nearby')}</button></div>
        </form>
        <WorkerVerification data={data} t={t} date={date} send={send} busy={busy}/>
      </div>}

      {view==='review'&&data.user?.reviewer_account&&<VerificationReview t={t} date={date} send={send} busy={busy} reviewer={data.user.reviewer}/>}
      {view==='inbox'&&role&&<div className="inbox">
        <aside className="panel threads">{data.threads.length===0&&<p>{t('noThreads')}</p>}{data.threads.map(x=><button key={x.id} aria-pressed={x.id===thread} onClick={()=>select(x.id)}><MessageSquare size={18}/><span><strong>{x.title}</strong><small>{role==='worker'?x.employer_name:x.worker_name} · {t(x.booking||x.state)}</small></span>{x.unread>0&&<span className="unread" aria-label={t('unreadMessages')}>{x.unread}</span>}</button>)}</aside>
        {selected?<section className="panel stack">
          <h2>{selected.title}</h2><p>{date(selected.starts)} · {t(selected.booking||selected.state)}</p>
          {booking&&conversationCurrent&&<BookingProgress state={booking} events={data.events||[]} t={t} date={date}/>}
          <div className="quote"><strong>{cash(selected.amount)}</strong><p>{selected.note}</p></div>
          <WorkBrief listing={selected} t={t} includeDescription/>
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
          {booking==='completed'&&(selected.rating?<p className="rating"><Star size={17}/>{t('workerRating')} · {selected.rating}/5</p>:role==='employer'&&
            <form className="stack" onSubmit={e=>{e.preventDefault();const f=fields(e);send('rate',{id:thread,score:Number(f.score),note:f.note.trim()||undefined});}}>
              <label>{t('workerRating')}<select required name="score" defaultValue=""><option value="" disabled>{t('chooseScore')}</option>{[5,4,3,2,1].map(score=><option key={score} value={score}>{score}/5</option>)}</select></label>
              <label>{t('reviewText')}<textarea name="note" maxLength={350} placeholder={t('reviewHelp')}/></label>
              <div><button className="primary" disabled={busy}>{t('submitRating')}</button></div></form>)}
          <h3>{t('messages')}</h3><div className="messages">{conversationCurrent&&data.messages.map(m=><p className={m.author===data.user.id?'mine':''} key={m.id}>{m.body}<small>{date(m.created)}</small></p>)}</div>
          {selected.state!=='declined'&&<form className="message-form" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;send('message',{id:thread,body:fields(e).body},()=>form.reset());}}><input required name="body" maxLength={1200} aria-label={t('messages')}/><button className="primary" disabled={busy}>{t('send')}</button></form>}
        </section>:<div className="panel empty">{t('choose')}</div>}
      </div>}
    </main>
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="brand" href="#page-start" onClick={()=>go('find')}><span aria-hidden="true"/>SWABHIMAN</a>
            <p>{t('intro')}</p>
          </div>
          <nav className="footer-links" aria-label={t('marketplaceLabel')}>
            <h2>{t('marketplaceLabel')}</h2>
            <a href="#page-start" onClick={()=>go('find')}>{t('find')}</a>
            <a href="#page-start" onClick={()=>go('work')}>{t('work')}</a>
          </nav>
          <nav className="footer-links" aria-label={t('accountLabel')}>
            <h2>{t('accountLabel')}</h2>
            {role?<><a href="#page-start" onClick={()=>go(role==='worker'?'profile':'myJobs')}>{t(role==='worker'?'profile':'myJobs')}</a>
              <a href="#page-start" onClick={()=>go('inbox')}>{t('inbox')}</a></>:<>
              <a href="#page-start" onClick={()=>{setSignup(false);go('auth');}}>{t('login')}</a>
              <a href="#page-start" onClick={startJourney}>{t('signup')}</a></>}
          </nav>
          <nav className="footer-links" aria-label={t('supportLabel')}>
            <h2>{t('supportLabel')}</h2>
            {['howHire','howWork','safeWork'].map(topic=><a key={topic} href="#page-start"
              onClick={()=>{setHelpTopic(topic);go('help');}}>{t(topic)}</a>)}
          </nav>
        </div>
        <div className="footer-end">
          <span><MapPin size={16} aria-hidden="true"/>{t('city')}</span>
          <a href="#site-top"><ArrowUp size={16} aria-hidden="true"/>{t('backTop')}</a>
        </div>
      </div>
    </footer>
  </>;
}