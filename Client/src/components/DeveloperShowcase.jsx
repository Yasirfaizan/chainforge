import { useState } from "react";
import devImage from "../assets/1.jpg";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Github, Linkedin, Mail, MapPin, Briefcase, GraduationCap, Code2, Globe, ArrowUpRight } from "lucide-react";

const sectionReveal = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const DEVELOPER = {
  name: "Yasir Faizan",
  title: "Full-Stack Web Developer & Web3 Engineer",
  location: "Pakistan",
  bio: "Passionate web developer specializing in building exceptional digital experiences. Focused on creating accessible, human-centered products with modern web technologies and blockchain infrastructure. Creator of ChainForge — the Firebase of Web3.",
  portfolio: "https://yasirfaizan.vercel.app",
  socials: [
    { label: "GitHub", href: "https://github.com/Yasirfaizan", Icon: Github },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/yasir-faizan-shalmani/", Icon: Linkedin },
    { label: "Email", href: "mailto:yasirfaizan680@gmail.com", Icon: Mail },
    { label: "Portfolio", href: "https://yasirfaizan.vercel.app", Icon: Globe },
  ],
  skills: {
    "Frontend": ["React", "Next.js", "JavaScript", "TypeScript", "Tailwind CSS", "Framer Motion", "HTML5", "CSS3"],
    "Backend": ["Node.js", "Express", "MongoDB", "REST APIs", "Firebase"],
    "Web3": ["Web3.js", "Ethers.js", "Solidity", "Smart Contracts", "DeFi"],
    "Tools": ["Git", "Vite", "Figma", "VS Code", "Docker"],
  },
  projects: [
    {
      name: "ChainForge",
      description: "The Firebase of Web3 — Multi-chain developer infrastructure with wallet auth, API management, and analytics dashboard.",
      tech: ["React", "Node.js", "MongoDB", "Web3.js", "Ethers.js"],
      color: "#7c3aed",
      icon: "⛓️",
    },
    {
      name: "DeFi Dashboard",
      description: "Real-time decentralized finance tracking dashboard with portfolio analytics across multiple chains.",
      tech: ["Next.js", "TypeScript", "Recharts", "Web3"],
      color: "#10b981",
      icon: "📊",
    },
    {
      name: "NFT Marketplace",
      description: "Full-stack NFT marketplace with minting, trading, and auction functionality on Ethereum and Polygon.",
      tech: ["React", "Solidity", "IPFS", "Ethers.js"],
      color: "#f59e0b",
      icon: "🎨",
    },
    {
      name: "Web3 Auth SDK",
      description: "Open-source authentication SDK for Web3 apps — wallet connect, JWT generation, and user identity mapping.",
      tech: ["TypeScript", "Node.js", "JWT", "MetaMask"],
      color: "#3b82f6",
      icon: "🔐",
    },
  ],
  experience: [
    {
      role: "Full-Stack Web Developer",
      company: "Freelance / Independent",
      period: "2023 – Present",
      description: "Building end-to-end web applications and Web3 infrastructure projects for clients worldwide.",
    },
    {
      role: "Web3 Developer",
      company: "ChainForge",
      period: "2024 – Present",
      description: "Architecting multi-chain developer tools — wallet auth, API management, and real-time blockchain analytics.",
    },
  ],
};

