'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const DEFAULT_MENU = `高豬 170
韭豬 170
白韭豬 170
香菜豬 170
剝皮豬 240
高蝦 240
韭蝦 240
素食 190
蝦仁腸粉 80
蝦燒賣 150
蝦水晶餃 150
叉燒包 160
蘿蔔絲餅 120`;

const rand = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('東門興記');
  const [deadline, setDeadline] = useState('');
  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem('myGroups') || '[]'));
      const last = localStorage.getItem('lastMenu');
      if (last) { const m = JSON.parse(last); setName(m.name); setMenu(m.menu); }
    } catch {}
  }, []);

  async function create() {
    const items = menu.split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const m = l.match(/^(.+?)\s+(\d+)$/);
      return m ? { name: m[1], price: Number(m[2]), sort: i } : null;
    });
    if (!name.trim() || items.length === 0 || items.includes(null)) {
      setErr('菜單每行請寫「品項 價格」,例如:高豬 170');
      return;
    }
    setBusy(true); setErr('');
    const code = rand(6), admin_token = rand(20);
    const { data: g, error } = await supabase.from('groups').insert({
      code, admin_token, name: name.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
    }).select().single();
    if (error) { setErr('建立失敗:' + error.message); setBusy(false); return; }
    await supabase.from('items').insert(items.map((it) => ({ ...it, group_id: g.id })));
    const list = [{ name: g.name, token: admin_token, at: Date.now() }, ...history].slice(0, 30);
    localStorage.setItem('myGroups', JSON.stringify(list));
    localStorage.setItem('lastMenu', JSON.stringify({ name, menu }));
    router.push('/admin/' + admin_token);
  }

  return (
    <main>
      <h1>開一場團購</h1>
      <p className="sub">建立後會得到一個連結,貼到公司群組讓大家自己填。</p>
      <div className="card">
        <label>店名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>截止時間(可不填)</label>
        <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <label>菜單(每行:品項 價格)</label>
        <textarea value={menu} onChange={(e) => setMenu(e.target.value)} />
        {err && <div className="notice bad">{err}</div>}
        <p><button className="primary" onClick={create} disabled={busy}>{busy ? '建立中…' : '建立團購'}</button></p>
      </div>
      {history.length > 0 && (
        <>
          <h2>我開過的團購</h2>
          <div className="card">
            {history.map((h) => (
              <div className="item" key={h.token}>
                <a href={'/admin/' + h.token}>{h.name}</a>
                <span className="sub">{new Date(h.at).toLocaleDateString('zh-TW')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
