export const dynamic = 'force-dynamic';

const TERM_POOL = [
  '숏스퀴즈','테이퍼링','골디락스','어닝 서프라이즈','스태그플레이션',
  '블랙스완','데드캣 바운스','불마켓','베어마켓','리세션',
  '양적긴축','커버드콜','레버리지','마진콜','디레버리징',
  '섹터로테이션','모멘텀 투자','가치투자','성장주','배당성장주',
  '부채비율','유동비율','영업이익률','EV/EBITDA','자유현금흐름',
  '공포탐욕지수','VIX','콘탱고','백워데이션',
  '트리플위칭','옵션만기일','주식분할','자사주매입','유상증자',
  '신용등급','하이일드채권','국채수익률','장단기금리역전','연방기금금리',
  '환율효과','캐리트레이드','달러강세','신흥국리스크','안전자산선호',
];

export async function GET(request) {
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  const selectedTerm = q || TERM_POOL[Math.floor(Math.random() * TERM_POOL.length)];
  const fallbackTerm = {
    term: selectedTerm,
    emoji: '📖',
    desc: '설명을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
  };

  if (!CLAUDE_KEY) return Response.json(fallbackTerm);

  try {
    const prompt = `'${selectedTerm}'라는 경제/금융 용어를 주식 초보자에게 토스(Toss) 앱처럼 친근하게 1~2줄로 설명해주세요. 비유나 실생활 예시를 포함해주세요. 반드시 아래 JSON 형식으로만 응답하고 다른 말은 절대 하지 마세요. {"term": "${selectedTerm}", "emoji": "관련이모지1개", "desc": "설명"}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.term && parsed.desc) return Response.json(parsed);
    }

    return Response.json(fallbackTerm);
  } catch (e) {
    console.error('econ-term error:', e);
    return Response.json(fallbackTerm);
  }
}
