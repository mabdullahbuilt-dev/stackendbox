import { Check, Mail, Sparkles } from "lucide-react";
import { Avatar, Bars, Bubble, Line, Pill, Tile } from "@/components/ui/mock";

/* BEFORE: polished-but-fragmented fragments (inconsistent chrome on purpose). */
export const Before = {
  spreadsheet: (
    <div className="frag frag--sheet">
      <div className="frag__bar mono">leads_FINAL_v3.xlsx</div>
      <div className="sheet">
        {[["Name", "Source", "Status"], ["M. Chen", "form", "called?"], ["Northwind", "email", "—"], ["S. Ortiz", "wa", "follow up"], ["Studio 12", "form", "called?"], ["Orbit", "?", "—"]].map((r, i) => (
          <div key={i} className="sheet__r" data-h={i === 0 ? "head" : i === 1 ? "hl" : undefined}>
            {r.map((c, j) => <span key={j}>{c}</span>)}
          </div>
        ))}
      </div>
    </div>
  ),
  whatsapp: (
    <div className="frag frag--chat">
      <div className="frag__bar mono">Chat · Customer</div>
      <div className="frag__body"><Bubble>Are you open Friday?</Bubble><Bubble>Can I move my booking to 7?</Bubble><Bubble>Any update?</Bubble></div>
    </div>
  ),
  email: (
    <div className="frag frag--mail">
      <div className="frag__bar mono"><Mail className="mk-inl" /> Inbox · RE: booking Friday</div>
      <div className="frag__body"><Line w="85%" tone="strong" /><Line w="95%" /><Line w="60%" /></div>
    </div>
  ),
  calendar: (
    <div className="frag frag--cal">
      <div className="frag__bar mono">Week 41</div>
      <div className="cal">{["M", "T", "W", "T", "F"].map((d, i) => <div key={i}><span className="mono mono--muted">{d}</span>{i === 4 && <><i className="cal__ev" /><i className="cal__ev cal__ev--b" /></>}{i === 1 && <i className="cal__ev cal__ev--c" />}</div>)}</div>
    </div>
  ),
  form: (
    <div className="frag frag--form">
      <div className="frag__bar mono">Booking form</div>
      <div className="frag__body"><div className="inp">M. Chen</div><div className="inp">Fri 19:00</div><div className="inp">4 guests</div></div>
    </div>
  ),
  crm: (
    <div className="frag frag--crm">
      <div className="frag__bar mono">Contact record</div>
      <div className="frag__body"><div className="mk-row"><b>Maya Chen</b><Pill tone="amber">Stale</Pill></div><span className="mk-sub">Status: Contacted · last touch 12 days</span><Line w="70%" /></div>
    </div>
  ),
  note: (
    <div className="frag frag--note"><b>call back Tue?</b><span className="mk-sub">maya — pricing??</span></div>
  ),
  tasks: (
    <div className="frag frag--tasks">
      <div className="frag__bar mono">To do</div>
      <div className="frag__body">
        {["Call Maya", "Confirm Friday", "Call Maya", "Send menu", "Confirm Friday"].map((t, i) => (
          <div key={i} className="trow" data-dup={i === 2 || i === 4 ? "true" : undefined}><i className="box" />{t}</div>
        ))}
      </div>
    </div>
  ),
};

/* AFTER: the unified, running system. */
export const After = {
  analytics: (
    <div className="mod">
      <div className="mod__h mono">ANALYTICS</div>
      <div className="mod__row"><Tile label="LEADS · WEEK" value="128" tone="cyan" /><Tile label="BOOKED" value="42" tone="green" /></div>
      <Bars values={[30, 44, 38, 62, 55, 80, 72, 90]} tone="cyan" />
    </div>
  ),
  messages: (
    <div className="mod">
      <div className="mod__h mono">MESSAGES · ONE THREAD</div>
      <Bubble me>Can I move my booking to 7?</Bubble>
      <Bubble tone="green">Moved to 19:00 — see you Friday.</Bubble>
      <Pill tone="cyan">Email + chat merged</Pill>
    </div>
  ),
  booking: (
    <div className="mod">
      <div className="mod__h mono">BOOKING</div>
      <div className="mk-row"><b>Fri 19:00 · Table 4</b><Pill tone="green">Confirmed</Pill></div>
      <span className="mk-sub">Clash resolved · reminder queued</span>
    </div>
  ),
  crm: (
    <div className="mod">
      <div className="mod__h mono">CRM</div>
      <div className="mk-row"><b>Maya Chen</b><Pill tone="blue">Qualified</Pill></div>
      <span className="mk-sub">Updated automatically · owner Sam</span>
    </div>
  ),
  ai: (
    <div className="mod">
      <div className="mod__h mono"><Sparkles className="mk-inl" /> AI ASSISTANT</div>
      <span className="mk-sub">Suggested: call Maya Tuesday 10:00 — asked about pricing.</span>
      <div className="dm-meter"><i style={{ width: "100%" }} /></div>
    </div>
  ),
  tasks: (
    <div className="mod">
      <div className="mod__h mono">TASKS</div>
      {["Call Maya · Tue", "Confirm Friday", "Send menu"].map((t, i) => (
        <div key={t} className="mk-trow"><Check className="mk-inl ok" /><span>{t}</span><Avatar>{["S", "R", "A"][i]}</Avatar></div>
      ))}
    </div>
  ),
  automation: (
    <div className="mod">
      <div className="mod__h mono">AUTOMATION</div>
      {["New lead → score + route", "Booking → confirm + remind", "No reply 2d → follow up"].map((t) => (
        <div key={t} className="rule"><span>{t.replace("→", "·")}</span><i className="tg" /></div>
      ))}
    </div>
  ),
  alerts: (
    <div className="mod">
      <div className="mod__h mono">TEAM ALERTS</div>
      {["Booking confirmed", "Lead routed to Sam", "Reminder sent"].map((t) => (
        <div key={t} className="alert"><i className="vd" />{t}</div>
      ))}
    </div>
  ),
};
