const tracks = [
  { title: "퇴사할게여 (Narr. 기안84)", artist: "소연 (SOYEON)", color: "#e8a1bf", delta: "same" },
  { title: "LOVE ATTACK", artist: "RESCENE (리센느)", color: "#5ec7e8", delta: "up", amount: 3 },
  { title: "갑자기", artist: "아이오아이 (I.O.I)", color: "#38738c", delta: "up", amount: 17 },
  { title: "REDRED", artist: "CORTIS (코르티스)", color: "#2b3b4a", delta: "down", amount: 2 },
  { title: "스물다섯에 상장하는 50", artist: "아일", color: "#c4b5a0", delta: "up", amount: 1 },
  { title: "밤양갱", artist: "비비 (BIBI)", color: "#f2a7c3", delta: "same" },
  { title: "Magnetic", artist: "ILLIT", color: "#7eb6d9", delta: "down", amount: 4 },
  { title: "Supernova", artist: "aespa", color: "#6b4c7a", delta: "up", amount: 6 },
];

const labels = [
  { color: "#408c73", title: "서로의 하모니로 완성된\n2000년대 듀엣곡", by: "지플리" },
  { color: "#e9c04f", title: "서로의 하모니로 완성된\n2000년대 듀엣곡", by: "지플리" },
  { color: "#dc6666", title: "서로의 하모니로 완성된\n2000년대 듀엣곡", by: "지플리" },
];

const promos = {
  fast: {
    title: "고민없는 빠른선곡",
    lead: "내 취향 기반 추천! 고민 없이 바로 듣기",
  },
  time: {
    title: "타임머신",
    lead: "내가 애정했던 추억의 플레이리스트",
  },
};

const tabs = [
  { id: "home", label: "홈", icon: "assets/tab-home.svg" },
  { id: "aidj", label: "AI DJ", icon: "assets/tab-aidj.svg" },
  { id: "search", label: "검색", icon: "assets/tab-search.svg" },
  { id: "library", label: "내음악", icon: "assets/tab-library.svg" },
  { id: "menu", label: "전체메뉴", icon: "assets/tab-menu.svg" },
];

const tabCopy = {
  aidj: ["오늘의 무드", "출근길 추천", "집중 모드", "잠들기 전"],
  search: ["실시간 검색어", "가수", "곡", "앨범", "플레이리스트"],
  library: ["최근 들은 곡", "좋아요", "내 플레이리스트", "저장한 앨범"],
  menu: ["공지사항", "이벤트", "고객센터", "설정"],
};

const state = {
  tab: "home",
  chips: ["홈", "DJ", "매거진", "고음질 전용관"],
  chip: "홈",
  screen: "home",
  screenTitle: "",
  screenLead: "",
  expanded: false,
  index: -1,
  paused: true,
  sheet: null,
};

const app = document.getElementById("app");

function visibleTracks() {
  return state.expanded ? tracks : tracks.slice(0, 4);
}

function currentTrack() {
  return state.index >= 0 ? tracks[state.index] : null;
}

function play(index) {
  state.index = index;
  state.paused = false;
  state.sheet = null;
  render();
}

function renderDelta(track) {
  if (track.delta === "up") {
    return `<span class="delta up"><span class="mark">▴</span>${track.amount}</span>`;
  }
  if (track.delta === "down") {
    return `<span class="delta down"><span class="mark">▾</span>${track.amount}</span>`;
  }
  return `<span class="delta"><span class="mark">-</span></span>`;
}

function trackButton(track, index) {
  const on = state.index === index ? " is-on" : "";
  return `
    <button class="track${on}" data-action="play" data-index="${index}">
      <span class="cover" style="background:${track.color}"></span>
      <span class="rank"><b>${index + 1}</b>${renderDelta(track)}</span>
      <span class="meta"><strong>${track.title}</strong><em>${track.artist}</em></span>
    </button>`;
}

