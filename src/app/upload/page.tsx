'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PlatformIcon from '@/components/PlatformIcon';
import { backend } from '@/lib/client';
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
  Sparkles,
  Wand2,
  Copy,
  CheckCheck,
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';

type ContentType = 'video' | 'photo' | 'text';
type UploadMode = 'single' | 'bulk';

interface PublishResult {
  success?: boolean;
  post_id?: string;
  status?: string;
  scheduled_at?: string;
  platforms?: string[];
  results?: { platform: string; success: boolean; post_url?: string | null; error?: string | null }[];
  error?: string;
}

interface BulkVideoItem {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  description: string;
  customScheduleIso?: string;
  status: 'pending' | 'generating_ai' | 'uploading' | 'scheduled' | 'error';
  errorMessage?: string;
  postId?: string;
  expanded?: boolean;
}

function getTomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function cleanFilenameToTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Vídeo sem título';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getDefaultSlotsForCount(count: number): string[] {
  if (count <= 1) return ['12:00'];
  if (count === 2) return ['11:30', '19:30'];
  if (count === 3) return ['09:00', '14:00', '19:30'];
  if (count === 4) return ['09:00', '12:30', '16:30', '20:00'];
  const slots: string[] = [];
  const startHour = 8;
  const endHour = 21;
  const step = (endHour - startHour) / Math.max(1, count - 1);
  for (let i = 0; i < count; i++) {
    const totalHours = startHour + step * i;
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    const snapM = m >= 45 ? 30 : m >= 15 ? 30 : 0;
    slots.push(`${String(h).padStart(2, '0')}:${String(snapM).padStart(2, '0')}`);
  }
  return slots;
}

