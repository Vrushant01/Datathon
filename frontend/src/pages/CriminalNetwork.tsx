import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../utils/mockDb';
import { 
  Share2, FileText, Search, Activity, ShieldAlert, ArrowLeft, Network,
  Plus, Trash2, ArrowUpRight
} from 'lucide-react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, addEdge, Connection, 
  MarkerType,
  Handle,
  Position,
  NodeProps,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const CustomNodeComponent = ({ data, selected }: NodeProps) => {
  return (
    <div className={`relative flex items-center justify-center cursor-pointer transition-all ${selected ? 'scale-110 drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]' : 'drop-shadow-md'}`}>
      <Handle type="target" position={Position.Top} className="opacity-0 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold border-2"
        style={{ 
          backgroundColor: data.color as string, 
          borderColor: selected ? '#D4AF37' : 'rgba(255,255,255,0.2)' 
        }}
      >
        {data.symbol as string}
      </div>
      <div className="absolute left-12 top-2 text-[11px] font-bold text-slate-200 whitespace-nowrap bg-[#0b0f19]/90 px-2 py-1 rounded shadow border border-white/10">
        {data.label as string}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNodeComponent,
};

export const CriminalNetwork: React.FC = () => {
  const { user } = useAuth();
  const cases = mockDb.getCases();
  const accusedList = mockDb.getAccused();
  const victimsList = mockDb.getVictims();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFirId, setSelectedFirId] = useState<number | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [newEntityType, setNewEntityType] = useState<'Vehicle' | 'Phone' | 'Weapon' | 'Evidence' | 'Bank' | 'Location' | 'accused'>('Vehicle');
  const [newEntityValue, setNewEntityValue] = useState('');
  const [newEntityDesc, setNewEntityDesc] = useState('');
  
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [editNodeValue, setEditNodeValue] = useState('');
  const [editNodeDesc, setEditNodeDesc] = useState('');
  const [newSuspectAge, setNewSuspectAge] = useState<number>(30);
  const [newSuspectGender, setNewSuspectGender] = useState<number>(1);
  const [editSuspectAge, setEditSuspectAge] = useState<number>(30);
  const [editSuspectGender, setEditSuspectGender] = useState<number>(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const isOfficer = user?.role === 'Officer';
  const isAnalytics = user?.role === 'Analytics';
  const filterFirCases = cases.filter(c => {
    if (isOfficer) {
      return c.PolicePersonID === user?.employeeId;
    }
    if (isAnalytics) {
      return c.PoliceStationID === user?.unitId;
    }
    return true;
  });

  const isCaseEditable = (caseId: number) => {
    const caseRecord = cases.find(c => c.CaseMasterID === caseId);
    if (!caseRecord) return false;
    if (user?.role === 'Admin') return true;
    return caseRecord.PolicePersonID === user?.employeeId;
  };

  const getNodeColor = (type: string, isMain: boolean) => {
    if (isMain) return '#3B82F6'; 
    if (type === 'case') return '#1D4ED8'; 
    if (type === 'accused') return '#6366F1'; 
    if (type === 'victim') return '#EC4899'; 
    if (type === 'Vehicle') return '#F97316'; 
    if (type === 'Phone') return '#06B6D4'; 
    if (type === 'Bank') return '#EAB308'; 
    if (type === 'Location') return '#84CC16'; 
    if (type === 'Weapon') return '#EF4444'; 
    return '#10B981'; 
  };

  const getNodeSymbol = (type: string) => {
    if (type === 'case') return 'FIR';
    if (type === 'accused') return 'A';
    if (type === 'victim') return 'V';
    if (type === 'Vehicle') return 'VEH';
    if (type === 'Phone') return 'TEL';
    if (type === 'Bank') return 'BNK';
    if (type === 'Location') return 'LOC';
    if (type === 'Weapon') return 'WEP';
    return 'EVI';
  };

  // Recompute graph when FIR is selected
  useEffect(() => {
    if (selectedFirId === null) {
      setNodes([]);
      setEdges([]);
      setSelectedNodeData(null);
      return;
    }

    const mainCase = cases.find(c => c.CaseMasterID === selectedFirId);
    if (!mainCase) return;

    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    const centerX = 400;
    const centerY = 300;

    // Center Node
    initialNodes.push({
      id: `case-${mainCase.CaseMasterID}`,
      type: 'custom',
      position: { x: centerX, y: centerY },
      data: {
        label: `FIR #${mainCase.CaseNo}`,
        color: getNodeColor('case', true),
        symbol: getNodeSymbol('case'),
        type: 'case',
        rawData: mainCase
      }
    });

    const mainAccused = accusedList.filter(a => a.CaseMasterID === selectedFirId);
    const entities = mockDb.getCaseEntities(selectedFirId);

    // Add Accused
    mainAccused.forEach((acc, aIdx) => {
      const accusedNodeId = `offender-${acc.AccusedName}`;
      const angle = (aIdx * 2 * Math.PI) / Math.max(mainAccused.length, 1) - Math.PI / 2;
      const accX = centerX + Math.cos(angle) * 250;
      const accY = centerY + Math.sin(angle) * 250;

      if (!initialNodes.some(n => n.id === accusedNodeId)) {
        const offenderCases = accusedList.filter(a => a.AccusedName === acc.AccusedName);
        initialNodes.push({
          id: accusedNodeId,
          type: 'custom',
          position: { x: accX, y: accY },
          data: {
            label: `${acc.AccusedName} (Age: ${acc.AgeYear || '?'})`,
            color: getNodeColor('accused', false),
            symbol: getNodeSymbol('accused'),
            type: 'accused',
            rawData: {
              name: acc.AccusedName,
              AccusedMasterID: acc.AccusedMasterID,
              casesCount: offenderCases.length,
              age: acc.AgeYear || 'Unknown',
              gender: acc.GenderID === 1 ? 'Male' : 'Female',
              arrests: offenderCases.map(oc => {
                const caseRecord = cases.find(c => c.CaseMasterID === oc.CaseMasterID);
                return caseRecord ? `FIR #${caseRecord.CaseNo}` : null;
              }).filter(Boolean)
            }
          }
        });
      }

      initialEdges.push({
        id: `e-case-${mainCase.CaseMasterID}-${accusedNodeId}`,
        source: `case-${mainCase.CaseMasterID}`,
        target: accusedNodeId,
        type: 'straight',
        label: 'Offender',
        animated: true,
        style: { stroke: '#94A3B8', strokeWidth: 1.5 },
        labelStyle: { fill: '#94A3B8', fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: '#0f172a' }
      });
    });

    const mainVictims = victimsList.filter(v => v.CaseMasterID === selectedFirId);
    // Add Victims
    mainVictims.forEach((vic, vIdx) => {
      const victimNodeId = `victim-${vic.VictimName}`;
      const angle = (vIdx * 2 * Math.PI) / Math.max(mainVictims.length, 1) + Math.PI;
      const vicX = centerX + Math.cos(angle) * 250;
      const vicY = centerY + Math.sin(angle) * 250;

      if (!initialNodes.some(n => n.id === victimNodeId)) {
        initialNodes.push({
          id: victimNodeId,
          type: 'custom',
          position: { x: vicX, y: vicY },
          data: {
            label: `${vic.VictimName} (Age: ${vic.AgeYear || '?'})`,
            color: getNodeColor('victim', false),
            symbol: getNodeSymbol('victim'),
            type: 'victim',
            rawData: {
              name: vic.VictimName,
              age: vic.AgeYear || 'Unknown',
              gender: vic.GenderID === 1 ? 'Male' : 'Female'
            }
          }
        });
      }

      initialEdges.push({
        id: `e-case-${mainCase.CaseMasterID}-${victimNodeId}`,
        source: victimNodeId,
        target: `case-${mainCase.CaseMasterID}`,
        type: 'straight',
        label: 'Victim',
        animated: true,
        style: { stroke: '#EC4899', strokeWidth: 1.5 },
        labelStyle: { fill: '#EC4899', fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: '#0f172a' }
      });
    });

    // Add Entities
    entities.forEach((ent, eIdx) => {
      const entityNodeId = `entity-${ent.EntityID}`;
      const angle = (eIdx * 2 * Math.PI) / Math.max(entities.length, 1) + Math.PI / 4;
      const entX = centerX + Math.cos(angle) * 350;
      const entY = centerY + Math.sin(angle) * 350;

      initialNodes.push({
        id: entityNodeId,
        type: 'custom',
        position: { x: entX, y: entY },
        data: {
          label: ent.value,
          color: getNodeColor(ent.type, false),
          symbol: getNodeSymbol(ent.type),
          type: ent.type,
          rawData: ent
        }
      });

      let relationLabel = 'Associated';
      if (ent.type === 'Vehicle') relationLabel = 'Transported In';
      if (ent.type === 'Phone') relationLabel = 'Calls From';
      if (ent.type === 'Bank') relationLabel = 'Wire Transfer';
      if (ent.type === 'Location') relationLabel = 'Frequents';
      if (ent.type === 'Weapon') relationLabel = 'Used In Crime';
      if (ent.type === 'Evidence') relationLabel = 'Seized';

      initialEdges.push({
        id: `e-case-${mainCase.CaseMasterID}-${entityNodeId}`,
        source: `case-${mainCase.CaseMasterID}`,
        target: entityNodeId,
        type: 'straight',
        label: relationLabel,
        animated: true,
        style: { stroke: getNodeColor(ent.type, false), strokeWidth: 1.5, opacity: 0.6 },
        labelStyle: { fill: '#94A3B8', fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: '#0f172a' }
      });
    });


    const customEdgesData = mockDb.getCustomEdges(selectedFirId);
    customEdgesData.forEach(ce => {
      initialEdges.push({
        id: ce.EdgeID,
        source: ce.source,
        target: ce.target,
        type: 'straight',
        label: ce.label,
        animated: true,
        style: { stroke: '#eab308', strokeWidth: 2, strokeDasharray: '5, 5' },
        labelStyle: { fill: '#eab308', fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: '#0f172a' }
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirId]);

  const onConnect = useCallback((params: Connection) => {
    if (!isCaseEditable(selectedFirId!)) return;
    mockDb.addCustomEdge(selectedFirId!, params.source, params.target, 'Linked');
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#eab308', strokeWidth: 2, strokeDasharray: '5, 5' } }, eds));
  }, [selectedFirId, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data);
    
    // Highlight edges connected to this node
    setEdges(eds => eds.map(e => ({
      ...e,
      style: {
        ...e.style,
        stroke: (e.source === node.id || e.target === node.id) ? '#38BDF8' : '#334155',
        strokeWidth: (e.source === node.id || e.target === node.id) ? 2.5 : 1.5
      },
      animated: (e.source === node.id || e.target === node.id)
    })));
  }, [setEdges]);

  const handleAddEntityNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFirId === null || !newEntityValue) return;

    if (!isCaseEditable(selectedFirId)) {
      showNotification('error', 'Clearance Denied: This case is not assigned to your desk.');
      return;
    }

    if (newEntityType === 'accused') {
      mockDb.addCaseAccused(selectedFirId, newEntityValue, newSuspectAge, newSuspectGender, user?.email || 'officer@ksp.gov.in');
      showNotification('success', `Added suspect node: "${newEntityValue}"`);
    } else {
      mockDb.addCaseEntity(selectedFirId, newEntityType, newEntityValue, newEntityDesc, user?.email || 'officer@ksp.gov.in');
      showNotification('success', `Added association node: "${newEntityValue}"`);
    }
    setNewEntityValue('');
    setNewEntityDesc('');
    // Trigger a re-render of nodes by updating selectedFirId (hacky but works since cases array is mutated)
    const current = selectedFirId;
    setSelectedFirId(null);
    setTimeout(() => setSelectedFirId(current), 10);
  };


  const handleUpdateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeData || selectedNodeData.type === 'case') return;
    
    if (selectedNodeData.type === 'accused') {
        mockDb.updateCaseAccused(selectedNodeData.rawData.AccusedMasterID, editNodeValue, editSuspectAge, editSuspectGender, user?.email || 'officer@ksp.gov.in');
    } else if (selectedNodeData.type === 'victim') {
        mockDb.updateCaseVictim(selectedNodeData.rawData.VictimMasterID, editNodeValue, editSuspectAge, editSuspectGender, user?.email || 'officer@ksp.gov.in');
    } else {
        mockDb.updateCaseEntity(selectedNodeData.rawData.EntityID, editNodeValue, editNodeDesc, user?.email || 'officer@ksp.gov.in');
    }
    showNotification('success', 'Node updated successfully');
    setIsEditingNode(false);
    
    // trigger rerender
    const current = selectedFirId;
    setSelectedFirId(null);
    setTimeout(() => {
        setSelectedFirId(current);
        setSelectedNodeData({...selectedNodeData, label: editNodeValue, rawData: {...selectedNodeData.rawData, value: editNodeValue, description: editNodeDesc}});
    }, 10);
  };

  const handleDeleteEntityNode = (entityId: number) => {
    if (selectedFirId === null) return;

    if (!isCaseEditable(selectedFirId)) {
      showNotification('error', 'Clearance Denied: This case is not assigned to your desk.');
      return;
    }

    if (window.confirm("Remove this association node from the case file?")) {
      mockDb.deleteCaseEntity(entityId, user?.email || 'officer@ksp.gov.in');
      showNotification('success', 'Association node deleted.');
      setSelectedNodeData(null);
      
      const current = selectedFirId;
      setSelectedFirId(null);
      setTimeout(() => setSelectedFirId(current), 10);
    }
  };

  const filteredFIRs = filterFirCases.filter(c => 
    c.CaseNo.includes(searchQuery) ||
    c.CrimeNo.includes(searchQuery) ||
    c.BriefFacts.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dark flex-1 h-full min-h-[calc(100vh-64px)] w-full bg-[#020617] text-[#e4e2e4] flex flex-col font-sans overflow-hidden select-none">
      
      {/* Stitch Design Top Header Component Inside the Page Wrapper */}
      <div className="flex justify-between items-center px-6 py-4 glass-panel border-b border-white/10 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#bec6e0] tracking-tight m-0">KSP Case Syndicate Tracer</h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#0f172a]/40 rounded-full border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-emerald absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Syndicate Link Detection Active</span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-xl text-sm font-bold shadow-[0_8px_30px_rgb(0,0,0,0.5)] border backdrop-blur-md transition-all duration-300" style={{
          backgroundColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          borderColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          color: notification.type === 'success' ? '#34d399' : '#f87171'
        }}>
          {notification.text}
        </div>
      )}

      {selectedFirId === null ? (
        // --- CASE LIST VIEW ---
        <div className="p-6 max-w-6xl mx-auto w-full h-full overflow-y-auto">
          <div className="glass-panel p-6 rounded-xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest m-0">
                {isOfficer ? 'Assigned Target Intel' : 'Active Investigation Cases'}
              </h3>
              <span className="text-xs text-slate-500 font-mono">Records: {filteredFIRs.length > 30 ? `Top 30 of ${filteredFIRs.length}` : filteredFIRs.length}</span>
            </div>

            <div className="relative mb-6">
              <span className="absolute left-4 top-3.5 text-slate-400">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                placeholder="Search by FIR, target, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#131315]/50 border border-white/10 rounded-lg text-sm text-[#e4e2e4] focus:outline-none focus:border-[#bec6e0] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFIRs.slice(0, 30).map((c) => (
                <div 
                  key={c.CaseMasterID}
                  onClick={() => setSelectedFirId(c.CaseMasterID)}
                  className="bg-[#1b1b1d]/50 border border-white/5 p-5 rounded-xl hover:bg-[#1f1f21] hover:border-[#bec6e0]/30 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#bec6e0] text-lg">FIR #{c.CaseNo}</span>
                      <span className="text-[10px] font-mono text-slate-500">{c.CrimeRegisteredDate}</span>
                    </div>
                    <p className="text-xs font-mono text-slate-500">ID: {c.CrimeNo}</p>
                    <p className="text-sm text-slate-400 line-clamp-2 pt-2 border-t border-white/5">
                      "{c.BriefFacts}"
                    </p>
                  </div>
                  <div className="mt-4 pt-3 flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#38BDF8]/10 text-[#38BDF8] text-[10px] font-bold uppercase tracking-wider group-hover:bg-[#38BDF8]/20 transition-colors">
                      <Network size={12} /> Init Trace
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // --- REACT FLOW VISUALIZER ---
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden relative">
          
          {/* Main Visualizer (9 cols) */}
          <div className="col-span-12 lg:col-span-9 h-full flex flex-col relative glass-panel rounded-xl border-white/10 overflow-hidden">
            
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <button 
                onClick={() => setSelectedFirId(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1b1b1d]/80 hover:bg-[#2a2a2b] rounded-lg border border-white/10 transition-all font-mono text-[11px] font-bold text-[#bec6e0]"
              >
                <ArrowLeft size={14} /> Close Trace
              </button>
            </div>

            <div className="absolute top-4 right-4 z-20 p-4 border-r border-t border-[#bec6e0]/20 flex flex-col items-end pointer-events-none">
              <span className="font-mono text-[10px] text-[#bec6e0]/40">SYS: ACTIVE_POLLING</span>
              <span className="font-mono text-[10px] text-[#bec6e0]/40">TARGET: FIR-{cases.find(c => c.CaseMasterID === selectedFirId)?.CaseNo}</span>
            </div>

            <div className="flex-1 grid-pattern">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-transparent"
                minZoom={0.2}
                maxZoom={4}
              >
                <Background color="#38BDF8" gap={24} size={1} className="opacity-20" />
                <Controls className="bg-[#1b1b1d] border-white/10 fill-[#bec6e0]" />
              </ReactFlow>
            </div>
          </div>

          {/* Sidebar Panel (3 cols) */}
          <div className="col-span-12 lg:col-span-3 h-full flex flex-col gap-4 overflow-y-auto">
            
            <div className="glass-panel rounded-xl border-white/10 flex-1 flex flex-col p-5">
              <div className="border-b border-white/10 pb-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#bec6e0]">
                  <Activity size={18} />
                  <h2 className="text-lg font-bold">Syndicate Profile</h2>
                </div>
              </div>

              {!selectedNodeData ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 bg-[#1b1b1d]/30 rounded-xl">
                  <ArrowUpRight size={32} className="text-slate-600 mb-3" />
                  <p className="text-sm text-slate-400">Select a node from the graph to inspect intelligence data.<br/><br/>Drag from one node to another to inter-connect them.</p>
                </div>
              ) : isEditingNode ? (
                <div className="flex-1 space-y-4">
                   <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Edit Profile: {selectedNodeData.label}</h3>
                   <form onSubmit={handleUpdateNode} className="space-y-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">{selectedNodeData.type === 'accused' || selectedNodeData.type === 'victim' ? 'Name (FIR Locked)' : 'Value/ID'}</label>
                        <input 
                           type="text" 
                           value={editNodeValue} 
                           onChange={e => setEditNodeValue(e.target.value)} 
                           disabled={selectedNodeData.type === 'accused' || selectedNodeData.type === 'victim'}
                           className={`w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] font-mono ${selectedNodeData.type === 'accused' || selectedNodeData.type === 'victim' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        />
                      </div>
                      {selectedNodeData.type === 'accused' || selectedNodeData.type === 'victim' ? (
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Age</label>
                            <input type="number" value={editSuspectAge} onChange={e => setEditSuspectAge(Number(e.target.value))} className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] font-mono" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Gender</label>
                            <select value={editSuspectGender} onChange={e => setEditSuspectGender(Number(e.target.value))} className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] font-mono">
                               <option value={1}>Male</option>
                               <option value={2}>Female</option>
                               <option value={3}>Other</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Description</label>
                          <textarea value={editNodeDesc} onChange={e => setEditNodeDesc(e.target.value)} className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] font-mono min-h-[80px]" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setIsEditingNode(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold">Cancel</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Save Changes</button>
                      </div>
                   </form>
                </div>
              ) : (
                <div className="flex-1 space-y-4">
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-[#bec6e0]/10 text-[#bec6e0] border border-[#bec6e0]/20">
                    {selectedNodeData.type}
                  </span>
                  
                  <h3 className="text-xl font-bold text-white break-words">
                    {selectedNodeData.label}
                  </h3>

                  <div className="space-y-4 pt-4 border-t border-white/10 text-sm">
                    {selectedNodeData.type === 'accused' && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Age & Gender</p>
                          <p className="text-slate-200">{selectedNodeData.rawData.age} Years • {selectedNodeData.rawData.gender}</p>
                        </div>
                      </>
                    )}

                    {selectedNodeData.type === 'victim' && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Age & Gender</p>
                          <p className="text-slate-200">{selectedNodeData.rawData.age} Years • {selectedNodeData.rawData.gender}</p>
                        </div>
                      </>
                    )}

                    {selectedNodeData.type === 'case' && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Internal ID</p>
                          <p className="text-slate-200 font-mono">{selectedNodeData.rawData.CrimeNo}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Summary</p>
                          <p className="text-slate-400 italic">"{selectedNodeData.rawData.BriefFacts}"</p>
                        </div>
                      </>
                    )}

                    {selectedNodeData.type !== 'case' && selectedNodeData.type !== 'accused' && selectedNodeData.type !== 'victim' && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Data Value</p>
                          <p className="text-slate-200 font-mono">{selectedNodeData.label}</p>
                        </div>
                        {selectedNodeData.rawData.description && (
                          <div>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Description</p>
                            <p className="text-slate-400 italic text-xs">{selectedNodeData.rawData.description}</p>
                          </div>
                        )}
                        {isCaseEditable(selectedFirId) && (
                          <div className="flex gap-2 mt-4">
                            <button 
                              onClick={() => {
                                setEditNodeValue(selectedNodeData.label);
                                setEditNodeDesc(selectedNodeData.rawData.description || '');
                                setIsEditingNode(true);
                              }}
                              className="flex-1 py-2 bg-blue-950/30 text-blue-400 border border-blue-900/50 hover:bg-blue-900/50 rounded-lg text-xs font-bold transition flex items-center justify-center"
                            >
                              Edit Profile
                            </button>
                            <button 
                              onClick={() => handleDeleteEntityNode(selectedNodeData.rawData.EntityID)}
                              className="flex-1 py-2 bg-red-950/30 text-[#ffb4ab] border border-red-900/50 hover:bg-red-900/50 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                            >
                              <Trash2 size={14} /> Purge
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isCaseEditable(selectedFirId) && (
              <div className="glass-panel rounded-xl border-white/10 p-5 shrink-0">
                <h4 className="text-xs font-bold text-[#bec6e0] uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
                  Inject Node
                </h4>
                <form onSubmit={handleAddEntityNode} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Type</label>
                    <select 
                      value={newEntityType}
                      onChange={(e) => setNewEntityType(e.target.value as any)}
                      className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] focus:ring-1 focus:ring-[#bec6e0] outline-none font-mono"
                    >
                      <option value="accused">Suspect (Person)</option>
                      <option value="Vehicle">Vehicle</option>
                      <option value="Phone">Phone</option>
                      <option value="Bank">Bank Account</option>
                      <option value="Location">Safehouse</option>
                      <option value="Weapon">Weapon</option>
                      <option value="Evidence">Evidence</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Value/ID</label>
                    <input 
                      type="text" 
                      value={newEntityValue}
                      onChange={(e) => setNewEntityValue(e.target.value)}
                      placeholder="e.g. KA-03-9999"
                      className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] focus:ring-1 focus:ring-[#bec6e0] outline-none font-mono"
                    />
                  </div>
                  {newEntityType !== 'accused' ? (
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Description (Optional)</label>
                      <textarea 
                        value={newEntityDesc}
                        onChange={(e) => setNewEntityDesc(e.target.value)}
                        placeholder="Add context..."
                        className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] focus:ring-1 focus:ring-[#bec6e0] outline-none font-mono min-h-[60px]"
                      />
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Age</label>
                        <input type="number" value={newSuspectAge} onChange={e => setNewSuspectAge(Number(e.target.value))} className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] font-mono" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">Gender</label>
                        <select value={newSuspectGender} onChange={e => setNewSuspectGender(Number(e.target.value))} className="w-full p-2.5 bg-[#1b1b1d] border border-white/10 rounded-lg text-sm text-[#e4e2e4] font-mono">
                           <option value={1}>Male</option>
                           <option value={2}>Female</option>
                           <option value={3}>Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-b from-[#38BDF8] to-[#0ea5e9] hover:brightness-110 active:scale-95 text-[#020617] font-bold py-2.5 rounded-lg text-sm shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Append
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
