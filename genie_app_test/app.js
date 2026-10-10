// --- 0. Last.fm API 키 설정 (스포티파이 대안) ---
const LAST_FM_API_KEY = "e515ee8682c0f6a8aa1c551daf853858";

// --- 1. 더미 데이터 및 초기 설정 ---
const tracks = [];

const labels = [];

const promos = {
  fast: { title: "고민없는 빠른선곡", lead: "내 취향 기반 추천! 고민 없이 바로 듣기" },
  time: { title: "타임머신", lead: "내가 애정했던 추억의 플레이리스트" },
};

const defaultPlaylistSongs = [];

let myPlaylists = [];

const tabs = [
  { id: "home", label: "홈", icon: "assets/tab-search.svg" },
  { id: "aidj", label: "AI DJ", icon: "assets/tab-aidj.svg" },
  { id: "search", label: "검색", icon: "assets/tab-library.svg" },
  { id: "library", label: "내음악", icon: "assets/tab-aidj.svg" },
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
  searchAllResults: [],
  searchAlbums: [],
  searchAllAlbums: [],
  searchAlbumOffset: 0,
  artistProfile: null,
  isSearching: false,
  selectedSearchIds: [],
  searchView: "main",
  currentAlbum: null,
  currentAlbumTracks: [],
  isLoadingAlbum: false,
  searchOffset: 0,
  searchHasMore: false,
  isLoadingMoreSearch: false,
  recentSearches: [],
  nowPlaying: null,
  showFullPlayer: false,

  // 오디오 상태
  externalTracks: [],
  audioEpisodesJazz: [],
  audioEpisodesClassic: [],
  audioDetail: null,
  audioDetailEpisodes: [],
  audioDetailVisibleCount: 20,
  isAudioDetailLoading: false,
  audioSearchQuery: "",
  audioSearchResults: [],
  isAudioSearching: false,

  // 내음악 & 플레이리스트 상태
  libraryView: "main",
  currentPlaylistId: "pl1",
  queueMyPlaylistId: null,
  // [요구사항 2] 플레이리스트 접속 시 기본적으로 최근 추가순 정렬이 되도록 설정
  sortOrder: "recent",
  sortOrderLabel: "최근 추가순",
  showSortSheet: false,
  sortTarget: "playlist",
  selectedSongIds: [],
  playlistSearchQuery: "",

  // 곡 추가 상태
  addSongTab: "queue",
  addSongSearchQuery: "",
  addSongSearchResults: [],
  addSongSelectedIds: [],
  isAddSongSearching: false,

  // [요구사항 1] 대용량 렌더링(Pagination) 최적화를 위한 렌더 카운트 및 옵저버 상태
  pldVisibleCount: 30,
  queueVisibleCount: 30,
  pldEditVisibleCount: 30,
  pldSearchVisibleCount: 30,
  observer: null,

  // 재생목록 상태
  showQueue: false,
  queueTab: "queue",
  queueEdit: false,
  selectedQueueIds: [],
  queueSearchQuery: "",
  queueShowSearch: false,
  queueSortLabel: "순서정렬",
  queueSortOrder: "default",
  queueTracks: [],
  toastMessage: null,
  showLogin: false,
};

const app = document.getElementById("app");
const audioPlayer = new Audio();

audioPlayer.addEventListener("ended", () => {
  state.paused = true;
  render();
});

function formatTimeStr(sec) {
  if (isNaN(sec) || !isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

window.isProgressDragging = false;

audioPlayer.addEventListener("timeupdate", () => {
  const progressEl = document.getElementById("full-player-progress");
  const currentTimeEl = document.getElementById("full-player-current-time");
  if (progressEl && currentTimeEl) {
    if (window.isProgressDragging) return;
    const current = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 30;
    progressEl.style.width = `${(current / duration) * 100}%`;
    currentTimeEl.innerText = formatTimeStr(current);
  }
});

// --- 3. Last.fm 연동 안내 ---
// Last.fm은 CORS 문제가 없고 유료 플랜이 요구되지 않습니다.// --- 4. 통합 검색 API 통신 함수 ---
async function performSearch(keyword, isGenreMode = false) {
  const trimmed = keyword.trim();
  if (!trimmed) return;
  state.searchQuery = trimmed;
  state.recentSearches = [trimmed, ...state.recentSearches.filter(s => s !== trimmed)].slice(0, 10);
  state.isSearching = true;
  state.searchResults = [];
  state.searchAllResults = [];
  state.searchAlbums = [];
  state.searchAllAlbums = [];
  state.searchAlbumOffset = 0;
  state.searchAlbumHasMore = false;
  state.artistProfile = null;
  state.searchOffset = 0;
  state.searchHasMore = false;
  state.isLoadingMoreSearch = false;
  render();

  try {
    let lastfmPromise = Promise.resolve(null);
    let albumPromise = Promise.resolve(null);

    if (!isGenreMode) {
      if (LAST_FM_API_KEY && !LAST_FM_API_KEY.includes("여기에")) {
        const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(keyword)}&api_key=${LAST_FM_API_KEY}&format=json`;
        lastfmPromise = fetch(lastfmUrl)
          .then(res => res.json())
          .then(data => data.artist)
          .catch(err => {
            console.error("Last.fm 검색 실패:", err);
            return null;
          });
      }
      const albumUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=album&country=US&limit=200`;
      albumPromise = fetch(albumUrl).then((res) => res.json()).catch(() => null);
    }

    const trackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=song&country=US&limit=200`;
    const trackPromise = fetch(trackUrl).then((res) => res.json()).catch(() => null);

    const [lastfmData, albumData, trackData] = await Promise.all([lastfmPromise, albumPromise, trackPromise]);

    if (!isGenreMode) {
      let imageUrl = "https://via.placeholder.com/300?text=No+Photo";
      if (trackData && trackData.results.length > 0) {
        imageUrl = trackData.results[0].artworkUrl100 ? trackData.results[0].artworkUrl100.replace("100x100bb", "400x400bb") : imageUrl;
      }

      if (lastfmData && lastfmData.name) {
        const listeners = new Intl.NumberFormat("ko-KR").format(lastfmData.stats?.listeners || 0);
        const tags = lastfmData.tags?.tag?.length > 0 ? lastfmData.tags.tag.slice(0, 3).map(t => t.name.toUpperCase()).join(", ") : "ARTIST";
        state.artistProfile = {
          name: lastfmData.name,
          bio: `청취자 ${listeners}명 • ${tags}`,
          imageUrl: imageUrl,
        };
      } else if (trackData && trackData.results.length > 0) {
        const topHit = trackData.results[0];
        state.artistProfile = {
          name: topHit.artistName,
          bio: "상단에 Last.fm API 키를 입력하면 정확한 청취자 수와 태그 정보가 표시됩니다.",
          imageUrl: imageUrl,
        };
      }
    }

    if (albumData && albumData.results) {
      const uniqueAlbums = [];
      const seenTitles = new Set();
      albumData.results.forEach((item) => {
        const title = item.collectionName || "";
        const lowerTitle = title.toLowerCase();
        if (!seenTitles.has(lowerTitle)) {
          seenTitles.add(lowerTitle);
          uniqueAlbums.push({
            id: item.collectionId,
            title: title,
            artist: item.artistName,
            coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "300x300bb") : "https://via.placeholder.com/300?text=No+Cover",
            releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : "",
          });
        }
      });
      state.searchAllAlbums = uniqueAlbums;
      state.searchAlbumOffset = 10;
      state.searchAlbums = state.searchAllAlbums.slice(0, 10);
      state.searchAlbumHasMore = state.searchAllAlbums.length > 10;
    }

    if (trackData && trackData.results) {
      state.searchAllResults = trackData.results.map((item) => ({
        id: item.trackId || Date.now() + Math.random(),
        title: item.trackName || "제목 없음",
        artist: item.artistName || "알 수 없는 아티스트",
        coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "300x300bb") : "https://via.placeholder.com/300?text=No+Cover",
        previewUrl: item.previewUrl || null,
      }));
      state.searchOffset = 20;
      state.searchResults = state.searchAllResults.slice(0, 20);
      state.searchHasMore = state.searchAllResults.length > 20;
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

async function loadMoreSearchAlbums() {
  if (!state.searchAlbumHasMore) return;

  const currentOffset = state.searchAlbumOffset;
  const nextOffset = currentOffset + 10;
  const newAlbums = state.searchAllAlbums.slice(currentOffset, nextOffset);

  state.searchAlbums = state.searchAllAlbums.slice(0, nextOffset);
  state.searchAlbumOffset = nextOffset;
  state.searchAlbumHasMore = state.searchAllAlbums.length > nextOffset;

  // 전체 리렌더링(render)을 하면 가로 스와이프 제스처가 끊기기 때문에 DOM에 직접 요소를 추가합니다.
  const observerEl = document.getElementById("search-album-observer");
  if (observerEl) {
    const newHtml = newAlbums.map((album) => `
      <button class="album-card" data-action="open-album" data-id="${album.id}" style="flex: none; width: 110px; text-align: left; background: none; border: none; padding: 0; margin: 0; cursor: pointer;">
        <img src="${album.coverUrl}" style="width: 110px; height: 110px; border-radius: 8px; object-fit: cover; margin-bottom: 8px; border: 1px solid #f0f0f0;" />
        <div style="font-size: 13px; font-weight: 600; color: #141414; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${album.title}</div>
        <div style="font-size: 11px; color: #888; margin-top: 2px;">${album.releaseYear}</div>
      </button>`).join("");

    observerEl.insertAdjacentHTML("beforebegin", newHtml);

    if (!state.searchAlbumHasMore) {
      if (state.observer) state.observer.unobserve(observerEl);
      observerEl.remove();
    }
  }
}

async function loadMoreSearchResults() {
  if (state.isLoadingMoreSearch || !state.searchHasMore) return;
  state.isLoadingMoreSearch = true;
  render();

  // iTunes Search API는 offset을 공식 지원하지 않아 결과가 중복되므로,
  // 200개를 한 번에 받아둔 뒤 클라이언트 단에서 페이징 처리합니다.
  setTimeout(() => {
    const nextOffset = state.searchOffset + 20;
    const nextBatch = state.searchAllResults.slice(state.searchOffset, nextOffset);
    state.searchResults = [...state.searchResults, ...nextBatch];
    state.searchOffset = nextOffset;
    state.searchHasMore = state.searchOffset < state.searchAllResults.length;
    state.isLoadingMoreSearch = false;
    render();
  }, 300);
}

// --- 5. 렌더링 함수들 ---
function visibleTracks() {
  return state.expanded ? tracks : tracks.slice(0, 4);
}

async function fetchAudioEpisodes() {
  if (state.audioEpisodesJazz.length === 0) {
    try {
      const resJazz = await fetch("https://itunes.apple.com/search?term=%EC%9D%8C%EC%95%85%ED%86%A0%ED%81%AC&entity=podcast&limit=6&country=kr");
      const dataJazz = await resJazz.json();
      state.audioEpisodesJazz = dataJazz.results;

      const resClassic = await fetch("https://itunes.apple.com/search?term=%ED%81%B4%EB%9E%98%EC%8B%9D&entity=podcast&limit=6&country=kr");
      const dataClassic = await resClassic.json();
      state.audioEpisodesClassic = dataClassic.results;
      render();
    } catch (e) {
      console.error(e);
    }
  }
}
function currentTrack() {
  if (state.nowPlaying) return state.nowPlaying;
  if (state.index >= 0 && state.queueTracks[state.index]) return state.queueTracks[state.index];
  if (state.index >= 0 && tracks[state.index]) return tracks[state.index];
  return { title: "재생 중인 곡이 없습니다", artist: "", color: "#e0e0e0" };
}

async function performAudioSearch(q) {
  state.audioSearchQuery = q;
  if (!q) {
    state.audioSearchResults = [];
    state.isAudioSearching = false;
    return render();
  }
  state.isAudioSearching = true;
  render();
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=podcast&limit=12&country=kr`);
    const data = await res.json();
    state.audioSearchResults = data.results;
  } catch (e) {
    console.error(e);
  } finally {
    state.isAudioSearching = false;
    render();
  }
}

function play(index) {
  const track = tracks[index];
  if (track) {
    if (track.previewUrl) {
      if (state.nowPlaying === track && !audioPlayer.paused) {
        audioPlayer.pause();
        state.paused = true;
      } else {
        state.nowPlaying = track;
        state.index = index;
        if (audioPlayer.src !== track.previewUrl) audioPlayer.src = track.previewUrl;
        audioPlayer.play();
        state.paused = false;

        // 재생목록(Queue) 하단 자동 추가 로직
        const newTrack = {
          id: Date.now(),
          title: track.title,
          artist: track.artist,
          cover: track.cover,
          previewUrl: track.previewUrl,
          color: track.color || "#2b3b4a",
          addedAt: Date.now()
        };
        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) state.queueTracks.splice(existingIdx, 1);
        state.queueTracks.push(newTrack);
      }
    } else {
      state.index = index;
      state.paused = false;
      state.nowPlaying = null;
      audioPlayer.pause();
    }
  }
  state.sheet = null;
  render();
}

function renderDelta(track) {
  if (track.delta === "up") return `<span class="delta up" > <span class="mark">▴</span>${track.amount}</span> `;
  if (track.delta === "down") return `<span class="delta down" > <span class="mark">▾</span>${track.amount}</span> `;
  return `<span class="delta" > <span class="mark">-</span></span> `;
}

function trackButton(track, index) {
  const isPlayingNow = state.nowPlaying === track;
  const highlightColor = isPlayingNow ? "#f7f7f7" : "transparent";
  const on = state.index === index && !state.nowPlaying ? " is-on" : "";
  const coverHtml = track.cover ? `<img class="cover" src="${track.cover}" alt="${track.title}" />` : `<span class="cover" style="background:${track.color}"></span>`;

  return `<button class="track${on}" data-action="play" data-index="${index}" style="background-color: ${highlightColor};">
    ${coverHtml}
    <span class="rank"><b>${index + 1}</b>${renderDelta(track)}</span>
    <span class="meta"><strong>${track.title}</strong><em>${track.artist}</em></span>
    ${track.previewUrl
      ? (isPlayingNow && !state.paused ? '<span style="margin-left:auto; font-size:16px; color:#141414; padding-right:10px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 19h4V5H6v14zm8-14v14h4V5h-4z\'/></svg></span>' : '<span style="margin-left:auto; font-size:16px; color:#141414; padding-right:10px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></span>')
      : ""}
  </button>`;
}

function searchTrackButton(track, index) {
  const isPlayingNow = state.nowPlaying === track;
  const isSelected = state.selectedSearchIds && state.selectedSearchIds.includes(track.id.toString());
  const highlightColor = isSelected ? "#f7f7f7" : (isPlayingNow ? "#f7f7f7" : "transparent");
  const titleColor = isSelected ? "#0096fd" : "#141414";

  return `
      <div class="track" style="padding-left: 10px; background-color: ${highlightColor}; display: flex; align-items: center; width: 100%; border: none; cursor: pointer; padding-bottom: 8px; box-sizing: border-box;" >
        <div data-action="toggle-search-select" data-id="${track.id}" style="display: flex; align-items: center; flex: 1; min-width: 0;">
          ${track.coverUrl ? `<img class="cover" src="${track.coverUrl}" alt="" style="object-fit: cover; width: 44px; height: 44px; border-radius: 4px; flex-shrink: 0;" />` : `<div style="width: 44px; height: 44px; border-radius: 4px; flex-shrink: 0; background: #e0e0e0;"></div>`}
          <span class="meta" style="margin-left: 12px; display: flex; flex-direction: column; min-width: 0; flex: 1;">
            <strong style="color: ${titleColor}; font-size: 15px; font-weight: 500; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title}</strong>
            <em style="color: ${isSelected ? '#0096fd' : '#888'}; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.artist}</em>
          </span>
        </div>
        <div style="display: flex; align-items: center; margin-left: auto; flex-shrink: 0; padding-right: 10px;">
          <button data-action="play-search" data-index="${index}" style="background: none; border: none; padding: 10px; cursor: pointer;">
            ${track.previewUrl
      ? (isPlayingNow && !state.paused ? '<span style="font-size:16px; color:#141414;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 19h4V5H6v14zm8-14v14h4V5h-4z\'/></svg></span>' : '<span style="font-size:16px; color:#141414;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></span>')
      : ""}
          </button>
        </div>
      </div> `;
}

