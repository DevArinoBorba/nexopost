import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export const metadata = {
  title: 'Instruções de Exclusão de Dados — NexoPost',
  description: 'Como solicitar a exclusão de dados e revogação de acessos no NexoPost.',
};

export default function DataDeletionPage() {
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Instruções de Exclusão de Dados</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Conforme as diretrizes da Meta Platform (Facebook e Instagram) e normas de proteção de dados (LGPD / GDPR).
          </p>
        </div>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Como revogar o acesso do NexoPost no Facebook e Instagram</h2>
          <p>
            Se você deseja remover a autorização concedida ao NexoPost nas suas redes sociais, siga os passos abaixo:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>Acesse sua conta do Facebook e vá para <strong>Configurações e Privacidade &gt; Configurações</strong>;</li>
            <li>No menu lateral, selecione <strong>Aplicativos e sites</strong>;</li>
            <li>Localize o aplicativo <strong>NexoPost</strong> na lista de aplicativos ativos;</li>
            <li>Clique em <strong>Remover</strong>;</li>
            <li>Marque a opção para excluir publicações e vídeos associados caso deseje e confirme a remoção.</li>
          </ol>
        </section>

        <section className="space-y-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Como solicitar a exclusão de dados no servidor NexoPost</h2>
          <p>
            No painel do NexoPost:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Acesse a aba <strong>Contas</strong>;</li>
            <li>Localize a rede social conectada e clique no botão <strong>Desconectar</strong>;</li>
            <li>Todos os tokens criptografados e sessões ativas são imediatamente apagados do banco de dados local.</li>
          </ul>
          <p className="pt-2">
            Caso prefira solicitar a exclusão manual de histórico de postagens ou registros do seu perfil pelo administrador,
            envie uma solicitação para o e-mail de suporte da sua organização informando seu usuário ou ID de conta.
          </p>
        </section>
      </div>
    </div>
  );
}
