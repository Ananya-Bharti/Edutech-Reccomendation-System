"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

/* ─── Types ─── */
interface Video {
  video_id: string;
  title: string;
  tags: string[];
  category: string;
  subcategory: string;
  difficulty: string;
  creator_name: string;
  creator_id: string;
  duration: number;
  video_url: string;
  video_file: string;
  target_audience: string;
  view_count: number;
  like_count: number;
  share_count: number;
  save_count: number;
  comment_count: number;
}
interface User {
  user_id: string;
  name: string;
  aspirant_type: string;
  interests: string[];
  bio: string;
}
interface Creator {
  id: string;
  name: string;
  category: string;
  specialty: string;
  bio: string;
  videoCount: number;
  totalViews: number;
  totalLikes: number;
}

/* ─── User profiles with distinct interests ─── */
const DEMO_USERS: User[] = [
  {
    user_id: "demo_student",
    name: "Demo Student",
    aspirant_type: "engineering",
    interests: ["coding", "campus", "college", "placement", "nit", "software", "startup", "developer"],
    bio: "CS undergraduate exploring campus life and coding careers",
  },
  {
    user_id: "test_eng_001",
    name: "Rahul Kumar",
    aspirant_type: "engineering",
    interests: ["gate", "calculus", "mechanics", "iit", "physics", "mathematics", "engineering"],
    bio: "GATE aspirant focused on core engineering fundamentals",
  },
  {
    user_id: "test_med_001",
    name: "Priya Sharma",
    aspirant_type: "medical",
    interests: ["neet", "biology", "anatomy", "physiology", "mbbs", "doctor", "healthcare"],
    bio: "NEET aspirant passionate about medical sciences",
  },
  {
    user_id: "test_mba_001",
    name: "Amit Patel",
    aspirant_type: "mba",
    interests: ["cat", "finance", "consulting", "iim", "strategy", "management", "marketing"],
    bio: "CAT aspirant interested in finance and consulting",
  },
];

/* ─── Creator profiles ─── */
const CREATOR_DATA: Record<string, Omit<Creator, "videoCount" | "totalViews" | "totalLikes">> = {
  "Dr. Sharma": { id: "creator_001", name: "Dr. Sharma", category: "engineering", specialty: "Mathematics & Physics", bio: "Professor at IIT Delhi with 15+ years of teaching experience. Specializes in making complex engineering concepts simple and engaging." },
  "Prof. Verma": { id: "creator_002", name: "Prof. Verma", category: "engineering", specialty: "Computer Science", bio: "Associate Professor at NIT Trichy. Passionate about coding education and software engineering fundamentals." },
  "Mentor Ravi": { id: "creator_003", name: "Mentor Ravi", category: "engineering", specialty: "Career Guidance", bio: "Former Google engineer turned educational content creator. Guides students on placements and tech careers." },
  "Tech Expert": { id: "creator_004", name: "Tech Expert", category: "engineering", specialty: "GATE Preparation", bio: "GATE AIR 23 holder. Creates targeted preparation content for engineering entrance exams." },
  "Eng Counselor": { id: "creator_005", name: "Eng Counselor", category: "engineering", specialty: "Admissions & Campus", bio: "Education counselor helping students navigate IIT/NIT admissions and campus life decisions." },
  "Prof. Gupta": { id: "creator_002", name: "Prof. Gupta", category: "engineering", specialty: "Mechanical Engineering", bio: "HOD Mechanical Engineering at BITS Pilani. Makes thermodynamics and mechanics accessible." },
  "Dr. Patel": { id: "creator_006", name: "Dr. Patel", category: "medical", specialty: "General Medicine", bio: "MBBS from AIIMS, MD in Internal Medicine. Creates clinical case-based learning content for NEET aspirants." },
  "Dr. Mehta": { id: "creator_007", name: "Dr. Mehta", category: "medical", specialty: "Anatomy & Physiology", bio: "Anatomy professor at CMC Vellore. Known for detailed visual explanations of human body systems." },
  "Prof. Anjali": { id: "creator_008", name: "Prof. Anjali", category: "medical", specialty: "Biochemistry", bio: "PhD in Biochemistry from JNU. Simplifies complex biochemical pathways for medical students." },
  "Dr. Kapoor": { id: "creator_009", name: "Dr. Kapoor", category: "medical", specialty: "Surgery", bio: "Practicing surgeon at Fortis Hospital. Shares real-world medical insights and surgery preparation tips." },
  "Medical Mentor": { id: "creator_010", name: "Medical Mentor", category: "medical", specialty: "NEET Preparation", bio: "NEET AIR 12 holder. Dedicated to helping medical aspirants crack the exam with smart strategies." },
  "Prof. Rao": { id: "creator_011", name: "Prof. Rao", category: "mba", specialty: "Quantitative Aptitude", bio: "IIM Ahmedabad alumnus and CAT trainer for 10+ years. Specializes in quant shortcuts and strategies." },
  "MBA Mentor": { id: "creator_012", name: "MBA Mentor", category: "mba", specialty: "Interview Prep", bio: "IIM Bangalore graduate, ex-McKinsey consultant. Coaches students on GD/PI and case interviews." },
  "Business Expert": { id: "creator_013", name: "Business Expert", category: "mba", specialty: "Strategy & Finance", bio: "MBA from ISB Hyderabad, 8 years in investment banking. Creates content on business strategy and financial concepts." },
  "Strategy Coach": { id: "creator_014", name: "Strategy Coach", category: "mba", specialty: "Consulting", bio: "Former BCG consultant. Teaches frameworks for business problem solving and case competitions." },
  "IIM Professor": { id: "creator_015", name: "IIM Professor", category: "mba", specialty: "Marketing", bio: "Marketing faculty at IIM Calcutta. Brings real-world brand case studies to the classroom." },
};