function renderCard(card, index, type) {
  const coverHtml = card.cover ? `<img class="card-cover" src = "${card.cover}" alt = "" /> ` : ` <span class="card-cover" style="background:${card.color}" ></span> `;
  return `
      <button class="card" data-action="${type}" data-index="${index}" >
        ${coverHtml}
      <span class="card-copy">${card.title.replace("\n", "<br />")}</span>
      <span class="byline"><img src="assets/ellipse.svg" width="11" height="11" alt="" />${card.by}</span>
    </button> `;
}

function homeScreen() {
  if (state.chip !== "홈")
    return `<section class="page" ><h1>${state.chip}</h1><div class="empty-list">${tracks.slice(0, 4).map((t, i) => `<button class="row" data-action="play" data-index="${i}">${t.title}</button>`).join("")}</div></section> `;

  const labelCards = labels.map((c, i) => renderCard(c, i, "label")).join("");
  const magazineCards = labels.map((c, i) => renderCard(c, i, "magazine")).join("");

  return `
      <div class="promo-section" >
        <div class="promo-banner-wrap">
          <img src="assets/promorow.png" alt="프로모션" class="promo-banner-img" />
          <button class="promo-hotspot left" data-action="promo" data-id="fast" aria-label="고민없는 빠른선곡"></button>
          <button class="promo-hotspot right" data-action="promo" data-id="time" aria-label="타임머신"></button>
        </div>
    </div>
    <section class="section">
      <div class="section-head">
        <button data-action="chart"><h2>지니차트 &gt;</h2></button>
      </div>
      <div class="track-list">${visibleTracks().map(trackButton).join("")}</div>
      ${state.expanded ? "" : `<button class="more" data-action="play-chart-all"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg> 전체재생</button>`}
    </section>
    <section class="label-block">
      <div class="section-head"><button class="plain-title" data-action="labels">레이블 PICK &gt;</button></div>
      <div class="cards">${labelCards}</div>
    </section>
    <section class="label-block magazine-block">
      <div class="section-head"><button class="plain-title" data-action="magazines">매거진 &gt;</button></div>
      <div class="cards">${magazineCards}</div>
    </section>`;
}

function listScreen() {
  const list = state.screen === "label" ? tracks.slice(0, 5) : tracks;
  return `<section class="page" ><button class="back" data-action="back">‹ 홈</button><h1>${state.screenTitle}</h1><div class="track-list">${list.map((track) => trackButton(track, tracks.indexOf(track))).join("")}</div></section> `;
}

