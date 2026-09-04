import { authFetch } from '../../utils/authFetch';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mockDb, CaseMasterRow, ComplainantRow, VictimRow, AccusedRow, ActSectionAssociationRow, ChargesheetRow, EvidenceFileRow, TimelineNoteRow } from '../../utils/mockDb';
import { 
  ArrowLeft, FileText, MessageSquare, Paperclip, ShieldAlert, 
  MapPin, User, Calendar, BookOpen, Clock, Plus, Upload, Check, Send, 
  Download, Printer, AlertCircle, FileCheck
} from 'lucide-react';
import { TransparentLogo } from '../../components/TransparentLogo';
import { FIRDocument } from '../../components/FIRDocument';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const caseId = Number(id);

  // States
  const [cDetails, setCDetails] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'evidence' | 'chargesheet' | 'print'>('overview');
  
  // Note Form
  const [eventType, setEventType] = useState('Note Added');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // Evidence Form
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceType, setEvidenceType] = useState('Image (JPEG)');
  
  // Chargesheet Form
  const [csType, setCsType] = useState('A'); // A, B, C

  const [statusVal, setStatusVal] = useState(1);

  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const data = mockDb.getCaseDetails(caseId);
    if (data) {
      setCDetails(data);
      setStatusVal(data.CaseStatusID);
    }
  }, [caseId]);

  if (!cDetails) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border font-bold text-slate-400">
        Case File not found in registry.
      </div>
    );
  }

  // Action: Add Timeline Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDesc) return;

    mockDb.addTimelineNote(caseId, {
      event_type: eventType,
      event_title: eventTitle,
      description: eventDesc,
      created_by: user?.firstName || 'Officer',
      created_at: new Date().toISOString()
    });

    showNotification('success', 'Investigation event logged in timeline.');
    setEventTitle('');
    setEventDesc('');
    setCDetails(mockDb.getCaseDetails(caseId)); // reload
  };

  // Action: Add Mock Evidence
  const handleUploadEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceName) return;

    mockDb.uploadEvidence(
      caseId,
      evidenceName,
      evidenceType,
      `/evidence/lockers/${String(evidenceName || '').toLowerCase().replace(/ /g, '_')}`,
      user?.firstName || 'Officer'
    );

    showNotification('success', 'Attachment uploaded to secure KSP evidence bucket.');
    setEvidenceName('');
    setCDetails(mockDb.getCaseDetails(caseId)); // reload
  };

  // Action: File Chargesheet
  const handleFileChargesheet = (e: React.FormEvent) => {
    e.preventDefault();
    mockDb.submitChargesheet({
      CaseMasterID: caseId,
      csdate: new Date().toISOString(),
      cstype: csType,
      PolicePersonID: user?.employeeId || 9002
    }, user?.email || 'officer@ksp.gov.in');

    showNotification('success', 'Chargesheet dispatched to Court.');
    setStatusVal(2); // update status local
    setCDetails(mockDb.getCaseDetails(caseId)); // reload
  };

  // Action: Update Status
  const handleStatusChange = async (newStatusId: number) => {
    try {
      showNotification('info', 'Updating status...');
      const response = await authFetch(`${API_BASE_URL}/api/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CaseStatusID: newStatusId,
          userEmail: user?.email || 'officer@ksp.gov.in'
        })
      });

      if (!response.ok) {
        throw new Error('Backend update failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Only update local UI state AFTER successful backend update
        setStatusVal(newStatusId);
        // Refresh local mockDb for consistency so that other tabs might see the change
        mockDb.updateCaseStatus(caseId, newStatusId, user?.email || 'officer@ksp.gov.in', true); 
        setCDetails(mockDb.getCaseDetails(caseId)); 
        showNotification('success', 'Investigation status updated securely on CloudScale.');
      } else {
        throw new Error('Backend returned false');
      }
    } catch (err) {
      showNotification('error', 'Failed to update status. Previous state preserved.');
      // DO NOT update setStatusVal to prevent false-success UI state
    }
  };

  // Master lists mapping names
  const stations = mockDb.getUnits();
  const stationName = stations.find(s => s.UnitID === cDetails.PoliceStationID)?.UnitName || 'Koramangala PS';
  const categoryName = mockDb.getCaseCategories().find(c => c.CaseCategoryID === cDetails.CaseCategoryID)?.LookupValue || 'FIR';
  const gravityName = mockDb.getGravityOffences().find(g => g.GravityOffenceID === cDetails.GravityOffenceID)?.LookupValue || 'Non-Heinous';
  const statusName = mockDb.getCaseStatuses().find(s => s.CaseStatusID === cDetails.CaseStatusID)?.CaseStatusName || 'Under Investigation';
  const courtName = mockDb.getCourts().find(ct => ct.CourtID === cDetails.CourtID)?.CourtName || 'District Court';

  const tabClass = (tab: typeof activeTab) => 
    `px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
      activeTab === tab 
        ? 'border-ksp-navy text-ksp-navy bg-slate-50 font-extrabold' 
        : 'border-transparent text-slate-400 hover:text-slate-600'
    }`;

  return (
    <div className="space-y-6 select-none">
      
      {/* Back button & title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link to="/officer-portal" className="text-xs font-bold text-ksp-blue hover:text-ksp-navy flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 pt-1">
            <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">Case File #{cDetails.CaseNo}</h2>
            <span className="text-xs font-mono text-slate-400">({cDetails.CrimeNo})</span>
          </div>
        </div>

        {/* Live Status Controller */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Investigation Status:</span>
          <select 
            value={statusVal}
            onChange={(e) => handleStatusChange(Number(e.target.value))}
            className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-ksp-navy focus:outline-none focus:ring-1 focus:ring-ksp-navy shadow-sm"
          >
            {mockDb.getCaseStatuses().map(s => <option key={s.CaseStatusID} value={s.CaseStatusID}>{s.CaseStatusName}</option>)}
          </select>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-lg text-xs font-bold shadow border ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.text}
        </div>
      )}

      {/* Tabs list */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
        <div className="border-b flex overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={tabClass('overview')}>Overview</button>
          <button onClick={() => setActiveTab('timeline')} className={tabClass('timeline')}>Timeline Notes ({cDetails.Timeline.length})</button>
          <button onClick={() => setActiveTab('evidence')} className={tabClass('evidence')}>Evidence Locker ({cDetails.Evidence.length})</button>
          <button onClick={() => setActiveTab('chargesheet')} className={tabClass('chargesheet')}>Chargesheet Filing</button>
          <button onClick={() => setActiveTab('print')} className={tabClass('print')}>Print/Download FIR</button>
        </div>

        {/* Tab content viewport */}
        <div className="p-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Crime brief summary */}
              <div className="bg-slate-50 border p-4 rounded-lg leading-relaxed">
                <h4 className="text-xs font-bold text-ksp-navy uppercase mb-2">Facts of Occurrence & Incident Brief</h4>
                <p className="text-xs text-slate-600 font-medium m-0">"{cDetails.BriefFacts}"</p>
              </div>

              {/* Grid cards Complainants / Victims / Accused */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Complainant card */}
                <div className="bg-white rounded-lg border p-4 space-y-3">
                  <h4 className="text-xs font-bold text-ksp-navy border-b pb-1.5 flex items-center gap-1"><User size={14} /> Complainant</h4>
                  {cDetails.Complainant ? (
                    <div className="text-xs space-y-1 text-slate-600 font-semibold">
                      <p className="text-slate-900 font-bold text-sm m-0 mb-1">{cDetails.Complainant.ComplainantName}</p>
                      <p className="m-0">Age: {cDetails.Complainant.AgeYear} Years</p>
                      <p className="m-0">Occupation: {mockDb.getOccupations().find(o => o.OccupationID === cDetails.Complainant.OccupationID)?.OccupationName}</p>
                      <p className="m-0">Religion: {mockDb.getReligions().find(r => r.ReligionID === cDetails.Complainant.ReligionID)?.ReligionName}</p>
                      <p className="m-0">Caste: {mockDb.getCastes().find(c => c.caste_master_id === cDetails.Complainant.CasteID)?.caste_master_name}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">No Complainant listed</span>
                  )}
                </div>

                {/* Victims Card */}
                <div className="bg-white rounded-lg border p-4 space-y-3">
                  <h4 className="text-xs font-bold text-ksp-navy border-b pb-1.5 flex items-center gap-1"><User size={14} /> Victims Mapped</h4>
                  <div className="space-y-3">
                    {cDetails.Victims.map((v: VictimRow) => (
                      <div key={v.VictimMasterID} className="text-xs text-slate-600 font-semibold">
                        <p className="text-slate-900 font-bold m-0">{v.VictimName}</p>
                        <p className="m-0 text-[10px] text-slate-400">Age: {v.AgeYear} Years | Police Officer: {v.VictimPolice === '1' ? 'Yes' : 'No'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accused Card */}
                <div className="bg-white rounded-lg border p-4 space-y-3">
                  <h4 className="text-xs font-bold text-ksp-navy border-b pb-1.5 flex items-center gap-1"><User size={14} /> Accused / Suspects</h4>
                  <div className="space-y-3">
                    {cDetails.Accused.map((a: AccusedRow) => (
                      <div key={a.AccusedMasterID} className="text-xs text-slate-600 font-semibold">
                        <p className="text-slate-900 font-bold m-0">{a.AccusedName} ({a.PersonID})</p>
                        <p className="m-0 text-[10px] text-slate-400">Age: {a.AgeYear} Years</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Roster / Act Details */}
              <div className="bg-white rounded-lg border p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-ksp-navy border-b pb-1.5 mb-3 flex items-center gap-1.5"><BookOpen size={14} /> Penal Acts & Sections</h4>
                  <div className="space-y-2">
                    {cDetails.Acts.map((act: ActSectionAssociationRow, idx: number) => {
                      const desc = mockDb.getSections().find(s => s.ActCode === act.ActID && s.SectionCode === act.SectionID)?.SectionDescription;
                      return (
                        <div key={idx} className="text-xs font-semibold text-slate-700">
                          <span className="bg-slate-100 border text-slate-800 px-1.5 py-0.5 rounded text-[10px] mr-1.5">{act.ActID} Sec {act.SectionID}</span>
                          <span className="text-slate-500 font-medium">{desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ksp-navy border-b pb-1.5 mb-3 flex items-center gap-1.5"><Clock size={14} /> Occurrence Times</h4>
                  <div className="text-xs space-y-1.5 text-slate-600 font-semibold">
                    <p className="m-0"><strong>Incident Time range:</strong> {cDetails.IncidentFromDate.replace('T', ' ').substring(0, 16)} to {cDetails.IncidentToDate.replace('T', ' ').substring(0, 16)}</p>
                    <p className="m-0"><strong>Station Received report:</strong> {cDetails.InfoReceivedPSDate.replace('T', ' ').substring(0, 16)}</p>
                    <p className="m-0"><strong>Filing Station Court:</strong> {courtName}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TIMELINE NOTES */}
          {activeTab === 'timeline' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Timeline feed */}
              <div className="xl:col-span-2 space-y-6 relative pl-4 border-l">
                {cDetails.Timeline.map((note: TimelineNoteRow) => (
                  <div key={note.NoteID} className="relative space-y-1">
                    {/* Circle Bullet */}
                    <span className="absolute -left-[22px] top-1 bg-ksp-navy text-white rounded-full w-3.5 h-3.5 border-2 border-white ring-2 ring-slate-100 flex items-center justify-center"></span>
                    
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-900 m-0">{note.event_title}</h4>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{note.created_at.replace('T', ' ').substring(0, 16)}</span>
                    </div>
                    <span className="bg-slate-100 border text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded w-fit block uppercase tracking-wider">
                      {note.event_type} • By {note.created_by}
                    </span>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium m-0 pt-1">
                      {note.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add Note Form */}
              <div className="bg-slate-50 p-5 rounded-lg border h-fit space-y-4">
                <h4 className="text-xs font-bold text-ksp-navy border-b pb-2 flex items-center gap-1.5"><Plus size={16} /> Log Investigation Event</h4>
                
                <form onSubmit={handleAddNote} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Event Type</label>
                    <select 
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full p-2 bg-white border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                    >
                      <option value="Note Added">General Case Note</option>
                      <option value="Spot Mahazar Conducted">Spot Mahazar</option>
                      <option value="Witness Statement Logged">Witness Statement</option>
                      <option value="Offender Arrested">Arrest Event</option>
                      <option value="Seizure Conducted">Seizure Mahazar</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Event Title</label>
                    <input 
                      type="text" 
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Conducted raid near metro"
                      className="w-full p-2 bg-white border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Description / Findings</label>
                    <textarea 
                      rows={3}
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      placeholder="Input complete details..."
                      className="w-full p-2 bg-white border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold py-2 rounded text-xs shadow flex items-center justify-center gap-1"
                  >
                    <Send size={12} /> Log Event
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: EVIDENCE LOCKER */}
          {activeTab === 'evidence' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Evidence grid */}
              <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cDetails.Evidence.map((ev: EvidenceFileRow) => (
                  <div key={ev.EvidenceID} className="bg-white rounded-lg border p-4 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-xs text-slate-900 truncate block max-w-[150px]">{ev.file_name}</span>
                        <span className="bg-blue-50 border text-ksp-blue text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">
                          {ev.file_type}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold m-0">Uploaded: {ev.uploaded_at.substring(0, 10)}</p>
                      <p className="text-[9px] text-slate-400 font-bold m-0 mt-0.5">By Officer: {ev.uploaded_by}</p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t flex justify-between items-center text-[10px] font-bold text-ksp-blue">
                      <span className="cursor-pointer hover:underline flex items-center gap-0.5"><Download size={12} /> Download file</span>
                    </div>
                  </div>
                ))}

                {cDetails.Evidence.length === 0 && (
                  <div className="bg-white p-12 rounded-lg border border-dashed text-center text-slate-400 font-bold col-span-2">
                    Locker is empty. Add multimedia evidence attachments.
                  </div>
                )}
              </div>

              {/* Upload form */}
              <div className="bg-slate-50 p-5 rounded-lg border h-fit space-y-4">
                <h4 className="text-xs font-bold text-ksp-navy border-b pb-2 flex items-center gap-1.5"><Upload size={16} /> Secure Upload Attachment</h4>
                
                <form onSubmit={handleUploadEvidence} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">File Label Name</label>
                    <input 
                      type="text" 
                      value={evidenceName}
                      onChange={(e) => setEvidenceName(e.target.value)}
                      placeholder="e.g. Crime Scene Photo 1"
                      className="w-full p-2 bg-white border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Attachment Type</label>
                    <select 
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value)}
                      className="w-full p-2 bg-white border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                    >
                      <option value="Image (JPEG)">Image (JPEG/PNG)</option>
                      <option value="Video (MP4)">Video Clip (MP4)</option>
                      <option value="PDF Document">Medical Report (PDF)</option>
                      <option value="FSL Laboratory">FSL Report (PDF)</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold py-2 rounded text-xs shadow flex items-center justify-center gap-1"
                  >
                    <Plus size={12} /> Secure Upload
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: CHARGESHEET FILING */}
          {activeTab === 'chargesheet' && (
            <div className="max-w-xl mx-auto bg-slate-50 p-6 rounded-xl border shadow-inner space-y-4">
              
              {cDetails.Chargesheet ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-lg text-center space-y-3">
                  <FileCheck className="text-emerald-600 mx-auto" size={36} />
                  <h4 className="text-sm font-bold m-0 uppercase tracking-wider">Chargesheet Dispatched</h4>
                  <p className="text-xs leading-relaxed max-w-sm mx-auto font-medium text-emerald-700/80">
                    A final report (Report Type: **Type {cDetails.Chargesheet.cstype}**) was submitted and logged under CSID #{cDetails.Chargesheet.CSID} on {cDetails.Chargesheet.csdate.substring(0, 10)}. Investigation is officially closed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-lg text-xs leading-relaxed font-semibold">
                    <AlertCircle className="shrink-0 text-amber-500 mt-0.5" size={16} />
                    <span>⚠️ Warning: Filing the final report sends details directly to court and closes this active case file in the registry.</span>
                  </div>

                  <form onSubmit={handleFileChargesheet} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Final Report Category Code</label>
                      <select 
                        value={csType}
                        onChange={(e) => setCsType(e.target.value)}
                        className="w-full p-2.5 bg-white border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                      >
                        <option value="A">Type A: Chargesheet Filed (Accused prosecuted)</option>
                        <option value="B">Type B: False / Mistake of Fact Case (Closed)</option>
                        <option value="C">Type C: Undetected (Absconding / Untraced)</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded text-xs shadow flex items-center justify-center gap-1.5"
                    >
                      <Send size={14} /> Submit Final Report to Court
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: PRINT / PDF PREVIEW */}
          {activeTab === 'print' && (
            <div className="space-y-6">
              
              {/* Controls */}
              <div className="flex justify-end gap-2 border-b pb-3 no-print select-none">
                <button 
                  onClick={() => window.print()}
                  className="bg-ksp-navy hover:bg-ksp-navy-light text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Printer size={16} /> Print FIR Copy
                </button>
              </div>

              {/* FIR Printable Canvas */}
              <FIRDocument cDetails={cDetails} user={user} />

            </div>
          )}

        </div>
      </div>

    </div>
  );
};
