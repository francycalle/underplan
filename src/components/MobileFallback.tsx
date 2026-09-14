import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const MobileFallback: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <div className="h-full w-full min-h-[100dvh] bg-[#0E0F12] text-white flex flex-col items-center justify-center p-6 pb-14 text-center select-none font-sans">
      {/* Logo & Name */}
      <div className="flex flex-col items-center mb-8">
        <BrandLogo size={76} />
        <span className="text-3xl font-bold tracking-tight text-white mt-3.5 font-figtree">
          UnderPlan
        </span>
      </div>

      {/* Coming Soon message */}
      <div className="max-w-sm space-y-3 mb-9">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-figtree">
          Coming soon bro 👀
        </h2>
        <p className="text-base text-slate-400 leading-relaxed font-figtree">
          UnderPlan is currently built for desktop.
          <br />
          Mobile version is in the works!
        </p>
      </div>

      {/* Minimal desktop link copy button */}
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#1D1E22] hover:bg-[#25272D] border border-[#2A2D36] text-sm font-figtree font-medium text-slate-200 transition-all active:scale-95 shadow-md"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">Link copied! 🚀</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-slate-400" />
            <span>Copy link for desktop</span>
          </>
        )}
      </button>
    </div>
  );
};