function searchScreen() {
  const profileHtml = state.artistProfile && !state.isSearching
    ? `<div style="margin-bottom: 24px; padding: 16px; background: #fff; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); border: 1px solid #f0f0f0;" >
         <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
           <img src="${state.artistProfile.imageUrl}" alt="" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
           <div style="flex: 1;">
             <div style="font-size: 18px; font-weight: 700; color: #141414; margin-bottom: 4px;">${state.artistProfile.name}</div>
             <div style="font-size: 13px; color: #888;">아티스트</div>
           </div>
         </div>
         <p style="font-size: 13px; color: #1ed760; font-weight: 600; line-height: 1.5; margin: 0;">${state.artistProfile.bio}</p>
       </div> ` : "";

  const albumObserverHtml = state.searchAlbumHasMore ? `<div id="search-album-observer" style="flex: none; width: 20px;"></div> ` : "";

  const albumsHtml = state.searchAlbums.length > 0 && !state.isSearching
    ? `<div style="margin-bottom: 24px;" >
         <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 4px;">발매 앨범</h3>
         <div id="search-album-container" style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;">
           ${state.searchAlbums.map((album) => `
             <button class="album-card" data-action="open-album" data-id="${album.id}" style="flex: none; width: 110px; text-align: left; background: none; border: none; padding: 0; margin: 0; cursor: pointer;">
               <img src="${album.coverUrl}" style="width: 110px; height: 110px; border-radius: 8px; object-fit: cover; margin-bottom: 8px; border: 1px solid #f0f0f0;" />
               <div style="font-size: 13px; font-weight: 600; color: #141414; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${album.title}</div>
               <div style="font-size: 11px; color: #888; margin-top: 2px;">${album.releaseYear}</div>
             </button>`).join("")}
           ${albumObserverHtml}
         </div>
       </div> ` : "";

  const loadingMoreHtml = state.isLoadingMoreSearch
    ? `<div style="padding: 20px 0; text-align: center; color: #888; font-size: 14px;" > 추가 데이터를 불러오는 중입니다...</div> `
    : "";

  const observerHtml = state.searchHasMore && !state.isLoadingMoreSearch ? `<div id="search-api-observer" style="height: 20px;"></div> ` : "";

  const recentSearchesHtml = state.recentSearches.length > 0 ? `
    <div style="margin-bottom: 32px; margin-top: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="font-size: 20px; font-weight: 800; margin: 0; color: #141414;">최근 검색</h3>
        <button data-action="clear-recent-searches" style="background: none; border: none; padding: 0; color: #aaa; font-size: 13px; font-weight: 500; cursor: pointer;">전체삭제</button>
      </div>
      <div style="display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;">
        ${state.recentSearches.map(keyword => `
          <div data-action="search-recent" data-keyword="${keyword}" style="border: 1px solid #e5e5e5; border-radius: 20px; padding: 6px 12px; font-size: 14px; color: #141414; display: flex; align-items: center; gap: 4px; white-space: nowrap; flex: none; cursor: pointer;">
            ${keyword} <span data-action="delete-recent-search" data-keyword="${keyword}" style="color: #ccc; font-size: 12px; cursor: pointer; padding-left: 2px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></span>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const genres = [
    { title: "가요", background: "linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)" },
    { title: "POP", background: "linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)" },
    { title: "OST", background: "linear-gradient(135deg, #430000 0%, #c40000 100%)" },
    { title: "EDM", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { title: "힙합", background: "linear-gradient(135deg, #1f1f1f 0%, #4a4a4a 100%)" },
    { title: "트롯", background: "linear-gradient(135deg, #9a6600 0%, #f6d365 100%)" },
    { title: "Jazz", background: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)" },
    { title: "Classic", background: "linear-gradient(135deg, #2b1f00 0%, #855c0b 100%)" },
    { title: "동요", background: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)" },
    { title: "태교음악", background: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" }
  ];

  const genresHtml = `
    <div>
      <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 16px 0; color: #141414;">장르 둘러보기</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${genres.map(g => `
          <div data-action="search-genre" data-genre="${g.title}" style="background: ${g.background}; border-radius: 8px; padding: 12px; aspect-ratio: 16/9; position: relative; overflow: hidden; cursor: pointer;">
            <div style="font-size: 15px; font-weight: 800; color: #fff; position: relative; z-index: 1;">${g.title}</div>
            <div style="position: absolute; bottom: -15px; right: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; filter: blur(10px);"></div>
            <div style="position: absolute; top: -20px; left: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.15); border-radius: 50%; filter: blur(20px);"></div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  const defaultSearchStateHtml = `
    <div style="padding: 0 4px;">
      ${recentSearchesHtml}
      ${genresHtml}
    </div>
  `;

  const resultsHtml = state.isSearching
    ? `<div style="padding: 60px 0; text-align: center; color: #888; font-size: 14px;" > 데이터를 불러오는 중입니다...</div> `
    : state.searchResults.length > 0
      ? `<div style="margin-bottom: 24px;" >
           <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 4px;">인기곡 (30초 듣기)</h3>
           <div class="track-list">${state.searchResults.map(searchTrackButton).join("")}</div>
           ${loadingMoreHtml}
           ${observerHtml}
         </div> `
      : !state.artistProfile
        ? defaultSearchStateHtml : "";

  return `
      <section class="page" style="padding-bottom: 100px;" >
      <div class="lib-header">
        <h1>검색</h1>
        <div class="lib-header-right">
          <button class="lib-pass-btn" data-action="pass">이용권</button>
          <button class="avatar" data-action="profile" style="width:32px;height:32px;border-radius:50%;padding:0;background:none;border:none;cursor:pointer;"><img src="assets/frame_14.png" width="32" height="32" alt="프로필" style="border-radius:50%;" /></button>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <input type="text" id="search-input" value="${state.searchQuery}" placeholder="검색어를 입력하세요." 
               style="flex: 1; height: 44px; padding: 0 16px; border-radius: 4px; border: none; background: #f9f9f9; font-size: 15px; outline: none; color: #141414;" />
        <button style="background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; color: #141414;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
        </button>
        <button style="background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; color: #141414;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </button>
      </div>
      ${profileHtml}
      ${albumsHtml}
      ${resultsHtml}
    </section> `;
}

function albumTrackButton(track, index) {
  const isPlayingNow = state.nowPlaying === track;
  const highlightColor = isPlayingNow ? "#f7f7f7" : "transparent";
  return `
      <button class="track" data-action="play-album-track" data-index="${index}" style="padding-left: 10px; background-color: ${highlightColor};" >
      ${track.coverUrl ? `<img class="cover" src="${track.coverUrl}" alt="" style="object-fit: cover;" />` : `<div class="cover" style="background: #e0e0e0;"></div>`}
      <span class="meta" style="margin-left: 12px;"><strong>${track.title}</strong><em>${track.artist}</em></span>
      ${track.previewUrl
      ? (isPlayingNow && !state.paused ? '<span style="margin-left:auto; font-size:16px; color:#141414; padding-right:10px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 19h4V5H6v14zm8-14v14h4V5h-4z\'/></svg></span>' : '<span style="margin-left:auto; font-size:16px; color:#141414; padding-right:10px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></span>')
      : ""
    }
    </button> `;
}

function searchAlbumScreen() {
  const album = state.currentAlbum;
  if (!album) return "";

  const tracksHtml = state.isLoadingAlbum
    ? `<div style="padding: 60px 0; text-align: center; color: #888; font-size: 14px;" > 트랙 정보를 불러오는 중입니다...</div> `
    : state.currentAlbumTracks.length > 0
      ? `<div class="pld-song-list">
          ${state.currentAlbumTracks.map((track, i) => {
            const isCurrent = state.nowPlaying?.title === track.title;
            const isSelected = state.selectedSearchIds && state.selectedSearchIds.includes(track.id.toString());
            const bg = isSelected ? "rgba(0,150,253,0.1)" : (isCurrent ? "#f7f7f7" : "transparent");
            const titleColor = isSelected ? "#0096fd" : "#141414";
            const artistColor = isSelected ? "#0096fd" : "#888";
            const coverBg = track.coverUrl ? `background-image:url(${track.coverUrl}); background-size:cover;` : `background-color:#e0e0e0;`;
            return `
              <div class="pld-song-item" style="background-color: ${bg};" >
                <div data-action="toggle-search-select" data-id="${track.id}" style="display: flex; align-items: center; flex: 1; min-width: 0;">
                  <div class="pld-song-thumb" style="${coverBg}; flex-shrink: 0; border-radius: 4px;"></div>
                  <div class="pld-song-info" style="flex: 1; min-width: 0; margin-left: 12px; margin-right: 0;">
                    <div class="pld-song-title" style="color: ${titleColor};">${track.title}</div>
                    <div class="pld-song-artist" style="color: ${artistColor};">${track.artist}</div>
                  </div>
                </div>
                <div class="pld-song-actions">
                  <button class="lib-pl-play-btn" data-action="play-album-track" data-index="${i}"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></button>
                </div>
              </div> `;
          }).join("")}
         </div> `
      : `<div style="padding: 60px 0; text-align: center; color: #888; font-size: 14px;" > 트랙 정보가 없습니다.</div> `;

  return `
      <div class="pld-page">
      <div class="pld-top-bar">
        <button class="pld-back-btn" data-action="close-album">‹</button>
      </div>
      <div class="pld-hero">
        <div class="pld-hero-thumb" style="${album.coverUrl ? `background-image:url(${album.coverUrl}); background-size:cover;` : `background-color:#e0e0e0;`}"></div>
        <div class="pld-hero-title">${album.title}</div>
        <div class="pld-hero-sub">${album.artist} • ${album.releaseYear} • 수록곡 ${state.currentAlbumTracks.length}곡</div>
        <button class="pld-play-all-btn" data-action="play-album-all"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg> 전체듣기</button>
      </div>
      <div class="pld-songs-sec">
        <div class="pld-songs-head">
          <div class="pld-songs-count">수록곡 <span>${state.currentAlbumTracks.length}곡</span></div>
        </div>
        <div class="pld-ctrl-row">
          <div class="pld-ctrl-left">
            <button class="pld-ctrl-btn" data-action="play-album-all"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg> 전체듣기</button>
          </div>
        </div>
        ${tracksHtml}
      </div>
    </div> `;
}

function getCurrentPlaylist() {
  return myPlaylists.find((p) => p.id.toString() === state.currentPlaylistId?.toString()) || myPlaylists[0];
}

// [요구사항 2, 4] 정렬 로직 처리 (최근 추가순 및 편집순/Custom Order 지원)
function getSortedTracks(songList, sortOrder) {
  const list = [...songList];
  if (sortOrder === "artist") {
    return list.sort((a, b) => a.artist.localeCompare(b.artist, "ko"));
  }
  if (sortOrder === "title") {
    return list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }
  if (sortOrder === "recent") {
    // 최근에 추가된 곡(addedAt 값이 큰 값)이 상단에 배치되도록 내림차순 정렬
    return list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }
  // 기본적으로 "default"(편집순) 일 경우, 
  // 원본 pl.tracks(Drag & Drop 등으로 편집된 배열)를 그대로 반환합니다.
  return list;
}

// 1. 내음악 메인 화면
function libraryMainScreen() {
  const plCards = myPlaylists.map((pl) => `
      <div class="lib-playlist-item" data-action="open-playlist" data-id="${pl.id}" >
        <div class="lib-pl-thumb" style="${pl.tracks.length > 0 && pl.tracks[0].cover ? `background-image:url(${pl.tracks[0].cover}); background-size:cover;` : `background-color:${pl.color}`}"></div>
        <div class="lib-pl-info">
          <div class="lib-pl-title">${pl.title}</div>
          <div class="lib-pl-sub">총 ${pl.tracks.length}곡</div>
        </div>
        <div class="lib-pl-actions">
          <button class="lib-pl-play-btn" data-action="play-playlist" data-id="${pl.id}" title="재생"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></button>
          <button class="lib-pl-more-btn" data-action="pl-more" data-id="${pl.id}"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z\'/></svg></button>
        </div>
      </div> `).join("");

  return `
      <div class="lib-page" >
      <div class="lib-header">
        <h1>내음악</h1>
        <div class="lib-header-right">
          <button class="lib-pass-btn" data-action="pass">이용권</button>
          <button class="avatar" data-action="profile" style="width:32px;height:32px;border-radius:50%;padding:0;background:none;"><img src="assets/frame_14.png" width="32" height="32" alt="프로필" style="border-radius:50%;" /></button>
        </div>
      </div>
      <div class="lib-quick-grid">
        <button class="lib-quick-card" data-action="quick-menu" data-type="like"><span class="icon" style="font-size:16px; font-weight: 300;">♡</span><span>좋아요</span></button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="album"><span class="icon" style="font-size:16px; font-weight: 300;">⊟</span><span>보관함</span></button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="recent"><span class="icon" style="font-size:16px; font-weight: 300;">🕒</span><span>최근 재생한</span></button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="most"><span class="icon" style="font-size:16px; font-weight: 300;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></span><span>많이 재생한</span></button>
        <button class="lib-quick-card" data-action="quick-menu" data-type="dj"><span class="icon" style="font-size:16px; font-weight: 300;">☺</span><span>구독 DJ</span></button>
      </div>
      <div class="lib-section-head">
        <h2>내 플레이리스트</h2>
      </div>
      <div class="lib-meta-row">
        <span class="lib-count-badge">전체 <span>${myPlaylists.length}</span></span>
      </div>
      <div class="lib-actions-row">
        <button class="lib-action-btn" data-action="new-playlist">+ 새로 만들기</button>
        <button class="lib-action-btn" data-action="smart-add-songs"><span style="font-size: 16px; margin-right: 6px;">⛶</span> 이미지로 곡 등록</button>
      </div>
      <div class="lib-playlist-list">
        ${plCards}
      </div>
    </div> `;
}

// 2. 플레이리스트 상세 화면
function playlistDetailScreen() {
  const pl = getCurrentPlaylist();
  if (!pl) return `<div class="pld-container"><button class="pld-back" data-action="lib-back">←</button><div style="text-align:center; padding-top:100px; color:#888;">플레이리스트가 없습니다.</div></div>`;
  let sortedTracks = getSortedTracks(pl.tracks, state.sortOrder);
  const q = (state.playlistSearchQuery || "").trim().toLowerCase();
  if (q) {
    sortedTracks = sortedTracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  }

  // [요구사항 1] Pagination 기법 적용 (DOM 폭주 방지)
  const visibleTracks = sortedTracks.slice(0, state.pldVisibleCount);
  const hasMore = state.pldVisibleCount < sortedTracks.length;

  const trackItems = visibleTracks.map((track) => {
    const isCurrent = state.nowPlaying?.title === track.title;
    const coverBg = track.cover ? `background-image:url(${track.cover}); background-size:cover;` : `background-color:${track.color}`;
    return `
      <div class="pld-song-item${isCurrent ? " is-playing" : ""}" >
          <div class="pld-song-thumb" style="${coverBg}"></div>
          <div class="pld-song-info" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}" data-preview="${track.previewUrl || ''}" data-cover="${track.cover || ''}">
            <div class="pld-song-title">${track.title}</div>
            <div class="pld-song-artist">${track.artist}</div>
          </div>
          <div class="pld-song-actions">
            <button class="lib-pl-play-btn" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}" data-preview="${track.previewUrl || ''}" data-cover="${track.cover || ''}"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></button>
          </div>
        </div> `;
  }).join("");

  const observerEl = hasMore ? `<div id = "pld-observer" style="height: 20px;" ></div> ` : "";

  return `
      <div class="pld-page" >
      <div class="pld-top-bar">
        <button class="pld-back-btn" data-action="lib-back">‹</button>
        <button class="lib-pl-more-btn" data-action="pl-more" data-id="${pl.id}"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z\'/></svg></button>
      </div>
      <div class="pld-hero">
        <div class="pld-hero-thumb" style="${pl.tracks.length > 0 && pl.tracks[0].cover ? `background-image:url(${pl.tracks[0].cover}); background-size:cover;` : `background-color:${pl.color}`}"></div>
        <div class="pld-hero-title">${pl.title}</div>
        <div class="pld-hero-sub">수록곡 ${pl.tracks.length}곡 • ${pl.time}</div>
        <button class="pld-play-all-btn" data-action="play-playlist-all"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg> 전체듣기</button>
      </div>
      <div class="pld-songs-sec">
        <div class="pld-songs-head">
          <div class="pld-songs-count">수록곡 <span>${pl.tracks.length}곡</span></div>
          <div class="pld-songs-actions">
            <button data-action="add-song-to-pl">+ 곡추가</button>
          </div>
        </div>
        <div class="pld-search-bar" style="display:flex; align-items:center;">
          <span class="search-icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\'/></svg></span>
          <input type="text" id="pld-search-input" value="${state.playlistSearchQuery || ""}" placeholder="이 리스트에서 찾기" style="flex:1; border:none; background:none; outline:none; font-size:15px; margin-left:8px;" />
          ${state.playlistSearchQuery ? '<button class="pld-search-clear" data-action="clear-pld-search"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></button>' : ""}
        </div>
        <div class="pld-ctrl-row">
          <div class="pld-ctrl-left">
            <button class="pld-ctrl-btn" data-action="open-edit-mode">✓ 전체선택</button>
            <button class="pld-ctrl-btn" data-action="play-playlist-all"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg> 전체듣기</button>
          </div>
          <div class="pld-ctrl-right">
            <button class="pld-ctrl-btn" data-action="open-sort-sheet">${state.sortOrderLabel} ▾</button>
            <button class="pld-ctrl-btn" data-action="open-edit-mode">편집</button>
          </div>
        </div>
        <div class="pld-song-list">
          ${trackItems}
          ${observerEl}
        </div>
      </div>
    </div> `;
}

// 3. 정렬 순 바텀시트
function sortBottomSheet() {
  if (!state.showSortSheet) return "";
  const options = [
    // [요구사항 4] 편집(커스텀) 상태 지원을 위해 '편집순'으로 명칭을 구체화
    { id: "default", label: "편집순" },
    { id: "artist", label: "아티스트 순" },
    { id: "title", label: "곡 제목 순" },
    { id: "recent", label: "최근 추가순" },
  ];
  const currentSortOrder = state.sortTarget === "queue" ? state.queueSortOrder : state.sortOrder;

  return `
      <div class="sort-sheet-back" data-action="close-sort-sheet" >
        <div class="sort-sheet" data-stop>
          <div class="sort-handle"></div>
          <div class="sort-opt-list">
            ${options.map((opt) => `
            <div class="sort-opt-item${currentSortOrder === opt.id ? " is-selected" : ""}" data-action="select-sort-order" data-id="${opt.id}" data-label="${opt.label}">
              <span>${opt.label}</span>
              ${currentSortOrder === opt.id ? '<span class="sort-opt-check"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M9 15h4v6h2v-6h4l-7-7-7 7zM5 3v2h14V3H5z\'/></svg></span>' : ""}
            </div>`).join("")}
          </div>
          <button class="sort-cancel-btn" data-action="close-sort-sheet">취소</button>
        </div>
    </div> `;
}

// 4. 플레이리스트 내 검색 화면
function playlistSearchScreen() {
  const pl = getCurrentPlaylist();
  const q = state.playlistSearchQuery.trim().toLowerCase();
  const filtered = q
    ? pl.tracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    : pl.tracks.slice(0, 3); // 초기 노출 개수

  // Pagination
  const visibleFiltered = filtered.slice(0, state.pldSearchVisibleCount);
  const hasMore = state.pldSearchVisibleCount < filtered.length;

  const listItems = visibleFiltered.map((track) => {
    const coverBg = track.cover ? `background-image:url(${track.cover}); background-size:cover;` : `background-color:${track.color}`;
    return `
      <div class="pld-song-item" >
        <div class="pld-song-thumb" style="${coverBg}"></div>
        <div class="pld-song-info" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}" data-preview="${track.previewUrl || ''}" data-cover="${track.cover || ''}">
          <div class="pld-song-title">${track.title}</div>
          <div class="pld-song-artist">${track.artist}</div>
        </div>
        <div class="pld-song-actions">
          <button class="lib-pl-play-btn" data-action="play-custom" data-title="${encodeURIComponent(track.title)}" data-artist="${encodeURIComponent(track.artist)}" data-color="${track.color}" data-preview="${track.previewUrl || ''}" data-cover="${track.cover || ''}"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></button>
        </div>
      </div>`
  }).join("");

  const observerEl = hasMore ? `<div id = "pld-search-observer" style="height: 20px;" ></div> ` : "";

  return `
      <div class="pld-search-view" >
      <div class="pld-search-header">
        <button class="pld-back-btn" data-action="close-playlist-search">‹</button>
        <div class="pld-search-input-wrap">
          <span class="search-icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\'/></svg></span>
          <input type="text" id="pld-search-input" value="${state.playlistSearchQuery}" placeholder="이 리스트에서 찾기" />
          ${state.playlistSearchQuery ? '<button class="pld-search-clear" data-action="clear-pld-search"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></button>' : ""}
        </div>
      </div>
      <div class="pld-song-list">
        ${listItems}
        ${observerEl}
      </div>
      <div class="keyboard-placeholder">자판</div>
    </div> `;
}

// 5. 플레이리스트 편집 화면
function playlistEditScreen() {
  const pl = getCurrentPlaylist();
  const selectedCount = state.selectedSongIds.length;
  const isAllSelected = pl.tracks.length > 0 && selectedCount === pl.tracks.length;

  // Pagination 적용
  const visibleTracks = pl.tracks.slice(0, state.pldEditVisibleCount);
  const hasMore = state.pldEditVisibleCount < pl.tracks.length;

  const editItems = visibleTracks.map((track) => {
    const isChecked = state.selectedSongIds.includes(track.id.toString());
    const coverBg = track.cover ? `background-image:url(${track.cover}); background-size:cover;` : `background-color:${track.color}`;
    return `
      <div class="pld-edit-item" draggable="true" data-action="toggle-song-select" data-id="${track.id}" >
        <div class="pld-checkbox${isChecked ? " is-checked" : ""}" ></div>
          <div class="pld-song-thumb" style="${coverBg}"></div>
          <div class="pld-song-info">
            <div class="pld-song-title">${track.title}</div>
            <div class="pld-song-artist">${track.artist}</div>
          </div>
          <div class="pld-drag-handle" data-action="drag-song" data-id="${track.id}">≡</div>
        </div> `;
  }).join("");

  const observerEl = hasMore ? `<div id = "pld-edit-observer" style="height: 20px;" ></div> ` : "";

  return `
      <div class="pld-edit-view" >
      <div class="pld-edit-top-bar">
        <button class="pld-edit-close" data-action="close-edit-mode"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></button>
        <h2>플레이리스트 편집</h2>
        <div style="width:24px;"></div>
      </div>
      <div class="pld-search-bar" data-action="open-playlist-search">
        <span class="search-icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\'/></svg></span>
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
        ${observerEl}
      </div>
    </div> `;
}

// 6. 재생목록 화면
function queueScreen() {
  let listTracks = state.queueTracks;
  if (state.queueTab === "my") {
    if (state.queueMyPlaylistId) {
      const pl = myPlaylists.find(p => p.id.toString() === state.queueMyPlaylistId);
      listTracks = pl ? pl.tracks : [];
    } else {
      listTracks = [];
    }
  } else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
  else if (state.queueTab === "external") listTracks = state.externalTracks || [];
  else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);

  if (state.queueSearchQuery.trim()) {
    const q = state.queueSearchQuery.trim().toLowerCase();
    listTracks = listTracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }

  const selectedCount = state.selectedQueueIds.length;
  const isAllSelected = listTracks.length > 0 && selectedCount === listTracks.length;
  const current = currentTrack();

  // Queue Pagination 적용
  const visibleQueue = listTracks.slice(0, state.queueVisibleCount);
  const hasMoreQueue = state.queueVisibleCount < listTracks.length;

  const queueItems = visibleQueue.map((track) => {
    // 실제 listTracks 배열 내 인덱스를 추적합니다.
    const idx = listTracks.indexOf(track);
    const trackId = (track.id || (idx + 1)).toString();
    const isSelected = state.selectedQueueIds.includes(trackId);
    const isPlaying = current && current.title === track.title;
    const coverBg = track.cover ? `background-image:url(${track.cover}); background-size:cover;` : `background-color:${track.color || "#8CC7BF"};`;

    return `
      <div class="queue-song-item${isPlaying ? " is-playing" : ""}" ${state.queueEdit ? 'draggable="true"' : ''} data-action="${state.queueEdit ? "queue-toggle-select" : "queue-play-track"}" data-id="${trackId}" data-index="${idx}" >
        ${state.queueEdit ? `<div class="pld-checkbox${isSelected ? " is-checked" : ""}"></div>` : ""}
        <div class="queue-song-thumb" style="${coverBg}">
          ${isPlaying && !state.queueEdit ? '<div class="queue-play-badge"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></div>' : ""}
        </div>
        <div class="queue-song-info">
          <div class="queue-song-title${isPlaying ? " is-playing-title" : ""}">${track.title}</div>
          <div class="queue-song-artist">${track.artist}</div>
        </div>
      ${state.queueEdit ? `
          <div class="pld-drag-handle" data-action="queue-drag" data-id="${trackId}">≡</div>
        ` : `
          <div class="queue-song-meta">
            <span class="queue-song-time">${track.time || "00:30"}</span>
          </div>
        `}
      </div> `;
  }).join("");

  const observerEl = hasMoreQueue ? `<div id = "queue-observer" style="height: 20px;" ></div> ` : "";

  return `
      <div class="queue-container" >
      <div class="queue-header">
        <div class="queue-header-top">
          <button class="queue-btn-x" data-action="close-queue" aria-label="닫기"><img src="assets/queue_x.png" width="24" height="24" alt="닫기" /></button>
          <h1 class="queue-header-title">재생목록</h1>
          <button class="queue-btn-search" data-action="queue-toggle-search" aria-label="검색"><img src="assets/queue_search.svg" width="22" height="22" alt="검색" /></button>
        </div>
        <div class="queue-subtabs">
          <button class="queue-subtab${state.queueTab === "queue" ? " is-active" : ""}" data-action="queue-tab" data-tab="queue">재생목록</button>
          <button class="queue-subtab${state.queueTab === "my" ? " is-active" : ""}" data-action="queue-tab" data-tab="my">MY</button>
          <button class="queue-subtab${state.queueTab === "fast" ? " is-active" : ""}" data-action="queue-tab" data-tab="fast">빠른선곡</button>
          <button class="queue-subtab${state.queueTab === "external" ? " is-active" : ""}" data-action="queue-tab" data-tab="external">외부목록</button>
          <button class="queue-subtab${state.queueTab === "hires" ? " is-active" : ""}" data-action="queue-tab" data-tab="hires">고음질전용관 <span class="queue-5g-badge">5G</span></button>
        </div>
      </div>
      ${state.queueShowSearch ? `
        <div class="queue-search-input-wrap">
          <span class="search-icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\'/></svg></span>
          <input type="text" id="queue-search-input" value="${state.queueSearchQuery}" placeholder="재생목록에서 검색" />
          ${state.queueSearchQuery ? '<button class="pld-search-clear" data-action="clear-queue-search"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></button>' : ""}
        </div>
      ` : ""
    }
      ${(state.queueTab === "my" && !state.queueMyPlaylistId) ? "" : `
      <div class="queue-ctrl-row">
        <div class="queue-ctrl-left">
          ${state.queueEdit ? `
            <button class="queue-select-all-btn" data-action="queue-toggle-select-all">
              <div class="pld-checkbox${isAllSelected ? " is-checked" : ""}" style="margin-right: 6px;"></div>
              <span>전체선택 ${selectedCount > 0 ? `(${selectedCount})` : ""}</span>
            </button>
          ` : (state.queueTab === "my" && state.queueMyPlaylistId) ? `
            <button class="queue-my-pl-select-btn" data-action="queue-my-open-sheet" style="background:none; border:none; display:flex; align-items:center; font-size:15px; font-weight:700; color:#141414; padding:0; cursor:pointer;">
              ${myPlaylists.find(p => p.id.toString() === state.queueMyPlaylistId)?.title} <span style="color:#0096fd; margin-left:4px;">${listTracks.length}</span> <img src="assets/queue_chevron_down.svg" style="margin-left:4px;" width="14" height="11" alt="" />
            </button>
          ` : `<span class="queue-total-label">전체</span><span class="queue-total-count">${listTracks.length}</span>`}
        </div>
        <div class="queue-ctrl-right">
          <button class="queue-tool-btn" data-action="queue-toggle-edit">${state.queueEdit ? "완료" : "편집"}</button>
          ${!state.queueEdit ? `
            <button class="queue-tool-btn" data-action="queue-open-sort"><span>${state.queueSortLabel}</span><img src="assets/queue_chevron_down.svg" width="14" height="11" alt="" /></button>
            <button class="queue-tool-btn" data-action="queue-toggle-search"><img src="assets/queue_search.svg" width="15" height="15" alt="" /></button>
          ` : ""}
        </div>
      </div>
      `}

      <div class="queue-song-list">
        ${state.queueTab === "my" && !state.queueMyPlaylistId ? `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding-top:100px;">
            <div style="font-size:16px; color:#141414; font-weight:700; margin-bottom:16px;">나의 플레이리스트를 선택하세요!</div>
            <button data-action="queue-my-open-sheet" style="padding:10px 16px; background:#dcdcdc; color:#333; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer;">플레이리스트 보기</button>
          </div>
        ` : (state.queueTab === "external" ? `
          <div style="padding: 16px; text-align: center; border-bottom: 1px solid #f4f4f4; margin-bottom: 8px;">
            <button data-action="go-audio-tab" style="padding: 12px 24px; background: #0096fd; color: #fff; border: none; border-radius: 24px; font-weight: bold; font-size: 15px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,150,253,0.3);">오디오 바로가기</button>
          </div>
        ` : "") + queueItems + observerEl}
      </div>

      ${state.queueEdit && state.sheet !== "save-to-playlist" ? `
        <div class="pld-edit-toolbar-wrap" style="background:#0096fd;">
          ${selectedCount > 0 ? `<div class="pld-count-badge-floating" style="background:#0096fd; color:#fff; border: 2px solid #fff;">${selectedCount}</div>` : ""}
          <div class="pld-edit-toolbar" style="background:#0096fd; border: none; padding-top: 10px;">
            <button class="pld-tool-btn" data-action="queue-play-selected" style="color:#fff;"><img src="assets/queue_play.png" width="24" height="24" style="margin-bottom: 4px;" alt="선택듣기"/><span style="font-size: 11px;">선택듣기</span></button>
            <button class="pld-tool-btn" data-action="queue-add-to" style="color:#fff;"><img src="assets/queue_add.png" width="24" height="24" style="margin-bottom: 4px;" alt="추가/담기"/><span style="font-size: 11px;">추가/담기</span></button>
            <button class="pld-tool-btn" data-action="queue-download" style="color:#fff;"><img src="assets/queue_download.png" width="24" height="24" style="margin-bottom: 4px;" alt="다운"/><span style="font-size: 11px;">다운</span></button>
            <button class="pld-tool-btn" data-action="queue-delete" style="color:#fff;"><img src="assets/queue_delete.png" width="24" height="24" style="margin-bottom: 4px;" alt="삭제"/><span style="font-size: 11px;">삭제</span></button>
            <button class="pld-tool-btn" data-action="queue-clear-selected" style="color:#fff;"><img src="assets/queue_cancel.png" width="24" height="24" style="margin-bottom: 4px;" alt="선택취소"/><span style="font-size: 11px;">선택취소</span></button>
          </div>
        </div>
      ` : `
        <div class="queue-player">
          <div class="queue-player-inner">
            <button class="queue-zap-btn" data-action="queue-zap" aria-label="빠른선곡"><img src="assets/queue_zap.svg" width="36" height="36" alt="zap" /></button>
            <div class="queue-player-ctrls">
              <button class="queue-ctrl-btn" data-action="prev" aria-label="이전"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 6h2v12H6zm3.5 6l8.5 6V6z\'/></svg></button>
              <button class="queue-ctrl-play" data-action="toggle" aria-label="${state.paused ? "재생" : "일시정지"}">${state.paused ? "<svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg>" : "<svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 19h4V5H6v14zm8-14v14h4V5h-4z\'/></svg>"}</button>
              <button class="queue-ctrl-btn" data-action="next" aria-label="다음"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z\'/></svg></button>
            </div>
            <div class="queue-player-thumb" style="${current && current.cover ? `background-image:url(${current.cover}); background-size:cover;` : `background-color:${current && current.color ? current.color : '#8CC7BF'};`}"></div>
          </div>
        </div>
      `}
    </div> `;
}

function addSongScreen() {
  const count = state.addSongSelectedIds.length;
  let listHtml = "";

  if (state.addSongTab === "queue") {
    const qList = state.queueTracks;
    listHtml = qList.length === 0
      ? `<div style="padding: 60px 0; text-align: center; color: #888;">재생목록이 비어있습니다.</div>`
      : qList.map(t => {
        const isSelected = state.addSongSelectedIds.includes(t.id.toString());
        const coverBg = t.cover ? `background-image:url(${t.cover}); background-size:cover;` : `background-color:${t.color || "#8CC7BF"};`;
        return `
            <div class="pld-song-item" data-action="toggle-add-song-select" data-id="${t.id}" style="cursor:pointer; display:flex; align-items:center; padding:12px 16px; border-bottom:1px solid #f4f4f4;">
              <div class="pld-checkbox${isSelected ? " is-checked" : ""}" style="margin-right:12px;"></div>
              <div class="pld-song-thumb" style="${coverBg}; width:40px; height:40px; border-radius:4px; margin-right:12px;"></div>
              <div class="pld-song-info" style="flex:1; min-width:0;">
                <div class="pld-song-title" style="font-weight:600; font-size:15px; color:#141414; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.title}</div>
                <div class="pld-song-artist" style="font-size:13px; color:#888; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</div>
              </div>
            </div>`;
      }).join("");
  } else {
    const sList = state.addSongSearchResults;
    listHtml = `
      <div style="padding: 16px; display:flex; gap:8px;">
        <input type="text" id="add-song-search-input" value="${state.addSongSearchQuery}" placeholder="어떤 곡을 추가할까요?" 
          style="flex: 1; height: 44px; padding: 0 16px; border-radius: 12px; border: none; background: #f0f0f0; font-size: 15px; outline: none;" />
        <button data-action="do-add-song-search" style="width: 64px; height: 44px; border-radius: 12px; background: #121212; color: #fff; font-weight: 600;">검색</button>
      </div>
      ${state.isAddSongSearching
        ? `<div style="padding: 60px 0; text-align: center; color: #888;">검색 중...</div>`
        : sList.length > 0
          ? sList.map(t => {
            const isSelected = state.addSongSelectedIds.includes(t.id.toString());
            return `
                <div class="pld-song-item" data-action="toggle-add-song-select" data-id="${t.id}" style="cursor:pointer; display:flex; align-items:center; padding:12px 16px; border-bottom:1px solid #f4f4f4;">
                  <div class="pld-checkbox${isSelected ? " is-checked" : ""}" style="margin-right:12px;"></div>
                  <img src="${t.cover}" style="width:40px; height:40px; border-radius:4px; object-fit:cover; margin-right:12px;" />
                  <div class="pld-song-info" style="flex:1; min-width:0;">
                    <div class="pld-song-title" style="font-weight:600; font-size:15px; color:#141414; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.title}</div>
                    <div class="pld-song-artist" style="font-size:13px; color:#888; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</div>
                  </div>
                </div>`;
          }).join("")
          : state.addSongSearchQuery ? `<div style="padding: 60px 0; text-align: center; color: #888;">검색 결과가 없습니다.</div>` : ""
      }`;
  }

  return `
    <div class="pld-page" style="background:#fff; height:100vh; display:flex; flex-direction:column; position:absolute; top:0; left:0; width:100%; z-index:2000;">
      <div class="pld-top-bar" style="border-bottom:none; display:flex; justify-content:space-between; align-items:center; padding:0 16px; height:56px;">
        <button class="pld-back-btn" data-action="close-add-song" style="font-size:24px; background:none; border:none; cursor:pointer;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></button>
        <h2 style="font-size:18px; font-weight:700;">곡 추가</h2>
        <button data-action="submit-add-songs" style="background:none; border:none; font-size:16px; font-weight:600; color:${count > 0 ? '#1ed760' : '#ccc'}; cursor:${count > 0 ? 'pointer' : 'default'};">완료</button>
      </div>
      
      <div style="display:flex; border-bottom:1px solid #eee;">
        <button data-action="add-song-tab" data-tab="queue" style="flex:1; padding:12px 0; font-size:15px; font-weight:600; background:none; border:none; border-bottom:2px solid ${state.addSongTab === 'queue' ? '#141414' : 'transparent'}; color:${state.addSongTab === 'queue' ? '#141414' : '#888'}; cursor:pointer;">재생목록</button>
        <button data-action="add-song-tab" data-tab="search" style="flex:1; padding:12px 0; font-size:15px; font-weight:600; background:none; border:none; border-bottom:2px solid ${state.addSongTab === 'search' ? '#141414' : 'transparent'}; color:${state.addSongTab === 'search' ? '#141414' : '#888'}; cursor:pointer;">곡검색</button>
      </div>

      <div style="overflow-y:auto; flex:1; padding-bottom: 20px;">
        ${listHtml}
      </div>
    </div>`;
}

function libraryScreen() {
  if (state.libraryView === "detail") return playlistDetailScreen();
  if (state.libraryView === "search") return playlistSearchScreen();
  if (state.libraryView === "edit") return playlistEditScreen();
  if (state.libraryView === "add-song") return addSongScreen();
  return libraryMainScreen();
}

function tabScreen() {
  const rows = tabCopy[state.tab] || [];
  return `<section class="page" >
    <div class="lib-header">
      <h1>${tabs.find((tab) => tab.id === state.tab).label}</h1>
      <div class="lib-header-right">
        <button class="lib-pass-btn" data-action="pass">이용권</button>
        <button class="avatar" data-action="profile" style="width:32px;height:32px;border-radius:50%;padding:0;background:none;border:none;cursor:pointer;"><img src="assets/frame_14.png" width="32" height="32" alt="프로필" style="border-radius:50%;" /></button>
      </div>
    </div>
    <div class="empty-list">${rows.map((row) => `<div class="row">${row}</div>`).join("")}</div>
  </section> `;
}

function sheet() {
  if (state.sheet === "pass") return `<div class="sheet-back" data-action="close-sheet" > <div class="sheet" data-stop><h3>이용권</h3><p>광고 없이 고음질로 들을 수 있습니다.</p><button class="close" data-action="close-sheet">닫기</button></div></div> `;
  if (state.sheet === "queue") return `<div class="sheet-back" data-action="close-sheet" > <div class="sheet" data-stop><h3>재생목록</h3>${tracks.map((t, i) => `<button class="queue-item${state.index === i ? " is-on" : ""}" data-action="play" data-index="${i}"><span class="swatch" style="background:${t.color}"></span><strong>${t.title}</strong></button>`).join("")}</div></div> `;
  if (state.sheet === "queue-my-playlist-select") {
    const listHtml = myPlaylists.length > 0 ? myPlaylists.map(pl => `
              <div style="display:flex; align-items:center; padding:12px 24px;">
                <div data-action="queue-my-select-playlist" data-id="${pl.id}" style="display:flex; align-items:center; flex:1; cursor:pointer;">
                  <div style="width:48px; height:48px; background:#8CC7BF; border-radius:4px; margin-right:16px;"></div>
                  <div style="flex:1;">
                    <div style="font-size:16px; font-weight:700; color:#141414; margin-bottom:4px;">${pl.title}</div>
                    <div style="font-size:13px; color:#aaa;">${pl.tracks.length}곡</div>
                  </div>
                </div>
                <div data-action="queue-my-play-playlist" data-id="${pl.id}" style="font-size:24px; color:#141414; padding: 10px; cursor:pointer;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></div>
              </div>
            `).join("") : `<div style="padding: 100px 0; text-align: center; color: #141414; font-size: 16px; font-weight: 700;">리스트가 없습니다.</div>`;

    return `
      <div class="sheet-back" data-action="close-sheet">
        <div class="sheet" style="padding:0; background:#fff; border-radius:16px 16px 0 0;" data-stop>
          <div style="padding: 24px 24px 16px 24px;">
            <div style="font-size: 18px; font-weight: 700; color: #141414;">내 플레이리스트 선택</div>
          </div>
          <div style="max-height: 400px; min-height: 200px; overflow-y:auto; padding-bottom: 20px;">
            ${listHtml}
          </div>
          <button data-action="close-sheet" style="width:100%; padding:16px; background:#fff; border:none; border-top: 1px solid #f0f0f0; font-size:15px; color:#888; font-weight:600; cursor:pointer;">취소</button>
        </div>
      </div>
    `;
  }
  return "";
}

function miniPlayer() {
  const track = currentTrack();
  if (!track) {
    return `
      <div class="mini">
        <div class="now" style="justify-content: center; color: #141414; font-size: 14px; font-weight: 500;">재생할 곡을 추가해 주세요.</div>
        <div class="controls">
          <button data-action="prev" aria-label="이전" style="color:#000;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 6h2v12H6zm3.5 6l8.5 6V6z\'/></svg></button>
          <button class="play" data-action="toggle" aria-label="재생" style="color:#000;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></button>
          <button data-action="next" aria-label="다음" style="color:#000;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z\'/></svg></button>
          <button class="queue" data-action="queue" aria-label="재생목록" style="color:#000;">☰</button>
        </div>
      </div>
    `;
  }
  return `
      <div class="mini" >
      <div class="now" data-action="open-full-player" style="cursor: pointer;"><strong>${track.title}</strong><span>${track.artist}</span></div>
      <div class="controls">
        <button data-action="prev" aria-label="이전"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 6h2v12H6zm3.5 6l8.5 6V6z\'/></svg></button>
        <button class="play" data-action="toggle" aria-label="${state.paused ? "재생" : "일시정지"}">${state.paused ? "<svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg>" : "<svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 19h4V5H6v14zm8-14v14h4V5h-4z\'/></svg>"}</button>
        <button data-action="next" aria-label="다음"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z\'/></svg></button>
        <button class="queue" data-action="queue" aria-label="재생목록">☰</button>
      </div>
    </div> `;
}

function fullPlayerScreen() {
  const track = currentTrack();
  if (!track) return "";

  const cover = track.cover || track.artworkUrl600 || track.artworkUrl100 || "";
  const title = track.title || "";
  const artist = track.artist || "";

  return `
    <div id="full-player-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; background: #333; color: #fff; display: flex; flex-direction: column; transform: translateY(0); transition: transform 0.3s ease;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;">
        <button data-action="close-full-player" style="background: none; border: none; color: #fff; font-size: 32px; font-weight: 300;">⌄</button>
        <div style="flex:1;"></div>
      </div>
      
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px;">
        ${cover ? `<img src="${cover}" style="width: 100%; max-width: 320px; aspect-ratio: 1; border-radius: 8px; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />` : `<div style="width: 100%; max-width: 320px; aspect-ratio: 1; border-radius: 8px; background: #444; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></div>`}
      </div>
      
      <div style="padding: 0 24px 40px;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</h2>
          <div style="font-size: 15px; color: #aaa;">${artist}</div>
        </div>
        
        <div style="margin-bottom: 32px;">
          <div id="full-player-progress-wrapper" style="height: 20px; display: flex; align-items: center; cursor: pointer; margin: -8px 0; touch-action: none;">
            <div style="height: 4px; background: #555; border-radius: 2px; position: relative; width: 100%; pointer-events: none;">
              <div id="full-player-progress" style="height: 100%; background: #0096fd; width: 0%; border-radius: 2px; pointer-events: none;"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #aaa;">
            <span id="full-player-current-time">00:00</span>
            <span id="full-player-duration">${formatTimeStr(audioPlayer.duration || 30)}</span>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px;">
          <button data-action="seek-backward" style="background: none; border: none; color: #fff; font-size: 24px;">↺</button>
          <button data-action="prev" style="background: none; border: none; color: #fff; font-size: 28px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 6h2v12H6zm3.5 6l8.5 6V6z\'/></svg></button>
          <button data-action="toggle" style="background: none; border: none; color: #fff; font-size: 40px;">${state.paused ? "<svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg>" : "<svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 19h4V5H6v14zm8-14v14h4V5h-4z\'/></svg>"}</button>
          <button data-action="next" style="background: none; border: none; color: #fff; font-size: 28px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z\'/></svg></button>
          <button data-action="seek-forward" style="background: none; border: none; color: #fff; font-size: 24px;">↻</button>
        </div>
      </div>
    </div>
  `;
}

function loginScreen() {
  return `
    <div style="background: #fff; width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 500; display: flex; flex-direction: column;">
      <header style="display: flex; align-items: center; justify-content: center; height: 56px; position: relative; border-bottom: 1px solid transparent;">
        <button data-action="close-login" style="position: absolute; left: 16px; background: none; border: none; font-size: 24px; color: #141414; padding: 0; cursor: pointer; font-weight: 300;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></button>
        <h2 style="font-size: 18px; font-weight: 700; color: #141414; margin: 0;">로그인</h2>
      </header>
      
      <div style="padding: 24px 20px; flex: 1;">
        <div style="text-align: right; margin-bottom: 12px;">
          <span style="font-size: 13px; color: #555; cursor: pointer; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">키보드 자판보기 <img src="assets/queue_chevron_down.svg" width="10" height="6" alt="" style="opacity: 0.5;"/></span>
        </div>
        
        <input type="text" placeholder="지니 아이디" style="width: 100%; padding: 16px; background: #f8f8f8; border: none; border-radius: 4px; font-size: 15px; margin-bottom: 12px; box-sizing: border-box; outline: none; color: #141414;" />
        <input type="password" placeholder="비밀번호" style="width: 100%; padding: 16px; background: #f8f8f8; border: none; border-radius: 4px; font-size: 15px; margin-bottom: 24px; box-sizing: border-box; outline: none; color: #141414;" />
        
        <button data-action="close-login" style="width: 100%; padding: 16px; background: #0096fd; color: #fff; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; margin-bottom: 24px; cursor: pointer;">로그인</button>
        
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #333;">
          <span style="cursor: pointer; font-weight: 500;">회원가입 &gt;</span>
          <span>
            <span style="cursor: pointer; color: #555;">아이디 찾기</span> <span style="color: #ddd; margin: 0 8px;">|</span> <span style="cursor: pointer; color: #555;">비밀번호 찾기</span>
          </span>
        </div>
        
        <div style="display: flex; justify-content: center; gap: 16px; margin-top: 48px;">
          <button style="width: 50px; height: 50px; border-radius: 50%; background: #fff; border: 1px solid #e0e0e0; padding: 0; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button style="width: 50px; height: 50px; border-radius: 50%; background: #fee500; border: none; padding: 0; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4C6.5 4 2 7.6 2 12c0 2.5 1.4 4.8 3.6 6.3-.3 1.2-1 3.5-1 3.5s-.1.2 0 .2.2 0 .3-.1l4.2-2.8c.9.2 1.9.4 2.9.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z" fill="#3c1e1e"/></svg>
          </button>
          <button style="width: 50px; height: 50px; border-radius: 50%; background: #3b5998; border: none; padding: 0; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 8H17V5H14C11.5 5 10 6.5 10 9V11H8V14H10V21H13V14H16L17 11H13V9C13 8.5 13.5 8 14 8H15Z" fill="white"/></svg>
          </button>
          <button style="width: 50px; height: 50px; border-radius: 50%; background: #000; border: none; padding: 0; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.9 3H21.5L14 11.5L22.5 21H16.5L11.5 14L5.5 21H3L11 12L3 3H9.5L14 9.5L18.9 3ZM17.5 19H19L7 5H5.5L17.5 19Z" fill="white"/></svg>
          </button>
          <button style="width: 50px; height: 50px; border-radius: 50%; background: #000; border: none; padding: 0; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 4.5C16.8 3.5 17.3 2.3 17.1 1C15.9 1.1 14.5 1.8 13.6 2.8C12.9 3.6 12.3 4.9 12.5 6.2C13.8 6.3 15.2 5.5 16 4.5ZM17.3 13.5C17.3 10.3 19.9 8.8 20 8.7C18.4 6.4 16 6 15.2 5.9C13.1 5.7 11.1 7.2 10 7.2C8.9 7.2 7.3 5.9 5.5 6C3.2 6 1.1 7.4 0 9.4C-2.2 13.3 1.3 19.2 3.5 22.3C4.5 23.8 5.7 25.5 7.4 25.4C8.9 25.3 9.5 24.3 11.4 24.3C13.3 24.3 13.8 25.4 15.4 25.4C17.1 25.4 18.1 23.8 19.1 22.3C20.4 20.4 20.9 18.6 20.9 18.5C20.8 18.4 17.3 17.2 17.3 13.5Z" fill="white" transform="scale(0.85) translate(2,0)"/></svg>
          </button>
        </div>
      </div>
      
      <div style="padding: 24px; font-size: 13px; color: #888; line-height: 1.5; letter-spacing: -0.3px;">
        &middot; 로그인 완료 시 지니앱에 '자동 로그인' 됩니다. 본인 기기가 아니거나 여러 사람이 사용중인 기기인 경우 [내정보]에서 '로그아웃'을 해주세요.
      </div>
    </div>
  `;
}

function render() {
  // [요구사항 1] 전체 DOM 갱신 시 스크롤 포지션 리셋 방지 로직
  const mainEl = document.querySelector(".main");
  const queueEl = document.querySelector(".queue-song-list");
  const pldSearchEl = document.querySelector(".pld-search-view");
  const pldEditEl = document.querySelector(".pld-edit-view");
  const albumEl = document.getElementById("search-album-container");
  const audioDetailEl = document.getElementById("audio-detail-scroll-container");

  const scrollState = {
    main: mainEl ? mainEl.scrollTop : 0,
    queue: queueEl ? queueEl.scrollTop : 0,
    pldSearch: pldSearchEl ? pldSearchEl.scrollTop : 0,
    pldEdit: pldEditEl ? pldEditEl.scrollTop : 0,
    searchAlbum: albumEl ? albumEl.scrollLeft : 0,
    audioDetail: audioDetailEl ? audioDetailEl.scrollTop : 0,
  };

  if (state.showQueue) {
    app.innerHTML = `${queueScreen()}${sheet()}${sortBottomSheet()}${saveToPlaylistSheet()}${typeof promptModal !== 'undefined' ? promptModal() : ''} `;
  } else if (state.showAudio) {
    app.innerHTML = `${audioScreen()}${sheet()}${typeof promptModal !== 'undefined' ? promptModal() : ''}
      <div class="dock" style="z-index: 51;">
        ${miniPlayer()}
      </div>
    `;
  } else if (state.showLogin) {
    app.innerHTML = loginScreen();
  } else {
    const showGlobalHeader = state.tab === "home";
    const showChips = state.tab === "home" && state.screen === "home";
    const isEditing = state.tab === "library" && state.libraryView === "edit" && state.sheet !== "save-to-playlist";
    const isSearchEditing = state.tab === "search" && state.selectedSearchIds && state.selectedSearchIds.length > 0 && state.sheet !== "save-to-playlist";
    const selectedCount = state.selectedSongIds.length;
    let body;
    if (state.tab === "search") {
      if (state.searchView === "album") body = searchAlbumScreen();
      else body = searchScreen();
    }
    else if (state.tab === "library") body = libraryScreen();
    else if (state.tab === "home") body = state.screen === "home" ? homeScreen() : listScreen();
    else body = tabScreen();

    app.innerHTML = `
        ${showGlobalHeader ? `<header class="header">${state.tab === "home" ? `<button class="logo" data-action="logo" aria-label="지니 홈"><img src="assets/logo.png" alt="genie" /></button>` : `<div style="flex:1;"></div>`}<div class="header-right"><button class="pass" data-action="pass">이용권</button><button class="avatar" data-action="profile" style="padding:0;background:none;border:none;cursor:pointer;"><img src="assets/frame_14.png" width="32" height="32" alt="프로필" style="border-radius:50%;" /></button></div></header>` : ""}
      ${showChips ? `<nav class="chips"><div class="chip-row">${state.chips.map((c) => `<button class="chip${c === state.chip ? " is-on" : ""}" data-action="chip" data-chip="${c}">${c}</button>`).join("")}</div></nav>` : ""}
    <main class="main" ${isSearchEditing ? 'style="padding-bottom: 70px;"' : ""}>${body}</main>
      ${isEditing
        ? `
        <div class="pld-edit-toolbar-wrap" style="background:#0096fd;">
          ${selectedCount > 0 ? `<div class="pld-count-badge-floating" style="background:#0096fd; color:#fff; border: 2px solid #fff;">${selectedCount}</div>` : ""}
          <div class="pld-edit-toolbar" style="background:#0096fd; border: none; padding-top: 10px;">
            <button class="pld-tool-btn" data-action="edit-move-up" style="color:#fff;"><img src="assets/edit_up.svg" width="24" height="24" style="margin-bottom: 4px;" alt="위로"/><span style="font-size: 11px;">위로</span></button>
            <button class="pld-tool-btn" data-action="edit-move-top" style="color:#fff;"><img src="assets/edit_top.svg" width="24" height="24" style="margin-bottom: 4px;" alt="맨위로"/><span style="font-size: 11px;">맨위로</span></button>
            <button class="pld-tool-btn" data-action="edit-move-bottom" style="color:#fff;"><img src="assets/edit_bottom.svg" width="24" height="24" style="margin-bottom: 4px;" alt="맨아래로"/><span style="font-size: 11px;">맨아래로</span></button>
            <button class="pld-tool-btn" data-action="edit-delete" style="color:#fff;"><img src="assets/edit_delete.png" width="24" height="24" style="margin-bottom: 4px;" alt="삭제"/><span style="font-size: 11px;">삭제</span></button>
            <button class="pld-tool-btn" data-action="edit-clear-selected" style="color:#fff;"><img src="assets/edit_cancel.png" width="24" height="24" style="margin-bottom: 4px;" alt="선택취소"/><span style="font-size: 11px;">선택취소</span></button>
          </div>
        </div>`
        : isSearchEditing ? `
        <div class="pld-edit-toolbar-wrap" style="background:#0096fd;">
          <div class="pld-count-badge-floating" style="background:#0096fd; color:#fff; border: 2px solid #fff;">${state.selectedSearchIds.length}</div>
          <div class="pld-edit-toolbar" style="background:#0096fd; border: none; padding-top: 10px;">
            <button class="pld-tool-btn" data-action="search-play-selected" style="color:#fff;"><span class="icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></span><span>듣기</span></button>
            <button class="pld-tool-btn" data-action="search-add-selected" style="color:#fff;"><span class="icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z\'/></svg></span><span>추가</span></button>
            <button class="pld-tool-btn" data-action="search-save-selected" style="color:#fff;"><span class="icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z\'/></svg></span><span>담기</span></button>
            <button class="pld-tool-btn" style="color:#fff;"><span class="icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\'/></svg></span><span>다운</span></button>
            <button class="pld-tool-btn" style="color:#fff;"><span class="icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M9 15h4v6h2v-6h4l-7-7-7 7zM5 3v2h14V3H5z\'/></svg></span><span>공유</span></button>
            <button class="pld-tool-btn" data-action="search-clear-selected" style="color:#fff;"><span class="icon"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></span><span>선택취소</span></button>
          </div>
        </div>
        `
          : (state.sheet !== "save-to-playlist" ? `<div class="dock">
        ${miniPlayer()}
        <nav class="tabs">${tabs.map((tab) => `<button class="tab${state.tab === tab.id ? " is-on" : ""}" data-action="tab" data-tab="${tab.id}"><img src="${tab.icon}" width="24" height="24" alt="" />${tab.label}</button>`).join("")}</nav>
      </div>` : "")
      }
      ${sheet()}
      ${sortBottomSheet()}
      ${saveToPlaylistSheet()}
      ${typeof promptModal !== 'undefined' ? promptModal() : ''}
    `;
  }

  // 모든 탭(큐, 오디오, 메인)에 공통으로 들어가는 Toast, Full Player 렌더링
  if (state.toastMessage || state.showFullPlayer) {
    app.innerHTML += `
      ${state.toastMessage ? `
      <div class="toast-container" style="position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%); background: #1a1a1a; color: white; padding: 14px 20px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; width: 90%; max-width: 340px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; animation: fadein 0.3s;">
        <span style="font-size: 15px; font-weight: 400;">${state.toastMessage}</span>
        <button data-action="close-toast" style="background: none; border: none; color: #888; font-size: 20px; line-height: 1; padding: 0 0 0 16px; cursor: pointer;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\'/></svg></button>
      </div>` : ""}
      ${state.showFullPlayer ? fullPlayerScreen() : ""}
    `;
  }

  // DOM 재작성 이후 기존 스크롤 위치 복원
  const newMainEl = document.querySelector(".main");
  const newQueueEl = document.querySelector(".queue-song-list");
  const newPldSearchEl = document.querySelector(".pld-search-view");
  const newPldEditEl = document.querySelector(".pld-edit-view");
  const newAlbumEl = document.getElementById("search-album-container");
  const newAudioDetailEl = document.getElementById("audio-detail-scroll-container");

  if (newMainEl) newMainEl.scrollTop = scrollState.main;
  if (newQueueEl) newQueueEl.scrollTop = scrollState.queue;
  if (newPldSearchEl) newPldSearchEl.scrollTop = scrollState.pldSearch;
  if (newPldEditEl) newPldEditEl.scrollTop = scrollState.pldEdit;
  if (newAlbumEl) newAlbumEl.scrollLeft = scrollState.searchAlbum;
  if (newAudioDetailEl) newAudioDetailEl.scrollTop = scrollState.audioDetail;

  // Pagination 적용을 위한 IntersectionObserver 바인딩
  setupIntersectionObserver();
  setupFullPlayerSwipe();
  setupFullPlayerProgressDrag();
}

function setupFullPlayerProgressDrag() {
  const wrapper = document.getElementById("full-player-progress-wrapper");
  if (!wrapper) return;

  function updateProgress(clientX) {
    const w = document.getElementById("full-player-progress-wrapper");
    const progressEl = document.getElementById("full-player-progress");
    const timeEl = document.getElementById("full-player-current-time");
    if (!w || !progressEl) return 0;

    const rect = w.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const duration = audioPlayer.duration || 30;

    progressEl.style.width = `${ratio * 100}%`;
    if (timeEl) timeEl.innerText = formatTimeStr(duration * ratio);

    return duration * ratio;
  }

  // DOM 갱신될 때마다 wrapper에 바인딩
  wrapper.addEventListener("mousedown", (e) => {
    window.isProgressDragging = true;
    updateProgress(e.clientX);
  });

  wrapper.addEventListener("touchstart", (e) => {
    window.isProgressDragging = true;
    updateProgress(e.touches[0].clientX);
  }, { passive: true });

  // 전역 이벤트 리스너는 한 번만 바인딩
  if (!window.progressDragInitialized) {
    window.progressDragInitialized = true;

    window.addEventListener("mousemove", (e) => {
      if (!window.isProgressDragging) return;
      updateProgress(e.clientX);
    });

    window.addEventListener("mouseup", (e) => {
      if (!window.isProgressDragging) return;
      window.isProgressDragging = false;
      const newTime = updateProgress(e.clientX);
      audioPlayer.currentTime = newTime;
    });

    window.addEventListener("touchmove", (e) => {
      if (!window.isProgressDragging) return;
      updateProgress(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      if (!window.isProgressDragging) return;
      window.isProgressDragging = false;
      if (e.changedTouches && e.changedTouches.length > 0) {
        const newTime = updateProgress(e.changedTouches[0].clientX);
        audioPlayer.currentTime = newTime;
      }
    });
  }
}

function setupFullPlayerSwipe() {
  const container = document.getElementById("full-player-container");
  if (!container) return;

  let startY = 0;
  let currentY = 0;

  container.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    container.style.transition = "none";
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    currentY = e.touches[0].clientY - startY;
    if (currentY > 0) {
      container.style.transform = `translateY(${currentY}px)`;
    }
  }, { passive: true });

  container.addEventListener("touchend", () => {
    container.style.transition = "transform 0.3s ease";
    if (currentY > 150) {
      state.showFullPlayer = false;
      render();
    } else {
      container.style.transform = `translateY(0)`;
    }
    currentY = 0;
  });
}

// 3000곡 렌더링 최적화를 위한 Intersection Observer (무한 스크롤 / Pagination 기법)
// 한 번에 모든 DOM을 생성하지 않고, 스크롤이 하단에 닿을 때마다 30개씩 추가 렌더링하여
// 메모리 누수 방지 및 렌더링 지연(성능 최적화)을 달성합니다.
function setupIntersectionObserver() {
  if (state.observer) {
    state.observer.disconnect();
  }

  state.observer = new IntersectionObserver((entries) => {
    let shouldRender = false;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.id === "pld-observer") {
          state.pldVisibleCount += 30;
          shouldRender = true;
        } else if (entry.target.id === "queue-observer") {
          state.queueVisibleCount += 30;
          shouldRender = true;
        } else if (entry.target.id === "pld-edit-observer") {
          state.pldEditVisibleCount += 30;
          shouldRender = true;
        } else if (entry.target.id === "pld-search-observer") {
          state.pldSearchVisibleCount += 30;
          shouldRender = true;
        } else if (entry.target.id === "search-api-observer") {
          loadMoreSearchResults();
        } else if (entry.target.id === "search-album-observer") {
          loadMoreSearchAlbums();
        }
      }
    });
    // 옵저버에 의해 카운트가 증가하면 추가 항목 렌더링 실행
    if (shouldRender) render();
  }, { rootMargin: '100px' });

  // 화면별 하단 센서 대상 등록
  const pldTarget = document.getElementById("pld-observer");
  if (pldTarget) state.observer.observe(pldTarget);

  const queueTarget = document.getElementById("queue-observer");
  if (queueTarget) state.observer.observe(queueTarget);

  const pldEditTarget = document.getElementById("pld-edit-observer");
  if (pldEditTarget) state.observer.observe(pldEditTarget);

  const pldSearchTarget = document.getElementById("pld-search-observer");
  if (pldSearchTarget) state.observer.observe(pldSearchTarget);

  const searchApiTarget = document.getElementById("search-api-observer");
  if (searchApiTarget) state.observer.observe(searchApiTarget);

  const searchAlbumTarget = document.getElementById("search-album-observer");
  if (searchAlbumTarget) state.observer.observe(searchAlbumTarget);
}

// --- 6. 이벤트 핸들러 ---
function getSelectedTracksToSave() {
  if (state.selectedSearchIds && state.selectedSearchIds.length > 0) {
    const searchTracks = state.searchResults.filter(t => state.selectedSearchIds.includes(t.id.toString()));
    const albumTracks = (state.currentAlbumTracks || []).filter(t => state.selectedSearchIds.includes(t.id.toString()));
    return [...searchTracks, ...albumTracks];
  } else if (state.selectedQueueIds && state.selectedQueueIds.length > 0) {
    return state.queueTracks.filter((t, i) => state.selectedQueueIds.includes((t.id || (i + 1)).toString()));
  } else if (state.selectedSongIds && state.selectedSongIds.length > 0) {
    const pl = getCurrentPlaylist();
    if (pl) return pl.tracks.filter(t => state.selectedSongIds.includes(t.id.toString()));
  }
  return [];
}

function saveToPlaylistSheet() {
  if (state.sheet !== "save-to-playlist") return "";

  const selectedTracks = getSelectedTracksToSave();
  const selectedCount = selectedTracks.length;
  const plList = myPlaylists.map(pl => `
    <div data-action="search-save-to-specific" data-id="${pl.id}" style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px; cursor: pointer;">
      <div style="width: 56px; height: 56px; border-radius: 8px; overflow: hidden; background: ${pl.color};">
        ${pl.tracks.length > 0 && pl.tracks[0].cover ? `<img src="${pl.tracks[0].cover}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
      </div>
      <div style="flex: 1;">
        <div style="font-size: 16px; font-weight: 500; color: #141414; margin-bottom: 4px;">${pl.title}</div>
        <div style="font-size: 14px; color: #888;">${pl.tracks.length}곡</div>
      </div>
    </div>
  `).join("");

  return `
    <div class="sheet-overlay" data-action="close-sheet"></div>
    <div class="sheet" style="padding: 24px 20px;">
      <h3 style="font-size: 18px; font-weight: bold; margin: 0 0 24px 0;">담을 곡 <span style="color: #0096fd;">(총 ${selectedCount}곡)</span></h3>
      
      <div data-action="search-save-create-new" style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; cursor: pointer;">
        <div style="width: 56px; height: 56px; background: #e5e5e5; border-radius: 8px; display: flex; justify-content: center; align-items: center;">
          <span style="font-size: 24px; color: #fff;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z\'/></svg></span>
        </div>
        <div style="font-size: 16px; font-weight: 500; color: #141414;">새 플레이리스트 만들기</div>
      </div>
      
      <div style="max-height: 40vh; overflow-y: auto;">
        ${plList}
      </div>
      
      <div style="margin-top: 32px; text-align: center;">
        <button data-action="close-sheet" style="font-size: 16px; color: #888; font-weight: 500;">취소</button>
      </div>
    </div>
  `;
}

