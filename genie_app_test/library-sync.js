// 게스트 기록은 localStorage, 로그인 후에는 Supabase 본인 행에만 저장합니다.
(function () {
  const GUEST_KEY = "genie.guest.library.v1";
  const PROVIDERS = {
    google: "google",
  };

  let client = null;
  let callbacks = null;
  let booted = false;
  let activeUserId = null;
  let remoteReady = false;
  let suppress = 0;
  let epoch = 0;
  let saveTimer = 0;
  let saveGen = 0;
  let schemaReady = true;
  let lastSerialized = "";

  function emptyLibrary() {
    return {
      playlists: [],
      likedTracks: [],
      queueTracks: [],
      recentSearches: [],
    };
  }

  function trackIdentity(track) {
    return `${(track.title || "").trim().toLowerCase()}::${(track.artist || "").trim().toLowerCase()}`;
  }

  function readGuest() {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return emptyLibrary();
      const data = JSON.parse(raw);
      return {
        playlists: Array.isArray(data.playlists) ? data.playlists : [],
        likedTracks: Array.isArray(data.likedTracks) ? data.likedTracks : [],
        queueTracks: Array.isArray(data.queueTracks) ? data.queueTracks : [],
        recentSearches: Array.isArray(data.recentSearches)
          ? data.recentSearches.slice(0, 10)
          : [],
      };
    } catch (error) {
      console.warn("게스트 기록을 읽지 못했습니다.", error);
      return emptyLibrary();
    }
  }

  function writeGuest(snapshot) {
    const data = snapshot || emptyLibrary();
    localStorage.setItem(
      GUEST_KEY,
      JSON.stringify({
        playlists: data.playlists || [],
        likedTracks: data.likedTracks || [],
        queueTracks: data.queueTracks || [],
        recentSearches: (data.recentSearches || []).slice(0, 10),
      }),
    );
  }

  function clearGuest() {
    localStorage.removeItem(GUEST_KEY);
  }

  function hasLibraryData(snapshot) {
    return (
      (snapshot.playlists && snapshot.playlists.length > 0) ||
      (snapshot.likedTracks && snapshot.likedTracks.length > 0) ||
      (snapshot.queueTracks && snapshot.queueTracks.length > 0) ||
      (snapshot.recentSearches && snapshot.recentSearches.length > 0)
    );
  }

  function mergeTracks(base, extra) {
    const seen = new Set((base || []).map(trackIdentity));
    const next = [...(base || [])];
    (extra || []).forEach((track) => {
      const key = trackIdentity(track);
      if (!key || seen.has(key)) return;
      seen.add(key);
      next.push(track);
    });
    return next;
  }

  function mergeLibraries(remote, guest) {
    const remoteIds = new Set((remote.playlists || []).map((pl) => String(pl.id)));
    const guestOnly = [];
    const guestById = new Map();
    (guest.playlists || []).forEach((pl) => {
      const id = String(pl.id);
      guestById.set(id, pl);
      if (!remoteIds.has(id)) guestOnly.push(pl);
    });

    const playlists = [
      ...guestOnly,
      ...(remote.playlists || []).map((pl) => {
        const guestPl = guestById.get(String(pl.id));
        if (!guestPl) return pl;
        return { ...pl, tracks: mergeTracks(pl.tracks, guestPl.tracks) };
      }),
    ];

    const likedSeen = new Set();
    const likedTracks = [];
    [...(guest.likedTracks || []), ...(remote.likedTracks || [])].forEach((track) => {
      const key = track.trackKey || trackIdentity(track);
      if (!key || likedSeen.has(key)) return;
      likedSeen.add(key);
      likedTracks.push({ ...track, trackKey: key });
    });

    return {
      playlists,
      likedTracks,
      queueTracks: mergeTracks(remote.queueTracks, guest.queueTracks),
      recentSearches: [
        ...(guest.recentSearches || []),
        ...(remote.recentSearches || []),
      ]
        .filter((keyword, index, list) => keyword && list.indexOf(keyword) === index)
        .slice(0, 10),
    };
  }

  function rowsToLibrary(playlistRows, likeRows, stateRow) {
    const playlists = (playlistRows || [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((row) => ({
        id: row.id,
        title: row.title,
        sub: row.sub || "",
        time: row.time_label || "",
        color: row.color || "#6b7280",
        cover: row.cover || "",
        sourceId: row.source_id || undefined,
        tracks: Array.isArray(row.tracks) ? row.tracks : [],
      }));

    const likedTracks = (likeRows || []).map((row) => ({
      trackKey: row.track_key,
      title: row.title,
      artist: row.artist,
      cover: row.cover || "",
      previewUrl: row.preview_url || "",
      color: row.color || "#2b3b4a",
      addedAt: row.liked_at ? Date.parse(row.liked_at) : Date.now(),
    }));

    return {
      playlists,
      likedTracks,
      queueTracks: Array.isArray(stateRow?.queue_tracks) ? stateRow.queue_tracks : [],
      recentSearches: Array.isArray(stateRow?.recent_searches)
        ? stateRow.recent_searches
        : [],
    };
  }

  function missingTable(error) {
    return error && (error.code === "PGRST205" || error.code === "42P01");
  }

  async function fetchRemote(userId) {
    const [playlists, likes, library] = await Promise.all([
      client.from("playlists").select("*").eq("user_id", userId),
      client.from("liked_tracks").select("*").eq("user_id", userId),
      client.from("library_state").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    const error = playlists.error || likes.error || library.error;
    if (error) throw error;
    return rowsToLibrary(playlists.data, likes.data, library.data);
  }

  function quoteIn(values) {
    return `(${values
      .map((value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(",")})`;
  }

  async function writeRemote(userId, snapshot) {
    const playlists = (snapshot.playlists || []).map((pl, index) => ({
      user_id: userId,
      id: String(pl.id),
      title: pl.title || "플레이리스트",
      sub: pl.sub || null,
      time_label: pl.time || null,
      color: pl.color || null,
      cover: pl.cover || (pl.tracks && pl.tracks[0] && pl.tracks[0].cover) || null,
      source_id: pl.sourceId || null,
      position: index,
      tracks: pl.tracks || [],
      updated_at: new Date().toISOString(),
    }));

    const likes = (snapshot.likedTracks || []).map((track) => ({
      user_id: userId,
      track_key: track.trackKey || trackIdentity(track),
      title: track.title || "",
      artist: track.artist || "",
      cover: track.cover || null,
      preview_url: track.previewUrl || null,
      color: track.color || null,
      liked_at: new Date(track.addedAt || Date.now()).toISOString(),
    }));

    if (playlists.length) {
      const upserted = await client.from("playlists").upsert(playlists, {
        onConflict: "user_id,id",
      });
      if (upserted.error) throw upserted.error;
    }
    const playlistIds = playlists.map((pl) => pl.id);
    let removePlaylists = client.from("playlists").delete().eq("user_id", userId);
    if (playlistIds.length) removePlaylists = removePlaylists.not("id", "in", quoteIn(playlistIds));
    const removedPlaylists = await removePlaylists;
    if (removedPlaylists.error) throw removedPlaylists.error;

    if (likes.length) {
      const upsertedLikes = await client.from("liked_tracks").upsert(likes, {
        onConflict: "user_id,track_key",
      });
      if (upsertedLikes.error) throw upsertedLikes.error;
    }
    const likeKeys = likes.map((track) => track.track_key);
    let removeLikes = client.from("liked_tracks").delete().eq("user_id", userId);
    if (likeKeys.length) removeLikes = removeLikes.not("track_key", "in", quoteIn(likeKeys));
    const removedLikes = await removeLikes;
    if (removedLikes.error) throw removedLikes.error;

    const savedState = await client.from("library_state").upsert(
      {
        user_id: userId,
        queue_tracks: snapshot.queueTracks || [],
        recent_searches: (snapshot.recentSearches || []).slice(0, 10),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (savedState.error) throw savedState.error;
  }

  async function upsertProfile(user) {
    const meta = user.user_metadata || {};
    const saved = await client.from("profiles").upsert(
      {
        id: user.id,
        display_name:
          meta.full_name || meta.name || meta.user_name || user.email || "회원",
        avatar_url: meta.avatar_url || meta.picture || null,
        provider: user.app_metadata?.provider || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (saved.error && !missingTable(saved.error)) {
      console.warn("프로필 저장 실패", saved.error);
    }
  }

  function paint(user) {
    if (!callbacks) return;
    callbacks.onUser(user);
    callbacks.onPaint();
  }

  function applyQuiet(snapshot) {
    suppress += 1;
    callbacks.applySnapshot(snapshot);
    lastSerialized = JSON.stringify(callbacks.getSnapshot());
    suppress -= 1;
  }

  async function adoptSession(session) {
    const user = session && session.user;
    if (
      user &&
      activeUserId === user.id &&
      remoteReady &&
      !hasLibraryData(readGuest())
    ) {
      callbacks.onUser(user);
      return;
    }

    const token = ++epoch;
    if (!user) {
      activeUserId = null;
      remoteReady = false;
      applyQuiet(readGuest());
      if (token === epoch) paint(null);
      return;
    }

    try {
      const remote = await fetchRemote(user.id);
      if (token !== epoch) return;
      schemaReady = true;
      const guest = readGuest();
      let merged = hasLibraryData(guest) ? mergeLibraries(remote, guest) : remote;
      if (hasLibraryData(guest)) {
        await writeRemote(user.id, merged);
        const guestAfter = readGuest();
        if (token !== epoch) return;
        if (JSON.stringify(guestAfter) !== JSON.stringify(guest)) {
          merged = mergeLibraries(remote, guestAfter);
          await writeRemote(user.id, merged);
        }
        clearGuest();
      }
      await upsertProfile(user);
      if (token !== epoch) return;
      activeUserId = user.id;
      remoteReady = true;
      applyQuiet(merged);
      paint(user);
      if (hasLibraryData(guest)) callbacks.onNotice("비회원 기록을 계정으로 옮겼습니다.");
    } catch (error) {
      if (token !== epoch) return;
      console.error(error);
      activeUserId = user.id;
      remoteReady = false;
      applyQuiet(readGuest());
      paint(user);
      if (missingTable(error)) {
        schemaReady = false;
        callbacks.onNotice("Supabase 테이블이 없습니다. supabase/schema.sql을 실행해 주세요.");
      } else {
        callbacks.onNotice("계정 기록을 불러오지 못했습니다. 이 브라우저 기록을 유지합니다.");
      }
    }
  }

  function scheduleRemote() {
    if (!client || !activeUserId || !remoteReady) return;
    const gen = ++saveGen;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const userId = activeUserId;
      const snapshot = callbacks.getSnapshot();
      try {
        await writeRemote(userId, snapshot);
        if (gen !== saveGen || userId !== activeUserId) return;
      } catch (error) {
        console.error(error);
        if (gen !== saveGen) return;
        if (missingTable(error)) {
          schemaReady = false;
          remoteReady = false;
          writeGuest(snapshot);
          callbacks.onNotice("Supabase 테이블이 없습니다. supabase/schema.sql을 실행해 주세요.");
          return;
        }
        callbacks.onNotice("계정 저장에 실패해 이 브라우저에 임시 보관했습니다.");
        writeGuest(snapshot);
      }
    }, 700);
  }

  function createClient() {
    const config = window.GENIE_SUPABASE || {};
    if (!window.supabase || !config.url || !config.key) return null;
    return window.supabase.createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  window.GenieSync = {
    hydrateGuest(applySnapshot) {
      applySnapshot(readGuest());
    },

    start(nextCallbacks) {
      callbacks = nextCallbacks;
      if (booted) return;
      booted = true;
      client = createClient();
      if (!client) {
        callbacks.onNotice("Supabase 클라이언트를 불러오지 못했습니다. 브라우저 기록만 사용합니다.");
        return;
      }
      client.auth.getSession().then(({ data, error }) => {
        if (error) console.error(error);
        return adoptSession(data && data.session);
      });
      client.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION") return;
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          adoptSession(session);
        }
      });
    },

    noteChange() {
      if (!callbacks || suppress > 0) return;
      const snapshot = callbacks.getSnapshot();
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      if (!activeUserId || !remoteReady) {
        writeGuest(snapshot);
        return;
      }
      scheduleRemote();
    },

    async signIn(provider) {
      const name = PROVIDERS[provider];
      if (!name) return;
      if (!client) {
        callbacks && callbacks.onNotice("Supabase 연결 후 다시 시도해 주세요.");
        return;
      }
      if (location.protocol === "file:") {
        callbacks &&
          callbacks.onNotice("소셜 로그인은 http://localhost 로 연 페이지에서 동작합니다.");
        return;
      }
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await client.auth.signInWithOAuth({
        provider: name,
        options: { redirectTo, skipBrowserRedirect: false },
      });
      if (error && callbacks) callbacks.onNotice(error.message || "로그인에 실패했습니다.");
    },

    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error && callbacks) callbacks.onNotice("로그아웃에 실패했습니다.");
    },

    currentUser() {
      return activeUserId;
    },

    schemaReady() {
      return schemaReady;
    },
  };
})();
