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
      prompt = `당신은 주식 초보자에게 재무지표를 쉽게 설명하는 전문가예요. 토스 앱처럼 친근한 존댓말로.

기업: ${company}
지표: ${metric} = ${value}

이 지표를 아래 형식으로 설명하세요 (3~4문장):
1. 이 지표가 뭔지 비유로 설명 (예: "PER은 투자금 회수 기간이에요. PER 34면, 지금 수익이 계속된다면 투자금을 34년 만에 회수한다는 뜻이에요.")
2. ${value}라는 숫자가 높은 건지 낮은 건지 판단 (같은 업종 평균 대비)
3. 이 기업에 대해 이 숫자가 의미하는 것

투자 권유 없이 객관적으로.`;

    } else {
      prompt = `당신은 경제를 쉽게 설명하는 전문가예요. 토스 앱처럼 친근한 존댓말로 작성하세요.
오늘 시장 데이터: ${marketData}
200자 이내로 "오늘 시장 한줄 정리"를 작성하세요. 전문 용어 없이, 실생활 영향 1개, 부드러운 팁 1개 포함.`;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
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