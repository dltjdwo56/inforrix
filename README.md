# INFORIX - 오늘의 경제, 쉽게 보기

환율, 주식, 원자재 가격을 한눈에. 어려운 경제를 쉽게 풀어드려요.

## 시작하기

### 1. 프로젝트 폴더에서 터미널 열기
VS Code에서 이 폴더를 열고, 터미널을 엽니다 (Ctrl + `)

### 2. 패키지 설치
```
npm install
```

### 3. API 키 설정
`.env.local.example` 파일을 복사해서 `.env.local`로 이름을 바꾸고, 본인의 API 키를 입력하세요.

### 4. 로컬 실행
```
npm run dev
```
브라우저에서 http://localhost:3000 접속

### 5. 배포 (Vercel)
1. GitHub에 이 프로젝트를 올립니다
2. vercel.com에서 Import
3. Environment Variables에 API 키 입력
4. Deploy!

## 기술 스택
- Next.js 14 (App Router)
- ExchangeRate-API (환율, 무료)
- Finnhub (주식/원자재, 무료)
- Claude API (AI 분석)