export default function UploadPage() {
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
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
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // Estado do Upload em Massa & Agendamento Inteligente em Fila
  // ============================================================
  const [bulkItems, setBulkItems] = useState<BulkVideoItem[]>([]);
  const [videosPerDay, setVideosPerDay] = useState<number>(2);
  const [customVideosPerDay, setCustomVideosPerDay] = useState<boolean>(false);
  const [timeSlots, setTimeSlots] = useState<string[]>(['11:30', '19:30']);
  const [bulkStartDate, setBulkStartDate] = useState<string>(() => getTomorrowDateStr());
  const [skipWeekends, setSkipWeekends] = useState<boolean>(false);
  const [defaultBulkHashtags, setDefaultBulkHashtags] = useState<string>('');

  // Estado de progresso do envio em massa
  const [isBulkUploading, setIsBulkUploading] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string;
    succeeded: number;
    failed: number;
    finished: boolean;
  } | null>(null);

  // Estado do gerador IA em lote
  const [bulkAiContext, setBulkAiContext] = useState<string>('');
  const [bulkAiTone, setBulkAiTone] = useState<string>('viral, dinâmico e persuasivo');
  const [isGeneratingBulkAi, setIsGeneratingBulkAi] = useState<boolean>(false);
  const [bulkAiProgress, setBulkAiProgress] = useState<{ current: number; total: number } | null>(null);

  // Gemini AI Assistant state (Single Post)
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('viral, dinâmico e persuasivo');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [appliedNotification, setAppliedNotification] = useState(false);
  const [aiGenerated, setAiGenerated] = useState<{
    title: string;
    description: string;
    hashtags: string[];
    callToAction?: string;
    alternativeTitles: string[];
  } | null>(null);

  // Cleanup de ObjectURLs ao desmontar
  const bulkItemsRef = useRef<BulkVideoItem[]>([]);
  bulkItemsRef.current = bulkItems;
  useEffect(() => {
    return () => {
      bulkItemsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  // Atualiza a lista de slots de horários quando a quantidade de vídeos por dia muda
  const handleVideosPerDayChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(12, count || 1));
    setVideosPerDay(safeCount);
    setTimeSlots((prev) => {
      if (safeCount === prev.length) return prev;
      if (safeCount < prev.length) return prev.slice(0, safeCount);
      const defaults = getDefaultSlotsForCount(safeCount);
      return defaults.map((def, idx) => prev[idx] || def);
    });
  };

  const updateTimeSlot = (index: number, value: string) => {
    setTimeSlots((prev) => prev.map((slot, idx) => (idx === index ? value : slot)));
  };

  // Calcula data/hora exata para cada vídeo na fila
  const computedSchedules = useMemo(() => {
    const resultMap: Record<
      string,
      {
        iso: string;
        dateFormatted: string;
        timeFormatted: string;
        badgeLabel: string;
        dayNumber: number;
        slotNumber: number;
      }
    > = {};

    if (!bulkStartDate || bulkItems.length === 0) return resultMap;

    const [startYear, startMonth, startDay] = bulkStartDate.split('-').map(Number);
    if (!startYear || !startMonth || !startDay) return resultMap;

    const sortedSlots = [...timeSlots].map((s) => s || '12:00');
    const perDay = Math.max(1, sortedSlots.length);

    let currentDayCursor = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
    // Se a data inicial cair em fim de semana e skipWeekends estiver marcado, avança para segunda
    while (skipWeekends && (currentDayCursor.getDay() === 0 || currentDayCursor.getDay() === 6)) {
      currentDayCursor.setDate(currentDayCursor.getDate() + 1);
    }

    let slotIdx = 0;
    let dayCounter = 1;

    bulkItems.forEach((item) => {
      if (item.customScheduleIso) {
        const customDate = new Date(item.customScheduleIso);
        resultMap[item.id] = {
          iso: customDate.toISOString(),
          dateFormatted: customDate.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          }),
          timeFormatted: customDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          badgeLabel: `${customDate.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          })} às ${customDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          dayNumber: dayCounter,
          slotNumber: slotIdx + 1,
        };
        return;
      }

      const timeStr = sortedSlots[slotIdx] || '12:00';
      const [hh, mm] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);

      const scheduledLocal = new Date(
        currentDayCursor.getFullYear(),
        currentDayCursor.getMonth(),
        currentDayCursor.getDate(),
        hh,
        mm,
        0,
        0
      );

      const dateFormatted = scheduledLocal.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });
      const timeFormatted = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

      resultMap[item.id] = {
        iso: scheduledLocal.toISOString(),
        dateFormatted,
        timeFormatted,
        badgeLabel: `${dateFormatted} às ${timeFormatted}`,
        dayNumber: dayCounter,
        slotNumber: slotIdx + 1,
      };

      slotIdx++;
      if (slotIdx >= perDay) {
        slotIdx = 0;
        dayCounter++;
        currentDayCursor = new Date(currentDayCursor);
        currentDayCursor.setDate(currentDayCursor.getDate() + 1);
        while (skipWeekends && (currentDayCursor.getDay() === 0 || currentDayCursor.getDay() === 6)) {
          currentDayCursor.setDate(currentDayCursor.getDate() + 1);
        }
      }
    });

    return resultMap;
  }, [bulkItems, bulkStartDate, timeSlots, skipWeekends]);

  const handleGenerateAi = async () => {
    const topicToUse = aiTopic.trim() || title.trim();
    if (!topicToUse) {
      setAiError('Informe um tema ou título para a IA criar o conteúdo.');
      return;
    }
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const primaryPlatform = selectedPlatforms[0] || 'instagram';
      const res = await backend.generateAICopy({
        topic: topicToUse,
        platform: primaryPlatform,
        tone: aiTone,
      });
      if (res.success && res.data) {
        setAiGenerated(res.data);
      } else {
        setAiError('Não foi possível gerar conteúdo agora. Verifique a chave de API.');
      }
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const applyAiContent = (chosenTitle?: string) => {
    if (!aiGenerated) return;
    const finalTitle = chosenTitle || aiGenerated.title;
    let finalDesc = aiGenerated.description;
    if (aiGenerated.callToAction && !finalDesc.includes(aiGenerated.callToAction)) {
      finalDesc += `\n\n${aiGenerated.callToAction}`;
    }
    if (aiGenerated.hashtags?.length) {
      finalDesc += `\n\n${aiGenerated.hashtags.join(' ')}`;
    }
    setTitle(finalTitle);
    setDescription(finalDesc);
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 3000);
  };

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

  const addBulkVideos = useCallback(
    (incoming: FileList | File[]) => {
      const videoFiles = Array.from(incoming).filter(
        (f) => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name)
      );
      if (videoFiles.length === 0) {
        setError('Selecione arquivos de vídeo válidos (.mp4, .mov, .webm).');
        return;
      }
      setError('');
      const newItems: BulkVideoItem[] = videoFiles.map((file, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title: cleanFilenameToTitle(file.name),
        description: defaultBulkHashtags.trim() ? `\n\n${defaultBulkHashtags.trim()}` : '',
        status: 'pending',
        expanded: false,
      }));
      setBulkItems((prev) => [...prev, ...newItems]);
      setBulkProgress(null);
    },
    [defaultBulkHashtags]
  );

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    if (uploadMode === 'bulk') {
      addBulkVideos(arr);
      return;
    }
    // Se o usuário estiver em Vídeo e selecionar múltiplos arquivos de uma vez, oferece / muda para Envio em Massa!
    if (contentType === 'video' && arr.length > 1) {
      setUploadMode('bulk');
      addBulkVideos(arr);
      return;
    }
    setFiles((prev) => (contentType === 'photo' ? [...prev, ...arr] : arr.slice(0, 1)));
    if (contentType === 'video' && arr[0] && !title.trim()) {
      setTitle(cleanFilenameToTitle(arr[0].name));
    }
    setResult(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentType, uploadMode, addBulkVideos]
  );

  // Remover item da fila em massa
  const removeBulkItem = (id: string) => {
    setBulkItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  // Limpar toda a fila
  const clearAllBulkItems = () => {
    bulkItems.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setBulkItems([]);
    setBulkProgress(null);
  };

  // Mover vídeo na fila
  const moveBulkItem = (index: number, direction: -1 | 1) => {
    setBulkItems((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  };

  // Atualizar campos de um item da fila
  const updateBulkItem = (id: string, patch: Partial<BulkVideoItem>) => {
    setBulkItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  // Gerar título e legenda com Gemini IA para UM item da fila
  const generateAiForSingleBulkItem = async (item: BulkVideoItem) => {
    updateBulkItem(item.id, { status: 'generating_ai', errorMessage: undefined });
    try {
      const primaryPlatform = selectedPlatforms[0] || 'instagram';
      const baseTopic = bulkAiContext.trim()
        ? `${item.title} (${bulkAiContext.trim()})`
        : item.title || cleanFilenameToTitle(item.file.name);

      const res = await backend.generateAICopy({
        topic: baseTopic,
        platform: primaryPlatform,
        tone: bulkAiTone,
      });

      if (res.success && res.data) {
        let fullDesc = res.data.description || '';
        if (res.data.callToAction && !fullDesc.includes(res.data.callToAction)) {
          fullDesc += `\n\n${res.data.callToAction}`;
        }
        if (res.data.hashtags?.length) {
          fullDesc += `\n\n${res.data.hashtags.join(' ')}`;
        }
        updateBulkItem(item.id, {
          title: res.data.title || item.title,
          description: fullDesc.trim(),
          status: 'pending',
        });
      } else {
        updateBulkItem(item.id, {
          status: 'pending',
          errorMessage: 'Não foi possível gerar com IA para este item.',
        });
      }
    } catch (e) {
      updateBulkItem(item.id, {
        status: 'pending',
        errorMessage: (e as Error).message,
      });
    }
  };

  // Gerar títulos e legendas com Gemini IA para TODOS os vídeos da fila
  const handleGenerateBulkAi = async () => {
    if (bulkItems.length === 0 || isGeneratingBulkAi) return;
    setIsGeneratingBulkAi(true);
    setBulkAiProgress({ current: 0, total: bulkItems.length });
    setError('');

    const primaryPlatform = selectedPlatforms[0] || 'instagram';

    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      setBulkAiProgress({ current: i + 1, total: bulkItems.length });
      updateBulkItem(item.id, { status: 'generating_ai', errorMessage: undefined });

      try {
        const cleanName = cleanFilenameToTitle(item.file.name);
        const baseTopic = bulkAiContext.trim()
          ? `${item.title || cleanName} — Contexto: ${bulkAiContext.trim()} (Vídeo ${i + 1} de ${bulkItems.length})`
          : `${item.title || cleanName} (Vídeo ${i + 1})`;

        const res = await backend.generateAICopy({
          topic: baseTopic,
          platform: primaryPlatform,
          tone: bulkAiTone,
        });

        if (res.success && res.data) {
          let fullDesc = res.data.description || '';
          if (res.data.callToAction && !fullDesc.includes(res.data.callToAction)) {
            fullDesc += `\n\n${res.data.callToAction}`;
          }
          if (res.data.hashtags?.length) {
            fullDesc += `\n\n${res.data.hashtags.join(' ')}`;
          }
          updateBulkItem(item.id, {
            title: res.data.title || item.title,
            description: fullDesc.trim(),
            status: 'pending',
          });
        } else {
          updateBulkItem(item.id, { status: 'pending' });
        }
      } catch (e) {
        updateBulkItem(item.id, {
          status: 'pending',
          errorMessage: `IA falhou: ${(e as Error).message}`,
        });
      }
    }

    setIsGeneratingBulkAi(false);
    setBulkAiProgress(null);
  };

  // Envio sequencial e resiliente de todos os vídeos para /api/publish
  const handleBulkSchedule = async (onlyFailed = false) => {
    if (selectedPlatforms.length === 0) {
      setError('Selecione ao menos uma plataforma antes de agendar.');
      return;
    }

    const itemsToProcess = bulkItems.filter((item) =>
      onlyFailed ? item.status === 'error' : item.status !== 'scheduled'
    );

    if (itemsToProcess.length === 0) {
      setError('Todos os vídeos da lista já foram agendados.');
      return;
    }

    setIsBulkUploading(true);
    setError('');

    let succeededCount = bulkItems.filter((i) => i.status === 'scheduled').length;
    let failedCount = 0;
    const totalToProcess = itemsToProcess.length;
    const resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    setBulkProgress({
      current: 0,
      total: totalToProcess,
      currentTitle: itemsToProcess[0].title,
      succeeded: succeededCount,
      failed: 0,
      finished: false,
    });

    for (let idx = 0; idx < itemsToProcess.length; idx++) {
      const item = itemsToProcess[idx];
      const scheduleInfo = computedSchedules[item.id];
      const scheduledIso = scheduleInfo?.iso || new Date(Date.now() + (idx + 1) * 3600_000).toISOString();

      setBulkProgress({
        current: idx + 1,
        total: totalToProcess,
        currentTitle: item.title || item.file.name,
        succeeded: succeededCount,
        failed: failedCount,
        finished: false,
      });

      updateBulkItem(item.id, { status: 'uploading', errorMessage: undefined });

      try {
        const fd = new FormData();
        fd.append('media_type', 'video');
        fd.append('title', (item.title || cleanFilenameToTitle(item.file.name)).trim());

        let finalDescription = item.description.trim();
        if (defaultBulkHashtags.trim() && !finalDescription.includes(defaultBulkHashtags.trim())) {
          finalDescription = finalDescription
            ? `${finalDescription}\n\n${defaultBulkHashtags.trim()}`
            : defaultBulkHashtags.trim();
        }
        if (finalDescription) {
          fd.append('description', finalDescription);
        }

        selectedPlatforms.forEach((p) => fd.append('platform', p));
        fd.append('privacy', privacy);
        fd.append('format', format);
        fd.append('scheduled_at', scheduledIso);
        fd.append('timezone', resolvedTz);
        fd.append('media', item.file);

        const res = await backend.publish(fd);
        if (res.error || res.status === 'failed') {
          throw new Error(res.error || 'Falha ao agendar vídeo.');
        }

        succeededCount++;
        updateBulkItem(item.id, {
          status: 'scheduled',
          postId: res.post_id,
          errorMessage: undefined,
        });
      } catch (err) {
        failedCount++;
        updateBulkItem(item.id, {
          status: 'error',
          errorMessage: (err as Error).message || 'Erro inesperado durante o envio.',
        });
      }
    }

    setBulkProgress({
      current: totalToProcess,
      total: totalToProcess,
      currentTitle: '',
      succeeded: succeededCount,
      failed: failedCount,
      finished: true,
    });
    setIsBulkUploading(false);
  };

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

  const pendingBulkCount = bulkItems.filter((i) => i.status !== 'scheduled').length;
  const failedBulkCount = bulkItems.filter((i) => i.status === 'error').length;
  const scheduledBulkCount = bulkItems.filter((i) => i.status === 'scheduled').length;

  const canSubmitBulk =
    !isBulkUploading &&
    !isGeneratingBulkAi &&
    selectedPlatforms.length > 0 &&
    bulkItems.length > 0 &&
    pendingBulkCount > 0;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Upload & Agendamento" subtitle="Publicação individual ou fila inteligente em massa" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Seletor de Modo: Post Único vs Upload em Massa com Agendamento Inteligente */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 mb-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUploadMode('single')}
                className={`flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  uploadMode === 'single'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Post Único (Individual)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('bulk');
                  setContentType('video');
                }}
                className={`flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  uploadMode === 'bulk'
                    ? 'bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Upload em Massa & Fila Inteligente</span>
                {bulkItems.length > 0 && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                      uploadMode === 'bulk'
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                    }`}
                  >
                    {bulkItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {connected.length === 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Nenhuma conta conectada. Vá em{' '}
                <a href="/accounts" className="underline font-medium">
                  Accounts
                </a>{' '}
                para conectar suas redes sociais antes de publicar ou agendar.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Plataformas (comum para ambos os modos) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Plataformas de Destino ({selectedPlatforms.length} selecionada{selectedPlatforms.length === 1 ? '' : 's'})
              </h3>
              {connected.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPlatforms(selectedPlatforms.length === connected.length ? [] : [...connected])
                  }
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {selectedPlatforms.length === connected.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
              )}
            </div>
            {connected.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma conta conectada.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {connected.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <PlatformIcon platform={platform} size="md" />
                      <p className="text-sm font-medium mt-2 text-slate-700 dark:text-slate-300 capitalize">
                        {platform}
                      </p>
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

          {uploadMode === 'bulk' ? (
            /* ============================================================
               MODO: UPLOAD EM MASSA COM AGENDAMENTO INTELIGENTE EM FILA
               ============================================================ */
            <>
              {/* 1. Parâmetros do Agendamento em Fila / Lote */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Configuração da Fila Inteligente
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Defina quantos vídeos saem por dia e os horários exatos. Calculamos o calendário automaticamente.
                      </p>
                    </div>
                  </div>

                  {bulkItems.length > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      📅 {bulkItems.length} vídeo(s) ={' '}
                      <b>{Math.ceil(bulkItems.length / Math.max(1, timeSlots.length))} dia(s)</b> de conteúdo agendado
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Quantidade de vídeos por dia */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Quantidade de vídeos por dia
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setCustomVideosPerDay(false);
                            handleVideosPerDayChange(n);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                            !customVideosPerDay && videosPerDay === n
                              ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                          }`}
                        >
                          {n} {n === 1 ? 'vídeo/dia' : 'vídeos/dia'}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCustomVideosPerDay(true)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                          customVideosPerDay
                            ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                        }`}
                      >
                        Personalizado
                      </button>
                      {customVideosPerDay && (
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={videosPerDay}
                          onChange={(e) => handleVideosPerDayChange(parseInt(e.target.value, 10) || 1)}
                          className="w-20 px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-800 border border-brand-400 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Data inicial + Pular finais de semana */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        Data inicial do agendamento
                      </label>
                      <input
                        type="date"
                        value={bulkStartDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBulkStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={skipWeekends}
                        onChange={(e) => setSkipWeekends(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        Pular finais de semana (Sábado e Domingo)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Slots de horários por dia */}
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Horários de publicação em cada dia ({timeSlots.length} {timeSlots.length === 1 ? 'horário' : 'horários'})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {timeSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="px-2 py-1 text-xs font-bold rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                          #{idx + 1}
                        </span>
                        <input
                          type="time"
                          value={slot}
                          onChange={(e) => updateTimeSlot(idx, e.target.value)}
                          className="flex-1 bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formato, Visibilidade e Hashtags Padrão do Lote */}
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Formato dos vídeos
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="feed">Feed / Reels / Shorts</option>
                      <option value="story">Story</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Visibilidade padrão
                    </label>
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="public">Público</option>
                      <option value="unlisted">Não listado</option>
                      <option value="private">Privado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Hashtags / Rodapé fixo (opcional)
                    </label>
                    <input
                      type="text"
                      value={defaultBulkHashtags}
                      onChange={(e) => setDefaultBulkHashtags(e.target.value)}
                      placeholder="Ex: #shorts #reels #marketing"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Dropzone de Seleção Múltipla de Vídeos */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Selecionar Vídeos em Lote
                  </h3>
                  {bulkItems.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => bulkFileInputRef.current?.click()}
                        disabled={isBulkUploading}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar mais vídeos
                      </button>
                      <button
                        type="button"
                        onClick={clearAllBulkItems}
                        disabled={isBulkUploading}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpar lista
                      </button>
                    </div>
                  )}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-brand-500'
                  }`}
                >
                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        addBulkVideos(e.target.files);
                        e.target.value = '';
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-10 h-10 mx-auto text-brand-500 mb-2" />
                  <p className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                    Arraste e solte vários vídeos aqui de uma só vez
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Suporta seleção múltipla (.mp4, .mov, .webm). O nome de cada arquivo vira o título provisório automaticamente.
                  </p>
                </div>
              </div>

              {/* 3. Barra de Geração de Títulos/Legendas em Lote com Gemini IA */}
              {bulkItems.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-gradient-to-br from-violet-50/80 via-indigo-50/40 to-purple-50/50 dark:from-violet-950/25 dark:via-indigo-950/20 dark:to-purple-950/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Copywriting em Lote com Gemini IA
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Gere títulos virais, legendas persuasivas e hashtags para todos os {bulkItems.length} vídeos com 1 clique.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingBulkAi || isBulkUploading}
                      onClick={handleGenerateBulkAi}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm disabled:opacity-50 transition-all"
                    >
                      {isGeneratingBulkAi && bulkAiProgress ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>
                            Gerando IA ({bulkAiProgress.current} de {bulkAiProgress.total})...
                          </span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          <span>✨ Gerar Títulos e Legendas em Lote ({bulkItems.length})</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={bulkAiContext}
                      onChange={(e) => setBulkAiContext(e.target.value)}
                      placeholder="Nicho/contexto geral opcional (ex: Cortes de empreendedorismo, Dicas de treino...)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                    <select
                      value={bulkAiTone}
                      onChange={(e) => setBulkAiTone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    >
                      <option value="viral, dinâmico e persuasivo">Tom: 🔥 Viral & Persuasivo</option>
                      <option value="educativo, claro e didático">Tom: 🎓 Educativo / Passo a Passo</option>
                      <option value="focado em vendas e chamada para ação forte">Tom: 💼 Vendas & Conversão</option>
                      <option value="ultrarrápido, provocativo e conciso">Tom: ⚡ Rápido / Direto ao Ponto</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Barra de Progresso do Envio Sequencial & Relatório Final */}
              {bulkProgress && (
                <div className="mb-6 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {!bulkProgress.finished ? (
                        <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                      ) : bulkProgress.failed === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {!bulkProgress.finished
                          ? `Enviando ${bulkProgress.current} de ${bulkProgress.total}...`
                          : 'Processamento da fila concluído!'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                      {Math.round((bulkProgress.current / Math.max(1, bulkProgress.total)) * 100)}%
                    </span>
                  </div>

                  {!bulkProgress.finished && bulkProgress.currentTitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
                      Vídeo atual: <b>{bulkProgress.currentTitle}</b>
                    </p>
                  )}

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-300 ${
                        bulkProgress.finished && bulkProgress.failed === 0
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-brand-600 to-indigo-600'
                      }`}
                      style={{
                        width: `${Math.round((bulkProgress.current / Math.max(1, bulkProgress.total)) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {scheduledBulkCount} agendado(s) com sucesso
                      </span>
                      {failedBulkCount > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          ✕ {failedBulkCount} com falha
                        </span>
                      )}
                    </div>

                    {bulkProgress.finished && (
                      <div className="flex items-center gap-2">
                        {failedBulkCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleBulkSchedule(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-200 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reenviar {failedBulkCount} com falha
                          </button>
                        )}
                        <Link
                          href="/schedule"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          Ver no Calendário (/schedule)
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Lista Prévia dos Vídeos com Thumbnail, Título Editável e Badge de Data/Hora */}
              {bulkItems.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Fila de Vídeos Selecionados ({bulkItems.length})
                    </h3>
                    <span className="text-xs text-slate-500">
                      Edite os títulos/legendas ou reordene a fila antes de agendar
                    </span>
                  </div>

                  <div className="space-y-3">
                    {bulkItems.map((item, idx) => {
                      const sched = computedSchedules[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-4 transition-all ${
                            item.status === 'scheduled'
                              ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/15'
                              : item.status === 'error'
                              ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/15'
                              : item.status === 'uploading' || item.status === 'generating_ai'
                              ? 'border-brand-400 bg-brand-50/30 dark:bg-brand-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            {/* Thumbnail em vídeo real */}
                            <div className="relative w-full sm:w-28 h-36 sm:h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700">
                              <video
                                src={item.previewUrl}
                                muted
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={(e) => {
                                  try {
                                    e.currentTarget.currentTime = Math.min(0.5, e.currentTarget.duration || 0.5);
                                  } catch {
                                    // ignore seek errors
                                  }
                                }}
                                onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                                onMouseLeave={(e) => {
                                  e.currentTarget.pause();
                                  try {
                                    e.currentTarget.currentTime = 0.5;
                                  } catch {
                                    // ignore
                                  }
                                }}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-black/75 text-white">
                                #{idx + 1}
                              </span>
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-black/75 text-slate-200">
                                {(item.file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>

                            {/* Conteúdo Principal do Item */}
                            <div className="flex-1 min-w-0 w-full">
                              {/* Linha 1: Badge de Data/Hora Calculada + Status */}
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {sched && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>{sched.badgeLabel}</span>
                                      <span className="text-[10px] opacity-75">
                                        (Dia {sched.dayNumber} • Slot {sched.slotNumber})
                                      </span>
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400 truncate max-w-[220px]" title={item.file.name}>
                                    {item.file.name}
                                  </span>
                                </div>

                                {/* Status Badge & Controles */}
                                <div className="flex items-center gap-1.5">
                                  {item.status === 'scheduled' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Agendado
                                    </span>
                                  )}
                                  {item.status === 'uploading' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Enviando...
                                    </span>
                                  )}
                                  {item.status === 'generating_ai' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Gerando IA...
                                    </span>
                                  )}
                                  {item.status === 'error' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                                      <XCircle className="w-3.5 h-3.5" />
                                      Falhou
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    title="Gerar título e legenda com Gemini IA para este vídeo"
                                    disabled={isBulkUploading || item.status === 'generating_ai'}
                                    onClick={() => generateAiForSingleBulkItem(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-900/70 text-violet-700 dark:text-violet-300 transition-colors disabled:opacity-40"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    IA
                                  </button>

                                  <button
                                    type="button"
                                    title="Subir na fila"
                                    disabled={idx === 0 || isBulkUploading}
                                    onClick={() => moveBulkItem(idx, -1)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Descer na fila"
                                    disabled={idx === bulkItems.length - 1 || isBulkUploading}
                                    onClick={() => moveBulkItem(idx, 1)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Remover vídeo"
                                    disabled={isBulkUploading}
                                    onClick={() => removeBulkItem(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Linha 2: Input de Título individual */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.title}
                                  disabled={isBulkUploading || item.status === 'scheduled'}
                                  onChange={(e) => updateBulkItem(item.id, { title: e.target.value })}
                                  placeholder="Título do vídeo..."
                                  className="flex-1 px-3 py-2 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-60"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateBulkItem(item.id, { expanded: !item.expanded })}
                                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-brand-400"
                                >
                                  <span>Legenda</span>
                                  {item.expanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              {/* Linha 3 (Expansível ou se já tiver descrição): Legenda individual */}
                              {(item.expanded || item.description.trim().length > 0) && (
                                <div className="mt-2">
                                  <textarea
                                    rows={2}
                                    value={item.description}
                                    disabled={isBulkUploading || item.status === 'scheduled'}
                                    onChange={(e) => updateBulkItem(item.id, { description: e.target.value })}
                                    placeholder="Legenda / descrição específica para este vídeo (opcional)..."
                                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-y disabled:opacity-60"
                                  />
                                </div>
                              )}

                              {item.errorMessage && (
                                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                  Erro: {item.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botão Principal: Agendar Todos os Vídeos */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <CalendarCheck className="w-5 h-5 text-brand-600" />
                  <span>
                    <b>{bulkItems.length}</b> vídeo(s) na fila • <b>{selectedPlatforms.length}</b> plataforma(s) •{' '}
                    <b>{timeSlots.length}</b> por dia
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {scheduledBulkCount > 0 && (
                    <Link
                      href="/schedule"
                      className="px-4 py-3 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      Ver Calendário ({scheduledBulkCount})
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleBulkSchedule(false)}
                    disabled={!canSubmitBulk}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 hover:from-brand-500 hover:to-indigo-500 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-800 dark:disabled:to-slate-800 text-white rounded-xl font-bold shadow-sm transition-all disabled:cursor-not-allowed"
                  >
                    {isBulkUploading && bulkProgress ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                          Enviando {bulkProgress.current} de {bulkProgress.total}...
                        </span>
                      </>
                    ) : (
                      <>
                        <CalendarCheck className="w-5 h-5" />
                        <span>Agendar Todos os Vídeos ({pendingBulkCount})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ============================================================
               MODO: POST ÚNICO (FLUXO ORIGINAL INTACTO)
               ============================================================ */
            <>
              {/* Content Type */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Tipo de conteúdo</h3>
                <div className="grid grid-cols-3 gap-3">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
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
                      <span
                        className={`text-sm font-medium ${
                          contentType === type.id ? 'text-brand-600' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload area */}
              {contentType !== 'text' && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {contentType === 'video' ? 'Enviar vídeo (selecione vários para ir para a Fila em Massa)' : 'Enviar foto'}
                    </h3>
                  </div>
                  {files.length === 0 ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                        isDragging
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-brand-500'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={contentType === 'video' ? 'video/*' : 'image/*'}
                        onChange={(e) => e.target.files && addFiles(e.target.files)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">Arraste e solte aqui</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        ou clique para escolher do computador (selecionando 2+ vídeos ativa o Agendamento em Fila)
                      </p>
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
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      {contentType === 'photo' && (
                        <button
                          type="button"
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

              {/* Details */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Detalhes do Post</h3>
                  <button
                    type="button"
                    onClick={() => setShowAiAssistant((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{showAiAssistant ? 'Ocultar Assistente IA' : '✨ Gerar com Gemini IA'}</span>
                  </button>
                </div>

                {/* AI Assistant Drawer */}
                {showAiAssistant && (
                  <div className="mb-6 p-4 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-gradient-to-br from-violet-50/70 via-indigo-50/40 to-purple-50/50 dark:from-violet-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white shadow-sm">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                          Assistente Gemini de Copywriting
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Gere ganchos virais, roteiros e legendas de alto impacto direto com o Google Gemini.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Sobre o que é seu post ou vídeo?
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateAi()}
                            placeholder="Ex: 3 erros que destroem o alcance dos Reels e como consertar..."
                            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={isGeneratingAi}
                            onClick={handleGenerateAi}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
                          >
                            {isGeneratingAi ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Gerando...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                <span>Gerar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Tom:</span>
                        {[
                          { label: '🔥 Viral & Persuasivo', value: 'viral, dinâmico e persuasivo' },
                          { label: '🎓 Educativo / Passo a Passo', value: 'educativo, claro e didático' },
                          { label: '💼 Vendas & Conversão', value: 'focado em vendas e chamada para ação forte' },
                          { label: '⚡ Rápido / Direto ao Ponto', value: 'ultrarrápido, provocativo e conciso' },
                        ].map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setAiTone(t.value)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              aiTone === t.value
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-300'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {aiError && (
                        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{aiError}</span>
                        </div>
                      )}

                      {appliedNotification && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
                          <CheckCheck className="w-4 h-4 shrink-0" />
                          <span>Conteúdo da IA aplicado com sucesso no título e descrição!</span>
                        </div>
                      )}

                      {aiGenerated && (
                        <div className="mt-3 p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                                Título Sugerido
                              </span>
                              <button
                                type="button"
                                onClick={() => applyAiContent()}
                                className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                Aplicar tudo no post
                              </button>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              {aiGenerated.title}
                            </p>
                          </div>

                          {aiGenerated.alternativeTitles?.length > 0 && (
                            <div>
                              <span className="text-[11px] font-medium text-slate-500 block mb-1">
                                Ou escolha outro gancho:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {aiGenerated.alternativeTitles.map((altTitle, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => applyAiContent(altTitle)}
                                    className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-violet-100 dark:bg-slate-800 dark:hover:bg-violet-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-left transition-all"
                                  >
                                    ⚡ {altTitle}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 block mb-1">
                              Legenda & Hashtags
                            </span>
                            <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                              {aiGenerated.description}
                              {aiGenerated.callToAction && `\n\n${aiGenerated.callToAction}`}
                              {aiGenerated.hashtags?.length > 0 && `\n\n${aiGenerated.hashtags.join(' ')}`}
                            </div>
                          </div>

                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => applyAiContent()}
                              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aplicar Título e Legenda ao Post</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Descrição
                      </label>
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
                          {contentType === 'video' ? 'Feed / Reels' : 'Feed'}
                          {files.length > 1 ? ' (carrossel)' : ''}
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Agendado para {new Date(result.scheduled_at!).toLocaleString('pt-BR')} em{' '}
                        {result.platforms?.join(', ')}
                      </p>
                      <Link
                        href="/schedule"
                        className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
                      >
                        <CalendarCheck className="w-4 h-4" />
                        Ver no Calendário (/schedule)
                      </Link>
                    </div>
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
                            <p className="text-sm font-medium capitalize text-slate-900 dark:text-white">
                              {r.platform}
                            </p>
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
                  type="button"
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
