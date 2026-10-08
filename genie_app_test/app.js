// --- 0. 스포티파이 API 키 설정 (이곳에 발급받은 키를 입력하세요!) ---
const SPOTIFY_CLIENT_ID = "182a10309bc24e42b37bbbfa82508fb3";
const SPOTIFY_CLIENT_SECRET = "54adebc854f54ed89620c369fa6eab29";
let spotifyAccessToken = ""; // 토큰 캐싱용 변수

// --- 1. 더미 데이터 및 초기 설정 ---
const tracks = [
  {
    title: "퇴사할게여 (Narr. 기안84)",
    artist: "소연 (SOYEON)",
    color: "#e8a1bf",
    delta: "same",
  },
  {
    title: "LOVE ATTACK",
    artist: "RESCENE (리센느)",
    color: "#5ec7e8",
    delta: "up",
    amount: 3,
  },
  {
    title: "갑자기",
    artist: "아이오아이 (I.O.I)",
    color: "#38738c",
    delta: "up",
    amount: 17,
  },
  {
    title: "REDRED",
    artist: "CORTIS (코르티스)",
    color: "#2b3b4a",
    delta: "down",
    amount: 2,
  },
  {
    title: "스물다섯에 상장하는 50",
    artist: "아일",
    color: "#c4b5a0",
    delta: "up",
    amount: 1,
  },
  { title: "밤양갱", artist: "비비 (BIBI)", color: "#f2a7c3", delta: "same" },
  {
    title: "Magnetic",
    artist: "ILLIT",
    color: "#7eb6d9",
    delta: "down",
    amount: 4,
  },
  {
    title: "Supernova",
    artist: "aespa",
    color: "#6b4c7a",
    delta: "up",
    amount: 6,
  },
];

const labels = [
  {
    color: "#408c73",
    title: "서로의 하모니로 완성된\n2000년대 듀엣곡",
    by: "지플리",
  },
  {
    color: "#e9c04f",
    title: "서로의 하모니로 완성된\n2000년대 듀엣곡",
    by: "지플리",
  },
  {
    color: "#dc6666",
    title: "서로의 하모니로 완성된\n2000년대 듀엣곡",
    by: "지플리",
  },
];

const promos = {
  fast: {
    title: "고민없는 빠른선곡",
    lead: "내 취향 기반 추천! 고민 없이 바로 듣기",
  },
  time: { title: "타임머신", lead: "내가 애정했던 추억의 플레이리스트" },
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

// --- 2. 앱 상태 관리 ---
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

  searchQuery: "",
  searchResults: [],
  searchAlbums: [],
  artistProfile: null,
  isSearching: false,
  nowPlaying: null,
};

const app = document.getElementById("app");
const audioPlayer = new Audio();

audioPlayer.addEventListener("ended", () => {
  state.paused = true;
  render();
});

// --- 3. 스포티파이 API 인증 및 토큰 발급 함수 (CORS 우회 버전) ---
async function getSpotifyToken() {
  if (spotifyAccessToken) return spotifyAccessToken;

  const credentials = btoa(
    `${SPOTIFY_CLIENT_ID.trim()}:${SPOTIFY_CLIENT_SECRET.trim()}`,
  );
  try {
    // 프론트엔드 직접 호출 차단(CORS)을 막기 위해 프록시 서버 경유
    const targetUrl = "https://accounts.spotify.com/api/token";
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    spotifyAccessToken = data.access_token;
    return spotifyAccessToken;
  } catch (error) {
    console.error("스포티파이 토큰 발급 실패:", error);
    return null;
  }
}

