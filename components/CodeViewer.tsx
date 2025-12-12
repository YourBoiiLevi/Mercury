import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';

interface CodeViewerProps {
  code: string;
  lang: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, lang }) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const highlight = async () => {
      try {
        setLoading(true);
        const out = await codeToHtml(code, {
          lang: lang || 'text',
          theme: 'vesper'
        });
        if (mounted) {
          setHtml(out);
        }
      } catch (e) {
        console.error("Shiki highlight error", e);
        if (mounted) {
          // Fallback if shiki fails or lang not found
          setHtml(`<pre><code>${code}</code></pre>`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    highlight();
    return () => { mounted = false; };
  }, [code, lang]);

  if (loading) {
    return (
      <div className="p-4 font-mono text-gray-500 text-sm">
        [PARSING_SYNTAX]...
      </div>
    );
  }

  return (
    <div 
      className="code-viewer h-full w-full overflow-auto p-4 text-sm bg-mercury-carbon"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        lineHeight: '1.5',
      }}
    />
  );
};

export default CodeViewer;