function promptModal() {
  if (!state.promptType) return "";
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return `
    <div class="sheet-overlay" style="z-index: 500;" data-action="prompt-cancel"></div>
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 280px; background: #fff; border-radius: 16px; padding: 24px; z-index: 501; box-shadow: 0 4px 20px rgba(0,0,0,0.15); display: flex; flex-direction: column; align-items: center;">
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 24px; color: #000;">플레이리스트명</div>
      <input type="text" id="prompt-input" placeholder="${dateStr}" style="width: 100%; height: 48px; background: #f8f8f8; border: none; border-radius: 8px; padding: 0 16px; font-size: 15px; color: #141414; box-sizing: border-box; margin-bottom: 24px; outline: none;" />
      <div style="display: flex; width: 100%;">
        <button data-action="prompt-cancel" style="flex: 1; height: 48px; background: none; border: none; font-size: 15px; color: #888; font-weight: 500; cursor: pointer;">취소</button>
        <button data-action="prompt-confirm" style="flex: 1; height: 48px; background: none; border: none; font-size: 15px; color: #0096fd; font-weight: 600; cursor: pointer;">확인</button>
      </div>
    </div>
  `;
}

function audioScreen() {
  if (state.audioDetail) return audioDetailScreen();

  const renderCards = (episodes, type) => {
    if (episodes.length === 0) return `<div style="padding: 20px; color: #888;">로딩중...</div>`;
    return `<div style="display: flex; gap: 12px; overflow-x: auto; padding: 0 20px 20px; scrollbar-width: none;">
      ${episodes.map(ep => `
        <div data-action="audio-detail" data-id="${ep.trackId}" data-type="${type}" style="flex: none; width: 140px; cursor: pointer;">
          <div style="width: 140px; height: 140px; border-radius: 8px; overflow: hidden; margin-bottom: 8px; position: relative;">
            ${ep.artworkUrl600 ? `<img src="${ep.artworkUrl600}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="width: 100%; height: 100%; background: #e0e0e0;"></div>`}
            <div style="position: absolute; bottom: 8px; right: 8px; width: 28px; height: 28px; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></div>
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #141414; line-height: 1.3; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${ep.trackName}</div>
          <div style="font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ep.collectionName}</div>
        </div>
      `).join("")}
    </div>`;
  };

  return `
    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; background: #fff;">
      <div style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; border-bottom: 1px solid #f4f4f4; flex: none;">
        <button data-action="close-audio" style="font-size: 24px; background: none; border: none; cursor: pointer;">‹</button>
        <div style="font-size: 18px; font-weight: 700;">오디오</div>
        <button class="avatar" style="width:32px;height:32px;border-radius:50%;padding:0;background:none;"><img src="assets/frame_14.png" width="32" height="32" alt="프로필" style="border-radius:50%;" /></button>
      </div>
      
      <div style="padding: 16px 20px 0; flex: none;">
        <div style="position: relative; width: 100%; height: 48px;">
          <input type="text" id="audio-search-input" value="${state.audioSearchQuery || ''}" placeholder="팟캐스트, 에피소드 검색" style="width: 100%; height: 100%; border: none; background: #f4f4f4; border-radius: 8px; padding: 0 16px 0 44px; font-size: 15px; box-sizing: border-box; outline: none;" />
          <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 16px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\'/></svg></span>
        </div>
      </div>
      
      <div style="flex: 1; overflow-y: auto;">
        ${state.isAudioSearching ? `<div style="padding: 40px; text-align: center; color: #888; font-weight: 500;">검색 중...</div>` :
      (state.audioSearchQuery && state.audioSearchResults.length > 0) ? `
          <div style="padding: 24px 20px 16px;">
            <h2 style="font-size: 18px; font-weight: 800; margin: 0;">검색 결과</h2>
          </div>
          <div style="padding: 0 20px 20px; display: flex; flex-direction: column; gap: 16px;">
            ${state.audioSearchResults.map(ep => `
              <div data-action="audio-detail" data-id="${ep.trackId}" data-type="search" style="display: flex; gap: 12px; align-items: center; cursor: pointer;">
                <div style="width: 64px; height: 64px; border-radius: 8px; overflow: hidden; flex: none; position: relative;">
                  <img src="${ep.artworkUrl600}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 15px; font-weight: 600; color: #141414; line-height: 1.3; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ep.trackName}</div>
                  <div style="font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ep.collectionName}</div>
                </div>
              </div>
            `).join("")}
          </div>
        ` : (state.audioSearchQuery && state.audioSearchResults.length === 0) ? `
          <div style="padding: 40px; text-align: center; color: #888; font-weight: 500;">검색 결과가 없습니다.</div>
        ` : `
          <div style="display: flex; align-items: flex-end; justify-content: space-between; padding: 24px 20px 16px;">
            <h2 style="font-size: 20px; font-weight: 800; margin: 0;">소소한 일상 음악 토크</h2>
          </div>
          ${renderCards(state.audioEpisodesJazz, "jazz")}
          
          <div style="display: flex; align-items: flex-end; justify-content: space-between; padding: 24px 20px 16px;">
            <h2 style="font-size: 20px; font-weight: 800; margin: 0;">쉽게 듣는 클래식</h2>
          </div>
          ${renderCards(state.audioEpisodesClassic, "classic")}
        `}
      </div>
    </div>
  `;
}

