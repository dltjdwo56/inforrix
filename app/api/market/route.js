export const revalidate = 300;

export async function GET() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  const results = { fx: null, stocks: [], news: [], updated: new Date().toISOString() };

  try {
    const fxRes = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    const fxData = await fxRes.json();
    if (fxData.result === 'success') {
      const r = fxData.rates;
      results.fx = { usdkrw: Math.round(r.KRW), eurkrw: Math.round(r.KRW / r.EUR), jpykrw: Math.round((r.KRW / r.JPY) * 100), cnykrw: Math.round(r.KRW / r.CNY) };
    }
  } catch (e) { console.error('FX:', e); }

  const symbols = [
    { id: 'spy', symbol: 'SPY', label: 'S&P 500', icon: '📈', category: 'stock' },
    { id: 'qqq', symbol: 'QQQ', label: '나스닥 100', icon: '💻', category: 'stock' },
    { id: 'aapl', symbol: 'AAPL', label: '애플', icon: '🍎', category: 'stock' },
    { id: 'tsla', symbol: 'TSLA', label: '테슬라', icon: '🚗', category: 'stock' },
    { id: 'gld', symbol: 'GLD', label: '금', icon: '✨', category: 'commodity' },
    { id: 'slv', symbol: 'SLV', label: '은', icon: '🪙', category: 'commodity' },
    { id: 'uso', symbol: 'USO', label: '원유', icon: '⛽', category: 'commodity' },
  ];

  if (FINNHUB_KEY) {
    for (const s of symbols) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.symbol}&token=${FINNHUB_KEY}`, { next: { revalidate: 300 } });
        const data = await res.json();
        const price = data.c && data.c !== 0 ? data.c : data.pc;
        if (price && price !== 0) {
          results.stocks.push({
            id: s.id, symbol: s.symbol, label: s.label, icon: s.icon,
            category: s.category, price, change: data.dp || 0,
            open: data.o || price, high: data.h || price,
            low: data.l || price, prevClose: data.pc || price,
            marketOpen: data.c && data.c !== 0,
          });
        }
      } catch (e) { console.error(`Finnhub ${s.symbol}:`, e); }
    }

    try {
      const newsRes = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`, { next: { revalidate: 600 } });
      const newsData = await newsRes.json();
      if (Array.isArray(newsData)) results.news = newsData.slice(0, 8).map(n => ({ headline: n.headline, source: n.source, url: n.url, datetime: n.datetime }));
    } catch (e) { console.error('News:', e); }
  }

  return Response.json(results);
}