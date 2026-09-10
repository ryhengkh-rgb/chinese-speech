import { NextResponse } from 'next/server';
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { chunkChineseText } from '@/utils/text-chunker';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, script, region, voice, style, speed, pitch, pause } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Initialize TTS Client
    // It will use GOOGLE_API_KEY if available, otherwise it falls back to GOOGLE_APPLICATION_CREDENTIALS
    const clientOptions: any = {};
    if (process.env.GOOGLE_API_KEY) {
      clientOptions.apiKey = process.env.GOOGLE_API_KEY;
    }
    const client = new textToSpeech.TextToSpeechClient(clientOptions);

    const chunks = chunkChineseText(text);
    const tempDir = os.tmpdir();
    const runId = uuidv4();
    const chunkFiles: string[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let ssml = `<speak>`;
      
      // Approximate style with SSML if conversational warm
      let rate = speed || 1.0;
      let pitchVal = pitch === 'Lower' ? '-2st' : pitch === 'Higher' ? '+2st' : '0st';
      
      if (style === 'Conversational Warm') {
        // slightly overlapping pacing -> slightly faster rate, maybe 1.1x or tight breaks
        rate = Math.max(rate, 1.1); 
      }
      
      ssml += `<prosody rate="${rate}" pitch="${pitchVal}">`;
      
      // Insert pauses based on setting
      let chunkText = chunk;
      if (pause === 'Tight') {
        chunkText = chunkText.replace(/([。？！])/g, '$1<break time="200ms"/>');
      } else if (pause === 'Relaxed') {
        chunkText = chunkText.replace(/([。？！])/g, '$1<break time="800ms"/>');
      } else {
        // Natural (Default)
        chunkText = chunkText.replace(/([。？！])/g, '$1<break time="400ms"/>');
      }
      
      ssml += chunkText;
      ssml += `</prosody></speak>`;

      const request = {
        input: { ssml: ssml },
        voice: {
          languageCode: region === 'Taiwan Mandarin' ? 'zh-TW' : 'zh-CN',
          name: voice || (region === 'Taiwan Mandarin' ? 'zh-TW-Wavenet-A' : 'zh-CN-Journey-F')
        },
        audioConfig: { audioEncoding: 'MP3' as const },
      };

      const [response] = await client.synthesizeSpeech(request);
      
      const chunkFile = path.join(tempDir, `chunk_${runId}_${i}.mp3`);
      if (response.audioContent) {
        fs.writeFileSync(chunkFile, response.audioContent, 'binary');
        chunkFiles.push(chunkFile);
      }
    }

    if (chunkFiles.length === 0) {
      return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
    }

    if (chunkFiles.length === 1) {
      // Just return the single file
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
