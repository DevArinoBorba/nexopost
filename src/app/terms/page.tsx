import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export const metadata = {
  title: 'Termos de Serviço — NexoPost',
  description: 'Termos de Uso e Condições de Serviço do NexoPost.',
};

export default function TermsPage() {
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Termos de Serviço</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Última atualização: 22 de outubro de 2026</p>
        </div>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Objeto do Serviço</h2>
          <p>
            O <strong>NexoPost</strong> disponibiliza ferramentas para agendamento, formatação multimídia e publicação
            de conteúdos em redes sociais a partir de integrações com as APIs oficiais autorizadas pelo usuário.
          </p>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Responsabilidade sobre os Conteúdos</h2>
          <p>
            O usuário é o único e exclusivo responsável pelo conteúdo publicado (textos, imagens, áudios e vídeos) e pela
            conformidade com as Diretrizes da Comunidade e Termos de Uso de cada plataforma parceira (Meta, Google/YouTube e TikTok).
          </p>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Uso de APIs e Limites</h2>
          <p>
            A operação do NexoPost depende da disponibilidade contínua das APIs dos provedores de rede social.
            O serviço adere rigorosamente aos limites de taxa (rate limits) e diretrizes de desenvolvimento oficiais da Meta,
            Google e TikTok.
          </p>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Cancelamento e Modificações</h2>
          <p>
            O serviço pode ser revogado ou interrompido a qualquer momento pelo usuário através da desconexão de suas contas
            ou encerramento do serviço.
          </p>
        </section>
      </div>
    </div>
  );
}
