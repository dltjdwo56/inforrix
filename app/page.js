'use client';
import { useState, useEffect, useCallback } from 'react';

const C = {
  bg: '#0D1117', card: '#161B22', border: '#30363D', borderActive: '#3182F6',
  text1: '#E6EDF3', text2: '#8B949E', text3: '#484F58',
  up: '#F04452', down: '#3182F6', accent: '#3182F6',
  accentDim: 'rgba(49,130,246,0.12)',
  green: '#00C471', greenDim: 'rgba(0,196,113,0.12)',
  gold: '#F5A623', goldDim: 'rgba(245,166,35,0.12)',
  danger: '#F04452', dangerDim: 'rgba(240,68,82,0.12)',
};

const f = (v, d = 2) => typeof v === 'number' ? (v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(d)) : String(v);
const fw = (v) => typeof v === 'number' ? Math.round(v).toLocaleString('ko-KR') + '원' : '—';

function Card({ children, onClick, active, style }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, borderRadius: 14, padding: '14px 16px',
      cursor: onClick ? 'pointer' : 'default',
      border: `1px solid ${active ? C.borderActive : C.border}`,
      transition: 'all 0.2s', ...style,
    }}>{children}</div>
  );
}

function getMood(data) {
  if (!data) return { emoji: '⏳', sum: '데이터를 불러오는 중...', detail: '', color: C.text3 };
  let score = 0, reasons = [];
  const spy = data.stocks?.find(s => s.id === 'spy');
  const gld = data.stocks?.find(s => s.id === 'gld');
  const uso = data.stocks?.find(s => s.id === 'uso');
  if (spy?.change > 0.3) { score++; reasons.push('미국 시장 상승'); }
  else if (spy?.change < -0.3) { score--; reasons.push('미국 시장 하락'); }
  if (gld?.change > 0.3) reasons.push('금값 상승');
  if (uso?.change > 1) reasons.push('유가 상승');
  else if (uso?.change < -1) reasons.push('유가 하락');
  if (data.fx?.usdkrw > 1450) reasons.push('원화 약세');
  if (score >= 1) return { emoji: '📈', sum: '시장이 상승 흐름이에요', detail: reasons.join(' · '), color: C.green };
  if (score <= -1) return { emoji: '📉', sum: '시장이 하락 흐름이에요', detail: reasons.join(' · '), color: C.danger };
  return { emoji: '📊', sum: '혼조세를 보이고 있어요', detail: reasons.join(' · ') || '안정적인 흐름', color: C.gold };
}

const FX_CONFIG = [
  { key: 'usdkrw', icon: '🇺🇸', name: '달러', label: 'USD/KRW', tip: (v) => `1달러에 ${fw(v)}이에요. 해외직구·달러 투자 시 참고하세요.` },
  { key: 'eurkrw', icon: '🇪🇺', name: '유로', label: 'EUR/KRW', tip: (v) => `1유로가 ${fw(v)}이에요. 유럽 여행 중이라면 체크하세요.` },
  { key: 'jpykrw', icon: '🇯🇵', name: '엔화(100)', label: 'JPY100/KRW', tip: (v) => `100엔이 ${fw(v)}이에요. 일본 여행·직구 참고하세요.` },
  { key: 'cnykrw', icon: '🇨🇳', name: '위안', label: 'CNY/KRW', tip: (v) => `1위안이 ${fw(v)}이에요. 알리·테무 직구 참고하세요.` },
];

const COMMODITY_TIPS = {
  gld: { up: '금값 상승 중. 불확실한 시기에 안전자산 수요가 늘고 있어요.', down: '금값 조정 중. 장기적으로는 여전히 견고한 자산이에요.' },
  slv: { up: '은값 상승 중. 산업+투자 수요가 동시에 작용하고 있어요.', down: '은값 하락 중. 금보다 변동성이 크지만 저가 매수 기회일 수 있어요.' },
  uso: { up: '유가 상승 중. 주유소 기름값이 오를 수 있어요.', down: '유가 하락 중. 기름값 안정이 기대돼요.' },
};

