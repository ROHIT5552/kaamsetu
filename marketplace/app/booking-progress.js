import { CalendarCheck,Truck,MapPin,Hammer,CheckCircle2 } from 'lucide-react';

const steps=[['confirmed',CalendarCheck],['en_route',Truck],['arrived',MapPin],['in_progress',Hammer],['completed',CheckCircle2]];

export default function BookingProgress({state,events,t,date}) {
  const completed=new Map(events.map(event=>[event.state,event.created]));
  return <section className="booking-progress" aria-label={t('progress')}>
    <h3>{t('progress')}</h3>
    <ol>{steps.map(([step,Icon])=><li key={step} data-done={completed.has(step)}
      aria-current={step===state?'step':undefined}>
      <span className="progress-icon"><Icon size={18} aria-hidden="true"/></span>
      <strong>{t(step)}</strong>
      {completed.has(step)&&<small>{date(completed.get(step))}</small>}
    </li>)}</ol>
    {['cancelled','disputed'].includes(state)&&<p className="feedback">{t(state)}{completed.has(state)?' · '+date(completed.get(state)):''}</p>}
  </section>;
}