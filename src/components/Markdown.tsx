import ReactMarkdown from 'react-markdown';

// react-markdown does not render raw HTML by default, so notes cannot inject markup.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
