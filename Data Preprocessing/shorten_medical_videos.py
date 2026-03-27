#!/usr/bin/env python3
"""
Shorten all videos in medical folder to random lengths (30-90 seconds)
Requires: ffmpeg installed
"""

import os
import subprocess
import random
from pathlib import Path

def shorten_video(input_path, output_path, duration):
    """
    Cut video to specified duration using ffmpeg
    
    Args:
        input_path: Original video file
        output_path: Where to save shortened video
        duration: Length in seconds
    """
    command = [
        r'F:\SoftwareVIT\ffpmeg\ffmpeg-2026-03-26-git-fd9f1e9c52-essentials_build\bin\ffmpeg.exe',
        '-i', str(input_path),
        '-t', str(duration),  # Duration
        '-c:v', 'libx264',    # Video codec
        '-c:a', 'aac',        # Audio codec
        '-y',                 # Overwrite without asking
        str(output_path)
    ]
    
    try:
        subprocess.run(command, 
                      stdout=subprocess.DEVNULL, 
                      stderr=subprocess.DEVNULL,
                      check=True)
        return True
    except subprocess.CalledProcessError:
        return False

def process_medical_folder():
    """Shorten all videos in medical folder"""
    
    medical_folder = Path('../Videos data/medical')
    temp_folder = Path('../Videos data/medical_temp')
    temp_folder.mkdir(parents=True, exist_ok=True)
    
    # Get all video files
    video_files = list(medical_folder.glob('*.mp4')) + \
                  list(medical_folder.glob('*.mov')) + \
                  list(medical_folder.glob('*.avi')) + \
                  list(medical_folder.glob('*.mkv'))
    
    print(f"🎬 Found {len(video_files)} videos in medical folder")
    print("✂️  Shortening videos to random lengths (30-90 seconds)...\n")
    
    for idx, video_file in enumerate(video_files, 1):
        # Random duration between 30-90 seconds
        random_duration = random.randint(30, 90)
        
        # Output to temp folder
        output_path = temp_folder / video_file.name
        
        print(f"[{idx}/{len(video_files)}] {video_file.name}")
        print(f"    Shortening to {random_duration} seconds...", end=' ')
        
        success = shorten_video(video_file, output_path, random_duration)
        
        if success:
            print("✅")
            # Replace original with shortened version
            output_path.replace(video_file)
        else:
            print("❌ Failed")
    
    # Clean up temp folder
    temp_folder.rmdir()
    
    print("\n🎉 All medical videos shortened!")

if __name__ == '__main__':
    # Check if ffmpeg is installed
    try:
        subprocess.run([r'F:\SoftwareVIT\ffpmeg\ffmpeg-2026-03-26-git-fd9f1e9c52-essentials_build\bin\ffmpeg.exe', '-version'], 
                      stdout=subprocess.DEVNULL, 
                      stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        print("❌ ffmpeg not found!")
        print("\nInstall it:")
        print("  Windows: choco install ffmpeg")
        print("  Mac: brew install ffmpeg")
        print("  Linux: sudo apt install ffmpeg")
        exit(1)
    
    process_medical_folder()