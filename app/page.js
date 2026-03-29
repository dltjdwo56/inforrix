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
const fd = (v) => v != null ? (typeof v === 'number' ? v.toFixed(2) : v) : '—';

// 능동적 재무지표 설명 (실제 수치 기반)
function explainMetric(label, value, financials, companyName) {
  const name = companyName || '이 기업';
  if (value === '—' || value == null) return `${name}의 ${label} 데이터가 없어요.`;
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  switch(label) {
    case 'PER':
      if (num < 0) return `${name}의 PER이 마이너스예요. 현재 적자 상태라는 뜻이에요. 성장 기업이라면 미래 이익을 기대하고 투자하는 경우가 많아요.`;
      if (num < 15) return `${name}의 PER ${value}은 꽤 낮은 편이에요. 투자자들이 1원의 이익에 ${Math.round(num)}원을 지불하는 거예요. 저평가 구간일 수 있지만, 성장이 둔화된 건 아닌지도 확인해보세요.`;
      if (num < 25) return `${name}의 PER ${value}은 적당한 수준이에요. 시장 평균(S&P 500 기준 약 20~25)과 비슷해요. 이익 대비 합리적인 가격이라는 뜻이에요.`;
      if (num < 50) return `${name}의 PER ${value}은 높은 편이에요. 투자자들이 미래 성장을 기대하고 프리미엄을 지불하고 있어요. 실제 성장이 따라주는지가 관건이에요.`;
      return `${name}의 PER ${value}은 매우 높아요. 시장이 이 기업의 미래에 큰 기대를 걸고 있다는 뜻이에요. 기대만큼 성장하지 못하면 주가 조정이 올 수 있어요.`;
    case 'PBR':
      if (num < 1) return `${name}의 PBR ${value}은 1 미만이에요. 회사가 가진 자산 가치보다 주가가 낮다는 뜻이에요. 숨은 가치가 있을 수 있지만, 시장이 비관적으로 보고 있는 것일 수도 있어요.`;
      if (num < 3) return `${name}의 PBR ${value}은 일반적인 수준이에요. 자산 대비 주가가 적절하게 평가받고 있어요.`;
      return `${name}의 PBR ${value}은 높아요. 자산 가치보다 주가가 훨씬 높은데, 브랜드·기술력 같은 무형 가치가 반영된 거예요. 테크 기업에서 흔한 수준이에요.`;
    case 'ROE':
      if (num < 0) return `${name}의 ROE가 마이너스예요. 투자한 돈으로 손실을 보고 있다는 뜻이에요. 일시적인 건지 구조적인 건지 확인이 필요해요.`;
      if (num < 10) return `${name}의 ROE ${value}은 보통 수준이에요. 투자한 100원으로 ${Math.round(num)}원을 벌고 있어요. 은행 이자보다는 낫지만, 효율을 더 높일 여지가 있어요.`;
      if (num < 20) return `${name}의 ROE ${value}은 우수해요! 투자한 100원으로 ${Math.round(num)}원을 벌고 있어요. 효율적으로 돈을 굴리고 있다는 뜻이에요.`;
      return `${name}의 ROE ${value}은 매우 높아요! 투자한 100원으로 ${Math.round(num)}원이나 벌고 있어요. 업계 최고 수준의 수익 효율이에요. 워런 버핏이 좋아하는 지표예요.`;
    case '배당률':
      if (num < 0.5) return `${name}의 배당률 ${value}은 매우 낮아요. 이익을 배당보다 재투자에 쓰고 있어요. 성장주에서 흔한 패턴이에요.`;
      if (num < 2) return `${name}의 배당률 ${value}은 보통 수준이에요. 은행 이자와 비슷하지만, 주가 상승까지 더하면 매력적일 수 있어요.`;
      if (num < 4) return `${name}의 배당률 ${value}은 괜찮은 편이에요. 주가 100만원이면 매년 ${(num/100*1000000).toLocaleString()}원을 배당으로 받는 거예요.`;
      return `${name}의 배당률 ${value}은 높은 편이에요! 안정적인 배당 수익을 원하는 투자자에게 매력적이에요. 다만 배당률이 너무 높으면 지속 가능한지 확인해보세요.`;
    case '매출성장':
      if (num < 0) return `${name}의 매출이 전년 대비 ${Math.abs(num).toFixed(1)}% 줄었어요. 경기 둔화나 경쟁 심화가 원인일 수 있어요. 일시적인지 구조적인지가 중요해요.`;
      if (num < 10) return `${name}의 매출이 ${num.toFixed(1)}% 성장했어요. 안정적인 성장세예요. 급성장은 아니지만 꾸준히 커가고 있어요.`;
      if (num < 30) return `${name}의 매출이 ${num.toFixed(1)}%나 성장했어요! 꽤 빠른 성장세예요. 이 속도가 유지된다면 2~3년 내 매출이 두 배가 될 수 있어요.`;
      return `${name}의 매출이 ${num.toFixed(1)}%나 급성장했어요! 시장을 빠르게 확대하고 있어요. 고성장 기업의 전형적인 모습이에요.`;
    case '순이익률':
      if (num < 0) return `${name}이 매출은 있지만 적자예요. 매출 100원 중 ${Math.abs(num).toFixed(1)}원씩 손해를 보고 있어요. 투자 확대기일 수 있어요.`;
      if (num < 10) return `${name}의 순이익률 ${value}은 보통이에요. 매출 100원 중 ${num.toFixed(1)}원이 순수익이에요. 업종에 따라 이 정도도 괜찮을 수 있어요.`;
      if (num < 25) return `${name}의 순이익률 ${value}은 좋은 편이에요. 매출 100원 중 ${num.toFixed(1)}원이 순이익! 돈을 잘 버는 체질이에요.`;
      return `${name}의 순이익률 ${value}은 매우 높아요! 매출 100원 중 ${num.toFixed(1)}원이 남아요. 경쟁자가 따라오기 어려운 수익 구조를 가지고 있어요.`;
    case '52주고':
      if (financials?.high52 && financials?.low52) {
        const range = financials.high52 - financials.low52;
        return `1년 중 최고가 ${value}이에요. 최저가 $${financials.low52.toFixed(0)}부터 여기까지 ${((range/financials.low52)*100).toFixed(0)}% 범위로 움직였어요. 현재가가 고점에 가까우면 단기 조정 가능성이 있어요.`;
      }
      return `1년 중 최고가 ${value}이에요. 현재가와 비교하면 고점 대비 어디쯤인지 알 수 있어요.`;
    case '52주저':
      if (financials?.high52 && financials?.low52) {
        return `1년 중 최저가 ${value}이에요. 최고가 $${financials.high52.toFixed(0)}과 비교하면 이 기업의 주가 범위를 알 수 있어요. 저점 근처라면 반등 가능성이, 고점 근처라면 신중할 필요가 있어요.`;
      }
      return `1년 중 최저가 ${value}이에요. 현재가와 비교해 저점 대비 위치를 알 수 있어요.`;
    default: return `${label}: ${value}`;
  }
}

