import React from 'react';
import { CaseMasterRow } from '../../data/mockDb';

interface PrintFIRProps {
  firData: CaseMasterRow | null;
}

export const PrintFIR: React.FC<PrintFIRProps> = ({ firData }) => {
  if (!firData) return null;

  return (
    <div className="hidden print:block absolute inset-0 bg-white z-[99999] p-8 text-black" style={{ minHeight: '100vh' }}>
      <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-center">First Information Report (F.I.R)</h1>
        <h2 className="text-lg font-semibold text-center mt-2">(Under Section 154 Cr.P.C.)</h2>
        <h3 className="text-md text-center mt-1">Karnataka State Police</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div><span className="font-bold">1. District:</span> {firData.CaseMasterID /* placeholder for real join */}</div>
        <div><span className="font-bold">P.S.:</span> {firData.PoliceStationID}</div>
        <div><span className="font-bold">Year:</span> {new Date(firData.CrimeRegisteredDate).getFullYear()}</div>
        <div><span className="font-bold">FIR No.:</span> {firData.FIRNo || firData.CaseNo}</div>
        <div><span className="font-bold">Date:</span> {firData.CrimeRegisteredDate}</div>
      </div>

      <div className="mb-6">
        <h4 className="font-bold border-b border-black mb-2">2. Acts & Sections:</h4>
        <p className="text-sm">
          {/* Typically joined from ActSections table, using static fallback if not provided to layout */}
          {firData.BNSApplicable ? "BNS Applicable" : "IPC Applicable"}
        </p>
      </div>

      <div className="mb-6">
        <h4 className="font-bold border-b border-black mb-2">3. Occurrence of Offence:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-bold">Day:</span> {new Date(firData.IncidentFromDate).toLocaleDateString('en-IN', { weekday: 'long' })}</div>
          <div><span className="font-bold">Time Period:</span> {new Date(firData.IncidentFromDate).toLocaleTimeString()} to {new Date(firData.IncidentToDate).toLocaleTimeString()}</div>
          <div><span className="font-bold">Information Received Date:</span> {new Date(firData.InfoReceivedPSDate).toLocaleDateString()}</div>
          <div><span className="font-bold">Time:</span> {new Date(firData.InfoReceivedPSDate).toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-bold border-b border-black mb-2">4. Place of Occurrence:</h4>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {firData.CrimeSceneLocation || 'N/A'}
          <br/>
          <span className="font-bold">Direction and Distance from P.S:</span> {firData.DistanceDirection || 'N/A'}
        </p>
      </div>

      <div className="mb-6">
        <h4 className="font-bold border-b border-black mb-2">5. Brief Facts of the Case:</h4>
        <p className="text-sm leading-relaxed whitespace-pre-wrap min-h-[150px] border border-gray-300 p-3">
          {firData.BriefFacts || 'No facts recorded.'}
        </p>
      </div>

      <div className="mt-16 flex justify-between px-12">
        <div className="text-center">
          <div className="border-b border-black w-48 mb-2"></div>
          <span className="text-sm font-bold">Signature of Complainant/Informant</span>
        </div>
        
        <div className="text-center">
          <div className="border-b border-black w-48 mb-2"></div>
          <span className="text-sm font-bold">Signature of Officer in Charge</span>
          <br/>
          <span className="text-xs">Rank: {firData.RecordingOfficerRank || 'SHO'}</span>
        </div>
      </div>
    </div>
  );
};
