// --- 0. 스포티파이 API 키 설정 (이곳에 발급받은 키를 입력하세요!) ---
const SPOTIFY_CLIENT_ID = "182a10309bc24e42b37bbbfa82508fb3";
const SPOTIFY_CLIENT_SECRET = "54adebc854f54ed89620c369fa6eab29";
let spotifyAccessToken = ""; // 토큰 캐싱용 변수

// --- 1. 더미 데이터 및 초기 설정 ---
const tracks = [
  {
    title: "퇴사할게여 (Narr. 기안84)",
    artist: "소연 (SOYEON)",
    cover: "assets/cover1.png",
    color: "#e8a1bf",
    delta: "same",
  },
  {
    title: "LOVE ATTACK",
    artist: "RESCENE (리센느)",
    cover: "assets/cover2.png",
    color: "#5ec7e8",
    delta: "up",
    amount: 3,
  },
  {
    title: "갑자기",
    artist: "아이오아이 (I.O.I)",
    cover: "assets/cover3.png",
    color: "#38738c",
    delta: "up",
    amount: 17,
  },
  {
    title: "REDRED",
    artist: "CORTIS (코르티스)",
    cover: "assets/cover4.png",
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
    cover: "assets/lcard1.png",
    color: "#408c73",
    title: "서로의 하모니로 완성된\n2000년대 듀엣곡",
    by: "지플리",
  },
  {
    cover: "assets/lcard1.png",
    color: "#e9c04f",
    title: "서로의 하모니로 완성된\n2000년대 듀엣곡",
    by: "지플리",
  },
  {
    cover: "assets/lcard1.png",
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

// --- 플레이리스트 데이터 (Figma UI 매핑) ---
const defaultPlaylistSongs = [
  { id: 1, title: "unseen dancer (feat. Tomomi O...)", artist: "KTRXJ", color: "#6bbba6", addedAt: 1 },
  { id: 2, title: "DanceWith2900", artist: "Mellow Morning", color: "#8c1d40", addedAt: 2 },
  { id: 3, title: "Night Breeze & City Lights", artist: "Lucid Blue", color: "#5ec7e8", addedAt: 3 },
  { id: 4, title: "Supernova", artist: "aespa", color: "#6b4c7a", addedAt: 4 },
  { id: 5, title: "Magnetic", artist: "ILLIT", color: "#7eb6d9", addedAt: 5 },
  { id: 6, title: "밤양갱", artist: "비비 (BIBI)", color: "#f2a7c3", addedAt: 6 },
  { id: 7, title: "LOVE ATTACK", artist: "RESCENE (리센느)", color: "#5ec7e8", addedAt: 7 },
  { id: 8, title: "퇴사할게여 (Narr. 기안84)", artist: "소연 (SOYEON)", color: "#e8a1bf", addedAt: 8 },
  { id: 9, title: "스물다섯에 상장하는 50", artist: "아일", color: "#c4b5a0", addedAt: 9 },
  { id: 10, title: "갑자기", artist: "아이오아이 (I.O.I)", color: "#38738c", addedAt: 10 },
  { id: 11, title: "REDRED", artist: "CORTIS (코르티스)", color: "#2b3b4a", addedAt: 11 },
  { id: 12, title: "Lemon Drop", artist: "Sunrays", color: "#f7d070", addedAt: 12 },
  { id: 13, title: "Midsummer Night", artist: "Ocean Wave", color: "#408c73", addedAt: 13 },
  { id: 14, title: "Rainy Cafe", artist: "Piano Mood", color: "#9a8c98", addedAt: 14 },
  { id: 15, title: "Sunset Drive", artist: "Cruiser", color: "#f0a07c", addedAt: 15 },
  { id: 16, title: "Daydreaming", artist: "Luna", color: "#e96ea8", addedAt: 16 },
  { id: 17, title: "Coffee & Books", artist: "Quiet Room", color: "#b08968", addedAt: 17 },
  { id: 18, title: "Starlight Echo", artist: "Cosmos", color: "#4361ee", addedAt: 18 },
  { id: 19, title: "Morning Walk", artist: "Green Park", color: "#67c250", addedAt: 19 },
  { id: 20, title: "Dreamer's Waltz", artist: "Aria", color: "#7209b7", addedAt: 20 },
];

let myPlaylists = [
  {
    id: "pl1",
    title: "요즘 듣는 플리",
    sub: "총 20곡",
    time: "1시간",
    color: "#6bbba6",
    tracks: [...defaultPlaylistSongs],
  },
  {
    id: "pl2",
    title: "기분 좋은",
    sub: "15곡",
    time: "48분",
    color: "#f0a07c",
    tracks: defaultPlaylistSongs.slice(0, 15),
  },
  {
    id: "pl3",
    title: "비 오는 플리",
    sub: "총 8곡",
    time: "26분",
    color: "#e96ea8",
    tracks: defaultPlaylistSongs.slice(3, 11),
  },
  {
    id: "pl4",
    title: "7018.07.15",
    sub: "총 31곡",
    time: "1시간 40분",
    color: "#8c1d40",
    tracks: defaultPlaylistSongs.slice(0, 10),
  },
  {
    id: "pl5",
    title: "드라이브 신나는 음악",
    sub: "50곡",
    time: "2시간 30분",
    color: "#67c250",
    tracks: defaultPlaylistSongs.slice(0, 12),
  },
];

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
  chips: ["홈", "Dolby", "고음질 전용관", "DJ", "매거진"],
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

  // 내음악 & 플레이리스트 상태
  libraryView: "main", // "main" | "detail" | "search" | "edit"
  currentPlaylistId: "pl1",
  sortOrder: "recent", // "default" | "artist" | "title" | "recent"
  sortOrderLabel: "편집순",
  showSortSheet: false,
  sortTarget: "playlist", // "playlist" | "queue"
  selectedSongIds: [],
  playlistSearchQuery: "",

  // 재생목록 상태
  showQueue: false,
  queueTab: "queue", // "queue" | "my" | "fast" | "external" | "hires"
  queueEdit: false,
  selectedQueueIds: [],
  queueSearchQuery: "",
  queueShowSearch: false,
  queueSortLabel: "순서정렬",
  queueSortOrder: "default",
  queueTracks: [],
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
      : { title: "스물다섯, 스물하나", artist: "자우림" };
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
  const coverHtml = track.cover
    ? `<img class="cover" src="${track.cover}" alt="${track.title}" />`
    : `<span class="cover" style="background:${track.color}"></span>`;
  return `<button class="track${on}" data-action="play" data-index="${index}">${coverHtml}<span class="rank"><b>${index + 1}</b>${renderDelta(track)}</span><span class="meta"><strong>${track.title}</strong><em>${track.artist}</em></span></button>`;
}

function searchTrackButton(track, index) {
  const isPlayingNow = state.nowPlaying === track;
  const highlightColor = isPlayingNow ? "#f7f7f7" : "transparent";

  return `
    <button class="track" data-action="play-search" data-index="${index}" style="padding-left: 10px; background-color: ${highlightColor};">
      <img class="cover" src="${track.coverUrl}" alt="" style="object-fit: cover;" />
      <span class="meta" style="margin-left: 12px;"><strong>${track.title}</strong><em>${track.artist}</em></span>
      ${track.previewUrl
      ? (isPlayingNow && !state.paused
        ? '<span style="margin-left:auto; font-size:16px; color:#141414; padding-right:10px;">❚❚</span>'
        : '<span style="margin-left:auto; font-size:16px; color:#141414; padding-right:10px;">▶</span>')
      : ""}
    </button>`;
}

function renderCard(card, index, type) {
  const coverHtml = card.cover
    ? `<img class="card-cover" src="${card.cover}" alt="" />`
    : `<span class="card-cover" style="background:${card.color}"></span>`;
  return `
    <button class="card" data-action="${type}" data-index="${index}">
      ${coverHtml}
      <span class="card-copy">${card.title.replace("\n", "<br />")}</span>
      <span class="byline">
        <img src="assets/ellipse.svg" width="11" height="11" alt="" />
        ${card.by}
      </span>
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

  const labelCards = labels.map((c, i) => renderCard(c, i, "label")).join("");
  const magazineCards = labels.map((c, i) => renderCard(c, i, "magazine")).join("");

  return `
    <div class="promo-section">
      <div class="promo-banner-wrap">
        <img src="assets/promorow.png" alt="프로모션" class="promo-banner-img" />
        <button class="promo-hotspot left" data-action="promo" data-id="fast" aria-label="고민없는 빠른선곡"></button>
        <button class="promo-hotspot right" data-action="promo" data-id="time" aria-label="타임머신"></button>
      </div>
    </div>
    <section class="section">
      <div class="section-head">
        <button data-action="chart"><h2>지니차트 <span>TOP 200</span> &gt;</h2></button>
        <button class="listen-all" data-action="listen-all">전체듣기</button>
      </div>
      <div class="track-list">${visibleTracks().map(trackButton).join("")}</div>
      ${state.expanded ? "" : `<button class="more" data-action="more">더보기</button>`}
    </section>
    <section class="label-block">
      <div class="section-head">
        <button class="plain-title" data-action="labels">레이블 PICK &gt;</button>
      </div>
      <div class="cards">${labelCards}</div>
    </section>
    <section class="label-block magazine-block">
      <div class="section-head">
        <button class="plain-title" data-action="magazines">매거진 &gt;</button>
      </div>
      <div class="cards">${magazineCards}</div>
    </section>`;
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

// --- 내음악(Library) 도우미 함수 ---
function getCurrentPlaylist() {
  return myPlaylists.find((p) => p.id === state.currentPlaylistId) || myPlaylists[0];
}

function getSortedTracks(songList, sortOrder) {
  const list = [...songList];
  if (sortOrder === "artist") {
    return list.sort((a, b) => a.artist.localeCompare(b.artist, "ko"));
  }
  if (sortOrder === "title") {
    return list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }
  if (sortOrder === "recent") {
    return list.sort((a, b) => b.id - a.id);
  }
  return list; // default
}

// 1. 내음악 메인 화면
function libraryMainScreen() {
  const plCards = myPlaylists
    .map(
      (pl) => `
      <div class="lib-playlist-item" data-action="open-playlist" data-id="${pl.id}">
        <div class="lib-pl-thumb" style="background:${pl.color}"></div>
        <div class="lib-pl-info">
          <div class="lib-pl-title">${pl.title}</div>
          <div class="lib-pl-sub">${pl.sub}</div>
        </div>
        <div class="lib-pl-actions">
          <button class="lib-pl-play-btn" data-action="play-playlist" data-id="${pl.id}" title="재생">▶</button>
          <button class="lib-pl-more-btn" data-action="pl-more" data-id="${pl.id}">⋮</button>
        </div>
      </div>`,
    )
    .join("");

  return `
    <div class="lib-page">
      <div class="lib-header">
        <h1>내음악</h1>
        <div class="lib-header-right">
          <button class="lib-pass-btn" data-action="pass">이용권</button>
        </div>
      </div>

      <div class="lib-quick-grid">
        <button class="lib-quick-card" data-action="quick-menu" data-type="like">
          <span class="icon">♡</span>
          <span>좋아요</span>
        </button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="album">
          <span class="icon">♬</span>
          <span>내 앨범</span>
        </button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="recent">
          <span class="icon">🕒</span>
          <span>최근들은곡</span>
        </button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="mag">
          <span class="icon">📰</span>
          <span>MY 매거진</span>
        </button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="dj">
          <span class="icon">👤</span>
          <span>구독 DJ</span>
        </button>
      </div>

      <div class="lib-section-head">
        <h2>내 플레이리스트</h2>
      </div>

      <div class="lib-meta-row">
        <span class="lib-count-badge">전체 <span>${myPlaylists.length}</span></span>
        <div class="lib-filter-controls">
          <button class="lib-sort-btn" data-action="open-sort-sheet">${state.sortOrderLabel} ▾</button>
          <span>|</span>
          <button class="lib-edit-btn" data-action="open-edit-mode">편집</button>
        </div>
      </div>

      <div class="lib-actions-row">
        <button class="lib-action-btn" data-action="new-playlist">+ 새로 만들기</button>
        <button class="lib-action-btn" data-action="smart-add-songs">+ 다이나믹 곡 추가</button>
      </div>

      <div class="lib-playlist-list">
        ${plCards}
      </div>
    </div>`;
}

// 2. 플레이리스트 상세 화면
function playlistDetailScreen() {
  const pl = getCurrentPlaylist();
  const sortedTracks = getSortedTracks(pl.tracks, state.sortOrder);
  const trackItems = sortedTracks
    .map((track) => {
      const isCurrent = state.nowPlaying?.title === track.title;
      return `
        <div class="pld-song-item${isCurrent ? " is-playing" : ""}">
          <div class="pld-song-thumb" style="background:${track.color}"></div>
          <div class="pld-song-info" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}">
            <div class="pld-song-title">${track.title}</div>
            <div class="pld-song-artist">${track.artist}</div>
          </div>
          <div class="pld-song-actions">
            <button class="lib-pl-play-btn" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}">▶</button>
            <button class="lib-pl-more-btn" data-action="song-more">⋮</button>
          </div>
        </div>`;
    })
    .join("");

  return `
    <div class="pld-page">
      <div class="pld-top-bar">
        <button class="pld-back-btn" data-action="lib-back">‹</button>
        <button class="lib-pl-more-btn" data-action="pl-more" data-id="${pl.id}">⋮</button>
      </div>

      <div class="pld-hero">
        <div class="pld-hero-thumb" style="background:${pl.color}"></div>
        <div class="pld-hero-title">${pl.title}</div>
        <div class="pld-hero-sub">수록곡 ${pl.tracks.length}곡 • ${pl.time}</div>
        <button class="pld-play-all-btn" data-action="play-playlist-all">▶ 전체듣기</button>
      </div>

      <div class="pld-songs-sec">
        <div class="pld-songs-head">
          <div class="pld-songs-count">수록곡 <span>${pl.tracks.length}곡</span></div>
          <div class="pld-songs-actions">
            <button data-action="add-song-to-pl">+ 곡추가</button>
            <span>|</span>
            <button data-action="open-edit-mode">편집</button>
          </div>
        </div>

        <div class="pld-search-bar" data-action="open-playlist-search">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="이 리스트에서 찾기" readonly />
        </div>

        <div class="pld-ctrl-row">
          <div class="pld-ctrl-left">
            <button class="pld-ctrl-btn" data-action="open-edit-mode">✓ 전체선택</button>
            <button class="pld-ctrl-btn" data-action="play-playlist-all">▶ 전체듣기</button>
          </div>
          <div class="pld-ctrl-right">
            <button class="pld-ctrl-btn" data-action="open-sort-sheet">${state.sortOrderLabel} ▾</button>
            <button class="pld-ctrl-btn" data-action="open-edit-mode">편집</button>
          </div>
        </div>

        <div class="pld-song-list">
          ${trackItems}
        </div>
      </div>
    </div>`;
}

// 3. 정렬 순 바텀시트
function sortBottomSheet() {
  if (!state.showSortSheet) return "";
  const options = [
    { id: "default", label: "기본순" },
    { id: "artist", label: "아티스트 순" },
    { id: "title", label: "곡 제목 순" },
    { id: "recent", label: "최근 추가 순" },
  ];

  return `
    <div class="sort-sheet-back" data-action="close-sort-sheet">
      <div class="sort-sheet" data-stop>
        <div class="sort-handle"></div>
        <div class="sort-sheet-title">정렬 순</div>
        <div class="sort-opt-list">
          ${options
      .map(
        (opt) => `
            <div class="sort-opt-item${state.sortOrder === opt.id ? " is-selected" : ""}" data-action="select-sort-order" data-id="${opt.id}" data-label="${opt.label}">
              <span>${opt.label}</span>
              ${state.sortOrder === opt.id ? '<span class="sort-opt-check">↑</span>' : ""}
            </div>`,
      )
      .join("")}
        </div>
        <button class="sort-cancel-btn" data-action="close-sort-sheet">취소</button>
      </div>
    </div>`;
}

// 4. 플레이리스트 내 검색 화면
function playlistSearchScreen() {
  const pl = getCurrentPlaylist();
  const q = state.playlistSearchQuery.trim().toLowerCase();
  const filtered = q
    ? pl.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    )
    : pl.tracks.slice(0, 3);

  const listItems = filtered
    .map(
      (track) => `
      <div class="pld-song-item">
        <div class="pld-song-thumb" style="background:${track.color}"></div>
        <div class="pld-song-info" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}">
          <div class="pld-song-title">${track.title}</div>
          <div class="pld-song-artist">${track.artist}</div>
        </div>
        <div class="pld-song-actions">
          <button class="lib-pl-play-btn" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}">▶</button>
          <button class="lib-pl-more-btn">⋮</button>
        </div>
      </div>`,
    )
    .join("");

  return `
    <div class="pld-search-view">
      <div class="pld-search-header">
        <button class="pld-back-btn" data-action="close-playlist-search">‹</button>
        <div class="pld-search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="pld-search-input" value="${state.playlistSearchQuery}" placeholder="이 리스트에서 찾기" />
          ${state.playlistSearchQuery ? '<button class="pld-search-clear" data-action="clear-pld-search">✕</button>' : ""}
        </div>
      </div>

      <div class="pld-song-list">
        ${listItems}
      </div>

      <div class="keyboard-placeholder">
        자판
      </div>
    </div>`;
}

// 5. 플레이리스트 편집 화면
function playlistEditScreen() {
  const pl = getCurrentPlaylist();
  const selectedCount = state.selectedSongIds.length;
  const isAllSelected = pl.tracks.length > 0 && selectedCount === pl.tracks.length;

  const editItems = pl.tracks
    .map((track) => {
      const isChecked = state.selectedSongIds.includes(track.id);
      return `
        <div class="pld-edit-item" data-action="toggle-song-select" data-id="${track.id}">
          <div class="pld-checkbox${isChecked ? " is-checked" : ""}"></div>
          <div class="pld-song-thumb" style="background:${track.color}"></div>
          <div class="pld-song-info">
            <div class="pld-song-title">${track.title}</div>
            <div class="pld-song-artist">${track.artist}</div>
          </div>
          <div class="pld-drag-handle" data-action="drag-song" data-id="${track.id}">≡</div>
        </div>`;
    })
    .join("");

  return `
    <div class="pld-edit-view">
      <div class="pld-edit-top-bar">
        <button class="pld-edit-close" data-action="close-edit-mode">✕</button>
        <h2>플레이리스트 편집</h2>
        <div style="width:24px;"></div>
      </div>

      <div class="pld-search-bar" data-action="open-playlist-search">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="이 리스트에서 찾기" readonly />
      </div>

      <div class="pld-ctrl-row" style="margin-bottom: 8px;">
        <button class="pld-ctrl-btn" data-action="toggle-select-all">
          <div class="pld-checkbox${isAllSelected ? " is-checked" : ""}" style="margin-right: 4px;"></div>
          전체선택 ${selectedCount > 0 ? `(${selectedCount})` : ""}
        </button>
        <button class="pld-ctrl-btn" data-action="open-sort-sheet">순서변경 ▾</button>
      </div>

      <div class="pld-song-list">
        ${editItems}
      </div>
    </div>`;
}

// 6. 재생목록 화면 (Figma 190:1353)
function queueScreen() {
  let listTracks = state.queueTracks;
  if (state.queueTab === "my") listTracks = tracks;
  else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
  else if (state.queueTab === "external") listTracks = defaultPlaylistSongs.slice(5, 15);
  else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);

  if (state.queueSearchQuery.trim()) {
    const q = state.queueSearchQuery.trim().toLowerCase();
    listTracks = listTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q)
    );
  }

  const selectedCount = state.selectedQueueIds.length;
  const isAllSelected = listTracks.length > 0 && selectedCount === listTracks.length;
  const current = currentTrack();

  return `
    <div class="queue-container">
      <div class="status">
        <img class="notch" src="assets/notch.svg" width="172" height="32" alt="" />
        <div class="time">9:41</div>
        <div class="status-right">
          <img src="assets/signal.svg" width="18" height="12" alt="" />
          <img src="assets/wifi.svg" width="17" height="11.8339" alt="" />
          <img src="assets/battery.svg" width="27.4012" height="13" alt="" />
        </div>
      </div>

      <div class="queue-header">
        <div class="queue-header-top">
          <button class="queue-btn-x" data-action="close-queue" aria-label="닫기">
            <img src="assets/queue_x.png" width="24" height="24" alt="닫기" />
          </button>
          <h1 class="queue-header-title">재생목록</h1>
          <button class="queue-btn-search" data-action="queue-toggle-search" aria-label="검색">
            <img src="assets/queue_search.svg" width="22" height="22" alt="검색" />
          </button>
        </div>

        <div class="queue-subtabs">
          <button class="queue-subtab${state.queueTab === "queue" ? " is-active" : ""}" data-action="queue-tab" data-tab="queue">재생목록</button>
          <button class="queue-subtab${state.queueTab === "my" ? " is-active" : ""}" data-action="queue-tab" data-tab="my">MY</button>
          <button class="queue-subtab${state.queueTab === "fast" ? " is-active" : ""}" data-action="queue-tab" data-tab="fast">빠른선곡</button>
          <button class="queue-subtab${state.queueTab === "external" ? " is-active" : ""}" data-action="queue-tab" data-tab="external">외부목록</button>
          <button class="queue-subtab${state.queueTab === "hires" ? " is-active" : ""}" data-action="queue-tab" data-tab="hires">
            고음질전용관
            <span class="queue-5g-badge">5G</span>
          </button>
        </div>
      </div>

      ${state.queueShowSearch ? `
        <div class="queue-search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="queue-search-input" value="${state.queueSearchQuery}" placeholder="재생목록에서 검색" />
          ${state.queueSearchQuery ? '<button class="pld-search-clear" data-action="clear-queue-search">✕</button>' : ""}
        </div>
      ` : ""}

      <div class="queue-ctrl-row">
        <div class="queue-ctrl-left">
          ${state.queueEdit ? `
            <button class="queue-select-all-btn" data-action="queue-toggle-select-all">
              <div class="pld-checkbox${isAllSelected ? " is-checked" : ""}" style="margin-right: 6px;"></div>
              <span>전체선택 ${selectedCount > 0 ? `(${selectedCount})` : ""}</span>
            </button>
          ` : `
            <span class="queue-total-label">전체</span>
            <span class="queue-total-count">${listTracks.length}</span>
          `}
        </div>

        <div class="queue-ctrl-right">
          <button class="queue-tool-btn" data-action="queue-toggle-edit">
            ${state.queueEdit ? "완료" : "편집"}
          </button>
          ${!state.queueEdit ? `
            <button class="queue-tool-btn" data-action="queue-open-sort">
              <span>${state.queueSortLabel}</span>
              <img src="assets/queue_chevron_down.svg" width="14" height="11" alt="" />
            </button>
            <button class="queue-tool-btn" data-action="queue-toggle-search">
              <img src="assets/queue_search.svg" width="15" height="15" alt="" />
            </button>
          ` : ""}
        </div>
      </div>

      <div class="queue-song-list">
        ${listTracks.map((track, idx) => {
    const trackId = track.id || (idx + 1);
    const isSelected = state.selectedQueueIds.includes(trackId);
    const isPlaying = current && current.title === track.title;
    const coverBg = track.cover ? `background-image:url(${track.cover}); background-size:cover;` : `background-color:${track.color || "#8CC7BF"};`;

    return `
            <div class="queue-song-item${isPlaying ? " is-playing" : ""}" data-action="${state.queueEdit ? "queue-toggle-select" : "queue-play-track"}" data-id="${trackId}" data-index="${idx}">
              ${state.queueEdit ? `
                <div class="pld-checkbox${isSelected ? " is-checked" : ""}"></div>
              ` : ""}
              <div class="queue-song-thumb" style="${coverBg}">
                ${isPlaying && !state.queueEdit ? '<div class="queue-play-badge">▶</div>' : ""}
              </div>
              <div class="queue-song-info">
                <div class="queue-song-title${isPlaying ? " is-playing-title" : ""}">${track.title}</div>
                <div class="queue-song-artist">${track.artist}</div>
              </div>
              ${state.queueEdit ? `
                <div class="pld-drag-handle" data-action="queue-drag" data-id="${trackId}">≡</div>
              ` : `
                <div class="queue-song-meta">
                  <span class="queue-song-time">${track.duration || "03:47"}</span>
                  <button class="queue-song-more" data-action="queue-track-more" data-id="${trackId}">⋮</button>
                </div>
              `}
            </div>`;
  }).join("")}
      </div>

      ${state.queueEdit ? `
        <div class="pld-edit-toolbar-wrap">
          ${selectedCount > 0 ? `<div class="pld-count-badge-floating">${selectedCount}</div>` : ""}
          <div class="pld-edit-toolbar">
            <button class="pld-tool-btn" data-action="queue-move-top">
              <span class="icon">↑</span>
              <span>맨위로</span>
            </button>
            <button class="pld-tool-btn" data-action="queue-move-up">
              <span class="icon">⮵</span>
              <span>위로</span>
            </button>
            <button class="pld-tool-btn" data-action="queue-move-down">
              <span class="icon">⮷</span>
              <span>아래로</span>
            </button>
            <button class="pld-tool-btn" data-action="queue-delete">
              <span class="icon">🗑</span>
              <span>삭제</span>
            </button>
            <button class="pld-tool-btn" data-action="queue-add-to">
              <span class="icon">＋</span>
              <span>담기</span>
            </button>
          </div>
          <div class="pld-edit-home-indicator"><span></span></div>
        </div>
      ` : `
        <div class="queue-player">
          <div class="queue-player-inner">
            <button class="queue-zap-btn" data-action="queue-zap" aria-label="빠른선곡">
              <img src="assets/queue_zap.svg" width="36" height="36" alt="zap" />
            </button>
            <div class="queue-player-ctrls">
              <button class="queue-ctrl-btn" data-action="prev" aria-label="이전">⏮</button>
              <button class="queue-ctrl-play" data-action="toggle" aria-label="${state.paused ? "재생" : "일시정지"}">
                ${state.paused ? "▶" : "❚❚"}
              </button>
              <button class="queue-ctrl-btn" data-action="next" aria-label="다음">⏭</button>
            </div>
            <div class="queue-player-thumb" style="${current && current.cover ? `background-image:url(${current.cover}); background-size:cover;` : `background-color:${current && current.color ? current.color : '#8CC7BF'};`}"></div>
          </div>
          <div class="home-indicator"><span></span></div>
        </div>
      `}
    </div>`;
}

function libraryScreen() {
  if (state.libraryView === "detail") return playlistDetailScreen();
  if (state.libraryView === "search") return playlistSearchScreen();
  if (state.libraryView === "edit") return playlistEditScreen();
  return libraryMainScreen();
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
  if (state.showQueue) {
    app.innerHTML = `
      ${queueScreen()}
      ${sheet()}
      ${sortBottomSheet()}
    `;
    return;
  }

  const showGlobalHeader = state.tab !== "library";
  const showChips = state.tab === "home" && state.screen === "home";
  const isEditing = state.tab === "library" && state.libraryView === "edit";
  const selectedCount = state.selectedSongIds.length;
  let body;
  if (state.tab === "search") body = searchScreen();
  else if (state.tab === "library") body = libraryScreen();
  else if (state.tab === "home")
    body = state.screen === "home" ? homeScreen() : listScreen();
  else body = tabScreen();

  app.innerHTML = `
    <div class="status"><img class="notch" src="assets/notch.svg" width="172" height="32" alt="" /><div class="time">9:41</div><div class="status-right"><img src="assets/signal.svg" width="18" height="12" alt="" /><img src="assets/wifi.svg" width="17" height="11.8339" alt="" /><img src="assets/battery.svg" width="27.4012" height="13" alt="" /></div></div>
    ${showGlobalHeader ? `<header class="header"><button class="logo" data-action="logo" aria-label="지니 홈"><img src="assets/image_1.png" alt="genie" /></button><div class="header-right"><button class="avatar" data-action="profile"><img src="assets/frame_14.png" width="32" height="32" alt="프로필" /></button><button class="pass" data-action="pass">이용권</button></div></header>` : ""}
    ${showChips ? `<nav class="chips"><div class="chip-row">${state.chips.map((c) => `<button class="chip${c === state.chip ? " is-on" : ""}" data-action="chip" data-chip="${c}">${c}</button>`).join("")}</div></nav>` : ""}
    <main class="main">${body}</main>
    ${isEditing
      ? `
      <div class="pld-edit-toolbar-wrap">
        ${selectedCount > 0 ? `<div class="pld-count-badge-floating">${selectedCount}</div>` : ""}
        <div class="pld-edit-toolbar">
          <button class="pld-tool-btn" data-action="edit-move-top">
            <span class="icon">↑</span>
            <span>맨위로</span>
          </button>
          <button class="pld-tool-btn" data-action="edit-move-up">
            <span class="icon">⮵</span>
            <span>위로</span>
          </button>
          <button class="pld-tool-btn" data-action="edit-move-down">
            <span class="icon">⮷</span>
            <span>아래로</span>
          </button>
          <button class="pld-tool-btn" data-action="edit-delete">
            <span class="icon">🗑</span>
            <span>삭제</span>
          </button>
          <button class="pld-tool-btn" data-action="edit-add-to">
            <span class="icon">＋</span>
            <span>담기</span>
          </button>
        </div>
        <div class="pld-edit-home-indicator"><span></span></div>
      </div>`
      : `<div class="dock">
      ${miniPlayer()}
      <nav class="tabs">${tabs.map((tab) => `<button class="tab${state.tab === tab.id ? " is-on" : ""}" data-action="tab" data-tab="${tab.id}"><img src="${tab.icon}" width="24" height="24" alt="" />${tab.label}</button>`).join("")}</nav>
      <div class="home-indicator"><span></span></div>
    </div>`
    }
    ${sheet()}
    ${sortBottomSheet()}
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

  // 탭 / 칩 전환
  if (action === "chip") {
    state.chip = target.dataset.chip;
    state.screen = "home";
  } else if (action === "tab") {
    state.tab = target.dataset.tab;
    state.screen = "home";
    state.chip = "홈";
    if (state.tab !== "library") {
      state.libraryView = "main";
    }
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
  } else if (action === "pass") {
    state.sheet = "pass";
  } else if (action === "close-sheet") {
    state.sheet = null;
  }

  // --- 재생목록 (Queue, Figma 190:1353) 액션 ---
  else if (action === "queue") {
    state.showQueue = true;
    state.queueTab = "queue";
    state.queueEdit = false;
    state.selectedQueueIds = [];
    state.queueShowSearch = false;
    state.queueSearchQuery = "";
    return render();
  } else if (action === "close-queue") {
    state.showQueue = false;
    state.queueEdit = false;
    state.selectedQueueIds = [];
    return render();
  } else if (action === "queue-tab") {
    state.queueTab = target.dataset.tab;
    state.queueEdit = false;
    state.selectedQueueIds = [];
    return render();
  } else if (action === "queue-toggle-search") {
    state.queueShowSearch = !state.queueShowSearch;
    if (!state.queueShowSearch) state.queueSearchQuery = "";
    render();
    if (state.queueShowSearch) {
      setTimeout(() => {
        const inp = document.getElementById("queue-search-input");
        if (inp) inp.focus();
      }, 50);
    }
    return;
  } else if (action === "clear-queue-search") {
    state.queueSearchQuery = "";
    return render();
  } else if (action === "queue-toggle-edit") {
    state.queueEdit = !state.queueEdit;
    state.selectedQueueIds = [];
    return render();
  } else if (action === "queue-open-sort") {
    state.showSortSheet = true;
    state.sortTarget = "queue";
    return render();
  } else if (action === "queue-play-track") {
    const idx = parseInt(target.dataset.index, 10);
    let listTracks = state.queueTracks;
    if (state.queueTab === "my") listTracks = tracks;
    else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
    else if (state.queueTab === "external") listTracks = defaultPlaylistSongs.slice(5, 15);
    else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);

    const song = listTracks[idx];
    if (song) {
      // 1. UI 상태 업데이트 (previewUrl 포함 전달)
      state.nowPlaying = {
        title: song.title,
        artist: song.artist,
        color: song.color,
        cover: song.cover,
        previewUrl: song.previewUrl // 👈 추가된 부분
      };

      // 2. 실제 오디오 재생 실행
      if (song.previewUrl) {
        if (audioPlayer.src !== song.previewUrl) {
          audioPlayer.src = song.previewUrl;
        }
        audioPlayer.play();
      } else {
        audioPlayer.pause(); // API 검색 곡이 아닌 기존 더미 데이터 곡 처리
      }

      state.paused = false;
    }
    return render();
  } else if (action === "queue-toggle-select") {
    const songId = Number(target.dataset.id);
    const pos = state.selectedQueueIds.indexOf(songId);
    if (pos > -1) {
      state.selectedQueueIds.splice(pos, 1);
    } else {
      state.selectedQueueIds.push(songId);
    }
    return render();
  } else if (action === "queue-toggle-select-all") {
    let listTracks = state.queueTracks;
    if (state.queueTab === "my") listTracks = tracks;
    else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
    else if (state.queueTab === "external") listTracks = defaultPlaylistSongs.slice(5, 15);
    else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);

    if (state.selectedQueueIds.length === listTracks.length) {
      state.selectedQueueIds = [];
    } else {
      state.selectedQueueIds = listTracks.map((t, i) => t.id || (i + 1));
    }
    return render();
  } else if (action === "queue-move-top") {
    if (state.selectedQueueIds.length > 0) {
      const selected = state.queueTracks.filter((t, i) => state.selectedQueueIds.includes(t.id || (i + 1)));
      const remaining = state.queueTracks.filter((t, i) => !state.selectedQueueIds.includes(t.id || (i + 1)));
      state.queueTracks = [...selected, ...remaining];
    }
    return render();
  } else if (action === "queue-move-up") {
    if (state.selectedQueueIds.length > 0) {
      for (let i = 1; i < state.queueTracks.length; i++) {
        const trackId = state.queueTracks[i].id || (i + 1);
        if (state.selectedQueueIds.includes(trackId)) {
          const prevId = state.queueTracks[i - 1].id || i;
          if (!state.selectedQueueIds.includes(prevId)) {
            const temp = state.queueTracks[i];
            state.queueTracks[i] = state.queueTracks[i - 1];
            state.queueTracks[i - 1] = temp;
          }
        }
      }
    }
    return render();
  } else if (action === "queue-move-down") {
    if (state.selectedQueueIds.length > 0) {
      for (let i = state.queueTracks.length - 2; i >= 0; i--) {
        const trackId = state.queueTracks[i].id || (i + 1);
        if (state.selectedQueueIds.includes(trackId)) {
          const nextId = state.queueTracks[i + 1].id || (i + 2);
          if (!state.selectedQueueIds.includes(nextId)) {
            const temp = state.queueTracks[i];
            state.queueTracks[i] = state.queueTracks[i + 1];
            state.queueTracks[i + 1] = temp;
          }
        }
      }
    }
    return render();
  } else if (action === "queue-delete") {
    if (state.selectedQueueIds.length > 0) {
      state.queueTracks = state.queueTracks.filter((t, i) => !state.selectedQueueIds.includes(t.id || (i + 1)));
      state.selectedQueueIds = [];
    }
    return render();
  } else if (action === "queue-add-to") {
    alert("선택한 곡이 보관함에 추가되었습니다.");
    state.queueEdit = false;
    state.selectedQueueIds = [];
    return render();
  } else if (action === "queue-zap") {
    const randomIdx = Math.floor(Math.random() * state.queueTracks.length);
    const song = state.queueTracks[randomIdx];
    if (song) {
      state.nowPlaying = { title: song.title, artist: song.artist, color: song.color, cover: song.cover };
      state.paused = false;
    }
    return render();
  }

  // --- 내음악 & 플레이리스트 액션 ---
  else if (action === "open-playlist") {
    state.currentPlaylistId = target.dataset.id;
    state.libraryView = "detail";
    state.selectedSongIds = [];
    state.playlistSearchQuery = "";
  } else if (action === "lib-back") {
    state.libraryView = "main";
    state.selectedSongIds = [];
    state.playlistSearchQuery = "";
  } else if (action === "open-sort-sheet") {
    state.showSortSheet = true;
    state.sortTarget = "playlist";
  } else if (action === "close-sort-sheet") {
    state.showSortSheet = false;
  } else if (action === "select-sort-order") {
    if (state.sortTarget === "queue") {
      state.queueSortOrder = target.dataset.id;
      state.queueSortLabel = target.dataset.label;
      const order = target.dataset.id;
      if (order === "artist") {
        state.queueTracks.sort((a, b) => a.artist.localeCompare(b.artist, "ko-KR"));
      } else if (order === "title") {
        state.queueTracks.sort((a, b) => a.title.localeCompare(b.title, "ko-KR"));
      } else if (order === "recent") {
        state.queueTracks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      } else {
        // state.queueTracks = [...defaultPlaylistSongs];
      }
    } else {
      state.sortOrder = target.dataset.id;
      state.sortOrderLabel = target.dataset.label;
    }
    state.showSortSheet = false;
  } else if (action === "open-playlist-search") {
    state.libraryView = "search";
    state.playlistSearchQuery = "";
    setTimeout(() => {
      const inp = document.getElementById("pld-search-input");
      if (inp) inp.focus();
    }, 50);
  } else if (action === "close-playlist-search") {
    state.libraryView = "detail";
    state.playlistSearchQuery = "";
  } else if (action === "clear-pld-search") {
    state.playlistSearchQuery = "";
  } else if (action === "open-edit-mode") {
    state.libraryView = "edit";
  } else if (action === "close-edit-mode") {
    state.libraryView = "detail";
    state.selectedSongIds = [];
  } else if (action === "toggle-song-select") {
    const songId = Number(target.dataset.id);
    const idx = state.selectedSongIds.indexOf(songId);
    if (idx > -1) {
      state.selectedSongIds.splice(idx, 1);
    } else {
      state.selectedSongIds.push(songId);
    }
  } else if (action === "toggle-select-all") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === pl.tracks.length) {
      state.selectedSongIds = [];
    } else {
      state.selectedSongIds = pl.tracks.map((t) => t.id);
    }
  } else if (action === "play-playlist") {
    const pl = myPlaylists.find((p) => p.id === target.dataset.id);
    if (pl && pl.tracks.length > 0) {
      const first = pl.tracks[0];
      state.nowPlaying = {
        title: first.title,
        artist: first.artist,
        color: first.color,
      };
      state.paused = false;
    }
    return render();
  } else if (action === "play-playlist-all") {
    const pl = getCurrentPlaylist();
    if (pl && pl.tracks.length > 0) {
      const first = pl.tracks[0];
      state.nowPlaying = {
        title: first.title,
        artist: first.artist,
        color: first.color,
      };
      state.paused = false;
    }
    return render();
  } else if (action === "play-custom") {
    const title = decodeURIComponent(target.dataset.title || "");
    const artist = decodeURIComponent(target.dataset.artist || "");
    const color = target.dataset.color || "#6bbba6";
    state.nowPlaying = { title, artist, color };
    state.paused = false;
    return render();
  } else if (action === "new-playlist") {
    const title = prompt("새 플레이리스트 제목을 입력하세요:", "새 플레이리스트");
    if (title && title.trim()) {
      const newId = "pl" + (myPlaylists.length + 1);
      myPlaylists.unshift({
        id: newId,
        title: title.trim(),
        sub: "총 0곡",
        time: "0분",
        color: "#6bbba6",
        tracks: [],
      });
      state.currentPlaylistId = newId;
      state.libraryView = "detail";
    }
  } else if (action === "smart-add-songs") {
    alert("AI 취향 기반 다이나믹 곡 추가가 활성화되었습니다!");
  } else if (action === "edit-move-top") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) {
      alert("이동할 곡을 선택해주세요.");
      return;
    }
    const selected = pl.tracks.filter((t) => state.selectedSongIds.includes(t.id));
    const unselected = pl.tracks.filter((t) => !state.selectedSongIds.includes(t.id));
    pl.tracks = [...selected, ...unselected];
  } else if (action === "edit-move-up") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) {
      alert("이동할 곡을 선택해주세요.");
      return;
    }
    for (let i = 1; i < pl.tracks.length; i++) {
      if (state.selectedSongIds.includes(pl.tracks[i].id) && !state.selectedSongIds.includes(pl.tracks[i - 1].id)) {
        const temp = pl.tracks[i];
        pl.tracks[i] = pl.tracks[i - 1];
        pl.tracks[i - 1] = temp;
      }
    }
  } else if (action === "edit-move-down") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) {
      alert("이동할 곡을 선택해주세요.");
      return;
    }
    for (let i = pl.tracks.length - 2; i >= 0; i--) {
      if (state.selectedSongIds.includes(pl.tracks[i].id) && !state.selectedSongIds.includes(pl.tracks[i + 1].id)) {
        const temp = pl.tracks[i];
        pl.tracks[i] = pl.tracks[i + 1];
        pl.tracks[i + 1] = temp;
      }
    }
  } else if (action === "edit-delete") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) {
      alert("삭제할 곡을 선택해주세요.");
      return;
    }
    if (confirm(`선택한 ${state.selectedSongIds.length}개 곡을 플레이리스트에서 삭제하시겠습니까?`)) {
      pl.tracks = pl.tracks.filter((t) => !state.selectedSongIds.includes(t.id));
      pl.sub = `총 ${pl.tracks.length}곡`;
      state.selectedSongIds = [];
    }
  } else if (action === "edit-add-to") {
    if (state.selectedSongIds.length === 0) {
      alert("담을 곡을 선택해주세요.");
      return;
    }
    alert(`선택한 ${state.selectedSongIds.length}개 곡을 보관함 또는 다른 플레이리스트에 담았습니다.`);
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

        // --- 재생목록(Queue) 최상단 자동 추가 로직 시작 ---
        const newTrack = {
          id: Date.now(),
          title: track.title,
          artist: track.artist,
          cover: track.coverUrl,
          previewUrl: track.previewUrl,
          color: "#2b3b4a",
          duration: "00:30",
          addedAt: Date.now()
        };

        // 1. 이미 같은 곡이 목록에 있다면 기존 위치에서 제거
        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) {
          state.queueTracks.splice(existingIdx, 1);
        }

        // 2. 무조건 배열의 맨 앞(최상단)에 추가
        state.queueTracks.unshift(newTrack);
        // --- 추가 로직 끝 ---
      }
    } else {
      alert("이 곡은 30초 미리듣기를 제공하지 않습니다.");
    }
  } else if (action === "toggle") {
    if (state.nowPlaying) {
      if (state.nowPlaying.previewUrl) {
        if (audioPlayer.paused) {
          audioPlayer.play();
          state.paused = false;
        } else {
          audioPlayer.pause();
          state.paused = true;
        }
      } else {
        state.paused = !state.paused;
      }
    } else {
      if (state.index < 0) play(0);
      else state.paused = !state.paused;
    }
  } else if (action === "prev" || action === "next") {
    // 1. 현재 재생목록 기준 배열 가져오기
    let listTracks = state.queueTracks;
    if (state.showQueue) {
      if (state.queueTab === "my") listTracks = tracks;
      else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
      else if (state.queueTab === "external") listTracks = defaultPlaylistSongs.slice(5, 15);
      else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);
    }

    if (listTracks.length === 0) return; // 목록이 비어있으면 무시

    // 2. 현재 재생 중인 곡의 인덱스 찾기
    let currentIdx = -1;
    if (state.nowPlaying) {
      currentIdx = listTracks.findIndex(t => t.title === state.nowPlaying.title && t.artist === state.nowPlaying.artist);
    }

    // 3. 이전/다음 곡 인덱스 계산 (루프 방식: 끝이면 처음으로, 처음이면 끝으로)
    let targetIdx = 0;
    if (currentIdx > -1) {
      if (action === "prev") {
        targetIdx = (currentIdx - 1 + listTracks.length) % listTracks.length;
      } else {
        targetIdx = (currentIdx + 1) % listTracks.length;
      }
    }

    const nextSong = listTracks[targetIdx];

    if (nextSong) {
      // 4. 상태 및 UI 업데이트 (previewUrl 반드시 포함)
      state.nowPlaying = {
        title: nextSong.title,
        artist: nextSong.artist,
        cover: nextSong.cover,
        color: nextSong.color,
        previewUrl: nextSong.previewUrl
      };

      // 5. 실제 오디오 변경 및 재생
      if (nextSong.previewUrl) {
        if (audioPlayer.src !== nextSong.previewUrl) {
          audioPlayer.src = nextSong.previewUrl;
        }
        audioPlayer.play();
        state.paused = false;
      } else {
        audioPlayer.pause();
        state.paused = true;
      }
    }
    return render();
  }

  render();
});

