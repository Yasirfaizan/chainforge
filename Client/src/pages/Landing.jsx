import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <>
<main className="relative overflow-hidden">
{/* Background Elements */}
<div className="fixed inset-0 dot-grid -z-20 pointer-events-none"></div>
<div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-primary-container rounded-full glow-blob"></div>
<div className="absolute bottom-[20%] right-[10%] w-[600px] h-[600px] bg-secondary-container rounded-full glow-blob"></div>

{/* ═══════════════ HERO SECTION ═══════════════ */}
<section className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 text-center max-w-7xl mx-auto">
<div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-surface-container-low border border-outline-variant/30 mb-8">
<span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
<span className="text-xs font-label text-on-surface-variant tracking-wider uppercase">Live on 6 Chains — ETH · SOL · POLY · BNB · AVAX · ARB</span>
</div>

<p className="text-sm font-label uppercase tracking-[0.3em] text-primary mb-4 font-bold">⛓️ The Firebase of Web3</p>

<h1 className="text-5xl md:text-8xl font-headline font-extrabold tracking-tighter text-on-surface mb-6 leading-tight">
  Ship Multi-Chain<br/>
  <span className="text-gradient">dApps in Minutes.</span>
</h1>

<p className="max-w-2xl text-lg text-on-surface-variant mb-4 leading-relaxed">
  ChainForge collapses weeks of blockchain boilerplate — wallet auth, user identity mapping, and data indexing — into simple SDK calls. What Firebase did for mobile, we do for Web3.
</p>
<p className="max-w-xl text-sm text-outline mb-12">
  Built for the 27M+ developers ready to build decentralized apps without the decentralized headaches.
</p>

<div className="flex flex-col sm:flex-row items-center gap-6 mb-20">
<Link to="/client/signup">
  <button className="px-8 py-4 bg-gradient-to-r from-primary-container to-secondary-container text-white font-bold rounded-xl shadow-lg hover:shadow-primary-container/30 hover:scale-[1.02] transition-all active:scale-95">
    Start Building Free →
  </button>
</Link>
<Link to="/docs">
  <button className="px-8 py-4 ghost-border bg-surface-container/60 backdrop-blur text-on-surface font-bold rounded-xl hover:bg-surface-container transition-all active:scale-95">
    View Documentation
  </button>
</Link>
</div>

{/* Chain Pills */}
<div className="flex flex-wrap justify-center gap-3 mb-24">
{[
  { name: 'ETH', color: '#627EEA' },
  { name: 'SOL', color: '#14F195' },
  { name: 'POLY', color: '#8247E5' },
  { name: 'BNB', color: '#F3BA2F' },
  { name: 'AVAX', color: '#E84142' },
  { name: 'ARB', color: '#28A0F0' },
].map((chain) => (
  <div key={chain.name} className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/20">
    <span className="w-2 h-2 rounded-full" style={{ background: chain.color }}></span>
    <span className="text-sm font-medium text-on-surface">{chain.name}</span>
  </div>
))}
</div>

{/* Code Card — theme-aware */}
<div className="w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-2xl code-block border text-left">
<div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--code-border)', background: 'var(--code-border)' }}>
<div className="flex gap-1.5">
  <div className="w-3 h-3 rounded-full" style={{ background: 'var(--code-dots-red)' }}></div>
  <div className="w-3 h-3 rounded-full" style={{ background: 'var(--code-dots-amber)' }}></div>
  <div className="w-3 h-3 rounded-full" style={{ background: 'var(--code-dots-green)' }}></div>
</div>
<span className="ml-4 text-xs font-label text-gray-400">chainforge-quickstart.js</span>
</div>
<div className="p-6 font-label text-sm leading-relaxed">
<div className="flex gap-4"><span className="text-gray-500 select-none w-4 text-right">1</span><p><span className="text-purple-400">import</span> <span className="text-gray-300">{'{'} ForgeClient {'}'}</span> <span className="text-purple-400">from</span> <span className="text-emerald-400">'@chainforge/sdk'</span>;</p></div>
<div className="flex gap-4"><span className="text-gray-500 select-none w-4 text-right">2</span><p><span className="text-purple-400">const</span> <span className="text-gray-300">forge = </span><span className="text-purple-400">new</span> <span className="text-blue-400">ForgeClient</span>({'{'} <span className="text-emerald-400">chain: 'ethereum'</span> {'}'});</p></div>
<div className="flex gap-4"><span className="text-gray-500 select-none w-4 text-right">3</span><p><span className="text-purple-400">const</span> <span className="text-gray-300">user = </span><span className="text-purple-400">await</span> <span className="text-gray-300">forge.</span><span className="text-blue-400">authWithWallet</span>();</p></div>
<div className="flex gap-4"><span className="text-gray-500 select-none w-4 text-right">4</span><p className="text-gray-500">// JWT + user profile — one line. No boilerplate.</p></div>
<div className="flex gap-4"><span className="text-gray-500 select-none w-4 text-right">5</span><p><span className="text-gray-300">console.</span><span className="text-blue-400">log</span>(<span className="text-emerald-400">{"`User: ${user.name}, Chain: ${user.chain}`"}</span>);</p></div>
</div>
</div>
</section>

