export async function GET(request) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) return Response.json({ error: '검색어를 입력해주세요' });

  const result = { query, symbol: null, profile: null, quote: null, financials: null, recommendation: null, news: [], insight: '' };

  try {
    // 1. 한글/약어 → 영문 티커 변환
    let searchTerm = query.trim();
    const isKorean = /[가-힣]/.test(searchTerm);
    const isShort = searchTerm.length <= 3 && !/^[A-Z]{1,5}$/.test(searchTerm.toUpperCase());

    if ((isKorean || isShort) && CLAUDE_KEY) {
      try {
        const translateRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 50,
            messages: [{ role: 'user', content: `"${searchTerm}" is a company name, abbreviation, or ticker. Return ONLY the most likely US stock ticker symbol. Examples: "삼성" → "SSNLF", "애플" → "AAPL", "테슬라" → "TSLA", "구글" → "GOOGL", "아마존" → "AMZN", "엔비디아" → "NVDA", "MS" → "MSFT", "메타" → "META", "넷플" → "NFLX", "마소" → "MSFT", "코카" → "KO", "맥도" → "MCD". Reply with ONLY the ticker, nothing else.` }],
          }),
        });
        const translateData = await translateRes.json();
        const ticker = translateData.content?.[0]?.text?.trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (ticker && ticker.length >= 1 && ticker.length <= 5) {
          searchTerm = ticker;
        }
      } catch (e) { console.error('Translate error:', e); }
    }

    // 2. 종목 검색
    const searchRes = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(searchTerm)}&token=${FINNHUB_KEY}`);
    const searchData = await searchRes.json();
    const match = searchData.result?.find(r => r.type === 'Common Stock' && !r.symbol.includes('.')) || searchData.result?.[0];

    if (!match) return Response.json({ ...result, error: `"${query}"에 대한 검색 결과가 없어요. 다른 이름이나 티커로 검색해보세요.` });
    result.symbol = match.symbol;

    // 3. 기업 프로필
    const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${match.symbol}&token=${FINNHUB_KEY}`);
    const profileData = await profileRes.json();
    if (profileData.name) {
      result.profile = {
        name: profileData.name, ticker: profileData.ticker,
        country: profileData.country, industry: profileData.finnhubIndustry,
        logo: profileData.logo, marketCap: profileData.marketCapitalization,
        url: profileData.weburl, ipo: profileData.ipo,
      };
    }

    // 4. 실시간 주가
    const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${match.symbol}&token=${FINNHUB_KEY}`);
    const quoteData = await quoteRes.json();
    const price = quoteData.c || quoteData.pc;
    if (price) {
      result.quote = {
        price: quoteData.c || quoteData.pc, change: quoteData.d || 0,
        changePercent: quoteData.dp || 0, open: quoteData.o,
        high: quoteData.h, low: quoteData.l, prevClose: quoteData.pc,
        marketOpen: quoteData.c && quoteData.c !== 0,
      };
    }

    // 5. 재무 지표
    try {
      const metricRes = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${match.symbol}&metric=all&token=${FINNHUB_KEY}`);
      const metricData = await metricRes.json();
      if (metricData.metric) {
        const m = metricData.metric;
        result.financials = {
          pe: m.peNormalizedAnnual, pb: m.pbAnnual, ps: m.psAnnual,
          roe: m.roeTTM, roa: m.roaTTM,
          debtToEquity: m.totalDebtToEquityQuarterly,
          grossMargin: m.grossMarginTTM, netMargin: m.netProfitMarginTTM,
          dividendYield: m.dividendYieldIndicatedAnnual,
          eps: m.epsNormalizedAnnual,
          revenueGrowth: m.revenueGrowthTTMYoy,
          high52: m['52WeekHigh'], low52: m['52WeekLow'],
          beta: m.beta,
        };
      }
    } catch (e) { console.error('Financials error:', e); }

    // 6. 애널리스트 추천
    try {
      const recRes = await fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${match.symbol}&token=${FINNHUB_KEY}`);
      const recData = await recRes.json();
      if (Array.isArray(recData) && recData.length > 0) {
        const latest = recData[0];
        result.recommendation = {
          buy: latest.buy, hold: latest.hold, sell: latest.sell,
          strongBuy: latest.strongBuy, strongSell: latest.strongSell,
          period: latest.period,
        };
      }
    } catch (e) { console.error('Recommendation error:', e); }

    // 7. 뉴스 + 한글 번역
    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().split('T')[0];
    try {
      const newsRes = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${match.symbol}&from=${fmt(weekAgo)}&to=${fmt(today)}&token=${FINNHUB_KEY}`);
      const newsData = await newsRes.json();
      if (Array.isArray(newsData)) {
        const rawNews = newsData.slice(0, 5).map(n => ({
          headline: n.headline, headlineKo: n.headline,
          source: n.source, url: n.url, datetime: n.datetime,
        }));

        if (CLAUDE_KEY && rawNews.length > 0) {
          try {
            const headlines = rawNews.map(n => n.headline).join('\n');
            const trRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514', max_tokens: 500,
                messages: [{ role: 'user', content: `Translate each line to Korean naturally. Output ONLY translations, one per line, same number of lines:\n\n${headlines}` }],
              }),
            });
            const trData = await trRes.json();
            const translated = trData.content?.[0]?.text?.split('\n').filter(l => l.trim()) || [];
            rawNews.forEach((n, i) => { if (translated[i]) n.headlineKo = translated[i]; });
          } catch (e) { console.error('News translate error:', e); }
        }
        result.news = rawNews;
      }
    } catch (e) { console.error('News error:', e); }

    // 8. AI 인사이트
    if (CLAUDE_KEY && result.quote) {
      try {
        const companyName = result.profile?.name || match.symbol;
        const newsHeadlines = result.news.map(n => n.headline).join('; ');
        const fin = result.financials;
        const rec = result.recommendation;
        const finStr = fin ? `PER: ${fin.pe || 'N/A'}, PBR: ${fin.pb || 'N/A'}, ROE: ${fin.roe ? fin.roe.toFixed(1)+'%' : 'N/A'}, 배당률: ${fin.dividendYield ? fin.dividendYield.toFixed(2)+'%' : 'N/A'}, 매출성장: ${fin.revenueGrowth ? fin.revenueGrowth.toFixed(1)+'%' : 'N/A'}` : '';
        const recStr = rec ? `애널리스트: 강력매수 ${rec.strongBuy}, 매수 ${rec.buy}, 보유 ${rec.hold}, 매도 ${rec.sell}` : '';

        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 700,
            messages: [{ role: 'user', content: `경제를 쉽게 설명하는 전문가로서, 토스처럼 친근한 존댓말로 작성하세요.

기업: ${companyName} (${match.symbol})
업종: ${result.profile?.industry || '알 수 없음'}
현재가: $${result.quote.price} (${result.quote.changePercent > 0 ? '+' : ''}${result.quote.changePercent?.toFixed(2)}%)
재무: ${finStr}
${recStr}
최근 뉴스: ${newsHeadlines || '없음'}

아래 3가지를 각각 2~3줄로 작성하세요:
[기업 소개] 이 기업이 뭘 하는 회사인지 쉽게
[최근 동향] 주가와 뉴스 기반 최근 상황
[핵심 지표 해설] 재무 지표가 의미하는 것을 쉽게 설명

투자 권유가 아닌 정보 제공. 각 섹션은 줄바꿈으로 구분.` }],
          }),
        });
        const aiData = await aiRes.json();
        result.insight = aiData.content?.[0]?.text || '';
      } catch (e) { console.error('AI error:', e); }
    }
  } catch (e) {
    console.error('Search error:', e);
    result.error = '검색 중 오류가 발생했어요';
  }

  return Response.json(result);
}