const FX_CONFIG = [
  { key: 'usdkrw', icon: '🇺🇸', name: '달러', label: 'USD/KRW', tip: (v) => `1달러 = ${fw(v)}. 해외직구·달러 투자 참고.` },
  { key: 'eurkrw', icon: '🇪🇺', name: '유로', label: 'EUR/KRW', tip: (v) => `1유로 = ${fw(v)}. 유럽 여행 참고.` },
  { key: 'jpykrw', icon: '🇯🇵', name: '엔(100)', label: 'JPY100', tip: (v) => `100엔 = ${fw(v)}. 일본 여행 참고.` },
  { key: 'cnykrw', icon: '🇨🇳', name: '위안', label: 'CNY/KRW', tip: (v) => `1위안 = ${fw(v)}. 알리·테무 직구 참고.` },
];

const TIPS = {
  gld: { up: '금 상승 — 안전자산 수요 증가', down: '금 조정 — 장기적으론 견고' },
  slv: { up: '은 상승 — 산업+투자 수요', down: '은 하락 — 변동성 큰 자산' },
  uso: { up: '유가 상승 — 기름값 인상 가능', down: '유가 하락 — 기름값 안정 기대' },
  spy: { up: '미국 대형주 상승', down: '미국 시장 하락' },
  qqq: { up: '기술주 강세', down: '기술주 약세' },
  aapl: { up: '애플 상승', down: '애플 하락' },
  tsla: { up: '테슬라 반등', down: '테슬라 하락' },
};