{/* ═══════════════ WHY WEB3 IS BROKEN ═══════════════ */}
<section className="py-24 px-6 max-w-5xl mx-auto">
<div className="text-center mb-16">
  <p className="text-xs font-label uppercase tracking-[0.25em] text-primary mb-3 font-bold">The Problem</p>
  <h2 className="text-4xl font-headline font-bold mb-4 text-on-surface">Web3 Development Is Broken</h2>
  <p className="text-on-surface-variant max-w-2xl mx-auto">Every dApp team rebuilds the same fragile infrastructure from scratch. The result? 90% of dev time is wasted on plumbing, not product.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{[
  { icon: 'person_off', title: 'No Standard User Model', desc: 'Wallets are anonymous hashes, not users. Every team hacks together their own identity layer — or skips it entirely.' },
  { icon: 'storage', title: 'Inaccessible On-Chain Data', desc: 'Reading blockchain data requires running nodes, custom indexers, and chain-specific SDKs. It\'s expensive and fragile.' },
  { icon: 'code_off', title: 'Weeks of Boilerplate', desc: 'Wallet connect, JWT auth, user mapping, API key systems, admin dashboards — all rebuilt from zero for every single project.' },
].map((item) => (
  <div key={item.title} className="p-8 rounded-2xl bg-surface-container border border-outline-variant/20 hover:border-error/30 transition-all">
    <span className="material-symbols-outlined text-error text-3xl mb-4 block">{item.icon}</span>
    <h3 className="text-lg font-bold text-on-surface mb-2">{item.title}</h3>
    <p className="text-sm text-on-surface-variant leading-relaxed">{item.desc}</p>
  </div>
))}
</div>
</section>

{/* ═══════════════ FEATURES GRID — ACTUAL PRODUCT ═══════════════ */}
<section className="py-32 px-6 max-w-7xl mx-auto">
<div className="mb-20 text-center">
  <p className="text-xs font-label uppercase tracking-[0.25em] text-primary mb-3 font-bold">The Solution</p>
  <h2 className="text-4xl font-headline font-bold mb-4 text-on-surface">Everything You Need. One SDK.</h2>
  <p className="text-on-surface-variant max-w-2xl mx-auto">ChainForge gives you production-grade infrastructure out of the box — so you can focus on building what actually makes your dApp unique.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
{[
  { icon: 'passkey', title: 'Auth as a Service', desc: 'Wallet-based login (EVM + Solana) that returns a standard JWT. One API call replaces weeks of auth code. Supports MetaMask, Phantom, WalletConnect, and more.', accent: 'text-violet-500 dark:text-violet-400' },
  { icon: 'fingerprint', title: 'Universal User Identity', desc: 'Maps on-chain wallet addresses to rich off-chain MongoDB profiles. Your users finally have names, emails, and preferences — not just hex strings.', accent: 'text-blue-500 dark:text-blue-400' },
  { icon: 'vpn_key', title: 'API Key Management', desc: 'Production-grade key system with cf_live_ prefixes, scoped permissions, rate limiting, and usage analytics — inspired by Stripe\'s gold standard.', accent: 'text-emerald-500 dark:text-emerald-400' },
  { icon: 'monitoring', title: 'Multi-Chain Analytics', desc: 'Unified dashboard tracking transactions across Ethereum, Solana, Polygon, BNB Chain, Avalanche, and Arbitrum. One view, six chains.', accent: 'text-amber-500 dark:text-amber-400' },
  { icon: 'admin_panel_settings', title: 'Admin Control Tower', desc: 'Full admin infrastructure for user management, transaction monitoring, platform health, and security — with restricted access and audit logging.', accent: 'text-red-500 dark:text-red-400' },
  { icon: 'rocket_launch', title: 'Ship in Minutes', desc: 'From npm install to production dApp in under 5 minutes. Pre-built React components, automatic chain detection, and zero-config deployment.', accent: 'text-pink-500 dark:text-pink-400' },
].map((feature) => (
  <div key={feature.title} className="p-8 rounded-2xl bg-surface-container border border-outline-variant/20 hover:border-primary/40 transition-all group">
    <span className={`material-symbols-outlined text-3xl mb-6 block ${feature.accent}`}>{feature.icon}</span>
    <h3 className="text-xl font-bold text-on-surface mb-3">{feature.title}</h3>
    <p className="text-sm text-on-surface-variant leading-relaxed">{feature.desc}</p>
  </div>
))}
</div>
</section>