function audioDetailScreen() {
  const ep = state.audioDetail;
  const dateStr = ep.releaseDate ? ep.releaseDate.substring(0, 10).replace(/-/g, ".") : "";

  let epsHtml = "";
  if (state.isAudioDetailLoading) {
    epsHtml = `<div style="text-align: center; padding: 20px; color: #888;">에피소드 불러오는 중...</div>`;
  } else if (state.audioDetailEpisodes && state.audioDetailEpisodes.length > 0) {
    epsHtml = state.audioDetailEpisodes.slice(0, state.audioDetailVisibleCount).map(e => {
      const eDate = e.releaseDate ? e.releaseDate.substring(0, 10).replace(/-/g, ".") : "";
      return `
        <div data-action="audio-play-episode" data-epid="${e.trackId}" style="display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid #f4f4f4; cursor: pointer;">
          <div style="width: 48px; height: 48px; border-radius: 4px; overflow: hidden; flex: none;">
            <img src="${e.artworkUrl600 || ep.artworkUrl600}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 14px; font-weight: 600; color: #141414; line-height: 1.3; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.trackName}</div>
            <div style="font-size: 12px; color: #888;">${eDate}</div>
          </div>
          <button style="background: none; border: none; font-size: 18px; color: #888;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z\'/></svg></button>
        </div>
      `;
    }).join("");
  }

  return `
    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; background: #fff;">
      <div style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px;">
        <button data-action="audio-detail-back" style="font-size: 24px; background: none; border: none; cursor: pointer;">‹</button>
        <button style="font-size: 20px; background: none; border: none; font-weight: bold; color: #333;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z\'/></svg></button>
      </div>
      <div id="audio-detail-scroll-container" style="flex: 1; overflow-y: auto; padding: 0 20px 40px;" onscroll="handleAudioDetailScroll(this)">
        <img src="${ep.artworkUrl600}" style="width: 100%; aspect-ratio: 1; border-radius: 8px; object-fit: cover; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; font-weight: 800; color: #141414; line-height: 1.3; margin: 0 0 12px;">${ep.trackName || ep.collectionName}</h1>
        <div style="font-size: 15px; color: #555; margin-bottom: 16px;">${ep.artistName || ep.collectionName}</div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div style="color: #888; font-size: 15px;">💬 ${ep.trackCount ? ep.trackCount + " 에피소드" : "53"}</div>
        </div>
        
        <button data-action="audio-play-all" style="width: 100%; background: #f4f4f4; border: none; border-radius: 8px; padding: 16px; font-size: 16px; font-weight: bold; color: #141414; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: 8px;"><span style="font-size: 14px;"><svg width=\'1em\' height=\'1em\' viewBox=\'0 0 24 24\' fill=\'currentColor\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M8 5v14l11-7z\'/></svg></span> 전체듣기</button>
        
        <div style="font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap; margin-bottom: 32px;">${ep.collectionName}의 팟캐스트입니다.</div>
        
        <h2 style="font-size: 18px; font-weight: 800; margin: 0 0 12px;">에피소드</h2>
        ${epsHtml}
      </div>
    </div>
  `;
}

