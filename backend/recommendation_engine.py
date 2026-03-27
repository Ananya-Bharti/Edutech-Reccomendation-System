from collections import defaultdict
import numpy as np

class SimpleRecommendationEngine:
    """
    Hybrid recommendation system:
    - 50% Content-based (tags + category matching)
    - 30% Collaborative filtering (similar users)
    - 20% Trending (popularity)
    """
    
    def __init__(self, db):
        self.db = db
        self.cache = {}
    
    def get_recommendations(self, user_id, limit=20):
        """Main recommendation function"""
        user = self._get_user(user_id)
        if not user:
            return self._get_trending_videos(limit)
        
        all_videos = self._get_all_videos()
        scores = {}
        
        for video in all_videos:
            video_id = video['video_id']
            
            if self._user_watched_video(user_id, video_id):
                continue
            
            content_score = self._content_based_score(user, video)
            collab_score = self._collaborative_score(user_id, video_id)
            trending_score = self._trending_score(video)
            
            total_score = (
                content_score * 0.5 +
                collab_score * 0.3 +
                trending_score * 0.2
            )
            
            scores[video_id] = total_score
        
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        diversified = self._apply_diversity(ranked, limit)
        
        recommended_ids = [vid_id for vid_id, score in diversified]
        return [v for v in all_videos if v['video_id'] in recommended_ids]
    
    def _content_based_score(self, user, video):
        """Score based on user profile matching video attributes"""
        score = 0
        
        user_category = user.get('aspirant_type', 'undecided')
        video_category = video.get('category', 'general')
        
        if user_category == video_category:
            score += 10
        elif video_category == 'general':
            score += 5
        
        user_interests = set(user.get('interests', []))
        video_tags = set(video.get('tags', []))
        tag_overlap = len(user_interests & video_tags)
        score += tag_overlap * 3
        
        if video.get('creator_id') in user.get('followed_creators', []):
            score += 8
        
        return score
    
    def _collaborative_score(self, user_id, video_id):
        """Score based on similar users' behavior"""
        score = 0
        user_likes = self._get_user_interactions(user_id, 'like')
        
        if not user_likes:
            return 0
        
        video_likers = self._get_video_likers(video_id)
        
        for other_user_id in video_likers[:10]:
            if other_user_id == user_id:
                continue
            
            other_likes = self._get_user_interactions(other_user_id, 'like')
            intersection = len(set(user_likes) & set(other_likes))
            union = len(set(user_likes) | set(other_likes))
            
            if union > 0:
                similarity = intersection / union
                score += similarity * 5
        
        return min(score, 10)
    
    def _trending_score(self, video):
        """Score based on recent engagement"""
        engagement = (
            video.get('view_count', 0) * 1 +
            video.get('like_count', 0) * 3 +
            video.get('share_count', 0) * 5
        )
        return min(engagement / 100, 10)
    
    def _apply_diversity(self, ranked_videos, limit):
        """Ensure variety in creators"""
        diversified = []
        last_creator = None
        
        for video_id, score in ranked_videos:
            if len(diversified) >= limit:
                break
            
            video = self._get_video(video_id)
            creator = video.get('creator_id')
            
            if creator != last_creator:
                diversified.append((video_id, score))
                last_creator = creator
        
        return diversified
    
    # Helper methods
    def _get_user(self, user_id):
        cache_key = f"user_{user_id}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        user_ref = self.db.collection('users').document(user_id)
        user = user_ref.get()
        
        if user.exists:
            data = user.to_dict()
            self.cache[cache_key] = data
            return data
        return None
    
    def _get_all_videos(self):
        if 'all_videos' in self.cache:
            return self.cache['all_videos']
        
        videos = []
        docs = self.db.collection('videos').stream()
        for doc in docs:
            videos.append(doc.to_dict())
        
        self.cache['all_videos'] = videos
        return videos
    
    def _get_video(self, video_id):
        cache_key = f"video_{video_id}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        video_ref = self.db.collection('videos').document(video_id)
        video = video_ref.get()
        
        if video.exists:
            data = video.to_dict()
            self.cache[cache_key] = data
            return data
        return None
    
    def _user_watched_video(self, user_id, video_id):
        interactions = self.db.collection('interactions')\
            .where('user_id', '==', user_id)\
            .where('video_id', '==', video_id)\
            .where('event_type', '==', 'view')\
            .limit(1)\
            .stream()
        
        return len(list(interactions)) > 0
    
    def _get_user_interactions(self, user_id, event_type):
        interactions = self.db.collection('interactions')\
            .where('user_id', '==', user_id)\
            .where('event_type', '==', event_type)\
            .stream()
        
        return [i.to_dict()['video_id'] for i in interactions]
    
    def _get_video_likers(self, video_id):
        interactions = self.db.collection('interactions')\
            .where('video_id', '==', video_id)\
            .where('event_type', '==', 'like')\
            .stream()
        
        return [i.to_dict()['user_id'] for i in interactions]
    
    def _get_trending_videos(self, limit):
        from firebase_admin import firestore as fs
        videos = self.db.collection('videos')\
            .order_by('view_count', direction=fs.Query.DESCENDING)\
            .limit(limit)\
            .stream()
        
        return [v.to_dict() for v in videos]
