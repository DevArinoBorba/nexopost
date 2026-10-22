import Link from 'next/link';
import BrandLogo from './BrandLogo';
import { ThemeToggle } from './ThemeProvider';
import { ArrowLeft, Calendar, Layers, Send } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="nexo-auth">
    <header className="nexo-auth-header"><Link href="/" aria-label="NexoPost — início"><BrandLogo size="md" /></Link><ThemeToggle /></header>
    <main className="nexo-auth-body">
      <section className="nexo-auth-story">
        <h2>Seu conteúdo.<br />Todas as redes.<br /><span>Um só lugar.</span></h2>
        <p>Publique, organize seu calendário e acompanhe cada marca em um espaço próprio.</p>
        <div className="nexo-auth-flow"><Send size={20} /><span>Publicar</span><Calendar size={20} /><span>Agendar</span><Layers size={20} /><span>Organizar</span></div>
      </section>
      <section className="nexo-auth-form">{children}<Link href="/" className="nexo-back-link"><ArrowLeft size={15} /> Voltar ao início</Link></section>
    </main>
  </div>;
}
