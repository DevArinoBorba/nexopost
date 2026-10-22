import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export const metadata = {
  title: 'Política de Privacidade — NexoPost',
  description: 'Política de Privacidade e Proteção de Dados do NexoPost.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-sm space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <BrandLogo size="md" />
          <Link href="/" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            Voltar ao Início
          </Link>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Última atualização: 22 de outubro de 2026</p>
        </div>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Informações Gerais</h2>
          <p>
            O <strong>NexoPost</strong> é uma plataforma de gestão, publicação e agendamento de conteúdo multimídia para
            redes sociais. Esta Política de Privacidade descreve como tratamos e protegemos os dados dos usuários e das contas
            conectadas via APIs oficiais (Meta Graph API, YouTube Data API e TikTok Content Posting API).
          </p>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Dados Coletados e Utilização</h2>
          <p>
            Para prestar os serviços de publicação e agendamento, coletamos apenas os dados estritamente necessários
            autorizados pelo usuário no fluxo de autenticação OAuth:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Identificação do perfil e nome das Páginas e Contas Profissionais vinculadas;</li>
            <li>Tokens de acesso OAuth gerados pelas plataformas oficiais para publicação em nome do usuário;</li>
            <li>Metadados de publicação (título, descrição, arquivo de mídia e horários agendados);</li>
            <li>Métricas agregadas públicas de audiência e alcance disponibilizadas pelas APIs oficiais.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Segurança e Criptografia dos Dados</h2>
          <p>
            Todos os tokens de autenticação (OAuth tokens e refresh tokens) são armazenados em banco de dados protegido
            com criptografia autenticada <strong>AES-256-GCM</strong>. Nenhuma credencial ou token é compartilhado com terceiros,
            comercializado ou utilizado para fins publicitários.
          </p>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Exclusão e Revogação de Acesso</h2>
          <p>
            O usuário pode revogar o acesso do NexoPost a qualquer momento diretamente nas configurações de aplicativos
            da Meta (Facebook/Instagram), Google ou TikTok, ou através da aba <em>Contas</em> no painel do NexoPost clicando em
            Desconectar. Instruções completas para exclusão definitiva estão disponíveis na página de{' '}
            <Link href="/data-deletion" className="text-brand-600 dark:text-brand-400 underline">
              Exclusão de Dados
            </Link>.
          </p>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">5. Contato</h2>
          <p>
            Em caso de dúvidas sobre privacidade e proteção de dados, entre em contato através do e-mail de suporte da
            plataforma ou pelo nosso canal oficial.
          </p>
        </section>
      </div>
    </div>
  );
}
