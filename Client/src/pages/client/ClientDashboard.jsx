import React from "react";
import { Link } from "react-router-dom";
import { CHAINS } from "../../constants/chains.js";

export default function ClientDashboard() {
  return (
    <>
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Chain Switcher Bar */}
        <div className="mb-10">
          <div className="flex gap-2 p-1.5 bg-surface-container-low rounded-xl inline-flex border border-outline-variant/20">
            {CHAINS.map((chain, index) => (
              <button
                key={chain.id}
                className={`px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${
                  index === 0
                    ? "bg-primary-container text-white shadow-lg shadow-primary-container/20"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        {/* Top Bento Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          {/* Wallet Info Card */}
          <div className="md:col-span-4 glass-card p-8 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all duration-700"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="bg-surface-container-highest p-3 rounded-xl shadow-inner">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    account_balance_wallet
                  </span>
                </div>
                <span className="badge-success px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>{" "}
                  Connected
                </span>
              </div>
              <p className="text-on-surface-variant text-xs font-bold tracking-widest uppercase mb-1">
                Total Balance
              </p>
              <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-6">
                14.829 <span className="text-primary/70">ETH</span>
              </h2>
              <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface-variant">
                  0x71C7656EC7ab88b098defB751B7401B5f6d84f92
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-primary">
                  content_copy
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Row (3 cards) */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/20 flex flex-col justify-between hover:border-primary/30 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
                  Total Transactions
                </span>
                <span className="material-symbols-outlined text-primary text-lg">
                  sync
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight mb-1 text-on-surface">
                  1,284
                </h3>
                <p className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-xs">
                    trending_up
                  </span>{" "}
                  +12.4%
                </p>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/20 flex flex-col justify-between hover:border-primary/30 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
                  API Calls (24h)
                </span>
                <span className="material-symbols-outlined text-primary text-lg">
                  api
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight mb-1 text-on-surface">
                  42.8k
                </h3>
                <p className="text-on-surface-variant text-xs font-medium">
                  Within quota
                </p>
              </div>
            </div>
            <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/20 flex flex-col justify-between hover:border-primary/30 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
                  Active Sessions
                </span>
                <span className="material-symbols-outlined text-primary text-lg">
                  sensors
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight mb-1 text-on-surface">
                  8
                </h3>
                <p className="text-on-surface-variant text-xs font-medium">
                  4 unique devices
                </p>
              </div>
            </div>

            {/* API Quick Start Card */}
            <div className="sm:col-span-3 bg-surface-container border border-outline-variant/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <h4 className="text-xl font-bold mb-2 text-on-surface">
                    API Quick Start
                  </h4>
                  <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                    Initialize the ChainForge SDK to start querying real-time
                    multi-chain data. Built for speed and reliability.
                  </p>
                  <div className="flex gap-4">
                    <button className="bg-primary-container text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95">
                      Copy SDK Key
                    </button>
                    <Link
                      to="/docs"
                      className="flex items-center gap-2 text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4"
                    >
                      <span className="material-symbols-outlined text-lg">
                        description
                      </span>{" "}
                      Full Docs
                    </Link>
                  </div>
                </div>
                <div className="w-full md:w-1/2 code-block rounded-xl border p-4 font-mono text-sm leading-relaxed overflow-hidden">
                  <div className="flex gap-1.5 mb-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--code-dots-red)" }}
                    ></div>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--code-dots-amber)" }}
                    ></div>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--code-dots-green)" }}
                    ></div>
                  </div>
                  <p>
                    <span className="text-purple-400">import</span>{" "}
                    <span className="text-gray-300">
                      {"{"} ChainForge {"}"}
                    </span>{" "}
                    <span className="text-purple-400">from</span>{" "}
                    <span className="text-green-400">'@chainforge/sdk'</span>;
                  </p>
                  <p className="text-gray-300 mt-2">
                    <span className="text-purple-400">const</span> forge ={" "}
                    <span className="text-blue-400">new</span> ChainForge({"{"}
                  </p>
                  <p className="text-gray-300 ml-4">
                    apiKey:{" "}
                    <span className="text-green-400">'cf_live_82x...92a'</span>,
                  </p>
                  <p className="text-gray-300 ml-4">
                    network:{" "}
                    <span className="text-green-400">'ethereum-mainnet'</span>
                  </p>
                  <p className="text-gray-300">{"}"});</p>
                  <p className="text-gray-300 mt-2">
                    <span className="text-purple-400">await</span>{" "}
                    forge.connect();
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/20 overflow-hidden shadow-lg">
          <div className="px-8 py-6 border-b border-outline-variant/20 flex justify-between items-center">
            <h3 className="text-lg font-bold tracking-tight text-on-surface">
              Recent Transactions
            </h3>
            <button className="text-xs font-bold tracking-widest uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
              View All{" "}
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-4 text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                    Tx Hash
                  </th>
                  <th className="px-8 py-4 text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                    From
                  </th>
                  <th className="px-8 py-4 text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                    To
                  </th>
                  <th className="px-8 py-4 text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                    Amount
                  </th>
                  <th className="px-8 py-4 text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                    Chain
                  </th>
                  <th className="px-8 py-4 text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {[
                  {
                    hash: "0x9a2...f3b1",
                    from: "0x71C7...f92",
                    to: "0x4a9d...2e1",
                    amount: "1.45 ETH",
                    chain: "Ethereum",
                    status: "Success",
                  },
                  {
                    hash: "0x4c1...d9e2",
                    from: "0x71C7...f92",
                    to: "0x8b22...c44",
                    amount: "0.22 ETH",
                    chain: "Ethereum",
                    status: "Success",
                  },
                  {
                    hash: "0xbb5...e12a",
                    from: "0x332a...110",
                    to: "0x71C7...f92",
                    amount: "12.00 ETH",
                    chain: "Ethereum",
                    status: "Pending",
                  },
                  {
                    hash: "0x112...cc90",
                    from: "0x71C7...f92",
                    to: "0x0000...dead",
                    amount: "0.05 ETH",
                    chain: "Ethereum",
                    status: "Failed",
                  },
                ].map((tx) => (
                  <tr
                    key={tx.hash}
                    className="hover:bg-surface-container-high transition-colors"
                  >
                    <td className="px-8 py-5">
                      <span className="font-mono text-xs text-primary font-bold">
                        {tx.hash}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-on-surface-variant">
                      {tx.from}
                    </td>
                    <td className="px-8 py-5 text-sm text-on-surface-variant">
                      {tx.to}
                    </td>
                    <td className="px-8 py-5">
                      <span className="font-bold text-on-surface">
                        {tx.amount}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-xs text-on-surface-variant">
                          {tx.chain}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-md ${
                          tx.status === "Success"
                            ? "badge-success"
                            : tx.status === "Pending"
                              ? "badge-warning"
                              : "badge-error"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 footer-bg border-t border-outline-variant/20 mt-20">
        <div className="grid grid-cols-4 gap-8 px-12 max-w-7xl mx-auto">
          <div>
            <span className="text-lg font-black text-on-surface block mb-4">
              ⛓️ ChainForge
            </span>
            <p className="font-sans text-sm leading-relaxed text-on-surface-variant">
              The Firebase of Web3. Professional multi-chain infrastructure for
              developers.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-on-surface mb-4 text-sm">Platform</h5>
            <ul className="space-y-2">
              <li>
                <a
                  className="text-on-surface-variant hover:text-primary transition-colors text-sm"
                  href="#"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  className="text-on-surface-variant hover:text-primary transition-colors text-sm"
                  href="#"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  className="text-on-surface-variant hover:text-primary transition-colors text-sm"
                  href="#"
                >
                  Status
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-on-surface mb-4 text-sm">
              Community
            </h5>
            <ul className="space-y-2">
              <li>
                <a
                  className="text-on-surface-variant hover:text-primary transition-colors text-sm"
                  href="#"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  className="text-on-surface-variant hover:text-primary transition-colors text-sm"
                  href="#"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  className="text-on-surface-variant hover:text-primary transition-colors text-sm"
                  href="#"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-on-surface mb-4 text-sm">System</h5>
            <p className="text-on-surface-variant text-sm mb-4">
              © 2026 ChainForge. All rights reserved.
            </p>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-primary">
                <span>Server Latency</span>
                <span>12ms</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2">
                <div className="bg-primary w-[92%] h-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
