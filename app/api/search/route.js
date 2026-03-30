export async function GET(request) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const FINVIZ_URL = process.env.FINVIZ_SERVICE_URL || '';
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type');

  if (!query) return Response.json({ error: '검색어를 입력해주세요' });

  let searchTerm = query.trim();
  const upperQuery = searchTerm.toUpperCase();
  
  // 알고리즘 1: 자주 검색되는 기업명/약어 사전 (API 호출 전 즉시 변환)
  const ALIAS_MAP = {
    // ── Big Tech ──────────────────────────────────────────────────────────────
    '애플': 'AAPL', 'APPLE': 'AAPL',
    '마소': 'MSFT', 'MICROSOFT': 'MSFT',
    '구글': 'GOOGL', 'GOOGLE': 'GOOGL', 'ALPHABET': 'GOOGL',
    '메타': 'META', '페이스북': 'META', 'FB': 'META', 'FACEBOOK': 'META',
    '아마존': 'AMZN', 'AMAZON': 'AMZN',
    '엔비디아': 'NVDA', 'NVIDIA': 'NVDA',
    '넷플릭스': 'NFLX', 'NETFLIX': 'NFLX',
    '테슬라': 'TSLA', 'TESLA': 'TSLA',
    // ── Semiconductors ────────────────────────────────────────────────────────
    'TSMC': 'TSM', '티에스엠씨': 'TSM',
    'AMD': 'AMD', '에이엠디': 'AMD',
    '인텔': 'INTC', 'INTEL': 'INTC',
    '퀄컴': 'QCOM', 'QUALCOMM': 'QCOM',
    '브로드컴': 'AVGO', 'BROADCOM': 'AVGO',
    '마이크론': 'MU', 'MICRON': 'MU',
    '텍사스인스트루먼트': 'TXN', 'TEXAS INSTRUMENTS': 'TXN',
    '어플라이드머티리얼즈': 'AMAT', 'APPLIED MATERIALS': 'AMAT',
    'ASML': 'ASML',
    // ── Software / Cloud ─────────────────────────────────────────────────────
    '오라클': 'ORCL', 'ORACLE': 'ORCL',
    '세일즈포스': 'CRM', 'SALESFORCE': 'CRM',
    '어도비': 'ADBE', 'ADOBE': 'ADBE',
    '서비스나우': 'NOW', 'SERVICENOW': 'NOW',
    '스노우플레이크': 'SNOW', 'SNOWFLAKE': 'SNOW',
    '팔란티어': 'PLTR', 'PALANTIR': 'PLTR',
    '클라우드플레어': 'NET', 'CLOUDFLARE': 'NET',
    '데이터독': 'DDOG', 'DATADOG': 'DDOG',
    '크라우드스트라이크': 'CRWD', 'CROWDSTRIKE': 'CRWD',
    '줌': 'ZM', 'ZOOM': 'ZM',
    '도큐사인': 'DOCU', 'DOCUSIGN': 'DOCU',
    '옥타': 'OKTA', 'OKTA': 'OKTA',
    '트윌리오': 'TWLO', 'TWILIO': 'TWLO',
    '스퀘어': 'SQ', '블록': 'SQ', 'BLOCK': 'SQ',
    // ── Consumer Internet ─────────────────────────────────────────────────────
    '스포티파이': 'SPOT', 'SPOTIFY': 'SPOT',
    '쇼피파이': 'SHOP', 'SHOPIFY': 'SHOP',
    '우버': 'UBER', 'UBER': 'UBER',
    '에어비앤비': 'ABNB', 'AIRBNB': 'ABNB',
    '도어대시': 'DASH', 'DOORDASH': 'DASH',
    '스냅': 'SNAP', '스냅챗': 'SNAP', 'SNAPCHAT': 'SNAP',
    '핀터레스트': 'PINS', 'PINTEREST': 'PINS',
    '로블록스': 'RBLX', 'ROBLOX': 'RBLX',
    '유니티': 'U', 'UNITY': 'U',
    '코인베이스': 'COIN', 'COINBASE': 'COIN',
    '로빈후드': 'HOOD', 'ROBINHOOD': 'HOOD',
    // ── Finance ───────────────────────────────────────────────────────────────
    'JP모건': 'JPM', 'JPMORGAN': 'JPM',
    '골드만삭스': 'GS', 'GOLDMAN': 'GS', 'GOLDMAN SACHS': 'GS',
    '모건스탠리': 'MS', 'MORGAN STANLEY': 'MS',
    '뱅크오브아메리카': 'BAC', 'BOA': 'BAC', 'BANK OF AMERICA': 'BAC',
    '씨티': 'C', '씨티그룹': 'C', 'CITIGROUP': 'C',
    '웰스파고': 'WFC', 'WELLS FARGO': 'WFC',
    '비자': 'V', 'VISA': 'V',
    '마스터카드': 'MA', 'MASTERCARD': 'MA',
    '페이팔': 'PYPL', 'PAYPAL': 'PYPL',
    '아멕스': 'AXP', '아메리칸익스프레스': 'AXP', 'AMERICAN EXPRESS': 'AXP',
    '버크셔': 'BRK.B', '버크셔해서웨이': 'BRK.B', '버핏': 'BRK.B',
    // ── Healthcare / Pharma ───────────────────────────────────────────────────
    '화이자': 'PFE', 'PFIZER': 'PFE',
    '모더나': 'MRNA', 'MODERNA': 'MRNA',
    '존슨앤존슨': 'JNJ', 'J&J': 'JNJ', 'JOHNSON': 'JNJ',
    '일라이릴리': 'LLY', 'ELI LILLY': 'LLY',
    '애브비': 'ABBV', 'ABBVIE': 'ABBV',
    '암젠': 'AMGN', 'AMGEN': 'AMGN',
    '머크': 'MRK', 'MERCK': 'MRK',
    '노보노디스크': 'NVO', 'NOVO NORDISK': 'NVO',
    '유나이티드헬스': 'UNH', 'UNITEDHEALTH': 'UNH',
    // ── Energy ────────────────────────────────────────────────────────────────
    '엑슨모빌': 'XOM', 'EXXON': 'XOM', 'EXXONMOBIL': 'XOM',
    '쉐브론': 'CVX', 'CHEVRON': 'CVX',
    '코노코': 'COP', 'CONOCOPHILLIPS': 'COP',
    // ── Consumer / Retail ─────────────────────────────────────────────────────
    '월마트': 'WMT', 'WALMART': 'WMT',
    '코스트코': 'COST', 'COSTCO': 'COST',
    '타겟': 'TGT', 'TARGET': 'TGT',
    '나이키': 'NKE', 'NIKE': 'NKE',
    '스타벅스': 'SBUX', 'STARBUCKS': 'SBUX',
    '맥도날드': 'MCD', 'MCDONALDS': 'MCD',
    '디즈니': 'DIS', 'DISNEY': 'DIS',
    // ── Auto / EV ─────────────────────────────────────────────────────────────
    '포드': 'F', 'FORD': 'F',
    '제너럴모터스': 'GM', 'GENERAL MOTORS': 'GM',
    '리비안': 'RIVN', 'RIVIAN': 'RIVN',
    '루시드': 'LCID', 'LUCID': 'LCID',
    // ── Aerospace / Defense ───────────────────────────────────────────────────
    '보잉': 'BA', 'BOEING': 'BA',
    '록히드마틴': 'LMT', 'LOCKHEED': 'LMT',
    '레이시온': 'RTX', 'RAYTHEON': 'RTX',
    // ── Chinese stocks (US-listed) ────────────────────────────────────────────
    '알리바바': 'BABA', 'ALIBABA': 'BABA',
    '바이두': 'BIDU', 'BAIDU': 'BIDU',
    '핀둬둬': 'PDD', 'PINDUODUO': 'PDD',
    '니오': 'NIO',
    '샤오펑': 'XPEV', 'XPENG': 'XPEV',
    '리오토': 'LI', 'LI AUTO': 'LI',
    // ── Popular ETFs ──────────────────────────────────────────────────────────
    'S&P500': 'SPY', 'SP500': 'SPY', 'S&P': 'SPY', '스파이': 'SPY',
    '나스닥': 'QQQ', '나스닥ETF': 'QQQ', '나스닥100': 'QQQ', '큐큐큐': 'QQQ',
    '다우': 'DIA', '다우존스': 'DIA', '다우ETF': 'DIA',
    '러셀': 'IWM', '소형주ETF': 'IWM', '러셀2000': 'IWM',
    '금ETF': 'GLD', '금': 'GLD',
    '은ETF': 'SLV', '은': 'SLV',
    '원유ETF': 'USO', '원유': 'USO',
    '장기국채': 'TLT', '국채ETF': 'TLT',
    '반도체ETF': 'SOXX', 'SOXX': 'SOXX',
    '아크이노베이션': 'ARKK', '아크ETF': 'ARKK', 'ARK': 'ARKK',
    '레버리지나스닥': 'TQQQ', 'TQQQ': 'TQQQ',
    '인버스나스닥': 'SQQQ', 'SQQQ': 'SQQQ',
    // ── Index / volatility ────────────────────────────────────────────────────
    'VIX': 'VIXY', '공포지수': 'VIXY', '변동성': 'VIXY',
  };

  if (ALIAS_MAP[upperQuery]) {
    searchTerm = ALIAS_MAP[upperQuery];
  }

  // 실시간 추천 검색어 모드 (빠른 응답 및 로고만 반환)
  if (type === 'suggest') {
    try {
      const searchRes = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(searchTerm)}&token=${FINNHUB_KEY}`);
      const searchData = await searchRes.json();
      
      let results = (searchData.result || []).filter(r => ['Common Stock', 'ADR', 'ETF', 'ETP', 'ETC'].includes(r.type) && r.symbol && !r.symbol.includes('.'));
      // 알고리즘 2: 검색어와 정확히 일치하는 티커를 무조건 최상단으로 정렬
      results.sort((a, b) => {
        if (a.symbol === searchTerm.toUpperCase()) return -1;
        if (b.symbol === searchTerm.toUpperCase()) return 1;
        return 0;
      });

      const suggestions = results.slice(0, 5).map(s => ({ symbol: s.symbol, description: s.description, logo: '' }));

      await Promise.all(suggestions.map(async (s) => {
        try {
          const profRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${s.symbol}&token=${FINNHUB_KEY}`, { next: { revalidate: 86400 } });
          const profData = await profRes.json();
          if (profData.logo) s.logo = profData.logo;
        } catch(e) {}
      }));
      return Response.json({ suggestions });
    } catch (e) { return Response.json({ suggestions: [] }); }
  }

  const result = { query, symbol: null, type: null, profile: null, quote: null, financials: null, recommendation: null, news: [], insight: '', suggestions: null };

  try {
    // 1. 1차 종목 검색 (입력한 검색어 그대로 Finnhub에 검색)
    let searchRes = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(searchTerm)}&token=${FINNHUB_KEY}`);
    let searchData = await searchRes.json();
    
    // 사용자가 입력한 검색어가 공식 티커와 완벽히 일치하는지 확인
    let exactMatch = searchData.result?.find(r => r.symbol === searchTerm.toUpperCase() && ['Common Stock', 'ADR', 'ETF', 'ETP', 'ETC'].includes(r.type) && !r.symbol.includes('.'));

    // 2. 매칭이 안 된 경우 (예: "TSMC", "Microsoft"), AI를 통해 올바른 공식 티커로 변환 후 2차 검색
    if (!exactMatch && CLAUDE_KEY) {
      try {
        const translateRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 50,
            messages: [{ role: 'user', content: `"${searchTerm}" is a company name, abbreviation, or ticker. Return ONLY the most likely US stock ticker symbol. Examples: "삼성" → "SSNLF", "애플" → "AAPL", "테슬라" → "TSLA", "구글" → "GOOGL", "아마존" → "AMZN", "엔비디아" → "NVDA", "MS" → "MSFT", "TSMC" → "TSM", "페이스북" → "META". Reply with ONLY the ticker, nothing else.` }],
          }),
        });
        const translateData = await translateRes.json();
        const ticker = translateData.content?.[0]?.text?.trim().toUpperCase().replace(/[^A-Z]/g, '');
        
        // AI가 유효한 티커를 찾았고, 원래 입력값과 다르면 재검색
        if (ticker && ticker.length >= 1 && ticker.length <= 5 && ticker !== searchTerm.toUpperCase()) {
          searchTerm = ticker;
          searchRes = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(searchTerm)}&token=${FINNHUB_KEY}`);
          searchData = await searchRes.json();
          exactMatch = searchData.result?.find(r => r.symbol === searchTerm.toUpperCase() && ['Common Stock', 'ADR', 'ETF', 'ETP', 'ETC'].includes(r.type) && !r.symbol.includes('.'));
        }
      } catch (e) { console.error('Translate error:', e); }
    }

    if (exactMatch) {
      const match = exactMatch;
      result.symbol = match.symbol;
      result.type = match.type;

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
            currentPrice: result.quote?.price ?? null,
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

      // 7. Finviz 보강 데이터 (FINVIZ_SERVICE_URL 환경변수 설정 시에만 연동)
      if (FINVIZ_URL && result.financials) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 3000);
          const fvRes = await fetch(`${FINVIZ_URL}/stock/${match.symbol}`, { signal: ctrl.signal });
          clearTimeout(tid);
          if (fvRes.ok) {
            const finvizData = await fvRes.json();
            if (finvizData?.metrics) {
              const fv = finvizData.metrics;
              result.financials = {
                ...result.financials,
                rsi14:            fv.rsi14            ?? result.financials.rsi14,
                analystTarget:    fv.analystTarget     ?? result.financials.analystTarget,
                analystRecom:     fv.analystRecom      ?? result.financials.analystRecom,
                operMargin:       fv.operMargin        ?? result.financials.operMargin,
                revenueGrowthQoQ: fv.revenueGrowthQoQ ?? result.financials.revenueGrowthQoQ,
                epsGrowthQoQ:     fv.epsGrowthQoQ      ?? result.financials.epsGrowthQoQ,
                shortFloat:       fv.shortFloat        ?? result.financials.shortFloat,
                earningsDate:     fv.earningsDate      ?? result.financials.earningsDate,
                debtEq:           fv.debtEq            ?? result.financials.debtEq,
                currentRatio:     fv.currentRatio      ?? result.financials.currentRatio,
                fwdPe:            fv.fwdPe             ?? result.financials.fwdPe,
                peg:              fv.peg               ?? result.financials.peg,
                summary:          finvizData.summary   ?? null,
              };
            }
          }
        } catch (e) { /* Python service offline — skip */ }
      }

      // 8. 뉴스 + 한글 번역
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
          const finParts = [];
          if (fin) {
            if (fin.pe)                finParts.push(`PER ${fin.pe}`);
            if (fin.fwdPe)             finParts.push(`선행PER ${fin.fwdPe}`);
            if (fin.pb)                finParts.push(`PBR ${fin.pb}`);
            if (fin.peg)               finParts.push(`PEG ${fin.peg}`);
            if (fin.roe)               finParts.push(`ROE ${fin.roe?.toFixed?.(1)}%`);
            if (fin.netMargin)         finParts.push(`순이익률 ${fin.netMargin?.toFixed?.(1)}%`);
            if (fin.operMargin)        finParts.push(`영업이익률 ${fin.operMargin?.toFixed?.(1)}%`);
            if (fin.revenueGrowth || fin.revenueGrowthQoQ) finParts.push(`매출성장 ${(fin.revenueGrowth ?? fin.revenueGrowthQoQ)?.toFixed?.(1)}%`);
            if (fin.epsGrowthQoQ)      finParts.push(`EPS성장(QoQ) ${fin.epsGrowthQoQ?.toFixed?.(1)}%`);
            if (fin.dividendYield)     finParts.push(`배당 ${fin.dividendYield?.toFixed?.(2)}%`);
            if (fin.rsi14)             finParts.push(`RSI ${fin.rsi14?.toFixed?.(0)}`);
            if (fin.analystTarget)     finParts.push(`목표가 $${fin.analystTarget}`);
            if (fin.analystRecom)      finParts.push(`Finviz추천 ${fin.analystRecom}`);
            if (fin.shortFloat)        finParts.push(`공매도 ${fin.shortFloat}`);
            if (fin.earningsDate)      finParts.push(`어닝 ${fin.earningsDate}`);
            if (fin.debtEq)            finParts.push(`부채비율 ${fin.debtEq?.toFixed?.(2)}`);
          }
          const finStr = finParts.join(', ') || 'N/A';
          const recStr = rec ? `애널리스트(Finnhub): 강력매수 ${rec.strongBuy}, 매수 ${rec.buy}, 보유 ${rec.hold}, 매도 ${rec.sell}` : '';
          const fvSignal = fin?.summary
            ? `\n시장신호: RSI ${fin.summary.rsi_zone === 'oversold' ? '과매도' : fin.summary.rsi_zone === 'overbought' ? '과매수' : '중립'}, 52주고가 근접 ${fin.summary.near_52w_high ? '예' : '아니오'}, 성장+수익 동반 ${fin.summary.has_positive_growth ? '예' : '아니오'}`
            : '';

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
  ${recStr}${fvSignal}
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
    } else {
      let results = (searchData.result || []).filter(r => ['Common Stock', 'ADR', 'ETF', 'ETP', 'ETC'].includes(r.type) && r.symbol && !r.symbol.includes('.'));
      // 메인 검색 추천 목록에서도 정확히 일치하는 티커를 최상단으로 정렬
      results.sort((a, b) => {
        if (a.symbol === searchTerm.toUpperCase()) return -1;
        if (b.symbol === searchTerm.toUpperCase()) return 1;
        return 0;
      });

      const suggestions = results.slice(0, 5).map(s => ({ symbol: s.symbol, description: s.description, logo: '' }));

      if (suggestions.length > 0) {
        await Promise.all(suggestions.map(async (s) => {
          try {
            const profRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${s.symbol}&token=${FINNHUB_KEY}`, { next: { revalidate: 86400 } });
            const profData = await profRes.json();
            if (profData.logo) s.logo = profData.logo;
          } catch(e) {}
        }));
        result.suggestions = suggestions;
      } else {
        result.error = `"${query}"에 대한 검색 결과가 없어요. 다른 이름이나 티커로 검색해보세요.`;
      }
    }
  } catch (e) {
    console.error('Search error:', e);
    result.error = '검색 중 오류가 발생했어요';
  }

  return Response.json(result);
}