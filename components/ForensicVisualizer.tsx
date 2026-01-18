
import React, { useState } from 'react';
import { generateVisualEvidence, generateVeoVideo } from '../services/geminiService';
import { translations, Language } from '../translations';

interface ForensicVisualizerProps {
    initialPrompt?: string;
    lang: Language;
}

const ForensicVisualizer: React.FC<ForensicVisualizerProps> = ({ initialPrompt = '', lang }) => {
    const t = translations[lang];
    const [prompt, setPrompt] = useState(initialPrompt);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

    const handleGenerateImage = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setStatus(t.generatingVideo.split('...')[0] + ' Image...');
        try {
            const img = await generateVisualEvidence(prompt);
            setGeneratedImage(img);
            setGeneratedVideo(null);
        } catch (err) {
            console.error(err);
            alert('Failed to generate image');
        } finally {
            setIsGenerating(false);
            setStatus('');
        }
    };

    const handleAnimate = async () => {
        if (!generatedImage) return;
        setIsGenerating(true);
        setStatus(t.generatingVideo);
        try {
            const video = await generateVeoVideo(prompt, generatedImage, aspectRatio);
            setGeneratedVideo(video);
        } catch (err) {
            console.error(err);
            alert('Failed to generate video audit');
        } finally {
            setIsGenerating(false);
            setStatus('');
        }
    };

    return (
        <div className="bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="p-6 border-b border-white/5 bg-slate-800/50 flex justify-between items-center">
                <div>
                    <h3 className="text-[#00FFFF] text-xs font-black uppercase tracking-widest">{t.reconstruct}</h3>
                    <p className="text-slate-500 text-[8px] font-black uppercase mt-1">AI-Powered Forensic Visualization</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAspectRatio('16:9')}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${aspectRatio === '16:9' ? 'bg-[#00FFFF] text-slate-900' : 'bg-white/5 text-slate-500'}`}
                    >
                        16:9
                    </button>
                    <button
                        onClick={() => setAspectRatio('9:16')}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${aspectRatio === '9:16' ? 'bg-[#00FFFF] text-slate-900' : 'bg-white/5 text-slate-500'}`}
                    >
                        9:16
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[300px] relative bg-black flex items-center justify-center overflow-hidden">
                {generatedVideo ? (
                    <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
                ) : generatedImage ? (
                    <img src={generatedImage} alt="Reconstruction" className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center space-y-4 opacity-20">
                        <i className="fas fa-microchip text-4xl text-[#00FFFF]"></i>
                        <p className="text-[10px] text-white font-black uppercase tracking-widest">Awaiting Prompt Input</p>
                    </div>
                )}

                {isGenerating && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 border-4 border-[#00FFFF]/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-[#00FFFF] rounded-full animate-spin"></div>
                            <div className="absolute inset-4 bg-[#00FFFF]/10 rounded-full animate-pulse"></div>
                        </div>
                        <h4 className="text-white text-sm font-black italic uppercase tracking-tighter mb-2">{status || "Processing..."}</h4>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest animate-pulse tracking-tactical">Synchronizing Neural Cycles</p>
                    </div>
                )}
            </div>

            <div className="p-6 bg-slate-900 space-y-4">
                <textarea
                    placeholder={t.enterPrompt}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-[11px] outline-none h-24 focus:border-[#00FFFF]/50 transition-colors resize-none font-medium italic"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />

                <div className="flex gap-3">
                    <button
                        onClick={handleGenerateImage}
                        disabled={isGenerating || !prompt.trim()}
                        className="flex-1 bg-white text-slate-950 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#00FFFF] transition-all disabled:opacity-30"
                    >
                        <i className="fas fa-image mr-2"></i> {t.generate}
                    </button>

                    {generatedImage && (
                        <button
                            onClick={handleAnimate}
                            disabled={isGenerating}
                            className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-wand-magic-sparkles"></i> {t.animatePhoto.split(' ')[0]}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForensicVisualizer;
