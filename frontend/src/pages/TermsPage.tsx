import React from 'react';
import { FileText, Swords, AlertTriangle, Copyright, XCircle, ShieldAlert } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-[#3e3e3e] pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#ffffff0a] text-emerald-400 border border-[#3e3e3e]">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
        </div>
        <p className="text-sm text-[#eff1f680]">
          Last Updated: June 11, 2026
        </p>
      </div>

      {/* Intro */}
      <p className="text-base text-[#eff1f6bf] leading-relaxed">
        Welcome to bugX. By accessing our educational sandboxes, problem playgrounds, submission portals, and Code Battle lobbies, you agree to be bound by these Terms of Service. If you do not agree, please do not create an account or submit code scripts on the platform.
      </p>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* 1. Purpose & Usage */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            1. Platform Usage &amp; Education
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            bugX is designed as an interactive educational hub for algorithms, competitive coding practice, and skill tracking. Users are granted a revocable, non-transferable, personal license to browse seeded problems, input solution drafts, and compile programs within our evaluation sandboxes for self-training and competitive battles.
          </p>
        </section>

        {/* 2. User Responsibilities */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            2. Developer Conduct &amp; Responsibilities
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            By creating an account, you represent that you will maintain account security and comply with academic honesty principles. You are fully responsible for all activity occurring under your username.
          </p>
        </section>

        {/* 3. Prohibited Activities & Sandbox Abuse */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            3. Prohibited Sandbox Conduct
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            We evaluate your code inside isolated secure runtimes. Attempting to compromise this environment is strictly prohibited. You agree NOT to upload, submit, or execute code designed to:
          </p>
          <ul className="text-sm text-[#eff1f680] list-disc list-inside space-y-2 pl-2">
            <li>Escape the container boundary or access the host runner filesystem.</li>
            <li>Initiate unauthorized outbound network sockets from the compiler.</li>
            <li>Exhaust platform memory or CPU cores (e.g. fork bombs, infinite sleep threads).</li>
            <li>Bypass rate limits, scrape test suites, or interfere with database query queues.</li>
            <li>Distribute spam, offensive scripts, or malicious binaries in public Code Battle chats.</li>
          </ul>
        </section>

        {/* 4. Code Ownership & Intellectual Property */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Copyright className="w-5 h-5 text-teal-400" />
            4. Submission Ownership &amp; Licensing
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            You retain full copyright and ownership of the original code scripts you write and submit on bugX. However, by uploading code to our testing database, you grant bugX a non-exclusive, sub-licensable, royalty-free, worldwide license to:
          </p>
          <ul className="text-sm text-[#eff1f680] list-disc list-inside space-y-2 pl-2">
            <li>Compile, run, and evaluate the script on sandbox servers to determine test output validity.</li>
            <li>Save execution history and runtimes to determine stats, milestones, and rankings.</li>
            <li>Anonymize and aggregate code submissions for leaderboard comparisons and performance analysis.</li>
          </ul>
        </section>

        {/* 5. Contest & Arena Fairness Rules */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            5. Competition &amp; Battle Integrity
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            To preserve sportsmanship, leaderboards and Code Battles are actively audited. Plagiarism (copying code directly from other participants or AI utilities during contests) is prohibited. We reserve the right to remove points, drop streaks, or disqualify profiles that violate tournament standards or attempt multi-accounting loops to artificially boost scoreboards.
          </p>
        </section>

        {/* 6. Account Termination */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <XCircle className="w-5 h-5 text-purple-400" />
            6. Account Termination
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            We reserve the right, without warning and in our sole discretion, to disable or delete developer accounts that are found executing security bypasses, attempting code attacks, scripting automated API exploits, or violating competitor terms.
          </p>
        </section>

        {/* 7. Limitation of Liability */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            7. Limitation of Liability
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            bugX and its services are provided <strong className="text-white">"as is"</strong> without guarantees of uptime, compile-result consistency, or contest rank persistence. We shall not be held liable for script data loss, compiler delays, rank resets, or sandbox execution errors. Use the testing environment at your own risk.
          </p>
        </section>
      </div>
    </div>
  );
};