const ECON_TERMS = [
  { term: '기준금리', emoji: '🏦', desc: '한국은행이 정하는 금리. 오르면 대출 이자 ↑, 내리면 대출이 싸져요.' },
  { term: '인플레이션', emoji: '📈', desc: '물가가 오르는 현상. 1,000원 김밥이 1,200원이면 20% 인플레이션.' },
  { term: 'ETF', emoji: '📦', desc: '여러 주식을 한 바구니에 담은 상품. 분산 투자가 쉬워요.' },
  { term: 'PER', emoji: '🔍', desc: '주가÷주당순이익. 낮으면 저평가, 높으면 고평가일 수 있어요.' },
  { term: '배당', emoji: '💰', desc: '기업 이익의 일부를 주주에게 나눠주는 거예요.' },
  { term: 'FOMC', emoji: '🇺🇸', desc: '미국 금리 결정 회의. 연 8회, 전 세계가 주목해요.' },
  { term: '안전자산', emoji: '🛡️', desc: '경제 불안 시 오르는 자산. 금, 국채, 달러가 대표적.' },
  { term: 'ROE', emoji: '📊', desc: '자기자본이익률. 높을수록 효율적인 경영이에요.' },
  { term: 'CPI', emoji: '🛒', desc: '소비자물가지수. 장바구니 물가 변동을 보여줘요.' },
  { term: '공매도', emoji: '📉', desc: '주가 하락에 베팅하는 거래. 빌린 주식을 먼저 팔아요.' },
  { term: '시가총액', emoji: '🏢', desc: '주가 × 총 주식 수. 회사의 시장 가치예요.' },
  { term: 'GDP', emoji: '🌍', desc: '나라가 1년간 만든 상품·서비스의 총 가치.' },
  { term: '분산투자', emoji: '🧺', desc: '여러 자산에 나눠 투자해 리스크를 줄이는 전략.' },
  { term: '블루칩', emoji: '💎', desc: '재무가 탄탄한 대형 우량주. 삼성전자, 애플 등.' },
  { term: '유동성', emoji: '💧', desc: '시장에 돈이 얼마나 도는지. 풍부하면 자산 가격 ↑' },
  { term: '서킷브레이커', emoji: '🔴', desc: '시장 급락 시 거래를 일시 정지하는 제도.' },
  { term: '국채', emoji: '📜', desc: '정부가 발행하는 채권. 가장 안전한 투자 중 하나.' },
  { term: '양적완화', emoji: '🖨️', desc: '중앙은행이 돈을 찍어서 시장에 푸는 정책.' },
  { term: '달러 인덱스', emoji: '💵', desc: '달러 가치를 6개국 통화 대비로 측정한 지수.' },
  { term: '변동성', emoji: '🎢', desc: '가격 흔들림 정도. 크면 수익도 손실도 클 수 있어요.' },
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
  const [metricTip, setMetricTip] = useState(null);
  const [termIdx] = useState(() => Math.floor(Math.random() * ECON_TERMS.length));
  const [activeStocks, setActiveStocks] = useState([]);


  useEffect(() => { const h = new Date().getHours(); setGreeting(h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요'); }, []);

  // 1단계: 데이터 먼저 빠르게 로드
  useEffect(() => {
    (async () => {
      try { const res = await fetch('/api/market'); setData(await res.json()); }
      catch { setError('데이터를 불러오지 못했어요'); }
      // 활발한 종목 로드
      fetch('/api/active').then(r => r.json()).then(d => { if (d.stocks) setActiveStocks(d.stocks); }).catch(() => {});
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

  const doSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchResult(null); setMetricTip(null);
    try { const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`); setSearchResult(await res.json()); }
    catch { setSearchResult({ error: '검색에 실패했어요' }); }
    setSearching(false);
  }, [searchQuery]);

  const now = new Date();
  const dateStr = `${now.getMonth()+1}월 ${now.getDate()}일 ${['일','월','화','수','목','금','토'][now.getDay()]}요일`;
  const commodities = (data?.stocks || []).filter(s => ['gld','slv','uso'].includes(s.id));
  const stocks = (data?.stocks || []).filter(s => ['spy','qqq','aapl','tsla'].includes(s.id));
  const eterm = ECON_TERMS[termIdx];

  // AI 요약 or 로딩 상태
  const moodColors = { '상승': C.green, '하락': C.danger, '혼조': C.gold, '급등': C.green, '급락': C.danger, '관망': C.text2 };
  const mood = aiSummary ? {
    emoji: aiSummary.emoji, sum: aiSummary.headline, detail: aiSummary.summary,
    color: moodColors[aiSummary.mood] || C.gold,
    reasons: (aiSummary.signals||[]).map(s => ({ icon: s.emoji, text: s.insight, asset: s.asset, direction: s.direction })),
    actionTip: aiSummary.actionTip,
  } : { emoji: aiLoading ? '🔄' : '📊', sum: aiLoading ? 'AI가 시장을 분석하고 있어요...' : '시장 데이터를 불러왔어요', detail: '', color: C.gold, reasons: [], actionTip: '' };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', background: C.bg, minHeight: '100vh', paddingBottom: 60 }}>

      {/* 헤더 */}
      <div style={{ background: C.card, padding: '36px 20px 18px', borderRadius: '0 0 20px 20px', borderBottom: `1px solid ${C.border}`, animation: 'fadeUp 0.4s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: C.text3, letterSpacing: 0.5 }}>{dateStr}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text1, marginTop: 2 }}>{greeting}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5 }}><span style={{ color: C.accent }}>INFO</span><span style={{ color: C.text1 }}>RIX</span></div>
        </div>

        {/* AI 시장 요약 */}
        <div onClick={() => !aiLoading && setShowMoodDetail(!showMoodDetail)} style={{ marginTop: 14, borderRadius: 12, padding: '12px 14px', background: C.bg, border: `1px solid ${showMoodDetail ? C.borderActive : C.border}`, cursor: aiLoading ? 'default' : 'pointer', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26, animation: aiLoading ? 'breathe 1s infinite' : '' }}>{mood.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: mood.color }}>{mood.sum}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{aiLoading ? '실시간 데이터로 분석 중...' : aiSummary ? '탭해서 상세 분석 보기' : ''}</div>
            </div>
            {!aiLoading && <div style={{ fontSize: 12, color: C.text3, transform: showMoodDetail ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▾</div>}
          </div>
          {showMoodDetail && aiSummary && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, animation: 'slideDown 0.25s' }}>
              {mood.detail && <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.7, marginBottom: 10 }}>{mood.detail}</div>}
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

      {/* 검색바 */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="종목 검색 (예: 애플, 테슬라, MSFT)" style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 13, background: C.card, color: C.text1 }} />
          <button onClick={doSearch} disabled={searching} style={{ padding: '11px 16px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: searching ? 0.6 : 1 }}>{searching ? '...' : '🔍'}</button>
        </div>
      </div>

      {/* 검색 결과 */}
      {searching && <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ fontSize: 22, animation: 'breathe 1s infinite' }}>🔍</div><div style={{ fontSize: 12, color: C.text3, marginTop: 6 }}>종목 정보를 가져오고 있어요...</div></div>}
      {searchResult && !searching && (
        <div style={{ padding: '10px 16px 0', animation: 'fadeUp 0.3s' }}>
          {searchResult.error && <Card><div style={{ fontSize: 13, color: C.text2, textAlign: 'center', padding: '6px 0' }}>{searchResult.error}</div></Card>}
          {searchResult.quote && (<>
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
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 8 }}>📋 재무지표 <span style={{ fontSize: 9, color: C.text3 }}>탭→설명</span></div>
                {searchResult.financials ? (<div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {[
                      {l:'PER',v:fd(searchResult.financials.pe)},{l:'PBR',v:fd(searchResult.financials.pb)},
                      {l:'ROE',v:searchResult.financials.roe?searchResult.financials.roe.toFixed(1)+'%':'—'},
                      {l:'배당률',v:searchResult.financials.dividendYield?searchResult.financials.dividendYield.toFixed(2)+'%':'—'},
                      {l:'매출성장',v:searchResult.financials.revenueGrowth?searchResult.financials.revenueGrowth.toFixed(1)+'%':'—'},
                      {l:'순이익률',v:searchResult.financials.netMargin?searchResult.financials.netMargin.toFixed(1)+'%':'—'},
                      {l:'52주고',v:searchResult.financials.high52?'$'+searchResult.financials.high52.toFixed(0):'—'},
                      {l:'52주저',v:searchResult.financials.low52?'$'+searchResult.financials.low52.toFixed(0):'—'},
                    ].map(x=>(
                      <div key={x.l} onClick={e=>{e.stopPropagation();setMetricTip(metricTip===x.l?null:x.l)}}
                        style={{background:metricTip===x.l?C.accentDim:C.bg,borderRadius:6,padding:'5px 6px',cursor:'pointer',border:metricTip===x.l?`1px solid ${C.accent}`:'1px solid transparent'}}>
                        <div style={{fontSize:9,color:metricTip===x.l?C.accent:C.text3}}>{x.l}</div>
                        <div style={{fontSize:12,fontWeight:600,color:C.text1,fontVariantNumeric:'tabular-nums'}}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                  {metricTip && (<div style={{marginTop:6,padding:'8px 10px',background:C.accentDim,borderRadius:8,animation:'slideDown 0.2s'}}>
                    <div style={{fontSize:11,color:C.accent,fontWeight:600,marginBottom:3}}>{metricTip} 분석</div>
                    <div style={{fontSize:11,color:C.text2,lineHeight:1.7}}>{explainMetric(metricTip, metricTip==='52주고'?'$'+searchResult.financials.high52?.toFixed(0):metricTip==='52주저'?'$'+searchResult.financials.low52?.toFixed(0):metricTip==='PER'?fd(searchResult.financials.pe):metricTip==='PBR'?fd(searchResult.financials.pb):metricTip==='ROE'?searchResult.financials.roe?.toFixed(1)+'%':metricTip==='배당률'?searchResult.financials.dividendYield?.toFixed(2)+'%':metricTip==='매출성장'?searchResult.financials.revenueGrowth?.toFixed(1)+'%':searchResult.financials.netMargin?.toFixed(1)+'%', searchResult.financials, searchResult.profile?.name || searchResult.symbol)}</div>
                  </div>)}
                </div>):<div style={{fontSize:11,color:C.text3}}>재무 데이터 없음</div>}
                {searchResult.recommendation && (<div style={{marginTop:8}}>
                  <div style={{fontSize:10,color:C.text3,marginBottom:4}}>🎯 애널리스트</div>
                  <div style={{display:'flex',gap:2,height:16,borderRadius:4,overflow:'hidden'}}>
                    {[{v:searchResult.recommendation.strongBuy,c:'#00C471'},{v:searchResult.recommendation.buy,c:'#3182F6'},{v:searchResult.recommendation.hold,c:'#F5A623'},{v:searchResult.recommendation.sell,c:'#F04452'},{v:searchResult.recommendation.strongSell,c:'#8B0000'}].filter(x=>x.v>0).map((x,i)=><div key={i} style={{flex:x.v,background:x.c,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:8,color:'#fff',fontWeight:700}}>{x.v}</span></div>)}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}><span style={{fontSize:9,color:C.green}}>매수</span><span style={{fontSize:9,color:C.danger}}>매도</span></div>
                </div>)}
              </Card>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              {searchResult.news?.length > 0 && (<Card>
                <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>📰 관련 뉴스</div>
                {searchResult.news.slice(0,4).map((n,i)=>{const ago=Math.round((Date.now()-n.datetime*1000)/3600000);return(<a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{display:'block',padding:'6px 0',borderBottom:i<3?`1px solid ${C.border}`:'none',textDecoration:'none'}}><div style={{fontSize:11,color:C.text1,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{n.headlineKo||n.headline}</div><div style={{fontSize:9,color:C.text3,marginTop:2}}>{n.source} · {ago<1?'방금':ago<24?`${ago}h`:`${Math.round(ago/24)}d`}</div></a>);})}
              </Card>)}
              {searchResult.insight && (<Card style={{border:`1px solid ${C.accent}`,background:C.accentDim}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}><span style={{fontSize:14}}>🤖</span><span style={{fontSize:11,fontWeight:700,color:C.accent}}>AI 분석</span></div>
                <div style={{fontSize:11,color:C.text2,lineHeight:1.7,whiteSpace:'pre-line'}}>{searchResult.insight}</div>
                <div style={{fontSize:9,color:C.text3,marginTop:6}}>투자 결정은 본인의 판단으로.</div>
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
              {commodities.map(item=>{const up=item.change>0;return(<Card key={item.id} onClick={()=>setExCom(exCom===item.id?null:item.id)} active={exCom===item.id} style={{padding:'10px 12px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:16}}>{item.icon}</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:C.text1}}>{item.label}</div><div style={{fontSize:14,fontWeight:700,color:C.text1,fontVariantNumeric:'tabular-nums'}}>${f(item.price)}</div></div><div style={{fontSize:10,fontWeight:700,color:up?C.up:C.down}}>{up?'▲':'▼'}{f(Math.abs(item.change))}%</div></div>{exCom===item.id&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,animation:'slideDown 0.2s'}}><div style={{fontSize:11,color:C.text2,lineHeight:1.5}}>{up?TIPS[item.id]?.up:TIPS[item.id]?.down}</div></div>}</Card>);})}
              {commodities.length===0&&<Card style={{padding:'10px 12px',opacity:0.5}}><div style={{fontSize:11,color:C.text3,textAlign:'center'}}>로딩 중...</div></Card>}
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>💱 환율</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {data.fx&&FX_CONFIG.map(item=>{const val=data.fx[item.key];return(<Card key={item.key} onClick={()=>setExFx(exFx===item.key?null:item.key)} active={exFx===item.key} style={{padding:'10px 12px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:14}}>{item.icon}</span><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:C.text1}}>{item.name}</div><div style={{fontSize:10,color:C.text3}}>{item.label}</div></div><div style={{fontSize:14,fontWeight:700,color:C.text1,fontVariantNumeric:'tabular-nums'}}>{fw(val)}</div></div>{exFx===item.key&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,animation:'slideDown 0.2s'}}><div style={{fontSize:11,color:C.text2,lineHeight:1.5}}>{item.tip(val)}</div></div>}</Card>);})}
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:8}}>📚 오늘의 단어</div>
            <Card style={{padding:'12px',border:`1px solid ${C.gold}`,background:C.goldDim}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}><span style={{fontSize:16}}>{eterm.emoji}</span><div style={{fontSize:13,fontWeight:700,color:C.text1}}>{eterm.term}</div></div>
              <div style={{fontSize:11,color:C.text2,lineHeight:1.6}}>{eterm.desc}</div>
              <div onClick={()=>window.location.reload()} style={{fontSize:10,color:C.text3,marginTop:6,cursor:'pointer'}}>다른 단어 ↻</div>
            </Card>
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
                  <Card key={s.symbol} onClick={() => { setSearchQuery(s.symbol); setTimeout(() => { document.querySelector('button[style*="accent"]')?.click(); }, 100); }} style={{ padding: '8px 10px', cursor: 'pointer' }}>
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

        <div style={{padding:'16px 16px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {data.news?.length>0&&(<Card onClick={()=>setShowNews(!showNews)} style={{cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:12,fontWeight:700,color:C.text1}}>📰 뉴스</div><div style={{fontSize:12,color:C.text3,transform:showNews?'rotate(180deg)':'',transition:'transform 0.2s'}}>▾</div></div>{showNews&&(<div style={{marginTop:8,animation:'slideDown 0.25s'}} onClick={e=>e.stopPropagation()}>{data.news.slice(0,5).map((n,i)=>{const ago=Math.round((Date.now()-n.datetime*1000)/3600000);return(<a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{display:'block',padding:'6px 0',borderBottom:i<4?`1px solid ${C.border}`:'none',textDecoration:'none'}}><div style={{fontSize:11,color:C.text1,lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.headline}</div><div style={{fontSize:9,color:C.text3,marginTop:1}}>{n.source} · {ago<1?'방금':ago<24?`${ago}h`:`${Math.round(ago/24)}d`}</div></a>);})}</div>)}</Card>)}
          {!subDone?(<Card onClick={!showSub?()=>setShowSub(true):undefined} style={{cursor:showSub?'default':'pointer',background:showSub?C.card:C.goldDim,border:`1px solid ${showSub?C.border:C.gold}`}}>{!showSub?(<div style={{textAlign:'center'}}><div style={{fontSize:20,marginBottom:4}}>💬</div><div style={{fontSize:13,fontWeight:700,color:C.text1}}>브리핑 받기</div><div style={{fontSize:10,color:C.text2}}>매일 아침 카톡/이메일</div></div>):(<div style={{animation:'slideDown 0.25s'}}><div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:10}}>📬 구독</div><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="010-0000-0000" style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,background:C.bg,color:C.text1,marginBottom:6}} /><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,background:C.bg,color:C.text1,marginBottom:8}} /><div style={{display:'flex',gap:4}}><button onClick={()=>setShowSub(false)} style={{flex:1,padding:8,borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,fontSize:11,cursor:'pointer'}}>취소</button><button onClick={()=>{if(phone||email)setSubDone(true)}} style={{flex:2,padding:8,borderRadius:8,border:'none',background:(phone||email)?C.accent:C.border,color:(phone||email)?'#fff':C.text3,fontSize:11,fontWeight:700,cursor:(phone||email)?'pointer':'default'}}>구독</button></div></div>)}</Card>):(<Card style={{background:C.accentDim,border:`1px solid ${C.accent}`}}><div style={{textAlign:'center'}}><div style={{fontSize:24}}>🎉</div><div style={{fontSize:13,fontWeight:700,color:C.text1,marginTop:4}}>구독 완료!</div></div></Card>)}
        </div>

        <div style={{padding:'16px',textAlign:'center'}}><button onClick={()=>window.location.reload()} style={{fontSize:11,padding:'8px 18px',borderRadius:18,border:`1px solid ${C.border}`,background:'transparent',color:C.text2,cursor:'pointer'}}>↻ 새로고침</button></div>
      </>)}

      <div style={{padding:'20px',textAlign:'center',fontSize:10,color:C.text3}}><span style={{color:C.accent,fontWeight:800}}>INFO</span><span style={{color:C.text1,fontWeight:800}}>RIX</span><br/>환율: ExchangeRate · 주식: Finnhub · AI: Claude · © 2026</div>
    </div>
  );
}