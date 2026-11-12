import React, { useState, useEffect } from 'react';
import { X, Smartphone, QrCode, Copy, Check, Wifi, ExternalLink, Apple, Globe } from 'lucide-react';
import { api } from '../services/api';

export default function MobileConnectModal({ isOpen, onClose }) {
  const [mobileInfo, setMobileInfo] = useState({
    lan_ip: '192.168.1.6',
    port: 8000,
    url: 'http://192.168.1.6:8000'
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      api.getMobileInfo()
        .then((data) => {
          if (data && data.url) {
            setMobileInfo(data);
          }
        })
        .catch((err) => {
          const host = window.location.hostname;
          const port = window.location.port || '8000';
          setMobileInfo({
            lan_ip: host,
            port: port,
            url: `http://${host}:${port}`
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileInfo.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(mobileInfo.url)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 transition-all">
      <div 
        className="liquid-glass-elevated rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl liquid-glass-sub text-blue-500 shadow-2xs">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Open on Mobile Phone
              </h3>
              <p className="text-xs text-slate-400">
                Install as a full-screen standalone application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Step 1: Scan QR Code */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-3xl liquid-glass-sub">
            {/* QR Code Container */}
            <div className="relative p-2 bg-white rounded-2xl shadow-sm border border-slate-200 shrink-0">
              <img
                src={qrImageUrl}
                alt="QR Code for Mobile Access"
                className="w-32 h-32 object-contain rounded-xl"
                loading="eager"
              />
            </div>

            {/* URL & Quick Copy */}
            <div className="flex-1 space-y-2 text-center sm:text-left w-full min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Wifi className="h-3 w-3" />
                <span>Connected on Same Wi-Fi</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Scan with Camera
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aim phone camera at QR code to open the dashboard.
              </p>

              {/* Direct Link & Copy */}
              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex-1 px-3 py-1.5 liquid-glass-sub rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                  {mobileInfo.url}
                </div>
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 apple-button-primary text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-glow-sm active:scale-95 transition-all"
                  title="Copy mobile URL"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Install as Native PWA App */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Add to Home Screen (Progressive Web App)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Android Guide */}
              <div className="p-3.5 rounded-2xl liquid-glass-sub space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span>Android (Chrome)</span>
                </div>
                <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Open the URL in Chrome</li>
                  <li>Tap the 3 dots menu <span className="font-bold text-slate-200">(⋮)</span></li>
                  <li>Tap <strong className="text-slate-200">"Install app"</strong> or "Add to Home Screen"</li>
                </ol>
              </div>

              {/* iOS Guide */}
              <div className="p-3.5 rounded-2xl liquid-glass-sub space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <div className="p-1 rounded-lg bg-slate-500/10 text-slate-400">
                    <Apple className="h-4 w-4" />
                  </div>
                  <span>iPhone (Safari)</span>
                </div>
                <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Open the URL in Safari</li>
                  <li>Tap the Share button <span className="font-bold text-slate-200">(⎋)</span></li>
                  <li>Select <strong className="text-slate-200">"Add to Home Screen"</strong></li>
                </ol>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