/* ─── Demo video fallback ─── */
const TITLES: Record<string, string[]> = {
  engineering: ["JEE Physics Quick Tips", "Understanding Mechanics", "GATE Prep Guide", "IIT Campus Life", "Career as Data Scientist", "Engineering Math", "Understanding Calculus", "NIT Campus Life", "Career as SWE", "IIIT Campus Life", "Understanding Thermodynamics", "GATE Prep Strategy", "JEE Chemistry Tips", "Engineering Physics", "Career in Tech", "Placement Prep Guide", "Coding Interview Tips"],
  medical: ["NEET Biology Revision", "Anatomy Made Easy", "MBBS Journey", "Medical Student Life", "Career as Surgeon", "Understanding Physiology", "NEET Chemistry Tips", "Cell Biology Basics", "Career as Cardiologist", "Understanding Anatomy", "NEET Physics Revision", "MBBS College Life", "Career as Physician", "Medical Entrance Tips", "Healthcare Careers", "Organic Chemistry Made Easy", "Doctor's Daily Routine"],
  mba: ["CAT Quantitative Tips", "IIM Interview Prep", "MBA in Finance", "Business School Life", "Strategy Concepts", "Marketing Concepts", "CAT Verbal Tips", "Management Fundamentals", "Finance Concepts", "MBA Career in Consulting", "Business School Rankings", "Case Study Approach", "GMAT vs CAT", "Entrepreneurship 101", "IIM Application Guide", "Consulting Career Path"],
};
const TAG_POOL: Record<string, string[]> = {
  engineering: ["jee", "physics", "mathematics", "coding", "iit", "gate", "calculus", "nit", "placement", "tech", "mechanics"],
  medical: ["neet", "biology", "anatomy", "mbbs", "chemistry", "physiology", "hospital", "doctor", "healthcare", "aiims"],
  mba: ["cat", "quantitative", "finance", "consulting", "iim", "strategy", "marketing", "gmat", "management", "business"],
};
const CREATORS_LIST: Record<string, string[]> = {
  engineering: ["Dr. Sharma", "Prof. Gupta", "Mentor Ravi", "Tech Expert", "Eng Counselor"],
  medical: ["Dr. Patel", "Dr. Mehta", "Prof. Anjali", "Dr. Kapoor", "Medical Mentor"],
  mba: ["Prof. Rao", "MBA Mentor", "Business Expert", "Strategy Coach", "IIM Professor"],
};