function homeScreen() {
  if (state.chip !== "홈") {
    return `
      <section class="page">
        <h1>${state.chip}</h1>
        <p class="lead">${state.chip} 채널의 추천 콘텐츠입니다.</p>
        <div class="empty-list">
          ${tracks
            .slice(0, 4)
            .map(
              (track, index) =>
                `<button class="row" data-action="play" data-index="${index}">${track.title}</button>`
            )
            .join("")}
        </div>
      </section>`;
  }

  const cards = labels
    .map(
      (card, index) => `
      <button class="card" data-action="label" data-index="${index}">
        <span class="card-cover" style="background:${card.color}"></span>
        <span class="card-copy">${card.title.replace("\n", "<br />")}</span>
        <span class="byline"><img src="assets/ellipse.svg" width="11" height="11" alt="" />${card.by}</span>
      </button>`
    )
    .join("");

  return `
    <div class="promo-row">
      <button class="promo fast" data-action="promo" data-id="fast">
        <h2>고민없는 빠른선곡</h2>
        <p>내 취향 기반 추천!<br />고민 없이 바로 듣기</p>
      </button>
      <button class="promo time" data-action="promo" data-id="time">
        <h2>타임머신</h2>
        <p>내가 애정했던<br />추억의 플레이리스트</p>
      </button>
    </div>
    <section class="section">
      <div class="section-head">
        <button data-action="chart"><h2>지니차트 <span>TOP 200</span>  &gt;</h2></button>
        <button class="listen-all" data-action="play-all">전체듣기</button>
      </div>
      <div class="track-list">
        ${visibleTracks().map(trackButton).join("")}
      </div>
      ${
        state.expanded
          ? ""
          : `<button class="more" data-action="more">더보기</button>`
      }
    </section>
    <section class="label-block">
      <button class="plain-title" data-action="labels">레이블 PICK  &gt;</button>
      <div class="cards">${cards}</div>
    </section>`;
}

function listScreen() {
  const list =
    state.screen === "label"
      ? tracks.slice(0, 5)
      : tracks;
  return `
    <section class="page">
      <button class="back" data-action="back">‹ 홈</button>
      <h1>${state.screenTitle}</h1>
      <p class="lead">${state.screenLead}</p>
      <div class="track-list">
        ${list
          .map((track) => trackButton(track, tracks.indexOf(track)))
          .join("")}
      </div>
    </section>`;
}

function tabScreen() {
  const rows = tabCopy[state.tab] || [];
  return `
    <section class="page">
      <h1>${tabs.find((tab) => tab.id === state.tab).label}</h1>
      <div class="empty-list">
        ${rows.map((row) => `<div class="row">${row}</div>`).join("")}
      </div>
    </section>`;
}

function sheet() {
  if (state.sheet === "pass") {
    return `
      <div class="sheet-back" data-action="close-sheet">
        <div class="sheet" data-stop>
          <h3>이용권</h3>
          <p>지니 이용권으로 광고 없이 고음질로 들을 수 있습니다.</p>
          <button class="close" data-action="close-sheet">닫기</button>
        </div>
      </div>`;
  }
  if (state.sheet === "profile") {
    return `
      <div class="sheet-back" data-action="close-sheet">
        <div class="sheet" data-stop>
          <h3>내 계정</h3>
          <p>프로필, 이용권, 재생 기록을 여기서 확인합니다.</p>
          <button class="close" data-action="close-sheet">닫기</button>
        </div>
      </div>`;
  }
  if (state.sheet === "queue") {
    return `
      <div class="sheet-back" data-action="close-sheet">
        <div class="sheet" data-stop>
          <h3>재생목록</h3>
          ${tracks
            .map(
              (track, index) => `
              <button class="queue-item${state.index === index ? " is-on" : ""}" data-action="play" data-index="${index}">
                <span class="swatch" style="background:${track.color}"></span>
                <strong>${track.title}</strong>
              </button>`
            )
            .join("")}
        </div>
      </div>`;
  }
  return "";
}

function miniPlayer() {
  const track = currentTrack();
  if (!track) return "";
  return `
    <div class="mini">
      <div class="now">
        <strong>${track.title}</strong>
        <span>${track.artist}</span>
      </div>
      <div class="controls">
        <button data-action="prev" aria-label="이전">⏮</button>
        <button class="play" data-action="toggle" aria-label="${state.paused ? "재생" : "일시정지"}">${state.paused ? "▶" : "❚❚"}</button>
        <button data-action="next" aria-label="다음">⏭</button>
        <button class="queue" data-action="queue" aria-label="재생목록">☰</button>
      </div>
    </div>`;
}

