'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Download, Loader2, Volume2 } from 'lucide-react';

const VOICES = {
  'Mainland Mandarin': [
    { name: 'zh-CN-Journey-F', label: 'Mandarin Female 1 (Expressive)' },
    { name: 'zh-CN-Journey-O', label: 'Mandarin Female 2 (Expressive)' },
    { name: 'zh-CN-Journey-D', label: 'Mandarin Male 1 (Expressive)' },
    { name: 'zh-CN-Wavenet-B', label: 'Mandarin Male 2 (Standard)' }
  ],
  'Taiwan Mandarin': [
    { name: 'zh-TW-Wavenet-A', label: 'Taiwan Female 1' },
    { name: 'zh-TW-Wavenet-B', label: 'Taiwan Male 1' },
    { name: 'zh-TW-Wavenet-C', label: 'Taiwan Male 2' }
  ]
};

export default function Home() {
  const [text, setText] = useState('');
  const [script, setScript] = useState('Auto Detect');
  const [region, setRegion] = useState<'Mainland Mandarin' | 'Taiwan Mandarin'>('Mainland Mandarin');
  const [voice, setVoice] = useState(VOICES['Mainland Mandarin'][0].name);
  const [style, setStyle] = useState('Conversational Warm');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState('Normal');
  const [pause, setPause] = useState('Natural');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter some Chinese text.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          script,
          region,
          voice,
          style,
          speed,
          pitch,
          pause
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate audio');
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `chinese-voice-${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Chinese Voice Generator</h1>
          <p className="mt-2 text-lg text-gray-600">Turn Chinese text into clear, natural Mandarin speech.</p>
        </div>

        <div className="bg-white shadow rounded-2xl p-6 space-y-6 border border-gray-100">
          
          {/* Text Input Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Enter Chinese Text</label>
            <textarea
              className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y text-gray-800"
              placeholder="你好，欢迎使用中文语音生成器。请输入你想转换成语音的中文内容。"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="text-right text-sm text-gray-500">
              Characters: {text.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chinese Script</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                  value={script} onChange={(e) => setScript(e.target.value)}
                >
                  <option>Auto Detect</option>
                  <option>Simplified Chinese</option>
                  <option>Traditional Chinese</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                  value={region} 
                  onChange={(e) => {
                    const newRegion = e.target.value as 'Mainland Mandarin' | 'Taiwan Mandarin';
                    setRegion(newRegion);
                    setVoice(VOICES[newRegion][0].name);
                  }}
                >
                  <option>Mainland Mandarin</option>
                  <option>Taiwan Mandarin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                  value={voice} onChange={(e) => setVoice(e.target.value)}
                >
                  {VOICES[region].map(v => (
                    <option key={v.name} value={v.name}>{v.label} ({v.name})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Speech Style</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                  value={style} onChange={(e) => setStyle(e.target.value)}
                >
                  <option>Normal</option>
                  <option>Conversational Warm</option>
                  <option>Calm</option>
                  <option>Energetic</option>
                  <option>Professional</option>
                  <option>Educational</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Speaking Speed</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                  value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
                >
                  <option value={0.75}>0.75x — Slow</option>
                  <option value={0.9}>0.9x — Slightly Slow</option>
                  <option value={1.0}>1.0x — Normal</option>
                  <option value={1.1}>1.1x — Slightly Fast</option>
                  <option value={1.25}>1.25x — Fast</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pitch</label>
                  <select 
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                    value={pitch} onChange={(e) => setPitch(e.target.value)}
                  >
                    <option>Lower</option>
                    <option>Normal</option>
                    <option>Higher</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pause</label>
                  <select 
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                    value={pause} onChange={(e) => setPause(e.target.value)}
                  >
                    <option>Tight</option>
                    <option>Natural</option>
                    <option>Relaxed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-col items-center">
            {error && (
              <div className="w-full mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-lg font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Generating Chinese audio...
                </>
              ) : (
                'Generate Audio'
              )}
            </button>
          </div>

          {/* Audio Player Section */}
          {audioUrl && (
            <div className="pt-6 mt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-blue-500" /> Your Audio
              </h3>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center gap-4">
                <audio 
                  ref={audioRef}
                  controls 
                  src={audioUrl} 
                  className="w-full"
                />
                
                <button
                  onClick={handleDownload}
                  className="shrink-0 flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Download Audio
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </main>
  );
}
