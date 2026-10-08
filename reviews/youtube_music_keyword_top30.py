# -*- coding: utf-8 -*-
"""유튜브뮤직 구글플레이 리뷰 키워드 빈도 분석.

형태소 분석기: kiwipiepy (Kiwi).
KoNLPy Okt는 이 환경에 JVM(JAVA_HOME / jvm.dll)이 없어 실행되지 않는다.
Kiwi는 Mecab과 같이 품사 태그를 붙이는 한국어 형태소 분석기라
명사(NNG/NNP)·형용사(VA) 필터 목적에 그대로 사용한다.

집계 단위: 리뷰 본문에서 조건을 통과한 형태소가 나타난 횟수(토큰 빈도).
리뷰 1건에 같은 단어가 두 번 나오면 2로 센다.
"""

import re
from collections import Counter
from pathlib import Path

import pandas as pd
from kiwipiepy import Kiwi

CSV_PATH = Path(__file__).with_name("youtube_music_reviews.csv")

# 앱·브랜드명, 조사성 잔여 표현, 무의미 부사·감탄·접속
STOPWORDS = {
    "유튜브",
    "유튜브뮤직",
    "유투브",
    "뮤직",
    "youtube",
    "youtubemusic",
    "YouTube",
    "Music",
    "멜론",
    "멜론앱",
    "지니",
    "지니뮤직",
    "스포티파이",
    "것",
    "수",
    "등",
    "및",
    "거",
    "게",
    "때",
    "좀",
    "더",
    "왜",
    "이",
    "그",
    "저",
    "나",
    "내",
    "제",
    "저희",
    "우리",
    "여기",
    "거기",
    "이번",
    "그냥",
    "정도",
    "때문",
    "위해",
    "통해",
    "대해",
    "관련",
    "경우",
    "뭐",
    "뭔가",
    "어디",
    "어떻게",
    "정말",
    "진짜",
    "너무",
    "아주",
    "매우",
    "완전",
    "살짝",
    "약간",
    "계속",
    "다시",
    "지금",
    "오늘",
    "어제",
    "항상",
    "자주",
    "한번",
    "하나",
    "둘",
    "자체",
    "부분",
    "이상",
    "이하",
    "기타",
    "전체",
    "모든",
    "각",
    "또",
    "또한",
    "그리고",
    "그러나",
    "하지만",
    "그래서",
    "근데",
    "그런데",
    "아",
    "휴",
    "음",
    "응",
    "네",
    "예",
    "요",
    "임",
    "함",
    "됨",
    "중",
    "후",
    "전",
    "안",
    "못",
    "잘",
    "곳",
    "점",
    "분",
    "달",
    "년",
    "일",
    "시",
    "번",
    "개",
    "명",
    "리뷰",
    "별점",
    "평점",
}

# 1글자라도 음악 앱 리뷰에서 의미가 분명한 핵심어
ONE_CHAR_KEEP = {"앱", "돈", "곡"}

# Kiwi가 쪼개기 쉬운 도메인 복합어. 원문에 쓰이는 표기만 등록한다.
USER_WORDS = [
    "미리듣기",
    "플레이리스트",
    "이용권",
    "스트리밍",
    "다운로드",
    "업데이트",
    "자동결제",
    "버퍼링",
    "셔플",
    "재생목록",
    "음원",
    "음질",
    "가사",
    "결제",
    "해지",
    "광고",
    "로그인",
    "오류",
    "끊김",
    "오프라인",
    "알고리즘",
    "프리미엄",
    "백그라운드",
    "전체반복",
    "반복재생",
    "유튜브뮤직",
]

# 상황·감정을 드러내지 않는 형식 형용사
FUNCTIONAL_ADJECTIVES = {"같다", "있다", "이렇다", "그렇다", "어떻다", "아니다", "아무렇다"}

POS_NOUN = {"NNG", "NNP"}
POS_ADJ = {"VA"}

_STOP_LOWER = {s.lower() for s in STOPWORDS}


def normalize(text: str) -> str:
    """URL·특수기호를 걷어 형태소 분석 입력을 만든다."""
    text = str(text)
    text = text.replace("\u200b", " ")
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^\w\s가-힣]", " ", text, flags=re.UNICODE)
    text = re.sub(r"_", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def keep_token(surface: str) -> bool:
    """2글자 미만은 예외 목록만 남기고, 불용어·숫자·기호는 버린다."""
    if surface.lower() in _STOP_LOWER or surface in STOPWORDS:
        if surface not in ONE_CHAR_KEEP:
            return False
    if surface in ONE_CHAR_KEEP:
        return True
    if len(surface) < 2:
        return False
    if surface.isdigit():
        return False
    if not re.search(r"[가-힣A-Za-z]", surface):
        return False
    return True


def main() -> None:
    df = pd.read_csv(CSV_PATH)
    texts = df["review_text"].dropna().astype(str).tolist()

    kiwi = Kiwi()
    for word in USER_WORDS:
        kiwi.add_user_word(word, "NNG", 5.0)

    counter: Counter[tuple[str, str]] = Counter()

    for text in texts:
        cleaned = normalize(text)
        if not cleaned:
            continue
        for token in kiwi.tokenize(cleaned):
            if token.tag in POS_NOUN:
                word = token.form
                pos = "명사"
            elif token.tag in POS_ADJ:
                # 활용형(좋아요)을 기본형(좋다)으로 모아 빈도가 흩어지지 않게 한다.
                word = token.lemma or (token.form + "다")
                pos = "형용사"
            else:
                continue
            if word in FUNCTIONAL_ADJECTIVES:
                continue
            if not keep_token(word):
                continue
            counter[(word, pos)] += 1

    ranked = counter.most_common(30)
    rows = [
        {"순위": i, "키워드": word, "등장 횟수(빈도)": freq, "품사": pos}
        for i, ((word, pos), freq) in enumerate(ranked, start=1)
    ]
    out = pd.DataFrame(rows)
    out_path = Path(__file__).with_name("youtube_music_keyword_top30.csv")
    out.to_csv(out_path, index=False, encoding="utf-8-sig")

    print(f"리뷰 수: {len(texts)}")
    print(out.to_string(index=False))
    print(f"저장: {out_path}")


if __name__ == "__main__":
    main()
