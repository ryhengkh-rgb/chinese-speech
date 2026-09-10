import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { chunkChineseText } from '@/utils/text-chunker';
import { EdgeTTS } from 'node-edge-tts';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, script, region, voice, style, speed, pitch, pause } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const chunks = chunkChineseText(text);
    const tempDir = os.tmpdir();
    const runId = uuidv4();
    const chunkFiles: string[] = [];

    // Map speed to Edge TTS rate format (+10%, -10%, etc)
    const speedPercent = Math.round((speed - 1.0) * 100);
    let rateStr = speedPercent >= 0 ? `+${speedPercent}%` : `${speedPercent}%`;

    // Adjust rate for "Conversational Warm"
    if (style === 'Conversational Warm') {
      const warmSpeed = Math.max(speedPercent, 10); // slightly faster
      rateStr = warmSpeed >= 0 ? `+${warmSpeed}%` : `${warmSpeed}%`;
    }

    // Map pitch
    let pitchStr = '+0Hz';
    if (pitch === 'Lower') pitchStr = '-10Hz';
    if (pitch === 'Higher') pitchStr = '+10Hz';

    for (let i = 0; i < chunks.length; i++) {
      let chunkText = chunks[i];
      
      // Simulate pause handling with commas/periods since Edge TTS respects them naturally
      if (pause === 'Tight') {
        chunkText = chunkText.replace(/([。？！])/g, ','); 
      } else if (pause === 'Relaxed') {
        chunkText = chunkText.replace(/([。？！])/g, '$1... ');
      }

      const chunkFile = path.join(tempDir, `chunk_${runId}_${i}.mp3`);
      
      const tts = new EdgeTTS({
        voice: voice || 'zh-CN-XiaoxiaoNeural',
        lang: region === 'Taiwan Mandarin' ? 'zh-TW' : 'zh-CN',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        rate: rateStr,
        pitch: pitchStr
      });

      await tts.ttsPromise(chunkText, chunkFile);
      
      if (fs.existsSync(chunkFile)) {
        chunkFiles.push(chunkFile);
      }
    }

    if (chunkFiles.length === 0) {
      return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
    }

    if (chunkFiles.length === 1) {
      const audioBuffer = fs.readFileSync(chunkFiles[0]);
      fs.unlinkSync(chunkFiles[0]);
      
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="chinese-voice-${new Date().toISOString().replace(/[:.]/g, '-')}.mp3"`
        }
      });
    }

    // Merge multiple chunks
    const mergedFile = path.join(tempDir, `merged_${runId}.mp3`);
    
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      chunkFiles.forEach(file => {
        command.input(file);
      });
      
      command
        .on('error', (err) => {
          console.error('FFmpeg Error:', err);
          reject(err);
        })
        .on('end', () => {
          resolve();
        })
        .mergeToFile(mergedFile, tempDir);
    });

    const mergedBuffer = fs.readFileSync(mergedFile);
    
    // Cleanup
    chunkFiles.forEach(file => fs.unlinkSync(file));
    fs.unlinkSync(mergedFile);

    return new NextResponse(mergedBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="chinese-voice-${new Date().toISOString().replace(/[:.]/g, '-')}.mp3"`
      }
    });

  } catch (error: any) {
    console.error('TTS API Error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
