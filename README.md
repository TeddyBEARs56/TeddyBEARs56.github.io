# Cyborg

로컬 LLM을 처음부터 설치하는 기록. https://teddybears56.github.io

## 미리 보기

```sh
npm install
npm run dev      # http://localhost:4321
```

## 글 쓰기

`src/content/posts/` 에 `.mdx` 파일을 하나 만들면 홈의 최신 글과 연재 목차에 저절로 올라갑니다.

```yaml
---
stage: 1                      # 연재 단계 (0~8)
title: 모델은 파일 하나
description: 검색·공유에 쓰는 한 줄 설명
excerpt: 홈 카드에 보이는 두 문장
lead: 글 제목 아래 첫 문단 (없으면 excerpt)
pubDate: 2026-11-20
hands: [claude]               # 명령을 친 쪽: person, claude
reading:                      # 홈 카드 오른쪽의 대표 기록 (선택)
  was: 이전 값
  now: 바뀐 값
  setting: 무엇을 바꿨나
  decided: person
  loggedBy: 서버
  time: '19:01:51'
  datetime: '2026-11-20T19:01:51+09:00'
  why: 한 줄 이유
---
```

글 안에서 쓰는 부품은 `src/components/` 에 있습니다.

- `<Code title="터미널, 서버">` 안에 코드 블록을 넣으면 제목과 복사 버튼이 붙습니다.
- `<Trail date items>` 시각별 작업 기록, `<Diff rows>` 바꾸기 전과 후, `<Note>` 주의 상자.

연재 계획(단계 제목, 치는 쪽)은 `src/data/series.ts`, 블로그 소개는 `src/data/site.ts` 에 있습니다.

## 배포

`main` 에 올리면 GitHub Actions 가 빌드해서 GitHub Pages 에 올립니다.

## 디자인

색은 두 가지 뜻만 씁니다. 주황은 사람이 한 일, 하늘색은 기계(Claude와 서버)가 한 일입니다.
