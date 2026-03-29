'use client';
import { useState, useEffect, useCallback } from 'react';

const f = (v, d = 2) => typeof v === 'number' ? (v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(d)) : String(v);
const fw = (v) => typeof v === 'number' ? Math.round(v).toLocaleString('ko-KR') + '원' : '—';

function Card({ children, onClick, active, style }) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 16, padding: '18px 20px',
      cursor: onClick ? 'pointer' : 'default',
      border: active ? '1.5px solid #3182F6' : '1px solid #F2F3F5',
      boxShadow: active ? '0 4px 20px rgba(49,130,246,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'all 0.2s', ...style,
    }}>{children}</div>
  );
}

function getMood(data) {
  if (!data) return { emoji: '⏳', sum: '데이터를 불러오는 중...', detail: '' };
  let score = 0, reasons = [];
  const spy = data.stocks?.find(s => s.id === 'spy');
  const gld = data.stocks?.find(s => s.id === 'gld');
  const uso = data.stocks?.find(s => s.id === 'uso');
  if (spy?.change > 0.3) { score++; reasons.push('미국 시장 상승'); }
  else if (spy?.change < -0.3) { score--; reasons.push('미국 시장 하락'); }
  if (gld?.change > 0.3) reasons.push('금값 상승');
  if (uso?.change > 1) reasons.push('유가 상승');
  else if (uso?.change < -1) reasons.push('유가 하락');
  if (data.fx?.usdkrw > 1450) { reasons.push('원화 약세'); }
  if (score >= 1) return { emoji: '☀️', sum: '오늘 시장 분위기가 좋아요', detail: reasons.join(' · ') };
  if (score <= -1) return { emoji: '🌧️', sum: '오늘 시장이 조금 불안해요', detail: reasons.join(' · ') };
  return { emoji: '⛅', sum: '큰 변동 없이 평온한 하루예요', detail: reasons.join(' · ') || '안정적인 흐름이에요' };
}

const FX_CONFIG = [
  { key: 'usdkrw', icon: '💵', q: '달러 환율은요?', code: 'USD/KRW', tip: (v) => `1달러에 ${fw(v)}이에요. 해외직구나 달러 투자할 때 참고하세요.` },
  { key: 'eurkrw', icon: '🇪🇺', q: '유로 환율은요?', code: 'EUR/KRW', tip: (v) => `유로 1개가 ${fw(v)}이에요. 유럽 여행 계획 중이라면 체크해보세요.` },
  { key: 'jpykrw', icon: '🇯🇵', q: '엔화 환율은요?', code: 'JPY100/KRW', tip: (v) => `100엔이 ${fw(v)}이에요. 일본 여행·직구할 때 참고하세요.` },
  { key: 'cnykrw', icon: '🇨🇳', q: '위안 환율은요?', code: 'CNY/KRW', tip: (v) => `위안 1개가 ${fw(v)}이에요. 알리·테무 직구할 때 체크해보세요.` },
];

