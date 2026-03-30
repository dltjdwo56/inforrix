export const dynamic = 'force-dynamic';
export const revalidate = 60; // 1분마다 캐시 갱신

export async function GET() {
  try {
    // 야후 파이낸스 KOSPI 지수(^KS11) API 호출
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/^KS11?interval=1d', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 60 } // API 60초 캐싱 처리 (부하 방지)
    });

    if (!res.ok) throw new Error('API fetch failed');

    const data = await res.json();
    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    return Response.json({
      price: price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), // 예: "2,750.45"
      changePercent: changePercent.toFixed(2),
      isUp: change >= 0
    });
  } catch (error) {
    console.error('KOSPI API Error:', error);
    return Response.json({ error: 'Failed to fetch KOSPI' }, { status: 500 });
  }
}