function showToast(message) {
  state.toastMessage = message;
  render();
  setTimeout(() => {
    if (state.toastMessage === message) {
      state.toastMessage = null;
      render();
    }
  }, 2500);
}

window.handleAudioDetailScroll = function (el) {
  if (el.scrollHeight - el.scrollTop <= el.clientHeight + 150) {
    if (state.audioDetailEpisodes && state.audioDetailVisibleCount < state.audioDetailEpisodes.length) {
      state.audioDetailVisibleCount += 20;
      render();
    }
  }
};

function formatMs(ms) {
  if (!ms) return "00:30";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function playAudioEpisode(ep, podcast) {
  const previewUrl = ep.previewUrl || ep.episodeUrl;
  const newTrack = {
    id: "audio_" + ep.trackId + "_" + Date.now(),
    title: ep.trackName,
    artist: podcast.collectionName || podcast.artistName,
    cover: ep.artworkUrl600 || podcast.artworkUrl600,
    previewUrl: previewUrl,
    color: "#1c2b39",
    time: formatMs(ep.trackTimeMillis),
    addedAt: Date.now()
  };

  // 외부목록 중복 제거 (previewUrl 기준)
  state.externalTracks = state.externalTracks.filter(t => t.previewUrl !== previewUrl);

  state.externalTracks.push(newTrack);
  state.nowPlaying = newTrack;
  state.paused = false;

  if (previewUrl) {
    if (audioPlayer.src !== previewUrl) audioPlayer.src = previewUrl;
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }

  showToast("오디오가 외부목록에 추가되었습니다.");
  render();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || !app.contains(target)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  const index = parseInt(target.dataset.index, 10);

  if (action === "close-toast") {
    state.toastMessage = null;
    return render();
  }

  if (action === "profile") {
    state.showLogin = true;
    return render();
  } else if (action === "close-login") {
    state.showLogin = false;
    return render();
  } else if (action === "clear-recent-searches") {
    state.recentSearches = [];
    return render();
  } else if (action === "delete-recent-search") {
    const keyword = target.dataset.keyword;
    state.recentSearches = state.recentSearches.filter(k => k !== keyword);
    return render();
  } else if (action === "search-recent") {
    const keyword = target.dataset.keyword;
    if (keyword) {
      document.getElementById("search-input").value = keyword;
      performSearch(keyword);
    }
    return;
  } else if (action === "search-genre") {
    const genre = target.dataset.genre;
    if (genre) {
      document.getElementById("search-input").value = genre;
      performSearch(genre, true);
    }
    return;
  }

  if (action === "toggle-search-select") {
    const tid = id.toString();
    if (state.selectedSearchIds.includes(tid)) {
      state.selectedSearchIds = state.selectedSearchIds.filter(i => i !== tid);
    } else {
      state.selectedSearchIds.push(tid);
    }
    return render();
  } else if (action === "search-clear-selected") {
    state.selectedSearchIds = [];
    return render();
  } else if (action === "search-play-selected" || action === "search-add-selected") {
    if (state.selectedSearchIds.length === 0) return;
    const searchTracks = state.searchResults.filter(t => state.selectedSearchIds.includes(t.id.toString()));
    const albumTracks = (state.currentAlbumTracks || []).filter(t => state.selectedSearchIds.includes(t.id.toString()));
    const selectedTracks = [...searchTracks, ...albumTracks];
    if (selectedTracks.length === 0) return;

    if (action === "search-play-selected") {
      const first = selectedTracks[0];
      state.nowPlaying = { title: first.title, artist: first.artist, color: first.color || "#2b3b4a", previewUrl: first.previewUrl, cover: first.coverUrl };
      if (first.previewUrl) {
        if (audioPlayer.src !== first.previewUrl) audioPlayer.src = first.previewUrl;
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
      state.paused = false;
    }

    selectedTracks.forEach(track => {
      const newTrack = {
        id: Date.now() + Math.random(),
        title: track.title,
        artist: track.artist,
        cover: track.coverUrl,
        previewUrl: track.previewUrl,
        color: track.color || "#2b3b4a",
        addedAt: Date.now()
      };
      const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
      if (existingIdx > -1) state.queueTracks.splice(existingIdx, 1);
      state.queueTracks.push(newTrack);
    });

    state.selectedSearchIds = [];
    return render();
  } else if (action === "search-save-selected") {
    state.sheet = "save-to-playlist";
    return render();
  } else if (action === "search-save-create-new") {
    state.promptType = "search-save-create-new";
    return render();
  } else if (action === "search-save-to-specific") {
    const pl = myPlaylists.find(p => p.id.toString() === id.toString());
    if (pl) {
      const selectedTracks = getSelectedTracksToSave();
      selectedTracks.forEach(track => {
        const newTrack = {
          id: Date.now() + Math.random(),
          title: track.title,
          artist: track.artist,
          cover: track.coverUrl || track.cover,
          previewUrl: track.previewUrl,
          color: track.color || "#2b3b4a",
          addedAt: Date.now()
        };
        const existingIdx = pl.tracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) pl.tracks.splice(existingIdx, 1);
        pl.tracks.push(newTrack);
      });
      alert(`선택한 ${selectedTracks.length}곡을 '${pl.title}'에 담았습니다.`);
      state.selectedSearchIds = [];
      state.selectedQueueIds = [];
      state.selectedSongIds = [];
      state.sheet = null;
      return render();
    }
  }

  if (action === "close-sheet" && event.target !== target && !target.classList.contains("close")) return;

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
    if (state.tab === "search") {
      state.searchQuery = "";
      state.isSearching = false;
      state.searchResults = [];
      state.searchAllResults = [];
      state.searchAlbums = [];
      state.searchAllAlbums = [];
      state.searchAlbumHasMore = false;
      state.artistProfile = null;
      state.searchOffset = 0;
      state.searchHasMore = false;
      state.isLoadingMoreSearch = false;
      state.selectedSearchIds = [];
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
    state.expanded = false;
  } else if (action === "pass") {
    state.sheet = "pass";
  } else if (action === "close-sheet") {
    state.sheet = null;
  }

  // --- 재생목록 (Queue) 액션 ---
  else if (action === "queue") {
    state.showQueue = true;
    state.queueTab = "queue";
    state.queueEdit = false;
    state.selectedQueueIds = [];
    state.queueShowSearch = false;
    state.queueSearchQuery = "";
    state.queueVisibleCount = 30; // 큐 진입 시 카운트 리셋
    return render();
  } else if (action === "close-queue") {
    state.showQueue = false;
    state.queueEdit = false;
    state.selectedQueueIds = [];
    state.queueMyPlaylistId = null;
    return render();
  } else if (action === "queue-my-open-sheet") {
    state.sheet = "queue-my-playlist-select";
    return render();
  } else if (action === "queue-my-select-playlist") {
    state.queueMyPlaylistId = target.dataset.id;
    const pl = myPlaylists.find(p => p.id.toString() === state.queueMyPlaylistId);
    if (pl && pl.tracks) {
      pl.tracks.forEach(track => {
        const exists = state.queueTracks.find(t => t.title === track.title && t.artist === track.artist);
        if (!exists) {
          state.queueTracks.push({ ...track, id: Date.now() + Math.random() });
        }
      });
    }
    state.sheet = null;
    return render();
  } else if (action === "queue-my-play-playlist") {
    state.queueMyPlaylistId = target.dataset.id;
    const pl = myPlaylists.find(p => p.id.toString() === state.queueMyPlaylistId);
    if (pl && pl.tracks.length > 0) {
      pl.tracks.forEach(track => {
        const exists = state.queueTracks.find(t => t.title === track.title && t.artist === track.artist);
        if (!exists) {
          state.queueTracks.push({ ...track, id: Date.now() + Math.random() });
        }
      });
      const song = pl.tracks[0];
      state.nowPlaying = {
        title: song.title,
        artist: song.artist,
        color: song.color,
        cover: song.cover,
        previewUrl: song.previewUrl
      };
      state.paused = false;
      if (song.previewUrl) {
        if (audioPlayer.src !== song.previewUrl) audioPlayer.src = song.previewUrl;
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
    }
    state.sheet = null;
    return render();
  } else if (action === "queue-tab") {
    state.queueTab = target.dataset.tab;
    state.queueEdit = false;
    state.selectedQueueIds = [];
    state.queueVisibleCount = 30;
    return render();
  } else if (action === "go-audio-tab") {
    state.showQueue = false;
    state.showAudio = true;
    fetchAudioEpisodes();
    return render();
  } else if (action === "close-audio") {
    state.showAudio = false;
    return render();
  } else if (action === "audio-detail") {
    const id = target.closest("[data-id]").getAttribute("data-id");
    const type = target.closest("[data-type]").getAttribute("data-type");
    let list = type === "jazz" ? state.audioEpisodesJazz : type === "classic" ? state.audioEpisodesClassic : state.audioSearchResults;
    state.audioDetail = list.find(e => (e.trackId || e.collectionId).toString() === id);

    state.audioDetailEpisodes = [];
    state.audioDetailVisibleCount = 20;
    state.isAudioDetailLoading = true;
    render();

    if (state.audioDetail) {
      fetch(`https://itunes.apple.com/lookup?id=${state.audioDetail.collectionId || state.audioDetail.trackId}&entity=podcastEpisode&limit=200&country=kr`)
        .then(r => r.json())
        .then(data => {
          state.audioDetailEpisodes = data.results.filter(r => r.wrapperType === 'podcastEpisode');
          state.isAudioDetailLoading = false;
          render();
        })
        .catch(err => {
          console.error(err);
          state.isAudioDetailLoading = false;
          render();
        });
    }
    return;
  } else if (action === "audio-detail-back") {
    state.audioDetail = null;
    return render();
  } else if (action === "audio-play-all") {
    if (state.audioDetailEpisodes && state.audioDetailEpisodes.length > 0) {
      const podcast = state.audioDetail;
      state.audioDetailEpisodes.forEach((ep, idx) => {
        const previewUrl = ep.previewUrl || ep.episodeUrl;
        const newTrack = {
          id: "audio_" + ep.trackId + "_" + Date.now() + "_" + idx,
          title: ep.trackName,
          artist: podcast.collectionName || podcast.artistName,
          cover: ep.artworkUrl600 || podcast.artworkUrl600,
          previewUrl: previewUrl,
          color: "#1c2b39",
          time: formatMs(ep.trackTimeMillis),
          addedAt: Date.now()
        };
        state.externalTracks = state.externalTracks.filter(t => t.previewUrl !== previewUrl);
        state.externalTracks.push(newTrack);

        if (idx === 0) {
          state.nowPlaying = newTrack;
          state.paused = false;
          if (previewUrl) {
            if (audioPlayer.src !== previewUrl) audioPlayer.src = previewUrl;
            audioPlayer.play();
          } else {
            audioPlayer.pause();
          }
        }
      });
      showToast("모든 에피소드가 외부목록에 추가되었습니다.");
      render();
    } else {
      showToast("에피소드가 없습니다.");
    }
    return;
  } else if (action === "audio-play-episode") {
    const epId = target.closest("[data-epid]").getAttribute("data-epid");
    const ep = state.audioDetailEpisodes.find(e => e.trackId.toString() === epId);
    if (ep) playAudioEpisode(ep, state.audioDetail);
    return;
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
    if (state.queueTab === "my") {
      const pl = myPlaylists.find(p => p.id.toString() === state.queueMyPlaylistId);
      listTracks = pl ? pl.tracks : [];
    }
    else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
    else if (state.queueTab === "external") listTracks = state.externalTracks || [];
    else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);

    const song = listTracks[idx];
    if (song) {
      state.nowPlaying = {
        title: song.title,
        artist: song.artist,
        color: song.color,
        cover: song.cover,
        previewUrl: song.previewUrl
      };
      if (song.previewUrl) {
        if (audioPlayer.src !== song.previewUrl) audioPlayer.src = song.previewUrl;
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
      state.paused = false;
    }
    return render();
  } else if (action === "queue-toggle-select") {
    const songId = target.dataset.id.toString();
    const pos = state.selectedQueueIds.indexOf(songId);
    if (pos > -1) state.selectedQueueIds.splice(pos, 1);
    else state.selectedQueueIds.push(songId);
    return render();
  } else if (action === "queue-toggle-select-all") {
    let listTracks = state.queueTracks;
    if (state.queueTab === "my") {
      const pl = myPlaylists.find(p => p.id.toString() === state.queueMyPlaylistId);
      listTracks = pl ? pl.tracks : [];
    }
    else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
    else if (state.queueTab === "external") listTracks = state.externalTracks || [];
    else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);

    if (state.selectedQueueIds.length === listTracks.length) {
      state.selectedQueueIds = [];
    } else {
      state.selectedQueueIds = listTracks.map((t, i) => (t.id || (i + 1)).toString());
    }
    return render();
  } else if (action === "queue-play-selected") {
    if (state.selectedQueueIds.length === 0) return alert("선택된 곡이 없습니다.");
    alert("아직 준비중인 기능입니다.");
  } else if (action === "queue-download") {
    if (state.selectedQueueIds.length === 0) return alert("선택된 곡이 없습니다.");
    alert("아직 준비중인 기능입니다.");
  } else if (action === "queue-clear-selected") {
    state.selectedQueueIds = [];
    return render();
  } else if (action === "queue-delete") {
    if (state.selectedQueueIds.length > 0) {
      state.queueTracks = state.queueTracks.filter((t, i) => !state.selectedQueueIds.includes((t.id || (i + 1)).toString()));
      state.selectedQueueIds = [];
    }
    return render();
  } else if (action === "queue-add-to") {
    if (state.selectedQueueIds.length === 0) return alert("담을 곡을 선택해주세요.");
    state.sheet = "save-to-playlist";
    return render();
  } else if (action === "queue-zap") {
    alert("이용권 사용자에게만 제공되는 기능입니다.");
    return;
  }

  // --- 내음악 & 플레이리스트 액션 ---
  else if (action === "open-playlist") {
    state.currentPlaylistId = target.dataset.id;
    state.libraryView = "detail";
    state.selectedSongIds = [];
    state.playlistSearchQuery = "";
    state.pldVisibleCount = 30; // 입장 시 리스트 카운트 초기화
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
      }
    } else {
      state.sortOrder = target.dataset.id;
      state.sortOrderLabel = target.dataset.label;
      state.pldVisibleCount = 30; // 정렬 변경 시 최상단부터 렌더링되도록 리셋
    }
    state.showSortSheet = false;
  } else if (action === "open-playlist-search") {
    state.libraryView = "search";
    state.playlistSearchQuery = "";
    state.pldSearchVisibleCount = 30;
    setTimeout(() => {
      const inp = document.getElementById("pld-search-input");
      if (inp) inp.focus();
    }, 50);
  } else if (action === "close-playlist-search") {
    state.libraryView = "detail";
    state.playlistSearchQuery = "";
  } else if (action === "clear-pld-search") {
    state.playlistSearchQuery = "";
    state.pldVisibleCount = 30;
    return render();
  } else if (action === "open-edit-mode") {
    state.libraryView = "edit";
    state.pldEditVisibleCount = 30;
  } else if (action === "close-edit-mode") {
    state.libraryView = "detail";
    state.selectedSongIds = [];
  } else if (action === "toggle-song-select") {
    const songId = target.dataset.id.toString();
    const idx = state.selectedSongIds.indexOf(songId);
    if (idx > -1) state.selectedSongIds.splice(idx, 1);
    else state.selectedSongIds.push(songId);
    return render();
  } else if (action === "toggle-select-all") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === pl.tracks.length) {
      state.selectedSongIds = [];
    } else {
      state.selectedSongIds = pl.tracks.map((t) => t.id.toString());
    }
    return render();
  } else if (action === "play-playlist") {
    const pl = myPlaylists.find((p) => p.id.toString() === target.dataset.id.toString());
    if (pl && pl.tracks.length > 0) {
      const first = pl.tracks[0];
      state.nowPlaying = { title: first.title, artist: first.artist, color: first.color || "#2b3b4a", previewUrl: first.previewUrl, cover: first.cover };
      if (first.previewUrl) {
        if (audioPlayer.src !== first.previewUrl) audioPlayer.src = first.previewUrl;
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
      state.paused = false;

      // 재생목록에 추가
      pl.tracks.forEach(track => {
        const newTrack = {
          id: Date.now() + Math.random(),
          title: track.title,
          artist: track.artist,
          cover: track.cover,
          previewUrl: track.previewUrl,
          color: track.color || "#2b3b4a",
          addedAt: Date.now()
        };
        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) state.queueTracks.splice(existingIdx, 1);
        state.queueTracks.push(newTrack);
      });
    }
    return render();
  } else if (action === "play-playlist-all") {
    const pl = getCurrentPlaylist();
    if (pl && pl.tracks.length > 0) {
      const first = pl.tracks[0];
      state.nowPlaying = { title: first.title, artist: first.artist, color: first.color, previewUrl: first.previewUrl, cover: first.cover };
      if (first.previewUrl) {
        if (audioPlayer.src !== first.previewUrl) audioPlayer.src = first.previewUrl;
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
      state.paused = false;

      // 전체 듣기 시 큐에 모두 추가
      pl.tracks.forEach(track => {
        const newTrack = {
          id: Date.now() + Math.random(),
          title: track.title,
          artist: track.artist,
          cover: track.cover,
          previewUrl: track.previewUrl,
          color: track.color || "#2b3b4a",
          addedAt: Date.now()
        };
        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) state.queueTracks.splice(existingIdx, 1);
        state.queueTracks.push(newTrack);
      });
    }
    return render();
  } else if (action === "play-album-all") {
    if (state.currentAlbumTracks && state.currentAlbumTracks.length > 0) {
      const first = state.currentAlbumTracks[0];
      state.nowPlaying = { title: first.title, artist: first.artist, color: "#2b3b4a", previewUrl: first.previewUrl, cover: first.coverUrl };
      if (first.previewUrl) {
        if (audioPlayer.src !== first.previewUrl) audioPlayer.src = first.previewUrl;
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
      state.paused = false;

      // 전체 듣기 시 큐에 모두 추가
      state.currentAlbumTracks.forEach(track => {
        const newTrack = {
          id: Date.now() + Math.random(),
          title: track.title,
          artist: track.artist,
          cover: track.coverUrl,
          previewUrl: track.previewUrl,
          color: "#2b3b4a",
          addedAt: Date.now()
        };
        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) state.queueTracks.splice(existingIdx, 1);
        state.queueTracks.push(newTrack);
      });
    }
    return render();
  } else if (action === "play-chart-all" || action === "listen-all") {
    if (tracks && tracks.length > 0) {
      const first = tracks[0];
      state.nowPlaying = { title: first.title, artist: first.artist, color: first.color, previewUrl: first.previewUrl, cover: first.cover };
      if (first.previewUrl) {
        if (audioPlayer.src !== first.previewUrl) audioPlayer.src = first.previewUrl;
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
      state.paused = false;

      // 전체 듣기 시 큐에 모두 추가
      tracks.forEach(track => {
        const newTrack = {
          id: Date.now() + Math.random(),
          title: track.title,
          artist: track.artist,
          cover: track.cover,
          previewUrl: track.previewUrl,
          color: track.color || "#2b3b4a",
          addedAt: Date.now()
        };
        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) state.queueTracks.splice(existingIdx, 1);
        state.queueTracks.push(newTrack);
      });
    }
    return render();
  } else if (action === "play-custom") {
    const title = decodeURIComponent(target.dataset.title || "");
    const artist = decodeURIComponent(target.dataset.artist || "");
    const color = target.dataset.color || "#6bbba6";
    const previewUrl = target.dataset.preview || "";
    const cover = target.dataset.cover || "";

    state.nowPlaying = { title, artist, color, previewUrl, cover };
    if (previewUrl) {
      if (audioPlayer.src !== previewUrl) audioPlayer.src = previewUrl;
      audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
    state.paused = false;

    // 재생목록에 추가
    const newTrack = {
      id: Date.now(),
      title,
      artist,
      cover,
      previewUrl,
      color,
      addedAt: Date.now()
    };
    const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
    if (existingIdx > -1) state.queueTracks.splice(existingIdx, 1);
    state.queueTracks.push(newTrack);

    return render();
  } else if (action === "new-playlist") {
    state.promptType = "new-playlist";
    return render();
  } else if (action === "prompt-cancel") {
    state.promptType = null;
    return render();
  } else if (action === "prompt-confirm") {
    const input = document.getElementById("prompt-input");
    const title = input.value.trim() || input.placeholder;
    const type = state.promptType;
    state.promptType = null;

    if (type === "search-save-create-new") {
      const newPlaylist = {
        id: "pl_" + Date.now().toString(),
        title: title,
        color: "#6b7280",
        tracks: []
      };
      const selectedTracks = getSelectedTracksToSave();
      selectedTracks.forEach(track => {
        newPlaylist.tracks.push({
          id: Date.now() + Math.random(),
          title: track.title,
          artist: track.artist,
          cover: track.coverUrl || track.cover,
          previewUrl: track.previewUrl,
          color: track.color || "#2b3b4a",
          addedAt: Date.now()
        });
      });
      myPlaylists.push(newPlaylist);
      alert(`'${title}'이(가) 생성되었고 ${selectedTracks.length}곡이 담겼습니다.`);
      state.selectedSearchIds = [];
      state.selectedQueueIds = [];
      state.selectedSongIds = [];
      state.sheet = null;
      return render();
    } else if (type === "new-playlist") {
      const newId = "pl" + (myPlaylists.length + 1);
      myPlaylists.unshift({
        id: newId,
        title: title,
        sub: "총 0곡",
        time: "0분",
        color: "#6bbba6",
        tracks: [],
      });
      state.currentPlaylistId = newId;
      state.libraryView = "detail";
      state.pldVisibleCount = 30;
      return render();
    }
  } else if (action === "smart-add-songs") {
    alert("아직 준비중인 기능입니다.");
  } else if (action === "edit-move-top") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) return alert("이동할 곡을 선택해주세요.");
    const selected = pl.tracks.filter((t) => state.selectedSongIds.includes(t.id));
    const unselected = pl.tracks.filter((t) => !state.selectedSongIds.includes(t.id));
    pl.tracks = [...selected, ...unselected]; // 원본 배열 순서 갱신 (커스텀 순서 유지)
    return render();
  } else if (action === "edit-move-up") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) return alert("이동할 곡을 선택해주세요.");
    for (let i = 1; i < pl.tracks.length; i++) {
      if (state.selectedSongIds.includes(pl.tracks[i].id) && !state.selectedSongIds.includes(pl.tracks[i - 1].id)) {
        const temp = pl.tracks[i];
        pl.tracks[i] = pl.tracks[i - 1];
        pl.tracks[i - 1] = temp;
      }
    }
    return render();
  } else if (action === "edit-move-down") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) return alert("이동할 곡을 선택해주세요.");
    for (let i = pl.tracks.length - 2; i >= 0; i--) {
      if (state.selectedSongIds.includes(pl.tracks[i].id) && !state.selectedSongIds.includes(pl.tracks[i + 1].id)) {
        const temp = pl.tracks[i];
        pl.tracks[i] = pl.tracks[i + 1];
        pl.tracks[i + 1] = temp;
      }
    }
    return render();
  } else if (action === "edit-move-bottom") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) return alert("이동할 곡을 선택해주세요.");
    const selected = pl.tracks.filter((t) => state.selectedSongIds.includes(t.id));
    const unselected = pl.tracks.filter((t) => !state.selectedSongIds.includes(t.id));
    pl.tracks = [...unselected, ...selected];
    return render();
  } else if (action === "add-song-to-pl") {
    state.libraryView = "add-song";
    state.addSongTab = "queue";
    state.addSongSelectedIds = [];
    state.addSongSearchQuery = "";
    state.addSongSearchResults = [];
  } else if (action === "close-add-song") {
    state.libraryView = "detail";
  } else if (action === "add-song-tab") {
    state.addSongTab = target.dataset.tab;
  } else if (action === "toggle-add-song-select") {
    const id = target.dataset.id.toString();
    if (state.addSongSelectedIds.includes(id)) {
      state.addSongSelectedIds = state.addSongSelectedIds.filter(i => i !== id);
    } else {
      state.addSongSelectedIds.push(id);
    }
  } else if (action === "do-add-song-search") {
    const inp = document.getElementById("add-song-search-input");
    if (inp && inp.value.trim() !== "") {
      state.addSongSearchQuery = inp.value.trim();
      state.isAddSongSearching = true;
      render();
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(state.addSongSearchQuery)}&limit=30&entity=song&country=us`)
        .then(res => res.json())
        .then(data => {
          state.addSongSearchResults = (data.results || []).map(t => ({
            id: t.trackId.toString(),
            title: t.trackName,
            artist: t.artistName,
            cover: t.artworkUrl100 ? t.artworkUrl100.replace("100x100bb", "300x300bb") : "",
            previewUrl: t.previewUrl,
            color: "#2b3b4a"
          }));
          state.isAddSongSearching = false;
          render();
        })
        .catch(e => {
          console.error(e);
          state.isAddSongSearching = false;
          render();
        });
      return;
    }
  } else if (action === "submit-add-songs") {
    if (state.addSongSelectedIds.length > 0) {
      const pl = getCurrentPlaylist();
      if (pl) {
        const tracksToAdd = [];
        state.addSongSelectedIds.forEach(id => {
          let t = state.queueTracks.find(x => x.id.toString() === id);
          if (!t) t = state.addSongSearchResults.find(x => x.id.toString() === id);
          if (t) {
            tracksToAdd.push({
              id: Date.now() + Math.floor(Math.random() * 10000) + "",
              title: t.title,
              artist: t.artist,
              cover: t.cover,
              previewUrl: t.previewUrl,
              color: t.color || "#8CC7BF",
              addedAt: Date.now()
            });
          }
        });
        pl.tracks.unshift(...tracksToAdd);
        pl.sub = `총 ${pl.tracks.length} 곡`;
      }
      state.libraryView = "detail";
    }
  } else if (action === "edit-delete") {
    const pl = getCurrentPlaylist();
    if (state.selectedSongIds.length === 0) return alert("삭제할 곡을 선택해주세요.");
    if (confirm(`선택한 ${state.selectedSongIds.length}개 곡을 플레이리스트에서 삭제하시겠습니까 ? `)) {
      pl.tracks = pl.tracks.filter((t) => !state.selectedSongIds.includes(t.id));
      pl.sub = `총 ${pl.tracks.length} 곡`;
      state.selectedSongIds = [];
    }
    return render();
  } else if (action === "edit-clear-selected") {
    state.selectedSongIds = [];
    return render();
  } else if (action === "edit-add-to") {
    if (state.selectedSongIds.length === 0) return alert("담을 곡을 선택해주세요.");
    state.sheet = "save-to-playlist";
    return render();
  }

  // 오디오 및 검색 제어
  else if (action === "do-search") {
    const input = document.getElementById("search-input");
    if (input) performSearch(input.value);
    return;
  } else if (action === "open-album") {
    const albumId = target.dataset.id;
    const album = state.searchAllAlbums.find(a => a.id == albumId);
    if (!album) return;
    state.searchView = "album";
    state.currentAlbum = album;
    state.currentAlbumTracks = [];
    state.isLoadingAlbum = true;
    render();

    fetch(`https://itunes.apple.com/lookup?id=${albumId}&entity=song`)
      .then(res => res.json())
      .then(data => {
        const songs = data.results.filter(r => r.wrapperType === 'track');
        state.currentAlbumTracks = songs.map(item => ({
          id: item.trackId || (Date.now() + Math.random()),
          title: item.trackName || "제목 없음",
          artist: item.artistName || "알 수 없는 아티스트",
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "300x300bb") : "https://via.placeholder.com/300?text=No+Cover",
          previewUrl: item.previewUrl || null,
        }));
      })
      .catch(err => console.error(err))
      .finally(() => {
        state.isLoadingAlbum = false;
        render();
      });
  } else if (action === "close-album") {
    state.searchView = "main";
    render();
  } else if (action === "play-album-track") {
    const track = state.currentAlbumTracks[Number(target.dataset.index)];
    if (track && track.previewUrl) {
      if (state.nowPlaying === track && !audioPlayer.paused) {
        audioPlayer.pause();
        state.paused = true;
      } else {
        state.nowPlaying = track;
        if (audioPlayer.src !== track.previewUrl) audioPlayer.src = track.previewUrl;
        audioPlayer.play();
        state.paused = false;

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

        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) {
          state.queueTracks.splice(existingIdx, 1);
        }
        state.queueTracks.push(newTrack);
      }
    } else {
      alert("이 곡은 30초 미리듣기를 제공하지 않습니다.");
    }
  } else if (action === "play-search") {
    const track = state.searchResults[Number(target.dataset.index)];
    if (track && track.previewUrl) {
      if (state.nowPlaying === track && !audioPlayer.paused) {
        audioPlayer.pause();
        state.paused = true;
      } else {
        state.nowPlaying = track;
        if (audioPlayer.src !== track.previewUrl) audioPlayer.src = track.previewUrl;
        audioPlayer.play();
        state.paused = false;

        // --- 재생목록(Queue) 하단 자동 추가 로직 (요구사항 3번 반영) ---
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

        const existingIdx = state.queueTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist);
        if (existingIdx > -1) {
          state.queueTracks.splice(existingIdx, 1);
        }

        // 새 트랙을 배열의 끝에 추가하여 '하단 배치' 구현
        state.queueTracks.push(newTrack);
        // --- 추가 로직 끝 ---
      }
    } else {
      alert("이 곡은 30초 미리듣기를 제공하지 않습니다.");
    }
  } else if (action === "open-full-player") {
    state.showFullPlayer = true;
    render();
  } else if (action === "close-full-player") {
    state.showFullPlayer = false;
    render();
  } else if (action === "seek-backward") {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
    return;
  } else if (action === "seek-forward") {
    audioPlayer.currentTime = Math.min(audioPlayer.duration || 30, audioPlayer.currentTime + 15);
    return;
  } else if (action === "seek") {
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const duration = audioPlayer.duration || 30;
    audioPlayer.currentTime = duration * ratio;
    return;
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
      if (state.queueTracks.length === 0) {
        showToast("재생할 수 있는 곡이 없습니다.");
      } else {
        if (state.index < 0) play(0);
        else state.paused = !state.paused;
      }
    }
  } else if (action === "prev" || action === "next") {
    let listTracks = state.queueTracks;
    if (state.showQueue) {
      if (state.queueTab === "my") {
        const pl = myPlaylists.find(p => p.id.toString() === state.queueMyPlaylistId);
        listTracks = pl ? pl.tracks : [];
      }
      else if (state.queueTab === "fast") listTracks = tracks.slice(0, 6);
      else if (state.queueTab === "external") listTracks = state.externalTracks || [];
      else if (state.queueTab === "hires") listTracks = tracks.slice(2, 7);
    }

    if (listTracks.length === 0) return;

    let currentIdx = -1;
    if (state.nowPlaying) {
      currentIdx = listTracks.findIndex(t => t.title === state.nowPlaying.title && t.artist === state.nowPlaying.artist);
    }

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
      state.nowPlaying = {
        title: nextSong.title,
        artist: nextSong.artist,
        cover: nextSong.cover,
        color: nextSong.color,
        previewUrl: nextSong.previewUrl
      };

      if (nextSong.previewUrl) {
        if (audioPlayer.src !== nextSong.previewUrl) audioPlayer.src = nextSong.previewUrl;
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

// 키보드 검색 이벤트 처리
app.addEventListener("input", (event) => {
  if (event.target.id === "queue-search-input") {
    state.queueSearchQuery = event.target.value;
    state.queueVisibleCount = 30; // 렌더링 초기화
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
    state.pldVisibleCount = 30; // 데이터 갱신 시 카운트 리셋

    // 이전에는 DOM을 직접 수정했지만, 안정성을 위해 render를 사용하고 포커스를 되찾는 방식으로 통합했습니다.
    render();
    const inp = document.getElementById("pld-search-input");
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
    return;
  }
});

app.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.id === "search-input") {
    performSearch(event.target.value);
  } else if (event.key === "Enter" && event.target.id === "add-song-search-input") {
    const btn = document.querySelector('[data-action="do-add-song-search"]');
    if (btn) btn.click();
  } else if (event.key === "Enter" && event.target.id === "audio-search-input") {
    performAudioSearch(event.target.value.trim());
  }
});

