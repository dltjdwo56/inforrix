import './globals.css';

export const metadata = {
  title: 'INFORIX - 오늘의 경제, 쉽게 보기',
  description: '환율, 주식, 원자재 가격을 한눈에. 어려운 경제를 쉽게 풀어드려요.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