function makeDemoVideos(): Video[] {
  const cats: ("engineering" | "medical" | "mba")[] = ["engineering", "medical", "mba"];
  return Array.from({ length: 30 }, (_, i) => {
    const cat = cats[i % 3];
    return {
      video_id: `vid_${String(i + 1).padStart(3, "0")}`,
      title: TITLES[cat][i % TITLES[cat].length],
      tags: TAG_POOL[cat].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3)),
      category: cat,
      subcategory: ["exam", "college", "career"][i % 3],
      difficulty: ["beginner", "intermediate", "advanced"][i % 3],
      creator_name: CREATORS_LIST[cat][i % CREATORS_LIST[cat].length],
      creator_id: `creator_${String((i % 5) + 1).padStart(3, "0")}`,
      duration: 35 + Math.floor(Math.random() * 55),
      video_url: "",
      video_file: `${cat}/vid_${String(i + 1).padStart(3, "0")}.mp4`,
      target_audience: `${cat}_aspirant`,
      view_count: Math.floor(Math.random() * 8000),
      like_count: Math.floor(Math.random() * 1200),
      share_count: Math.floor(Math.random() * 400),
      save_count: Math.floor(Math.random() * 500),
      comment_count: Math.floor(Math.random() * 250),
    };
  });
}

/* ═════════════════════════════════════════════════
   CLIENT-SIDE RECOMMENDATION ENGINE
   ═════════════════════════════════════════════════ */