function render() {
  const showChips = state.tab === "home" && state.screen === "home";
  let body = homeScreen();
  if (state.tab !== "home") body = tabScreen();
  else if (state.screen !== "home") body = listScreen();

  app.innerHTML = `
    <div class="status">
      <img class="notch" src="assets/notch.svg" width="172" height="32" alt="" />
      <div class="time">9:41</div>
      <div class="status-right">
        <img src="assets/signal.svg" width="18" height="12" alt="" />
        <img src="assets/wifi.svg" width="17" height="11.8339" alt="" />
        <img src="assets/battery.svg" width="27.4012" height="13" alt="" />
      </div>
    </div>
    <header class="header">
      <button class="logo" data-action="logo" aria-label="지니 홈">
        <img src="assets/logo.png" alt="genie" />
      </button>
      <div class="header-right">
        <button class="pass" data-action="pass">이용권</button>
        <button class="avatar" data-action="profile" aria-label="내 계정">
          <img src="assets/user.svg" width="24" height="24" alt="" />
        </button>
      </div>
    </header>
    ${
      showChips
        ? `<nav class="chips">
            <div class="chip-row">
              ${state.chips
                .map(
                  (chip) =>
                    `<button class="chip${chip === state.chip ? " is-on" : ""}" data-action="chip" data-chip="${chip}">${chip}</button>`
                )
                .join("")}
            </div>
            <button class="chip-add" data-action="add-chip" aria-label="채널 추가">+</button>
          </nav>`
        : ""
    }
    <main class="main">${body}</main>
    <div class="dock">
      ${miniPlayer()}
      <nav class="tabs">
        ${tabs
          .map(
            (tab) => `
            <button class="tab${state.tab === tab.id ? " is-on" : ""}" data-action="tab" data-tab="${tab.id}">
              <img src="${tab.icon}" width="24" height="24" alt="" />
              ${tab.label}
            </button>`
          )
          .join("")}
      </nav>
      <div class="home-indicator"><span></span></div>
    </div>
    ${sheet()}
  `;
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || !app.contains(target)) return;
  const action = target.dataset.action;
  if (action === "close-sheet" && event.target !== target && !target.classList.contains("close")) return;

  if (action === "chip") {
    state.chip = target.dataset.chip;
    state.screen = "home";
  } else if (action === "add-chip") {
    const name = `채널 ${state.chips.length - 3}`;
    if (!state.chips.includes(name)) state.chips.push(name);
    state.chip = name;
  } else if (action === "tab") {
    state.tab = target.dataset.tab;
    state.screen = "home";
    state.chip = "홈";
  } else if (action === "play") {
    play(Number(target.dataset.index));
    return;
  } else if (action === "play-all") {
    play(0);
    return;
  } else if (action === "more") {
    state.expanded = true;
  } else if (action === "chart" || action === "labels") {
    state.screen = "chart";
    state.screenTitle = action === "chart" ? "지니차트 TOP 200" : "레이블 PICK";
    state.screenLead = action === "chart" ? "실시간 인기곡" : "레이블이 고른 플레이리스트";
    state.expanded = true;
  } else if (action === "promo") {
    const promo = promos[target.dataset.id];
    state.screen = "promo";
    state.screenTitle = promo.title;
    state.screenLead = promo.lead;
  } else if (action === "label") {
    const card = labels[Number(target.dataset.index)];
    state.screen = "label";
    state.screenTitle = card.title.replace("\n", " ");
    state.screenLead = card.by;
  } else if (action === "back" || action === "logo") {
    state.tab = "home";
    state.chip = "홈";
    state.screen = "home";
  } else if (action === "pass") {
    state.sheet = "pass";
  } else if (action === "profile") {
    state.sheet = "profile";
  } else if (action === "close-sheet") {
    state.sheet = null;
  } else if (action === "toggle") {
    if (state.index < 0) play(0);
    else state.paused = !state.paused;
  } else if (action === "prev") {
    if (state.index < 0) play(0);
    else play((state.index - 1 + tracks.length) % tracks.length);
    return;
  } else if (action === "next") {
    if (state.index < 0) play(0);
    else play((state.index + 1) % tracks.length);
    return;
  } else if (action === "queue") {
    state.sheet = "queue";
  }
  render();
});

render();
