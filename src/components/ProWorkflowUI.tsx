import React from 'react';
import { ProSession, AgentIteration } from '../types';
import { FIBO3DPreview } from './FIBO3DPreview';

interface Props {
  session: ProSession;
  onStartCull: () => void;
  onClientFeedback: (feedback: string) => void;
  onBatchGenerate: () => void;
}

const Stage: React.FC<{
  title: string;
  status: string;
  metric?: string;
  onClick?: () => void;
}> = ({ title, status, metric, onClick }) => (
  <div 
    style={{
      padding: '20px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
      ...(onClick && {
        ':hover': { transform: 'translateY(-2px)', borderColor: 'rgba(255, 255, 255, 0.2)' }
      })
    }}
    onClick={onClick}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>{title}</h3>
      <span style={{ fontSize: '14px', color: '#4ade80', fontWeight: 500 }}>{status}</span>
    </div>
    {metric && (
      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{metric}</p>
    )}
  </div>
);

const IterationCard: React.FC<{ iteration: AgentIteration }> = ({ iteration }) => (
  <div style={{
    padding: '16px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '12px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Iteration #{iteration.iteration}</span>
      <span style={{ 
        fontSize: '14px', 
        fontWeight: 600, 
        color: iteration.score >= 8 ? '#4ade80' : iteration.score >= 6 ? '#fbbf24' : '#ef4444'
      }}>
        {iteration.score.toFixed(1)}/10
      </span>
    </div>
    <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>
      "{iteration.instruction}"
    </p>
  </div>
);

export const ProWorkflowUI: React.FC<Props> = ({ session, onStartCull, onClientFeedback, onBatchGenerate }) => {
  const [feedbackInput, setFeedbackInput] = React.useState('');

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && feedbackInput.trim()) {
      onClientFeedback(feedbackInput);
      setFeedbackInput('');
    }
  };

  const bestScore = session.iterations.length > 0 
    ? Math.max(...session.iterations.map(i => i.score)) 
    : 0;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#fff' }}>
          📸 {session.client_name} - {session.shoot_type.toUpperCase()}
        </h1>
        <div style={metricsStyle}>
          ⏱️ {session.time_saved_hours.toFixed(1)}hrs saved | 
          🖼️ {session.images_culled.toLocaleString()} selects | 
          ⚡ {session.batch_size} batch ready
        </div>
      </div>

      {/* Workflow Stages */}
      <div style={stagesStyle}>
        <Stage 
          title="📁 AI CULLING" 
          status={session.images_culled > 0 ? "✅ COMPLETE" : "▶️ START"} 
          onClick={session.images_culled === 0 ? onStartCull : undefined}
          metric={`2K → ${session.images_culled}`} 
        />
        
        <Stage 
          title="🤖 AGENT PREVIZ" 
          status={`🔄 ${session.iterations.length} iterations`} 
          metric={`Score: ${bestScore.toFixed(1)}/10`} 
        />
        
        <Stage 
          title="💬 CLIENT FEEDBACK" 
          status="2min refine" 
          metric="Bride: 'more golden'" 
        />
        
        <Stage 
          title="⚡ BATCH GENERATE" 
          status={session.delivery_ready ? "✅ READY" : "▶️ GENERATE"} 
          onClick={onBatchGenerate}
          metric={`${session.batch_size} identical images`} 
        />
      </div>

      {/* 3D Preview + Controls */}
      <div style={previewSection}>
        <FIBO3DPreview fibo={session.final_json} />
        <div style={controlsStyle}>
          <input 
            type="text"
            placeholder="Client: 'more golden hour'"
            value={feedbackInput}
            onChange={(e) => setFeedbackInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          />
          <button 
            onClick={onBatchGenerate} 
            style={batchBtn(session.delivery_ready)}
          >
            {session.delivery_ready ? '✅ DELIVERY ZIP' : `⚡ BATCH ${session.batch_size}`}
          </button>
        </div>
      </div>

      {/* Iteration History */}
      {session.iterations.length > 0 && (
        <div style={historyStyle}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 600, color: '#fff' }}>
            📈 Agent Progress (Best: {bestScore.toFixed(1)}/10)
          </h3>
          {session.iterations.slice(0, 5).map(iter => (
            <IterationCard key={iter.id} iteration={iter} />
          ))}
        </div>
      )}
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '40px 24px',
  background: 'linear-gradient(180deg, #0f1419 0%, #1a1f2e 100%)',
  minHeight: '100vh',
  color: '#fff'
};

const headerStyle: React.CSSProperties = {
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
};

const metricsStyle: React.CSSProperties = {
  marginTop: '12px',
  fontSize: '14px',
  color: '#94a3b8',
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap'
};

const stagesStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px',
  marginBottom: '40px'
};

const previewSection: React.CSSProperties = {
  marginBottom: '40px'
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '20px'
};

const batchBtn = (ready: boolean): React.CSSProperties => ({
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  background: ready 
    ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
});

const historyStyle: React.CSSProperties = {
  marginTop: '40px',
  padding: '24px',
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

