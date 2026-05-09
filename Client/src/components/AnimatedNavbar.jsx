import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle.jsx';

// Main Navbar - Only shows Client Portal, Admin accessible via URL only
export function AnimatedNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Ecosystem', href: '/', active: location.pathname === '/' },
    { name: 'Developers', href: '#', active: false },
    { name: 'Analytics', href: '#', active: false },
    { name: 'Documentation', href: '/docs', active: location.pathname === '/docs' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className={`sticky top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-lg dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]' 
          : 'bg-transparent'
      }`}
    >
      <div className="flex justify-between items-center h-16 px-6 max-w-7xl mx-auto">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link to="/" className="flex items-center gap-2 group">
            <motion.span 
              className="text-2xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              ⛓️
            </motion.span>
            <span className="text-xl font-extrabold tracking-tighter bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              ChainForge
            </span>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.name}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link 
                to={link.href}
                className={`relative px-4 py-2 font-sans text-sm font-medium tracking-tight transition-all duration-300 rounded-lg group ${
                  link.active 
                    ? 'text-primary' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                }`}
              >
                {link.name}
                {link.active && (
                  <motion.span
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Right Side - Only Client Portal, NO Admin button */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* Client Portal Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/login">
              <button className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white font-sans text-sm font-semibold tracking-tight rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 flex items-center gap-2">
                <span>Login</span>
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </button>
            </Link>
          </motion.div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-surface-container transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <motion.div
              animate={mobileMenuOpen ? "open" : "closed"}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface/95 backdrop-blur-xl border-b border-outline-variant/20"
          >
            <div className="px-6 py-4 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.href}
                    className={`block px-4 py-3 rounded-lg font-medium ${
                      link.active 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="pt-2 border-t border-outline-variant/20"
              >
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-xl">
                    Login / Sign Up
                  </button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// Client Dashboard Navbar - Different styling for logged-in clients
export function ClientNavbar({ user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`sticky top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-cf-card/90 backdrop-blur-xl border-b border-cf-border shadow-lg' 
          : 'bg-cf-card border-b border-cf-border'
      }`}
    >
      <div className="flex justify-between items-center h-16 px-6 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">⛓️</span>
          <span className="text-xl font-extrabold tracking-tighter text-cf-text">
            ChainForge
          </span>
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 text-xs font-bold rounded-full">
            CLIENT
          </span>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { name: 'Dashboard', href: '/dashboard' },
            { name: 'Wallets', href: '/wallets' },
            { name: 'Transactions', href: '/transactions' },
            { name: 'API Keys', href: '/api-keys' },
          ].map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="px-4 py-2 text-sm font-medium text-cf-muted hover:text-cf-text hover:bg-cf-input rounded-lg transition-all"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* User Menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-cf-border">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-cf-text">{user?.name || 'User'}</p>
              <p className="text-xs text-cf-muted">
                {user?.email || user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="p-2 text-cf-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// Admin Navbar - Completely different styling (red theme)
export function AdminNavbar({ user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`sticky top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-red-950/90 backdrop-blur-xl border-b border-red-800/50 shadow-lg' 
          : 'bg-gradient-to-r from-red-900 to-red-950 border-b border-red-800/50'
      }`}
    >
      <div className="flex justify-between items-center h-16 px-6 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">⛓️</span>
          <span className="text-xl font-extrabold tracking-tighter text-white">
            ChainForge
          </span>
          <span className="px-2 py-0.5 bg-red-500/30 text-red-300 text-xs font-bold rounded-full border border-red-500/50">
            ADMIN
          </span>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { name: 'Overview', href: '/admin/dashboard' },
            { name: 'Users', href: '/admin/users' },
            { name: 'Transactions', href: '/admin/transactions' },
            { name: 'Chain Stats', href: '/admin/chain-stats' },
          ].map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="px-4 py-2 text-sm font-medium text-red-200/70 hover:text-white hover:bg-red-800/50 rounded-lg transition-all"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Admin Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-medium text-red-300">Admin Access</span>
          </div>
          
          {/* Logout */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="p-2 text-red-200 hover:text-white hover:bg-red-800 rounded-lg transition-all"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}

export default AnimatedNavbar;
