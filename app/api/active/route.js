export const revalidate = 600;

export async function GET() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  if (!FINNHUB_KEY) return Response.json({ stocks: [] });

  // 주요 종목 50개에서 거래 활발한 것 필터링
  const tickers = [
    'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','BRK.B','AVGO','JPM',
    'LLY','V','UNH','XOM','MA','COST','HD','PG','JNJ','ABBV',
    'BAC','CRM','NFLX','AMD','ORCL','KO','PEP','MRK','TMO','ACN',
    'INTC','DIS','CSCO','NKE','BA','GS','SOFI','PLTR','COIN','MARA',
    'RIVN','LCID','SNAP','ROKU','SQ','SHOP','RBLX','U','HOOD','AFRM'
  ];

  const results = [];

  // 분당 60회 제한 → 50개면 괜찮음 (다른 API와 겹치면 revalidate로 캐시)
  for (const ticker of tickers) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 600 } }
      );
      const d = await res.json();
      if (d.c && d.c !== 0 && d.dp !== null) {
        results.push({
          symbol: ticker,
          price: d.c,
          change: d.dp || 0,
          prevClose: d.pc,
          high: d.h,
          low: d.l,
          // 변동폭이 큰 것 = 활발한 거래
          absChange: Math.abs(d.dp || 0),
        });
      }
    } catch {}
  }

  // 변동률 절대값 기준 상위 10개 = 가장 활발한 종목
  const sorted = results.sort((a, b) => b.absChange - a.absChange).slice(0, 10);

  return Response.json({ stocks: sorted, updated: new Date().toISOString() });
}