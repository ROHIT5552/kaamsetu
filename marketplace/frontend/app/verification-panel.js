'use client';
import { useEffect,useState } from 'react';
import { ExternalLink,ShieldCheck } from 'lucide-react';

export function WorkerVerification({data,send,busy,t,date}) {
  const methods=data.demo?['alternative','aadhaar','trade']:data.verification?.methods||[];
  return <section className="panel stack">
    <h2>{t('identity')}</h2>
    <p>{t(data.demo?'identityHelp':'verificationDisclosure')}</p>
    {!methods.length&&<p role="status">{t('verificationSetup')}</p>}
    {data.checks.map(check=><article className="check-row stack" key={check.id||check.kind}>
      <div className="verified"><ShieldCheck size={17}/>{t(check.method)} · {t(check.status||(check.verified_at?'demoVerified':'pending'))}</div>
      {check.reason&&<p>{t(check.reason)}</p>}
      {check.valid_until&&<p>{t('validUntil')} {date(check.valid_until)}</p>}
      {check.link&&<a className="quiet" href={check.link} target="_blank" rel="noreferrer">{t('openProvider')} <ExternalLink size={16}/></a>}
      {check.id&&check.status!=='withdrawn'&&<details>
        <summary>{t('withdrawConsent')}</summary>
        <p>{t('withdrawHelp')}</p>
        <button className="quiet" type="button" disabled={busy} onClick={()=>send('withdrawCheck',{id:check.id})}>{t('withdrawConsent')}</button>
      </details>}
    </article>)}
    {methods.length>0&&<form className="stack" onSubmit={event=>{
      event.preventDefault();
      const form=event.currentTarget,values=new FormData(form);
      const method=values.get('method');
      send('verify',{method,kind:method==='trade'?'electrical-license':'identity',
        consent:values.has('consent'),consentVersion:data.verification?.consentVersion},()=>form.reset());
    }}>
      <label>{t('verificationMethod')}<select name="method">{methods.map(method=><option key={method} value={method}>{t(method)}</option>)}</select></label>
      <label className="check"><input type="checkbox" name="consent" required/>{t('consent')}</label>
      <button className="primary" disabled={busy}>{t('request')}</button>
    </form>}
  </section>;
}

const statuses=['ready','submitted','approved','rejected','withdrawn'];
const reasons=['provider_failed','details_mismatch','expired','out_of_scope'];

export function VerificationReview({t,date,send,busy,reviewer}) {
  const [status,setStatus]=useState('ready');
  const [refresh,setRefresh]=useState(0);
  const [result,setResult]=useState(null);
  useEffect(()=>{
    if(!reviewer)return;
    const controller=new AbortController();
    fetch('/api/market?review='+status,{cache:'no-store',signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error(response.status===403?'reviewSignIn':'unavailable');
        return response.json();
      })
      .then(body=>setResult({status,refresh,queue:body.queue}))
      .catch(error=>{if(!controller.signal.aborted)setResult({status,refresh,error:error.message});});
    return ()=>controller.abort();
  },[status,refresh,reviewer]);
  if(!reviewer)return <p className="feedback">{t('reviewSignIn')}</p>;
  const current=result?.status===status&&result.refresh===refresh?result:null;
  const update=()=>setRefresh(value=>value+1);
  return <section className="stack">
    <div className="buttons"><label>{t('caseStatus')}<select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(item=><option value={item} key={item}>{t(item)}</option>)}</select></label><button className="quiet" onClick={update}>{t('refreshQueue')}</button></div>
    {!current&&<p role="status">{t('loading')}</p>}
    {current?.error&&<p role="alert" className="feedback error">{t(current.error)}</p>}
    {current?.queue?.length===0&&<p className="empty">{t('emptyQueue')}</p>}
    {current?.queue?.map(item=><article className="panel stack" key={item.id}>
      <div className="section-head review-case"><h2>{item.name}</h2><span className="verified">{t(item.status)}</span></div>
      <p>{t(item.method)}{item.category?' · '+t(item.category):''} · {date(item.created_at)}</p>
      {item.provider_result&&<p>{t(item.provider_result==='passed'?'provider_passed':'provider_failed')}</p>}
      {item.valid_until&&<p>{t('validUntil')} {date(item.valid_until)}</p>}
      {item.reason&&<p>{t(item.reason)}</p>}
      {item.evidence_ref&&<details><summary>{t('evidenceReference')}</summary><p>{item.evidence_ref}</p></details>}
      {item.history?.length>0&&<details><summary>{t('auditHistory')}</summary>
        <ul>{item.history.map(event=><li key={event.id}>{t(event.action)} · {date(event.created_at)}{event.actor?' · '+event.actor:''}</li>)}</ul>
      </details>}
      {item.status==='ready'&&item.provider_result==='passed'&&(!item.valid_until||Date.parse(item.valid_until)>Date.now())&&
        <div><button className="primary" disabled={busy} onClick={()=>send('reviewCheck',{id:item.id,decision:'approve'},update)}>{t('approveCheck')}</button></div>}
      {['ready','approved'].includes(item.status)&&<form className="buttons" onSubmit={event=>{
        event.preventDefault();const reason=new FormData(event.currentTarget).get('reason');
        send('reviewCheck',{id:item.id,decision:item.status==='ready'?'reject':'revoke',reason},update);
      }}>
        <label>{t('decisionReason')}<select name="reason" required defaultValue=""><option value="" disabled>{t('chooseReason')}</option>{reasons.map(reason=><option key={reason} value={reason}>{t(reason)}</option>)}</select></label>
        <button className="quiet" disabled={busy}>{t(item.status==='ready'?'rejectCheck':'revokeCheck')}</button>
      </form>}
    </article>)}
  </section>;
}