{/* ═══════════════ HOW IT WORKS ═══════════════ */}
<section className="py-32 px-6 max-w-6xl mx-auto">
<div className="mb-20 text-center">
  <p className="text-xs font-label uppercase tracking-[0.25em] text-primary mb-3 font-bold">3-Step Onboarding</p>
  <h2 className="text-4xl font-headline font-bold mb-4 text-gradient">From Zero to Production</h2>
  <p className="text-on-surface-variant">Go from idea to deployed multi-chain dApp in three simple steps.</p>
</div>
<div className="relative flex flex-col md:flex-row gap-12 items-center justify-between">
{/* Connector line */}
<div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-container/30 to-transparent -translate-y-1/2 -z-10 border-t border-dashed border-primary-container/50"></div>
{[
  { step: '1', title: 'Connect Wallet', desc: 'Authenticate via MetaMask, Phantom, or any major Web3 wallet. Instant JWT — no backend setup needed.' },
  { step: '2', title: 'Select Your Chains', desc: 'Toggle on the networks you want. ETH, SOL, POLY, BNB, AVAX, ARB — mix and match with one click.' },
  { step: '3', title: 'Ship Everywhere', desc: 'Deploy with the unified SDK. Your dApp talks to all selected chains through one consistent API.' },
].map((item) => (
  <div key={item.step} className="flex flex-col items-center text-center max-w-xs bg-background p-6 rounded-2xl border border-outline-variant/20">
    <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary mb-6 shadow-xl shadow-primary/10">{item.step}</div>
    <h4 className="text-xl font-bold mb-3 text-on-surface">{item.title}</h4>
    <p className="text-sm text-on-surface-variant">{item.desc}</p>
  </div>
))}
</div>
</section>

{/* ═══════════════ CHAIN STATISTICS ═══════════════ */}
<section className="py-32 px-6 max-w-7xl mx-auto">
<div className="text-center mb-16">
  <h2 className="text-4xl font-headline font-bold mb-4 text-on-surface">Network Pulse</h2>
  <p className="text-on-surface-variant">Real-time transaction volume across all supported chains.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
{[
  { name: 'Ethereum', color: '#627EEA', txns: '12.4k' },
  { name: 'Solana', color: '#14F195', txns: '840.1k' },
  { name: 'Polygon', color: '#8247E5', txns: '245.8k' },
  { name: 'BNB Chain', color: '#F3BA2F', txns: '192.3k' },
  { name: 'Avalanche', color: '#E84142', txns: '64.2k' },
  { name: 'Arbitrum', color: '#28A0F0', txns: '118.5k' },
].map((chain) => (
  <div key={chain.name} className="p-6 rounded-xl bg-surface-container border border-outline-variant/20" style={{ borderTopWidth: '2px', borderTopColor: chain.color }}>
    <span className="text-xs font-label uppercase mb-4 block" style={{ color: chain.color }}>{chain.name}</span>
    <div className="text-2xl font-headline font-extrabold mb-1 text-on-surface">{chain.txns}</div>
    <div className="text-[10px] font-label text-on-surface-variant uppercase">Daily TXNs</div>
  </div>
))}
</div>
</section>

{/* ═══════════════ PRICING ═══════════════ */}
<section className="py-32 px-6 max-w-5xl mx-auto">
<div className="text-center mb-16">
  <h2 className="text-4xl font-headline font-bold mb-4 text-on-surface">Scalable Pricing</h2>
  <p className="text-on-surface-variant">Start free. Scale as your dApp grows.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
{/* Free */}
<div className="p-8 rounded-2xl bg-surface-container border border-outline-variant/20 flex flex-col">
  <h3 className="text-lg font-bold mb-2 text-on-surface">Free</h3>
  <div className="text-3xl font-extrabold mb-6 text-on-surface">$0 <span className="text-sm font-normal text-on-surface-variant">/mo</span></div>
  <ul className="space-y-4 mb-10 flex-grow">
    {['100k requests / mo', '3 chains included', 'Community support'].map((item) => (
      <li key={item} className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">check_circle</span>
        {item}
      </li>
    ))}
  </ul>
  <Link to="/client/signup"><button className="w-full py-3 border border-outline-variant/30 rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-high transition-all">Get Started</button></Link>
