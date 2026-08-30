import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { mockDb, CaseMasterRow, EmployeeRow } from '../../utils/mockDb';
import { API_BASE_URL } from '../../config/api';
import { FileText, Search, Plus, Trash2, Edit2, ArrowLeftRight, Check, X, AlertTriangle, MapPin, User, Calendar, ShieldCheck } from 'lucide-react';
import { FIRDocument } from '../../components/FIRDocument';
import { getCasesForAnomaly } from '../../utils/anomalyFilters';
import { useLocation } from 'react-router-dom';

export const FIRManagement: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const [cases, setCases] = useState<CaseMasterRow[]>(mockDb.getCases());
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterDistrict, setFilterDistrict] = useState<number | 'ALL'>(() => {
    const dParam = searchParams.get('district');
    if (dParam) {
      const dist = mockDb.getDistricts().find(d => d.DistrictName === dParam);
      if (dist) return dist.DistrictID;
    }
    return 'ALL';
  });
  
  const [filterStation, setFilterStation] = useState<number | 'ALL'>(() => {
    const sParam = searchParams.get('station');
    if (sParam) {
      const stat = mockDb.getUnits().find(s => s.UnitName === sParam && s.TypeID === 1);
      if (stat) return stat.UnitID;
    }
    return 'ALL';
  });

  const [filterCrimeHead, setFilterCrimeHead] = useState<number | 'ALL'>(() => {
    const cParam = searchParams.get('crimeType');
    if (cParam) {
      const typeStr = cParam.toLowerCase().replace(/[^a-z]/g, '');
      const ch = mockDb.getCrimeHeads().find(c => c.CrimeGroupName.toLowerCase().replace(/[^a-z]/g, '').includes(typeStr) || typeStr.includes(c.CrimeGroupName.toLowerCase().replace(/[^a-z]/g, '')));
      if (ch) return ch.CrimeHeadID;
    }
    return 'ALL';
  });

  const [filterDateFrom, setFilterDateFrom] = useState<string>(searchParams.get('startDate') || '');
  const [filterDateTo, setFilterDateTo] = useState<string>(searchParams.get('endDate') || '');

  const [filterStatus, setFilterStatus] = useState<number | 'ALL'>('ALL');
  
  // Master Lists
  const employees = mockDb.getEmployees().filter(e => e.status === 'Active');
  const stations = mockDb.getUnits().filter(u => u.TypeID === 1);
  const districts = mockDb.getDistricts();
  const categories = mockDb.getCaseCategories();
  const gravityOffences = mockDb.getGravityOffences();
  const caseStatuses = mockDb.getCaseStatuses();
  const courts = mockDb.getCourts();
  const crimeHeads = mockDb.getCrimeHeads();
  const crimeSubHeads = mockDb.getCrimeSubHeads();
  const acts = mockDb.getActs();
  const sections = mockDb.getSections();
  const victims = mockDb.getVictims();
  const accused = mockDb.getAccused();

  const religions = mockDb.getReligions();
  const castes = mockDb.getCastes();
  const occupations = mockDb.getOccupations();
  const ranks = mockDb.getRanks();

  // Create Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseMasterRow | null>(null);
  const [transferOfficerId, setTransferOfficerId] = useState<number>(employees[0]?.EmployeeID || 9002);
  const [viewFirModalOpen, setViewFirModalOpen] = useState(false);
  const [selectedFirDetails, setSelectedFirDetails] = useState<any>(null);

  // Form states (Register FIR Wizard)
  const [step, setStep] = useState(1);
  const [caseCategory, setCaseCategory] = useState(1);
  const [gravity, setGravity] = useState(2);
  const [majorHead, setMajorHead] = useState(100);
  const [minorHead, setMinorHead] = useState(101);
  const [assignedOfficer, setAssignedOfficer] = useState(employees[0]?.EmployeeID || 9002);
  const [stationId, setStationId] = useState(2002);
  const [courtId, setCourtId] = useState(3001);
  
  const [incidentFrom, setIncidentFrom] = useState('2026-07-01T10:00');
  const [incidentTo, setIncidentTo] = useState('2026-07-01T12:00');
  const [infoReceived, setInfoReceived] = useState('2026-07-01T14:00');
  const [latitude, setLatitude] = useState(12.935);
  const [longitude, setLongitude] = useState(77.624);
  const [briefFacts, setBriefFacts] = useState('');

  // Complainant state
  const [compName, setCompName] = useState('');
  const [compAge, setCompAge] = useState(30);
  const [compGender, setCompGender] = useState(1);
  const [compOccupation, setCompOccupation] = useState(3);
  const [compReligion, setCompReligion] = useState(1);
  const [compCaste, setCompCaste] = useState(1);

  // Single Victim and Accused state (simplified for fast wizard entries)
  const [victimName, setVictimName] = useState('');
  const [victimAge, setVictimAge] = useState(30);
  const [victimGender, setVictimGender] = useState(1);
  const [victimPolice, setVictimPolice] = useState('0');

  const [accusedName, setAccusedName] = useState('');
  const [accusedAge, setAccusedAge] = useState(30);
  const [accusedGender, setAccusedGender] = useState(1);

  // New detailed FIR fields state
  const [compFatherSpouse, setCompFatherSpouse] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compIdentityProof, setCompIdentityProof] = useState('');
  
  const [victimRelationship, setVictimRelationship] = useState('');
  
  const [accusedFatherSpouse, setAccusedFatherSpouse] = useState('');
  const [accusedAddress, setAccusedAddress] = useState('');
  const [accusedAliases, setAccusedAliases] = useState('');
  const [accusedPhysicalDesc, setAccusedPhysicalDesc] = useState('');
  const [accusedStatus, setAccusedStatus] = useState<'Known' | 'Unknown'>('Known');
  
  const [gdEntryNumber, setGdEntryNumber] = useState('');
  const [delayInReporting, setDelayInReporting] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [bnsApplicable, setBnsApplicable] = useState(true);
  const [crimeSceneLocation, setCrimeSceneLocation] = useState('');
  const [distanceDirection, setDistanceDirection] = useState('');
  const [jurisdictionFlag, setJurisdictionFlag] = useState<'Inside' | 'Outside'>('Inside');
  const [stolenProperty, setStolenProperty] = useState('');

  // Act & Section
  const [selectedAct, setSelectedAct] = useState('IPC');
  const [selectedSection, setSelectedSection] = useState('307');

  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const stationOfficers = employees.filter(e => e.UnitID === stationId);
    if (stationOfficers.length > 0 && !stationOfficers.some(e => e.EmployeeID === assignedOfficer)) {
      setAssignedOfficer(stationOfficers[0].EmployeeID);
    }
  }, [stationId, employees]);

  // Bug 2: Prevent background scrolling when any modal is open
  useEffect(() => {
    if (modalOpen || transferModalOpen || viewFirModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen, transferModalOpen, viewFirModalOpen]);

  const handleOpenAdd = () => {
    setStep(1);
    setCaseCategory(1);
    setGravity(2);
    setMajorHead(100);
    setMinorHead(101);
    setAssignedOfficer(employees[0]?.EmployeeID || 9002);
    setStationId(2002);
    setCourtId(3001);
    setIncidentFrom('2026-07-01T10:00');
    setIncidentTo('2026-07-01T12:00');
    setInfoReceived('2026-07-01T14:00');
    setLatitude(12.935);
    setLongitude(77.624);
    setBriefFacts('');

    setCompName('');
    setCompAge(30);
    setCompGender(1);
    setCompOccupation(3);
    setCompReligion(1);
    setCompCaste(1);

    setVictimName('');
    setVictimAge(30);
    setVictimGender(1);
    setVictimPolice('0');

    setAccusedName('');
    setAccusedAge(30);
    setAccusedGender(1);

    setCompFatherSpouse('');
    setCompPhone('');
    setCompAddress('');
    setCompIdentityProof('');
    setVictimRelationship('');
    setAccusedFatherSpouse('');
    setAccusedAddress('');
    setAccusedAliases('');
    setAccusedPhysicalDesc('');
    setAccusedStatus('Known');
    setGdEntryNumber('');
    setDelayInReporting(false);
    setDelayReason('');
    setBnsApplicable(true);
    setCrimeSceneLocation('');
    setDistanceDirection('');
    setJurisdictionFlag('Inside');
    setStolenProperty('');

    setSelectedAct('IPC');
    setSelectedSection('307');
    setModalOpen(true);
  };

  const handleRegisterFIR = async () => {
    if (!gdEntryNumber || !crimeSceneLocation || !compName || !compPhone || !compAddress || !compFatherSpouse || !compIdentityProof || !briefFacts || !victimName || (accusedStatus === 'Known' && (!accusedName || !accusedFatherSpouse || !accusedAddress || !accusedPhysicalDesc))) {
      showNotification('error', 'Please fill all mandatory fields including GD Entry, Crime Scene, complete Complainant and Accused details.');
      return;
    }

    try {
      // Backend expects CaseMaster schema (it auto-generates CaseMasterID and CrimeRegisteredDateTime)
      const casePayload = {
          PolicePersonID: assignedOfficer,
          PoliceStationID: stationId,
          CaseCategoryID: caseCategory,
          GravityOffenceID: gravity,
          CrimeMajorHeadID: majorHead,
          CrimeMinorHeadID: minorHead,
          CaseStatusID: 1, // Under Investigation
          CourtID: courtId,
          IncidentFromDate: incidentFrom,
          IncidentToDate: incidentTo,
          InfoReceivedPSDate: infoReceived,
          latitude: Number(latitude),
          longitude: Number(longitude),
          BriefFacts: briefFacts,
          
          // Detailed FIR fields
          GDEntryNumber: gdEntryNumber,
          GDEntryTimestamp: gdEntryNumber ? new Date().toISOString() : undefined,
          DelayInReporting: delayInReporting,
          DelayReason: delayReason,
          BNSApplicable: bnsApplicable,
          CrimeSceneLocation: crimeSceneLocation,
          DistanceDirection: distanceDirection,
          JurisdictionFlag: jurisdictionFlag,
          StolenProperty: stolenProperty,
          InformantSignature: 'Signed',
          RecordingOfficerRank: 'SHO',
          DispatchCopyHanded: true,
          DispatchCopyDate: new Date().toISOString(),

          // Additional Parties Data (We must send this up so backend mock can save it)
          Complainant: {
            ComplainantName: compName,
            AgeYear: compAge,
            GenderID: compGender,
            OccupationID: compOccupation,
            ReligionID: compReligion,
            CasteID: compCaste,
            FatherSpouseName: compFatherSpouse,
            Phone: compPhone,
            PermanentAddress: compAddress,
            IdentityProof: compIdentityProof
          },
          Victim: {
            VictimName: victimName,
            AgeYear: victimAge,
            GenderID: victimGender,
            VictimPolice: victimPolice,
            RelationshipToComplainant: victimRelationship
          },
          Accused: {
            AccusedName: accusedName,
            AgeYear: accusedAge,
            GenderID: accusedGender,
            FatherSpouseName: accusedFatherSpouse,
            Address: accusedAddress,
            Aliases: accusedAliases,
            PhysicalDescription: accusedPhysicalDesc,
            Status: accusedStatus
          },
          Acts: [{
            ActID: selectedAct,
            SectionID: selectedSection,
            ActOrderID: 1,
            SectionOrderID: 1
          }]
      };

      const res = await fetch(`${API_BASE_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(casePayload)
      });
      
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      showNotification('success', 'FIR Case Registered officially and assigned.');
      setModalOpen(false);
      
      // Refresh only the cases to update the UI
      await mockDb.refreshCases();
      setCases(mockDb.getCases());
    } catch (e: any) {
      console.error("Error creating case:", e);
      showNotification('error', `Failed to save case record. Error: ${e.message}`);
    }
  };

  const handleDeleteCase = (id: number) => {
    if (window.confirm("Are you sure you want to delete this case? This will wipe the timeline and evidence locker.")) {
      const success = mockDb.deleteCase(id);
      if (success) {
        setCases(mockDb.getCases());
        showNotification('success', 'Case record deleted.');
      }
    }
  };

  const handleOpenTransfer = (c: CaseMasterRow) => {
    setSelectedCase(c);
    const stationOfficers = employees.filter(e => e.UnitID === c.PoliceStationID);
    setTransferOfficerId(stationOfficers[0]?.EmployeeID || 9002);
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const success = mockDb.transferCase(selectedCase.CaseMasterID, transferOfficerId);
    if (success) {
      showNotification('success', `Case assigned successfully to new IO.`);
      setTransferModalOpen(false);
      setCases(mockDb.getCases());
    } else {
      showNotification('error', 'Transfer failed.');
    }
  };

  const filteredCases = cases.filter(c => {
    // 1. Core exact-match anomaly filters
    const isAnomalyMatch = getCasesForAnomaly([c], {
      district: filterDistrict,
      station: filterStation,
      crimeType: filterCrimeHead,
      startDate: filterDateFrom,
      endDate: filterDateTo,
      status: filterStatus
    }).length === 1;

    if (!isAnomalyMatch) return false;

    // 2. Extra local text search
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const stationName = stations.find(s => s.UnitID === c.PoliceStationID)?.UnitName.toLowerCase() || '';
      const officerName = employees.find(e => e.EmployeeID === c.PolicePersonID)?.FirstName.toLowerCase() || '';
      
      const matchID = c.CaseNo.toLowerCase().includes(term) || c.CrimeNo.toLowerCase().includes(term);
      const matchFIR = c.FIRNo?.toLowerCase().includes(term);
      const matchStation = stationName.includes(term);
      const matchOfficer = officerName.includes(term);
      const matchFacts = c.BriefFacts?.toLowerCase().includes(term);
      
      if (!matchID && !matchFIR && !matchStation && !matchOfficer && !matchFacts) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Case Registry</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Register and transfer FIR case records</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-ksp-navy hover:bg-ksp-navy-light text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow border border-ksp-gold/25"
        >
          <Plus size={16} /> Register FIR Case
        </button>
      </div>

      {/* Bug 1: Fixed Notification with High Z-Index, rendered via Portal */}
      {notification && typeof document !== 'undefined' && createPortal(
        <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-lg text-xs font-bold shadow-lg border ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.text}
        </div>,
        document.body
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Search by FIR/Case Number, Station, Investigating Officer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-slate-300 transition"
          />
        </div>
        
        <select 
          value={filterDistrict}
          onChange={(e) => {
            setFilterDistrict(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
            setFilterStation('ALL');
          }}
          className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition"
        >
          <option value="ALL">All Districts</option>
          {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
        </select>

        <select 
          value={filterStation}
          onChange={(e) => setFilterStation(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          disabled={filterDistrict === 'ALL'}
          className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="ALL">All Stations in District</option>
          {filterDistrict !== 'ALL' && stations.filter(s => s.DistrictID === filterDistrict).map(s => <option key={s.UnitID} value={s.UnitID}>{s.UnitName}</option>)}
        </select>
        
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          className="w-full md:w-36 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition"
        >
          <option value="ALL">All Statuses</option>
          {caseStatuses.map(s => <option key={s.CaseStatusID} value={s.CaseStatusID}>{s.CaseStatusName}</option>)}
        </select>
        
        <select 
          value={filterCrimeHead}
          onChange={(e) => setFilterCrimeHead(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition"
        >
          <option value="ALL">All Crime Types</option>
          {crimeHeads.map(c => <option key={c.CrimeHeadID} value={c.CrimeHeadID}>{c.CrimeGroupName}</option>)}
        </select>
      </div>
      
      {/* Date Filters Row */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center mb-6">
         <div className="flex items-center gap-2">
           <Calendar size={14} className="text-slate-400" />
           <span className="text-xs font-bold text-slate-600">From:</span>
           <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="p-2 border rounded-lg text-xs" />
         </div>
         <div className="flex items-center gap-2">
           <Calendar size={14} className="text-slate-400" />
           <span className="text-xs font-bold text-slate-600">To:</span>
           <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="p-2 border rounded-lg text-xs" />
         </div>
         
         {(filterDistrict !== 'ALL' || filterStation !== 'ALL' || filterCrimeHead !== 'ALL' || filterStatus !== 'ALL' || filterDateFrom || filterDateTo || searchQuery) && (
            <button 
              onClick={() => {
                setFilterDistrict('ALL');
                setFilterStation('ALL');
                setFilterStatus('ALL');
                setFilterCrimeHead('ALL');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSearchQuery('');
              }}
              className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 transition"
            >
              Clear All Filters
            </button>
         )}
      </div>

      {/* Roster Table Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Case / FIR No.</th>
              <th className="p-4">Registered Date</th>
              <th className="p-4">Police Station</th>
              <th className="p-4">Investigating Officer</th>
              <th className="p-4">Victims</th>
              <th className="p-4">Accused</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCases.slice(0, 50).map((c) => {
              const stationName = stations.find(s => s.UnitID === c.PoliceStationID)?.UnitName || 'Unknown';
              const officer = employees.find(e => e.EmployeeID === c.PolicePersonID);
              const categoryName = categories.find(cat => cat.CaseCategoryID === c.CaseCategoryID)?.LookupValue.split(' ')[0] || 'FIR';
              const statusName = caseStatuses.find(s => s.CaseStatusID === c.CaseStatusID)?.CaseStatusName || 'Active';
              
              const caseVictims = victims.filter(v => v.CaseMasterID === c.CaseMasterID).map(v => v.VictimName).join(', ') || 'N/A';
              const caseAccused = accused.filter(a => a.CaseMasterID === c.CaseMasterID).map(a => a.AccusedName).join(', ') || 'Unknown';

              return (
                <tr key={c.CaseMasterID} className="hover:bg-slate-50 transition">
                  <td className="p-4 leading-normal">
                    <span className="font-bold text-slate-900 block">Case #{c.CaseNo}</span>
                    <span className="text-[10px] font-mono text-slate-400 block">{c.CrimeNo}</span>
                  </td>
                  <td className="p-4 font-semibold text-slate-600">{c.CrimeRegisteredDate}</td>
                  <td className="p-4 font-semibold text-slate-700">{stationName}</td>
                  <td className="p-4 font-bold text-slate-800">{officer ? officer.FirstName : 'Unassigned'}</td>
                  <td className="p-4 font-semibold text-slate-700 max-w-[120px] truncate" title={caseVictims}>{caseVictims}</td>
                  <td className="p-4 font-semibold text-slate-700 max-w-[120px] truncate" title={caseAccused}>{caseAccused}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 border text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {categoryName}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      c.CaseStatusID === 1 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : c.CaseStatusID === 2 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {statusName}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => {
                          setSelectedFirDetails(mockDb.getCaseDetails(c.CaseMasterID));
                          setViewFirModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border rounded transition"
                        title="View FIR"
                      >
                        <FileText size={14} />
                      </button>
                      <button 
                        onClick={() => handleOpenTransfer(c)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 border rounded transition"
                        title="Reassign Officer"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCase(c.CaseMasterID)}
                        className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 border rounded transition"
                        title="Delete Case"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredCases.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center p-8 text-slate-400 font-bold">No active FIR records found matching filters.</td>
              </tr>
            )}
            {filteredCases.length > 50 && (
              <tr>
                <td colSpan={9} className="text-center p-4 text-slate-500 font-semibold bg-slate-50 border-t">
                  Showing top 50 results out of {filteredCases.length}. Please use the search bar to refine.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transfer Officer Modal */}
      {transferModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm !mt-0">
          <div className="bg-white rounded-xl shadow-2xl border max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ksp-gold"></div>
            
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-ksp-navy uppercase">
                Reassign Case Investigation
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Transferring Case</label>
                <span className="text-xs font-bold text-slate-700 block">Case No: {selectedCase.CaseNo} ({selectedCase.CrimeNo})</span>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Select New Investigating Officer</label>
                <select 
                  value={transferOfficerId}
                  onChange={(e) => setTransferOfficerId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                >
                  {employees.filter(e => e.UnitID === selectedCase.PoliceStationID).map(e => <option key={e.EmployeeID} value={e.EmployeeID}>{e.FirstName} ({ranks.find(r => r.RankID === e.RankID)?.RankName})</option>)}
                </select>
              </div>

              <div className="border-t pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setTransferModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded text-xs border"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold px-4 py-1.5 rounded text-xs shadow"
                >
                  Reassign Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register FIR Wizard Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm !mt-0">
          <div className="bg-white rounded-xl shadow-2xl border max-w-2xl w-full relative overflow-hidden my-8">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ksp-navy"></div>
            
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-ksp-navy uppercase">
                  Register FIR Case File
                </h3>
                <span className="text-[10px] font-bold text-ksp-gold uppercase tracking-wider block mt-0.5">Wizard Step {step} of 3</span>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="px-6 py-3 bg-slate-50 border-b flex justify-around text-[10px] font-bold text-slate-400">
              <span className={step >= 1 ? "text-ksp-navy" : ""}>1. Case & Incidents</span>
              <span className={step >= 2 ? "text-ksp-navy" : ""}>2. Complainants & Parties</span>
              <span className={step >= 3 ? "text-ksp-navy" : ""}>3. Acts & Brief Facts</span>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              
              {/* Step 1: Case Details */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Case Category</label>
                      <select 
                        value={caseCategory}
                        onChange={(e) => setCaseCategory(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                      >
                        {categories.map(c => <option key={c.CaseCategoryID} value={c.CaseCategoryID}>{c.LookupValue}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Gravity Level</label>
                      <select 
                        value={gravity}
                        onChange={(e) => setGravity(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                      >
                        {gravityOffences.map(g => <option key={g.GravityOffenceID} value={g.GravityOffenceID}>{g.LookupValue}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Primary Crime Head (Major)</label>
                      <select 
                        value={majorHead}
                        onChange={(e) => setMajorHead(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                      >
                        {crimeHeads.map(ch => <option key={ch.CrimeHeadID} value={ch.CrimeHeadID}>{ch.CrimeGroupName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Sub Crime Head (Minor)</label>
                      <select 
                        value={minorHead}
                        onChange={(e) => setMinorHead(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                      >
                        {crimeSubHeads.filter(sh => sh.CrimeHeadID === majorHead).map(sh => <option key={sh.CrimeSubHeadID} value={sh.CrimeSubHeadID}>{sh.CrimeHeadName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Investigating Officer (Assigned)</label>
                      <select 
                        value={assignedOfficer}
                        onChange={(e) => setAssignedOfficer(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs"
                      >
                        {employees.filter(e => e.UnitID === stationId).map(e => <option key={e.EmployeeID} value={e.EmployeeID}>{e.FirstName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Filing Police Unit / Station</label>
                      <select 
                        value={stationId}
                        onChange={(e) => setStationId(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs"
                      >
                        {stations.map(u => <option key={u.UnitID} value={u.UnitID}>{u.UnitName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Incident Date (From)</label>
                      <input 
                        type="datetime-local" 
                        value={incidentFrom}
                        onChange={(e) => setIncidentFrom(e.target.value)}
                        className="w-full p-2 bg-slate-50 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Incident Date (To)</label>
                      <input 
                        type="datetime-local" 
                        value={incidentTo}
                        onChange={(e) => setIncidentTo(e.target.value)}
                        className="w-full p-2 bg-slate-50 border rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Crime Location (Latitude)</label>
                      <input 
                        type="number" 
                        step="0.0001"
                        value={latitude}
                        onChange={(e) => setLatitude(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                        placeholder="e.g. 12.9352"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Crime Location (Longitude)</label>
                      <input 
                        type="number" 
                        step="0.0001"
                        value={longitude}
                        onChange={(e) => setLongitude(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-ksp-navy"
                        placeholder="e.g. 77.6244"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-2">
                    <h4 className="text-[10px] font-bold text-ksp-navy uppercase tracking-wide mb-3 flex items-center gap-1.5"><MapPin size={12} /> Detailed Crime Scene Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">General Diary Entry Number</label>
                        <input type="text" value={gdEntryNumber} onChange={(e) => setGdEntryNumber(e.target.value)} placeholder="GD-123/26" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">BNS Applicable?</label>
                        <select value={bnsApplicable ? "1" : "0"} onChange={(e) => setBnsApplicable(e.target.value === "1")} className="w-full p-2 bg-white border rounded text-xs">
                          <option value="1">Yes</option>
                          <option value="0">No (IPC)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Delay In Reporting?</label>
                        <select value={delayInReporting ? "1" : "0"} onChange={(e) => setDelayInReporting(e.target.value === "1")} className="w-full p-2 bg-white border rounded text-xs">
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Delay Reason</label>
                        <input type="text" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} disabled={!delayInReporting} placeholder="Reason for delay..." className="w-full p-2 bg-white border rounded text-xs disabled:opacity-50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Crime Scene Location Description</label>
                        <input type="text" value={crimeSceneLocation} onChange={(e) => setCrimeSceneLocation(e.target.value)} placeholder="e.g. Near Metro Station" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Distance & Direction from PS</label>
                        <input type="text" value={distanceDirection} onChange={(e) => setDistanceDirection(e.target.value)} placeholder="e.g. 2 km North" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Jurisdiction</label>
                        <select value={jurisdictionFlag} onChange={(e) => setJurisdictionFlag(e.target.value as any)} className="w-full p-2 bg-white border rounded text-xs">
                          <option value="Inside">Inside Station Limits</option>
                          <option value="Outside">Outside Station Limits</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Step 2: Complainant / Victim / Accused */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Complainant */}
                  <div className="border p-4 rounded-lg bg-slate-50/50">
                    <h4 className="text-xs font-bold text-ksp-navy mb-3 flex items-center gap-1.5"><User size={14} /> Complainant Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Full Name</label>
                        <input type="text" value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="Rajesh Kumar" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Father/Spouse Name</label>
                        <input type="text" value={compFatherSpouse} onChange={(e) => setCompFatherSpouse(e.target.value)} placeholder="Suresh" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Contact Phone</label>
                        <input type="text" value={compPhone} onChange={(e) => setCompPhone(e.target.value)} placeholder="+91 9999999999" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Age (Years)</label>
                        <input type="number" value={compAge} onChange={(e) => setCompAge(Number(e.target.value))} className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Occupation</label>
                        <select value={compOccupation} onChange={(e) => setCompOccupation(Number(e.target.value))} className="w-full p-2 bg-white border rounded text-xs">
                          {occupations.map(o => <option key={o.OccupationID} value={o.OccupationID}>{o.OccupationName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Identity Proof</label>
                        <input type="text" value={compIdentityProof} onChange={(e) => setCompIdentityProof(e.target.value)} placeholder="Aadhaar ****1234" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Permanent Address</label>
                      <input type="text" value={compAddress} onChange={(e) => setCompAddress(e.target.value)} placeholder="House No, Street, City" className="w-full p-2 bg-white border rounded text-xs" />
                    </div>
                  </div>

                  {/* Victim */}
                  <div className="border p-4 rounded-lg bg-slate-50/50">
                    <h4 className="text-xs font-bold text-ksp-navy mb-3 flex items-center gap-1.5"><User size={14} /> Victim details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Full Name</label>
                        <input type="text" value={victimName} onChange={(e) => setVictimName(e.target.value)} placeholder="Suresh Kumar" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Age</label>
                        <input type="number" value={victimAge} onChange={(e) => setVictimAge(Number(e.target.value))} className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Relationship to Complainant</label>
                        <input type="text" value={victimRelationship} onChange={(e) => setVictimRelationship(e.target.value)} placeholder="Self / Son / None" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Is Police Officer?</label>
                        <select value={victimPolice} onChange={(e) => setVictimPolice(e.target.value)} className="w-full p-2 bg-white border rounded text-xs">
                          <option value="0">No, civilian</option>
                          <option value="1">Yes, active officer</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Accused */}
                  <div className="border p-4 rounded-lg bg-slate-50/50">
                    <h4 className="text-xs font-bold text-ksp-navy mb-3 flex items-center gap-1.5"><User size={14} /> Primary Accused</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Accused Name</label>
                        <input type="text" value={accusedName} onChange={(e) => setAccusedName(e.target.value)} placeholder="Harish" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Aliases</label>
                        <input type="text" value={accusedAliases} onChange={(e) => setAccusedAliases(e.target.value)} placeholder="Kariya" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Estimated Age</label>
                        <input type="number" value={accusedAge} onChange={(e) => setAccusedAge(Number(e.target.value))} className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Father/Spouse Name</label>
                        <input type="text" value={accusedFatherSpouse} onChange={(e) => setAccusedFatherSpouse(e.target.value)} placeholder="Ramesh" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Status</label>
                        <select value={accusedStatus} onChange={(e) => setAccusedStatus(e.target.value as any)} className="w-full p-2 bg-white border rounded text-xs">
                          <option value="Known">Known</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Address</label>
                        <input type="text" value={accusedAddress} onChange={(e) => setAccusedAddress(e.target.value)} placeholder="Address..." className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Physical Description</label>
                        <input type="text" value={accusedPhysicalDesc} onChange={(e) => setAccusedPhysicalDesc(e.target.value)} placeholder="e.g. Fair complexion, height 170cm" className="w-full p-2 bg-white border rounded text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Acts, Dates, Facts */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Act Book Code</label>
                      <select value={selectedAct} onChange={(e) => setSelectedAct(e.target.value)} className="w-full p-2 bg-slate-50 border rounded text-xs">
                        {acts.map(a => <option key={a.ActCode} value={a.ActCode}>{a.ShortName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Section Code Invoked</label>
                      <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full p-2 bg-slate-50 border rounded text-xs">
                        {sections.filter(s => s.ActCode === selectedAct).map(s => <option key={s.SectionCode} value={s.SectionCode}>{s.SectionCode} - {s.SectionDescription}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Incident From Date</label>
                      <input type="datetime-local" value={incidentFrom} onChange={(e) => setIncidentFrom(e.target.value)} className="w-full p-2 bg-slate-50 border rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Incident To Date</label>
                      <input type="datetime-local" value={incidentTo} onChange={(e) => setIncidentTo(e.target.value)} className="w-full p-2 bg-slate-50 border rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Info Received at PS</label>
                      <input type="datetime-local" value={infoReceived} onChange={(e) => setInfoReceived(e.target.value)} className="w-full p-2 bg-slate-50 border rounded text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Brief Facts of Occurrence</label>
                    <textarea 
                      rows={3}
                      value={briefFacts}
                      onChange={(e) => setBriefFacts(e.target.value)}
                      placeholder="Input comprehensive summary of findings, altercation, seized objects..."
                      className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Stolen/Involved Property Details (Optional)</label>
                    <textarea 
                      rows={2}
                      value={stolenProperty}
                      onChange={(e) => setStolenProperty(e.target.value)}
                      placeholder="e.g. 1 Gold Chain (20g), Cash Rs 10000"
                      className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                    />
                  </div>
                </div>
              )}

              {/* Wizard Navigations */}
              <div className="border-t pt-4 flex justify-between">
                <div>
                  {step > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setStep(step - 1)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded text-xs border"
                    >
                      Back
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded text-xs border"
                  >
                    Cancel
                  </button>
                  {step < 3 ? (
                    <button 
                      type="button" 
                      onClick={() => setStep(step + 1)}
                      className="bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold px-5 py-2 rounded text-xs shadow"
                    >
                      Next Step
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleRegisterFIR}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded text-xs shadow"
                    >
                      Register Case File
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* View FIR Modal */}
      {viewFirModalOpen && selectedFirDetails && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm !mt-0">
          <div className="bg-slate-100 rounded-xl shadow-2xl border max-w-5xl w-full relative overflow-hidden my-8 h-[90vh] flex flex-col">
            <div className="p-4 border-b bg-white flex justify-between items-center shrink-0">
              <h3 className="text-sm font-extrabold text-ksp-navy uppercase">
                View FIR Document
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="bg-white border hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
                >
                  <FileText size={14} /> Print
                </button>
                <button onClick={() => setViewFirModalOpen(false)} className="text-slate-400 hover:text-slate-600 ml-2">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-200/50">
              <FIRDocument cDetails={selectedFirDetails} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

