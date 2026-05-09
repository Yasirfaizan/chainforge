import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import SoundToggle from './SoundToggle.jsx';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Ecosystem', path: '/#ecosystem' },
    { name: 'Developers', path: '/#developers' },
    { name: 'Documentation', path: '/docs' },
  ];

  return (
    <motion.div 
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-2 pointer-events-none"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <nav 
        className={`mx-auto max-w-7xl pointer-events-auto transition-all duration-300 rounded-2xl ${
          scrolled 
            ? 'bg-[var(--brand-surface)]/80 backdrop-blur-xl border border-[var(--brand-border)] shadow-xl shadow-black/5 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] py-3 px-6' 
            : 'bg-transparent border border-transparent py-4 px-6'
        }`}
      >
        <div className="flex justify-between items-center h-10 w-full">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.span 
            className="text-2xl"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            ⛓️
          </motion.span>
          <span className="text-xl font-extrabold tracking-tighter text-on-surface group-hover:text-primary transition-colors">ChainForge</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '') || (item.path.startsWith('#') && location.hash === item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`relative px-4 py-2 rounded-full font-sans text-sm font-medium tracking-tight transition-colors ${
                  isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 bg-primary/10 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <SoundToggle className="hidden sm:flex" />
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticated ? (
              <Link to={role === "admin" ? "/admin/dashboard" : "/dashboard"}>
                <button className="cf-pressable px-4 py-2 bg-[var(--brand-accent-indigo)] text-white font-sans text-sm font-medium tracking-tight hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all rounded-lg">
                  Dashboard
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <button className="px-4 py-2 font-sans text-sm font-medium tracking-tight text-on-surface-variant hover:text-on-surface transition-all duration-300">Login</button>
                </Link>
                <Link to="/signup">
                  <button className="cf-pressable px-4 py-2 bg-[var(--brand-accent-indigo)] text-white font-sans text-sm font-medium tracking-tight hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all rounded-lg">Sign up</button>
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="md:hidden bg-[var(--brand-elevated)] border border-[var(--brand-border)] rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="flex flex-col px-6 py-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '') || (item.path.startsWith('#') && location.hash === item.path);
                  return (
                    <Link 
                      key={item.name}
                      to={item.path} 
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
                <div className="h-[1px] bg-[var(--brand-border)] my-2"></div>
                {isAuthenticated ? (
                  <Link to={role === "admin" ? "/admin/dashboard" : "/dashboard"} onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full text-left font-bold text-sm text-[var(--brand-accent-indigo)]">Dashboard</button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <button className="w-full text-left font-medium text-sm text-[var(--brand-muted)] hover:text-[var(--brand-text)]">Login</button>
                    </Link>
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <button className="w-full text-left font-bold text-sm text-[var(--brand-accent-indigo)]">Sign up</button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.div>
  );
}
