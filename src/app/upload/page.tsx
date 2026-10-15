'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type ProviderInfo } from '@/lib/client';
import {
  Upload,
  X,
  Calendar,
  Clock,
  FileVideo,
  Image as ImageIcon,
  FileText,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type ContentType = 'video' | 'photo' | 'text';

interface PublishResult {
  success?: boolean;
  post_id?: string;
  status?: string;
  scheduled_at?: string;
  platforms?: string[];
  results?: { platform: string; success: boolean; post_url?: string | null; error?: string | null }[];
  error?: string;
}

export default function UploadPage() {
  const [contentType, setContentType] = useState<ContentType>('video');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [connected, setConnected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [format, setFormat] = useState('feed');
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await backend.getAccounts();
        const platforms = data.accounts.map((a) => a.platform);
        setConnected(platforms);
        setSelectedPlatforms(platforms);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const togglePlatform = (id: string) =>
    setSelectedPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => (contentType === 'photo' ? [...prev, ...arr] : arr.slice(0, 1)));
    setResult(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentType]
  );

  const handleUpload = async () => {
    setIsUploading(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('media_type', contentType);
      if (title) fd.append('title', title);
      if (description) fd.append('description', description);
      selectedPlatforms.forEach((p) => fd.append('platform', p));
      fd.append('privacy', privacy);

      if (contentType !== 'text') {
        if (files.length === 0) throw new Error('Selecione um arquivo.');
        files.forEach((f) => fd.append('media', f));
      }
      fd.append('format', format);

      if (scheduledDate) {
        const time = scheduledTime || '12:00';
        const iso = new Date(`${scheduledDate}T${time}:00`).toISOString();
        fd.append('scheduled_at', iso);
        fd.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      }

      const res = await backend.publish(fd);
      setResult(res);
      if (res.status === 'failed' || res.error) {
        setError(res.error || 'Publicação falhou em alguma plataforma.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const contentTypes = [
    { id: 'video', label: 'Vídeo', icon: FileVideo },
    { id: 'photo', label: 'Foto', icon: ImageIcon },
    { id: 'text', label: 'Texto', icon: FileText },
  ];

  const canSubmit =
    !isUploading &&
    selectedPlatforms.length > 0 &&
    (contentType === 'text' ? title.trim().length > 0 : files.length > 0);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Upload" subtitle="Publicar via servidor próprio" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {connected.length === 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Nenhuma conta conectada. Vá em{' '}
                <a href="/accounts" className="underline font-medium">
                  Accounts
                </a>{' '}
                para conectar.
              </p>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Content Type */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Tipo de conteúdo</h3>
            <div className="grid grid-cols-3 gap-3">
              {contentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setContentType(type.id as ContentType);
                    setFiles([]);
                    setResult(null);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    contentType === type.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <type.icon className={`w-6 h-6 ${contentType === type.id ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${contentType === type.id ? 'text-brand-600' : 'text-slate-600 dark:text-slate-400'}`}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload area */}
          {contentType !== 'text' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                {contentType === 'video' ? 'Enviar vídeo' : 'Enviar foto'}
              </h3>
              {files.length === 0 ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    isDragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-brand-500'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple={contentType === 'photo'}
                    accept={contentType === 'video' ? 'video/*' : 'image/*'}
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                    Arraste e solte aqui
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">ou clique para escolher do computador</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        {contentType === 'video' ? (
                          <FileVideo className="w-6 h-6 text-slate-500" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{f.name}</p>
                        <p className="text-sm text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {contentType === 'photo' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      + Adicionar mais fotos{files.length > 1 ? ` (${files.length} no carrossel)` : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Platforms */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Plataformas</h3>
            {connected.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma conta conectada.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {connected.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <PlatformIcon platform={platform} size="md" />
                      <p className="text-sm font-medium mt-2 text-slate-700 dark:text-slate-300 capitalize">{platform}</p>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Detalhes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {contentType === 'text' ? 'Texto do post *' : 'Título *'}
                </label>
                {contentType === 'text' ? (
                  <textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    rows={4}
                    placeholder="Escreva o conteúdo..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Um título chamativo..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                )}
              </div>
              {contentType !== 'text' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Descrição</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Descrição..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Formato e visibilidade</h3>
            {contentType !== 'text' && (
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Formato
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="feed">
                      {contentType === 'video' ? 'Feed / Reels' : 'Feed'}{files.length > 1 ? ' (carrossel)' : ''}
                    </option>
                    <option value="story">Story</option>
                  </select>
                </div>
                {contentType === 'video' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Visibilidade
                    </label>
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="public">Público</option>
                      <option value="unlisted">Não listado</option>
                      <option value="private">Privado</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            {format === 'story' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                Story: use apenas <b>uma</b> mídia e formato vertical (9:16). Vale para Instagram e Facebook.
              </p>
            )}
            {contentType === 'photo' && files.length > 1 && (
              <p className="text-xs text-slate-500 mb-4">
                {files.length} fotos serão publicadas como carrossel no Instagram (até 10) e álbum no Facebook.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Hora
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Deixe vazio para publicar agora.</p>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Resultado</h3>
              {result.status === 'scheduled' ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Agendado para {new Date(result.scheduled_at!).toLocaleString('pt-BR')} em{' '}
                  {result.platforms?.join(', ')}
                </p>
              ) : (
                <div className="space-y-2">
                  {result.results?.map((r) => (
                    <div
                      key={r.platform}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        r.success
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <PlatformIcon platform={r.platform} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize text-slate-900 dark:text-white">{r.platform}</p>
                        {r.error ? (
                          <p className="text-xs text-red-600 dark:text-red-400">{r.error}</p>
                        ) : (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Publicado{r.post_url ? ` — ${r.post_url}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <AlertCircle className="w-4 h-4" />
              {selectedPlatforms.length} plataforma(s)
            </div>
            <button
              onClick={handleUpload}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : result?.status === 'published' ? (
                <>
                  <Check className="w-5 h-5" />
                  Publicado!
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  {scheduledDate ? 'Agendar' : 'Publicar agora'}
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
