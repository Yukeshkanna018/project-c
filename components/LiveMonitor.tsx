
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { translations, Language } from '../translations.ts';

interface LiveMonitorProps {
  onClose: () => void;
  mode: 'CITIZEN' | 'NGO';
  lang: Language;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const LiveMonitor: React.FC<LiveMonitorProps> = ({ onClose, mode, lang }) => {
  const [status, setStatus] = useState<'CONNECTING' | 'ACTIVE' | 'CLOSED'>('CONNECTING');
  const [transcription, setTranscription] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContexts = useRef<{ input?: AudioContext; output?: AudioContext }>({});
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const t = translations[lang];

  useEffect(() => {
    const initLive = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContexts.current = { input: inputCtx, output: outputCtx };

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              setStatus('ACTIVE');
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  int16[i] = inputData[i] * 32768;
                }
                sessionPromise.then(session => {
                  session.sendRealtimeInput({
                    media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
                  });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);

              const interval = window.setInterval(() => {
                if (!videoRef.current || !canvasRef.current) return;
                const ctx = canvasRef.current.getContext('2d');
                if (!ctx) return;
                canvasRef.current.width = 320;
                canvasRef.current.height = 240;
                ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
                });
              }, 1000);
              (window as any)._liveFrameInterval = interval;
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.outputTranscription) {
                setTranscription(prev => (prev + ' ' + message.serverContent?.outputTranscription?.text).slice(-150));
              }
              
              const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && outputCtx) {
                const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputCtx.destination);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => {
                  try { s.stop(); } catch (e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: () => setStatus('CLOSED'),
            onerror: (e) => console.error("Live API Error:", e)
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { 
              voiceConfig: { 
                prebuiltVoiceConfig: { voiceName: mode === 'CITIZEN' ? 'Kore' : 'Zephyr' } 
              } 
            },
            outputAudioTranscription: {},
            systemInstruction: lang === 'ta' 
              ? "நீங்கள் ஒரு மனித உரிமை உதவியாளர். ஒரு பயனர் காவல் நிலையத்தில் இருக்கிறார். அவர்களுக்கு அமைதியை வழங்கவும் மற்றும் அவர்களின் உரிமைகளை அவர்களுக்குத் தெரியப்படுத்தவும். நீங்கள் அவர்களின் நேரடி சாட்சி."
              : "You are a Human Rights Live Witness. Assist the user who is at a precinct. Maintain calmness and ensure they know their rights in real-time."
          }
        });
        sessionRef.current = await sessionPromise;
      } catch (err) {
        console.error("Live Init Failed:", err);
      }
    };
    initLive();
    return () => {
      if ((window as any)._liveFrameInterval) window.clearInterval((window as any)._liveFrameInterval);
      if (sessionRef.current) sessionRef.current.close();
      if (audioContexts.current.input) audioContexts.current.input.close();
      if (audioContexts.current.output) audioContexts.current.output.close();
    };
  }, [mode, lang]);

  return (
    <div className="absolute inset-0 z-[200] bg-slate-950 flex flex-col p-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full flex-1 flex flex-col bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative">
        <div className="flex-1 relative bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-50" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="bg-red-600 px-4 py-1.5 rounded-full flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{t.liveWitness}</span>
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl">
               <p className="text-white text-base font-black italic leading-tight">{transcription || "Establishing connection..."}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-6 flex justify-between items-center border-t border-white/5 gap-4">
          <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${isMuted ? 'bg-red-600 text-white' : 'bg-white/10 text-white'}`}>
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-xl`}></i>
          </button>
          <div className="flex gap-1 h-6 items-end">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 bg-[#00FFFF] rounded-full animate-bounce" style={{ height: `${20 + Math.random() * 40}%`, animationDelay: `${i * 0.1}s` }}></div>)}
          </div>
          <button onClick={onClose} className="bg-white text-slate-900 px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 hover:text-white transition-all">
            {t.terminate}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
