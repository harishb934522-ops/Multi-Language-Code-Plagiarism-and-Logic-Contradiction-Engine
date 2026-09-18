import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowLeft } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

export default function TutorGraph() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fgRef = useRef();

  useEffect(() => {
    async function fetchGraphData() {
      try {
        const token = await getToken();
        const res = await fetch(`http://localhost:4000/api/assessments/${id}/graph`, {
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

  const getNodeColor = (decision) => {
    switch (decision) {
      case 'cleared': return '#22c55e'; // green-500
      case 'flagged': return '#ef4444'; // red-500
      case 'needs_review': return '#f97316'; // orange-500
      case 'pending': 
      default:
        return '#9ca3af'; // gray-400
    }
  };

  if (loading) return <div className="p-8">Loading graph data...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  if (graphData.nodes.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <button 
          onClick={() => navigate('/tutor-dashboard')}
          className="absolute top-8 left-8 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Insufficient Submissions</h2>
        <p className="text-gray-500">Need at least 2 submissions to show similarity relationships.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center">
        <button 
          onClick={() => navigate(`/tutor-dashboard/assessment/${id}`)}
          className="flex items-center bg-white/10 backdrop-blur text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors shadow"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Assessment
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg w-64 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Legend</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-gray-400 mr-3"></div>
            <span className="text-gray-700">Pending Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-3"></div>
            <span className="text-gray-700">Cleared</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-orange-500 mr-3"></div>
            <span className="text-gray-700">Needs Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-3"></div>
            <span className="text-gray-700">Flagged</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            Edge thickness represents similarity score (&ge;40%). Hover over an edge to see exact %. Click a node to view its report.
          </p>
        </div>
      </div>

      <div className="flex-1 w-full h-full">
        <ForceGraph2D
          ref={fgRef}
          graphData={{
            nodes: graphData.nodes,
            links: graphData.edges
          }}
          nodeId="id"
          nodeColor={node => getNodeColor(node.decision)}
          nodeLabel={node => `${node.label} (${node.language})`}
          nodeRelSize={8}
          linkColor={() => 'rgba(255,255,255,0.4)'}
          linkWidth={link => Math.max(1, link.similarity / 15)}
          linkLabel={link => `Similarity: ${link.similarity}%`}
          onNodeClick={node => navigate(`/tutor-dashboard/assessment/${id}/submission/${node.id}`)}
          cooldownTicks={100}
          onEngineStop={() => fgRef.current.zoomToFit(400, 50)}
        />
      </div>
    </div>
  );
}
