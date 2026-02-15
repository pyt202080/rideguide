# 뭐 무까? (What should we eat?)

고속도로 이동 경로에 맞춰 휴게소와 IC 인근 맛집 정보를 추천하는 웹 앱입니다.

## 주요 기능
- 출발지/도착지 기반 경로 추천
- 경로별 휴게소/맛집 목록과 메뉴 정보 표시
- 카카오맵/네이버맵 바로가기 링크 제공
- 지도 선택 입력 + 주소 자동완성

## 배포 (Vercel)
1. GitHub 저장소를 Vercel에 연결합니다.
2. 프로젝트 환경변수에 `API_KEY`를 추가합니다.
3. `main` 브랜치 배포 후 `https://<project>.vercel.app`에서 확인합니다.

## 환경변수
- `KAKAO_REST_API_KEY`: Kakao Developers에서 발급한 REST API 키

## 기술 스택
- Frontend: React + Vite + TailwindCSS
- Serverless API: Vercel Functions (`api/generate-routes.ts`)
- AI: `@google/genai`
- Map: Kakao Maps SDK (+ OSM fallback)
