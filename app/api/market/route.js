// 이 파일은 서버에서 실행돼요 (사용자 브라우저가 아님)
// 그래서 Finnhub, ExchangeRate-API를 직접 호출할 수 있어요

export const revalidate = 300; // 5분마다 캐시 갱신

export async function GET() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  const results = { fx: null, stocks: [], news: [], updated: new Date().toISOString() };

  // 1. 환율 가져오기 (ExchangeRate-API, 무료, 키 불필요)
  try {
    const fxRes = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    const fxData = await fxRes.json();
    if (fxData.result === 'success') {
      const rates = fxData.rates;
      results.fx = {
        usdkrw: Math.round(rates.KRW),
        eurkrw: Math.round(rates.KRW / rates.EUR),
        jpykrw: Math.round((rates.KRW / rates.JPY) * 100),
        cnykrw: Math.round(rates.KRW / rates.CNY),
      };
    }
  } catch (e) {
    console.error('FX API error:', e);
  }

  // 2. 주식/원자재 가져오기 (Finnhub, 무료)
  const symbols = [
    { id: 'spy', symbol: 'SPY', label: 'S&P 500 ETF', icon: '📈' },
    { id: 'qqq', symbol: 'QQQ', label: '나스닥 100 ETF', icon: '💻' },
    { id: 'aapl', symbol: 'AAPL', label: '애플', icon: '🍎' },
    { id: 'tsla', symbol: 'TSLA', label: '테슬라', icon: '🚗' },
    { id: 'gld', symbol: 'GLD', label: '금 ETF', icon: '✨' },
    { id: 'uso', symbol: 'USO', label: '원유 ETF', icon: '⛽' },
  ];

  if (FINNHUB_KEY) {
    for (const s of symbols) {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${s.symbol}&token=${FINNHUB_KEY}`,
          { next: { revalidate: 300 } }
        );
        const data = await res.json();
        if (data.c && data.c !== 0) {
          results.stocks.push({
            id: s.id,
            symbol: s.symbol,
            label: s.label,
            icon: s.icon,
            price: data.c,
            change: data.dp,
            open: data.o,
            high: data.h,
            low: data.l,
            prevClose: data.pc,
          });
        }
      } catch (e) {
        console.error(`Finnhub error for ${s.symbol}:`, e);
      }
    }

    // 3. 뉴스 가져오기
    try {
      const newsRes = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`,
        { next: { revalidate: 600 } }
      );
      const newsData = await newsRes.json();
      if (Array.isArray(newsData)) {
        results.news = newsData.slice(0, 8).map(n => ({
          headline: n.headline,
          source: n.source,
          url: n.url,
          datetime: n.datetime,
        }));
      }
    } catch (e) {
      console.error('News API error:', e);
    }
  }

  return Response.json(results);
}
