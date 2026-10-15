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

  // publicar
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

  const process = async () => {
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
      fd.append('title', file?.name?.replace(/\.[^.]+$/, '') || 'Processado');
      selectedPlatforms.forEach((p) => fd.append('platform', p));
      fd.append('media', processedFile);

      const res = await backend.publish(fd);
      const ok = res.results?.filter((r) => r.success).map((r) => r.platform) || [];
      setPublishResult(ok.length ? `Publicado em: ${ok.join(', ')}` : 'Nenhuma plataforma publicada.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const fmtSize = (n: number) => (n / 1024 / 1024).toFixed(2) + ' MB';

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="AI Shorts" subtitle="Processamento de vídeo local (FFmpeg)" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-xl border border-brand-200 dark:border-brand-800 mb-8">
            <div className="p-3 bg-brand-100 dark:bg-brand-900/50 rounded-xl">
              <Sparkles className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Processamento 100% local</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Os vídeos são processados com o FFmpeg instalado no seu próprio servidor. Nada é enviado para fora.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Upload */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">1. Escolha o arquivo</h3>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-brand-500 transition-colors cursor-pointer">
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setResult(null);
                }}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <FileVideo className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                {file ? (
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-slate-500">{fmtSize(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white mb-1">Arraste ou clique para escolher</p>
                    <p className="text-sm text-slate-500">MP4, MOV, WebM, MP3…</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Presets */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">2. Processamento</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {presets.map((p) => {
                const Icon = PRESET_ICONS[p.id] || Scissors;
                const active = presetId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPresetId(p.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${active ? 'text-brand-600' : 'text-slate-900 dark:text-white'}`}>
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Process button */}
          <button
            onClick={process}
            disabled={!file || processing}
            className="w-full flex items-center justify-center gap-3 py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors disabled:cursor-not-allowed mb-8"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Processar
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                  <Check className="w-4 h-4" /> Concluído
                </span>
                <span className="text-sm text-slate-500">{fmtSize(result.size)}</span>
              </div>

              <a
                href={result.download_url}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                Baixar resultado
              </a>

              {/* Publish */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Publicar o resultado
                </h4>
                {connected.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma conta conectada.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {connected.map((p) => (
                        <button
                          key={p}
                          onClick={() =>
                            setSelectedPlatforms((prev) =>
                              prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border-2 transition-all ${
                            selectedPlatforms.includes(p)
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <PlatformIcon platform={p} size="sm" />
                          <span className="capitalize">{p}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={publishProcessed}
                      disabled={publishing || selectedPlatforms.length === 0}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors"
                    >
                      {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Publicar
                    </button>
                    {publishResult && <p className="text-sm text-emerald-600 mt-3">{publishResult}</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
