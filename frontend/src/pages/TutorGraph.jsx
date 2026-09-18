import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { useTheme } from '../components/ThemeContext';

export default function TutorGraph() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { theme } = useTheme();
  
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // To handle responsive resizing of the graph
  const [dimensions, setDimensions] = useState({ width: 0, height: 600 });
  const containerRef = useRef(null);
  const fgRef = useRef();

  useEffect(() => {
    async function fetchGraphData() {
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/assessments/${id}/graph`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch graph data');
        }
        
        const data = await res.json();
        setGraphData(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchGraphData();
  }, [id, getToken]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries.length > 0) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height > 400 ? entries[0].contentRect.height : 600
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading, error, graphData]);

  const getNodeColor = (decision) => {
    switch (decision) {
      case 'cleared': return '#10b981'; // emerald-500
      case 'flagged': return '#ef4444'; // red-500
      case 'needs_review': return '#f59e0b'; // amber-500
      case 'pending': 
      default:
        return theme === 'dark' ? '#9ca3af' : '#6b7280'; // gray-400 / gray-500
    }
  };

  if (loading) return <div className="p-8 text-[var(--color-text-secondary)]">Loading graph data...</div>;
  if (error) return <div className="p-8 text-[var(--color-danger)]">Error: {error}</div>;

  if (graphData.nodes.length < 2) {
    return (
      <div className="min-h-[600px] bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex flex-col items-center justify-center p-4 relative">
        <button 
          onClick={() => navigate(`/tutor-dashboard/assessment/${id}`)}
          className="absolute top-4 left-4 flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Assessment
        </button>
        <h2 className="text-2xl font-semibold mb-4 text-[var(--color-text-primary)]">Insufficient Submissions</h2>
        <p className="text-[var(--color-text-secondary)]">Need at least 2 submissions to show similarity relationships.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[600px] relative overflow-hidden bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm">
      <div className="absolute top-4 left-4 z-10 flex items-center">
        <button 
          onClick={() => navigate(`/tutor-dashboard/assessment/${id}`)}
          className="flex items-center bg-[var(--color-surface)]/80 backdrop-blur text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] transition-colors shadow"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Assessment
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-[var(--color-surface)]/90 backdrop-blur p-4 rounded-xl shadow-lg w-64 border border-[var(--color-border)] hidden md:block">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-3 text-sm uppercase tracking-wider">Legend</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-3 ${theme === 'dark' ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
            <span className="text-[var(--color-text-secondary)]">Pending Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-emerald-500 mr-3"></div>
            <span className="text-[var(--color-text-secondary)]">Cleared</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-amber-500 mr-3"></div>
            <span className="text-[var(--color-text-secondary)]">Needs Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-3"></div>
            <span className="text-[var(--color-text-secondary)]">Flagged</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Edge thickness represents similarity score (&ge;40%). Hover over an edge to see exact %. Click a node to view its report.
          </p>
        </div>
      </div>

      <div className="flex-1 w-full h-full bg-[var(--color-bg)]" ref={containerRef}>
        {dimensions.width > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={{
              nodes: graphData.nodes,
              links: graphData.edges
            }}
            nodeId="id"
            nodeColor={node => getNodeColor(node.decision)}
            nodeLabel={node => `${node.label} (${node.language})`}
            nodeRelSize={8}
            linkColor={() => theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
            linkWidth={link => Math.max(1, link.similarity / 15)}
            linkLabel={link => `Similarity: ${link.similarity}%`}
            onNodeClick={node => navigate(`/tutor-dashboard/assessment/${id}/submission/${node.id}`)}
            cooldownTicks={100}
            onEngineStop={() => fgRef.current.zoomToFit(400, 50)}
          />
        )}
      </div>
    </div>
  );
}
