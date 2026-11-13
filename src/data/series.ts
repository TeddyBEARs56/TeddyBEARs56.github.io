export type Hand = 'person' | 'claude';

export const HAND_LABEL: Record<Hand, string> = { person: '사람', claude: 'Claude' };

/** A series: a set of posts read in order. Posts join one with `series: <id>` and `stage: <n>`. */
export const SERIES_INFO = [
	{ id: 'local-llm', title: '로컬 LLM 처음부터', desc: '모델 파일 하나에서 여러 사람이 쓰는 서버까지, 아홉 편' },
] as const;

/** The nine planned stages of the local LLM series. A published post with the same stage replaces the planned title. */
export const SERIES: { stage: number; title: string; desc: string; hands: Hand[] }[] = [
	{ stage: 0, title: 'LLM을 올릴 서버 준비하기', desc: '원격 접속, 잠자기, 설치 도구', hands: ['claude', 'person'] },
	{ stage: 1, title: '모델은 파일 하나', desc: '모델 파일의 크기와 압축(양자화)', hands: ['claude'] },
	{ stage: 2, title: '엔진 직접 돌리기', desc: 'llama.cpp, 컨텍스트, GPU', hands: ['person'] },
	{ stage: 3, title: '다른 엔진과 비교', desc: 'MLX, SYCL, OpenVINO, NPU로 속도와 메모리 재기', hands: ['claude'] },
	{ stage: 4, title: '서버로 띄우기', desc: 'OpenAI 호환 API로 질문 받기', hands: ['person'] },
	{ stage: 5, title: '늘 켜져 있게', desc: '로그인 없이 도는 서비스와 기록', hands: ['claude'] },
	{ stage: 6, title: '실제로 붙여 쓰기', desc: '내 프로젝트에 연결해 비교', hands: ['person'] },
	{ stage: 7, title: '여러 사람 대비', desc: '열쇠, 사용량, 게이트웨이', hands: [] },
	{ stage: 8, title: '응용', desc: '문서 검색 답변, 미세조정', hands: [] },
];
