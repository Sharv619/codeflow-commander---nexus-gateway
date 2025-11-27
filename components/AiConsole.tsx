import React, { useState, useEffect } from 'react';

interface Agent {
    id: string;
    role: string;
    status: 'active' | 'idle' | 'processing';
    lastActivity: string;
}

export const AiConsole: React.FC = () => {
    const [analysis, setAnalysis] = useState('');
    const [agents, setAgents] = useState<Agent[]>([
        { id: 'reviewer', role: 'Code Review', status: 'active', lastActivity: '2 min ago' },
        { id: 'security', role: 'Security Audit', status: 'idle', lastActivity: '5 min ago' },
        { id: 'compliance', role: 'Compliance Check', status: 'idle', lastActivity: '10 min ago' },
        { id: 'performance', role: 'Performance Analysis', status: 'processing', lastActivity: '1 min ago' }
    ]);

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'active': return 'green';
            case 'processing': return 'yellow';
            case 'idle': return 'gray';
            default: return 'gray';
        }
    };

    return (
        <div className="ai-console" style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            maxWidth: '800px',
            margin: '20px auto'
        }}>
            <h2>🧠 Autonomous Agent Console</h2>

            <div className="agent-network" style={{ marginBottom: '20px' }}>
                <h3>Agent Network Status</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    {agents.map(agent => (
                        <div key={agent.id} style={{
                            padding: '10px',
                            border: '1px solid #eee',
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: getStatusColor(agent.status),
                                    marginRight: '8px',
                                    display: 'inline-block'
                                }}></span>
                                <strong>{agent.role}</strong>
                            </div>
                            <div style={{ fontSize: '0.9em', color: '#666' }}>
                                Status: {agent.status}<br/>
                                Last: {agent.lastActivity}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="analysis-output">
                <h3>Multi-Agent Analysis Output</h3>
                <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '15px',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    minHeight: '200px',
                    whiteSpace: 'pre-wrap'
                }}>
                    {analysis || "🕐 Waiting for input...\n\nAgent Network Status:\n• Code Review Agent: Active\n• Security Audit Agent: Idle\n• Compliance Agent: Idle\n• Performance Analysis Agent: Processing\n\nCoordinated Analysis Pipeline:\n1. Multi-modal input processing\n2. Agent role assignment\n3. Parallel execution\n4. Result synthesis\n5. Quality validation"}
                </pre>
            </div>

            <div style={{
                marginTop: '20px',
                padding: '10px',
                backgroundColor: '#e8f5e8',
                borderRadius: '4px',
                border: '1px solid #4caf50'
            }}>
                ✅ <strong>System Status:</strong> All agents operational | Knowledge Graph: Active | EKG: Connected
            </div>
        </div>
    );
};
