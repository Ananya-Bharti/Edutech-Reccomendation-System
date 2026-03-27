#!/usr/bin/env python3
"""
Upload all videos and metadata to Firebase
Run this ONCE to populate your Firebase project
"""

import sys
sys.path.append('../backend')

import csv
from pathlib import Path
from firebase_config import db, bucket
from datetime import datetime


def upload_videos_to_storage(csv_path, videos_base_path):
    """Upload all videos from local folders to Cloud Storage"""
    
    print("📤 UPLOADING VIDEOS TO FIREBASE STORAGE\n")
    print("=" * 60)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    total = len(rows)
    
    for idx, row in enumerate(rows, 1):
        video_id = row['video_id']
        category = row['category']
        
        # Determine local path
        local_path = Path(videos_base_path) / category / f"{video_id}.mp4"
        
        if not local_path.exists():
            print(f"[{idx}/{total}] ⚠️  {video_id}: File not found at {local_path}")
            continue
        
        # Upload to Cloud Storage
        blob = bucket.blob(f"videos/{video_id}.mp4")
        
        print(f"[{idx}/{total}] Uploading {video_id}...", end=' ')
        
        blob.upload_from_filename(str(local_path))
        blob.make_public()
        
        print(f"✅ ({blob.public_url})")
    
    print("\n" + "=" * 60)
    print("🎉 All videos uploaded to Cloud Storage!")


def upload_metadata_to_firestore(csv_path):
    """Upload video metadata to Firestore"""
    
    print("\n📝 UPLOADING METADATA TO FIRESTORE\n")
    print("=" * 60)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    total = len(rows)
    
    for idx, row in enumerate(rows, 1):
        video_id = row['video_id']
        
        # Get public URL from Storage
        blob = bucket.blob(f"videos/{video_id}.mp4")
        video_url = blob.public_url
        
        # Create Firestore document
        video_data = {
            'video_id': video_id,
            'title': row['title'],
            'tags': row['tags'].split(','),
            'category': row['category'],
            'subcategory': row['subcategory'],
            'difficulty': row['difficulty'],
            'target_audience': row['target_audience'],
            'creator_id': row['creator_id'],
            'creator_name': row['creator_name'],
            'duration': int(row['duration']),
            'video_url': video_url,
            'thumbnail_url': '',  # Can generate later
            
            # Initialize engagement counters
            'view_count': 0,
            'like_count': 0,
            'share_count': 0,
            'save_count': 0,
            'comment_count': 0,
            
            'uploaded_at': datetime.now(),
            'processed': True
        }
        
        db.collection('videos').document(video_id).set(video_data)
        
        print(f"[{idx}/{total}] ✅ {video_id}: {row['title']}")
    
    print("\n" + "=" * 60)
    print("🎉 All metadata uploaded to Firestore!")


def create_test_users():
    """Create test users for demo"""
    
    print("\n👥 CREATING TEST USERS\n")
    print("=" * 60)
    
    users = [
        {
            'user_id': 'demo_student',
            'name': 'Demo Student',
            'email': 'demo@student.com',
            'aspirant_type': 'engineering',
            'interests': ['jee', 'physics', 'coding', 'iit'],
            'education_level': '12th_grade',
            'followed_creators': [],
            'saved_videos': [],
            'created_at': datetime.now()
        },
        {
            'user_id': 'test_eng_001',
            'name': 'Rahul Kumar',
            'email': 'rahul@test.com',
            'aspirant_type': 'engineering',
            'interests': ['jee', 'mathematics', 'physics'],
            'education_level': '12th_grade',
            'followed_creators': ['creator_001', 'creator_002'],
            'saved_videos': [],
            'created_at': datetime.now()
        },
        {
            'user_id': 'test_med_001',
            'name': 'Priya Sharma',
            'email': 'priya@test.com',
            'aspirant_type': 'medical',
            'interests': ['neet', 'biology', 'chemistry'],
            'education_level': '12th_grade',
            'followed_creators': ['creator_006', 'creator_007'],
            'saved_videos': [],
            'created_at': datetime.now()
        },
        {
            'user_id': 'test_mba_001',
            'name': 'Amit Patel',
            'email': 'amit@test.com',
            'aspirant_type': 'mba',
            'interests': ['cat', 'quantitative', 'consulting'],
            'education_level': 'graduate',
            'followed_creators': ['creator_011', 'creator_012'],
            'saved_videos': [],
            'created_at': datetime.now()
        }
    ]
    
    for user in users:
        db.collection('users').document(user['user_id']).set(user)
        print(f"✅ Created: {user['name']} ({user['aspirant_type']})")
    
    print("\n" + "=" * 60)
    print("🎉 Test users created!")


