# EduTech Reels — AI Recommendation & Engagement Scoring System

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [Engagement Tracking Module](#engagement-tracking-module)
5. [Scoring Algorithm](#scoring-algorithm)
6. [Feed Construction & Interleaving](#feed-construction--interleaving)
7. [Interaction → Feed Update Pipeline](#interaction--feed-update-pipeline)
8. [Worked Examples](#worked-examples)
9. [Backend Recommendation Engine](#backend-recommendation-engine)
10. [Future Enhancements](#future-enhancements)

---

## 1. System Overview

EduTech Reels uses a **hybrid recommendation system** that combines:

- **Content-based filtering** — Matches video attributes (category, tags) against the user's declared profile.
- **Engagement-based learning** — Learns from the user's real-time behavior (likes, saves, shares, watch time) to refine recommendations.
- **Cross-category discovery** — Intentionally injects videos from other domains to broaden the user's exposure.

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
│                                              ┌───────▼──────┐ │
│                                              │ Interleaver  │ │
│                                              │ (cross-cat)  │ │
│                                              └───────┬──────┘ │
│                                                      │        │
│                                              ┌───────▼──────┐ │
│                                              │  Feed Grid   │ │
│                                              │  (rendered)  │ │
│                                              └──────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Video pool** — 142 videos loaded from CSV metadata via `/api/videos`.
2. **User profile** — Static profile with `aspirant_type` and `interests[]`.
3. **Engagement state** — Accumulated per-user interaction data (in-memory).
4. **Scorer** — Computes a numerical score for every video.
5. **Interleaver** — Separates primary/cross-category, then weaves them together.
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

| Field           | Type       | Description                            |
|-----------------|------------|----------------------------------------|
| `user_id`       | `string`   | Unique user ID                         |
| `name`          | `string`   | Display name                           |
| `aspirant_type` | `string`   | Primary category interest              |
| `interests`     | `string[]` | Declared interest tags                 |
| `bio`           | `string`   | User description                       |

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

## 4. Engagement Tracking Module

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

- **Sharing** and **Saving** are weighted equally at 5 because both indicate strong intent — sharing is social endorsement, saving is personal bookmarking for future use.
- **Liking** is moderate (3) — it's a quick tap that signals enjoyment but doesn't indicate deep engagement.
- **Viewing** is minimal (1) — clicking on a video could be accidental or exploratory.
- **Watch time** is duration-based (2 per 10 seconds) — someone who watches 60 seconds is clearly more engaged than someone who closes after 3 seconds.

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

Later, when scoring other videos, any video tagged with `gate` or `calculus` or by "Tech Expert" will get a boost.

---

## 5. Scoring Algorithm

Every video gets a numerical score based on 6 factors:

### Factor 1: Category Match (base: +40 or +8)

```
if (video.category === user.aspirant_type)
  score += 40    // Primary category — strong match
else
  score += 8     // Cross-category — baseline for discovery
```

An engineering student's engineering videos start at 40, while medical and MBA videos start at 8. This ensures the feed is **majority relevant** but cross-category videos still have a presence.

### Factor 2: Static Interest Match (up to ~64 pts)

```
For each tag on the video:
  if tag ∈ user.interests → score += 8

If any interest keyword appears in the video title → score += 6
```

**Demo Student** has interests: `["coding", "campus", "college", "placement", "nit", "software", "startup", "developer"]`

A video with tags `["coding", "placement", "tech"]` would get +16 (2 matching tags × 8).

### Factor 3: Learned Tag Affinity (up to 30 pts per tag, capped)

```
For each tag on the video:
  tagAffinity = engagement.tagScores[tag] × 1.5
  score += min(tagAffinity, 30)    // Capped at 30 per tag
```

This is the **learning** part — if a user has been liking/saving/watching videos tagged with `gate`, future `gate`-tagged videos (even from other categories) get boosted.

### Factor 4: Creator Affinity (up to 25 pts, capped)

```
creatorAffinity = engagement.creatorScores[creator] × 2
score += min(creatorAffinity, 25)
```

If a user watches multiple videos by "Dr. Sharma", all of Dr. Sharma's other content gets boosted. The cap prevents a single creator from dominating the feed.

### Factor 5: Direct Engagement Boost (up to ~40 pts)

```
if user liked this video → score += 10
if user saved this video → score += 12
if user shared this video → score += 8
score += min(watchTime / 5, 10)
```

Already-interacted videos are boosted moderately, so they stay accessible but don't completely block new content.

### Factor 6: Random Jitter (+0 to 4 pts)

```
score += Math.random() × 4
```

Adds slight variation so same-scored videos don't always appear in the same order. This creates a "fresh" feel on each page load.

### Score Summary Table

| Factor                  | Max Contribution | What Drives It                      |
|-------------------------|------------------|-------------------------------------|
| Category match          | 40 pts           | User's `aspirant_type`              |
| Static interest match   | ~64 pts          | User's declared `interests[]`       |
| Learned tag affinity    | 30 pts/tag       | Accumulated from interactions       |
| Creator affinity        | 25 pts           | How much user engages with creator  |
| Direct engagement       | ~40 pts          | Like/Save/Share/Watch on this video |
| Random jitter           | 4 pts            | Variety                             |

### Typical Score Ranges

- **Highly relevant, interacted**: 80–150+ pts
- **Relevant, not yet interacted**: 50–80 pts
- **Cross-category, no engagement**: 8–20 pts
- **Cross-category, with learned affinity**: 30–70 pts

---

## 6. Feed Construction & Interleaving

After scoring, the feed is constructed using **cross-category interleaving**:

```
1. Score ALL videos
2. Split into:
   - primary[]   → videos matching user's aspirant_type, sorted by score desc
   - cross[]     → all other videos, sorted by score desc
3. Interleave:
   - Take 4 primary videos
   - Insert 1 cross-category video
   - Repeat until all videos are placed
```

### Result Pattern

For an Engineering student:

```
[ENG] [ENG] [ENG] [ENG] [MED] [ENG] [ENG] [ENG] [ENG] [MBA] ...
  1     2     3     4     5*    6     7     8     9    10*
```

Slots marked with `*` are cross-category discovery slots. This means **~20% of the feed** (1 in 5) is cross-category content. Cross-category videos are still **sorted by relevance** — so the most relevant medical video (perhaps one whose tags overlap with user interests) appears first.

### Why Interleaving?

- Pure score-based sorting pushes ALL cross-category to the bottom (score 8 vs 40+).
- Interleaving guarantees visibility while keeping relevance.
- Cross-category videos boosted by engagement (e.g., user liked a medical video) will appear in higher cross-category slots.

---

## 7. Interaction → Feed Update Pipeline

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
│ 4. Re-score ALL videos    │  ← scoreVideosForUser() runs
│    with updated engagement │     with new affinity data
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 5. Re-interleave feed     │  ← primary/cross split + weave
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
2. **Feed Updated badge** — "✨ Feed Updated — reranked based on your activity" (horizontal banner above the grid, fades in)
3. **Grid flash animation** — The entire grid briefly flashes (opacity dip + brightness boost) to signal content has reordered

### Watch Time Recording

Watch time is tracked from **modal open to modal close**:

```
1. User opens video modal → watchStartRef = Date.now()
2. User interacts (like, save, etc.) → immediate engagement update
3. User closes modal → watchTime = (Date.now() - watchStartRef) / 1000
4. recordWatchTime(videoId, seconds) → mutates engagement
5. Feed re-ranks with new watch time data
```

This means **even just watching a video** without clicking any buttons affects future recommendations.

---

## 8. Worked Examples

### Example 1: New User — Demo Student

**Profile**: Engineering, interests = `[coding, campus, college, placement]`

**No prior engagement** — Feed is purely content-based:

| Rank | Video                  | Category | Score Breakdown                        | Total |
|------|------------------------|----------|----------------------------------------|-------|
| 1    | Coding Interview Tips  | ENG      | 40(cat) + 16(tags: coding, placement) + 6(title) + 2(jitter) | ~64  |
| 2    | IIIT Campus Life       | ENG      | 40(cat) + 8(tag: campus) + 6(title) + 3(jitter) | ~57  |
| 3    | Career as SWE          | ENG      | 40(cat) + 8(tag: software) + 3(jitter) | ~51  |
| 4    | GATE Prep Guide        | ENG      | 40(cat) + 0(no tag match) + 2(jitter)  | ~42  |
| **5**| **NEET Biology**       | **MED**  | 8(cross) + 0 + 1(jitter)               | **~9** |

Videos matching `coding` and `placement` rank highest. The 5th slot is a cross-category discovery slot.

### Example 2: After Interactions

**Demo Student likes and saves a Medical video** ("Career as Surgeon", tags: `doctor, surgery, healthcare`)

```
Engagement score = 1(view) + 3(like) + 5(save) = 9

New affinity:
  tagScores["doctor"]     = 9
  tagScores["surgery"]    = 9
  tagScores["healthcare"] = 9
  creatorScores["Dr. Mehta"] = 9
```

**Next feed rerank** — Medical videos with `doctor` or `healthcare` tags now score higher:

| Video                   | Category | Before | After | Change |
|-------------------------|----------|--------|-------|--------|
| Career as Surgeon (saved) | MED    | 9      | 9 + 13.5(doctor×1.5) + 13.5(surgery) + 13.5(healthcare) + 18(creator×2) + 10(liked) + 12(saved) = **~89** | +80 |
| NEET Biology Revision   | MED      | 9      | 9 + 13.5(healthcare tag) = **~22** | +13 |
| Medical Student Life    | MED      | 9      | 9 + 13.5(doctor tag) = **~22** | +13 |

The saved medical video now scores **89** — higher than most engineering videos! It'll appear near the top. Other medical videos with overlapping tags also rise in the cross-category slots.

### Example 3: Two Engineering Users See Different Feeds

**Demo Student** (interests: `coding, campus, college, placement`)
**Rahul Kumar** (interests: `gate, calculus, mechanics, iit, physics`)

For the same engineering video "Understanding Calculus" (tags: `calculus, mathematics, engineering`):

```
Demo Student:  40(cat) + 0(no tag match) = 40
Rahul Kumar:   40(cat) + 8(calculus) + 8(mathematics) = 56
```

Rahul sees calculus videos ranked much higher. Demo Student sees coding/placement videos higher instead.

---

## 9. Backend Recommendation Engine

The Flask backend (`backend/recommendation_engine.py`) mirrors this logic for production with Firebase:

| Component        | Frontend (Demo)         | Backend (Production)                |
|------------------|-------------------------|-------------------------------------|
| Data source      | CSV + in-memory state   | Firebase Firestore                  |
| Scoring          | `scoreVideo()` function | `SimpleRecommendationEngine` class  |
| Weights          | 50% content, 25% tags, 15% engagement, 10% creator | 50% content, 30% collaborative, 20% trending |
| Persistence      | React state (session)   | Firestore `interactions` collection |
| Cross-category   | Interleaving (1 in 5)   | Diversity filter (no same creator back-to-back) |
| Watch time       | Client-side timer       | Event-based logging                 |

The backend adds **collaborative filtering** (users who liked similar videos) which the frontend doesn't have since all users are independent in the demo.

---

## 10. Future Enhancements

### Planned

- **Firebase persistence** — Store engagement data in Firestore so it survives page refresh
- **Collaborative filtering** — "Users who liked X also liked Y"
- **Time decay** — Recent interactions weighted more than old ones
- **Negative signals** — Track "scrolled past without clicking" as a weak negative signal
- **A/B testing** — Compare different weight configurations

### Research Directions

- **Content embeddings** — Use NLP to embed video titles/descriptions for semantic similarity
- **Sequential modeling** — Consider the order of interactions (RNN/Transformer-based)
- **Multi-armed bandits** — Balance exploration vs. exploitation mathematically
- **Cold start** — Better handling of brand new users with no interaction history

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
| `backend/recommendation_engine.py` | `SimpleRecommendationEngine` | Server-side hybrid recommender |
