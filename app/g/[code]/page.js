'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, money, calcTotal } from '../../../lib/supabase';

export default function OrderPage() {
  const { code } = useParams();
  const [group, setGroup] = useState(null);
  const [items, setItems] = useState([]);
  const [person, setPerson] = useState('');
  const [note, setNote] = useState('');
  const [qty, setQty] = useState({});
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: g } = await supabase.from('groups').select('*').eq('code', code).maybeSingle();
      if (g) {
        setGroup(g);
        const { data } = await supabase.from('items').select('*').eq('group_id', g.id).order('sort');
        setItems(data || []);
        setPerson(localStorage.getItem('myName') || '');
      }
      setLoading(false);
    })();
  }, [code]);

  // 輸入過名字就帶出之前的單,方便修改
  async function loadMine() {
    if (!group || !person.trim()) return;
    const { data } = await supabase.from('orders').select('*').eq('group_id', group.id).eq('person', person.trim()).maybeSingle();
    if (data) { setQty(data.qty || {}); setNote(data.note || ''); setMsg({ ok: true, t: '已帶出你之前的訂單,可以直接修改。' }); }
  }

  const closed = group?.deadline && new Date(group.deadline) < new Date();
  const total = calcTotal(qty, items);
  const change = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));

  async function submit() {
    if (!person.trim()) return setMsg({ ok: false, t: '請先填名字' });
    if (total === 0) return setMsg({ ok: false, t: '還沒選任何品項' });
    const clean = Object.fromEntries(Object.entries(qty).filter(([, n]) => n > 0));
    const { error } = await supabase.from('orders').upsert(
      { group_id: group.id, person: person.trim(), note, qty: clean, updated_at: new Date().toISOString() },
      { onConflict: 'group_id,person' }
    );
    if (error) return setMsg({ ok: false, t: '送出失敗:' + error.message });
    localStorage.setItem('myName', person.trim());
    setMsg(null);
    setDone(true);
    window.scrollTo(0, 0);
  }

  if (loading) return <main>載入中…</main>;
  if (!group) return <main><h1>找不到這場團購</h1><p className="sub">請確認連結是否正確。</p></main>;

  if (done) {
    return (
      <main>
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 48, color: 'var(--jade)' }} aria-hidden>✓</div>
          <h1>訂單已送出</h1>
          <p className="sub">{group.name}・{person.trim()}</p>
          <div style={{ textAlign: 'left', maxWidth: 320, margin: '16px auto' }}>
            {items.filter((it) => qty[it.id] > 0).map((it) => (
              <div className="item" key={it.id}>
                <span>{it.name} x{qty[it.id]}</span>
                <span>{money(it.price * qty[it.id])}</span>
              </div>
            ))}
            {note && <p className="sub">備註:{note}</p>}
          </div>
          <div className="total">合計 {money(total)}</div>
          <p className="sub">記得付款給團主。想修改的話,按下面的按鈕。</p>
          <button onClick={() => setDone(false)}>修改我的訂單</button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>{group.name}</h1>
      <p className="sub">
        {group.deadline ? `截止:${new Date(group.deadline).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })}` : '未設定截止時間'}
      </p>
      {closed && <div className="notice bad">已經截止,不能再下單了。</div>}
      <div className="card">
        <label>你的名字</label>
        <input value={person} onChange={(e) => setPerson(e.target.value)} onBlur={loadMine} placeholder="例如:小明" disabled={closed} />
      </div>
      <div className="card">
        {items.map((it) => (
          <div className="item" key={it.id}>
            <div>{it.name} <span className="price">{money(it.price)}</span></div>
            <div className="stepper">
              <button onClick={() => change(it.id, -1)} disabled={closed || !qty[it.id]} aria-label={`減少${it.name}`}>−</button>
              <span>{qty[it.id] || 0}</span>
              <button onClick={() => change(it.id, 1)} disabled={closed} aria-label={`增加${it.name}`}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <label>備註(可不填)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如:不要辣" disabled={closed} />
      </div>
      {msg && <div className={'notice' + (msg.ok ? '' : ' bad')}>{msg.t}</div>}
      <div className="bar"><div>
        <div>合計 <span className="total">{money(total)}</span></div>
        <button className="primary" onClick={submit} disabled={closed}>送出訂單</button>
      </div></div>
    </main>
  );
}