// Drag and Drop Logic
let draggedItemInfo = null;
let touchHoveredItem = null;

// Desktop HTML5 Drag & Drop
app.addEventListener("dragstart", (e) => {
  const item = e.target.closest(".pld-edit-item") || e.target.closest(".queue-song-item");
  if (item) {
    draggedItemInfo = item.dataset.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.dataset.id);
    setTimeout(() => item.classList.add("dragging"), 0);
  }
});

app.addEventListener("dragover", (e) => {
  const item = e.target.closest(".pld-edit-item") || e.target.closest(".queue-song-item");
  if (item && item.dataset.id !== draggedItemInfo) {
    e.preventDefault();
    item.style.borderTop = "2px solid #141414";
  }
});

app.addEventListener("dragleave", (e) => {
  const item = e.target.closest(".pld-edit-item") || e.target.closest(".queue-song-item");
  if (item) {
    item.style.borderTop = "";
  }
});

app.addEventListener("drop", (e) => {
  const item = e.target.closest(".pld-edit-item") || e.target.closest(".queue-song-item");
  if (item) {
    e.preventDefault();
    item.style.borderTop = "";
    handleDrop(draggedItemInfo, item.dataset.id, item);
  }
  cleanupDrag();
});

app.addEventListener("dragend", (e) => {
  cleanupDrag();
});