// --- 4. 통합 검색 API 통신 함수 (Spotify 프로필 + iTunes 앨범/음원) ---
async function performSearch(keyword) {
  if (!keyword.trim()) return;
  state.searchQuery = keyword;
  state.isSearching = true;
  state.searchResults = [];
  state.searchAlbums = [];
  state.artistProfile = null;
  render();

  try {
    // 1) 스포티파이 프로필 검색
    let spotifyPromise = Promise.resolve(null);
    if (SPOTIFY_CLIENT_ID && !SPOTIFY_CLIENT_ID.includes("여기에")) {
      spotifyPromise = getSpotifyToken().then((token) => {
        if (!token) return null;
        return fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(keyword)}&type=artist&limit=1`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
          .then((res) => res.json())
          .then((data) => data.artists?.items[0]);
      });
    }

    // 2) iTunes 앨범 검색
    const albumUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=album&country=US&limit=10`;
    const albumPromise = fetch(albumUrl)
      .then((res) => res.json())
      .catch(() => null);

    // 3) iTunes 음원 검색
    const trackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=song&country=US&limit=20`;
    const trackPromise = fetch(trackUrl)
      .then((res) => res.json())
      .catch(() => null);

    // API 3개 동시 대기
    const [spotifyData, albumData, trackData] = await Promise.all([
      spotifyPromise,
      albumPromise,
      trackPromise,
    ]);

    // --- 데이터 가공 ---
    // (A) 스포티파이 아티스트 프로필 생성 (소개글 대신 팔로워와 장르 사용)
    if (spotifyData) {
      const followers = new Intl.NumberFormat("ko-KR").format(
        spotifyData.followers?.total || 0,
      );
      const genres =
        spotifyData.genres && spotifyData.genres.length > 0
          ? spotifyData.genres
              .slice(0, 2)
              .map((g) => g.toUpperCase())
              .join(", ")
          : "ARTIST";

      state.artistProfile = {
        name: spotifyData.name,
        bio: `팔로워 ${followers}명 • ${genres}`, // 💡 스포티파이 데이터로 구성
        imageUrl:
          spotifyData.images?.[0]?.url ||
          "https://via.placeholder.com/300?text=No+Photo",
      };
    } else if (trackData && trackData.results.length > 0) {
      // 스포티파이 키가 없거나 검색 실패 시 iTunes 음원 사진으로 대체
      const topHit = trackData.results[0];
      state.artistProfile = {
        name: topHit.artistName,
        bio: "스포티파이 API 키를 상단에 입력하면 더 정확한 정보가 표시됩니다.",
        imageUrl: topHit.artworkUrl100
          ? topHit.artworkUrl100.replace("100x100bb", "400x400bb")
          : "https://via.placeholder.com/300?text=No+Photo",
      };
    }

    // (B) 앨범 데이터 가공
    if (albumData && albumData.results) {
      state.searchAlbums = albumData.results.map((item) => ({
        title: item.collectionName,
        artist: item.artistName,
        coverUrl: item.artworkUrl100
          ? item.artworkUrl100.replace("100x100bb", "300x300bb")
          : "https://via.placeholder.com/300?text=No+Cover",
        releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : "",
      }));
    }

    // (C) 음원 데이터 가공
    if (trackData && trackData.results) {
      state.searchResults = trackData.results.map((item) => ({
        title: item.trackName || "제목 없음",
        artist: item.artistName || "알 수 없는 아티스트",
        coverUrl: item.artworkUrl100
          ? item.artworkUrl100.replace("100x100bb", "300x300bb")
          : "https://via.placeholder.com/300?text=No+Cover",
        previewUrl: item.previewUrl || null,
      }));
    }

    if (state.searchResults.length === 0 && state.searchAlbums.length === 0) {
      alert(`'${keyword}'에 대한 검색 결과가 없습니다.`);
    }
  } catch (error) {
    console.error("검색 실패 상세 오류:", error);
    alert("검색 중 오류가 발생했습니다.");
  } finally {
    state.isSearching = false;
    render();
  }
}

// --- 5. 렌더링 함수들 ---
function visibleTracks() {
  return state.expanded ? tracks : tracks.slice(0, 4);
}
function currentTrack() {
  return state.nowPlaying
    ? state.nowPlaying
    : state.index >= 0
      ? tracks[state.index]
      : null;
}

function play(index) {
  state.index = index;
  state.paused = false;
  state.sheet = null;
  state.nowPlaying = null;
  audioPlayer.pause();
  render();
}

function renderDelta(track) {
  if (track.delta === "up")
    return `<span class="delta up"><span class="mark">▴</span>${track.amount}</span>`;
  if (track.delta === "down")
    return `<span class="delta down"><span class="mark">▾</span>${track.amount}</span>`;
  return `<span class="delta"><span class="mark">-</span></span>`;
}

function trackButton(track, index) {
  const on = state.index === index && !state.nowPlaying ? " is-on" : "";
  return `<button class="track${on}" data-action="play" data-index="${index}"><span class="cover" style="background:${track.color}"></span><span class="rank"><b>${index + 1}</b>${renderDelta(track)}</span><span class="meta"><strong>${track.title}</strong><em>${track.artist}</em></span></button>`;
}

function searchTrackButton(track, index) {
  const isPlayingNow = state.nowPlaying === track;
  const highlightColor = isPlayingNow ? "#f7f7f7" : "transparent";

  return `
    <button class="track" data-action="play-search" data-index="${index}" style="padding-left: 10px; background-color: ${highlightColor};">
      <img class="cover" src="${track.coverUrl}" alt="" style="object-fit: cover;" />
      <span class="meta" style="margin-left: 12px;"><strong>${track.title}</strong><em>${track.artist}</em></span>
      ${track.previewUrl ? (isPlayingNow && !state.paused ? '<span style="margin-left:auto; font-size:12px; color:#141414; font-weight:600;">재생중</span>' : '<span style="margin-left:auto; font-size:12px; color:#d14766; font-weight:600;">미리듣기</span>') : ""}
    </button>`;
}

function homeScreen() {
  if (state.chip !== "홈")
    return `<section class="page"><h1>${state.chip}</h1><div class="empty-list">${tracks
      .slice(0, 4)
      .map(
        (t, i) =>
          `<button class="row" data-action="play" data-index="${i}">${t.title}</button>`,
      )
      .join("")}</div></section>`;
  const cards = labels
    .map(
      (card, index) =>
        `<button class="card" data-action="label" data-index="${index}"><span class="card-cover" style="background:${card.color}"></span><span class="card-copy">${card.title.replace("\n", "<br />")}</span><span class="byline"><img src="assets/ellipse.svg" width="11" height="11" alt="" />${card.by}</span></button>`,
    )
    .join("");
  return `<div class="promo-row"><button class="promo fast" data-action="promo" data-id="fast"><h2>고민없는 빠른선곡</h2><p>내 취향 기반 추천!<br />바로 듣기</p></button><button class="promo time" data-action="promo" data-id="time"><h2>타임머신</h2><p>애정했던<br />추억의 플레이리스트</p></button></div><section class="section"><div class="section-head"><button data-action="chart"><h2>지니차트 <span>TOP 200</span> &gt;</h2></button></div><div class="track-list">${visibleTracks().map(trackButton).join("")}</div>${state.expanded ? "" : `<button class="more" data-action="more">더보기</button>`}</section><section class="label-block"><button class="plain-title" data-action="labels">레이블 PICK &gt;</button><div class="cards">${cards}</div></section>`;
}

function listScreen() {
  const list = state.screen === "label" ? tracks.slice(0, 5) : tracks;
  return `<section class="page"><button class="back" data-action="back">‹ 홈</button><h1>${state.screenTitle}</h1><div class="track-list">${list.map((track) => trackButton(track, tracks.indexOf(track))).join("")}</div></section>`;
}

function searchScreen() {
  const profileHtml =
    state.artistProfile && !state.isSearching
      ? `<div style="margin-bottom: 24px; padding: 16px; background: #fff; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); border: 1px solid #f0f0f0;">
         <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
           <img src="${state.artistProfile.imageUrl}" alt="" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
           <div style="flex: 1;">
             <div style="font-size: 18px; font-weight: 700; color: #141414; margin-bottom: 4px;">${state.artistProfile.name}</div>
             <div style="font-size: 13px; color: #888;">아티스트</div>
           </div>
           <button style="padding: 8px 16px; border-radius: 20px; background: #141414; color: #fff; font-size: 12px; font-weight: 600;">팔로우</button>
         </div>
         <p style="font-size: 13px; color: #1ed760; font-weight: 600; line-height: 1.5; margin: 0;">
           ${state.artistProfile.bio} <!-- 줄글 대신 팔로워 수와 장르가 들어감 -->
         </p>
       </div>`
      : "";

  const albumsHtml =
    state.searchAlbums.length > 0 && !state.isSearching
      ? `<div style="margin-bottom: 24px;">
         <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 4px;">발매 앨범</h3>
         <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;">
           ${state.searchAlbums
             .map(
               (album) => `
             <div style="flex: none; width: 110px; text-align: left;">
               <img src="${album.coverUrl}" style="width: 110px; height: 110px; border-radius: 8px; object-fit: cover; margin-bottom: 8px; border: 1px solid #f0f0f0;" />
               <div style="font-size: 13px; font-weight: 600; color: #141414; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${album.title}</div>
               <div style="font-size: 11px; color: #888; margin-top: 2px;">${album.releaseYear}</div>
             </div>
           `,
             )
             .join("")}
         </div>
       </div>`
      : "";

  const resultsHtml = state.isSearching
    ? `<div style="padding: 60px 0; text-align: center; color: #888; font-size: 14px;">데이터를 불러오는 중입니다...</div>`
    : state.searchResults.length > 0
      ? `<div style="margin-bottom: 24px;">
           <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 4px;">인기곡 (30초 듣기)</h3>
           <div class="track-list">${state.searchResults.map(searchTrackButton).join("")}</div>
         </div>`
      : !state.artistProfile
        ? `<div class="empty-list">${tabCopy.search.map((row) => `<div class="row">${row}</div>`).join("")}</div>`
        : "";

  return `
    <section class="page" style="padding-bottom: 100px;">
      <h1>검색</h1>
      <div style="display: flex; gap: 8px; margin-bottom: 24px;">
        <input type="text" id="search-input" value="${state.searchQuery}" placeholder="가수 검색 (예: 실리카겔, NewJeans)" 
               style="flex: 1; height: 44px; padding: 0 16px; border-radius: 12px; border: none; background: #f0f0f0; font-size: 15px; outline: none;" />
        <button data-action="do-search" style="width: 64px; height: 44px; border-radius: 12px; background: #121212; color: #fff; font-weight: 600;">검색</button>
      </div>
      ${profileHtml}
      ${albumsHtml}
      ${resultsHtml}
    </section>`;
}

function tabScreen() {
  const rows = tabCopy[state.tab] || [];
  return `<section class="page"><h1>${tabs.find((tab) => tab.id === state.tab).label}</h1><div class="empty-list">${rows.map((row) => `<div class="row">${row}</div>`).join("")}</div></section>`;
}

function sheet() {
  if (state.sheet === "pass")
    return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-stop><h3>이용권</h3><p>광고 없이 고음질로 들을 수 있습니다.</p><button class="close" data-action="close-sheet">닫기</button></div></div>`;
  if (state.sheet === "queue")
    return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-stop><h3>재생목록</h3>${tracks.map((t, i) => `<button class="queue-item${state.index === i ? " is-on" : ""}" data-action="play" data-index="${i}"><span class="swatch" style="background:${t.color}"></span><strong>${t.title}</strong></button>`).join("")}</div></div>`;
  return "";
}

function miniPlayer() {
  const track = currentTrack();
  if (!track) return "";
  return `
    <div class="mini">
      <div class="now"><strong>${track.title}</strong><span>${track.artist}</span></div>
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
  let body;
  if (state.tab === "search") body = searchScreen();
  else if (state.tab === "home")
    body = state.screen === "home" ? homeScreen() : listScreen();
  else body = tabScreen();

  app.innerHTML = `
    <div class="status"><img class="notch" src="assets/notch.svg" width="172" height="32" alt="" /><div class="time">9:41</div><div class="status-right"><img src="assets/signal.svg" width="18" height="12" alt="" /><img src="assets/wifi.svg" width="17" height="11.8339" alt="" /><img src="assets/battery.svg" width="27.4012" height="13" alt="" /></div></div>
    <header class="header"><button class="logo" data-action="logo" aria-label="지니 홈"><img src="assets/logo.png" alt="genie" /></button><div class="header-right"><button class="pass" data-action="pass">이용권</button><button class="avatar" data-action="profile"><img src="assets/user.svg" width="24" height="24" alt="" /></button></div></header>
    ${showChips ? `<nav class="chips"><div class="chip-row">${state.chips.map((c) => `<button class="chip${c === state.chip ? " is-on" : ""}" data-action="chip" data-chip="${c}">${c}</button>`).join("")}</div><button class="chip-add" data-action="add-chip">+</button></nav>` : ""}
    <main class="main">${body}</main>
    <div class="dock">
      ${miniPlayer()}
      <nav class="tabs">${tabs.map((tab) => `<button class="tab${state.tab === tab.id ? " is-on" : ""}" data-action="tab" data-tab="${tab.id}"><img src="${tab.icon}" width="24" height="24" alt="" />${tab.label}</button>`).join("")}</nav>
      <div class="home-indicator"><span></span></div>
    </div>
    ${sheet()}
  `;
}

// --- 6. 이벤트 핸들러 ---
app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || !app.contains(target)) return;
  const action = target.dataset.action;

  if (
    action === "close-sheet" &&
    event.target !== target &&
    !target.classList.contains("close")
  )
    return;
  if (action === "chip") {
    state.chip = target.dataset.chip;
    state.screen = "home";
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
    state.screenTitle = "차트";
    state.expanded = true;
  } else if (action === "back" || action === "logo") {
    state.tab = "home";
    state.chip = "홈";
    state.screen = "home";
  } else if (action === "close-sheet") {
    state.sheet = null;
  }

  // 오디오 및 검색 제어
  else if (action === "do-search") {
    const input = document.getElementById("search-input");
    if (input) performSearch(input.value);
    return;
  } else if (action === "play-search") {
    const track = state.searchResults[Number(target.dataset.index)];
    if (track && track.previewUrl) {
      if (state.nowPlaying === track && !audioPlayer.paused) {
        audioPlayer.pause();
        state.paused = true;
      } else {
        state.nowPlaying = track;
        if (audioPlayer.src !== track.previewUrl)
          audioPlayer.src = track.previewUrl;
        audioPlayer.play();
        state.paused = false;
      }
    } else {
      alert("이 곡은 30초 미리듣기를 제공하지 않습니다.");
    }
  } else if (action === "toggle") {
    if (state.nowPlaying) {
      if (audioPlayer.paused) {
        audioPlayer.play();
        state.paused = false;
      } else {
        audioPlayer.pause();
        state.paused = true;
      }
    } else {
      if (state.index < 0) play(0);
      else state.paused = !state.paused;
    }
  } else if (action === "prev" || action === "next") {
    if (state.nowPlaying) return;
    if (state.index < 0) play(0);
    else if (action === "prev")
      play((state.index - 1 + tracks.length) % tracks.length);
    else play((state.index + 1) % tracks.length);
    return;
  }
  render();
});

app.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.id === "search-input") {
    performSearch(event.target.value);
  }
});

render();
