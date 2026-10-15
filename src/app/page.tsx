'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Upload,
  BarChart3,
  Calendar,
  Users,
  Sparkles,
  Check,
  ArrowRight,
  Zap,
  Globe,
  Clock,
  Shield,
  Video,
  Image,
  FileText,
  Layers,
  MessageCircle,
  Eye,
  ChevronRight,
  Play,
} from 'lucide-react';

const features = [
  {
    icon: Video,
    title: 'Upload Videos',
    description: 'Post to TikTok, Instagram Reels, YouTube, Facebook and more from a single upload.',
    color: 'from-red-500 to-pink-500',
  },
  {
    icon: Image,
    title: 'Upload Photos',
    description: 'Share images across all platforms with automatic resizing and optimization.',
    color: 'from-pink-500 to-purple-500',
  },
  {
    icon: FileText,
    title: 'Upload Text',
    description: 'Post text updates, threads, and status updates to multiple platforms at once.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Calendar,
    title: 'Schedule Posts',
    description: 'Schedule your content for optimal engagement times up to 365 days in advance.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Layers,
    title: 'Queue System',
    description: 'Auto-schedule posts to your queue slots for consistent content publishing.',
    color: 'from-cyan-500 to-teal-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track performance across all platforms with unified analytics dashboard.',
    color: 'from-teal-500 to-green-500',
  },
  {
    icon: Eye,
    title: 'Audience Insights',
    description: 'Understand your followers demographics, active hours, and engagement patterns.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Users,
    title: 'Multi-Account',
    description: 'Manage multiple profiles and pages from one centralized dashboard.',
    color: 'from-emerald-500 to-lime-500',
  },
  {
    icon: Sparkles,
    title: 'AI Shorts',
    description: 'Generate viral titles, descriptions, and hashtags with AI analysis.',
    color: 'from-lime-500 to-yellow-500',
  },
  {
    icon: MessageCircle,
    title: 'AutoDM',
    description: 'Automatically send DMs to commenters on your Instagram posts.',
    color: 'from-yellow-500 to-orange-500',
  },
];

const platforms = [
  { name: 'TikTok', color: '#ff0050' },
  { name: 'Instagram', color: '#e4405f' },
  { name: 'YouTube', color: '#ff0000' },
  { name: 'Facebook', color: '#1877f2' },
  { name: 'LinkedIn', color: '#0a66c2' },
  { name: 'X (Twitter)', color: '#1da1f2' },
  { name: 'Threads', color: '#000000' },
  { name: 'Pinterest', color: '#e60023' },
  { name: 'Reddit', color: '#ff4500' },
  { name: 'Bluesky', color: '#0085ff' },
  { name: 'Discord', color: '#5865f2' },
  { name: 'Telegram', color: '#229ed9' },
];

const stats = [
  { value: '30,000+', label: 'Active Users' },
  { value: '22+', label: 'Platforms' },
  { value: '4.9/5', label: 'User Rating' },
  { value: '99.9%', label: 'Uptime' },
];

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">UploadPost</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                Features
              </Link>
              <Link href="#platforms" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                Platforms
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                Pricing
              </Link>
              <Link href="/settings" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                API
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 hero-grid opacity-30"
            style={{
              backgroundImage: 'linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/30 rounded-full text-sm font-medium text-brand-600 dark:text-brand-400 mb-8 animate-fade-in">
              <Zap className="w-4 h-4" />
              Upload once, publish everywhere
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-6 animate-slide-up">
              Upload Videos to<br />
              <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
                22+ Social Platforms
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
              Post to TikTok, Instagram, YouTube, Facebook, LinkedIn, X and more with a single API call. Save hours every week.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-base font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
              >
                Start Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-base font-semibold transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Open Dashboard
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-16 pt-16 border-t border-slate-200 dark:border-slate-800 animate-fade-in" style={{ animationDelay: '300ms' }}>
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to Go Viral
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Powerful features designed to streamline your social media workflow and maximize engagement.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-3 mb-5 shadow-lg`}>
                  <feature.icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section id="platforms" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Post to 22+ Platforms
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              One API, endless possibilities. Connect all your social accounts in minutes.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                <span className="font-medium text-slate-700 dark:text-slate-300">{platform.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 px-5 py-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800">
              <span className="font-medium text-brand-600 dark:text-brand-400">+10 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Connect Your Accounts',
                description: 'Link your social media accounts once. We handle all the OAuth flows securely.',
              },
              {
                step: '2',
                title: 'Create & Schedule',
                description: 'Upload your video, customize per-platform settings, and schedule for optimal times.',
              },
              {
                step: '3',
                title: 'Publish Everywhere',
                description: 'One click publishes to all selected platforms simultaneously with automatic formatting.',
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 mx-auto bg-brand-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-brand-500/25">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                {item.step !== '3' && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-brand-400 w-8 h-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-brand-600 to-purple-700 rounded-3xl p-8 sm:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Start Publishing Today
              </h2>
              <p className="text-lg text-brand-100 mb-8 max-w-2xl mx-auto">
                Join 30,000+ creators and businesses who save hours every week with UploadPost.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-brand-600 rounded-xl text-base font-semibold hover:bg-brand-50 transition-colors flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/settings"
                  className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl text-base font-semibold hover:bg-white/10 transition-colors"
                >
                  Ver API
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">UploadPost</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                The unified social media API for developers and businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="#features" className="hover:text-brand-600">Features</Link></li>
                <li><Link href="#platforms" className="hover:text-brand-600">Platforms</Link></li>
                <li><Link href="#pricing" className="hover:text-brand-600">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-brand-600">API Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/settings" className="hover:text-brand-600">API</Link></li>
                <li><Link href="/api-reference" className="hover:text-brand-600">API Reference</Link></li>
                <li><Link href="/sdks" className="hover:text-brand-600">SDKs</Link></li>
                <li><Link href="/blog" className="hover:text-brand-600">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/privacy" className="hover:text-brand-600">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-brand-600">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-brand-600">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
            © 2024 Upload-Post. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}