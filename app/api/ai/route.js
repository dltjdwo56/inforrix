export async function POST(request) {
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

  console.log('API Key exists:', !!CLAUDE_KEY);
  console.log('API Key starts with:', CLAUDE_KEY?.substring(0, 10));

  if (!CLAUDE_KEY) {
    return Response.json({ insight: 'Claude API 키가 설정되지 않았어요' });
  }

  try {
    const body = await request.json();
    const marketData = body.marketData || '데이터 없음';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: '오늘 시장을 200자 이내로 쉽게 정리해줘. 데이터: ' + marketData,
        }],
      }),
    });

    const data = await res.json();
    console.log('Claude response status:', res.status);
    console.log('Claude response:', JSON.stringify(data).substring(0, 200));

    if (data.error) {
      return Response.json({ insight: '오류: ' + data.error.message });
    }

    const text = data.content?.[0]?.text || '분석을 불러오지 못했어요.';
    return Response.json({ insight: text });
  } catch (e) {
    console.error('Error:', e.message);
    return Response.json({ insight: '오류: ' + e.message });
  }
}