const STOCK_TIPS = {
  spy: { up: '미국 시장이 올라서 해외주식에 긍정적이에요.', down: '미국 시장이 하락했어요. 장기 관점에서 매수 기회일 수 있어요.' },
  qqq: { up: '기술주가 강세예요. IT 관련 투자에 긍정적이에요.', down: '기술주가 약세예요. 단기 변동에 흔들리지 마세요.' },
  aapl: { up: '애플이 올랐어요. 실적 기대감이 반영된 거예요.', down: '애플이 내렸어요. 장기적으로는 걱정할 수준이 아니에요.' },
  tsla: { up: '테슬라가 반등했어요. 변동성이 큰 종목이니 분할 매수가 안전해요.', down: '테슬라가 하락했어요. 변동성이 큰 종목이라 장기 관점이 중요해요.' },
  gld: { up: '금값이 오르고 있어요. 안전자산 선호 흐름이에요.', down: '금값이 살짝 내렸지만 장기적으로 안정적이에요.' },
  uso: { up: '유가가 올라서 기름값이 오를 수 있어요.', down: '유가가 내려서 기름값 안정이 기대돼요.' },
};

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exFx, setExFx] = useState(null);
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

  // 서버 API에서 시장 데이터 가져오기 (0.5초면 끝!)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/market');
        const d = await res.json();
        setData(d);
      } catch (e) {
        setError('데이터를 불러오지 못했어요');
      }
      setLoading(false);
    })();
  }, []);

  // AI 분석 요청
  const askAI = useCallback(async () => {
    if (!data) return;
    setAiLoading(true); setAi('');
    const info = [
      data.fx ? `USD/KRW: ${data.fx.usdkrw}원` : '',
      ...(data.stocks || []).map(s => `${s.label}: $${f(s.price)} (${s.change > 0 ? '+' : ''}${f(s.change)}%)`),
    ].filter(Boolean).join(', ');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketData: info }),
      });
      const d = await res.json();
      setAi(d.insight || d.error || '분석을 불러오지 못했어요.');
    } catch { setAi('네트워크를 확인해주세요.'); }
    setAiLoading(false);
  }, [data]);

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${['일','월','화','수','목','금','토'][now.getDay()]}요일`;
  const mood = getMood(data);
  const hasStocks = data?.stocks?.length > 0;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#F4F5F7', minHeight: '100vh', paddingBottom: 60 }}>

      {/* 헤더 */}
      <div style={{ background: '#fff', padding: '44px 22px 24px', borderRadius: '0 0 24px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontSize: 13, color: '#8B95A1', fontWeight: 500 }}>{dateStr}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#191F28', marginTop: 4 }}>{greeting} 👋</div>

        <div style={{ marginTop: 20, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
          background: mood.emoji === '☀️' ? 'linear-gradient(135deg,#E8F3FF,#F0F7FF)' : mood.emoji === '🌧️' ? 'linear-gradient(135deg,#FFF5F5,#FEF2F2)' : 'linear-gradient(135deg,#FFFBE8,#FFFDF5)' }}>
          <span style={{ fontSize: 40, animation: loading ? 'breathe 1.5s infinite' : 'breathe 3s infinite' }}>{mood.emoji}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#191F28' }}>{mood.sum}</div>
            <div style={{ fontSize: 13, color: '#4E5968', marginTop: 4, lineHeight: 1.5 }}>{mood.detail || '데이터를 가져오고 있어요...'}</div>
          </div>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ padding: '48px 16px', textAlign: 'center', animation: 'fadeUp 0.4s' }}>
          <div style={{ fontSize: 44, marginBottom: 16, animation: 'breathe 2s infinite' }}>📊</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#191F28', marginBottom: 8 }}>시장 데이터를 가져오고 있어요</div>
          <div style={{ fontSize: 14, color: '#8B95A1' }}>잠깐이면 돼요...</div>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div style={{ padding: '24px 16px' }}>
          <Card><div style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>😢</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#191F28', marginBottom: 12 }}>{error}</div>
            <button onClick={() => window.location.reload()} style={{ fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 12, border: 'none', background: '#3182F6', color: '#fff', cursor: 'pointer' }}>다시 시도</button>
          </div></Card>
        </div>
      )}

      {/* 데이터 표시 */}
      {data && !loading && (<>

        {/* 환율 */}
        {data.fx && (
          <div style={{ padding: '24px 16px 0' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#191F28', padding: '0 4px', marginBottom: 14 }}>💵 환율</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FX_CONFIG.map((item, i) => {
                const val = data.fx[item.key];
                const open = exFx === item.key;
                return (
                  <div key={item.key} style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
                    <Card onClick={() => setExFx(open ? null : item.key)} active={open}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#8B95A1', fontWeight: 500 }}>{item.q}</div>
                          <div style={{ fontSize: 12, color: '#ADB5BD', marginTop: 1 }}>{item.code}</div>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#191F28', fontVariantNumeric: 'tabular-nums' }}>{fw(val)}</div>
                      </div>
                      {open && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2F3F5', animation: 'slideDown 0.25s ease' }}>
                          <div style={{ background: '#F8F9FA', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#3182F6', marginBottom: 4 }}>이게 무슨 뜻이에요?</div>
                            <div style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.6 }}>{item.tip(val)}</div>
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

        {/* 주식 · 원자재 */}
        {hasStocks && (
          <div style={{ padding: '24px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#191F28' }}>📊 주식 · 원자재</div>
              <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E8F3FF', color: '#3182F6', fontWeight: 600 }}>🟢 실시간</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.stocks.map((s, i) => {
                const open = exSt === s.id;
                const up = s.change > 0;
                const tips = STOCK_TIPS[s.id] || { up: '상승했어요.', down: '하락했어요.' };
                return (
                  <div key={s.id} style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
                    <Card onClick={() => setExSt(open ? null : s.id)} active={open}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>{s.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#8B95A1', fontWeight: 500 }}>{s.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#191F28', fontVariantNumeric: 'tabular-nums' }}>${f(s.price)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: up ? '#F04452' : '#3182F6', fontVariantNumeric: 'tabular-nums' }}>
                            {up ? '▲' : '▼'} {f(Math.abs(s.change))}%
                          </div>
                          <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 2 }}>{up ? '+' : ''}{f(s.price - s.prevClose)}</div>
                        </div>
                      </div>
                      {open && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2F3F5', animation: 'slideDown 0.25s ease' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                            {[{ l: '시가', v: s.open }, { l: '고가', v: s.high }, { l: '저가', v: s.low }].map(x => (
                              <div key={x.l} style={{ background: '#F8F9FA', borderRadius: 10, padding: '10px 0', textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: '#8B95A1' }}>{x.l}</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#333D4B', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>${f(x.v)}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ background: '#EFF8FF', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#3182F6', marginBottom: 4 }}>나에게 미치는 영향</div>
                            <div style={{ fontSize: 13, color: '#333D4B', lineHeight: 1.6 }}>{up ? tips.up : tips.down}</div>
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
        <div style={{ padding: '24px 16px 0' }}>
          <div onClick={!aiLoading ? askAI : undefined} style={{
            background: ai ? '#fff' : 'linear-gradient(135deg,#3182F6,#1B64DA)',
            borderRadius: 16, padding: '22px 24px',
            cursor: aiLoading ? 'default' : 'pointer',
            border: ai ? '1px solid #F2F3F5' : 'none',
            boxShadow: ai ? '0 1px 3px rgba(0,0,0,0.04)' : '0 4px 16px rgba(49,130,246,0.3)',
            transition: 'all 0.3s',
          }}>
            {!ai && !aiLoading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>AI에게 오늘 시장 물어보기</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>실시간 데이터 기반으로 분석해드려요</div>
              </div>
            )}
            {aiLoading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8, animation: 'breathe 1s infinite' }}>🤖</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: ai ? '#191F28' : '#fff' }}>분석 중...</div>
              </div>
            )}
            {ai && !aiLoading && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#3182F6' }}>AI 실시간 분석</span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: '#333D4B', margin: 0 }}>{ai}</p>
                <div onClick={e => { e.stopPropagation(); askAI(); }} style={{ fontSize: 13, color: '#8B95A1', marginTop: 12, cursor: 'pointer', fontWeight: 500 }}>다시 물어보기 ↻</div>
              </>
            )}
          </div>
        </div>

        {/* 뉴스 */}
        {data.news?.length > 0 && (
          <div style={{ padding: '24px 16px 0' }}>
            <Card onClick={() => setShowNews(!showNews)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#191F28' }}>📰 글로벌 뉴스</div>
                  <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 2 }}>Finnhub 실시간</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: '#F2F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8B95A1', transform: showNews ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</div>
              </div>
              {showNews && (
                <div style={{ marginTop: 14, animation: 'slideDown 0.25s ease' }} onClick={e => e.stopPropagation()}>
                  <div style={{ height: 1, background: '#F2F3F5', marginBottom: 4 }} />
                  {data.news.map((n, i) => {
                    const ago = Math.round((Date.now() - n.datetime * 1000) / 3600000);
                    return (
                      <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '14px 2px', borderBottom: i < data.news.length - 1 ? '1px solid #F8F9FA' : 'none', textDecoration: 'none' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#333D4B', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.headline}</div>
                        <div style={{ fontSize: 12, color: '#ADB5BD', marginTop: 3 }}>{n.source} · {ago < 1 ? '방금' : ago < 24 ? `${ago}시간 전` : `${Math.round(ago / 24)}일 전`}</div>
                      </a>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 알림 구독 */}
        <div style={{ padding: '24px 16px 0' }}>
          {!subDone ? (
            <Card onClick={!showSub ? () => setShowSub(true) : undefined} style={{ cursor: showSub ? 'default' : 'pointer', background: showSub ? '#fff' : 'linear-gradient(135deg,#FEE500,#F5D900)', border: showSub ? '1px solid #F2F3F5' : 'none' }}>
              {!showSub ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 4 }}>매일 아침, 경제 브리핑 받기</div>
                  <div style={{ fontSize: 13, color: '#4E5968' }}>카카오톡 또는 이메일로 보내드려요</div>
                </div>
              ) : (
                <div style={{ animation: 'slideDown 0.25s ease' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 16 }}>📬 알림 구독</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4E5968', marginBottom: 6 }}>카카오톡</div>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #E5E8EB', fontSize: 14, background: '#F8F9FA' }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4E5968', marginBottom: 6 }}>이메일</div>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #E5E8EB', fontSize: 14, background: '#F8F9FA' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowSub(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid #E5E8EB', background: '#fff', color: '#4E5968', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                    <button onClick={() => { if (phone || email) setSubDone(true); }} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: (phone || email) ? '#3182F6' : '#E5E8EB', color: (phone || email) ? '#fff' : '#ADB5BD', fontSize: 14, fontWeight: 700, cursor: (phone || email) ? 'pointer' : 'default' }}>구독하기</button>
                  </div>
                  <div style={{ fontSize: 11, color: '#ADB5BD', textAlign: 'center', marginTop: 10 }}>무료 · 광고 없음 · 언제든 해지 가능</div>
                </div>
              )}
            </Card>
          ) : (
            <Card style={{ background: 'linear-gradient(135deg,#E8F3FF,#F0F7FF)' }}>
              <div style={{ textAlign: 'center', padding: 8 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 4 }}>구독 완료!</div>
                <div style={{ fontSize: 13, color: '#4E5968' }}>내일 아침 8시에 첫 브리핑을 보내드릴게요!</div>
              </div>
            </Card>
          )}
        </div>

        {/* 새로고침 */}
        <div style={{ padding: '24px 16px 0', textAlign: 'center' }}>
          <button onClick={() => window.location.reload()} style={{ fontSize: 14, fontWeight: 600, padding: '12px 28px', borderRadius: 24, border: '1px solid #E5E8EB', background: '#fff', color: '#4E5968', cursor: 'pointer' }}>🔄 새로고침</button>
        </div>

      </>)}

      {/* 푸터 */}
      <div style={{ padding: '32px 24px 20px', textAlign: 'center', fontSize: 12, color: '#ADB5BD', lineHeight: 1.8 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 8 }}>INFO<span style={{ color: '#3182F6' }}>RIX</span></div>
        환율: ExchangeRate-API · 주식: Finnhub · AI: Claude
        <br />투자 결정은 본인의 판단으로 해주세요.
        <br />© 2026 INFORIX
      </div>
    </div>
  );
}
