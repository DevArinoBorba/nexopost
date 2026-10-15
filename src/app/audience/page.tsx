'use client';

import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Users, Sparkles, ArrowRight, Clock } from 'lucide-react';

export default function AudiencePage() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Audience Insights" subtitle="Demografia dos seguidores" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              Audience Insights — Em construção
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto">
              A demografia de seguidores (países, idades, gênero, horários de atividade) vem das APIs oficiais de
              analytics de cada rede. Esta parte precisa da integração com o <b>TikTok</b> e <b>Instagram</b>, que ainda
              não foi implementada neste servidor.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 text-left mb-8">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Sparkles className="w-5 h-5 text-brand-600 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">O que já funciona</p>
                <p className="text-xs text-slate-500 mt-1">YouTube: upload e publicação reais</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Clock className="w-5 h-5 text-amber-600 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Próximo passo</p>
                <p className="text-xs text-slate-500 mt-1">Integração TikTok Content API</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Users className="w-5 h-5 text-purple-600 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">Depois</p>
                <p className="text-xs text-slate-500 mt-1">Demografia + atividade por hora</p>
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
