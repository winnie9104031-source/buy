'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, money, calcTotal } from '../../../lib/supabase';

export default function Admin() {
  const { token } = useParams();
  const [group, setGroup] = useState(null);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState('loading');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    const { data: g } = await supabase.from('groups').select('*').eq('admin_token', token).maybeSingle();
    if (!g) return setState('none');
    const [i, o] = await Promise.all([
      supabase.from('items').select('*').eq('group_id', g.id).order('sort'),
      supabase.from('orders').select('*').eq('group_id', g.id).order('updated_at'),
    ]);
    setGroup(g); setItems(i.data || []); setOrders(o.data || []); setState('ok');
  }, [token]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  async function togglePaid(o) {
    setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, paid: !x.paid } : x)));
    await supabase.from('orders').update({ paid: !o.paid }).eq('id', o.id);
  }
  async function remove(o) {
    if (!confirm(`刪除 ${o.person} 的訂單?`)) return;
    await supabase.from('orders').delete().eq('id', o.id);
    load();
  }
  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(''), 1500);
  }

  if (state === 'loading') return <main>載入中…</main>;
  if (state === 'none') return <main><h1>找不到這場團購</h1><p className="sub">請確認後台連結是否完整。</p></main>;

  const shareUrl = `${location.origin}/g/${group.code}`;
  const totals = items.map((it) => orders.reduce((s, o) => s + (o.qty?.[it.id] || 0), 0));
  const grand = orders.reduce((s, o) => s + calcTotal(o.qty, items), 0);
  const summary = `【${group.name}】\n` +
    items.map((it, i) => (totals[i] ? `${it.name} x${totals[i]}` : null)).filter(Boolean).join('\n') +
    `\n共 ${money(grand)}`;
  const notes = orders.filter((o) => o.note);

  return (
    <main className="wide">
      <h1>{group.name}</h1>
      <p className="sub">{orders.length} 人已下單,每 10 秒自動更新。請把這頁網址存成書籤,它就是你的後台。</p>

      <div className="card">
        <label>給同事的下單連結</label>
        <div className="linkrow">
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <button onClick={() => copy(shareUrl, 'link')}>{copied === 'link' ? '已複製' : '複製連結'}</button>
        </div>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              {items.map((it) => <th key={it.id}>{it.name}<br /><span className="price">{it.price}</span></th>)}
              <th>個人合計</th><th>已付款</th><th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={items.length + 4}>還沒有人下單,把連結貼到群組吧。</td></tr>}
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.person}</td>
                {items.map((it) => {
                  const n = o.qty?.[it.id] || 0;
                  return <td key={it.id} className={n ? 'num' : 'zero'}>{n || '·'}</td>;
                })}
                <td className="num">{money(calcTotal(o.qty, items))}</td>
                <td><input type="checkbox" checked={!!o.paid} onChange={() => togglePaid(o)} aria-label={`${o.person} 已付款`} /></td>
                <td><button onClick={() => remove(o)} aria-label={`刪除${o.person}`}>刪除</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>各品項總數</td>
              {totals.map((n, i) => <td key={i}>{n}</td>)}
              <td>{money(grand)}</td><td>{orders.filter((o) => o.paid).length}/{orders.length}</td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {notes.length > 0 && (
        <div className="card">
          <strong>備註</strong>
          {notes.map((o) => <div key={o.id}>{o.person}:{o.note}</div>)}
        </div>
      )}

      <div className="card">
        <strong>訂單摘要(給店家或貼群組)</strong>
        <pre style={{ whiteSpace: 'pre-wrap', font: 'inherit' }}>{summary}</pre>
        <button onClick={() => copy(summary, 'sum')}>{copied === 'sum' ? '已複製' : '複製摘要'}</button>
      </div>
      <p><a href="/">← 開新團購</a></p>
    </main>
  );
}
