import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { mockDb, EmployeeRow } from '../../utils/mockDb';
import { 
  Users, UserPlus, Search, Edit2, ShieldAlert, Trash2, 
  CheckCircle2, XCircle, Check, X, ShieldCheck 
} from 'lucide-react';

export const OfficerManagement: React.FC = () => {
  const location = useLocation();
  const [employees, setEmployees] = useState<EmployeeRow[]>(mockDb.getEmployees());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState<number | 'ALL'>('ALL');
  const [filterStation, setFilterStation] = useState<number | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string | 'ALL'>('ALL');
  
  // Roster Options for dropdowns
  const ranks = mockDb.getRanks();
  const designations = mockDb.getDesignations();
  const units = mockDb.getUnits();
  const districts = mockDb.getDistricts();

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [kgid, setKgid] = useState('');
  const [rankId, setRankId] = useState(1);
  const [designationId, setDesignationId] = useState(101);
  const [unitId, setUnitId] = useState(2001);
  const [districtId, setDistrictId] = useState(1001);
  const [dob, setDob] = useState('1990-01-01');
  const [appointmentDate, setAppointmentDate] = useState('2015-01-01');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [genderId, setGenderId] = useState(1);
  const [bloodGroupId, setBloodGroupId] = useState(1);
  const [physicallyChallenged, setPhysicallyChallenged] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Assign Officer Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignOfficerId, setAssignOfficerId] = useState<number | ''>('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignStationId, setAssignStationId] = useState<number | ''>('');

  // Auto-filter from AI Intelligence Center (instead of opening new officer form)
  useEffect(() => {
    if (location.state?.autoOpenAssign) {
      setAssignModalOpen(true);
      if (location.state?.prefillStationName) {
        const lowerName = location.state.prefillStationName.toLowerCase();
        const station = units.find(u => lowerName.includes(u.UnitName.toLowerCase()) || u.UnitName.toLowerCase().includes(lowerName));
        if (station) {
          setAssignStationId(station.UnitID);
        }
      }
      if (location.state?.prefillProblem) {
        setAssignInstructions(`Context: ${location.state.prefillProblem}\n\nPlease take immediate action.`);
      }
    }
  }, [location.state, units]);

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    if (modalOpen || assignModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen, assignModalOpen]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignOfficerId || !assignStationId) {
      showNotification('error', 'Please select an officer and a station.');
      return;
    }
    
    // Add notification to mockDb
    mockDb.createNotification(
      'New Assignment',
      `You have been reassigned/assigned new duties. Instructions: ${assignInstructions}`,
      Number(assignOfficerId)
    );
    
    showNotification('success', 'Assignment sent successfully.');
    setAssignModalOpen(false);
    setAssignInstructions('');
    setAssignOfficerId('');
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFirstName('');
    
    // Auto-generate next sequential KGID
    const maxKgidNum = employees.reduce((max, emp) => {
      const num = parseInt(emp.KGID.replace(/\D/g, ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 910928);
    setKgid(`KGID${maxKgidNum + 1}`);

    setRankId(ranks[0]?.RankID || 1);
    setDesignationId(designations[0]?.DesignationID || 101);
    setUnitId(units[0]?.UnitID || 2001);
    setDistrictId(districts[0]?.DistrictID || 1001);
    setDob('1990-01-01');
    setAppointmentDate('2015-01-01');
    setEmail('');
    setContact('');
    setGenderId(1);
    setBloodGroupId(1);
    setPhysicallyChallenged(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeRow) => {
    setEditingEmployee(emp);
    setFirstName(emp.FirstName);
    setKgid(emp.KGID);
    setRankId(emp.RankID);
    setDesignationId(emp.DesignationID);
    setUnitId(emp.UnitID);
    setDistrictId(emp.DistrictID);
    setDob(emp.EmployeeDOB);
    setAppointmentDate(emp.AppointmentDate);
    setEmail(emp.email || '');
    setContact(emp.contact || '');
    setGenderId(emp.GenderID);
    setBloodGroupId(emp.BloodGroupID);
    setPhysicallyChallenged(emp.PhysicallyChallenged);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !kgid || !email) {
      showNotification('error', 'Please fill in Name, KGID and Email.');
      return;
    }

    if (editingEmployee) {
      // Edit
      const success = mockDb.updateEmployee(editingEmployee.EmployeeID, {
        FirstName: firstName,
        KGID: kgid,
        RankID: rankId,
        DesignationID: designationId,
        UnitID: unitId,
        DistrictID: districtId,
        EmployeeDOB: dob,
        AppointmentDate: appointmentDate,
        email,
        contact,
        GenderID: genderId,
        BloodGroupID: bloodGroupId,
        PhysicallyChallenged: physicallyChallenged
      });
      if (success) {
        showNotification('success', `Officer ${firstName} details updated.`);
      }
    } else {
      // Add new
      mockDb.createEmployee({
        FirstName: firstName,
        KGID: kgid,
        RankID: rankId,
        DesignationID: designationId,
        UnitID: unitId,
        DistrictID: districtId,
        EmployeeDOB: dob,
        AppointmentDate: appointmentDate,
        email,
        contact,
        GenderID: genderId,
        BloodGroupID: bloodGroupId,
        PhysicallyChallenged: physicallyChallenged
      });
      showNotification('success', `Officer ${firstName} registered successfully.`);
    }

    setModalOpen(false);
    setEmployees(mockDb.getEmployees());
  };

  const handleSuspend = (id: number) => {
    const success = mockDb.suspendEmployee(id);
    if (success) {
      const updated = mockDb.getEmployees();
      setEmployees(updated);
      const officer = updated.find(e => e.EmployeeID === id);
      showNotification('success', `Officer ${officer?.FirstName} status toggled.`);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this officer profile? This action is irreversible.")) {
      const success = mockDb.deleteEmployee(id);
      if (success) {
        setEmployees(mockDb.getEmployees());
        showNotification('success', 'Officer profile deleted from database.');
      }
    }
  };

  // Filter list
  const filteredEmployees = employees.filter(emp => {
    if (filterDistrict !== 'ALL') {
      const station = units.find(u => u.UnitID === emp.UnitID);
      if (station?.DistrictID !== filterDistrict) return false;
    }
    if (filterStation !== 'ALL' && emp.UnitID !== filterStation) return false;
    if (filterStatus !== 'ALL' && emp.status !== filterStatus) return false;

    const term = searchQuery.toLowerCase();
    const rankName = ranks.find(r => r.RankID === emp.RankID)?.RankName.toLowerCase() || '';
    const unitName = units.find(u => u.UnitID === emp.UnitID)?.UnitName.toLowerCase() || '';
    return (
      emp.FirstName.toLowerCase().includes(term) ||
      emp.KGID.toLowerCase().includes(term) ||
      emp.EmployeeID.toString().includes(term) ||
      rankName.includes(term) ||
      unitName.includes(term)
    );
  });

  return (
    <div className="space-y-6 select-none">
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Roster Directory</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Manage active police officers and ranks</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-ksp-navy hover:bg-ksp-navy-light text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow"
        >
          <UserPlus size={16} /> Register Officer
        </button>
      </div>

      {/* Notification Toast */}
      {notification && typeof document !== 'undefined' && createPortal(
        <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-lg text-xs font-bold shadow-lg border ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.text}
        </div>,
        document.body
      )}

      {/* Roster Controls */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Search by Officer Name, KGID, Rank, Station..."
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
          {filterDistrict !== 'ALL' && units.filter(u => u.TypeID === 1 && u.DistrictID === filterDistrict).map(u => <option key={u.UnitID} value={u.UnitID}>{u.UnitName}</option>)}
        </select>
        
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-300 transition"
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Roster Table Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Emp ID</th>
              <th className="p-4">KGID</th>
              <th className="p-4">Officer Name</th>
              <th className="p-4">Rank / Designation</th>
              <th className="p-4">Police Station / District</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredEmployees.slice(0, 50).map((emp) => {
              const rankName = ranks.find(r => r.RankID === emp.RankID)?.RankName || 'Unknown';
              const desigName = designations.find(d => d.DesignationID === emp.DesignationID)?.DesignationName || 'Unknown';
              const unitName = units.find(u => u.UnitID === emp.UnitID)?.UnitName || 'Unknown';
              const distName = districts.find(d => d.DistrictID === emp.DistrictID)?.DistrictName || 'Unknown';

              return (
                <tr key={emp.EmployeeID} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-slate-500">{emp.EmployeeID}</td>
                  <td className="p-4 font-semibold text-ksp-navy">{emp.KGID}</td>
                  <td className="p-4 font-bold text-slate-900">{emp.FirstName}</td>
                  <td className="p-4 leading-normal">
                    <span className="font-semibold text-slate-700 block">{rankName}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{desigName}</span>
                  </td>
                  <td className="p-4 leading-normal">
                    <span className="font-semibold text-slate-700 block">{unitName}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{distName}</span>
                  </td>
                  <td className="p-4">
                    {emp.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <XCircle size={12} /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 text-slate-500 hover:text-ksp-blue bg-slate-100 hover:bg-blue-50 border rounded transition"
                        title="Edit Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleSuspend(emp.EmployeeID)}
                        className={`p-1.5 rounded border transition ${
                          emp.status === 'Active' 
                            ? 'text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50' 
                            : 'text-amber-600 hover:text-emerald-600 bg-amber-50 hover:bg-emerald-50 border-amber-200'
                        }`}
                        title={emp.status === 'Active' ? "Suspend Profile" : "Activate Profile"}
                      >
                        <ShieldAlert size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.EmployeeID)}
                        className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 border rounded transition"
                        title="Delete Profile"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-8 text-slate-400 font-bold">No active officer records found matching filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / Create Form Modal dialog */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm !mt-0">
          <div className="bg-white rounded-xl shadow-2xl border max-w-xl w-full relative overflow-hidden my-8">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ksp-navy"></div>
            
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-ksp-navy uppercase">
                {editingEmployee ? 'Modify Officer Roster Profile' : 'Register New Police Officer'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Ramesh Gowda"
                    className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">KGID Number</label>
                  <input 
                    type="text" 
                    value={kgid}
                    disabled
                    className="w-full p-2 bg-slate-100 border rounded text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Email (Official)</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@ksp.gov.in"
                    className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Contact Number</label>
                  <input 
                    type="text" 
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+91 99000 00000"
                    className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Rank</label>
                  <select 
                    value={rankId}
                    onChange={(e) => setRankId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                  >
                    {ranks.map(r => <option key={r.RankID} value={r.RankID}>{r.RankName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Designation</label>
                  <select 
                    value={designationId}
                    onChange={(e) => setDesignationId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                  >
                    {designations.map(d => <option key={d.DesignationID} value={d.DesignationID}>{d.DesignationName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Assigned Police Station</label>
                  <select 
                    value={unitId}
                    onChange={(e) => setUnitId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                  >
                    {units.map(u => <option key={u.UnitID} value={u.UnitID}>{u.UnitName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Assigned District</label>
                  <select 
                    value={districtId}
                    onChange={(e) => setDistrictId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ksp-navy"
                  >
                    {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Date of Appointment</label>
                  <input 
                    type="date" 
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Physically Challenged Status</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      checked={physicallyChallenged}
                      onChange={(e) => setPhysicallyChallenged(e.target.checked)}
                      className="w-4 h-4 text-ksp-navy focus:ring-ksp-navy rounded"
                    />
                    <span className="text-xs text-slate-600 font-semibold">Yes, listed in medical logs</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded text-xs border"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold px-5 py-2 rounded text-xs shadow"
                >
                  Save Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 !mt-0">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-ksp-navy text-white px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold uppercase tracking-widest text-sm m-0">Assign Officer</h3>
                <p className="text-[10px] text-slate-300 font-bold tracking-wider mt-0.5">Send Deployment Orders</p>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="hover:bg-white/10 p-1.5 rounded transition">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Target Station / Unit</label>
                <select 
                  value={assignStationId}
                  onChange={(e) => setAssignStationId(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border rounded text-xs font-semibold text-slate-700"
                >
                  <option value="">-- Select Target Area --</option>
                  {units.map(u => <option key={u.UnitID} value={u.UnitID}>{u.UnitName}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Select Existing Officer</label>
                <select 
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border rounded text-xs font-semibold text-slate-700"
                >
                  <option value="">-- Select Officer --</option>
                  {employees.filter(e => assignStationId ? e.UnitID === assignStationId || e.DistrictID === units.find(u=>u.UnitID === assignStationId)?.DistrictID : true).map(emp => (
                    <option key={emp.EmployeeID} value={emp.EmployeeID}>{emp.FirstName} - {emp.KGID}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Shows officers currently in the selected district.</p>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Assignment Instructions</label>
                <textarea 
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded text-xs font-semibold text-slate-700 h-24"
                  placeholder="Provide details about the reassignment or workload distribution..."
                />
              </div>
              
              <div className="border-t pt-4 flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setAssignModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded text-xs border"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-ksp-navy hover:bg-ksp-navy-light text-white font-bold px-5 py-2 rounded text-xs shadow"
                >
                  Send Assignment Orders
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
