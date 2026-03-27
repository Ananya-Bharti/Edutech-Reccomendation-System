#!/usr/bin/env python3
"""
Generate metadata CSV for all 150 videos across engineering, medical, MBA
"""

import csv
import random
from pathlib import Path

# Tag pools for each category
TAGS = {
    'engineering': {
        'exam': ['jee', 'gate', 'physics', 'mathematics', 'chemistry', 'mechanics', 'calculus'],
        'college': ['iit', 'nit', 'campus', 'hostel', 'engineering', 'student', 'project'],
        'career': ['software', 'coding', 'developer', 'tech', 'startup', 'placement', 'interview']
    },
    'medical': {
        'exam': ['neet', 'aiims', 'biology', 'anatomy', 'physiology', 'chemistry', 'organic'],
        'college': ['mbbs', 'medical', 'college', 'hospital', 'practicals', 'student', 'campus'],
        'career': ['doctor', 'surgeon', 'physician', 'specialization', 'residency', 'healthcare']
    },
    'mba': {
        'exam': ['cat', 'gmat', 'quantitative', 'verbal', 'reasoning', 'aptitude', 'mba'],
        'college': ['iim', 'business', 'school', 'mba', 'campus', 'student', 'case', 'study'],
        'career': ['consulting', 'finance', 'marketing', 'strategy', 'entrepreneur', 'management']
    }
}

# Creators
CREATORS = {
    'engineering': [
        ('creator_001', 'Dr. Sharma'),
        ('creator_002', 'Prof. Gupta'),
        ('creator_003', 'Mentor Ravi'),
        ('creator_004', 'Tech Expert'),
        ('creator_005', 'Eng Counselor')
    ],
    'medical': [
        ('creator_006', 'Dr. Patel'),
        ('creator_007', 'Dr. Mehta'),
        ('creator_008', 'Prof. Anjali'),
        ('creator_009', 'Dr. Kapoor'),
        ('creator_010', 'Medical Mentor')
    ],
    'mba': [
        ('creator_011', 'Prof. Rao'),
        ('creator_012', 'MBA Mentor'),
        ('creator_013', 'Business Expert'),
        ('creator_014', 'Strategy Coach'),
        ('creator_015', 'IIM Professor')
    ]
}

# Title templates
TITLES = {
    'engineering': [
        "JEE {subject} Quick Tips",
        "Understanding {topic}",
        "Engineering {subject} Explained",
        "{college} Campus Life",
        "Career as {role}",
        "GATE Preparation Guide"
    ],
    'medical': [
        "NEET {subject} Revision",
        "{topic} Made Easy",
        "Medical Student Life",
        "MBBS Journey Explained",
        "Career as {specialization}",
        "Understanding {topic}"
    ],
    'mba': [
        "CAT {subject} Tips",
        "IIM Interview Preparation",
        "MBA Career in {field}",
        "Business School Life",
        "{topic} Concepts",
        "Management Fundamentals"
    ]
}

def generate_title(category):
    """Generate random title for category"""
    template = random.choice(TITLES[category])
    
    replacements = {
        'engineering': {
            'subject': random.choice(['Physics', 'Math', 'Chemistry']),
            'topic': random.choice(['Mechanics', 'Calculus', 'Thermodynamics']),
            'college': random.choice(['IIT', 'NIT', 'IIIT']),
            'role': random.choice(['Software Engineer', 'Data Scientist'])
        },
        'medical': {
            'subject': random.choice(['Biology', 'Chemistry', 'Physics']),
            'topic': random.choice(['Anatomy', 'Cell Biology', 'Physiology']),
            'specialization': random.choice(['Surgeon', 'Cardiologist', 'Physician'])
        },
        'mba': {
            'subject': random.choice(['Quantitative', 'Verbal', 'Reasoning']),
            'topic': random.choice(['Marketing', 'Finance', 'Strategy']),
            'field': random.choice(['Consulting', 'Finance', 'Marketing'])
        }
    }
    
    for key, value in replacements[category].items():
        template = template.replace(f'{{{key}}}', value)
    
    return template

def generate_tags(category, count=5):
    """Generate random tags from category pool"""
    all_tags = []
    for tag_list in TAGS[category].values():
        all_tags.extend(tag_list)
    
    # Remove duplicates and shuffle
    all_tags = list(set(all_tags))
    random.shuffle(all_tags)
    
    return all_tags[:count]

def main():
    """Generate metadata CSV for all 150 videos"""
    
    print("📝 GENERATING METADATA FOR ALL VIDEOS\n")
    print("=" * 60)
    
    rows = []
    
    # Define ranges
    categories = [
    ('engineering', 1, 49),
    ('medical', 50, 99),
    ('mba', 100, 142)
]
    
    # Subcategories cycle through
    subcats = ['exam', 'college', 'career']
    
    for category, start, end in categories:
        print(f"\n📁 {category.upper()}:")
        
        for num in range(start, end + 1):
            # Assign subcategory (rotates through 3 types)
            subcat = subcats[(num - start) % 3]
            
            # Generate metadata
            video_id = f"vid_{num:03d}"
            title = generate_title(category)
            tags = generate_tags(category, count=random.randint(4, 6))
            creator_id, creator_name = random.choice(CREATORS[category])
            duration = random.randint(35, 90)
            
            row = {
                'video_id': video_id,
                'title': title,
                'tags': ','.join(tags),
                'category': category,
                'subcategory': subcat,
                'difficulty': random.choice(['beginner', 'intermediate', 'advanced']),
                'target_audience': f'{category}_aspirant',
                'creator_id': creator_id,
                'creator_name': creator_name,
                'duration': duration,
                'video_file': f'{category}/{video_id}.mp4'
            }
            
            rows.append(row)
            print(f"  {video_id}: {title}")
    
    # Write CSV
    output_file = '../Videos data/videos_metadata.csv'
    
    fieldnames = [
        'video_id', 'title', 'tags', 'category', 'subcategory',
        'difficulty', 'target_audience', 'creator_id', 'creator_name',
        'duration', 'video_file'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print("\n" + "=" * 60)
    print(f"🎉 METADATA GENERATED!")
    print(f"📄 File: {output_file}")
    print(f"📊 Total videos: {len(rows)}")
    print("=" * 60)
    
    # Show sample
    print("\n📋 SAMPLE (first 5 rows):")
    print("-" * 60)
    for row in rows[:5]:
        print(f"{row['video_id']} | {row['category']} | {row['title']}")

if __name__ == '__main__':
    main()