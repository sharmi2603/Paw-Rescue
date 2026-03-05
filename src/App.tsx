/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MapPin, 
  Shield, 
  User, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Menu,
  X,
  LayoutDashboard,
  PawPrint,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { User as UserType, Pet, Rescue, Adoption } from './types';

// Fix Leaflet icon issue
import 'leaflet/dist/leaflet.css';

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const socket = io();

// --- Components ---

const Navbar = ({ user, onLogout, onNavigate, activeTab }: { user: UserType | null, onLogout: () => void, onNavigate: (tab: string) => void, activeTab: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Heart },
    { id: 'pets', label: 'Adopt', icon: PawPrint },
    { id: 'rescue', label: 'Report Rescue', icon: AlertCircle },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
  }
  if (user?.role === 'volunteer') {
    navItems.push({ id: 'volunteer', label: 'My Tasks', icon: Navigation });
  }

  return (
    <nav className="bg-white border-b border-zinc-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
              <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />
              <span className="ml-2 text-xl font-bold text-zinc-900">PawRescue</span>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === item.id ? 'text-rose-600 bg-rose-50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-zinc-900">{user.name}</span>
                  <span className="text-xs text-zinc-500 capitalize">{user.role}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none"
              >
                Login / Register
              </button>
            )}
          </div>
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden bg-white border-t border-zinc-100"
          >
            <div className="pt-2 pb-3 space-y-1 px-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setIsOpen(false); }}
                  className={`flex items-center w-full px-3 py-2 text-base font-medium rounded-md ${
                    activeTab === item.id ? 'text-rose-600 bg-rose-50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              ))}
              {!user && (
                <button
                  onClick={() => { onNavigate('login'); setIsOpen(false); }}
                  className="flex items-center w-full px-3 py-2 text-base font-medium text-rose-600 bg-rose-50 rounded-md"
                >
                  <User className="h-5 w-5 mr-3" />
                  Login
                </button>
              )}
              {user && (
                <button
                  onClick={onLogout}
                  className="flex items-center w-full px-3 py-2 text-base font-medium text-zinc-500 hover:text-rose-600 rounded-md"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const LocationPicker = ({ onLocationSelect, initialPos }: { onLocationSelect: (lat: number, lng: number) => void, initialPos?: [number, number] }) => {
  const [position, setPosition] = useState<[number, number] | null>(initialPos || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const MapEvents = () => {
    const map = useMap();
    useMapEvents({
      click(e) {
        const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
        setPosition(newPos);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    
    useEffect(() => {
      if (position) {
        map.setView(position, map.getZoom());
      }
    }, [position, map]);
    
    return null;
  };

  const handleGetCurrentLocation = () => {
    console.log("Fetching current location...");
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log("Current location found:", latitude, longitude);
        const newPos: [number, number] = [latitude, longitude];
        setPosition(newPos);
        onLocationSelect(latitude, longitude);
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to retrieve your location: " + err.message);
      }
    );
  };

  const handleSearchPlace = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      console.log("Searching for:", searchQuery);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Search results:", data);
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPos);
        onLocationSelect(newPos[0], newPos[1]);
        setSearchQuery(''); // Clear search after success
      } else {
        alert("Location not found. Please try a more specific address.");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      alert("Error searching for location. Please check your internet connection or try again later.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!position && !initialPos) {
      handleGetCurrentLocation();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchPlace();
              }
            }}
            placeholder="Enter place name (e.g. Central Park)"
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-rose-500 text-sm"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSearchPlace();
            }}
            disabled={isSearching}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      <div className="h-64 w-full rounded-xl overflow-hidden border border-zinc-200 relative group">
        <MapContainer center={position || [0, 0]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {position && <Marker position={position} />}
          <MapEvents />
        </MapContainer>
        <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-zinc-500 border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
          Click map to adjust
        </div>
      </div>
    </div>
  );
};

const PetCard = ({ pet, onAdopt, isProcessing }: { pet: any, onAdopt: any, isProcessing?: boolean, key?: any }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="aspect-square relative overflow-hidden">
      <img 
        src={pet.image_url || `https://picsum.photos/seed/${pet.name}/400/400`} 
        alt={pet.name} 
        className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-3 right-3">
        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-zinc-900 shadow-sm">
          {pet.age} years
        </span>
      </div>
    </div>
    <div className="p-5">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">{pet.name}</h3>
          <p className="text-sm text-zinc-500">{pet.breed}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-md uppercase tracking-wider ${pet.status === 'requested' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
          {pet.status === 'requested' ? 'Requested' : pet.type}
        </span>
      </div>
      <p className="text-sm text-zinc-600 line-clamp-2 mb-4">{pet.description}</p>
      <button
        onClick={() => {
          console.log("Adopt button clicked for pet:", pet.id);
          onAdopt(pet.id);
        }}
        disabled={pet.status === 'requested' || isProcessing}
        className={`w-full py-2.5 text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center ${
          pet.status === 'requested' 
            ? 'bg-zinc-300 cursor-not-allowed' 
            : isProcessing
              ? 'bg-zinc-700 cursor-wait'
              : 'bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98]'
        }`}
      >
        {isProcessing ? (
          <Clock className="animate-spin h-4 w-4 mr-2" />
        ) : (
          <Heart className={`h-4 w-4 mr-2 ${pet.status === 'requested' ? 'fill-zinc-400' : 'fill-white'}`} />
        )}
        {pet.status === 'requested' ? 'Adoption Pending' : isProcessing ? 'Processing...' : 'Adopt Me'}
      </button>
    </div>
  </motion.div>
);

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [pets, setPets] = useState<Pet[]>([]);
  const [rescues, setRescues] = useState<Rescue[]>([]);
  const [adoptions, setAdoptions] = useState<Adoption[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingPetId, setProcessingPetId] = useState<number | null>(null);
  const [selectedPetForAdoption, setSelectedPetForAdoption] = useState<Pet | null>(null);
  const [adoptionFormData, setAdoptionFormData] = useState({ reason: '', experience: '' });

  // Search and Filter States
  const [petSearchQuery, setPetSearchQuery] = useState('');
  const [petFilterType, setPetFilterType] = useState('all');
  const [petFilterAge, setPetFilterAge] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'adopter' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchPets();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRescues();
      fetchAdoptions();
      if (user.role === 'admin') fetchStats();
    }
  }, [user]);

  const [rescueLocation, setRescueLocation] = useState<{lat: number, lng: number} | null>(null);

  const fetchPets = async () => {
    try {
      const res = await fetch('/api/pets');
      const data = await res.json();
      setPets(data);
    } catch (err) { console.error(err); }
  };

  const fetchRescues = async () => {
    try {
      const res = await fetch('/api/rescues', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setRescues(data);
    } catch (err) { console.error(err); }
  };

  const fetchAdoptions = async () => {
    try {
      const res = await fetch('/api/adoptions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAdoptions(data);
    } catch (err) { console.error(err); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error(err); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setActiveTab('home');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('home');
  };

  const handleReportRescue = async (e: any) => {
    e.preventDefault();
    console.log("Submit Report clicked");
    
    if (!user) {
      alert("Please login to report a rescue");
      setActiveTab('login');
      return;
    }

    setLoading(true);
    const form = e.currentTarget;
    const fileInput = form.image_file;
    let imageUrl = '';

    try {
      // If a file is selected, upload it first
      if (fileInput && fileInput.files && fileInput.files[0]) {
        console.log("Uploading image...");
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
        
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`Image upload failed: ${errorText}`);
        }
        
        const uploadData = await uploadRes.json();
        if (uploadData.imageUrl) {
          imageUrl = uploadData.imageUrl;
          console.log("Image uploaded:", imageUrl);
        }
      }

      const lat = rescueLocation?.lat;
      const lng = rescueLocation?.lng;

      if (lat === undefined || lng === undefined) {
        alert('Please select a location on the map by clicking or searching.');
        setLoading(false);
        return;
      }

      const rescueData = {
        pet_description: form.description.value,
        image_url: imageUrl,
        lat,
        lng,
      };

      console.log("Sending rescue data:", rescueData);
      const res = await fetch('/api/rescues', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(rescueData)
      });
      
      if (res.ok) {
        alert('Rescue reported successfully!');
        fetchRescues();
        setActiveTab('home');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to report rescue');
      }
    } catch (err: any) { 
      console.error("Rescue report error:", err); 
      alert(err.message || 'Failed to report rescue');
    } finally {
      setLoading(false);
    }
  };

  const handleAdopt = (petId: number) => {
    console.log("handleAdopt triggered for petId:", petId);
    if (!user) {
      console.log("No user found, redirecting to login");
      setActiveTab('login');
      return;
    }
    const pet = pets.find(p => p.id === petId);
    if (pet) {
      setSelectedPetForAdoption(pet);
    }
  };

  const handleAdoptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetForAdoption) return;

    setProcessingPetId(selectedPetForAdoption.id);
    try {
      console.log("Sending adoption request to server...");
      const res = await fetch('/api/adoptions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          pet_id: selectedPetForAdoption.id,
          reason: adoptionFormData.reason,
          experience: adoptionFormData.experience
        })
      });
      
      if (res.ok) {
        console.log("Adoption request successful");
        alert('Adoption request submitted! The pet status is now "Requested".');
        setSelectedPetForAdoption(null);
        setAdoptionFormData({ reason: '', experience: '' });
        fetchAdoptions();
        fetchPets();
      } else {
        const data = await res.json();
        console.error("Adoption request failed:", data.error);
        alert(data.error || 'Failed to submit adoption request');
      }
    } catch (err) { 
      console.error("Adoption request error:", err); 
      alert('Error connecting to server');
    } finally {
      setProcessingPetId(null);
    }
  };

  const handleUpdateRescueStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/rescues/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      fetchRescues();
    } catch (err) { console.error(err); }
  };

  const handleAssignVolunteer = async (rescueId: number, volunteerId: number) => {
    try {
      await fetch(`/api/rescues/${rescueId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ assigned_volunteer_id: volunteerId })
      });
      fetchRescues();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Adoption Form Modal */}
      <AnimatePresence>
        {selectedPetForAdoption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-rose-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Adopt {selectedPetForAdoption.name}</h3>
                  <p className="text-rose-100 text-sm">Tell us why you'd be a great match!</p>
                </div>
                <button 
                  onClick={() => setSelectedPetForAdoption(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAdoptionSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Why do you want to adopt {selectedPetForAdoption.name}?
                  </label>
                  <textarea
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all min-h-[100px]"
                    placeholder="Tell us about your home and lifestyle..."
                    value={adoptionFormData.reason}
                    onChange={e => setAdoptionFormData({...adoptionFormData, reason: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    Do you have experience with pets?
                  </label>
                  <textarea
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all min-h-[100px]"
                    placeholder="List any previous pets or experience..."
                    value={adoptionFormData.experience}
                    onChange={e => setAdoptionFormData({...adoptionFormData, experience: e.target.value})}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPetForAdoption(null)}
                    className="flex-1 py-3 border border-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingPetId !== null}
                    className="flex-2 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {processingPetId !== null ? (
                      <>
                        <Clock className="animate-spin h-5 w-5 mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Navbar user={user} onLogout={handleLogout} onNavigate={setActiveTab} activeTab={activeTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero */}
              <div className="relative rounded-3xl overflow-hidden bg-zinc-900 text-white p-8 sm:p-16">
                <div className="relative z-10 max-w-2xl">
                  <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
                    Every Pet Deserves a <span className="text-rose-500">Loving Home.</span>
                  </h1>
                  <p className="text-lg text-zinc-400 mb-8">
                    Join our community of rescuers and adopters. Report strays, volunteer for rescues, or find your new best friend today.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => setActiveTab('pets')} className="px-8 py-4 bg-rose-600 hover:bg-rose-700 rounded-full font-bold transition-all">
                      Find a Pet
                    </button>
                    <button onClick={() => setActiveTab('rescue')} className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full font-bold transition-all">
                      Report Rescue
                    </button>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-1/2 h-full hidden lg:block">
                   <img src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&q=80&w=1000" className="object-cover w-full h-full opacity-50" referrerPolicy="no-referrer" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Pets Rescued', value: '1,240+', icon: Shield, color: 'text-blue-600' },
                  { label: 'Happy Adoptions', value: '850+', icon: Heart, color: 'text-rose-600' },
                  { label: 'Active Volunteers', value: '120+', icon: User, color: 'text-emerald-600' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-100 flex items-center space-x-4 shadow-sm">
                    <div className={`p-3 rounded-xl bg-zinc-50 ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-zinc-500">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Featured Pets */}
              <section>
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-3xl font-bold">Available for Adoption</h2>
                    <p className="text-zinc-500">Meet our newest friends waiting for you.</p>
                  </div>
                  <button onClick={() => setActiveTab('pets')} className="text-rose-600 font-semibold hover:underline">View all pets →</button>
                </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pets.slice(0, 4).map(pet => (
                      <PetCard 
                        key={pet.id} 
                        pet={pet} 
                        onAdopt={handleAdopt} 
                        isProcessing={processingPetId === pet.id}
                      />
                    ))}
                  </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'login' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl"
            >
              <div className="text-center mb-8">
                <div className="inline-flex p-3 rounded-2xl bg-rose-50 text-rose-600 mb-4">
                  <User className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-zinc-500">Join the PawRescue mission</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Account Type</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="adopter">Adopter</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                  </div>
                )}
                {error && <p className="text-rose-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-zinc-500 hover:text-rose-600 transition-colors"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'pets' && (
            <motion.div
              key="pets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold">Adopt a Pet</h2>
                  <p className="text-zinc-500">Find a companion that fits your life.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Search name or breed..." 
                      value={petSearchQuery}
                      onChange={(e) => setPetSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-full border border-zinc-200 outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-64" 
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-full border transition-colors ${showFilters ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'}`}
                  >
                    <Filter className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-wrap gap-4"
                >
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Pet Type</label>
                    <select 
                      value={petFilterType}
                      onChange={(e) => setPetFilterType(e.target.value)}
                      className="w-full p-2 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="all">All Types</option>
                      <option value="dog">Dogs</option>
                      <option value="cat">Cats</option>
                      <option value="other">Others</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Age Range</label>
                    <select 
                      value={petFilterAge}
                      onChange={(e) => setPetFilterAge(e.target.value)}
                      className="w-full p-2 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="all">Any Age</option>
                      <option value="puppy">Young (0-2 years)</option>
                      <option value="adult">Adult (3-7 years)</option>
                      <option value="senior">Senior (8+ years)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => {
                        setPetSearchQuery('');
                        setPetFilterType('all');
                        setPetFilterAge('all');
                      }}
                      className="text-xs font-medium text-zinc-400 hover:text-rose-600 px-2 py-2"
                    >
                      Reset Filters
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {pets.filter(pet => {
                  const matchesSearch = 
                    pet.name.toLowerCase().includes(petSearchQuery.toLowerCase()) ||
                    pet.breed.toLowerCase().includes(petSearchQuery.toLowerCase());
                  
                  const matchesType = petFilterType === 'all' || pet.type === petFilterType;
                  
                  let matchesAge = true;
                  if (petFilterAge === 'puppy') matchesAge = pet.age <= 2;
                  else if (petFilterAge === 'adult') matchesAge = pet.age > 2 && pet.age <= 7;
                  else if (petFilterAge === 'senior') matchesAge = pet.age > 7;

                  return matchesSearch && matchesType && matchesAge;
                }).map(pet => (
                  <PetCard 
                    key={pet.id} 
                    pet={pet} 
                    onAdopt={handleAdopt} 
                    isProcessing={processingPetId === pet.id}
                  />
                ))}
              </div>
              
              {pets.filter(pet => {
                const matchesSearch = 
                  pet.name.toLowerCase().includes(petSearchQuery.toLowerCase()) ||
                  pet.breed.toLowerCase().includes(petSearchQuery.toLowerCase());
                const matchesType = petFilterType === 'all' || pet.type === petFilterType;
                let matchesAge = true;
                if (petFilterAge === 'puppy') matchesAge = pet.age <= 2;
                else if (petFilterAge === 'adult') matchesAge = pet.age > 2 && pet.age <= 7;
                else if (petFilterAge === 'senior') matchesAge = pet.age > 7;
                return matchesSearch && matchesType && matchesAge;
              }).length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-zinc-100">
                  <PawPrint className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-900">No pets found</h3>
                  <p className="text-zinc-500">Try adjusting your search or filters.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'rescue' && (
            <motion.div
              key="rescue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden">
                <div className="bg-rose-600 p-8 text-white">
                  <h2 className="text-2xl font-bold mb-2">Report a Stray or Injured Pet</h2>
                  <p className="text-rose-100">Provide details and location to help our rescue team reach them quickly.</p>
                </div>
                
                <form onSubmit={handleReportRescue} className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                        <textarea
                          name="description"
                          required
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-rose-500 outline-none"
                          placeholder="Describe the pet's condition and appearance..."
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="relative">
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Upload Photo</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="file"
                              name="image_file"
                              accept="image/*"
                              required
                              className="block w-full text-sm text-zinc-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-rose-50 file:text-rose-700
                                hover:file:bg-rose-100
                                cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Latitude</label>
                          <div className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-500">
                            {rescueLocation ? rescueLocation.lat.toFixed(6) : 'Not selected'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Longitude</label>
                          <div className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-500">
                            {rescueLocation ? rescueLocation.lng.toFixed(6) : 'Not selected'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-zinc-700">Select Location on Map</label>
                      <LocationPicker onLocationSelect={(lat, lng) => {
                        setRescueLocation({ lat, lng });
                      }} />
                      <p className="text-xs text-zinc-500 flex items-center">
                        <Navigation className="h-3 w-3 mr-1" />
                        Click on the map to mark the exact spot.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <Clock className="animate-spin h-5 w-5 mr-2" />
                        Submitting Report...
                      </span>
                    ) : (
                      'Submit Rescue Report'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && user?.role === 'admin' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Admin Dashboard</h2>
                <div className="flex space-x-2">
                   <button onClick={fetchStats} className="p-2 rounded-full hover:bg-zinc-100 border border-zinc-200">
                     <Clock className="h-5 w-5 text-zinc-600" />
                   </button>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-zinc-500 text-sm font-medium">Total Pets</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalPets}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-zinc-500 text-sm font-medium">Approved Adoptions</p>
                    <p className="text-3xl font-bold mt-1 text-rose-600">{stats.totalAdoptions}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-zinc-500 text-sm font-medium">Active Rescues</p>
                    <p className="text-3xl font-bold mt-1 text-blue-600">{stats.activeRescues}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Rescues Table */}
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <h3 className="font-bold">Recent Rescue Reports</h3>
                    <AlertCircle className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 font-semibold">
                        <tr>
                          <th className="px-6 py-3">Description</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {rescues.map(r => (
                          <tr key={r.id} className="text-sm hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4 max-w-xs truncate">{r.pet_description}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                r.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                r.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {r.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                               <button className="text-rose-600 font-medium hover:underline">Details</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Map View */}
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden h-[400px]">
                  <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
                    <h3 className="font-bold">Live Rescue Map</h3>
                    <Navigation className="h-5 w-5 text-rose-500" />
                  </div>
                  <MapContainer center={[20, 77]} zoom={4} style={{ height: 'calc(100% - 60px)', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {rescues.map(r => (
                      <Marker key={r.id} position={[r.lat, r.lng]}>
                        <Popup>
                          <div className="p-2">
                            <p className="font-bold mb-1">Rescue #{r.id}</p>
                            <p className="text-xs text-zinc-500 mb-2">{r.pet_description}</p>
                            <span className="text-[10px] uppercase font-bold text-rose-600">{r.status}</span>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'volunteer' && user?.role === 'volunteer' && (
            <motion.div
              key="volunteer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">Volunteer Portal</h2>
                  <p className="text-zinc-500">Manage your assigned rescues and find new tasks.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rescues.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                    <div className="h-40 bg-zinc-100 relative">
                       <img src={r.image_url || `https://picsum.photos/seed/${r.id}/400/200`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       <div className="absolute top-3 right-3">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                           r.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                         }`}>
                           {r.status.replace('_', ' ')}
                         </span>
                       </div>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-zinc-600 mb-4 line-clamp-3">{r.pet_description}</p>
                      <div className="flex items-center text-xs text-zinc-500 mb-6">
                        <MapPin className="h-3 w-3 mr-1" />
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </div>
                      
                      {r.status === 'pending' ? (
                        <button
                          onClick={() => handleAssignVolunteer(r.id, user.id)}
                          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                        >
                          Accept Rescue
                        </button>
                      ) : r.status === 'in_progress' ? (
                        <button
                          onClick={() => handleUpdateRescueStatus(r.id, 'completed')}
                          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                        >
                          Mark as Completed
                        </button>
                      ) : (
                        <div className="flex items-center justify-center py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold">
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center mb-6">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            <span className="ml-2 text-lg font-bold">PawRescue</span>
          </div>
          <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">
            PawRescue is a non-profit platform dedicated to connecting stray pets with loving families and providing immediate rescue assistance.
          </p>
          <div className="flex justify-center space-x-6 text-zinc-400">
            <button className="hover:text-zinc-600">About</button>
            <button className="hover:text-zinc-600">Privacy</button>
            <button className="hover:text-zinc-600">Terms</button>
            <button className="hover:text-zinc-600">Contact</button>
          </div>
          <p className="mt-8 text-xs text-zinc-400">© 2024 PawRescue. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