// Mobile Touch Drag & Drop
app.addEventListener("touchstart", (e) => {
  const handle = e.target.closest(".pld-drag-handle");
  if (!handle) return;
  const item = handle.closest(".pld-edit-item") || handle.closest(".queue-song-item");
  if (item) {
    draggedItemInfo = item.dataset.id;
    setTimeout(() => item.classList.add("dragging"), 0);
    touchHoveredItem = null;
  }
}, { passive: false });

app.addEventListener("touchmove", (e) => {
  const handle = e.target.closest(".pld-drag-handle");
  if (!handle || !draggedItemInfo) return;
  e.preventDefault(); // Prevent scroll
  
  const touch = e.touches[0];
  const draggingEl = document.querySelector(".dragging");
  if (draggingEl) draggingEl.style.pointerEvents = "none";
  
  const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (draggingEl) draggingEl.style.pointerEvents = "";

  const item = elementUnderTouch ? (elementUnderTouch.closest(".pld-edit-item") || elementUnderTouch.closest(".queue-song-item")) : null;
  
  const allItems = document.querySelectorAll(".pld-edit-item, .queue-song-item");
  allItems.forEach(i => i.style.borderTop = "");
  
  if (item && item.dataset.id !== draggedItemInfo) {
    item.style.borderTop = "2px solid #141414";
    touchHoveredItem = item;
  } else {
    touchHoveredItem = null;
  }
}, { passive: false });

app.addEventListener("touchend", (e) => {
  const handle = e.target.closest(".pld-drag-handle");
  if (!handle || !draggedItemInfo) return;
  
  if (touchHoveredItem) {
    touchHoveredItem.style.borderTop = "";
    handleDrop(draggedItemInfo, touchHoveredItem.dataset.id, touchHoveredItem);
  }
  cleanupDrag();
});

function handleDrop(sourceId, targetId, item) {
  if (sourceId && targetId && sourceId !== targetId) {
    if (item.classList.contains("pld-edit-item")) {
      const pl = getCurrentPlaylist();
      if (pl) {
        const fromIdx = pl.tracks.findIndex(t => t.id.toString() === sourceId);
        const toIdx = pl.tracks.findIndex(t => t.id.toString() === targetId);
        if (fromIdx > -1 && toIdx > -1) {
          const track = pl.tracks.splice(fromIdx, 1)[0];
          pl.tracks.splice(toIdx, 0, track);
          render();
        }
      }
    } else if (item.classList.contains("queue-song-item")) {
      const fromIdx = state.queueTracks.findIndex(t => (t.id || t.title).toString() === sourceId);
      const toIdx = state.queueTracks.findIndex(t => (t.id || t.title).toString() === targetId);
      if (fromIdx > -1 && toIdx > -1) {
        const track = state.queueTracks.splice(fromIdx, 1)[0];
        state.queueTracks.splice(toIdx, 0, track);
        render();
      }
    }
  }
}

function cleanupDrag() {
  const allItems = document.querySelectorAll(".pld-edit-item, .queue-song-item");
  allItems.forEach(i => { i.classList.remove("dragging"); i.style.borderTop = ""; });
  draggedItemInfo = null;
  touchHoveredItem = null;
}

// --- 6. 초기 실행 및 인기차트 로딩 ---
async function fetchTopTracks() {
  try {
    const res = await fetch("https://itunes.apple.com/us/rss/topsongs/limit=100/json");
    const data = await res.json();
    if (data && data.feed && data.feed.entry) {
      const newTracks = data.feed.entry.map((entry, index) => {
        const title = entry["im:name"].label;
        const artist = entry["im:artist"].label;
        const images = entry["im:image"];
        const cover = images && images.length > 0 ? images[images.length - 1].label.replace(/170x170bb/g, "300x300bb").replace(/55x55bb/g, "300x300bb").replace(/60x60bb/g, "300x300bb") : "https://via.placeholder.com/300?text=No+Cover";

        let previewUrl = null;
        if (Array.isArray(entry.link)) {
          const audioLink = entry.link.find(l => l.attributes && l.attributes.title === "Preview");
          if (audioLink) previewUrl = audioLink.attributes.href;
        } else if (entry.link && entry.link.attributes && entry.link.attributes.title === "Preview") {
          previewUrl = entry.link.attributes.href;
        }

        const deltas = ["up", "down", "same"];
        return {
          id: entry.id.attributes ? entry.id.attributes["im:id"] : Date.now() + index,
          title: title,
          artist: artist,
          cover: cover,
          previewUrl: previewUrl,
          delta: deltas[Math.floor(Math.random() * deltas.length)],
          amount: Math.floor(Math.random() * 10),
          color: "#2b3b4a",
          addedAt: Date.now()
        };
      });
      tracks.length = 0;
      tracks.push(...newTracks);
      render();
    }
  } catch (e) {
    console.error("차트 불러오기 실패:", e);
  }
}
fetchTopTracks();
render();

// 딥링크 및 URL 파라미터 제어
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
