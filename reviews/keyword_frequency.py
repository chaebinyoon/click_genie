# -*- coding: utf-8 -*-
"""
지니뮤직 앱스토어/구글스토어 리뷰 키워드 빈도 분석
- 형태소 분석: kiwipiepy (Mecab 계열, Windows에서 Java 없이 동작)
  * KoNLPy Okt는 JDK가 필요하므로, 동일 목적의 한국어 형태소 분석기로 대체
- 추출 품사: 명사(NNG/NNP) + 형용사(VA) + 형용 어근(XR)
"""

from collections import Counter
from pathlib import Path

import pandas as pd
from kiwipiepy import Kiwi

BASE = Path(r"c:\Users\user\Desktop\윤채빈\click")

# ---------------------------------------------------------------------------
# 1) 불용어: 조사/접속사/무의미 부사 + 앱 이름
#    (조사·어미는 품사 필터로 대부분 걸러지므로, 여기선 남은 내용어 노이즈를 제거)
# ---------------------------------------------------------------------------
STOPWORDS = {
    # 앱/브랜드명
    "지니", "뮤직", "지니뮤직", "genie", "Genie", "GENIE",
    "앱스토어", "플레이스토어", "구글스토어",
    # 무의미 부사·감탄·접속
    "진짜", "너무", "정말", "아주", "그냥", "좀", "약간", "완전", "되게", "매우",
    "항상", "자꾸", "계속", "다시", "이제", "요즘", "일단", "우선", "특히",
    "그리고", "그런데", "그래서", "하지만", "그러나", "아니면", "또한", "그래도",
    "아", "휴", "음", "어", "오", "헐", "하", "ㅋ", "ㅋㅋ", "ㅋㅋㅋ",
    "ㅠ", "ㅠㅠ", "ㅜ", "ㅜㅜ", "ㅎㅎ",
    # 지시·대명·허사
    "이것", "그것", "저것", "여기", "거기", "어디", "이거", "그거", "저거",
    "이것저것", "뭔가", "무엇", "무슨", "어떤", "이런", "그런", "저런",
    "이렇게", "그렇게", "저렇게", "어떻게",
    "사람", "생각", "정도", "부분", "경우", "자체", "이번", "저번", "다음",
    "때문", "이상", "이하", "기타", "등등",
    "때", "전", "후", "중", "수", "거", "게", "듯", "점", "쪽",
    "내", "제", "저", "나", "우리", "것", "걸", "김",
    # 리뷰 메타
    "리뷰", "별점", "평점", "댓글",
    # 형용사 원형 중 의미 약한 것 (있다/같다 등). '없다'는 Pain Point라 유지
    "있다", "같다", "이다", "아니다", "하다", "되다",
}

# 1글자라도 Pain Point/핵심 도메인으로 볼 단어
ONE_CHAR_KEEP = {"앱", "돈", "곡", "렉", "팅", "창", "금", "별"}

# Kiwi 품사: 일반명사/고유명사/형용사/어근
KEEP_TAGS = {"NNG", "NNP", "VA", "XR"}

# 형태소가 쪼개진 복합명사 복원 (연속 토큰일 때만)
COMPOUND_PAIRS = {
    ("플레이", "리스트"): "플레이리스트",
    ("재생", "목록"): "재생목록",
    ("이용", "권"): "이용권",
}

# 동일 의미 표기 통일 (빈도 분산 방지)
SYNONYMS = {
    "업뎃": "업데이트",
    "플리": "플레이리스트",
}


def load_reviews() -> pd.Series:
    """두 스토어 리뷰 본문(+앱스토어 제목)을 하나의 시리즈로 합친다."""
    app = pd.read_csv(BASE / "genie_appstore_reviews.csv", encoding="utf-8")
    google = pd.read_csv(BASE / "genie_google_reviews.csv", encoding="utf-8")

    app_text = (
        app["review_title"].fillna("").astype(str)
        + " "
        + app["review_text"].fillna("").astype(str)
    )
    google_text = google["review_text"].fillna("").astype(str)

    texts = pd.concat([app_text, google_text], ignore_index=True)
    texts = texts.str.strip()
    return texts[texts.ne("") & texts.ne("nan")]


def pos_label(tag: str) -> str:
    if tag == "VA":
        return "형용사"
    if tag == "XR":
        return "어근(형용)"
    return "명사"


def to_lemma(form: str, tag: str) -> str:
    word = form.strip()
    if tag == "VA" and not word.endswith("다"):
        return word + "다"
    return word


def is_noise(word: str) -> bool:
    if not word:
        return True
    if word.lower() in STOPWORDS or word in STOPWORDS:
        return True
    if word.isascii() and not any(ch.isalpha() for ch in word):
        return True
    if word.replace(".", "").isdigit():
        return True
    return False


def keep_after_merge(word: str) -> bool:
    """복합어 병합 이후 글자 수·불용어 필터."""
    if is_noise(word):
        return False
    if len(word) < 2 and word not in ONE_CHAR_KEEP:
        return False
    return True


def extract_keywords(texts: pd.Series, kiwi: Kiwi) -> tuple[Counter, dict]:
    """토큰 등장 횟수(원빈도)와 품사 맵을 반환."""
    freq = Counter()
    pos_map: dict[str, str] = {}

    for text in texts:
        raw = []
        for tok in kiwi.tokenize(str(text)):
            tag = tok.tag.split("+")[0]
            if tag not in KEEP_TAGS:
                continue
            word = to_lemma(tok.form, tag)
            if is_noise(word):
                continue
            raw.append((word, pos_label(tag)))

        # 연속 명사 복합어 병합 후 집계
        i = 0
        merged: list[tuple[str, str]] = []
        while i < len(raw):
            word, pos = raw[i]
            if i + 1 < len(raw):
                nxt, nxt_pos = raw[i + 1]
                compound = COMPOUND_PAIRS.get((word, nxt))
                if compound:
                    merged.append((compound, "명사"))
                    i += 2
                    continue
            merged.append((word, pos))
            i += 1

        for word, pos in merged:
            word = SYNONYMS.get(word, word)
            if not keep_after_merge(word):
                continue
            freq[word] += 1
            pos_map[word] = pos

    return freq, pos_map


def main() -> None:
    kiwi = Kiwi()
    texts = load_reviews()
    print(f"분석 리뷰 수: {len(texts):,}")

    freq, pos_map = extract_keywords(texts, kiwi)
    top30 = freq.most_common(30)

    rows = []
    print("\n순위\t키워드\t등장 횟수\t품사")
    for i, (word, count) in enumerate(top30, 1):
        pos = pos_map.get(word, "")
        print(f"{i}\t{word}\t{count}\t{pos}")
        rows.append({"순위": i, "키워드": word, "등장 횟수(빈도)": count, "품사": pos})

    out = pd.DataFrame(rows)
    out_path = BASE / "genie_keyword_top30.csv"
    out.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"\n저장: {out_path}")


if __name__ == "__main__":
    main()