def create_creators():
    """Create creator profiles"""
    
    print("\n👨‍🏫 CREATING CREATORS\n")
    print("=" * 60)
    
    creators = [
        # Engineering
        {'creator_id': 'creator_001', 'name': 'Dr. Sharma', 'category': 'engineering', 'role': 'counselor'},
        {'creator_id': 'creator_002', 'name': 'Prof. Gupta', 'category': 'engineering', 'role': 'counselor'},
        {'creator_id': 'creator_003', 'name': 'Mentor Ravi', 'category': 'engineering', 'role': 'probuddy'},
        {'creator_id': 'creator_004', 'name': 'Tech Expert', 'category': 'engineering', 'role': 'probuddy'},
        {'creator_id': 'creator_005', 'name': 'Eng Counselor', 'category': 'engineering', 'role': 'counselor'},
        
        # Medical
        {'creator_id': 'creator_006', 'name': 'Dr. Patel', 'category': 'medical', 'role': 'counselor'},
        {'creator_id': 'creator_007', 'name': 'Dr. Mehta', 'category': 'medical', 'role': 'counselor'},
        {'creator_id': 'creator_008', 'name': 'Prof. Anjali', 'category': 'medical', 'role': 'probuddy'},
        {'creator_id': 'creator_009', 'name': 'Dr. Kapoor', 'category': 'medical', 'role': 'counselor'},
        {'creator_id': 'creator_010', 'name': 'Medical Mentor', 'category': 'medical', 'role': 'probuddy'},
        
        # MBA
        {'creator_id': 'creator_011', 'name': 'Prof. Rao', 'category': 'mba', 'role': 'counselor'},
        {'creator_id': 'creator_012', 'name': 'MBA Mentor', 'category': 'mba', 'role': 'probuddy'},
        {'creator_id': 'creator_013', 'name': 'Business Expert', 'category': 'mba', 'role': 'counselor'},
        {'creator_id': 'creator_014', 'name': 'Strategy Coach', 'category': 'mba', 'role': 'probuddy'},
        {'creator_id': 'creator_015', 'name': 'IIM Professor', 'category': 'mba', 'role': 'counselor'}
    ]
    
    for creator in creators:
        creator['bio'] = f"{creator['role'].capitalize()} specializing in {creator['category']}"
        creator['follower_count'] = 0
        creator['video_count'] = 0
        creator['created_at'] = datetime.now()
        
        db.collection('creators').document(creator['creator_id']).set(creator)
        print(f"✅ Created: {creator['name']} ({creator['category']} {creator['role']})")
    
    print("\n" + "=" * 60)
    print("🎉 Creators created!")


def main():
    """Run complete Firebase setup"""
    
    print("\n" + "=" * 60)
    print("🚀 FIREBASE SETUP - COMPLETE UPLOAD")
    print("=" * 60)
    
    csv_path = '../Videos data/videos_metadata.csv'
    videos_path = '../Videos data'
    
    # Step 1: Upload videos to Cloud Storage
    upload_videos_to_storage(csv_path, videos_path)
    
    # Step 2: Upload metadata to Firestore
    upload_metadata_to_firestore(csv_path)
    
    # Step 3: Create test users
    create_test_users()
    
    # Step 4: Create creators
    create_creators()
    
    print("\n" + "=" * 60)
    print("✅ FIREBASE SETUP COMPLETE!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Start backend: cd backend && python app.py")
    print("2. Start frontend: cd frontend && npm run dev")
    print("3. Open browser: http://localhost:3000")


if __name__ == '__main__':
    main()
