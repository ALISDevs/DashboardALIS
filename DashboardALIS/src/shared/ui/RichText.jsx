import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const plugins = [remarkGfm, remarkBreaks];

function SafeLink({ href, children }) {
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
}

export function RichText({ children = '', className = '', headingOffset = 2 }) {
  const components = useMemo(() => {
    const headings = Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
      const level = index + 1;
      const tag = `h${Math.min(6, level + headingOffset)}`;
      return [`h${level}`, ({ children: content }) => React.createElement(tag, null, content)];
    }));
    return { ...headings, a: SafeLink, img: () => null };
  }, [headingOffset]);

  return (
    <div className={`rich-text ${className}`}>
      <ReactMarkdown remarkPlugins={plugins} components={components} skipHtml>
        {typeof children === 'string' ? children : ''}
      </ReactMarkdown>
    </div>
  );
}
