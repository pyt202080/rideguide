# 🚗 뭐 무까? (What should we eat?)

경로 위의 모든 휴게소와 맛집을 찾아주는 스마트한 여행 가이드입니다.

## 🌟 주요 기능
- **휴게소 전수 조사**: 장거리 노선의 모든 휴게소 리스트 제공 (최대 20개 이상)
- **AI 시그니처 메뉴 추천**: 각 휴게소의 대표 메뉴와 시설 특징 요약
- **스마트 검색**: 카카오/구글/네이버 지도 연동으로 즉시 길안내 확인
- **최적 경로 탐색**: 2~3가지 주요 이동 경로 제안 및 비교

## 🚀 배포 방법 (Deployment)

### Vercel / Netlify (추천)
1. GitHub 리포지토리에 코드를 푸시합니다.
2. Vercel에서 해당 리포지토리를 연결합니다.
3. **환경 변수 설정**: 
   - `API_KEY`: Google AI Studio에서 발급받은 Gemini API 키 입력
4. 배포가 완료되면 부여된 URL로 접속합니다.

### 주의 사항
- `index.html` 파일 내의 `YOUR_KAKAO_APP_KEY`를 실제 카카오 JavaScript 키로 교체해야 지도가 정상 작동합니다.
- 카카오 개발자 콘솔에서 배포된 도메인을 '웹 플랫폼 사이트 도메인'에 등록해야 합니다.

## 🛠 기술 스택
- **Frontend**: React, Tailwind CSS, Lucide Icons
- **AI**: Google Gemini 3 Flash
- **Maps**: Kakao Maps API (Fallback: OpenStreetMap)
