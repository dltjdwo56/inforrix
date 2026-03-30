'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

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
const fd = (v) => v != null ? (typeof v === 'number' ? v.toFixed(2) : v) : '—';


const FX_CONFIG = [
  { key: 'usdkrw', icon: '🇺🇸', name: '달러', label: 'USD/KRW' },
  { key: 'eurkrw', icon: '🇪🇺', name: '유로', label: 'EUR/KRW' },
  { key: 'jpykrw', icon: '🇯🇵', name: '엔(100)', label: 'JPY100' },
  { key: 'cnykrw', icon: '🇨🇳', name: '위안', label: 'CNY/KRW' },
];

function Card({ children, onClick, active, style }) {
  return (<div onClick={onClick} style={{ background: C.card, borderRadius: 14, padding: '14px 16px', cursor: onClick ? 'pointer' : 'default', border: `1px solid ${active ? C.borderActive : C.border}`, transition: 'all 0.2s', ...style }}>{children}</div>);
}

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [exFx, setExFx] = useState(null);
  const [exCom, setExCom] = useState(null);
  const [exSt, setExSt] = useState(null);
  const [fxInsights, setFxInsights] = useState({});
  const [comInsights, setComInsights] = useState({});
  const [insightLoading, setInsightLoading] = useState(null);
  const [showMoodDetail, setShowMoodDetail] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [subDone, setSubDone] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [greeting, setGreeting] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState(null);
  const [metricTip, setMetricTip] = useState(null);
  const [metricInsight, setMetricInsight] = useState({});
  const [metricInsightLoading, setMetricInsightLoading] = useState(null);
  const [eterm, setEterm] = useState(null);
  const [etermLoading, setEtermLoading] = useState(true);
  const [termSearch, setTermSearch] = useState('');
  const [activeStocks, setActiveStocks] = useState([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const [recStockIndex, setRecStockIndex] = useState(0);
  const [kospiData, setKospiData] = useState(null);


  useEffect(() => { 
    const now = new Date();
    // 한국 시간(KST) 계산 (UTC+9)
    const kstDate = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60000);
    const h = kstDate.getHours();
    const m = kstDate.getMinutes();
    const day = kstDate.getDay();
    const time = h * 100 + m; // 예: 09:30 -> 930

    if (day === 0 || day === 6) setGreeting('주말은 증시 휴장일이에요 😴');
    else if (time < 900) setGreeting('코스피 개장 전이에요 🌅');
    else if (time >= 900 && time < 1530) setGreeting('코스피 정규장 진행 중 📊');
    else setGreeting('오늘 코스피 장이 마감되었어요 🌙');
  }, []);

  useEffect(() => {
    fetch('/api/kospi')
      .then(r => r.json())
      .then(d => {
        if (d.price) setKospiData(d);
      })
      .catch(() => {});
  }, []);

  const loadEterm = useCallback((query = '') => {
    setEtermLoading(true);
    fetch(`/api/econ-term${query ? `?q=${encodeURIComponent(query)}` : `?r=${Date.now()}`}`)
      .then(r => r.json())
      .then(d => { if (d.term) setEterm(d); })
      .catch(() => {})
      .finally(() => setEtermLoading(false));
  }, []);

  useEffect(() => { loadEterm(); }, [loadEterm]);

  // 1단계: 데이터 먼저 빠르게 로드
  useEffect(() => {
    (async () => {
      try { const res = await fetch('/api/market'); setData(await res.json()); }
      catch { setError('데이터를 불러오지 못했어요'); }
      // 활발한 종목 로드
      fetch('/api/active').then(r => r.json()).then(d => { 
        if (d.stocks) { setActiveStocks(d.stocks); }
      }).catch(() => {});
      setLoading(false);
    })();
  }, []);

  // 2단계: 데이터 로드 후 AI 분석을 백그라운드로
  useEffect(() => {
    if (!data || !data.stocks?.length) return;
    setAiLoading(true);
    const info = [
      data.fx ? `환율: USD/KRW ${data.fx.usdkrw}원, EUR/KRW ${data.fx.eurkrw}원, JPY100 ${data.fx.jpykrw}원` : '',
      ...data.stocks.map(s => `${s.label}(${s.symbol}): $${s.price.toFixed(2)} (${s.change>0?'+':''}${s.change.toFixed(2)}%)`),
      data.news?.length ? `뉴스: ${data.news.slice(0,3).map(n=>n.headline).join('; ')}` : '',
    ].filter(Boolean).join('\n');

    fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketData: info, mode: 'market-summary' }) })
      .then(r => r.json())
      .then(d => { if (d.aiSummary) setAiSummary(d.aiSummary); })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [data]);

  // 뉴스 자동 슬라이드 타이머
  useEffect(() => {
    if (!data?.news?.length) return;
    const timer = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % Math.min(data.news.length, 5));
    }, 6000);
    return () => clearInterval(timer);
  }, [data]);

  // 추천 종목 자동 슬라이드 타이머
  useEffect(() => {
    if (!activeStocks || activeStocks.length === 0) return;
    const timer = setInterval(() => {
      setRecStockIndex(prev => (prev + 1) % activeStocks.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeStocks]);

  // 실시간 검색어 자동완성 (디바운스 350ms 적용)
  useEffect(() => {
    if (!searchQuery.trim() || searching || searchResult) {
      setLiveSuggestions(null);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&type=suggest`);
        if (!active) return;
        const data = await res.json();
        if (data.suggestions?.length > 0) setLiveSuggestions(data.suggestions);
        else setLiveSuggestions(null);
      } catch { if (active) setLiveSuggestions(null); }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [searchQuery, searching, searchResult]);

  const doSearch = useCallback(async (queryOverride) => {
    const targetQuery = typeof queryOverride === 'string' ? queryOverride : searchQuery;
    if (!targetQuery.trim()) return;
    if (typeof queryOverride === 'string') setSearchQuery(targetQuery);
    setLiveSuggestions(null);
    setSearching(true); setSearchResult(null); setMetricTip(null);
    try { const res = await fetch(`/api/search?q=${encodeURIComponent(targetQuery.trim())}`); setSearchResult(await res.json()); }
    catch { setSearchResult({ error: '검색에 실패했어요' }); }
    setSearching(false);
  }, [searchQuery]);

  const now = new Date();
  const dateStr = `${now.getMonth()+1}월 ${now.getDate()}일 ${['일','월','화','수','목','금','토'][now.getDay()]}요일`;
  const commodities = (data?.stocks || []).filter(s => ['gld','slv','uso'].includes(s.id));
  const stocks = (data?.stocks || []).filter(s => ['spy','qqq','aapl','tsla'].includes(s.id));
  const vix = (data?.stocks || []).find(s => s.id === 'vix');
  const recStock = activeStocks.length > 0 ? activeStocks[recStockIndex] : null;
  // AI 요약 or 로딩 상태
  const moodColors = { '상승': C.green, '하락': C.danger, '혼조': C.gold, '급등': C.green, '급락': C.danger, '관망': C.text2 };
  const mood = aiSummary ? {
    emoji: aiSummary.emoji, sum: aiSummary.headline, detail: aiSummary.summary,
    color: moodColors[aiSummary.mood] || C.gold,
    reasons: (aiSummary.signals||[]).map(s => ({ icon: s.emoji, text: s.insight, asset: s.asset, direction: s.direction })),
    actionTip: aiSummary.actionTip,
  } : { emoji: aiLoading ? '🔄' : '🤖', sum: aiLoading ? 'AI가 시장을 분석하고 있어요...' : 'AI가 분석할 시장 데이터를 가져왔어요', detail: '', color: C.gold, reasons: [], actionTip: '' };

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', background: C.bg, minHeight: '100vh', paddingBottom: 60 }}>

      {/* 헤더 */}
      <div style={{ background: C.card, padding: '36px 20px 18px', borderRadius: '0 0 20px 20px', borderBottom: `1px solid ${C.border}`, animation: 'fadeUp 0.4s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: C.text1, fontWeight: 700, letterSpacing: 0.5 }}>{dateStr}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text1 }}>{greeting}</div>
              {kospiData && (
                <div style={{ padding: '4px 8px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeUp 0.4s' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.text3 }}>KOSPI</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>{kospiData.price}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: kospiData.isUp ? C.up : C.down }}>{kospiData.isUp ? '▲' : '▼'}{Math.abs(kospiData.changePercent)}%</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5 }}><span style={{ color: C.accent }}>INFO</span><span style={{ color: C.text1 }}>RIX</span></div>
        </div>

        {/* AI 시장 요약 */}
        <div onClick={() => !aiLoading && setShowMoodDetail(!showMoodDetail)} style={{ marginTop: 14, borderRadius: 12, padding: '12px 14px', background: C.bg, border: `1px solid ${showMoodDetail ? C.borderActive : C.border}`, cursor: aiLoading ? 'default' : 'pointer', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26, animation: aiLoading ? 'breathe 1s infinite' : '' }}>{mood.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: mood.color }}>{mood.sum}</div>
              {aiSummary && <div style={{ fontSize: 12, color: C.text1, marginTop: 4, lineHeight: 1.5 }}>{mood.detail}</div>}
              <div style={{ fontSize: 11, color: C.text3, marginTop: aiSummary ? 6 : 1 }}>{aiLoading ? '실시간 데이터로 분석 중...' : aiSummary ? '▾ 탭해서 주요 시그널 보기' : ''}</div>
            </div>
            {!aiLoading && !aiSummary && <div style={{ fontSize: 12, color: C.text3, transform: showMoodDetail ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</div>}
          </div>
          {showMoodDetail && aiSummary && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, animation: 'slideDown 0.25s' }}>
              {mood.reasons?.length > 0 && (<>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>주요 시그널</div>
                {mood.reasons.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, padding: '8px 10px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 14 }}>{r.icon}</span>
                    <div>
                      {r.asset && <div style={{ fontSize: 10, fontWeight: 600, color: r.direction === 'up' ? C.up : C.down, marginBottom: 2 }}>{r.asset} {r.direction === 'up' ? '▲' : '▼'}</div>}
                      <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.6 }}>{r.text}</div>
                    </div>
                  </div>
                ))}
              </>)}
              {mood.actionTip && (
                <div style={{ padding: '8px 10px', background: C.goldDim, borderRadius: 8, border: `1px solid ${C.gold}`, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: C.gold, lineHeight: 1.6 }}>💡 {mood.actionTip}</div>
                </div>
              )}
              <div style={{ fontSize: 10, color: C.text3, marginTop: 8 }}>* AI가 실시간 데이터를 종합 분석한 결과예요</div>
            </div>
          )}
        </div>
      </div>

      {/* 경제 단어 사전 */}
      <div style={{padding:'12px 16px 0'}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:8}}>📚 경제 단어 사전</div>
        <div style={{background:'#ffffff',borderRadius:14,padding:'16px',border:'1px solid #e8e8e8'}}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <input type="text" value={termSearch} onChange={e => setTermSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && termSearch.trim() && loadEterm(termSearch.trim())} placeholder="궁금한 경제 단어 검색 (예: 공매도, ETF)" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 12, background: '#f5f5f5', color: '#111111' }} />
            <button onClick={() => termSearch.trim() && loadEterm(termSearch.trim())} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: C.gold, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>검색</button>
          </div>
          {etermLoading || !eterm ? (
            <div style={{fontSize:12,color:'#888888',textAlign:'center',padding:'20px 0'}}>단어를 분석하고 있어요...</div>
          ) : (<>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{fontSize:32}}>{eterm.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:700,color:'#111111',marginBottom:4}}>{eterm.term}</div>
                <div style={{fontSize:12,color:'#444444',lineHeight:1.6}}>{eterm.desc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <a href={`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(eterm.term)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.gold, padding: '8px 10px', background: '#fff8ee', borderRadius: 8, border: `1px solid ${C.gold}`, textDecoration: 'none' }}>📰 관련 뉴스 보기</a>
              <div onClick={()=>{setTermSearch(''); loadEterm();}} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#555555', cursor: 'pointer', padding: '8px 10px', background: '#f5f5f5', borderRadius: 8, border: '1px solid #ddd' }}>다른 단어 랜덤 ↻</div>
            </div>
          </>)}
        </div>
      </div>

      {/* 검색바 */}
      <div style={{ padding: '14px 16px 0' }}>
        {recStock && !searching && !searchResult && (
          <div onClick={() => doSearch(recStock.symbol)} style={{ marginBottom: 12, padding: '12px 14px', background: C.accentDim, borderRadius: 12, border: `1px solid ${C.accent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', animation: 'fadeUp 0.4s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <div key={recStock.symbol} style={{ animation: 'fadeUp 0.4s' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>오늘의 추천 거래 종목</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginTop: 2 }}>{recStock.symbol} <span style={{ fontSize: 11, fontWeight: 600, color: recStock.change > 0 ? C.up : C.down, marginLeft: 4 }}>{recStock.change > 0 ? '▲' : '▼'}{Math.abs(recStock.change).toFixed(2)}%</span></div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, padding: '6px 10px', background: C.bg, borderRadius: 8, border: `1px solid ${C.borderActive}` }}>AI 분석 〉</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="종목 검색 (예: 애플, 테슬라, MSFT)" style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 13, background: C.card, color: C.text1, boxSizing: 'border-box' }} />
            
            {liveSuggestions && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, zIndex: 50, overflow: 'hidden', animation: 'fadeUp 0.2s', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {liveSuggestions.map((s, i) => (
                  <div key={s.symbol} onClick={() => doSearch(s.symbol)} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: i < liveSuggestions.length - 1 ? `1px solid ${C.border}` : 'none', background: C.bg }}>
                    {s.logo ? <img src={s.logo} alt="" style={{ width: 24, height: 24, borderRadius: 6, background: '#fff' }} /> : <div style={{ width: 24, height: 24, borderRadius: 6, background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🏢</div>}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{s.symbol}</div>
                      <div style={{ fontSize: 11, color: C.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={doSearch} disabled={searching} style={{ padding: '11px 16px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: searching ? 0.6 : 1 }}>{searching ? '...' : '🔍'}</button>
        </div>
      </div>

      {/* 검색 결과 */}
      {searching && <div style={{ textAlign: 'center', padding: '30px 0' }}><div style={{ fontSize: 32, animation: 'breathe 1s infinite' }}>🤖</div><div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginTop: 12 }}>AI가 기업 정보를 분석하고 있어요...</div><div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>실시간 주가와 뉴스를 종합하는 중이에요</div></div>}
      {searchResult && !searching && (
        <div style={{ padding: '10px 16px 0', animation: 'fadeUp 0.3s' }}>
          {searchResult.error && <Card><div style={{ fontSize: 13, color: C.text2, textAlign: 'center', padding: '6px 0' }}>{searchResult.error}</div></Card>}
          
          {searchResult.suggestions && (
            <Card style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 10 }}>🤔 혹시 이 종목을 찾으시나요?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {searchResult.suggestions.map(s => (
                  <div key={s.symbol} onClick={() => doSearch(s.symbol)} style={{ padding: '10px 12px', background: C.bg, borderRadius: 8, cursor: 'pointer', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {s.logo ? <img src={s.logo} alt="" style={{ width: 28, height: 28, borderRadius: 6, background: '#fff' }} /> : <div style={{ width: 28, height: 28, borderRadius: 6, background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🏢</div>}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{s.symbol}</div>
                      <div style={{ fontSize: 11, color: C.text2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {searchResult.quote && (<>
            {searchResult.insight && (
              <Card style={{ border: `1px solid ${C.accent}`, background: C.accentDim, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>🤖</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>AI 종목 브리핑</span>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  {searchResult.insight.split('\n').map((line, i) => {
                    if (!line.trim()) return null;
                    if (line.trim().startsWith('[')) {
                      const match = line.match(/(\[.*?\])(.*)/);
                      if (match) {
                        return (<div key={i} style={{ marginTop: i === 0 ? 0 : 10 }}><span style={{ fontWeight: 700, color: C.accent }}>{match[1]}</span><span style={{ color: C.text1 }}>{match[2]}</span></div>);
                      }
                    }
                    return <div key={i} style={{ color: C.text2, marginTop: 2 }}>{line}</div>;
                  })}
                </div>
              </Card>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {searchResult.profile?.logo && <img src={searchResult.profile.logo} alt="" style={{ width: 28, height: 28, borderRadius: 6, background: '#fff' }} />}
                  <div><div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{searchResult.profile?.name || searchResult.symbol}</div><div style={{ fontSize: 10, color: C.text3 }}>{searchResult.symbol} · {searchResult.profile?.industry || ''}</div></div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.text1, fontVariantNumeric: 'tabular-nums' }}>${searchResult.quote.price?.toFixed(2)}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: searchResult.quote.changePercent >= 0 ? C.up : C.down, marginTop: 2 }}>
                  {searchResult.quote.changePercent >= 0 ? '▲' : '▼'} {Math.abs(searchResult.quote.changePercent)?.toFixed(2)}%
                  {!searchResult.quote.marketOpen && <span style={{ fontSize: 9, marginLeft: 6, padding: '1px 5px', borderRadius: 6, background: C.dangerDim, color: C.text3 }}>마감</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 10 }}>
                  {[{l:'시가',v:searchResult.quote.open},{l:'고가',v:searchResult.quote.high},{l:'저가',v:searchResult.quote.low},{l:'전일',v:searchResult.quote.prevClose}].map(x=>(
                    <div key={x.l} style={{background:C.bg,borderRadius:6,padding:'4px 0',textAlign:'center'}}><div style={{fontSize:9,color:C.text3}}>{x.l}</div><div style={{fontSize:11,fontWeight:600,color:C.text1,fontVariantNumeric:'tabular-nums'}}>${x.v?.toFixed(2)}</div></div>
                  ))}
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 8 }}>
                  {searchResult.type === 'ETF' ? '📦 ETF 지표' : ' 재무지표'} <span style={{ fontSize: 9, color: C.text3 }}>탭→설명</span>
                </div>
                {searchResult.financials ? (<div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {(searchResult.type === 'ETF' ? [
                      {l:'52주고',v:searchResult.financials.high52?'$'+searchResult.financials.high52.toFixed(0):'—'},
                      {l:'52주저',v:searchResult.financials.low52?'$'+searchResult.financials.low52.toFixed(0):'—'},
                      {l:'배당률',v:searchResult.financials.dividendYield?searchResult.financials.dividendYield.toFixed(2)+'%':'—'},
                      {l:'베타',v:searchResult.financials.beta?searchResult.financials.beta.toFixed(2):'—'}
                    ] : [
                      {l:'PER',v:fd(searchResult.financials.pe)},{l:'PBR',v:fd(searchResult.financials.pb)},
                      {l:'ROE',v:searchResult.financials.roe?searchResult.financials.roe.toFixed(1)+'%':'—'},
                      {l:'배당률',v:searchResult.financials.dividendYield?searchResult.financials.dividendYield.toFixed(2)+'%':'—'},
                      {l:'매출성장',v:searchResult.financials.revenueGrowth?searchResult.financials.revenueGrowth.toFixed(1)+'%':'—'},
                      {l:'순이익률',v:searchResult.financials.netMargin?searchResult.financials.netMargin.toFixed(1)+'%':'—'},
                      {l:'52주고',v:searchResult.financials.high52?'$'+searchResult.financials.high52.toFixed(0):'—'},
                      {l:'52주저',v:searchResult.financials.low52?'$'+searchResult.financials.low52.toFixed(0):'—'},
                    ]).map(x=>(
                      <div key={x.l} onClick={e=>{
                        e.stopPropagation();
                        if (metricTip === x.l) { setMetricTip(null); return; }
                        setMetricTip(x.l);
                        if (metricInsight[x.l]) return;
                        setMetricInsightLoading(x.l);
                        const fin = searchResult.financials;
                        const companyName = searchResult.profile?.name || searchResult.symbol;
                        fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
                          type:'metric-explain', metric:x.l, value:x.v, company:companyName,
                          financials: { pe:fin.pe, pb:fin.pb, roe:fin.roe, revenueGrowth:fin.revenueGrowth, netMargin:fin.netMargin, dividendYield:fin.dividendYield, beta:fin.beta, high52:fin.high52, low52:fin.low52, currentPrice:fin.currentPrice }
                        })})
                        .then(r=>r.json())
                        .then(d=>{ if(d.insight) setMetricInsight(prev=>({...prev,[x.l]:d.insight})); })
                        .catch(()=>{})
                        .finally(()=>setMetricInsightLoading(null));
                      }}
                        style={{background:metricTip===x.l?C.accentDim:C.bg,borderRadius:6,padding:'5px 6px',cursor:'pointer',border:metricTip===x.l?`1px solid ${C.accent}`:'1px solid transparent'}}>
                        <div style={{fontSize:9,color:metricTip===x.l?C.accent:C.text3}}>{x.l}</div>
                        <div style={{fontSize:12,fontWeight:600,color:C.text1,fontVariantNumeric:'tabular-nums'}}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                  {metricTip && (<div style={{marginTop:6,padding:'8px 10px',background:C.accentDim,borderRadius:8,animation:'slideDown 0.2s'}}>
                    <div style={{fontSize:11,color:C.accent,fontWeight:600,marginBottom:3}}>{metricTip} AI 분석</div>
                    {metricInsightLoading === metricTip
                      ? <div style={{fontSize:11,color:C.text3}}>분석 중...</div>
                      : <div style={{fontSize:11,color:C.text2,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{metricInsight[metricTip] || '데이터를 불러오지 못했어요.'}</div>
                    }
                  </div>)}
                </div>) : (
                  <div style={{fontSize:11,color:C.text2,lineHeight:1.6}}>
                    {searchResult.type === 'ETF' ? 'ETF는 개별 기업이 아닌 펀드 상품이라 일반적인 기업 재무제표(PER 등)가 제공되지 않아요. 대신 배당이나 운용사를 확인해보세요.' : '재무 데이터를 불러올 수 없어요.'}
                  </div>
                )}
                {searchResult.recommendation && (() => {
                  const r = searchResult.recommendation;
                  const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
                  if (total === 0) return null;
                  const data = [
                    { l: '강력매수', v: r.strongBuy, c: '#00C471' },
                    { l: '매수', v: r.buy, c: '#3182F6' },
                    { l: '보유', v: r.hold, c: '#F5A623' },
                    { l: '매도', v: r.sell, c: '#F04452' },
                    { l: '강력매도', v: r.strongSell, c: '#8B0000' }
                  ];
                  return (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text1 }}>🎯 애널리스트 의견</div>
                        <div style={{ fontSize: 10, color: C.text3 }}>총 {total}명</div>
                      </div>
                      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                        {data.filter(x => x.v > 0).map((x, i, arr) => (
                          <div key={i} style={{ flex: x.v, background: x.c, borderRight: i < arr.length - 1 ? `2px solid ${C.card}` : 'none' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {data.map((x, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: x.v > 0 ? 1 : 0.3 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: x.v > 0 ? x.c : C.text3 }}>{x.v}</div>
                            <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{x.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:8}}>
              {searchResult.news?.length > 0 && (<Card>
                <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>📰 관련 뉴스</div>
                {searchResult.news.slice(0,4).map((n,i)=>{const ago=Math.round((Date.now()-n.datetime*1000)/3600000);return(<a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{display:'block',padding:'6px 0',borderBottom:i<3?`1px solid ${C.border}`:'none',textDecoration:'none'}}><div style={{fontSize:11,color:C.text1,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{n.headlineKo||n.headline}</div><div style={{fontSize:9,color:C.text3,marginTop:2}}>{n.source} · {ago<1?'방금':ago<24?`${ago}h`:`${Math.round(ago/24)}d`}</div></a>);})}
              </Card>)}
            </div>
            <div style={{textAlign:'center',paddingBottom:4}}><span onClick={()=>{setSearchResult(null);setSearchQuery('');setMetricTip(null)}} style={{fontSize:11,color:C.text3,cursor:'pointer'}}>검색 결과 닫기 ✕</span></div>
          </>)}
        </div>
      )}

      {loading && <div style={{padding:'40px 16px',textAlign:'center',animation:'fadeUp 0.4s'}}><div style={{fontSize:32,marginBottom:10,animation:'breathe 2s infinite'}}>📊</div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>시장 데이터를 가져오고 있어요</div></div>}
      {error && !loading && <div style={{padding:'20px 16px'}}><Card><div style={{textAlign:'center',padding:10}}><div style={{fontSize:28,marginBottom:8}}>😢</div><div style={{fontSize:13,color:C.text1,marginBottom:8}}>{error}</div><button onClick={()=>window.location.reload()} style={{fontSize:12,padding:'8px 20px',borderRadius:10,border:'none',background:C.accent,color:'#fff',cursor:'pointer'}}>다시 시도</button></div></Card></div>}

      {data && !loading && (<>
        <div style={{padding:'16px 16px 0',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8,display:'flex',alignItems:'center',gap:4}}>🪨 원자재 {commodities.length>0&&<span style={{fontSize:8,padding:'1px 5px',borderRadius:8,background:commodities.some(c=>c.marketOpen)?C.greenDim:C.dangerDim,color:commodities.some(c=>c.marketOpen)?C.green:C.text3}}>{commodities.some(c=>c.marketOpen)?'LIVE':'마감'}</span>}</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {commodities.map(item=>{const up=item.change>0;return(<Card key={item.id} onClick={()=>{
                const next=exCom===item.id?null:item.id;
                setExCom(next);
                if(next&&!comInsights[item.id]){
                  setInsightLoading(item.id);
                  fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
                    type:'quick-insight',assetType:'commodity',
                    asset:`${item.label}(${item.symbol})`,price:item.price,change:item.change,
                    allStocks:data.stocks
                  })}).then(r=>r.json()).then(d=>{if(d.insight)setComInsights(p=>({...p,[item.id]:d.insight}));}).catch(()=>{}).finally(()=>setInsightLoading(null));
                }
              }} active={exCom===item.id} style={{padding:'10px 12px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:16}}>{item.icon}</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:C.text1}}>{item.label}</div><div style={{fontSize:14,fontWeight:700,color:C.text1,fontVariantNumeric:'tabular-nums'}}>${f(item.price)}</div></div><div style={{fontSize:10,fontWeight:700,color:up?C.up:C.down}}>{up?'▲':'▼'}{f(Math.abs(item.change))}%</div></div>{exCom===item.id&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,animation:'slideDown 0.2s'}}>{insightLoading===item.id?<div style={{fontSize:11,color:C.text3}}>AI 분석 중...</div>:<div style={{fontSize:11,color:C.text2,lineHeight:1.6}}>{comInsights[item.id]||'—'}</div>}</div>}</Card>);})}
              {commodities.length===0&&<Card style={{padding:'10px 12px',opacity:0.5}}><div style={{fontSize:11,color:C.text3,textAlign:'center'}}>로딩 중...</div></Card>}
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>💱 환율</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {data.fx&&FX_CONFIG.map(item=>{const val=data.fx[item.key];return(<Card key={item.key} onClick={()=>{
                const next=exFx===item.key?null:item.key;
                setExFx(next);
                if(next&&!fxInsights[item.key]){
                  setInsightLoading(item.key);
                  fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
                    type:'quick-insight',assetType:'fx',
                    asset:`${item.name}(${item.label})`,price:fw(val),change:null,
                    allRates:{USD:data.fx.usdkrw+'원',EUR:data.fx.eurkrw+'원','JPY(100)':data.fx.jpykrw+'원',CNY:data.fx.cnykrw+'원'}
                  })}).then(r=>r.json()).then(d=>{if(d.insight)setFxInsights(p=>({...p,[item.key]:d.insight}));}).catch(()=>{}).finally(()=>setInsightLoading(null));
                }
              }} active={exFx===item.key} style={{padding:'10px 12px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:14}}>{item.icon}</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:C.text1}}>{item.name}</div><div style={{fontSize:10,color:C.text3}}>{item.label}</div></div><div style={{fontSize:14,fontWeight:700,color:C.text1,fontVariantNumeric:'tabular-nums'}}>{fw(val)}</div></div>{exFx===item.key&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,animation:'slideDown 0.2s'}}>{insightLoading===item.key?<div style={{fontSize:11,color:C.text3}}>AI 분석 중...</div>:<div style={{fontSize:11,color:C.text2,lineHeight:1.6}}>{fxInsights[item.key]||'—'}</div>}</div>}</Card>);})}
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>😨 시장 공포지수</div>
            {vix ? (
              <Card style={{padding:'16px 14px', flex: 1, display: 'flex', flexDirection: 'column', cursor: 'default'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                  <span style={{fontSize:20}}>{vix.icon}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{vix.label}</div>
                    <div style={{fontSize:10,color:C.text3}}>VIX 관련 지표</div>
                  </div>
                </div>
                <div style={{fontSize:24,fontWeight:700,color:C.text1,fontVariantNumeric:'tabular-nums'}}>${vix.price?.toFixed(2)}</div>
                <div style={{fontSize:12,fontWeight:700,color:vix.change>=0?C.up:C.down,marginTop:2}}>{vix.change>=0?'▲':'▼'} {Math.abs(vix.change).toFixed(2)}%</div>
                
                <div style={{marginTop:'auto',paddingTop:16}}>
                  <div style={{paddingTop:12,borderTop:`1px solid ${C.border}`,fontSize:11,color:C.text2,lineHeight:1.6}}>
                    <span style={{color:C.text1,fontWeight:600}}>공포지수란?</span> 주식 시장의 불안감을 나타내는 변동성 지표예요.<br/><br/>
                    • <span style={{color:C.up}}>상승 시</span>: 공포 심리 증가 (하락장 주의)<br/>
                    • <span style={{color:C.down}}>하락 시</span>: 투자 심리 안정화<br/><br/>
                    지수가 급등하면 투자자들이 증시를 불안하게 보고 있다는 뜻이에요.
                  </div>
                </div>
              </Card>
            ) : (
              <Card style={{padding:'10px 12px',opacity:0.5, flex: 1}}><div style={{fontSize:11,color:C.text3,textAlign:'center',marginTop:20}}>로딩 중...</div></Card>
            )}
          </div>
        </div>


        {activeStocks.length > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              🔥 오늘의 핫 종목 <span style={{ fontSize: 9, color: C.text3 }}>변동률 상위</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
              {activeStocks.map(s => {
                const up = s.change > 0;
                return (
                  <Card key={s.symbol} onClick={() => doSearch(s.symbol)} style={{ padding: '8px 10px', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text1 }}>{s.symbol}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>${s.price < 1000 ? s.price.toFixed(2) : Math.round(s.price).toLocaleString()}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: up ? C.up : C.down, marginTop: 1 }}>{up ? '▲' : '▼'}{Math.abs(s.change).toFixed(2)}%</div>
                  </Card>
                );
              })}
            </div>
            <div style={{ fontSize: 9, color: C.text3, marginTop: 4, textAlign: 'right' }}>탭하면 상세 검색 · 10분마다 갱신</div>
          </div>
        )}

        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 뉴스 슬라이더 */}
          {data.news?.length > 0 && (
            <Card onClick={() => setShowNews(!showNews)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, whiteSpace: 'nowrap' }}>📰 주요 경제 뉴스</div>
                {!showNews && (
                  <div key={newsIndex} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: C.text2, animation: 'fadeUp 0.4s', textAlign: 'right' }}>
                    {data.news[newsIndex]?.headlineKo || data.news[newsIndex]?.headline}
                  </div>
                )}
                <div style={{ fontSize: 12, color: C.text3, transform: showNews ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</div>
              </div>
              {showNews && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, animation: 'slideDown 0.25s' }} onClick={e => e.stopPropagation()}>
                  {data.news.slice(0, 5).map((n, i) => {
                    const ago = Math.round((Date.now() - n.datetime * 1000) / 3600000);
                    return (
                      <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '8px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', textDecoration: 'none' }}>
                        <div style={{ fontSize: 12, color: C.text1, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {n.headlineKo || n.headline}
                        </div>
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>
                          {n.source} · {ago < 1 ? '방금' : ago < 24 ? `${ago}시간 전` : `${Math.round(ago / 24)}일 전`}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* 구독 박스 - 풀와이드 디자인으로 조정 */}
          {!subDone ? (
            <Card onClick={!showSub ? () => setShowSub(true) : undefined} style={{ cursor: showSub ? 'default' : 'pointer', background: showSub ? C.card : C.goldDim, border: `1px solid ${showSub ? C.border : C.gold}` }}>
              {!showSub ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '4px 0' }}>
                  <span style={{ fontSize: 20 }}>💬</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>매일 아침 브리핑 받기</div>
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>카카오톡 / 이메일로 편하게 받아보세요</div>
                  </div>
                </div>
              ) : (
                <div style={{ animation: 'slideDown 0.25s' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 10 }}>📬 구독 정보 입력</div>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, background: C.bg, color: C.text1, marginBottom: 8 }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, background: C.bg, color: C.text1, marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={(e) => { e.stopPropagation(); setShowSub(false); }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, fontSize: 12, cursor: 'pointer' }}>취소</button>
                    <button onClick={(e) => { e.stopPropagation(); if (phone || email) setSubDone(true); }} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: (phone || email) ? C.accent : C.border, color: (phone || email) ? '#fff' : C.text3, fontSize: 12, fontWeight: 700, cursor: (phone || email) ? 'pointer' : 'default' }}>구독하기</button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card style={{ background: C.accentDim, border: `1px solid ${C.accent}`, padding: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>구독 완료!</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>내일부터 알찬 소식을 보내드릴게요.</div>
              </div>
            </Card>
          )}
        </div>

        <div style={{padding:'16px',textAlign:'center'}}><button onClick={()=>window.location.reload()} style={{fontSize:11,padding:'8px 18px',borderRadius:18,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,cursor:'pointer'}}>↻ 새로고침</button></div>
      </>)}

      <div style={{padding:'20px',textAlign:'center',fontSize:10,color:C.text3}}><span style={{color:C.accent,fontWeight:800}}>INFO</span><span style={{color:C.text1,fontWeight:800}}>RIX</span><br/>환율: ExchangeRate · 주식: Finnhub · AI: Claude · © 2026</div>
    </div>
  );
}