// 키보드 검색 이벤트
app.addEventListener("input", (event) => {
  if (event.target.id === "queue-search-input") {
    state.queueSearchQuery = event.target.value;
    render();
    const inp = document.getElementById("queue-search-input");
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
    return;
  }

  if (event.target.id === "pld-search-input") {
    state.playlistSearchQuery = event.target.value;
    const view = app.querySelector(".pld-search-view");
    if (view) {
      const pl = getCurrentPlaylist();
      const q = state.playlistSearchQuery.trim().toLowerCase();
      const filtered = q
        ? pl.tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q),
        )
        : pl.tracks.slice(0, 3);

      const listContainer = view.querySelector(".pld-song-list");
      if (listContainer) {
        listContainer.innerHTML = filtered
          .map(
            (track) => `
            <div class="pld-song-item">
              <div class="pld-song-thumb" style="background:${track.color}"></div>
              <div class="pld-song-info" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}">
                <div class="pld-song-title">${track.title}</div>
                <div class="pld-song-artist">${track.artist}</div>
              </div>
              <div class="pld-song-actions">
                <button class="lib-pl-play-btn" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}">▶</button>
                <button class="lib-pl-more-btn">⋮</button>
              </div>
            </div>`,
          )
          .join("");
      }
    }
  }
});

app.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.id === "search-input") {
    performSearch(event.target.value);
  }
});

render();

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("tab")) {
  state.tab = urlParams.get("tab");
  render();
}
if (urlParams.get("queue") === "true") {
  state.showQueue = true;
  render();
}
if (urlParams.get("scroll")) {
  setTimeout(() => {
    const main = document.querySelector(".main");
    if (main) main.scrollTop = parseInt(urlParams.get("scroll"), 10);
  }, 50);
}
