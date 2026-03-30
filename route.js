import * as cheerio from 'cheerio';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) return Response.json({ error: '종목 티커를 입력해주세요 (예: ?symbol=AAPL)' });

  try {
    // Finviz 사이트는 브라우저가 아닌 봇(Bot)의 접근을 막는 경우가 있어 User-Agent를 설정해줍니다.
    const res = await fetch(`https://finviz.com/quote.ashx?t=${symbol.toUpperCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      },
      // Finviz는 변동이 잦지 않으므로 캐싱(revalidate)을 길게 잡는 것이 좋습니다. (IP 차단 방지)
      next: { revalidate: 3600 } 
    });

    if (!res.ok) throw new Error('Finviz 사이트 접근 실패');

    const html = await res.text();
    
    // cheerio를 사용해 HTML 구조를 분석합니다 (jQuery와 비슷한 문법)
    const $ = cheerio.load(html);
    const data = {};

    // 웹사이트의 테이블 구조를 파악해 원하는 데이터를 추출합니다.
    // 예: <td>P/E</td> 다음 <td>에 있는 텍스트 가져오기
    $('.snapshot-td2-cp').each((i, el) => {
      const key = $(el).text().trim();
      const value = $(el).next().text().trim();
      if (key && value) {
        data[key] = value;
      }
    });

    return Response.json({ symbol: symbol.toUpperCase(), data });
  } catch (error) {
    return Response.json({ error: 'Finviz 데이터를 가져오는 데 실패했습니다.' });
  }
}