import React from 'react';
import { TransparentLogo } from './TransparentLogo';
import { mockDb } from '../../data/mockDb';

interface FIRDocumentProps {
  cDetails: any;
  user?: any;
}

export const FIRDocument: React.FC<FIRDocumentProps> = ({ cDetails, user }) => {
  const stations = mockDb.getUnits();
  const stationName = stations.find(s => s.UnitID === cDetails.PoliceStationID)?.UnitName || 'Koramangala PS';
  const categoryName = mockDb.getCaseCategories().find(c => c.CaseCategoryID === cDetails.CaseCategoryID)?.LookupValue || 'FIR';

  return (
    <div className="bg-white border-2 border-double border-slate-300 p-8 rounded-lg max-w-4xl mx-auto shadow-sm printable-fir-document text-left">
      
      {/* Letter Head Banner */}
      <div className="text-center border-b-2 border-ksp-navy pb-4 mb-6 space-y-1 relative">
        <div className="absolute left-0 top-0 h-16 w-16 opacity-80">
          <TransparentLogo 
            src="/ksp-logo-new.png" 
            alt="emblem" 
            className="h-full object-contain" 
          />
        </div>

        <h1 className="text-lg md:text-2xl font-extrabold text-ksp-navy tracking-tight m-0 uppercase">KARNATAKA STATE POLICE</h1>
        <h2 className="text-xs md:text-sm font-bold text-ksp-gold-dark m-0 uppercase tracking-widest">FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)</h2>
        <p className="text-[10px] text-slate-500 font-bold m-0 mt-1 uppercase">DISTRICT: {user?.districtName || 'BENGALURU CITY'} • STATION: {stationName}</p>
      </div>

      {/* Main Table Structure */}
      <div className="space-y-5 text-xs text-slate-800">
        
        <div className="grid grid-cols-2 border-b pb-2.5">
          <div><strong>1. Case ID:</strong> {cDetails.CaseNo}</div>
          <div className="text-right"><strong>2. Crime FIR Number:</strong> <span className="font-mono">{cDetails.CrimeNo}</span></div>
        </div>

        <div className="grid grid-cols-2 border-b pb-2.5">
          <div><strong>3. Registered Date:</strong> {cDetails.CrimeRegisteredDate}</div>
          <div className="text-right"><strong>4. Act Book Applied:</strong> {categoryName} {cDetails.BNSApplicable ? "(BNS Applicable)" : "(IPC Applicable)"}</div>
        </div>

        <div className="grid grid-cols-2 border-b pb-2.5">
          <div><strong>5. General Diary Entry:</strong> {cDetails.GDEntryNumber || 'N/A'}</div>
          <div className="text-right"><strong>6. GD Date & Time:</strong> {cDetails.GDEntryTimestamp?.replace('T', ' ').replace('Z', '') || 'N/A'}</div>
        </div>

        <div className="border-b pb-2.5">
          <strong>7. Act & Section Codes:</strong>
          <div className="mt-1 pl-4 space-y-1">
            {cDetails.Acts && cDetails.Acts.length > 0 ? cDetails.Acts.map((a: any, i: number) => (
              <p key={i} className="m-0">• {a.ActID} Section {a.SectionID}</p>
            )) : <p className="m-0 text-slate-400 italic">No Acts Listed</p>}
          </div>
        </div>

        <div className="border-b pb-2.5">
          <strong>8. Time & Place of Incident:</strong>
          <p className="m-0 pl-4 mt-1">Occurrence: {cDetails.IncidentFromDate.replace('T', ' ')} To: {cDetails.IncidentToDate.replace('T', ' ')}</p>
          <p className="m-0 pl-4">Information Received at PS: {cDetails.InfoReceivedPSDate.replace('T', ' ')}</p>
          <p className="m-0 pl-4">Delay in Reporting: {cDetails.DelayInReporting ? `Yes - ${cDetails.DelayReason}` : 'No'}</p>
        </div>

        <div className="border-b pb-2.5">
          <strong>9. Crime Scene Details:</strong>
          <p className="m-0 pl-4 mt-1">Location: {cDetails.CrimeSceneLocation || 'Not specified'}</p>
          <p className="m-0 pl-4">Distance & Direction from PS: {cDetails.DistanceDirection || 'Not specified'}</p>
          <p className="m-0 pl-4">Jurisdiction: {cDetails.JurisdictionFlag === 'Outside' ? 'Outside Station Jurisdiction' : 'Inside Station Jurisdiction'}</p>
        </div>

        <div className="border-b pb-2.5">
          <strong>10. Complainant / Informant:</strong>
          {cDetails.Complainant ? (
            <div className="mt-1 pl-4 space-y-1">
              <p className="m-0">Name: {cDetails.Complainant.ComplainantName}</p>
              <p className="m-0">Father/Spouse Name: {cDetails.Complainant.FatherSpouseName || 'Not recorded'}</p>
              <p className="m-0">Age: {cDetails.Complainant.AgeYear} Years | Occupation: {mockDb.getOccupations().find(o => o.OccupationID === cDetails.Complainant.OccupationID)?.OccupationName || 'Unknown'}</p>
              <p className="m-0">Contact Phone: {cDetails.Complainant.Phone || 'Not recorded'}</p>
              <p className="m-0">Permanent Address: {cDetails.Complainant.PermanentAddress || 'Not recorded'}</p>
              <p className="m-0">Identity Proof: {cDetails.Complainant.IdentityProof || 'Not recorded'}</p>
            </div>
          ) : (
            <p className="m-0 pl-4 text-slate-400 italic">No complainant listed</p>
          )}
        </div>

        <div className="border-b pb-2.5">
          <strong>11. Victim(s) Details:</strong>
          {cDetails.Victims && cDetails.Victims.length > 0 ? (
            <div className="mt-1 pl-4 space-y-2">
              {cDetails.Victims.map((v: any, i: number) => (
                <div key={i} className="border-l-2 border-slate-200 pl-2">
                  <p className="m-0 font-bold">{v.VictimName} (Age: {v.AgeYear})</p>
                  <p className="m-0">Relationship to Complainant: {v.RelationshipToComplainant || 'Not specified'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 pl-4 text-slate-400 italic">No victims listed</p>
          )}
        </div>

        <div className="border-b pb-2.5">
          <strong>12. List of Accused / Suspects:</strong>
          {cDetails.Accused && cDetails.Accused.length > 0 ? (
            <div className="mt-1 pl-4 space-y-3">
              {cDetails.Accused.map((ac: any, i: number) => (
                <div key={i} className="border-l-2 border-slate-200 pl-2">
                  <p className="m-0 font-bold">{ac.AccusedName} (Age: {ac.AgeYear}) [ID: {ac.PersonID}]</p>
                  <p className="m-0">Aliases: {ac.Aliases || 'None'}</p>
                  <p className="m-0">Father/Spouse Name: {ac.FatherSpouseName || 'Unknown'}</p>
                  <p className="m-0">Address: {ac.Address || 'Unknown'}</p>
                  <p className="m-0">Physical Description: {ac.PhysicalDescription || 'Not recorded'}</p>
                  <p className="m-0">Status: {ac.Status || 'Unknown'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 pl-4 text-slate-400 italic">No accused listed</p>
          )}
        </div>

        <div className="border-b pb-3">
          <strong>13. Brief Facts of Case Filed:</strong>
          <p className="mt-1 pl-4 leading-relaxed text-slate-600 italic">"{cDetails.BriefFacts}"</p>
        </div>
        
        {cDetails.StolenProperty && (
          <div className="border-b pb-3">
            <strong>14. Stolen/Involved Property Details:</strong>
            <p className="mt-1 pl-4 leading-relaxed text-slate-600 italic">{cDetails.StolenProperty}</p>
          </div>
        )}

        <div className="border-b pb-3 pt-2">
          <strong>15. Legal Closure & Dispatch:</strong>
          <p className="mt-1 pl-4 m-0">FIR read over to the complainant/informant, admitted to be correctly recorded, and a copy given free of cost.</p>
          <p className="pl-4 m-0">Dispatch Copy Handed Over: {cDetails.DispatchCopyHanded ? `Yes (Date: ${cDetails.DispatchCopyDate})` : 'No'}</p>
        </div>

        {/* Signatures */}
        <div className="pt-8 grid grid-cols-2 text-center select-none font-bold uppercase tracking-wider text-[10px]">
          <div>
            <div className="h-10 text-slate-600 italic">{cDetails.InformantSignature === 'Signed' ? '(Signature present)' : ''}</div>
            <p className="border-t border-slate-300 pt-2 w-48 mx-auto m-0">Signature of Complainant</p>
          </div>
          <div>
            <div className="h-10"></div>
            <p className="border-t border-slate-300 pt-2 w-48 mx-auto m-0">Signature of Recording Officer</p>
            <p className="text-[9px] text-slate-500 m-0 mt-1">Rank: {cDetails.RecordingOfficerRank || 'SHO'}</p>
          </div>
        </div>

      </div>

    </div>
  );
};