</div>
{/* Pro */}
<div className="p-8 rounded-2xl bg-surface-container-high border-2 border-primary-container/40 flex flex-col transform md:-translate-y-4 shadow-2xl shadow-primary/10 relative">
  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-container text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Most Popular</div>
  <h3 className="text-lg font-bold mb-2 text-on-surface">Pro</h3>
  <div className="text-3xl font-extrabold mb-6 text-on-surface">$79 <span className="text-sm font-normal text-on-surface-variant">/mo</span></div>
  <ul className="space-y-4 mb-10 flex-grow">
    {['Unlimited requests', 'All 12+ chains', 'Priority websocket channels', 'Dedicated account manager'].map((item) => (
      <li key={item} className="flex items-center gap-2 text-sm text-on-surface">
        <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
        {item}
      </li>
    ))}
  </ul>
  <button className="w-full py-3 bg-primary-container text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all">Go Pro</button>
</div>
{/* Enterprise */}
<div className="p-8 rounded-2xl bg-surface-container border border-outline-variant/20 flex flex-col">
  <h3 className="text-lg font-bold mb-2 text-on-surface">Enterprise</h3>
  <div className="text-3xl font-extrabold mb-6 text-on-surface">Custom</div>
  <ul className="space-y-4 mb-10 flex-grow">
    {['White-label infrastructure', 'SLA guarantees', 'Custom RPC endpoints'].map((item) => (
      <li key={item} className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-primary/60 text-lg">check_circle</span>
        {item}
      </li>
    ))}
  </ul>
  <button className="w-full py-3 border border-outline-variant/30 rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-high transition-all">Contact Sales</button>
</div>
</div>
</section>

{/* ═══════════════ CTA BANNER ═══════════════ */}
<section className="py-24 px-6">
<div className="max-w-5xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-primary-container/20 to-secondary-container/20 border border-outline-variant/20 text-center overflow-hidden relative">
  <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none dot-grid -z-10"></div>
  <h2 className="text-4xl font-headline font-extrabold mb-4 leading-tight text-on-surface">Ready to Build the Future of Web3?</h2>
  <p className="text-sm font-label text-primary mb-2 uppercase tracking-widest">Ship multi-chain dApps in minutes, not months.</p>
  <p className="text-on-surface-variant mb-10 max-w-xl mx-auto">Join 1,200+ teams building the next generation of decentralized applications on ChainForge.</p>
  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
    <Link to="/client/signup"><button className="px-10 py-4 cta-btn-primary font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95">Sign Up Now</button></Link>
    <button className="px-10 py-4 border border-outline-variant/40 text-on-surface font-bold rounded-xl hover:bg-surface-container transition-all">Book a Demo</button>
  </div>
</div>
</section>
</main>

{/* ═══════════════ FOOTER ═══════════════ */}
<footer className="w-full py-12 footer-bg border-t border-outline-variant/20">
<div className="grid grid-cols-4 gap-8 px-12 max-w-7xl mx-auto">
  <div className="col-span-4 md:col-span-1">
    <div className="text-lg font-black text-on-surface mb-4">⛓️ ChainForge</div>
    <p className="text-xs text-on-surface-variant font-sans leading-relaxed">The Firebase of Web3. Precision infrastructure for developers who refuse to compromise on quality.</p>
  </div>
  <div className="col-span-2 md:col-span-1">
    <h4 className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Product</h4>
    <div className="flex flex-col gap-4 text-sm font-sans">
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Features</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Chains</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Pricing</a>
    </div>
  </div>
  <div className="col-span-2 md:col-span-1">
    <h4 className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Legal</h4>
    <div className="flex flex-col gap-4 text-sm font-sans">
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Terms</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Status</a>
    </div>
  </div>
  <div className="col-span-4 md:col-span-1">
    <h4 className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Community</h4>
    <div className="flex flex-col gap-4 text-sm font-sans">
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Twitter</a>
      <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">GitHub</a>
    </div>
  </div>
  <div className="col-span-4 pt-12 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
    <p className="text-on-surface-variant text-xs">© 2026 ChainForge. All rights reserved.</p>
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-green-500"></span>
      <span className="text-[10px] font-label text-on-surface-variant uppercase tracking-tighter">All systems operational</span>
    </div>
  </div>
</div>
</footer>
    </>
  );
}