const STOCK_TIPS = {
  spy: { up: '미국 대형주 상승. 해외주식에 긍정적이에요.', down: '미국 시장 하락. 장기 관점에서 매수 기회일 수 있어요.' },
  qqq: { up: '기술주 강세. AI·반도체 투자에 긍정적이에요.', down: '기술주 약세. 단기 변동에 흔들리지 마세요.' },
  aapl: { up: '애플 상승. 실적 기대감이 반영된 거예요.', down: '애플 하락. 장기적으로는 걱정할 수준이 아니에요.' },
  tsla: { up: '테슬라 반등. 변동성이 큰 종목이니 분할 매수가 안전해요.', down: '테슬라 하락. 장기 관점이 중요해요.' },
};

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exFx, setExFx] = useState(null);
  const [exCom, setExCom] = useState(null);
  const [exSt, setExSt] = useState(null);
  const [showNews, setShowNews] = useState(false);
  const [ai, setAi] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [subDone, setSubDone] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/market');
        const d = await res.json();
        setData(d);
      } catch (e) { setError('데이터를 불러오지 못했어요'); }
      setLoading(false);
    })();
  }, []);

  const askAI = useCallback(async () => {
    if (!data) return;
    setAiLoading(true); setAi('');
    const info = [
      data.fx ? `USD/KRW: ${data.fx.usdkrw}원` : '',
      ...(data.stocks || []).map(s => `${s.label}: $${f(s.price)} (${s.change > 0 ? '+' : ''}${f(s.change)}%)`),
    ].filter(Boolean).join(', ');
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketData: info }) });
      const d = await res.json();
      setAi(d.insight || d.error || '분석을 불러오지 못했어요.');
    } catch { setAi('네트워크를 확인해주세요.'); }
    setAiLoading(false);
  }, [data]);

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${['일','월','화','수','목','금','토'][now.getDay()]}요일`;
  const mood = getMood(data);
  const commodities = (data?.stocks || []).filter(s => ['gld','slv','uso'].includes(s.id));
  const stocks = (data?.stocks || []).filter(s => ['spy','qqq','aapl','tsla'].includes(s.id));

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', background: C.bg, minHeight: '100vh', paddingBottom: 60 }}>

      {/* 헤더 */}
      <div style={{ background: C.card, padding: '40px 20px 20px', borderRadius: '0 0 20px 20px', borderBottom: `1px solid ${C.border}`, animation: 'fadeUp 0.4s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: C.text3, fontWeight: 500, letterSpacing: 0.5 }}>{dateStr}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text1, marginTop: 3 }}>{greeting}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5 }}>
            <span style={{ color: C.accent }}>INFO</span><span style={{ color: C.text1 }}>RIX</span>
          </div>
        </div>
        <div style={{ marginTop: 16, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: C.bg, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 28, animation: loading ? 'breathe 1.5s infinite' : '' }}>{mood.emoji}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: mood.color }}>{mood.sum}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{mood.detail || '데이터를 가져오고 있어요...'}</div>
          </div>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ padding: '48px 16px', textAlign: 'center', animation: 'fadeUp 0.4s' }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: 'breathe 2s infinite' }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 6 }}>시장 데이터를 가져오고 있어요</div>
          <div style={{ fontSize: 12, color: C.text3 }}>잠깐이면 돼요...</div>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div style={{ padding: '20px 16px' }}>
          <Card><div style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>😢</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 10 }}>{error}</div>
            <button onClick={() => window.location.reload()} style={{ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', cursor: 'pointer' }}>다시 시도</button>
          </div></Card>
        </div>
      )}

      {data && !loading && (<>

        {/* ===== 2컬럼: 원자재(왼) + 환율(오) ===== */}
        <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* 왼쪽: 원자재 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🪨</span> 원자재
              {commodities.some(c => c.marketOpen) && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: C.greenDim, color: C.green, fontWeight: 600 }}>LIVE</span>}
              {!commodities.some(c => c.marketOpen) && commodities.length > 0 && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: C.dangerDim, color: C.text3, fontWeight: 600 }}>마감</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {commodities.length > 0 ? commodities.map((item, i) => {
                const up = item.change > 0;
                const open = exCom === item.id;
                const tips = COMMODITY_TIPS[item.id] || { up: '상승 중', down: '하락 중' };
                return (
                  <div key={item.id} style={{ animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                    <Card onClick={() => setExCom(open ? null : item.id)} active={open}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{item.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>${f(item.price)}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: up ? C.up : C.down, fontVariantNumeric: 'tabular-nums' }}>
                          {up ? '▲' : '▼'}{f(Math.abs(item.change))}%
                        </div>
                      </div>
                      {open && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, animation: 'slideDown 0.2s' }}>
                          <div style={{ background: C.accentDim, borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.accent, marginBottom: 2 }}>나에게 미치는 영향</div>
                            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{up ? tips.up : tips.down}</div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              }) : (
                <Card style={{ opacity: 0.5 }}>
                  <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: C.text3 }}>
                    데이터 로딩 중...
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* 오른쪽: 환율 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💱</span> 환율
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.fx && FX_CONFIG.map((item, i) => {
                const val = data.fx[item.key];
                const open = exFx === item.key;
                return (
                  <div key={item.key} style={{ animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                    <Card onClick={() => setExFx(open ? null : item.key)} active={open}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{item.name}</div>
                            <div style={{ fontSize: 10, color: C.text3 }}>{item.label}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>{fw(val)}</div>
                      </div>
                      {open && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, animation: 'slideDown 0.2s' }}>
                          <div style={{ background: C.accentDim, borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.accent, marginBottom: 2 }}>이게 무슨 뜻이에요?</div>
                            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{item.tip(val)}</div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 글로벌 주식 (풀 너비) */}
        {stocks.length > 0 && (
          <div style={{ padding: '20px 16px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📊</span> 글로벌 주식
              {stocks.some(s => s.marketOpen) ? (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: C.greenDim, color: C.green, fontWeight: 600 }}>LIVE</span>
              ) : (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: C.dangerDim, color: C.text3, fontWeight: 600 }}>마감</span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {stocks.map((item, i) => {
                const up = item.change > 0;
                const open = exSt === item.id;
                const tips = STOCK_TIPS[item.id] || { up: '상승', down: '하락' };
                return (
                  <div key={item.id} style={{ animation: `fadeUp 0.3s ease ${i * 0.04}s both`, gridColumn: open ? '1 / -1' : 'auto' }}>
                    <Card onClick={() => setExSt(open ? null : item.id)} active={open}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: C.text2 }}>{item.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>${f(item.price)}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: up ? C.up : C.down, fontVariantNumeric: 'tabular-nums' }}>
                          {up ? '▲' : '▼'}{f(Math.abs(item.change))}%
                        </div>
                      </div>
                      {open && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, animation: 'slideDown 0.2s' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                            {[{ l: '시가', v: item.open }, { l: '고가', v: item.high }, { l: '저가', v: item.low }].map(x => (
                              <div key={x.l} style={{ background: C.bg, borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: C.text3 }}>{x.l}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>${f(x.v)}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ background: C.accentDim, borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.accent, marginBottom: 2 }}>나에게 미치는 영향</div>
                            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{up ? tips.up : tips.down}</div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI 분석 */}
        <div style={{ padding: '20px 16px 0' }}>
          <div onClick={!aiLoading ? askAI : undefined} style={{
            background: ai ? C.card : `linear-gradient(135deg, ${C.accent}, #1B64DA)`,
            borderRadius: 14, padding: '18px 20px',
            cursor: aiLoading ? 'default' : 'pointer',
            border: ai ? `1px solid ${C.border}` : 'none',
            transition: 'all 0.3s',
          }}>
            {!ai && !aiLoading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🤖</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>AI 시장 분석</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>실시간 데이터 기반으로 분석해드려요</div>
              </div>
            )}
            {aiLoading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6, animation: 'breathe 1s infinite' }}>🤖</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ai ? C.text1 : '#fff' }}>분석 중...</div>
              </div>
            )}
            {ai && !aiLoading && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>🤖</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>AI 실시간 분석</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: C.text2, margin: 0 }}>{ai}</p>
                <div onClick={e => { e.stopPropagation(); askAI(); }} style={{ fontSize: 11, color: C.text3, marginTop: 8, cursor: 'pointer' }}>다시 물어보기 ↻</div>
              </>
            )}
          </div>
        </div>

        {/* 뉴스 */}
        {data.news?.length > 0 && (
          <div style={{ padding: '20px 16px 0' }}>
            <Card onClick={() => setShowNews(!showNews)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>📰 글로벌 뉴스</div>
                <div style={{ fontSize: 13, color: C.text3, transform: showNews ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</div>
              </div>
              {showNews && (
                <div style={{ marginTop: 10, animation: 'slideDown 0.25s' }} onClick={e => e.stopPropagation()}>
                  <div style={{ height: 1, background: C.border, marginBottom: 4 }} />
                  {data.news.map((n, i) => {
                    const ago = Math.round((Date.now() - n.datetime * 1000) / 3600000);
                    return (
                      <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '10px 2px', borderBottom: i < data.news.length - 1 ? `1px solid ${C.border}` : 'none', textDecoration: 'none' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.text2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.headline}</div>
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{n.source} · {ago < 1 ? '방금' : ago < 24 ? `${ago}시간 전` : `${Math.round(ago / 24)}일 전`}</div>
                      </a>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 구독 */}
        <div style={{ padding: '20px 16px 0' }}>
          {!subDone ? (
            <Card onClick={!showSub ? () => setShowSub(true) : undefined} style={{ cursor: showSub ? 'default' : 'pointer', background: showSub ? C.card : C.goldDim, border: `1px solid ${showSub ? C.border : C.gold}` }}>
              {!showSub ? (
                <div style={{ textAlign: 'center', padding: '4px 0' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>💬</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 3 }}>매일 아침, 경제 브리핑 받기</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>카카오톡 또는 이메일로 보내드려요</div>
                </div>
              ) : (
                <div style={{ animation: 'slideDown 0.25s' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 12 }}>📬 알림 구독</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4 }}>카카오톡</div>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, background: C.bg, color: C.text1 }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4 }}>이메일</div>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, background: C.bg, color: C.text1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowSub(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                    <button onClick={() => { if (phone || email) setSubDone(true); }} style={{ flex: 2, padding: 10, borderRadius: 10, border: 'none', background: (phone || email) ? C.accent : C.border, color: (phone || email) ? '#fff' : C.text3, fontSize: 12, fontWeight: 700, cursor: (phone || email) ? 'pointer' : 'default' }}>구독하기</button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card style={{ background: C.accentDim, border: `1px solid ${C.accent}` }}>
              <div style={{ textAlign: 'center', padding: 6 }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>구독 완료!</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>내일 아침 8시에 첫 브리핑을 보내드릴게요!</div>
              </div>
            </Card>
          )}
        </div>

        <div style={{ padding: '20px 16px 0', textAlign: 'center' }}>
          <button onClick={() => window.location.reload()} style={{ fontSize: 12, fontWeight: 600, padding: '8px 20px', borderRadius: 20, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, cursor: 'pointer' }}>↻ 새로고침</button>
        </div>
      </>)}

      <div style={{ padding: '28px 20px 16px', textAlign: 'center', fontSize: 10, color: C.text3, lineHeight: 1.8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, letterSpacing: 1 }}>
          <span style={{ color: C.accent }}>INFO</span><span style={{ color: C.text1 }}>RIX</span>
        </div>
        환율: ExchangeRate-API · 주식: Finnhub · AI: Claude
        <br />투자 결정은 본인의 판단으로 해주세요 · © 2026
      </div>
    </div>
  );
}