export const revalidate = 600;

export async function GET() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  const FINVIZ_URL  = process.env.FINVIZ_SERVICE_URL || '';

  // ── 1. Finviz Python 서비스 (FINVIZ_SERVICE_URL 설정 시 우선 사용) ─────────
  if (FINVIZ_URL) {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 5000);
      const res  = await fetch(`${FINVIZ_URL}/screen/hot`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        if (data.stocks?.length > 0) {
          return Response.json({
            stocks:  data.stocks.map(s => ({ ...s, absChange: Math.abs(s.change) })),
            updated: new Date().toISOString(),
            source:  'finviz',
          });
        }
      }
    } catch { /* Python 서비스 오프라인 — Finnhub로 대체 */ }
  }

  // ── 2. Finnhub 폴백: 주요 50개 종목 중 변동률 상위 10개 ───────────────────
  if (!FINNHUB_KEY) return Response.json({ stocks: [] });

  const tickers = [
    'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','BRK.B','AVGO','JPM',
    'LLY','V','UNH','XOM','MA','COST','HD','PG','JNJ','ABBV',
    'BAC','CRM','NFLX','AMD','ORCL','KO','PEP','MRK','TMO','ACN',
    'INTC','DIS','CSCO','NKE','BA','GS','SOFI','PLTR','COIN','MARA',
    'RIVN','LCID','SNAP','ROKU','SQ','SHOP','RBLX','U','HOOD','AFRM'
  ];

  const results = [];
  await Promise.all(tickers.map(async (ticker) => {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 600 } }
      );
      const d = await res.json();
      if (d.c && d.c !== 0 && d.dp !== null) {
        results.push({
          symbol: ticker, price: d.c, change: d.dp || 0,
          prevClose: d.pc, high: d.h, low: d.l,
          absChange: Math.abs(d.dp || 0),
        });
      }
    } catch {}
  }));

  const sorted = results.sort((a, b) => b.absChange - a.absChange).slice(0, 10);
  return Response.json({ stocks: sorted, updated: new Date().toISOString(), source: 'finnhub' });
}
