'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PlatformIcon from '@/components/PlatformIcon';
import BrandLogo from '@/components/BrandLogo';
import {
  Upload,
  ArrowRight,
  Layers,
  Film,
  ShieldCheck,
  Server,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  Users,
} from 'lucide-react';

const WORKFLOW_CARDS = [
  {
    icon: Upload,
    title: 'Envio único para múltiplas redes',
    description:
      'Suba seu vídeo, foto, carrossel ou texto uma única vez. O NexoPost adapta metadados, privacidade e formato (Feed, Reels, Shorts ou Story) para cada destino.',
    detail: 'YouTube · Instagram · Facebook · TikTok',
  },
  {
    icon: Film,
    title: 'Estúdio FFmpeg integrado no servidor',
    description:
      'Converta vídeos horizontais para 9:16 com fundo desfocado, formato quadrado 1:1, comprima arquivos grandes ou corte os primeiros 60 segundos sem sair do navegador.',
    detail: 'Processamento 100% local',
  },
  {
    icon: Layers,
    title: 'Fila recorrente e calendário visual',
    description:
      'Defina janelas fixas na semana (ex.: segundas, quartas e sextas às 12h e 19h) ou agende datas específicas no calendário mensal com reagendamento em um clique.',
    detail: 'Fuso horário configurável por perfil',
  },
  {
    icon: Users,
    title: 'Gestão multi-cliente para agências e criadores',
    description:
      'Separe marcas, páginas e canais em perfis independentes. Alterne entre clientes no topo da barra lateral sem misturar credenciais ou filas de postagem.',
    detail: 'Perfis isolados no mesmo painel',
  },
  {
    icon: ShieldCheck,
    title: 'Tokens criptografados com AES-256-GCM',
    description:
      'Todas as chaves OAuth e refresh tokens ficam armazenados no seu próprio banco SQLite com criptografia autenticada e renovação automática antes do vencimento.',
    detail: 'Zero intermediários de terceiros',
  },
  {
    icon: Server,
    title: 'Arquitetura própria pronta para VPS',
    description:
      'Sem mensalidades por conta conectada nem limites artificiais de upload. Rode em qualquer VPS Linux com Node.js, SQLite em modo WAL e túnel público de mídia.',
    detail: 'Soberania total dos seus dados',
  },
];

