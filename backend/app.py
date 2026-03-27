from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_config import db, bucket
from recommendation_engine import SimpleRecommendationEngine
from datetime import datetime
import firebase_admin
from firebase_admin import firestore
from collections import defaultdict

app = Flask(__name__)
CORS(app)

rec_engine = SimpleRecommendationEngine(db)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all test users for demo user selection"""
    users = []
    docs = db.collection('users').stream()
    for doc in docs:
        user_data = doc.to_dict()
        users.append({
            'user_id': user_data['user_id'],
            'name': user_data['name'],
            'aspirant_type': user_data['aspirant_type']
        })
    return jsonify({'users': users})

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    """Get personalized recommendations for a user"""
    user_id = request.args.get('user_id')
    limit = int(request.args.get('limit', 20))
    
    if not user_id:
        return jsonify({'error': 'user_id required'}), 400
    
    try:
        videos = rec_engine.get_recommendations(user_id, limit)
        return jsonify({'videos': videos, 'count': len(videos)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/videos/<video_id>', methods=['GET'])
def get_video(video_id):
    """Get single video details"""
    video_ref = db.collection('videos').document(video_id)
    video = video_ref.get()
    
    if not video.exists:
        return jsonify({'error': 'Video not found'}), 404
    
    return jsonify({'video': video.to_dict()})

@app.route('/api/interactions', methods=['POST'])
def track_interaction():
    """Track user interaction (view, like, share, save, comment)"""
    data = request.get_json()
    
    required = ['user_id', 'video_id', 'event_type']
    if not all(field in data for field in required):
        return jsonify({'error': 'Missing required fields'}), 400
    
    interaction = {
        'user_id': data['user_id'],
        'video_id': data['video_id'],
        'event_type': data['event_type'],
        'watch_time': data.get('watch_time', 0),
        'completion_rate': data.get('completion_rate', 0),
        'comment_text': data.get('comment_text', ''),
        'timestamp': datetime.now()
    }
    
    db.collection('interactions').add(interaction)
    
    video_ref = db.collection('videos').document(data['video_id'])
    
    if data['event_type'] == 'view':
        video_ref.update({'view_count': firestore.Increment(1)})
    elif data['event_type'] == 'like':
        video_ref.update({'like_count': firestore.Increment(1)})
    elif data['event_type'] == 'share':
        video_ref.update({'share_count': firestore.Increment(1)})
    elif data['event_type'] == 'save':
        video_ref.update({'save_count': firestore.Increment(1)})
    elif data['event_type'] == 'comment':
        video_ref.update({'comment_count': firestore.Increment(1)})
    
    rec_engine.cache = {}
    
    return jsonify({'success': True})

@app.route('/api/analytics/<user_id>', methods=['GET'])
def get_analytics(user_id):
    """Get user analytics for demo dashboard"""
    user_ref = db.collection('users').document(user_id)
    user = user_ref.get().to_dict()
    
    interactions = db.collection('interactions')\
        .where('user_id', '==', user_id)\
        .stream()
    
    stats = {
        'total_views': 0,
        'total_likes': 0,
        'total_shares': 0,
        'total_comments': 0,
        'avg_watch_time': 0,
        'category_distribution': defaultdict(int),
        'tag_distribution': defaultdict(int)
    }
    
    watch_times = []
    
    for interaction in interactions:
        int_data = interaction.to_dict()
        event_type = int_data['event_type']
        
        if event_type == 'view':
            stats['total_views'] += 1
            watch_times.append(int_data.get('watch_time', 0))
            
            video = db.collection('videos').document(int_data['video_id']).get().to_dict()
            if video:
                stats['category_distribution'][video['category']] += 1
                
                for tag in video.get('tags', []):
                    stats['tag_distribution'][tag] += 1
        
        elif event_type == 'like':
            stats['total_likes'] += 1
        elif event_type == 'share':
            stats['total_shares'] += 1
        elif event_type == 'comment':
            stats['total_comments'] += 1
    
    if watch_times:
        stats['avg_watch_time'] = sum(watch_times) / len(watch_times)
    
    # Convert defaultdicts to regular dicts for JSON serialization
    stats['category_distribution'] = dict(stats['category_distribution'])
    stats['tag_distribution'] = dict(stats['tag_distribution'])
    
    return jsonify({'user': user, 'stats': stats})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
