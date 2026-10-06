"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Plus, Droplet, MapPin, Clock, ShieldCheck, Activity, 
  Settings, Users, BarChart3, HelpCircle, Heart, Search, CheckCircle
} from 'lucide-react';
import { RequestService } from "@/services/request.service";
import { DonorService } from "@/services/donor.service";
import { supabaseClient } from "@/lib/supabase/client";
import Map from '@/components/map/Map';
import type { BloodRequest } from "@/types";

type SidebarTab = 'dashboard' | 'tracking' | 'analytics' | 'records' | 'settings';

export default function HospitalDashboard() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [pulseLogs, setPulseLogs] = useState<any[]>([]);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Create Request Form State
  const [form, setForm] = useState({
    blood_group: 'O+',
    units: 1,
    patient_name: '',
    hospital_name: 'City General Hospital',
    city: 'Bangalore',
    contact_phone: '',
    urgency_level: 'IMMEDIATE',
    requester_name: 'Dr. Sarah K.',
    requester_relation: 'Doctor',
    note: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const activeRequests = await RequestService.getActiveRequests();
      setRequests(activeRequests as any);

      // Create map markers for hospitals
      const markers = activeRequests.map((r: any) => {
        const coords = r.location?.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
        const lng = coords ? parseFloat(coords[1]) : 77.5946;
        const lat = coords ? parseFloat(coords[2]) : 12.9716;
        
        return {
          id: r.id.toString(),
          lat,
          lng,
          label: `${r.blood_group} Needed: ${r.hospital_name}`,
          type: 'hospital'
        };
      });
      setMapMarkers(markers);

      // Populate mock pulse timeline actions based on request states
      const mockPulse = activeRequests.slice(0, 5).map((r: any, idx: number) => ({
        id: idx,
        message: `${r.blood_group} request created for ${r.patient_name || 'Emergency'} at ${r.hospital_name}`,
        time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: r.status === 'donor_accepted' ? 'success' : 'info'
      }));
      setPulseLogs(mockPulse);

    } catch (e) {
      console.error("Failed to fetch hospital dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates for requests
    const channel = supabaseClient.channel('hospital_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_requests' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [fetchData]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mock latitude/longitude offset around Bangalore center for simulation
      const randOffsetLat = (Math.random() - 0.5) * 0.05;
      const randOffsetLng = (Math.random() - 0.5) * 0.05;
      const lat = 12.9716 + randOffsetLat;
      const lng = 77.5946 + randOffsetLng;

      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: 'searching',
          latitude: lat,
          longitude: lng,
          location: `POINT(${lng} ${lat})`
        })
      });

      setShowCreateModal(false);
      setForm({
        blood_group: 'O+',
        units: 1,
        patient_name: '',
        hospital_name: 'City General Hospital',
        city: 'Bangalore',
        contact_phone: '',
        urgency_level: 'IMMEDIATE',
        requester_name: 'Dr. Sarah K.',
        requester_relation: 'Doctor',
        note: ''
      });
      await fetchData();
    } catch (error) {
      console.error("Intake creation failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-12 h-12 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]" />
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans flex selection:bg-[var(--color-primary-light)]">
      
      {/* ── Left Sidebar Nav ─────────────────────────────────────────── */}
      <aside className="w-[260px] bg-[var(--color-bg-elevated)] border-r border-[var(--color-border)] flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-3">
            <Droplet className="w-6 h-6 fill-[var(--color-primary)] stroke-[var(--color-primary)]" />
            <span className="text-xl font-bold tracking-tight">Blood Axis</span>
          </Link>
          
          <div className="space-y-1">
            {[
              { id: 'dashboard', label: 'Command Center', icon: Activity },
              { id: 'tracking', label: 'Live Donor Map', icon: MapPin },
              { id: 'analytics', label: 'Analytics Grid', icon: BarChart3 },
              { id: 'settings', label: 'Workspace Settings', icon: Settings }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SidebarTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === item.id 
                      ? 'bg-[var(--color-base-100)] text-[var(--color-text-primary)] shadow-sm' 
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-base-50)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[var(--color-base-50)] border border-[var(--color-border)] p-4 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold">H</div>
          <div>
            <p className="text-xs font-bold text-[var(--color-text-primary)]">Sarah K.</p>
            <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">Coordinator</p>
          </div>
        </div>
      </aside>

      {/* ── Right Content Grid ─────────────────────────────────────────── */}
      <main className="flex-1 p-8 flex flex-col overflow-y-auto max-w-[1400px] mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Emergency Command Console</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">Real-time coordinates and bento metrics for City General Hospital.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-cta-hover)] text-white font-bold px-6 py-3.5 rounded-[var(--radius-button)] shadow-[var(--shadow-card-hover)] transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Blood Request
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Cell 1: Active Requests (8 Columns) */}
            <div className="lg:col-span-8 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                <h2 className="text-lg font-bold">Active Emergency Broadcasts</h2>
                <span className="bg-[var(--color-base-100)] text-[var(--color-text-secondary)] font-mono text-xs px-2.5 py-1 rounded-md font-bold">
                  {requests.length} ONGOING
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[var(--color-text-muted)] text-xs font-bold uppercase border-b border-[var(--color-border)]">
                      <th className="pb-3">Blood Group</th>
                      <th className="pb-3">Patient</th>
                      <th className="pb-3">Urgency</th>
                      <th className="pb-3">Units Required</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                          No active requests found. Click Create Request to start matching.
                        </td>
                      </tr>
                    ) : (
                      requests.map((req: any) => (
                        <tr key={req.id} className="hover:bg-[var(--color-base-50)] transition-colors">
                          <td className="py-4">
                            <span className="inline-flex w-10 h-10 rounded-xl bg-[var(--color-danger-light)] text-[var(--color-danger)] font-black justify-center items-center font-mono text-base border border-transparent">
                              {req.blood_group}
                            </span>
                          </td>
                          <td className="py-4">
                            <p className="font-bold text-[var(--color-text-primary)]">{req.patient_name || 'Emergency Patient'}</p>
                            <p className="text-xs text-[var(--color-text-muted)] font-medium">{req.hospital_name}</p>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              req.urgency_level === 'IMMEDIATE' 
                                ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]' 
                                : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                            }`}>
                              {req.urgency_level}
                            </span>
                          </td>
                          <td className="py-4 font-mono font-bold text-[var(--color-text-secondary)]">
                            {req.units} Unit{req.units > 1 ? 's' : ''}
                          </td>
                          <td className="py-4 text-right">
                            <Link 
                              href={`/request/${req.id}`}
                              className="text-xs font-bold bg-[var(--color-base-100)] hover:bg-[var(--color-base-200)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg transition-colors inline-block"
                            >
                              Track Live
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cell 2: Live Map & Pulse (4 Columns) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Live Donor Map */}
              <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-6 space-y-4">
                <h2 className="text-lg font-bold">Geospatial Matches</h2>
                <div className="h-60 w-full rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-border)]">
                  <Map 
                    zoom={11}
                    center={[77.5946, 12.9716]}
                    markers={mapMarkers}
                    className="h-full w-full"
                  />
                </div>
              </div>

              {/* Live Pulse Timeline */}
              <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-6 space-y-4">
                <h2 className="text-lg font-bold">Matching Activity Pulse</h2>
                <div className="space-y-4">
                  {pulseLogs.map(log => (
                    <div key={log.id} className="flex gap-3 items-start text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[var(--color-text-secondary)] leading-normal">{log.message}</p>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono mt-0.5 block">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Create Request Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] w-full max-w-xl shadow-[var(--shadow-elevated)] p-8 space-y-6 relative">
              <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Create Emergency Blood Request</h2>
              
              <form onSubmit={handleCreateRequest} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase block mb-2">Blood Group</label>
                    <select
                      value={form.blood_group}
                      onChange={e => setForm({...form, blood_group: e.target.value})}
                      className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase block mb-2">Units Required</label>
                    <input
                      type="number" min="1" max="10"
                      value={form.units}
                      onChange={e => setForm({...form, units: parseInt(e.target.value) || 1})}
                      className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase block mb-2">Patient Name</label>
                  <input
                    type="text" required placeholder="e.g. Ramesh Kumar"
                    value={form.patient_name}
                    onChange={e => setForm({...form, patient_name: e.target.value})}
                    className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase block mb-2">Contact Phone</label>
                    <input
                      type="tel" required placeholder="e.g. +91..."
                      value={form.contact_phone}
                      onChange={e => setForm({...form, contact_phone: e.target.value})}
                      className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase block mb-2">Urgency Level</label>
                    <select
                      value={form.urgency_level}
                      onChange={e => setForm({...form, urgency_level: e.target.value})}
                      className="w-full bg-[var(--color-base-50)] border border-[var(--color-border)] rounded-[var(--radius-input)] py-3 px-4 text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="IMMEDIATE">Immediate</option>
                      <option value="TODAY">Today</option>
                      <option value="SCHEDULED">Scheduled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3.5 bg-[var(--color-base-100)] hover:bg-[var(--color-base-200)] text-[var(--color-text-primary)] font-bold rounded-[var(--radius-button)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-cta-hover)] text-white font-bold rounded-[var(--radius-button)] transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]"
                  >
                    Intake & Find Donors
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
