'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PlatformIcon from '@/components/PlatformIcon';
import { backend } from '@/lib/client';
import {
  Sparkles,
  FileVideo,
  Loader2,
  Check,
  AlertCircle,
  Download,
  Upload,
  Scissors,
  Crop,
  Volume2,
  Gauge,
  Timer,
  Send,
  Bot,
  Copy,
  Hash,
  MessageSquare,
  Wand2,
} from 'lucide-react';

interface PresetInfo {
  id: string;
  name: string;
  description: string;
  ext: string;
}

const PRESET_ICONS: Record<string, typeof Crop> = {
  vertical: Crop,
  square: Crop,
  compress: Gauge,
  trim60: Timer,
  audio: Volume2,
};

export default function AIShortsPage() {
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [presetId, setPresetId] = useState('vertical');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ name: string; size: number; download_url: string } | null>(null);

  // Gemini AI Assistant State
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('🔥 Viral & Retenção');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState<{
    title: string;
    alternativeTitles: string[];
    description: string;
    callToAction?: string;
    hashtags: string[];
  } | null>(null);

  // Form de publicação
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [connected, setConnected] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string>('');

  useEffect(() => {
    fetch('/api/ffmpeg')
      .then((r) => r.json())
      .then((d) => setPresets(d.presets || []))
      .catch(() => {});
    backend
      .getAccounts()
      .then((d) => {
        const p = d.accounts.map((a) => a.platform);
        setConnected(p);
        setSelectedPlatforms(p);
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (selected: File | null) => {
    setFile(selected);
    setError('');
    setResult(null);
    if (selected) {
      const cleanName = selected.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setPostTitle(cleanName);
      if (!aiTopic) setAiTopic(cleanName);
    }
  };

  const processVideo = async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setResult(null);
    setPublishResult('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('preset', presetId);
      const res = await fetch('/api/ffmpeg', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no processamento');
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      setAiError('Informe um tema ou título base para a IA.');
      return;
    }
    setGeneratingAI(true);
    setAiError('');
    try {
      const res = await backend.generateAICopy({
        topic: aiTopic,
        platform: selectedPlatforms.length ? selectedPlatforms.join(', ') : 'Reels, Shorts e TikTok',
        tone: aiTone,
      });

      if (res.data) {
        setAiResult(res.data);
        setPostTitle(res.data.title);
        const fullDesc = `${res.data.description}\n\n${res.data.hashtags.join(' ')}`;
        setPostDescription(fullDesc);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Falha ao gerar com Gemini AI');
    } finally {
      setGeneratingAI(false);
    }
  };

  const publishProcessed = async () => {
    if (!result || selectedPlatforms.length === 0) return;
    setPublishing(true);
    setError('');
    try {
      const blob = await fetch(result.download_url).then((r) => r.blob());
      const ext = result.name.split('.').pop() || 'mp4';
      const processedFile = new File([blob], result.name, { type: blob.type });

      const fd = new FormData();
      fd.append('media_type', ext === 'mp3' ? 'text' : 'video');
      fd.append('title', postTitle || file?.name?.replace(/\.[^.]+$/, '') || 'Processado');
      if (postDescription) fd.append('description', postDescription);
      selectedPlatforms.forEach((p) => fd.append('platform', p));
      fd.append('media', processedFile);

      const res = await backend.publish(fd);
      const ok = res.results?.filter((r) => r.success).map((r) => r.platform) || [];
      setPublishResult(ok.length ? `Publicado com sucesso em: ${ok.join(', ')}!` : 'Nenhuma plataforma concluída.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const fmtSize = (n: number) => (n / 1024 / 1024).toFixed(2) + ' MB';

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header
          title="Estúdio IA & Vídeo"
          subtitle="Cortes automáticos com FFmpeg e geração inteligente de títulos e copys com Gemini AI"
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
          {/* Banner de destaque Gemini */}
          <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-transparent rounded-2xl border border-brand-500/20 shadow-xs">
            <div className="p-3 bg-brand-500/20 rounded-xl text-brand-600 dark:text-brand-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Estúdio Inteligente Multimodal</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
                  Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Adapte vídeos em formato vertical (9:16) ou quadrado (1:1), e use a inteligência do Gemini para criar
                automaticamente ganchos virais, descrições persuasivas e hashtags de alto alcance para suas redes.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA: Upload e Presets FFmpeg */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Upload */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">1. Arquivo de Mídia</h3>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-brand-500 transition-colors bg-slate-50/50 dark:bg-slate-950/50">
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <FileVideo className="w-10 h-10 mx-auto text-brand-500 mb-3" />
                    {file ? (
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{fmtSize(file.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                          Arraste ou clique para carregar o vídeo
                        </p>
                        <p className="text-xs text-slate-500">MP4, MOV, WebM, MKV, MP3</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* 2. Presets de Corte FFmpeg */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">2. Preset de Vídeo (FFmpeg)</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {presets.map((p) => {
                    const Icon = PRESET_ICONS[p.id] || Scissors;
                    const active = presetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPresetId(p.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                          active
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                        <div>
                          <p className={`text-xs font-bold ${active ? 'text-brand-600' : 'text-slate-900 dark:text-white'}`}>
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{p.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={processVideo}
                  disabled={!file || processing}
                  className="w-full mt-5 flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Renderizando Vídeo com FFmpeg...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      Renderizar Preset Selecionado
                    </>
                  )}
                </button>
              </div>

              {/* Resultado do Vídeo */}
              {result && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Vídeo Renderizado com Sucesso
                    </span>
                    <span className="text-xs text-slate-500">{fmtSize(result.size)}</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={result.download_url}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Arquivo
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: Motor de IA Gemini & Publicação */}
            <div className="lg:col-span-5 space-y-6">
              {/* Assistente Gemini AI */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-500/30 p-6 shadow-sm space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Wand2 className="w-5 h-5 text-brand-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gerador de Copy com Gemini</h3>
                    <p className="text-[11px] text-slate-500">Gera títulos virais, legendas e hashtags sob medida</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tema ou Ideia do Vídeo
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="ex: 3 ferramentas de IA que economizam 5 horas por dia"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tom de Voz
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['🔥 Viral & Retenção', '💡 Educativo & Dicas', '💰 Vendas & Conversão', '⚡ Direto & Rápido'].map(
                      (tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setAiTone(tone)}
                          className={`p-2 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                            aiTone === tone
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tone}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={generatingAI || !aiTopic.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultando Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar Título, Legenda e Tags
                    </>
                  )}
                </button>

                {aiError && <p className="text-xs text-red-500">{aiError}</p>}

                {/* Sugestões de Títulos Alternativos */}
                {aiResult && aiResult.alternativeTitles?.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Opções de Títulos (clique para usar):
                    </span>
                    <div className="space-y-1">
                      {aiResult.alternativeTitles.map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPostTitle(t)}
                          className="w-full text-left text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-colors text-slate-800 dark:text-slate-200 font-medium"
                        >
                          • {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Caixa de Publicação Pronta */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-brand-600" />
                  Publicar Direto nas Redes
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Título Final do Post
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Título do vídeo..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Legenda & Descrição
                  </label>
                  <textarea
                    rows={4}
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    placeholder="Legenda, hashtags e chamada para ação..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Destinos Selecionados:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {connected.map((p) => {
                      const active = selectedPlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setSelectedPlatforms((prev) =>
                              prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                            )
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all ${
                            active
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-500'
                          }`}
                        >
                          <PlatformIcon platform={p} size="sm" />
                          <span className="capitalize">{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={publishProcessed}
                  disabled={publishing || !result || selectedPlatforms.length === 0}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publicando nas redes...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Publicar Vídeo Renderizado
                    </>
                  )}
                </button>

                {publishResult && (
                  <p className="text-xs text-emerald-600 font-medium text-center">{publishResult}</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
