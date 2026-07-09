import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import ReportTemplate from './ReportTemplate';
import TiltCard from './TiltCard';
import './LiveRecording.css';

export default function LiveRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [analyzingHooks, setAnalyzingHooks] = useState(false);
  const [hookLoadingText, setHookLoadingText] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const reportRef = useRef(null);
  const audioRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:5001');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const jumpToHook = (startTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(e => console.log("Auto-play prevented", e));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const wavBlob = await convertToWav(webmBlob);
          const url = URL.createObjectURL(wavBlob);
          setAudioBlob(wavBlob);
          setAudioUrl(url);
        } catch (err) {
          setError('Failed to process recorded audio.');
          console.error(err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioUrl(null);
      setAudioBlob(null);
      setResult(null);
      setError(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied or not available.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const convertToWav = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    // Force 44.1kHz sample rate to match ML model expectations
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // We only need 1 channel (Mono)
    const channelData = audioBuffer.getChannelData(0);
    
    // Encode to 16-bit PCM WAV
    const wavBuffer = encodeWAV(channelData, 44100);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const encodeWAV = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // 1 channel (Mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // sampleRate * blockAlign
    view.setUint16(32, 2, true); // blockAlign
    view.setUint16(34, 16, true); // bitsPerSample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write 16-bit PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return view;
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;

    setError(null);
    setUploading(true);
    setAnalyzing(false);
    setProgress(0);

    try {
      const formData = new FormData();
      // Send as recording.wav
      formData.append('file', audioBlob, 'live_recording.wav');

      const response = await fetch(`${BACKEND_URL}/api/analyze-audio`, {
        method: 'POST',
        body: formData,
      });

      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setProgress(100);

      setUploading(false);
      setAnalyzing(true);

      setTimeout(() => {
        setAnalyzing(false);
        setResult({
          fileName: 'Live Recording',
          viralScore: (data.hit_probability * 100).toFixed(1),
          isViral: data.hit_probability > 0.6,
          confidence: (data.confidence * 100).toFixed(0),
          prediction: data.prediction,
          features: data.features || data.extracted_features
        });
      }, 2000);

    } catch (err) {
      setError(err.message);
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleAnalyzeHooks = async () => {
    if (!audioBlob) return;
    
    setAnalyzingHooks(true);
    setError(null);
    
    const loadingTexts = [
      'Extracting spectral flux...',
      'Computing beat synchronous features...',
      'Detecting novelty curves...',
      'Isolating chorus regions...',
      'Calculating hook potential...',
      'Finalizing temporal segments...'
    ];
    let idx = 0;
    setHookLoadingText(loadingTexts[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % loadingTexts.length;
      setHookLoadingText(loadingTexts[idx]);
    }, 1500);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'live_recording.wav');

      const response = await fetch(`${BACKEND_URL}/api/analyze-hooks`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setAnalyzingHooks(false);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hook analysis failed');
      }
      
      const hookData = await response.json();
      
      setResult(prev => ({
        ...prev,
        temporalSegments: hookData.temporal_segments || [],
        topHooks: hookData.top_hooks || [],
        totalDurationSec: prev.features.duration_ms ? prev.features.duration_ms / 1000 : 0
      }));
      
    } catch (err) {
      clearInterval(interval);
      setAnalyzingHooks(false);
      setError(err.message || 'Failed to analyze hooks.');
      console.error('Hook analysis error:', err);
    }
  };

  const handleDownloadReport = () => {
    if (!result || !reportRef.current) return;
    
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    const opt = {
      margin:       [15, 0, 15, 0],
      filename:     `virality_report_${timestamp}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], avoid: '.avoid-break' }
    };
    
    html2pdf().set(opt).from(reportRef.current).save();
  };

  const handleDownloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    link.download = `recorded_song_${timestamp}.wav`;
    link.click();
  };

  const resetRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="live-recording">
      <div className="page-header">
        <h2>Live Song Recording</h2>
        <p>Record your track using your microphone and predict its viral potential.</p>
      </div>

      <div className="test-container">
        {!result ? (
          <div className="upload-section">
            {error && (
              <div className="error-message">
                <span>{error}</span>
                <button onClick={() => setError(null)}>×</button>
              </div>
            )}

            <TiltCard tiltMax={5} className={`record-area ${isRecording ? 'recording' : ''}`}>
              <div className="record-content">
                <div className={`record-icon ${isRecording ? 'pulse' : ''}`}>🎤</div>
                <h3 className="timer">{formatTime(recordingTime)}</h3>
                {!audioUrl ? (
                  !isRecording ? (
                    <button className="btn primary large record-btn" onClick={startRecording} disabled={uploading || analyzing}>
                      Start Recording
                    </button>
                  ) : (
                    <button className="btn danger large record-btn" onClick={stopRecording}>
                      Stop Recording
                    </button>
                  )
                ) : (
                  <div className="audio-preview">
                    <p className="file-info">Recording Complete (WAV Format)</p>
                    <audio controls src={audioUrl} />
                    {!uploading && !analyzing && (
                      <div className="action-buttons">
                        <button className="btn secondary" onClick={resetRecording}>Record Again</button>
                        <button className="btn primary" onClick={handleAnalyze}>Analyze Recording</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TiltCard>

            {uploading && (
              <div className="progress-section">
                <div className="progress-text">Processing...</div>
                <div className="progress-bar">
                  <div className="progress-fill upload-progress" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {analyzing && (
              <div className="analysis-section">
                <div className="analysis-visual">
                  <div className="waveform">
                    {[...Array(50)].map((_, i) => (
                      <div key={i} className="wave-bar" style={{ '--height': `${30 + Math.random() * 70}%`, '--delay': `${i * 0.05}s` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="results-section">
            <TiltCard tiltMax={3} className={`result-card ${result.isViral ? 'viral' : 'not-viral'}`}>
              <div className="result-header">
                <h3>{result.isViral ? '🚀 Viral Hit!' : '📊 Below Average'}</h3>
                <p className="song-title">{result.fileName}</p>
              </div>

              <div className="viral-score-section">
                <div className="viral-meter">
                  <div className="viral-bar">
                    <div 
                      className="viral-fill"
                      style={{ width: `${result.viralScore}%` }}
                    ></div>
                  </div>
                  <div className="score-display">
                    <span className="score-value">{result.viralScore}%</span>
                    <span className="score-label">Viral Score</span>
                  </div>
                </div>

                <div className="confidence-badge">
                  <span className="confidence-icon">✓</span>
                  <span className="confidence-text">{result.confidence}% confidence</span>
                </div>
              </div>
              {/* VIRAL HOOK DETECTION TRIGGER */}
              {result.temporalSegments && result.temporalSegments.length === 0 && !analyzingHooks && (
                <div style={{ margin: '30px 0 40px', textAlign: 'center' }}>
                  <button 
                    onClick={handleAnalyzeHooks}
                    className="primary-button hook-button"
                    style={{
                      background: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)',
                      fontSize: '1.1rem',
                      padding: '15px 30px',
                      boxShadow: '0 8px 20px rgba(29, 185, 84, 0.4)'
                    }}
                  >
                    🎯 Analyze Viral Hooks
                  </button>
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Deep DSP analysis to find the best 15s TikTok segments (~10 seconds)
                  </p>
                </div>
              )}
              
              {/* HOOK LOADING STATE */}
              {analyzingHooks && (
                <div className="hook-loading" style={{ margin: '40px 0', textAlign: 'center', padding: '30px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <div className="hook-scanner-container" style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', borderRadius: '2px', marginBottom: '20px' }}>
                    <div className="hook-scanner" style={{
                      position: 'absolute',
                      top: 0, left: 0, height: '100%', width: '30%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 10px var(--accent)',
                      animation: 'scan 2s infinite ease-in-out alternate'
                    }}></div>
                  </div>
                  <style>{`
                    @keyframes scan {
                      0% { left: -10%; }
                      100% { left: 80%; }
                    }
                  `}</style>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '10px' }}>Analyzing Acoustic Structure</h4>
                  <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1.5s infinite' }}>{hookLoadingText}</p>
                </div>
              )}

              {/* VIRAL HOOK DETECTION TRIGGER */}
              {result.temporalSegments && result.temporalSegments.length === 0 && !analyzingHooks && (
                <div style={{ margin: '30px 0 40px', textAlign: 'center' }}>
                  <button 
                    onClick={handleAnalyzeHooks}
                    className="primary-button hook-button"
                    style={{
                      background: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)',
                      fontSize: '1.1rem',
                      padding: '15px 30px',
                      boxShadow: '0 8px 20px rgba(29, 185, 84, 0.4)'
                    }}
                  >
                    🎯 Analyze Viral Hooks
                  </button>
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Deep DSP analysis to find the best 15s TikTok segments (~10 seconds)
                  </p>
                </div>
              )}
              
              {/* HOOK LOADING STATE */}
              {analyzingHooks && (
                <div className="hook-loading" style={{ margin: '40px 0', textAlign: 'center', padding: '30px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <div className="hook-scanner-container" style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', borderRadius: '2px', marginBottom: '20px' }}>
                    <div className="hook-scanner" style={{
                      position: 'absolute',
                      top: 0, left: 0, height: '100%', width: '30%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 10px var(--accent)',
                      animation: 'scan 2s infinite ease-in-out alternate'
                    }}></div>
                  </div>
                  <style>{`
                    @keyframes scan {
                      0% { left: -10%; }
                      100% { left: 80%; }
                    }
                  `}</style>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '10px' }}>Analyzing Acoustic Structure</h4>
                  <p style={{ color: 'var(--text-secondary)', animation: 'pulse 1.5s infinite' }}>{hookLoadingText}</p>
                </div>
              )}

              {/* VIRAL HOOK DETECTION (HEATMAP) */}
              {result.temporalSegments && result.temporalSegments.length > 0 && (
                <div className="viral-hook-section" style={{ margin: '30px 0 40px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔥</span> Viral Hook Detection (15s Segments)
                  </h4>
                  
                  {(() => {
                    const bestSegment = [...result.temporalSegments].sort((a, b) => b.hit_probability - a.hit_probability)[0];
                    const formatTime = (secs) => {
                      const m = Math.floor(secs / 60);
                      const s = Math.floor(secs % 60);
                      return `${m}:${s.toString().padStart(2, '0')}`;
                    };
                    
                    return (
                      <>
                        <div className="top-hooks-list" style={{ marginBottom: '20px' }}>
                          
                          {/* Embedded Audio Player */}
                          {audioUrl && (
                            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                              <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Playback</h5>
                              <audio 
                                ref={audioRef} 
                                src={audioUrl} 
                                controls 
                                style={{ width: '100%', height: '40px', outline: 'none' }}
                              />
                            </div>
                          )}

                          {result.topHooks && result.topHooks.map((hook, idx) => (
                            <div 
                              key={idx} 
                              className="hook-callout" 
                              onClick={() => jumpToHook(hook.start_time)}
                              style={{ 
                                background: idx === 0 ? 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(255,107,107,0.05) 100%)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${idx === 0 ? 'rgba(255,107,107,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                padding: '12px 15px',
                                borderRadius: '8px',
                                marginBottom: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              <div>
                                <strong style={{ color: idx === 0 ? 'var(--accent)' : 'inherit', display: 'block', marginBottom: '4px' }}>
                                  {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : '🥉 '} {hook.type}
                                </strong>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {formatTime(hook.start_time)} - {formatTime(hook.end_time)} | {hook.description}
                                </p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent)' }}>
                                  {(hook.hook_score * 100).toFixed(1)}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Hook Score
                                </span>
                              </div>
                            </div>
                          ))}
                          
                          {/* Fallback for older API versions */}
                          {(!result.topHooks || result.topHooks.length === 0) && (
                            <div className="golden-hook-callout" style={{ 
                              background: 'linear-gradient(135deg, rgba(255,107,107,0.1) 0%, rgba(255,107,107,0.05) 100%)',
                              border: '1px solid rgba(255,107,107,0.3)',
                              padding: '15px',
                              borderRadius: '8px',
                              marginBottom: '20px'
                            }}>
                              <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px' }}>Golden Hook Identified!</strong>
                              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                The most viral snippet is from <strong>{formatTime(bestSegment.start_time)} - {formatTime(bestSegment.end_time)}</strong> 
                                &nbsp;({(bestSegment.hit_probability * 100).toFixed(1)}% Viral Potential). 
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="heatmap-container" style={{ position: 'relative', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          {result.temporalSegments.map((seg, i) => {
                            const widthPct = ((seg.end_time - seg.start_time) / result.totalDurationSec) * 100;
                            const leftPct = (seg.start_time / result.totalDurationSec) * 100;
                            // Map probability to color: Greenish for high, Reddish for low
                            const hue = seg.hit_probability > 0.5 ? 140 : 0;
                            const saturation = Math.abs(seg.hit_probability - 0.5) * 200; // 0 to 100%
                            const color = `hsl(${hue}, ${saturation}%, 50%)`;
                            
                            return (
                              <div 
                                key={i}
                                className="heatmap-segment"
                                title={`Time: ${formatTime(seg.start_time)}-${formatTime(seg.end_time)} | Hook Score: ${((seg.hook_score || seg.golden_candidate_score || seg.hit_probability || 0)*100).toFixed(1)}`}
                                style={{
                                  position: 'absolute',
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  height: '100%',
                                  background: color,
                                  opacity: 0.8,
                                  borderRight: '1px solid rgba(255,255,255,0.1)'
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="heatmap-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                          <span>0:00</span>
                          <span>{formatTime(result.totalDurationSec)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="result-features">
                <h4>🎵 Core Audio Features (12)</h4>
                <div className="features-grid">
                  <div className="feature">
                    <span className="feature-label">Danceability</span>
                    <div className="feature-bar">
                      <div className="feature-fill" style={{ width: `${result.features.danceability * 100}%` }}></div>
                    </div>
                    <span className="feature-value">{(result.features.danceability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="feature">
                    <span className="feature-label">Energy</span>
                    <div className="feature-bar">
                      <div className="feature-fill" style={{ width: `${result.features.energy * 100}%` }}></div>
                    </div>
                    <span className="feature-value">{(result.features.energy * 100).toFixed(0)}%</span>
                  </div>
                  <div className="feature">
                    <span className="feature-label">Valence (Positivity)</span>
                    <div className="feature-bar">
                      <div className="feature-fill" style={{ width: `${result.features.valence * 100}%` }}></div>
                    </div>
                    <span className="feature-value">{(result.features.valence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="feature">
                    <span className="feature-label">Acousticness</span>
                    <div className="feature-bar">
                      <div className="feature-fill" style={{ width: `${result.features.acousticness * 100}%` }}></div>
                    </div>
                    <span className="feature-value">{(result.features.acousticness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="feature">
                    <span className="feature-label">Speechiness</span>
                    <div className="feature-bar">
                      <div className="feature-fill" style={{ width: `${result.features.speechiness * 100}%` }}></div>
                    </div>
                    <span className="feature-value">{(result.features.speechiness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="feature">
                    <span className="feature-label">Instrumentalness</span>
                    <div className="feature-bar">
                      <div className="feature-fill" style={{ width: `${result.features.instrumentalness * 100}%` }}></div>
                    </div>
                    <span className="feature-value">{(result.features.instrumentalness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="feature">
                    <span className="feature-label">Liveness</span>
                    <div className="feature-bar">
                      <div className="feature-fill" style={{ width: `${result.features.liveness * 100}%` }}></div>
                    </div>
                    <span className="feature-value">{(result.features.liveness * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="feature-stats">
                  <div className="stat-item">
                    <span className="stat-label">Tempo</span>
                    <span className="stat-value">{result.features.tempo?.toFixed(0) || 'N/A'} BPM</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Loudness</span>
                    <span className="stat-value">{result.features.loudness?.toFixed(1) || 'N/A'} dB</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Key</span>
                    <span className="stat-value">
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][result.features.key] || 'N/A'}
                      {' '}{result.features.mode === 1 ? 'Major' : 'Minor'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Duration</span>
                    <span className="stat-value">
                      {result.features.duration_ms 
                        ? `${Math.floor(result.features.duration_ms / 60000)}:${String(Math.floor((result.features.duration_ms % 60000) / 1000)).padStart(2, '0')}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Extended Features Display */}
              {result.features._all_features && (
                <div className="extended-features">
                  <h4>🔬 Extended Analysis ({result.features._feature_count} features extracted)</h4>
                  <div className="extended-features-grid">
                    {/* Spectral Features */}
                    <div className="feature-group">
                      <h5>📊 Spectral Analysis</h5>
                      <div className="feature-list">
                        <div className="ext-feature"><span>Centroid</span><span>{result.features._all_features.spectral_centroid_hz?.toFixed(0)} Hz</span></div>
                        <div className="ext-feature"><span>Bandwidth</span><span>{result.features._all_features.spectral_bandwidth_hz?.toFixed(0)} Hz</span></div>
                        <div className="ext-feature"><span>Rolloff</span><span>{result.features._all_features.spectral_rolloff_hz?.toFixed(0)} Hz</span></div>
                        <div className="ext-feature"><span>Flatness</span><span>{(result.features._all_features.spectral_flatness_mean * 100)?.toFixed(2)}%</span></div>
                      </div>
                    </div>

                    {/* Rhythm Analysis */}
                    <div className="feature-group">
                      <h5>🥁 Rhythm Analysis</h5>
                      <div className="feature-list">
                        <div className="ext-feature"><span>Beat Count</span><span>{result.features._all_features.beat_count}</span></div>
                        <div className="ext-feature"><span>Beat Regularity</span><span>{(result.features._all_features.beat_regularity * 100)?.toFixed(1)}%</span></div>
                        <div className="ext-feature"><span>Rhythm Strength</span><span>{(result.features._all_features.rhythm_strength * 100)?.toFixed(1)}%</span></div>
                        <div className="ext-feature"><span>Onset Strength</span><span>{result.features._all_features.onset_strength_mean?.toFixed(2)}</span></div>
                      </div>
                    </div>

                    {/* Harmonic Analysis */}
                    <div className="feature-group">
                      <h5>🎼 Harmonic Analysis</h5>
                      <div className="feature-list">
                        <div className="ext-feature"><span>Key</span><span>{result.features._all_features.key_name} ({result.features._all_features.mode_name})</span></div>
                        <div className="ext-feature"><span>Key Strength</span><span>{(result.features._all_features.key_strength * 100)?.toFixed(1)}%</span></div>
                        <div className="ext-feature"><span>Harmonic Ratio</span><span>{(result.features._all_features.harmonic_ratio * 100)?.toFixed(1)}%</span></div>
                        <div className="ext-feature"><span>Tonnetz Mean</span><span>{result.features._all_features.tonnetz_mean?.toFixed(4)}</span></div>
                      </div>
                    </div>

                    {/* Energy Analysis */}
                    <div className="feature-group">
                      <h5>⚡ Energy Analysis</h5>
                      <div className="feature-list">
                        <div className="ext-feature"><span>RMS Mean</span><span>{result.features._all_features.rms_mean?.toFixed(4)}</span></div>
                        <div className="ext-feature"><span>Dynamic Range</span><span>{result.features._all_features.dynamic_range?.toFixed(2)}</span></div>
                        <div className="ext-feature"><span>Loudness Raw</span><span>{result.features._all_features.loudness_raw_db?.toFixed(1)} dB</span></div>
                        <div className="ext-feature"><span>ZCR</span><span>{result.features._all_features.zero_crossing_rate?.toFixed(4)}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* MFCC Visualization */}
                  <div className="mfcc-section">
                    <h5>🎤 MFCC Coefficients (Timbral Texture)</h5>
                    <div className="mfcc-bars">
                      {[...Array(20)].map((_, i) => {
                        const mfccVal = result.features._all_features[`mfcc_${i+1}`] || 0
                        const normalized = Math.min(100, Math.max(0, (mfccVal + 50) * 1.5))
                        return (
                          <div key={i} className="mfcc-bar-container">
                            <div 
                              className="mfcc-bar" 
                              style={{ height: `${normalized}%`, background: `hsl(${280 - i * 12}, 70%, 50%)` }}
                            ></div>
                            <span className="mfcc-label">{i+1}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <p className="feature-note">
                    ⚠️ Note: Librosa extracts raw audio features. Spotify uses proprietary ML algorithms trained on millions of songs, 
                    so values may differ from Spotify's API. Our calibration attempts to approximate Spotify's definitions.
                  </p>
                </div>
              )}

              <div className="result-actions" style={{display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
                <button className="btn secondary" onClick={handleDownloadReport}>Download PDF Report</button>
                <button className="btn primary" onClick={resetRecording}>Test Another Recording</button>
              </div>
            </TiltCard>
          </div>
        )}
      </div>
      {/* Hidden PDF Template */}
      <div className="pdf-hidden-wrapper">
        <ReportTemplate result={result} ref={reportRef} />
      </div>
    </div>
  );
}