function SkillCategory({ category, skills }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-accent-indigo)] mb-3">{category}</p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <motion.span
            key={skill}
            whileHover={{ scale: 1.08, y: -2 }}
            className="dev-skill-chip"
          >
            {skill}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={staggerItem}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="dev-project-card group"
      style={{ "--project-color": project.color }}
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(400px circle at 50% 50%, ${project.color}15, transparent 70%)`,
        }}
      />

      {/* Top accent line */}
      <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${project.color}, transparent)` }} />

      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <motion.span
            animate={hovered ? { rotate: [0, -10, 10, 0], scale: 1.15 } : {}}
            transition={{ duration: 0.5 }}
            className="text-3xl"
          >
            {project.icon}
          </motion.span>
          <motion.div
            animate={hovered ? { x: 3, y: -3 } : { x: 0, y: 0 }}
            className="p-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-elevated)] text-[var(--brand-muted)] group-hover:text-[var(--brand-text)] group-hover:border-[var(--brand-accent-indigo)]/40 transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
          </motion.div>
        </div>

        <h4 className="text-lg font-bold text-[var(--brand-text)] mb-2">{project.name}</h4>
        <p className="text-sm text-[var(--brand-muted)] leading-relaxed mb-4">{project.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {project.tech.map((t) => (
            <span
              key={t}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium border border-[var(--brand-border)] text-[var(--brand-muted)] bg-[var(--brand-base)]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ExperienceItem({ exp, index }) {
  return (
    <motion.div variants={staggerItem} className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-[var(--brand-accent-indigo)]/40 to-transparent last:hidden" />
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full border-2 border-[var(--brand-accent-indigo)] bg-[var(--brand-surface)] flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-[var(--brand-accent-indigo)]" />
      </div>

      <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 hover:border-[var(--brand-accent-indigo)]/30 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
          <h4 className="text-sm font-bold text-[var(--brand-text)]">{exp.role}</h4>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--brand-accent-indigo)]">{exp.period}</span>
        </div>
        <p className="text-xs font-semibold text-[var(--brand-muted)] mb-2">{exp.company}</p>
        <p className="text-xs text-[var(--brand-muted)] leading-relaxed">{exp.description}</p>
      </div>
    </motion.div>
  );
}

export default function DeveloperShowcase() {
  const [activeTab, setActiveTab] = useState("projects");

  const tabs = [
    { id: "projects", label: "Projects", icon: Code2 },
    { id: "skills", label: "Tech Stack", icon: Globe },
    { id: "experience", label: "Experience", icon: Briefcase },
  ];

  return (
    <>
      {/* ═══════════════ PORTFOLIO CTA BAR ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-7xl px-6 pb-8"
      >
        <a
          href={DEVELOPER.portfolio}
          target="_blank"
          rel="noopener noreferrer"
          className="dev-portfolio-bar group block"
        >
          <div className="dev-portfolio-bar-inner">
            {/* Animated background orbs */}
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[var(--brand-accent-indigo)]/20 blur-[60px] group-hover:bg-[var(--brand-accent-indigo)]/35 transition-colors duration-700" />
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-[var(--brand-accent-emerald)]/15 blur-[60px] group-hover:bg-[var(--brand-accent-emerald)]/30 transition-colors duration-700" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-4">
                {/* Animated avatar */}
                <motion.div
                  whileHover={{ rotate: 5 }}
                  className="relative shrink-0"
                >
                  <div className="gradient-border rounded-full p-[2px]">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] flex items-center justify-center text-white text-lg font-black shadow-lg">
                      YF
                    </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-[var(--brand-surface)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </motion.div>

                <div className="text-center sm:text-left">
                  <p className="text-sm font-bold text-[var(--brand-text)]">
                    Explore Full Portfolio
                  </p>
                  <p className="text-xs text-[var(--brand-muted)]">
                    yasirfaizan.vercel.app — Projects, experience & more
                  </p>
                </div>
              </div>

              <motion.div
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold dev-portfolio-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Visit Portfolio</span>
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.div>
            </div>
          </div>
        </a>
      </motion.div>

      {/* ═══════════════ DEVELOPER SECTION ═══════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionReveal}
        className="mx-auto max-w-6xl px-6 pb-24"
        id="developers"
      >
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-accent-indigo)] mb-3"
          >
            Meet the Developer
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight text-[var(--brand-text)] md:text-4xl"
          >
            Built by{" "}
            <span className="bg-gradient-to-r from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] bg-clip-text text-transparent">
              {DEVELOPER.name}
            </span>
          </motion.h2>
        </div>

        {/* Developer Card */}
        <div className="dev-card-main">
          {/* Background glows */}
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[var(--brand-accent-indigo)]/8 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[var(--brand-accent-emerald)]/8 blur-[100px] pointer-events-none" />

          {/* Profile Header */}
          <div className="relative flex flex-col md:flex-row gap-8 items-center md:items-start p-8 md:p-10">
            {/* Avatar */}
            <motion.div whileHover={{ scale: 1.05, rotate: 3 }} transition={{ type: "spring", stiffness: 300 }} className="shrink-0">
              <div className="relative">
                <div className="gradient-border rounded-full p-[3px]">
                  <div className="h-28 w-28 md:h-32 md:w-32 rounded-full overflow-hidden border-2 border-[var(--brand-surface)] shadow-2xl">
                    <img 
                      src={devImage} 
                      alt="Yasir Faizan" 
                      className="h-full w-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                    />
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 ring-4 ring-[var(--brand-surface)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-[var(--brand-text)]">{DEVELOPER.name}</h3>
              <p className="text-sm text-[var(--brand-accent-indigo)] font-semibold mt-1">{DEVELOPER.title}</p>
              <div className="flex items-center gap-1.5 justify-center md:justify-start mt-2">
                <MapPin className="h-3 w-3 text-[var(--brand-muted)]" />
                <span className="text-xs text-[var(--brand-muted)]">{DEVELOPER.location}</span>
              </div>
              <p className="mt-4 text-sm text-[var(--brand-muted)] leading-relaxed max-w-xl">
                {DEVELOPER.bio}
              </p>

              {/* Social Links */}
              <div className="mt-5 flex flex-wrap gap-2.5 justify-center md:justify-start">
                {DEVELOPER.socials.map((s) => (
                  <motion.a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="dev-social-link"
                  >
                    <s.Icon className="h-4 w-4" />
                    <span>{s.label}</span>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t border-[var(--brand-border)]">
            <div className="flex overflow-x-auto px-6 md:px-10 gap-1 scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`dev-tab ${activeTab === tab.id ? "dev-tab-active" : ""}`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="devTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--brand-accent-indigo)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-10">
            <AnimatePresence mode="wait">
              {activeTab === "projects" && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {DEVELOPER.projects.map((project, i) => (
                      <ProjectCard key={project.name} project={project} index={i} />
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {activeTab === "skills" && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-8"
                >
                  {Object.entries(DEVELOPER.skills).map(([category, skills]) => (
                    <SkillCategory key={category} category={category} skills={skills} />
                  ))}
                </motion.div>
              )}

              {activeTab === "experience" && (
                <motion.div
                  key="experience"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                  >
                    {DEVELOPER.experience.map((exp, i) => (
                      <ExperienceItem key={i} exp={exp} index={i} />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>
    </>
  );
}
