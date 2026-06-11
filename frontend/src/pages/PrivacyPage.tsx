import React from 'react';
import { Shield, Mail, Eye, Key, Database, RefreshCw, UserCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-[#3e3e3e] pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#ffffff0a] text-blue-400 border border-[#3e3e3e]">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-sm text-[#eff1f680]">
          Last Updated: June 11, 2026
        </p>
      </div>

      {/* Intro */}
      <p className="text-base text-[#eff1f6bf] leading-relaxed">
        At bugX, we build tools and playgrounds to help developers refine their coding skills, run code battles, and track their performance. This Privacy Policy describes how we collect, use, and share your personal data when you create an account, compile submissions, participate in arenas, or interact with our services.
      </p>

      {/* Section List */}
      <div className="space-y-6">
        {/* 1. Information We Collect */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            1. Information We Collect
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            We collect information you provide directly to us, data generated during your coding sessions, and profile details retrieved from third-party social platforms when logging in.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-lg space-y-1.5">
              <span className="text-sm font-semibold text-white">Account Details</span>
              <ul className="text-xs text-[#eff1f680] list-disc list-inside space-y-1">
                <li>Username (unique coder profile ID)</li>
                <li>Email address (for authentication and support)</li>
                <li>Password hashes (for standard logins)</li>
              </ul>
            </div>
            <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-lg space-y-1.5">
              <span className="text-sm font-semibold text-white">OAuth Profile Info</span>
              <ul className="text-xs text-[#eff1f680] list-disc list-inside space-y-1">
                <li>Google account identifiers and avatar image</li>
                <li>GitHub user ID, avatar image, and repository handle</li>
                <li>LinkedIn profile credentials and basic metadata</li>
              </ul>
            </div>
            <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-lg space-y-1.5">
              <span className="text-sm font-semibold text-white">Coding Activity &amp; Submissions</span>
              <ul className="text-xs text-[#eff1f680] list-disc list-inside space-y-1">
                <li>Source code submissions uploaded for evaluation</li>
                <li>Coding language, runtime statistics, and compilation logs</li>
                <li>Problem status (Accepted, Wrong Answer, pending runs)</li>
              </ul>
            </div>
            <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-lg space-y-1.5">
              <span className="text-sm font-semibold text-white">Contest &amp; Gamification</span>
              <ul className="text-xs text-[#eff1f680] list-disc list-inside space-y-1">
                <li>Streak statistics (current and max consecutive days)</li>
                <li>Leaderboard rankings and scoreboards</li>
                <li>Code Battle participation history</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. Purpose of Collection */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            2. Purpose of Collection
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            We process your information to deliver high-performance code evaluation playgrounds, keep developer accounts secure, and power community leaderboards.
          </p>
          <ul className="text-sm text-[#eff1f680] list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-white">Account Isolation &amp; Auth:</strong> Creating and isolating user spaces, authenticating credentials, and managing OAuth linking.
            </li>
            <li>
              <strong className="text-white">Sandboxed Code Execution:</strong> Forwarding your script submissions to secure runner instances (Judge0/local executors) and returning performance data.
            </li>
            <li>
              <strong className="text-white">Gamification Services:</strong> Aggregating daily active dates to increment coding streaks, calculating problem points, and publishing public leaderboards.
            </li>
            <li>
              <strong className="text-white">Platform Protection:</strong> Enforcing API rate limits and preventing sandbox resource abuse.
            </li>
          </ul>
        </section>

        {/* 3. Authentication & Account Management */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            3. Authentication &amp; Security
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            All user sessions are secured using industry-standard JSON Web Tokens (JWT). When signing in via Google, GitHub, or LinkedIn, the provider issues a token which is securely exchanged by our backend. Passwords for direct account registrations are safely hashed using bcrypt before database storage.
          </p>
        </section>

        {/* 4. Analytics and Platform Improvements */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-teal-400" />
            4. Analytics &amp; Platform Performance
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            We collect basic client headers and network metadata to safeguard against DDoS attacks and analyze compilation latency. We do not sell developer profiles, code blocks, or usage statistics to marketing networks or data brokers.
          </p>
        </section>

        {/* 5. Data Retention */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400" />
            5. Data Retention &amp; Deletion
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            We store code submissions, score histories, and account details for as long as your profile remains active. If you choose to close your account via Settings, your personal profile data (email, OAuth associations) is permanently scrubbed from active storage within 30 days. Submissions and coding logs may be anonymized to ensure leaderboard and contest history integrity.
          </p>
        </section>

        {/* 6. User Rights */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-400" />
            6. Your Rights
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            As a developer on bugX, you have complete control over your profiles:
          </p>
          <ul className="text-sm text-[#eff1f680] list-disc list-inside space-y-1.5 pl-2">
            <li>You can review, edit, or update your username, email, and social link URLs in settings.</li>
            <li>You can export or inspect your submission metrics.</li>
            <li>You can request complete profile termination.</li>
          </ul>
        </section>

        {/* 7. Contact Section */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-400" />
            7. Contact Support
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            For inquiries regarding database profile extraction, account termination requests, or security vulnerabilities, please contact:
          </p>
          <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-3 rounded-lg inline-block">
            <span className="text-sm font-mono text-blue-400 font-semibold select-all">
              support@bugx.io
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
