# EduTech Reels — AI Recommendation & Engagement Scoring System

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [User Profiles & Blank-Slate Mode](#user-profiles--blank-slate-mode)
5. [Engagement Tracking Module](#engagement-tracking-module)
6. [Scoring Algorithm](#scoring-algorithm)
7. [Feed Construction & Interleaving](#feed-construction--interleaving)
8. [Interaction → Feed Update Pipeline](#interaction--feed-update-pipeline)
9. [Worked Examples](#worked-examples)
10. [Backend Recommendation Engine](#backend-recommendation-engine)
11. [Future Enhancements](#future-enhancements)

---

## 1. System Overview

EduTech Reels uses a **hybrid recommendation system** that combines:

- **Content-based filtering** — Matches video attributes (category, tags) against the user's declared profile.
- **Engagement-based learning** — Learns from the user's real-time behavior (likes, saves, shares, watch time) to refine recommendations.
- **Blank-slate cold start** — New users see a perfectly balanced feed across all categories, which adapts in real-time as they interact.
- **Cross-category discovery** — Intentionally injects videos from other domains to broaden exposure.

The system runs **entirely client-side** during the demo, with a mirror implementation on the Flask backend for production use with Firebase.

---

## 2. Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                     │
│                                                               │
│  ┌──────────────┐   ┌────────────────────┐   ┌─────────────┐ │
│  │  User Profile │──▶│  Engagement Engine  │──▶│  Scorer     │ │
│  │  (static)     │   │  (per-user state)   │   │  (per-video)│ │
│  └──────────────┘   └────────────────────┘   └──────┬──────┘ │
│                                                      │        │
│                              ┌────────────────────────┘        │
│                              ▼                                 │
│                    ┌───────────────────┐                       │
│                    │   Interleaver     │                       │
│                    │ ┌───────────────┐ │                       │
│                    │ │ Undecided:    │ │                       │
│                    │ │ Round-Robin   │ │                       │
│                    │ │ ENG→MED→MBA  │ │                       │
│                    │ ├───────────────┤ │                       │
│                    │ │ Typed User:   │ │                       │
│                    │ │ 4:1 Primary   │ │                       │
│                    │ └───────────────┘ │                       │
│                    └────────┬──────────┘                       │
│                             ▼                                  │
│                    ┌──────────────┐                            │
│                    │  Feed Grid   │                            │
│                    └──────────────┘                            │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Video pool** — 142 videos loaded from CSV metadata via `/api/videos`.
2. **User profile** — Static profile with `aspirant_type` and `interests[]`.
3. **Engagement state** — Accumulated per-user interaction data (in-memory).
4. **Scorer** — Computes a numerical score for every video.
5. **Interleaver** — Uses round-robin (undecided) or 4:1 (typed) strategy.
6. **Feed** — Final ordered list rendered in the grid.

---

## 3. Data Model

### Video

| Field           | Type       | Description                            |
|-----------------|------------|----------------------------------------|
| `video_id`      | `string`   | Unique identifier                      |
| `title`         | `string`   | Display title                          |
| `tags`          | `string[]` | Searchable content tags                |
| `category`      | `string`   | One of: `engineering`, `medical`, `mba`|
| `subcategory`   | `string`   | `exam`, `college`, or `career`         |
| `creator_name`  | `string`   | Name of the content creator            |
| `duration`      | `number`   | Video length in seconds                |
| `view_count`    | `number`   | Total platform views                   |
| `like_count`    | `number`   | Total likes                            |
| `share_count`   | `number`   | Total shares                           |

### User Profile

| Field           | Type       | Description                                              |
|-----------------|------------|----------------------------------------------------------|
| `user_id`       | `string`   | Unique user ID                                           |
| `name`          | `string`   | Display name                                             |
| `aspirant_type` | `string`   | Category interest: `engineering`, `medical`, `mba`, or **`undecided`** |
| `interests`     | `string[]` | Declared interest tags (empty for blank-slate users)     |
| `bio`           | `string`   | User description                                         |

### EngagementRecord (per video, per user)

| Field       | Type      | Description                              |
|-------------|-----------|------------------------------------------|
| `views`     | `number`  | Number of times the user opened this video |
| `watchTime` | `number`  | Total seconds spent watching              |
| `liked`     | `boolean` | Whether the user has liked it             |
| `saved`     | `boolean` | Whether the user has saved it             |
| `shared`    | `boolean` | Whether the user has shared it            |

### UserEngagement (aggregated)

| Field           | Type                          | Description                   |
|-----------------|-------------------------------|-------------------------------|
| `videos`        | `Record<videoId, EngagementRecord>` | Per-video interaction data |
| `tagScores`     | `Record<tag, number>`         | Learned tag affinity scores   |
| `creatorScores` | `Record<creatorName, number>` | Learned creator affinity      |
| `totalScore`    | `number`                      | Sum of all engagement points  |

---

## 4. User Profiles & Blank-Slate Mode

### The Four Demo Users

| User | aspirant_type | interests | Purpose |
|------|--------------|-----------|---------|
| **Demo Student** | `undecided` | `[]` (empty) | **Blank slate** — starts with zero preferences, equal feed. Demonstrates how the system learns from scratch. |
| Rahul Kumar | `engineering` | `gate, calculus, mechanics, iit, physics` | GATE-focused engineering student |
| Priya Sharma | `medical` | `neet, biology, anatomy, physiology, mbbs` | NEET-focused medical student |
| Amit Patel | `mba` | `cat, finance, consulting, iim, strategy` | CAT-focused MBA aspirant |

### Why Blank Slate Matters

Demo Student is the **key user for demonstrating the recommendation system**:

1. **Before any interaction** — Feed shows perfectly balanced `ENG → MED → MBA → ENG → MED → MBA` round-robin. All categories are equally visible.
2. **After liking engineering videos** — Engineering content rises to the top within its round-robin bucket. Tags from liked videos (e.g., `gate`, `calculus`) boost similar content.
3. **After multiple interactions** — The learned tag and creator affinities significantly reshape the feed, making it visibly different from the initial state.

This makes the recommendation system's **learning effect clearly visible** during a demo.

---

## 5. Engagement Tracking Module

### What Gets Tracked

Every user interaction is captured and scored:

| Action              | When Recorded                        | Weight | Rationale                                    |
|---------------------|--------------------------------------|--------|----------------------------------------------|
| **View**            | When a video modal is opened         | 1 pt   | Low intent — just curiosity                  |
| **Like**            | When the ❤️ button is clicked        | 3 pts  | Moderate intent — user enjoyed it            |
| **Save**            | When the 🔖 button is clicked        | 5 pts  | High intent — wants to revisit later         |
| **Share**           | When the 📤 button is clicked        | 5 pts  | Highest intent — endorsing to others         |
| **Watch Time**      | When the video modal is closed       | 2 pts / 10s | Duration = genuine engagement          |

### Why These Weights?

The weight rationale follows a **user intent hierarchy**:

```
   Share (5)  ←── "I want others to see this"     ═══ HIGHEST INTENT
   Save (5)   ←── "I'll come back to study this"
   Like (3)   ←── "I enjoyed this"
   View (1)   ←── "I clicked on it"               ═══ LOWEST INTENT
```

- **Sharing** and **Saving** are weighted equally at 5 because both indicate strong intent.
- **Liking** is moderate (3) — signals enjoyment but doesn't indicate deep engagement.
- **Viewing** is minimal (1) — clicking could be accidental or exploratory.
- **Watch time** is duration-based (2 per 10 seconds) — 60 seconds of watching = clearly engaged.

### Affinity Calculation

After every interaction, the system **recalculates tag and creator affinity**:

```
For each video the user has interacted with:
  video_score = (views × 1) + (liked? × 3) + (saved? × 5) + (shared? × 5) + (watchTime/10 × 2)

  For each tag on that video:
    tagScores[tag] += video_score

  creatorScores[creator] += video_score
```

**Example**: User watches a "GATE Prep Guide" (tags: `gate`, `calculus`, `engineering`) for 30 seconds and likes it.

```
video_score = 1(view) + 3(like) + 0(save) + 0(share) + 6(30s÷10×2) = 10

tagScores["gate"]        += 10  → now 10
tagScores["calculus"]    += 10  → now 10
tagScores["engineering"] += 10  → now 10
creatorScores["Tech Expert"] += 10  → now 10
```

---

## 6. Scoring Algorithm

Every video gets a numerical score based on 6 factors:

### Factor 1: Category Match (base: +20, +40, or +8)

```
if (user.aspirant_type === "undecided")
  score += 20    // Blank-slate: all categories equal
else if (video.category === user.aspirant_type)
  score += 40    // Primary category — strong match
else
  score += 8     // Cross-category — baseline for discovery
```

For the **blank-slate Demo Student**, all videos start at 20 — creating a level playing field where only engagement data breaks the tie.

### Factor 2: Static Interest Match (up to ~64 pts)

```
For each tag on the video:
  if tag ∈ user.interests → score += 8

If any interest keyword appears in the video title → score += 6
```

For Demo Student (empty interests), this contributes **0 points** — ensuring the initial feed is truly neutral.

### Factor 3: Learned Tag Affinity (up to 35 pts per tag, capped)

```
For each tag on the video:
  tagAffinity = engagement.tagScores[tag] × 2
  score += min(tagAffinity, 35)    // Capped at 35 per tag
```

This is the **learning** part. After liking a `gate`-tagged video, all future `gate`-tagged videos get up to +35 points per tag. With 3-6 tags per video, this can contribute **100+ points** — enough to completely reshape the feed.

### Factor 4: Creator Affinity (up to 30 pts, capped)

```
creatorAffinity = engagement.creatorScores[creator] × 2.5
score += min(creatorAffinity, 30)
```

If a user watches multiple videos by "Dr. Sharma", all of Dr. Sharma's other content gets boosted.

### Factor 5: Direct Engagement Boost (up to ~47 pts)

```
if user liked this video → score += 12
if user saved this video → score += 15
if user shared this video → score += 10
score += min(watchTime / 5, 10)
```

Already-interacted videos are boosted moderately, keeping them accessible.

### Factor 6: Random Jitter (+0 to 3 pts)

```
score += Math.random() × 3
```

Adds slight variation for a "fresh" feel.

### Score Summary Table

| Factor                  | Max Contribution | What Drives It                      |
|-------------------------|------------------|-------------------------------------|
| Category match          | 20 (undecided) / 40 (typed) | User's `aspirant_type` |
| Static interest match   | ~64 pts          | User's declared `interests[]`       |
| Learned tag affinity    | 35 pts/tag       | Accumulated from interactions       |
| Creator affinity        | 30 pts           | How much user engages with creator  |
| Direct engagement       | ~47 pts          | Like/Save/Share/Watch on this video |
| Random jitter           | 3 pts            | Variety                             |

### Typical Score Ranges

**Blank-slate user (Demo Student):**
- Initial (no engagement): ~20-23 pts (all videos equal)
- After 1 like+save on engineering: Engineering videos = 40-80 pts, others = 20-23 pts
- After 3+ engineering interactions: Engineering = 80-150+ pts, others = 20-30 pts

**Typed user (Rahul/Priya/Amit):**
- Primary category, matching interests: 50-80 pts
- Primary category, no interest match: ~40 pts
- Cross-category: 8-20 pts (boostable via engagement)

---

## 7. Feed Construction & Interleaving

### Two Modes

The interleaver operates differently based on user type:

#### Mode 1: Blank-Slate (undecided) — Round-Robin

```
1. Score ALL videos
2. Split into 3 category buckets:
   - engineering[] sorted by score desc
   - medical[] sorted by score desc
   - mba[] sorted by score desc
3. Round-robin: take 1 from each bucket in rotation
   → ENG, MED, MBA, ENG, MED, MBA, ...
```

**Result pattern:**
```
[ENG] [MED] [MBA] [ENG] [MED] [MBA] [ENG] [MED] [MBA] ...
  1     2     3     4     5     6     7     8     9
```

Every 2nd-3rd video is from a **different domain**. Within each domain, videos are sorted by score — so as the user interacts, the top-scoring videos within each bucket shift.

#### Mode 2: Typed User — 4:1 Interleaving

```
1. Score ALL videos
2. Split into:
   - primary[]   → matching user's aspirant_type, sorted by score desc
   - cross[]     → all other videos, sorted by score desc
3. Interleave:
   - Take 4 primary videos, then 1 cross-category
   - Repeat
```

**Result pattern (Engineering student):**
```
[ENG] [ENG] [ENG] [ENG] [MED] [ENG] [ENG] [ENG] [ENG] [MBA] ...
  1     2     3     4     5*    6     7     8     9    10*
```

### Why Two Modes?

- **Blank-slate users** need maximum exposure to discover their interests. Equal representation ensures the system has no bias.
- **Typed users** already have declared preferences. The 4:1 ratio keeps the feed relevant while still providing discovery.

### How Engagement Reshapes the Feed

Even with round-robin interleaving, engagement **changes the ordering within each bucket**:

1. User likes an engineering video → that video's tags get affinity scores.
2. Other engineering videos sharing those tags score higher.
3. Within the engineering bucket, those videos rise to the top.
4. In the next round-robin cycle, the top engineering slot now shows a more relevant video.

With enough engagement, the engineering bucket's internal ordering becomes heavily personalized.

---

## 8. Interaction → Feed Update Pipeline

### Step-by-Step Flow

```
User clicks "Like" on a video
       │
       ▼
┌──────────────────────────┐
│ 1. Mutate EngagementRecord│  ← rec.liked = true
│    for this video          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 2. Recalculate Affinity   │  ← tagScores & creatorScores
│    across ALL interactions │     are rebuilt from scratch
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 3. Increment feedKey      │  ← triggers React re-render
│    + trigger feed flash   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 4. Re-score ALL videos    │  ← scoreVideo() runs
│    with updated engagement │     with new affinity data
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 5. Re-interleave feed     │  ← round-robin or 4:1
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 6. Visual feedback        │  ← "✨ Feed Updated" badge
│    + grid flash animation  │     + toast notification
└──────────────────────────┘
```

### Visual Feedback

When the feed updates, the user sees:

1. **Toast notification** — "❤️ Liked! Feed updated" (pill at bottom, auto-dismisses in 2s)
2. **Feed Updated badge** — "✨ Feed Updated — reranked based on your activity" (banner above grid)
3. **Grid flash animation** — Brief opacity dip + brightness boost
4. **Engagement Score bar** — Shows total score, view count, like count, save count, watch time
5. **Learned tags** — New `🔥` tags appear in the user strip, showing discovered interests

### Watch Time Recording

```
1. User opens video modal → watchStartRef = Date.now()
2. User interacts (like, save, etc.) → immediate engagement update
3. User closes modal → watchTime = (Date.now() - watchStartRef) / 1000
4. recordWatchTime(videoId, seconds) → mutates engagement
5. Feed re-ranks with new watch time data
```

---

## 9. Worked Examples

### Example 1: Blank-Slate Demo Student — First Load

**Profile**: undecided, interests = `[]`

**No prior engagement** — All videos score equally, round-robin interleaving:

| Slot | Video                   | Category | Score Breakdown        | Total |
|------|-------------------------|----------|------------------------|-------|
| 1    | GATE Preparation Guide  | ENG      | 20(base) + 2(jitter)   | ~22  |
| 2    | NEET Biology Revision   | MED      | 20(base) + 1(jitter)   | ~21  |
| 3    | CAT Quantitative Tips   | MBA      | 20(base) + 2(jitter)   | ~22  |
| 4    | JEE Physics Quick Tips  | ENG      | 20(base) + 1(jitter)   | ~21  |
| 5    | MBBS Journey Explained  | MED      | 20(base) + 3(jitter)   | ~23  |
| 6    | MBA Career Consulting   | MBA      | 20(base) + 1(jitter)   | ~21  |

All scores are nearly identical (~20-23). The feed is a perfect **ENG → MED → MBA** rotation.

### Example 2: Demo Student Likes + Saves an Engineering Video

User opens "GATE Preparation Guide" (tags: `hostel, calculus, nit, mechanics, startup, engineering`), watches 30s, likes it, saves it.

```
Engagement for GATE Prep Guide:
  view_score = 1(view) + 3(like) + 5(save) + 0(share) + 6(30s/10 × 2) = 15

Tag affinity (each tag gets 15):
  tagScores["hostel"]      = 15
  tagScores["calculus"]    = 15
  tagScores["nit"]         = 15
  tagScores["mechanics"]   = 15
  tagScores["startup"]     = 15
  tagScores["engineering"] = 15

Creator affinity:
  creatorScores["Eng Counselor"] = 15
```

**Re-scoring after this interaction:**

| Video                        | Category | Before | After | Change   |
|------------------------------|----------|--------|-------|----------|
| **GATE Prep Guide** (saved)  | ENG      | 22     | 20 + min(15×2,35)×6tags + min(15×2.5,30) + 12(liked) + 15(saved) + 6(watchTime) = **~250+** | +230  |
| Understanding Calculus       | ENG      | 21     | 20 + 30(calculus tag×2) + 30(engineering tag) = **~80** | +59   |
| JEE Physics Quick Tips       | ENG      | 21     | 20 + 30(mechanics) + 30(engineering) = **~80** | +59   |
| NEET Biology Revision        | MED      | 21     | 20 + 0 = **~21** | 0     |
| CAT Quantitative Tips        | MBA      | 22     | 20 + 0 = **~22** | 0     |

**Result**: Engineering videos with matching tags (`calculus`, `mechanics`, `engineering`) jump to 80+ points. Medical and MBA stay at ~20. Within the round-robin, the **engineering bucket** now has dramatically better-scored videos, making the top engineering slot show the most relevant content.

### Example 3: Demo Student Likes 3 Medical Videos

After interacting with 3 medical videos (each with tags like `neet, biology, anatomy`):

```
tagScores["neet"]     = 45  (3 videos × 15 each)
tagScores["biology"]  = 45
tagScores["anatomy"]  = 30  (2 videos had this tag)
```

Now medical videos with these tags score: `20(base) + 35(neet) + 35(biology) + 35(anatomy) = 125 pts`

Compared to un-engaged engineering videos at ~22 pts. The medical portion of the round-robin now shows highly personalized, relevant medical content first.

### Example 4: Typed Users (Rahul vs Priya)

**Rahul Kumar** (engineering, interests: `gate, calculus, mechanics, iit, physics`)
**Priya Sharma** (medical, interests: `neet, biology, anatomy, physiology, mbbs`)

For "Understanding Calculus" (tags: `calculus, mathematics, engineering`):
```
Rahul:  40(cat) + 8(calculus) + 8(mathematics) = 56
Priya:  8(cross) + 0(no tag match) = 8
```

For "NEET Biology Revision" (tags: `neet, biology, anatomy`):
```
Rahul:  8(cross) + 0 = 8
Priya:  40(cat) + 8(neet) + 8(biology) + 8(anatomy) = 64
```

Each user's feed is dominated by their declared category, with strong tag-level personalization within it.

---

## 10. Backend Recommendation Engine

The Flask backend (`backend/recommendation_engine.py`) mirrors this logic for production:

| Component        | Frontend (Demo)         | Backend (Production)                |
|------------------|-------------------------|-------------------------------------|
| Data source      | CSV + in-memory state   | Firebase Firestore                  |
| Scoring          | `scoreVideo()` function | `SimpleRecommendationEngine` class  |
| Weights          | 50% content, 30% tags, 20% engagement | 50% content, 30% collaborative, 20% trending |
| Persistence      | React state (session)   | Firestore `interactions` collection |
| Cross-category   | Round-robin (undecided) / 4:1 (typed) | Diversity filter |
| Watch time       | Client-side timer       | Event-based logging                 |

---

## 11. Future Enhancements

### Planned

- **Firebase persistence** — Store engagement data in Firestore for cross-session learning
- **Collaborative filtering** — "Users who liked X also liked Y"
- **Time decay** — Recent interactions weighted more than old ones
- **Negative signals** — "Scrolled past without clicking" as weak negative
- **A/B testing** — Compare weight configurations

### Research Directions

- **Content embeddings** — NLP-based semantic video similarity
- **Sequential modeling** — Order-aware recommendations (RNN/Transformer)
- **Multi-armed bandits** — Mathematical exploration vs. exploitation
- **Cold start** — Currently handled by round-robin; could use demographic priors

---

## Appendix: Code Reference

| File | Component | Purpose |
|------|-----------|---------|
| `frontend/app/page.tsx` | `WEIGHTS` constant | Interaction weight configuration |
| `frontend/app/page.tsx` | `recalcAffinity()` | Rebuilds tag/creator scores |
| `frontend/app/page.tsx` | `scoreVideo()` | Per-video scoring function |
| `frontend/app/page.tsx` | `scoreVideosForUser()` | Interleaving + final feed construction |
| `frontend/app/page.tsx` | `mutateEngagement()` | Immutable engagement state mutation |
| `frontend/app/page.tsx` | `triggerFeedFlash()` | Visual feedback on feed update |
| `frontend/app/page.tsx` | `LazyVideoTile` | IntersectionObserver-based lazy video loading |
| `backend/recommendation_engine.py` | `SimpleRecommendationEngine` | Server-side hybrid recommender |
