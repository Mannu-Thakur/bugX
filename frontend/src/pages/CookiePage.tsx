import React from 'react';
import { Cookie, Key, ShieldCheck, EyeOff, Sliders, Info } from 'lucide-react';

export const CookiePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-[#3e3e3e] pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#ffffff0a] text-amber-400 border border-[#3e3e3e]">
            <Cookie className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Cookie &amp; Storage Policy</h1>
        </div>
        <p className="text-sm text-[#eff1f680]">
          Last Updated: June 11, 2026
        </p>
      </div>

      {/* Intro */}
      <p className="text-base text-[#eff1f6bf] leading-relaxed">
        To deliver a responsive, personalizable, and secure coding sandbox and arena, bugX utilizes cookies and local browser storage (such as <code className="text-blue-400 bg-[#ffffff0a] px-1.5 py-0.5 rounded text-sm">localStorage</code>). Below is a detailed breakdown of what we store on your device, how we use it, and how you can manage these preferences.
      </p>

      {/* Content Grid */}
      <div className="space-y-6">
        {/* 1. Cookies vs LocalStorage */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            1. Storage Technologies Used
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            While traditional HTTP cookies are sent automatically with every web request, modern single-page applications often utilize client-side storage technologies for improved performance:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-lg space-y-1.5">
              <span className="text-sm font-semibold text-white">JSON Web Tokens (JWT)</span>
              <p className="text-xs text-[#eff1f680] leading-relaxed">
                Rather than storing random session IDs in traditional cookies, we generate a secure JWT upon successful login. This token contains encrypted details verifying your identity and authorization scope.
              </p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-lg space-y-1.5">
              <span className="text-sm font-semibold text-white">Browser localStorage</span>
              <p className="text-xs text-[#eff1f680] leading-relaxed">
                We store the JWT directly in your browser's <code className="text-blue-400 bg-white/5 px-1 rounded">localStorage</code>. This ensures the app is highly responsive, loading your active profile locally without querying the database on every initial render.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Authentication and Tokens */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            2. Authentication &amp; Sessions (Strictly Necessary)
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            These storage elements are absolutely essential for the system to function. Without them, you would have to enter your password on every page change:
          </p>
          <ul className="text-sm text-[#eff1f680] list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-white">Session token (token):</strong> Saved in local storage upon successful validation to keep you logged in while exploring problems.
            </li>
            <li>
              <strong className="text-white">CSRF Protection (state):</strong> Cryptographic temporary tokens generated on the backend and validated on the callback router during Google/GitHub redirects to block cross-site request forgery attacks.
            </li>
          </ul>
        </section>

        {/* 3. Security Storage */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            3. Security &amp; Protection
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            We store rate-limit trackers temporarily linked to client IP addresses on our server (using Redis caches). Client-side, localStorage is used strictly for storing authentication context. This layout prevents malicious scripts from hijacking valid sessions.
          </p>
        </section>

        {/* 4. Preference Storage */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-400" />
            4. Preferences &amp; Settings
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            To provide a premium developer workflow, the platform saves editor states and UI configurations locally:
          </p>
          <ul className="text-sm text-[#eff1f680] list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-white">Dark / Light Theme:</strong> Remembers your display choices so the platform doesn't flash bright colors when refreshing the browser.
            </li>
            <li>
              <strong className="text-white">Sandbox Code Drafts:</strong> Safely persists your active editor progress. If you accidentally close the tab or experience a connection drop, your latest script remains saved on your device.
            </li>
            <li>
              <strong className="text-white">Selected Language:</strong> Keeps your preferred programming language selection (e.g. Python, C++, Go) as default for subsequent coding problems.
            </li>
          </ul>
        </section>

        {/* 5. How to Disable */}
        <section className="bg-[#282828] border border-[#3e3e3e] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-purple-400" />
            5. Disabling and Managing Local Data
          </h2>
          <p className="text-sm text-[#eff1f6bf] leading-relaxed">
            You can clear or block storage at any time by configuring your browser's options. Please note that disabling local storage will impact critical platform actions:
          </p>
          <div className="bg-[#1a1a1a] border border-[#3e3e3e] p-4 rounded-lg space-y-3">
            <span className="text-sm font-semibold text-white">How to clear storage:</span>
            <ul className="text-xs text-[#eff1f680] list-decimal list-inside space-y-2">
              <li>Open your browser settings (Chrome, Firefox, Safari, Edge).</li>
              <li>Navigate to <strong className="text-white">Privacy &amp; Security</strong> &rarr; <strong className="text-white">Cookies and Site Data</strong>.</li>
              <li>Choose to block site storage or delete stored data for <code className="text-blue-400 font-semibold bg-white/5 px-1 rounded">localhost</code> or your custom domain.</li>
              <li>Alternatively, logging out from the profile menu automatically wipes your authentication token from local storage.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};
