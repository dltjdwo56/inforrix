export async function POST(request) {
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  if (!CLAUDE_KEY) return Response.json({ error: 'API 키 없음' });

  try {
    const body = await request.json();
    const { type, marketData, metric, value, company } = body;

    let prompt = '';

    if (type === 'market-summary') {
      prompt = `당신은 금융 시장 분석 전문가이면서 경제를 쉽게 설명하는 선생님이에요. 토스 앱처럼 친근한 존댓말로 작성하세요.

오늘의 실시간 시장 데이터:
${marketData}

아래 JSON 형식으로만 응답하세요. JSON만, 다른 텍스트 없이:
{"mood":"상승/하락/혼조/급등/급락/관망","emoji":"이모지1개","headline":"20자 이내 한줄 요약","summary":"시장 전체 흐름 3~4문장. 각 자산이 왜 그렇게 움직이는지 맥락 연결. 실생활 영향 포함.","signals":[{"asset":"자산명","emoji":"이모지","direction":"up/down","insight":"이 자산이 이렇게 움직이는 구체적 이유 2문장"}],"actionTip":"일반인 팁 1문장(투자 권유 아님)"}

중요: 단순히 올랐다/내렸다가 아니라 WHY를 설명하세요. 데이터 간 상관관계를 분석하세요. signals 최대 4개.`;

    } else if (type === 'metric-explain') {
      const { financials } = body;
      const finCtx = financials ? `
전체 재무 맥락:
- PER: ${financials.pe ?? '없음'}
- PBR: ${financials.pb ?? '없음'}
- ROE: ${financials.roe != null ? financials.roe.toFixed(1) + '%' : '없음'}
- 매출성장: ${financials.revenueGrowth != null ? financials.revenueGrowth.toFixed(1) + '%' : '없음'}
- 순이익률: ${financials.netMargin != null ? financials.netMargin.toFixed(1) + '%' : '없음'}
- 배당률: ${financials.dividendYield != null ? financials.dividendYield.toFixed(2) + '%' : '없음'}
- 베타: ${financials.beta != null ? financials.beta.toFixed(2) : '없음'}
- 52주 고가: ${financials.high52 != null ? '$' + financials.high52.toFixed(0) : '없음'}
- 52주 저가: ${financials.low52 != null ? '$' + financials.low52.toFixed(0) : '없음'}
- 현재 주가: ${financials.currentPrice != null ? '$' + financials.currentPrice.toFixed(2) : '없음'}` : '';

      prompt = `당신은 주식 초보자에게 재무지표를 쉽게 설명하는 금융 분석가예요. 토스 앱처럼 친근한 존댓말로 작성하세요.

기업: ${company}
분석 지표: ${metric} = ${value}
${finCtx}

위 재무 데이터를 종합적으로 고려해서 '${metric}'를 아래 순서로 3~4문장 설명하세요:
1. 이 지표가 뭔지 실생활 비유로 한 문장 설명
2. ${value}라는 숫자가 이 기업의 다른 지표들과 맥락에서 어떤 의미인지 (단순히 높다/낮다가 아니라, 예: "순이익률이 높은데 매출성장도 빠르다면 → 규모의 경제 효과" 같은 연관 분석)
3. 이 기업에 투자하는 관점에서 이 숫자가 주는 시사점

투자 권유 없이 객관적으로. 수치는 그대로 인용하세요.`;

    } else if (type === 'quick-insight') {
      const { asset, assetType, price, change, allRates, allStocks } = body;

      if (assetType === 'fx') {
        const ratesCtx = allRates ? Object.entries(allRates).map(([k,v]) => `${k}: ${v}`).join(', ') : '';
        prompt = `당신은 환율 전문가예요. 토스 앱처럼 친근한 존댓말로 2~3문장만 작성하세요.

오늘 환율 현황: ${ratesCtx}

분석 대상: ${asset} = ${price}

이 환율 수준에 대해 아래를 2~3문장으로 설명하세요:
1. 이 수준이 최근 흐름에서 높은지 낮은지와 주요 원인 1가지
2. 일상생활(해외직구·여행·수입물가 등)에 미치는 실질적 영향

숫자는 그대로 인용하고, 투자 권유 없이 객관적으로.`;

      } else {
        const mktCtx = allStocks ? allStocks.map(s => `${s.label}(${s.symbol}): $${s.price?.toFixed(2)} (${s.change > 0 ? '+' : ''}${s.change?.toFixed(2)}%)`).join(', ') : '';
        prompt = `당신은 원자재·주식 시장 전문가예요. 토스 앱처럼 친근한 존댓말로 2~3문장만 작성하세요.

오늘 시장 현황: ${mktCtx}

분석 대상: ${asset} ${change > 0 ? '+' : ''}${change?.toFixed(2)}% (현재 $${price?.toFixed(2)})

위 시장 맥락을 종합해 아래를 2~3문장으로 설명하세요:
1. 왜 이렇게 움직였는지 구체적인 이유 (단순 상승/하락이 아닌 WHY)
2. 다른 자산들과의 연관성 또는 일반인 실생활에 미치는 영향

숫자는 그대로 인용하고, 투자 권유 없이 객관적으로.`;
      }

    } else {
      prompt = `당신은 경제를 쉽게 설명하는 전문가예요. 토스 앱처럼 친근한 존댓말로 작성하세요.
오늘 시장 데이터: ${marketData}
200자 이내로 "오늘 시장 한줄 정리"를 작성하세요. 전문 용어 없이, 실생활 영향 1개, 부드러운 팁 1개 포함.`;
    }

    const isQuick = type === 'quick-insight' || type === 'metric-explain';
    const model = isQuick ? 'claude-3-haiku-20240307' : 'claude-sonnet-4-20250514';
    const max_tokens = isQuick ? 250 : 800;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens, messages: [{ role: 'user', content: prompt }] }),
    });

    const data = await res.json();
    if (data.error) return Response.json({ error: data.error.message });

    const text = data.content?.[0]?.text || '';

    if (type === 'market-summary') {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return Response.json({ aiSummary: JSON.parse(jsonMatch[0]) });
      return Response.json({ error: '분석 파싱 실패' });
    }

    return Response.json({ insight: text });
  } catch (e) {
    console.error('AI error:', e);
    return Response.json({ error: e.message });
  }
}