function scoreVideosForUser(
  videos: Video[],
  user: User,
  likedSet: Set<string>,
  savedSet: Set<string>
): Video[] {
  const scored = videos.map((v) => {
    let score = 0;

    // 1. Category match (60% weight base)
    if (v.category === user.aspirant_type) {
      score += 60;
    } else {
      score += 5; // small score for cross-category discovery
    }

    // 2. Interest tag overlap (25% weight)
    const userInterests = new Set(user.interests.map((t) => t.toLowerCase()));
    const overlap = v.tags.filter((t) => userInterests.has(t.toLowerCase())).length;
    score += overlap * 12; // each matching tag = 12 points

    // 3. Subcategory match for interests
    if (user.interests.some((i) => v.subcategory?.toLowerCase().includes(i.toLowerCase()))) {
      score += 8;
    }
    if (user.interests.some((i) => v.title.toLowerCase().includes(i.toLowerCase()))) {
      score += 10;
    }

    // 4. Engagement boost — videos user has liked/saved score higher (15% weight)
    if (likedSet.has(v.video_id)) score += 15;
    if (savedSet.has(v.video_id)) score += 10;

    // 5. Small random jitter so two same-score videos don't always appear in the same order
    score += Math.random() * 3;

    return { video: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.video);
}

/* ─── SVG Icons ─── */
const SearchSVG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="search-icon">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const PlaySVG = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);
const HeartSVG = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const ShareSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);
const BookmarkSVG = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const CloseSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const EyeSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const UserSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const CheckSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AVATAR_COLORS: Record<string, string> = {
  engineering: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
  medical: "linear-gradient(135deg, #00cec9, #55efc4)",
  mba: "linear-gradient(135deg, #e17055, #fdcb6e)",
};
const CATEGORY_EMOJI: Record<string, string> = {
  engineering: "⚙️", medical: "🩺", mba: "📈",
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function Home() {
  /* ── state ── */
  const [users] = useState<User[]>(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[0]);
  const [rawVideos, setRawVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"feed" | "saved">("feed");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  // Per-user interaction maps
  const [userLikes, setUserLikes] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    DEMO_USERS.forEach((u) => (m[u.user_id] = new Set()));
    return m;
  });
  const [userSaves, setUserSaves] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    DEMO_USERS.forEach((u) => (m[u.user_id] = new Set()));
    return m;
  });

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [animLike, setAnimLike] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Current user's sets (derived)
  const liked = userLikes[currentUser.user_id] ?? new Set<string>();
  const saved = userSaves[currentUser.user_id] ?? new Set<string>();

  /* ── load videos ── */
  const loadLocalVideos = useCallback(async () => {
    try {
      const r = await axios.get("/api/videos");
      if (r.data.videos?.length) { setRawVideos(r.data.videos); return true; }
    } catch {}
    return false;
  }, []);

  const checkBackend = useCallback(async () => {
    try { await axios.get(`${API}/health`, { timeout: 2000 }); setBackendOnline(true); return true; }
    catch { setBackendOnline(false); return false; }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const loaded = await loadLocalVideos();
      if (!loaded) setRawVideos(makeDemoVideos());
      await checkBackend();
      setLoading(false);
    })();
  }, [loadLocalVideos, checkBackend]);

  /* ── build personalized feed ── */
  const personalizedVideos = useMemo(
    () => scoreVideosForUser(rawVideos, currentUser, liked, saved),
    [rawVideos, currentUser, liked, saved]
  );

  /* ── filter/search ── */
  const filteredVideos = useMemo(() => {
    let v = viewMode === "saved"
      ? personalizedVideos.filter((x) => saved.has(x.video_id))
      : personalizedVideos;

    if (catFilter !== "all") v = v.filter((x) => x.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      v = v.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.creator_name.toLowerCase().includes(q) ||
          x.tags.some((t) => t.toLowerCase().includes(q)) ||
          x.category.toLowerCase().includes(q)
      );
    }
    return v;
  }, [personalizedVideos, catFilter, search, viewMode, saved]);

  /* ── close dropdown / modal ── */
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setSelectedVideo(null); setSelectedCreator(null); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── toast helper ── */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  /* ── interactions ── */
  const postInteraction = async (vid: string, type: string) => {
    try { await axios.post(`${API}/interactions`, { user_id: currentUser.user_id, video_id: vid, event_type: type }); } catch {}
  };

  const handleLike = (vid: string) => {
    setAnimLike(vid);
    setTimeout(() => setAnimLike(null), 300);
    setUserLikes((prev) => {
      const copy = { ...prev };
      const s = new Set(copy[currentUser.user_id]);
      if (s.has(vid)) { s.delete(vid); showToast("Removed like"); }
      else { s.add(vid); postInteraction(vid, "like"); showToast("❤️ Liked!"); }
      copy[currentUser.user_id] = s;
      return copy;
    });
  };

  const handleSave = (vid: string) => {
    setUserSaves((prev) => {
      const copy = { ...prev };
      const s = new Set(copy[currentUser.user_id]);
      if (s.has(vid)) { s.delete(vid); showToast("Removed from Saved"); }
      else { s.add(vid); postInteraction(vid, "save"); showToast("🔖 Saved!"); }
      copy[currentUser.user_id] = s;
      return copy;
    });
  };

  const handleShare = (vid: string) => {
    postInteraction(vid, "share");
    showToast("📤 Link copied!");
  };

  const switchUser = (u: User) => {
    setCurrentUser(u);
    setUserMenuOpen(false);
    setViewMode("feed");
    setCatFilter("all");
    setSearch("");
    showToast(`Switched to ${u.name}`);
  };

  /* ── creator profile builder ── */
  const openCreatorProfile = (creatorName: string) => {
    const base = CREATOR_DATA[creatorName];
    if (!base) return;
    const creatorVids = rawVideos.filter((v) => v.creator_name === creatorName);
    const creator: Creator = {
      ...base,
      videoCount: creatorVids.length,
      totalViews: creatorVids.reduce((a, v) => a + (v.view_count || 0), 0),
      totalLikes: creatorVids.reduce((a, v) => a + (v.like_count || 0), 0),
    };
    setSelectedCreator(creator);
  };

  const fmtNum = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n));

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <>
      <div className="bg-orbs" />

      {/* ── TOAST ── */}
      {toast && (
        <div className="toast-notification" id="toast">{toast}</div>
      )}

      {/* ────── NAVBAR ────── */}
      <nav className="navbar" id="main-nav">
        <div className="navbar-brand" onClick={() => { setCatFilter("all"); setSearch(""); setViewMode("feed"); }}>
          <div className="logo-icon"><PlaySVG size={16} /></div>
          <h1>EduTech Reels</h1>
        </div>

        <div className="search-wrapper">
          <SearchSVG />
          <input
            className="search-input"
            type="text"
            placeholder="Search videos, tags, creators…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-bar"
          />
        </div>

        <div className="nav-actions" ref={menuRef}>
          {/* Saved button */}
          <button
            className={`nav-btn ${viewMode === "saved" ? "active" : ""}`}
            onClick={() => setViewMode(viewMode === "saved" ? "feed" : "saved")}
            id="saved-toggle"
            title={`Saved Videos (${saved.size})`}
          >
            <BookmarkSVG filled={viewMode === "saved"} />
            {saved.size > 0 && <span className="save-count">{saved.size}</span>}
          </button>

          <span
            className="status-dot"
            style={{
              background: backendOnline ? "#00b894" : "#e17055",
              boxShadow: backendOnline ? "0 0 6px #00b894" : "0 0 6px #e17055",
            }}
          />

          <div
            className="user-avatar"
            style={{ background: AVATAR_COLORS[currentUser.aspirant_type] }}
            onClick={() => setUserMenuOpen((p) => !p)}
            id="user-menu-toggle"
            title={currentUser.name}
          >
            {currentUser.name[0]}
          </div>

          {/* User dropdown */}
          {userMenuOpen && (
            <div className="user-dropdown">
              <div className="dropdown-header">Switch User</div>
              {users.map((u) => (
                <button
                  key={u.user_id}
                  className={`user-dropdown-item ${u.user_id === currentUser.user_id ? "selected" : ""}`}
                  onClick={() => switchUser(u)}
                  id={`switch-${u.user_id}`}
                >
                  <div className="u-avatar" style={{ background: AVATAR_COLORS[u.aspirant_type] }}>{u.name[0]}</div>
                  <div className="u-info">
                    <div className="u-name">{u.name}</div>
                    <div className="u-type">{CATEGORY_EMOJI[u.aspirant_type]} {u.aspirant_type}</div>
                  </div>
                  {u.user_id === currentUser.user_id && <CheckSVG />}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* ────── PAGE ────── */}
      <div className="page-content">
        {/* User info strip */}
        <div className="user-strip">
          <div className="user-strip-avatar" style={{ background: AVATAR_COLORS[currentUser.aspirant_type] }}>
            {currentUser.name[0]}
          </div>
          <div>
            <div className="user-strip-name">
              {viewMode === "saved" ? `${currentUser.name}'s Saved Videos` : `For You · ${currentUser.name}`}
            </div>
            <div className="user-strip-bio">{currentUser.bio}</div>
          </div>
          <div className="user-strip-tags">
            {currentUser.interests.slice(0, 4).map((t) => (
              <span key={t} className="interest-tag">#{t}</span>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div className="category-pills">
          {["all", "engineering", "medical", "mba"].map((c) => (
            <button key={c} className={`cat-pill ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)} id={`cat-${c}`}>
              {c === "all" ? "🔥 All" : c === "engineering" ? "⚙️ Engineering" : c === "medical" ? "🩺 Medical" : "📈 MBA"}
            </button>
          ))}
        </div>

        {/* Video grid */}
        {loading ? (
          <div className="video-grid">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton-tile" />)}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <p>{viewMode === "saved" ? "No saved videos yet. Browse the feed and save some!" : "No videos found. Try a different search or category."}</p>
          </div>
        ) : (
          <div className="video-grid">
            {filteredVideos.map((v) => (
              <div
                key={v.video_id}
                className={`video-tile tile-grad-${v.category}`}
                onClick={() => { setSelectedVideo(v); postInteraction(v.video_id, "view"); }}
                id={`tile-${v.video_id}`}
              >
                {/* Static gradient only — NO video preload (mobile fix) */}
                <div className="tile-bg">
                  <div className="pattern" />
                  <div className="tile-play-icon"><PlaySVG size={22} /></div>
                </div>

                {/* Category badge */}
                <span className={`tile-badge ${v.category}`}>{v.category}</span>
                <span className="tile-duration">{v.duration}s</span>

                {/* Interaction indicators */}
                {liked.has(v.video_id) && <span className="tile-liked-badge">❤️</span>}
                {saved.has(v.video_id) && <span className="tile-saved-badge">🔖</span>}

                {/* Bottom strip (always visible) */}
                <div className="tile-meta-strip">
                  <div className="strip-title">{v.title}</div>
                  <div className="strip-sub">
                    <span>@{v.creator_name}</span>
                    <span>·</span>
                    <span>{fmtNum(v.view_count)} views</span>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="tile-overlay">
                  <div className="tile-title">{v.title}</div>
                  <div className="tile-creator">@{v.creator_name} · {fmtNum(v.view_count)} views</div>
                  <div className="tile-tags">
                    {v.tags.slice(0, 4).map((t) => <span key={t} className="tile-tag">#{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ────── VIDEO PLAYER MODAL ────── */}
      {selectedVideo && (
        <div className="player-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedVideo(null); }} id="player-modal">
          <div className="player-container">
            <div className="player-video">
              <div className="player-video-inner">
                {selectedVideo.video_url ? (
                  <video
                    key={selectedVideo.video_id}
                    src={selectedVideo.video_url}
                    controls
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div className="player-placeholder">
                    <div className="big-play animate-float"><PlaySVG size={32} /></div>
                    <p style={{ fontSize: 14 }}>Video will play here</p>
                    <p style={{ fontSize: 12, opacity: 0.5 }}>{selectedVideo.video_id} · {selectedVideo.duration}s</p>
                  </div>
                )}
              </div>
            </div>

            <div className="player-info">
              <div className="player-info-header">
                <button className="player-close" onClick={() => setSelectedVideo(null)} id="close-player"><CloseSVG /></button>
                <div className="player-title">{selectedVideo.title}</div>
                <div
                  className="player-creator clickable-creator"
                  onClick={(e) => { e.stopPropagation(); openCreatorProfile(selectedVideo.creator_name); }}
                >
                  <div className="player-creator-avatar" style={{ background: AVATAR_COLORS[selectedVideo.category] }}>
                    {selectedVideo.creator_name[0]}
                  </div>
                  <div>
                    <div className="player-creator-name">
                      {selectedVideo.creator_name}
                      <span className="view-profile-hint">View profile →</span>
                    </div>
                    <div className="player-creator-role">{selectedVideo.category} · {selectedVideo.subcategory}</div>
                  </div>
                </div>
              </div>

              <div className="player-actions">
                <button
                  className={`action-btn ${liked.has(selectedVideo.video_id) ? "liked" : ""} ${animLike === selectedVideo.video_id ? "animate-like" : ""}`}
                  onClick={() => handleLike(selectedVideo.video_id)}
                  id="player-like"
                >
                  <HeartSVG filled={liked.has(selectedVideo.video_id)} />
                  {fmtNum(selectedVideo.like_count + (liked.has(selectedVideo.video_id) ? 1 : 0))}
                </button>
                <button className="action-btn" onClick={() => handleShare(selectedVideo.video_id)} id="player-share">
                  <ShareSVG /> Share
                </button>
                <button
                  className={`action-btn ${saved.has(selectedVideo.video_id) ? "saved" : ""}`}
                  onClick={() => handleSave(selectedVideo.video_id)}
                  id="player-save"
                >
                  <BookmarkSVG filled={saved.has(selectedVideo.video_id)} />
                  {saved.has(selectedVideo.video_id) ? "Saved" : "Save"}
                </button>
              </div>

              <div className="player-details">
                <div className="detail-section">
                  <div className="detail-label">Tags</div>
                  <div className="player-tags">
                    {selectedVideo.tags.map((t) => (
                      <span key={t} className="player-tag" onClick={() => { setSearch(t); setSelectedVideo(null); }}>#{t}</span>
                    ))}
                  </div>
                </div>
                <div className="detail-section">
                  <div className="detail-label">Stats</div>
                  <div className="stat-row">
                    <div className="stat-item"><EyeSVG /><span className="stat-num">{fmtNum(selectedVideo.view_count)}</span> views</div>
                    <div className="stat-item"><HeartSVG filled={false} /><span className="stat-num">{fmtNum(selectedVideo.like_count)}</span></div>
                    <div className="stat-item"><ShareSVG /><span className="stat-num">{fmtNum(selectedVideo.share_count)}</span></div>
                  </div>
                </div>
                <div className="detail-section">
                  <div className="detail-label">Difficulty</div>
                  <span className={`difficulty-badge ${selectedVideo.difficulty}`}>{selectedVideo.difficulty}</span>
                </div>
                <div className="detail-section">
                  <div className="detail-label">Duration</div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{selectedVideo.duration} seconds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────── CREATOR PROFILE MODAL ────── */}
      {selectedCreator && (
        <div className="player-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCreator(null); }} id="creator-modal">
          <div className="creator-profile-modal">
            <button className="player-close" onClick={() => setSelectedCreator(null)} style={{ float: "right", margin: 8 }}><CloseSVG /></button>

            <div className="creator-header">
              <div className="creator-big-avatar" style={{ background: AVATAR_COLORS[selectedCreator.category] }}>
                {selectedCreator.name[0]}
              </div>
              <div className="creator-header-info">
                <h2 className="creator-name-big">{selectedCreator.name}</h2>
                <p className="creator-specialty">{CATEGORY_EMOJI[selectedCreator.category]} {selectedCreator.specialty}</p>
              </div>
            </div>

            <p className="creator-bio">{selectedCreator.bio}</p>

            <div className="creator-stats-grid">
              <div className="creator-stat">
                <div className="creator-stat-num">{selectedCreator.videoCount}</div>
                <div className="creator-stat-label">Videos</div>
              </div>
              <div className="creator-stat">
                <div className="creator-stat-num">{fmtNum(selectedCreator.totalViews)}</div>
                <div className="creator-stat-label">Total Views</div>
              </div>
              <div className="creator-stat">
                <div className="creator-stat-num">{fmtNum(selectedCreator.totalLikes)}</div>
                <div className="creator-stat-label">Total Likes</div>
              </div>
            </div>

            <div className="detail-label" style={{ marginTop: 20 }}>Videos by {selectedCreator.name}</div>
            <div className="creator-videos-list">
              {rawVideos
                .filter((v) => v.creator_name === selectedCreator.name)
                .slice(0, 8)
                .map((v) => (
                  <div
                    key={v.video_id}
                    className="creator-video-item"
                    onClick={() => { setSelectedCreator(null); setSelectedVideo(v); }}
                  >
                    <div className="creator-vid-thumb tile-grad-${v.category}">
                      <PlaySVG size={14} />
                    </div>
                    <div className="creator-vid-info">
                      <div className="creator-vid-title">{v.title}</div>
                      <div className="creator-vid-meta">{fmtNum(v.view_count)} views · {v.duration}s</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
