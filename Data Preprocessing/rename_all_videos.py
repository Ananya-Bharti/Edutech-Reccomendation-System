#!/usr/bin/env python3
"""
Rename all videos in engineering, medical, mba folders
Format: vid_001.mp4, vid_002.mp4, etc.
"""

import os
from pathlib import Path

def rename_folder(folder_path, start_num):
    """
    Rename all videos in folder to vid_XXX.mp4 format
    
    Args:
        folder_path: Path to folder
        start_num: Starting number (e.g., 1, 51, 101)
    
    Returns:
        Number of files renamed
    """
    folder = Path(folder_path)
    
    # Get all video files
    extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']
    videos = [f for f in folder.iterdir() 
              if f.is_file() and f.suffix.lower() in extensions]
    
    # Sort alphabetically for consistent ordering
    videos.sort(key=lambda x: x.name.lower())
    
    # Rename each video
    for i, video in enumerate(videos):
        new_num = start_num + i
        new_name = f"vid_{new_num:03d}{video.suffix.lower()}"
        new_path = folder / new_name
        
        # Skip if already named correctly
        if video.name == new_name:
            continue
        
        # Rename
        video.rename(new_path)
        print(f"  ✅ {video.name} → {new_name}")
    
    return len(videos)

def main():
    """Rename videos in all three folders"""
    
    print("📝 RENAMING ALL VIDEOS\n")
    print("=" * 60)
    
    folders = [
    ('../Videos data/engineering', 1, 'Engineering'),
    ('../Videos data/medical', 50, 'Medical'),
    ('../Videos data/mba', 100, 'MBA')
    ]
    
    total_renamed = 0
    
    for folder_path, start_num, name in folders:
        print(f"\n📁 {name} Folder:")
        print(f"   Path: {folder_path}")
        print(f"   Starting at: vid_{start_num:03d}.mp4")
        print("-" * 60)
        
        if not os.path.exists(folder_path):
            print(f"   ⚠️  Folder not found! Skipping...")
            continue
        
        count = rename_folder(folder_path, start_num)
        total_renamed += count
        print(f"\n   ✅ Renamed {count} videos")
    
    print("\n" + "=" * 60)
    print(f"🎉 DONE! Total videos renamed: {total_renamed}")
    print("=" * 60)

if __name__ == '__main__':
    main()