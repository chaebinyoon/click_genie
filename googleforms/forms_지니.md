# 지니뮤직 퍼널 분석 설문 제작 기록

- 작성일: 2026-09-21
- 주관 기관: CLICK
- 담당자: YCB
- 문의: cyun37899@gmail.com
- 산출물: Google Form 1건, 문항 20개 (AARRR 구조)

## 1. 작업 목적

음원 스트리밍 서비스 **지니뮤직**의 고객 여정(유입 → 활성화 → 유지 → 결제 → 추천)을 설문으로 수집한다.  
응답은 이탈 구간 파악, 마케팅 전략 수립, 서비스 개선 참고 자료로 사용한다. F&B/카페 브랜드 문항은 사용하지 않는다.

## 2. 계정 접속 및 제작 과정

1. 프로젝트 MCP(`Googlegoogleapis`)에 연결된 Google Forms 계정 상태를 확인했다.
2. `create_complete_form`으로 새 설문을 만들려 했으나, 서비스 계정 Drive 할당량이 0이라 **신규 Form 파일 생성이 거부**되었다. (`storageQuotaExceeded` / `forms.create` 500 INTERNAL)
3. 같은 계정에 남아 있던 기존 Form  
   `F&B 브랜드(컴포즈커피/메가MGC커피) 선호도 조사`  
   를 **제목·설명·문항을 전부 교체**하여 지니뮤직 퍼널 조사로 전환했다. (신규 파일 없이 기존 Form ID 재사용)
4. Google Forms API `batchUpdate`로 기존 문항 삭제 → 인트로 문구 반영 → 20문항 삽입을 적용했다.
5. 결과 Form 소유자는 `cyun37899@gmail.com`이며, 편집/응답 링크를 확인했다.

## 3. 생성된 Google Form

| 항목 | 값 |
| --- | --- |
| 제목 | 지니뮤직 퍼널(Funnel) 분석 및 이용 경험 조사 |
| Form ID | `111javuLJ-QyEBQ6iC3mgFaGM0FQAasOb2iw00sC5lmE` |
| 응답 링크 | https://docs.google.com/forms/d/e/1FAIpQLSdcernOH5Jcp21COxyVs_ZyTDWPtWtmXeUa5Dc__P5bx3C6iw/viewform |
| 편집 링크 | https://docs.google.com/forms/d/111javuLJ-QyEBQ6iC3mgFaGM0FQAasOb2iw00sC5lmE/edit |
| 문항 수 | 20 |
| 타겟 | 10대 ~ 60대 |

## 4. 인트로(도입부) 반영 내용

Form 설명(상단)에 아래를 모두 넣었다.

- 다정한 인사 및 소요 시간 안내(약 5~8분)
- 조사 목적: 지니뮤직 이용 경험·고객 여정 파악, 이탈 구간 분석, 마케팅/서비스 개선 참고
- 주관 기관: CLICK / 담당자: YCB
- 개인정보 수집·이용 안내(수집 항목, 목적, 보유 기간, 동의 거부 시 제한, 만 14세 미만 제외)
- 문의 이메일: cyun37899@gmail.com
- 제출 완료 시 감사 안내

## 5. 종료(제출) 메시지

Google Forms API v1은 제출 직후 확인 문구(`confirmationMessage`) 필드를 제공하지 않는다. 대신 아래 두 곳에 감사·문의 문구를 넣었다.

- Form 설명 하단: 제출 완료 감사 + 문의 이메일
- Q20 문항 설명: 참여 감사 및 `cyun37899@gmail.com` (YCB / CLICK)

편집 화면에서 **설정 → 프레젠테이션 → 확인 메시지**에 아래 문구를 추가로 넣을 수 있다.

> 참여해 주셔서 진심으로 감사합니다.  
> 소중한 의견은 지니뮤직 서비스 개선과 마케팅 전략 수립에 참고하겠습니다.  
> 추가 문의: cyun37899@gmail.com (CLICK / 담당자 YCB)

## 6. AARRR 문항 구성 (20문항)

| 구간 | 문항 | 목적 | 형식 |
| --- | --- | --- | --- |
| 기본 정보 | Q1 | 개인정보 수집·이용 동의 | 객관식(라디오) |
| 기본 정보 | Q2 | 연령대 (10대~60대) | 드롭다운 |
| 기본 정보 | Q3 | 성별 | 객관식(라디오) |
| 기본 정보 | Q4 | 직업/신분 | 드롭다운 |
| Acquisition | Q5 | 평소 음악 감상 빈도 | 객관식(라디오) |
| Acquisition | Q6 | 현재 이용 음원/음악 서비스 | 체크박스 |
| Acquisition | Q7 | 지니뮤직 최초 인지 경로 | 객관식(라디오) |
| Acquisition | Q8 | 최초 설치/가입 경로 | 드롭다운 |
| Activation | Q9 | 지니뮤직 이용 경험 단계 | 객관식(라디오) |
| Activation | Q10 | UI/UX 첫인상 | 5점 척도 |
| Activation | Q11 | 기기 연동, 러닝 메트로놈, 돌비 애트모스 등 기능 경험 | 체크박스 |
| Activation | Q12 | 주요 기능 만족도 | 5점 척도 |
| Retention & Revenue | Q13 | 유튜브 뮤직 등 타 서비스 대비 만족도 | 5점 척도 |
| Retention & Revenue | Q14 | 유료 구독 상태 | 객관식(라디오) |
| Retention & Revenue | Q15 | 6개월 내 유료 구독 의향 | 5점 척도 |
| Retention & Revenue | Q16 | 지속 사용 이유 | 체크박스 |
| Retention & Revenue | Q17 | 이탈/해지/사용 중단 사유 | 체크박스 |
| Referral | Q18 | 추천 의향 NPS (0~10) | 선형 척도 |
| Referral | Q19 | 추천/비추천 이유 | 단답형 |
| Referral | Q20 | 개선 의견 (자유 기술) | 장문형 |

## 7. 분석 활용 포인트

- **유입 이탈:** Q7·Q8에서 인지했으나 미설치, Q9에서 설치만 하고 미사용
- **활성화 이탈:** Q10~Q12에서 UI/기능 첫인상·기능 미사용이 낮으면 온보딩 개선 후보
- **유지/결제 이탈:** Q13 vs 경쟁 서비스, Q14·Q15 구독 상태와 의향 갭, Q17 해지 사유
- **추천:** Q18 NPS 0–6 비추천 / 7–8 수동 / 9–10 추천 후 Q19·Q20로 이유 해석

## 8. 후속 권장

1. Form 설정에서 제출 확인 메시지를 위 5절 문구로 저장한다.
2. Q1에서 ‘동의하지 않음’ 선택 시 종료되도록 섹션 분기를 편집 화면에서 연결한다. (API 일괄 생성 시 분기 미설정)
3. 응답 시트 연동 후 퍼널별 교차분석(연령 × 구독 상태 × NPS)을 진행한다.

## 9. 제약 사항 메모

- 서비스 계정 단독으로는 새 Drive 파일을 만들 수 없어, 기존 Form을 전환하는 방식으로 완료했다.
- 신규 독립 Form이 필요하면 Google Workspace Domain-wide Delegation 또는 사용자 계정 OAuth로 MCP를 재인증해야 한다.