const PLATFORMS_LIST = [
  {
    id: 'instagram',
    name: 'Instagram Graph API',
    capabilities: 'Reels, Fotos, Carrosséis até 10 itens e Stories',
    status: 'Ativo no servidor',
  },
  {
    id: 'youtube',
    name: 'YouTube Data API v3',
    capabilities: 'Vídeos longos e Shorts com upload resumível e controle de privacidade',
    status: 'Ativo no servidor',
  },
  {
    id: 'facebook',
    name: 'Facebook Pages API',
    capabilities: 'Vídeos nativos, Reels, Stories, Álbuns de fotos e posts de texto',
    status: 'Ativo no servidor',
  },
  {
    id: 'tiktok',
    name: 'TikTok Content Posting API',
    capabilities: 'Publicação direta de vídeos verticais e modo foto em alta definição',
    status: 'Suporte integrado',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Como o NexoPost publica sem depender de serviços pagos de terceiros?',
    answer:
      'O NexoPost se conecta diretamente às APIs oficiais de cada plataforma (YouTube Data API v3, Meta Graph API para Instagram e Facebook, e TikTok Content Posting API) a partir do seu próprio servidor ou VPS. Seus vídeos e tokens não passam por intermediários.',
  },
  {
    question: 'Posso gerenciar vários clientes ou marcas diferentes no mesmo painel?',
    answer:
      'Sim. O sistema possui um seletor de clientes (perfis) integrado na barra lateral. Cada cliente possui suas próprias contas conectadas, fila de horários e histórico de publicações totalmente isolados.',
  },
  {
    question: 'Como funciona o agendamento automático na VPS?',
    answer:
      'Quando você agenda uma publicação, ela fica salva no banco SQLite local com status agendado. Um cronjob simples ou chamada ao endpoint /api/scheduler/run verifica os posts vencidos a cada minuto, renova os tokens OAuth se necessário e dispara a publicação em todas as redes escolhidas.',
  },
  {
    question: 'O que o Estúdio de Vídeo com FFmpeg faz exatamente?',
    answer:
      'Ele processa seus vídeos diretamente no servidor antes da publicação: converte vídeos 16:9 para o formato vertical 9:16 com fundo desfocado (ideal para Reels e Shorts), gera versão 1:1, reduz o tamanho do arquivo em H.264/AAC, corta automaticamente em 60 segundos ou extrai o áudio em MP3.',
  },
  {
    question: 'Meus tokens de acesso das redes sociais ficam seguros?',
    answer:
      'Sim. Todos os access_tokens e refresh_tokens são criptografados com AES-256-GCM utilizando a chave TOKEN_ENCRYPTION_KEY definida no seu arquivo .env.local antes de serem gravados no banco de dados.',
  },
];

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showWhatsappTooltip, setShowWhatsappTooltip] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Reveal nos elementos do Hero ao carregar
      gsap.fromTo(
        '[data-hero-reveal]',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.15,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        }
      );

      // Reveal nos títulos de seção conforme o usuário rola a página
      gsap.utils.toArray<HTMLElement>('[data-gsap-title]').forEach((titleEl) => {
        gsap.fromTo(
          titleEl,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: titleEl,
              start: 'top 86%',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      // Reveal com stagger de 0.15s nos grupos de cards/blocos
      gsap.utils.toArray<HTMLElement>('[data-gsap-group]').forEach((groupEl) => {
        const items = groupEl.querySelectorAll('[data-gsap-card]');
        if (!items.length) return;
        gsap.fromTo(
          items,
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.75,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: groupEl,
              start: 'top 84%',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      // Parallax suave nos cards flutuantes do Hero
      gsap.utils.toArray<HTMLElement>('[data-parallax-speed]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallaxSpeed || '-28');
        gsap.to(el, {
          y: speed,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-[#fafaf9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-brand-500/20"
    >
      {/* Barra de Navegação Minimalista */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#fafaf9]/85 dark:bg-[#090d16]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center group transition-transform duration-300 hover:scale-[1.02]">
              <BrandLogo layout="horizontal" size="md" subtitle="Estúdio Próprio" />
            </Link>

            {/* Links Desktop */}
            <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-8">
              <a
                href="#recursos"
                className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                Recursos
              </a>
              <a
                href="#plataformas"
                className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                Plataformas
              </a>
              <a
                href="#fluxo"
                className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                Como funciona
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                Dúvidas
              </a>
            </nav>

            {/* Ações Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleTheme}
                aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
                className="p-2.5 rounded-xl text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-all duration-300 hover:scale-105"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link
                href="/login"
                className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-slate-900 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_20px_-6px_rgba(15,23,42,0.35)] flex items-center gap-2"
              >
                Abrir Painel
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Botões Mobile (Tema + Hambúrguer) */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
                className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu de navegação'}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-transform duration-200 active:scale-95"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Gaveta Mobile com Blur */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-out bg-[#fafaf9]/95 dark:bg-[#090d16]/95 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 ${
            mobileMenuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0 border-b-0'
          }`}
        >
          <div className="px-4 pt-3 pb-6 space-y-2">
            <a
              href="#recursos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70"
            >
              Recursos
            </a>
            <a
              href="#plataformas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70"
            >
              Plataformas
            </a>
            <a
              href="#fluxo"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70"
            >
              Como funciona
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70"
            >
              Dúvidas frequentes
            </a>
            <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-center rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Entrar
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-center rounded-xl bg-brand-600 text-white text-sm font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
              >
                Abrir Painel
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Seção Hero Minimalista */}
      <section className="relative pt-36 sm:pt-48 pb-28 sm:pb-36 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1
            data-hero-reveal
            className="text-[clamp(2.4rem,5.4vw,4.5rem)] font-bold text-slate-950 dark:text-white leading-[1.06] tracking-[-0.035em] mb-6"
          >
            Um único envio para todas as suas redes sociais.
          </h1>

          <p
            data-hero-reveal
            className="text-[clamp(1.05rem,1.5vw,1.25rem)] text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto mb-10"
          >
            Publique e agende vídeos, fotos e stories no Instagram, YouTube, Facebook e TikTok direto do seu próprio servidor.
          </p>

          <div
            data-hero-reveal
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <Link
              href="/upload"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500 text-white rounded-xl text-base font-semibold transition-all duration-300 hover:scale-105 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28),0_12px_24px_-8px_rgba(15,23,42,0.28)] flex items-center justify-center gap-2.5"
            >
              Publicar agora
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-base font-semibold transition-all duration-300 hover:scale-105 border border-slate-200/90 dark:border-slate-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_12px_-4px_rgba(15,23,42,0.06)] flex items-center justify-center"
            >
              Acessar painel
            </Link>
          </div>

          {/* Pílulas minimalistas das redes com parallax sutil */}
          <div
            data-hero-reveal
            className="mt-16 sm:mt-20 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            {[
              { id: 'instagram', name: 'Instagram', speed: '-12' },
              { id: 'youtube', name: 'YouTube', speed: '10' },
              { id: 'facebook', name: 'Facebook', speed: '-8' },
              { id: 'tiktok', name: 'TikTok', speed: '14' },
            ].map((net) => (
              <div
                key={net.id}
                data-parallax-speed={net.speed}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.07)]"
              >
                <PlatformIcon platform={net.id} size="sm" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                  {net.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção de Recursos — Arquitetura Minimalista */}
      <section id="recursos" className="py-20 sm:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-gsap-title className="max-w-3xl mb-14 sm:mb-16">
            <h2 className="text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold text-slate-950 dark:text-white tracking-[-0.025em] leading-tight mb-4">
              Construído para eliminar o trabalho repetitivo de postar rede por rede.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Tudo o que você precisa para preparar, agendar e distribuir vídeos verticais, carrosséis e stories em uma interface direta e silenciosa.
            </p>
          </div>

          <div data-gsap-group className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WORKFLOW_CARDS.map((card) => (
              <article
                key={card.title}
                data-gsap-card
                className="group p-6 sm:p-7 rounded-2xl bg-[#fafaf9] dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between shadow-[0_8px_24px_-12px_rgba(15,23,42,0.06)]"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-brand-600/20 text-white dark:text-brand-300 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105">
                    <card.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2.5 tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/70 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.detail}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Seção de Plataformas Suportadas */}
      <section id="plataformas" className="py-20 sm:py-28 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div data-gsap-title className="lg:col-span-5 space-y-4">
              <h2 className="text-[clamp(1.75rem,3.2vw,2.6rem)] font-bold text-slate-950 dark:text-white tracking-[-0.025em] leading-tight">
                Integração direta com as APIs oficiais de cada rede.
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Conecte suas contas via OAuth 2.0 uma única vez. O NexoPost cuida da renovação automática das sessões e do envio nos formatos exigidos por cada plataforma.
              </p>
              <div className="pt-2">
                <Link
                  href="/accounts"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500 text-white text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
                >
                  Gerenciar contas conectadas
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div data-gsap-group className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {PLATFORMS_LIST.map((plat) => (
                <div
                  key={plat.id}
                  data-gsap-card
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-4 shadow-[0_10px_28px_-14px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center justify-between">
                    <PlatformIcon platform={plat.id} size="md" />
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {plat.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-950 dark:text-white mb-1">{plat.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {plat.capabilities}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seção Como Funciona (Fluxo Operacional) */}
      <section id="fluxo" className="py-20 sm:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-gsap-title className="max-w-2xl mb-14">
            <h2 className="text-[clamp(1.75rem,3.2vw,2.6rem)] font-bold text-slate-950 dark:text-white tracking-[-0.025em] leading-tight mb-3">
              Do arquivo bruto à publicação em três etapas.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Fluxo desenhado para criadores, gestores de tráfego e agências que precisam de previsibilidade.
            </p>
          </div>

          <div data-gsap-group className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: 'Etapa 1',
                title: 'Conecte os perfis do cliente',
                description:
                  'Autorize páginas do Facebook, perfis profissionais do Instagram, canais do YouTube e contas do TikTok com um clique.',
                actionLabel: 'Ir para Contas',
                actionHref: '/accounts',
              },
              {
                step: 'Etapa 2',
                title: 'Prepare ou converta a mídia',
                description:
                  'Envie vídeos ou fotos no Estúdio de Upload ou use o processador FFmpeg para ajustar proporção 9:16 e compressão.',
                actionLabel: 'Abrir Estúdio FFmpeg',
                actionHref: '/ai-shorts',
              },
              {
                step: 'Etapa 3',
                title: 'Publique ou agende na fila',
                description:
                  'Dispare imediatamente para todas as redes marcadas ou escolha uma data e horário no calendário para envio automático.',
                actionLabel: 'Ver Calendário',
                actionHref: '/schedule',
              },
            ].map((item) => (
              <div
                key={item.step}
                data-gsap-card
                className="p-6 sm:p-7 rounded-2xl bg-[#fafaf9] dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block text-xs font-semibold text-brand-600 dark:text-brand-400 mb-3">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2.5">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {item.actionLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção FAQ com Accordion Funcional */}
      <section id="faq" className="py-20 sm:py-28 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-gsap-title className="mb-12">
            <h2 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold text-slate-950 dark:text-white tracking-[-0.025em] leading-tight mb-3">
              Perguntas frequentes sobre o NexoPost.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Tire suas dúvidas sobre operação local, segurança das contas e deploy em VPS.
            </p>
          </div>

          <div data-gsap-group className="space-y-3">
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.question}
                  data-gsap-card
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-slate-900 dark:text-white hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-sm sm:text-base">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 pt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/70">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Chamada Final (CTA) */}
      <section className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            data-gsap-title
            className="rounded-3xl bg-slate-900 dark:bg-slate-900 border border-slate-800 p-8 sm:p-14 lg:p-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.3)]"
          >
            <div className="max-w-2xl space-y-3">
              <h2 className="text-[clamp(1.65rem,3vw,2.4rem)] font-bold text-white tracking-[-0.025em] leading-tight">
                Pronto para publicar seu próximo vídeo em todas as redes?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Acesse seu painel NexoPost, selecione o cliente ativo e envie vídeos, fotos ou stories com agendamento automático.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full lg:w-auto shrink-0">
              <Link
                href="/upload"
                className="px-7 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 hover:scale-105 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] flex items-center justify-center gap-2"
              >
                Novo Upload
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/settings"
                className="px-7 py-4 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 hover:scale-105 border border-white/15 flex items-center justify-center gap-2"
              >
                Ver API & Servidor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé Minimalista */}
      <footer className="py-12 border-t border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo layout="horizontal" size="sm" />
            <span>· Plataforma própria de distribuição social</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Painel
            </Link>
            <Link href="/upload" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Publicar
            </Link>
            <Link href="/schedule" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Agendamentos
            </Link>
            <Link href="/accounts" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Contas
            </Link>
            <Link href="/settings" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Configurações
            </Link>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante Fixo do WhatsApp com Pulso Sutil e Tooltip de Boas-Vindas */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3">
        {showWhatsappTooltip && (
          <div className="hidden sm:flex items-center gap-2.5 pl-4 pr-2.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-[0_12px_30px_-8px_rgba(15,23,42,0.18)]">
            <span>Olá! Precisa de suporte com o NexoPost?</span>
            <button
              type="button"
              onClick={() => setShowWhatsappTooltip(false)}
              aria-label="Fechar mensagem de boas-vindas"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <a
          href="https://wa.me/5500000000000?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20NexoPost."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          title="Falar com suporte no WhatsApp"
          className="whatsapp-pulse group relative w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7"
            aria-hidden="true"
          >
            <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01Zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29Z" />
          </svg>
        </a>
      </div>
    </div>
  );
}