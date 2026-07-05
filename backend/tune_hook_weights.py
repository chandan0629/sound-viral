import os
import glob
import json
import librosa
import numpy as np
import warnings
from app import extract_features_from_array, predictor, load_model_globally

# Suppress librosa warnings for cleaner output
warnings.filterwarnings('ignore')

# The default parameters proposed in V2 plan
DEFAULT_WEIGHTS = {
    'model_prob': 0.40,
    'energy_dev': 0.30,
    'danceability': 0.20,
    'novelty': 0.10
}

def analyze_track_segments(file_path, weights):
    """
    Analyze a single track and return the top scored segment based on provided weights.
    """
    try:
        y, sr = librosa.load(file_path, sr=22050, mono=True)
        if len(y) == 0:
            return None
            
        # Get beat tracking for structural boundaries
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        if len(beat_times) < 10:
            return None # Too short or no beats
            
        total_duration = librosa.get_duration(y=y, sr=sr)
        
        # Calculate global median energy to find deviations
        rms = librosa.feature.rms(y=y)[0]
        global_median_energy = np.median(rms)
        global_max_energy = np.max(rms) + 1e-10
        
        segments = []
        
        # Simple sliding window snapped to nearest beats (~15s)
        window_sec = 15.0
        stride_sec = 5.0
        
        for start_sec in np.arange(0, total_duration - window_sec, stride_sec):
            # Snap start to nearest beat
            start_idx = np.argmin(np.abs(beat_times - start_sec))
            snapped_start = beat_times[start_idx]
            
            # Snap end to nearest beat around start + 15
            end_idx = np.argmin(np.abs(beat_times - (snapped_start + window_sec)))
            snapped_end = beat_times[end_idx]
            
            if snapped_end - snapped_start < 5.0:
                continue # Skip too short segments
                
            # Extract array for this window
            start_sample = int(snapped_start * sr)
            end_sample = int(snapped_end * sr)
            y_chunk = y[start_sample:end_sample]
            
            # Base features
            chunk_features = extract_features_from_array(y_chunk, sr)
            if not chunk_features:
                continue
                
            # Global normalization
            chunk_features['duration_ms'] = int(total_duration * 1000)
            chunk_features['target_year'] = 2024
            
            # Predict XGBoost probability
            pred_result = predictor.predict_song_hit_probability(chunk_features)
            if not pred_result:
                continue
            model_prob = pred_result['hit_probability']
            
            # Local Energy Deviation (normalized 0-1)
            chunk_rms = librosa.feature.rms(y=y_chunk)[0]
            chunk_mean_energy = np.mean(chunk_rms)
            energy_dev = np.clip((chunk_mean_energy - global_median_energy) / global_max_energy, 0, 1)
            
            # Danceability (from librosa feature extraction)
            danceability = chunk_features.get('danceability', 0.5)
            
            # Novelty / Onset Strength (How hard the beat drops)
            chunk_onset = librosa.onset.onset_strength(y=y_chunk, sr=sr)
            novelty = np.clip(np.mean(chunk_onset) / 10.0, 0, 1) # roughly normalized
            
            # Composite Score
            score = (
                weights['model_prob'] * model_prob +
                weights['energy_dev'] * energy_dev +
                weights['danceability'] * danceability +
                weights['novelty'] * novelty
            )
            
            segments.append({
                'start': snapped_start,
                'end': snapped_end,
                'score': score,
                'model_prob': model_prob,
                'energy_dev': energy_dev,
                'danceability': danceability,
                'novelty': novelty
            })
            
        if not segments:
            return None
            
        # Return best segment
        segments.sort(key=lambda x: x['score'], reverse=True)
        return segments[0]
        
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return None


def tune_weights(audio_dir, parameter_grid):
    """
    Run empirical tuning over a directory of MP3/WAV files.
    """
    print(f"Loading Global XGBoost Model...")
    load_model_globally()
    
    audio_files = glob.glob(os.path.join(audio_dir, '*.mp3')) + glob.glob(os.path.join(audio_dir, '*.wav'))
    if not audio_files:
        print(f"No audio files found in {audio_dir}. Please add some tracks to tune.")
        return
        
    print(f"Found {len(audio_files)} validation tracks. Starting tuning process...")
    
    results = []
    
    for weights in parameter_grid:
        print(f"\n--- Testing Configuration ---")
        print(f"Weights: {weights}")
        config_scores = []
        
        for file in audio_files[:5]: # Limit to 5 for speed during testing
            filename = os.path.basename(file)
            best_segment = analyze_track_segments(file, weights)
            if best_segment:
                print(f"  Track: {filename} -> Hook at {best_segment['start']:.1f}s - {best_segment['end']:.1f}s (Score: {best_segment['score']:.3f})")
                config_scores.append(best_segment['score'])
                
        if config_scores:
            avg_score = np.mean(config_scores)
            results.append({
                'weights': weights,
                'avg_score': avg_score
            })
            print(f"  --> Average Hook Confidence: {avg_score:.3f}")
            
    # Sort results
    results.sort(key=lambda x: x['avg_score'], reverse=True)
    print("\n===============================")
    print("🏆 BEST CONFIGURATION FOUND 🏆")
    print("===============================")
    best = results[0]
    print(json.dumps(best['weights'], indent=2))
    print(f"Validation Score: {best['avg_score']:.3f}")


if __name__ == "__main__":
    # Define a simple grid search for weights
    grid = [
        # Baseline (Balanced)
        {'model_prob': 0.40, 'energy_dev': 0.30, 'danceability': 0.20, 'novelty': 0.10},
        # Model Heavy (Trust the global trends)
        {'model_prob': 0.70, 'energy_dev': 0.10, 'danceability': 0.10, 'novelty': 0.10},
        # Energy Heavy (Loudest part wins)
        {'model_prob': 0.20, 'energy_dev': 0.50, 'danceability': 0.10, 'novelty': 0.20},
        # Danceability Heavy (TikTok specific)
        {'model_prob': 0.20, 'energy_dev': 0.20, 'danceability': 0.50, 'novelty': 0.10},
    ]
    
    print("Viral Hook Detection - Empirical Tuning Script")
    print("Usage: Place your validation MP3 files in a directory and run this script.")
    
    # We create a dummy dir for example purposes. 
    # User will run this with their actual directory path.
    tuning_dir = "./validation_audio"
    if not os.path.exists(tuning_dir):
        os.makedirs(tuning_dir)
        print(f"\n[INFO] Created directory '{tuning_dir}'. Please place validation MP3s here and re-run.")
    else:
        tune_weights(tuning_dir, grid)
