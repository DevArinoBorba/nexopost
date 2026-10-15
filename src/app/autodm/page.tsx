'use client';

import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { MessageCircle, Instagram, ArrowRight, Clock, Zap } from 'lucide-react';

export default function AutoDMPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="AutoDM" subtitle="Automação de comentários e mensagens" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AutoDM — Em construção</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto">
              Responder comentários por mensagem direta e enviar DMs automáticas depende da{' '}
              <b>Instagram Graph API</b> (via app Meta). Essa integração ainda não foi implementada neste servidor.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 text-left mb-8">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Instagram className="w-5 h-5 text-pink-600 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Requer</p>
                <p className="text-xs text-slate-500 mt-1">Conta Instagram Business + app Meta aprovado</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Zap className="w-5 h-5 text-amber-600 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Funcionalidades</p>
                <p className="text-xs text-slate-500 mt-1">Listar comentários, responder por DM, excluir</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Clock className="w-5 h-5 text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Status</p>
                <p className="text-xs text-slate-500 mt-1">Aguardando integração Meta</p>
              </div>
            </div>

            <Link
              href="/accounts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors"
            >
              Ver plataformas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
