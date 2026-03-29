export async function GET(request) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) return Response.json({ error: '검색어를 입력해주세요' });

  const result = { query, symbol: null, profile: null, quote: null, news: [], insight: '' };

  try {
    // 1. 종목 검색 (한글/영문/티커 → 심볼 찾기)
    const searchRes = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`
    );
    const searchData = await searchRes.json();
    
    // 첫 번째 미국 주식 결과 선택
    const match = searchData.result?.find(r => 
      r.type === 'Common Stock' && !r.symbol.includes('.')
    ) || searchData.result?.[0];

    if (!match) return Response.json({ ...result, error: '검색 결과가 없어요. 영문 기업명이나 티커(예: AAPL, TSLA)로 검색해보세요.' });

    result.symbol = match.symbol;

    // 2. 기업 프로필
    const profileRes = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${match.symbol}&token=${FINNHUB_KEY}`
    );
    const profileData = await profileRes.json();
    if (profileData.name) {
      result.profile = {
        name: profileData.name,
        ticker: profileData.ticker,
        country: profileData.country,
        industry: profileData.finnhubIndustry,
        logo: profileData.logo,
        marketCap: profileData.marketCapitalization,
        url: profileData.weburl,
      };
    }

    // 3. 실시간 주가
    const quoteRes = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${match.symbol}&token=${FINNHUB_KEY}`
    );
    const quoteData = await quoteRes.json();
    const price = quoteData.c || quoteData.pc;
    if (price) {
      result.quote = {
        price: quoteData.c || quoteData.pc,
        change: quoteData.d || 0,
        changePercent: quoteData.dp || 0,
        open: quoteData.o,
        high: quoteData.h,
        low: quoteData.l,
        prevClose: quoteData.pc,
        marketOpen: quoteData.c && quoteData.c !== 0,
      };
    }

    // 4. 관련 뉴스
    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().split('T')[0];
    const newsRes = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${match.symbol}&from=${fmt(weekAgo)}&to=${fmt(today)}&token=${FINNHUB_KEY}`
    );
    const newsData = await newsRes.json();
    if (Array.isArray(newsData)) {
      result.news = newsData.slice(0, 5).map(n => ({
        headline: n.headline,
        summary: n.summary?.substring(0, 150),
        source: n.source,
        url: n.url,
        datetime: n.datetime,
        image: n.image,
      }));
    }

    // 5. AI 인사이트
    if (CLAUDE_KEY && result.quote) {
      try {
        const companyName = result.profile?.name || match.symbol;
        const newsHeadlines = result.news.map(n => n.headline).join('; ');
        
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: `당신은 경제를 쉽게 설명하는 전문가예요. 토스 앱처럼 친근한 존댓말로 작성하세요.

기업: ${companyName} (${match.symbol})
업종: ${result.profile?.industry || '알 수 없음'}
현재가: $${result.quote.price} (${result.quote.changePercent > 0 ? '+' : ''}${result.quote.changePercent?.toFixed(2)}%)
최근 뉴스: ${newsHeadlines || '없음'}

아래 3가지를 각각 2~3줄로 작성하세요:
1. [기업 소개] 이 기업이 뭘 하는 회사인지 쉽게
2. [최근 동향] 주가와 뉴스를 바탕으로 최근 상황
3. [알아두면 좋은 것] 이 기업/업종에 대해 투자자가 알면 좋은 정보

투자 권유가 아닌 정보 제공으로 작성하세요. 각 섹션은 줄바꿈으로 구분하세요.`
            }],
          }),
        });
        const aiData = await aiRes.json();
        result.insight = aiData.content?.[0]?.text || '';
      } catch (e) {
        console.error('AI insight error:', e);
      }
    }

  } catch (e) {
    console.error('Search error:', e);
    result.error = '검색 중 오류가 발생했어요';
  }

  return Response.json(result);
}
