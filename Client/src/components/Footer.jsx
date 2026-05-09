import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="w-full py-12 border-t border-[var(--brand-border)] bg-[var(--footer-bg)]">
      <div className="grid grid-cols-4 gap-8 px-12 max-w-7xl mx-auto">
        <div className="col-span-4 md:col-span-1">
          <div className="text-lg font-black text-[var(--brand-text)] mb-4 flex items-center gap-2">
            <span>⛓️</span> ChainForge
          </div>
          <p className="text-xs text-[var(--brand-muted)] font-sans leading-relaxed">
            The Firebase of Web3. Precision infrastructure for developers who refuse to compromise on quality.
          </p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h4 className="text-xs font-label uppercase tracking-widest text-[var(--brand-muted)] mb-6">Product</h4>
          <div className="flex flex-col gap-4 text-sm font-sans">
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">Features</a>
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">Chains</a>
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">Pricing</a>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h4 className="text-xs font-label uppercase tracking-widest text-[var(--brand-muted)] mb-6">Legal</h4>
          <div className="flex flex-col gap-4 text-sm font-sans">
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">Terms</a>
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">Privacy</a>
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">Status</a>
          </div>
        </div>
        <div className="col-span-4 md:col-span-1">
          <h4 className="text-xs font-label uppercase tracking-widest text-[var(--brand-muted)] mb-6">Community</h4>
          <div className="flex flex-col gap-4 text-sm font-sans">
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">Twitter</a>
            <a className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" href="#">GitHub</a>
            <Link className="text-[var(--brand-muted)] hover:text-[var(--brand-text)] transition-colors" to="/#developer">Developer</Link>
          </div>
        </div>
        <div className="col-span-4 pt-12 border-t border-[var(--brand-border)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[var(--brand-muted)] text-xs">© 2026 ChainForge. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-[10px] font-label text-[var(--brand-muted)] uppercase tracking-tighter">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
