'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type AutoDMRuleView, type AutoDMLogView } from '@/lib/client';
import {
  MessageCircle,
  Plus,
  Trash2,
  Play,
  Pause,
  Send,
  Loader2,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function AutoDMPage() {
  const [rules, setRules] = useState<AutoDMRuleView[]>([]);
  const [logs, setLogs] = useState<AutoDMLogView[]>([]);
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Nova regra
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('quero, link, info');
  const [replyComment, setReplyComment] = useState('Te enviei todos os detalhes no Direct! 🚀');
  const [dmMessage, setDmMessage] = useState('Olá {nome}! Aqui está o link que você pediu: https://');
  const [saving, setSaving] = useState(false);

  // Simulador
  const [testComment, setTestComment] = useState('Eu quero o link!');
  const [testUsername, setTestUsername] = useState('cliente_real');
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    reply?: string;
    dm?: string;
    message?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backend.getAutoDM();
      setRules(data.rules || []);
      setLogs(data.logs || []);
      setProfileName(data.profile?.username || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await backend.saveAutoDMRule({
        name,
        platform: 'instagram',
        trigger_type: 'keyword',
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        reply_comments: [replyComment],
        dm_message: dmMessage,
        delay_seconds: 5,
        status: 'active',
      });
      setName('');
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    await backend.toggleAutoDMRule(id);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta regra de AutoDM?')) return;
    await backend.deleteAutoDMRule(id);
    await load();
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await backend.testAutoDM({
        comment: testComment,
        username: testUsername,
      });
      setTestResult(res);
      await load();
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="AutoDM" subtitle={`Automação de comentários e Directs (${profileName || 'Cliente'})`} />
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Topo */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Regras de AutoDM por Palavra-Chave
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Responda comentários automaticamente e envie links no Direct da conta conectada
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Automação
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSaveRule}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Criar Regra de AutoDM</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome da regra
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Enviar Link da Oferta"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Palavras-chave (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="quero, link, preço"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resposta pública no comentário
                </label>
                <input
                  type="text"
                  value={replyComment}
                  onChange={(e) => setReplyComment(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mensagem enviada no Direct (use {'{nome}'} para personalizar)
                </label>
                <textarea
                  rows={3}
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar Regra
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Lista de Regras */}
              <div className="lg:col-span-2 space-y-4">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <PlatformIcon platform={r.platform || 'instagram'} size="sm" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{r.name}</h3>
                          <p className="text-xs text-slate-500">
                            {r.total_triggered} disparo(s) · {r.total_dms_sent} DM(s) enviada(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(r.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {r.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {r.status === 'active' ? 'Ativa' : 'Pausada'}
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {r.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2.5 py-0.5 text-xs font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {r.dm_message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Simulador e Histórico */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Testar Gatilho Agora
                  </h3>
                  <form onSubmit={handleTest} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Usuário (@)</label>
                      <input
                        type="text"
                        value={testUsername}
                        onChange={(e) => setTestUsername(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Comentário recebido</label>
                      <input
                        type="text"
                        value={testComment}
                        onChange={(e) => setTestComment(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={testing}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-brand-600 dark:bg-brand-600 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Simular Comentário
                    </button>
                  </form>

                  {testResult && (
                    <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                      {testResult.matched ? (
                        <>
                          <p className="font-semibold text-emerald-600 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Regra acionada!
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            <strong>Resposta pública:</strong> {testResult.reply}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                            <strong>Direct enviado:</strong> {testResult.dm}
                          </p>
                        </>
                      ) : (
                        <p className="text-amber-600">{testResult.message}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Últimos Disparos</h3>
                  {logs.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum disparo registrado ainda.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {logs.slice(0, 8).map((l) => (
                        <div
                          key={l.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs border border-slate-200/70 dark:border-slate-700"
                        >
                          <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                            <span>@{l.commenter_username}</span>
                            <span className="text-[10px] text-emerald-600 uppercase">{l.dm_status}</span>
                          </div>
                          <p className="text-slate-500 truncate mt-0.5">&ldquo;{l.comment_text}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
