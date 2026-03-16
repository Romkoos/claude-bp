import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  FileText,
  Copy,
  Download,
  FileArchive,
} from 'lucide-react';
import {
  generateFileTree,
  exportAsZip,
  type ExportedFile,
} from '../../serialization/fileSystemExporter';
import { useGraphStore } from '../../store/useGraphStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: FileTreeNode[];
  content?: string;
  fileType?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFileTree(files: ExportedFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existingNode = current.find((n) => n.name === part);

      if (existingNode) {
        if (isFile) {
          existingNode.content = file.content;
          existingNode.fileType = file.type;
        } else {
          current = existingNode.children;
        }
      } else {
        const newNode: FileTreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: isFile ? 'file' : 'directory',
          children: [],
          ...(isFile ? { content: file.content, fileType: file.type } : {}),
        };
        current.push(newNode);
        if (!isFile) {
          current = newNode.children;
        }
      }
    }
  }

  // Sort: directories first, then files, alphabetically within each group
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length) sortNodes(node.children);
    }
    return nodes;
  };

  return sortNodes(root);
}

function fileIcon(name: string) {
  if (name.endsWith('.json')) return <FileArchive size={14} />;
  return <FileText size={14} />;
}

// ---------------------------------------------------------------------------
// FileTreeItem
// ---------------------------------------------------------------------------

function FileTreeItem({
  node,
  depth,
  selectedFile,
  expandedDirs,
  onSelectFile,
  onToggleDir,
}: {
  node: FileTreeNode;
  depth: number;
  selectedFile: string | null;
  expandedDirs: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedFile === node.path;

  return (
    <>
      <button
        className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm rounded hover:opacity-80"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
          backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
        }}
        onClick={() => {
          if (node.type === 'directory') {
            onToggleDir(node.path);
          } else {
            onSelectFile(node.path);
          }
        }}
      >
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {node.type === 'directory' ? (
            isExpanded ? (
              <FolderOpen size={14} />
            ) : (
              <Folder size={14} />
            )
          ) : (
            fileIcon(node.name)
          )}
        </span>
        <span className="truncate">{node.name}</span>
      </button>
      {node.type === 'directory' &&
        isExpanded &&
        node.children.map((child) => (
          <FileTreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            expandedDirs={expandedDirs}
            onSelectFile={onSelectFile}
            onToggleDir={onToggleDir}
          />
        ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// ContentPreview
// ---------------------------------------------------------------------------

function ContentPreview({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div
      className="flex text-sm overflow-auto h-full"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Line numbers */}
      <div
        className="flex-shrink-0 text-right select-none pr-3 py-3"
        style={{
          color: 'var(--text-muted)',
          borderRight: '1px solid var(--node-border)',
          minWidth: '3rem',
        }}
      >
        {lines.map((_, i) => (
          <div key={i} className="leading-5 px-2">
            {i + 1}
          </div>
        ))}
      </div>
      {/* Content */}
      <pre
        className="flex-1 py-3 pl-4 pr-3 m-0"
        style={{
          color: 'var(--text-primary)',
          whiteSpace: 'pre',
          lineHeight: '1.25rem',
        }}
      >
        {content}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExportPreview
// ---------------------------------------------------------------------------

export function ExportPreview({ isOpen, onClose }: ExportPreviewProps) {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const configName = useGraphStore((s) => s.configName);

  const [files, setFiles] = useState<ExportedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [exportErrors] = useState<string[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Generate file tree when opened
  useEffect(() => {
    if (!isOpen) return;
    const generated = generateFileTree(nodes, edges);
    setFiles(generated);
    setSelectedFile(generated.length > 0 ? generated[0].path : null);

    // Auto-expand all directories
    const dirs = new Set<string>();
    for (const f of generated) {
      const parts = f.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }
    setExpandedDirs(dirs);
  }, [isOpen, nodes, edges]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const tree = useMemo(() => buildFileTree(files), [files]);

  const selectedContent = useMemo(() => {
    if (!selectedFile) return null;
    return files.find((f) => f.path === selectedFile) ?? null;
  }, [files, selectedFile]);

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!selectedContent) return;
    await navigator.clipboard.writeText(selectedContent.content);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  }, [selectedContent]);

  const handleDownload = useCallback(async () => {
    if (files.length === 0) return;
    await exportAsZip(files, configName);
  }, [files, configName]);

  if (!isOpen) return null;

  const fileCount = files.length;
  const errorCount = exportErrors.length;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        data-testid="export-preview-modal"
        className="rounded-lg shadow-xl w-full mx-4 flex flex-col"
        style={{
          maxWidth: '900px',
          maxHeight: '80vh',
          backgroundColor: 'var(--node-bg)',
          border: '1px solid var(--node-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--node-border)' }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Export Preview
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {files.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center py-16"
            style={{ color: 'var(--text-muted)' }}
          >
            <p className="text-sm">No files to export. Add nodes to the graph first.</p>
          </div>
        ) : (
          <div
            className="flex flex-1 overflow-hidden"
            style={{ minHeight: 0 }}
          >
            {/* File tree panel */}
            <div
              data-testid="export-file-tree"
              className="flex-shrink-0 overflow-y-auto py-2"
              style={{
                width: '250px',
                borderRight: '1px solid var(--node-border)',
              }}
            >
              {tree.map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedFile={selectedFile}
                  expandedDirs={expandedDirs}
                  onSelectFile={setSelectedFile}
                  onToggleDir={handleToggleDir}
                />
              ))}
            </div>

            {/* Content preview panel */}
            <div data-testid="export-content-preview" className="flex-1 overflow-auto" style={{ minWidth: 0 }}>
              {selectedContent ? (
                <ContentPreview content={selectedContent.content} />
              ) : (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <p className="text-sm">Select a file to preview its content</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--node-border)' }}
        >
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {errorCount === 0
              ? `${fileCount} file${fileCount !== 1 ? 's' : ''}, 0 errors`
              : `${fileCount} file${fileCount !== 1 ? 's' : ''}, ${errorCount} error${errorCount !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm hover:opacity-80 disabled:opacity-40"
              style={{
                color: 'var(--text-secondary)',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--node-border)',
              }}
              disabled={!selectedContent}
              onClick={handleCopy}
            >
              <Copy size={14} />
              {copyFeedback ? 'Copied!' : 'Copy'}
            </button>
            <button
              data-testid="export-download-zip"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm hover:opacity-80 disabled:opacity-40"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}
              disabled={files.length === 0}
              onClick={handleDownload}
            >
              <Download size={14} />
              Download ZIP
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm hover:opacity-80"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--node-border)',
              }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
