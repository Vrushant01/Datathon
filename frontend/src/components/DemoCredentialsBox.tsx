import React, { useState, useCallback } from 'react';
import { ClipboardCopy, Check, Zap } from 'lucide-react';

interface Credential {
  label: string;
  value: string;
}

interface DemoCredentialsBoxProps {
  credentials: Credential[];
  onFill: () => void;
  /** Extra class names for outer wrapper */
  className?: string;
}

/** Small inline copy-to-clipboard button with a brief "Copied!" confirmation. */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        /* clipboard blocked — silently ignore */
      }
    },
    [text],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      className="inline-flex items-center gap-0.5 ml-1.5 px-1 py-0.5 rounded text-[10px] font-semibold
                 text-ksp-gold hover:text-ksp-gold-dark transition-colors select-none"
    >
      {copied ? (
        <>
          <Check size={11} />
          <span>Copied</span>
        </>
      ) : (
        <ClipboardCopy size={11} />
      )}
    </button>
  );
};

/**
 * Renders the demo-credentials info box (credential rows + "Use demo credentials"
 * fill button). Shown only when the parent decides to render it (caller checks
 * DEMO_MODE). Does NOT submit the form.
 */
export const DemoCredentialsBox: React.FC<DemoCredentialsBoxProps> = ({
  credentials,
  onFill,
  className = '',
}) => {
  const [filled, setFilled] = useState(false);

  const handleFill = (e: React.MouseEvent) => {
    e.preventDefault();
    onFill();
    setFilled(true);
    setTimeout(() => setFilled(false), 2000);
  };

  return (
    <div
      className={`bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-[12px] text-slate-600 select-text ${className}`}
    >
      {/* Credential rows */}
      <div className="space-y-0.5 text-center leading-relaxed">
        {credentials.map((cred) => (
          <div key={cred.label} className="flex items-center justify-center flex-wrap gap-x-1">
            <span>
              🔒 <strong>{cred.label}:</strong>
            </span>
            <span className="font-mono text-slate-700">{cred.value}</span>
            <CopyButton text={cred.value} />
          </div>
        ))}
      </div>

      {/* Fill button */}
      <button
        type="button"
        onClick={handleFill}
        className="mt-2.5 w-full flex items-center justify-center gap-1.5
                   border border-ksp-gold text-ksp-gold-dark bg-white
                   hover:bg-ksp-gold/10 active:bg-ksp-gold/20
                   font-bold text-[11px] uppercase tracking-wider
                   py-1.5 px-3 rounded-md transition-colors duration-150 select-none"
      >
        <Zap size={12} />
        {filled ? 'Fields filled — click Login to continue' : 'Use demo credentials'}
      </button>
    </div>
  );
};
