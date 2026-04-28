import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Calendar, Search, MapPin, Award } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { COUNSELORS } from './Marketplace';

const AllCounselors = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = COUNSELORS.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">All Counselors</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or specialty..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 text-gray-800 text-sm rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20"
          />
        </div>
      </header>

      <main className="px-6 py-6 space-y-4">
        {filtered.map((counselor, idx) => (
          <motion.div
            key={counselor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex gap-4 items-start mb-4">
              <img 
                src={counselor.image} 
                alt={counselor.name} 
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E26D5C]/10"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-medium text-[#1A1A1A]">{counselor.name}</h3>
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                    <Star size={14} className="fill-amber-500" />
                    <span>{counselor.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-[#6B635E] mb-2">{counselor.specialty}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">
                    <Award size={10} /> Certified
                  </span>
                  <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">
                    <MapPin size={10} /> Online
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-[#6B635E] mb-4 leading-relaxed line-clamp-2">
              {counselor.bio}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-black/5">
              <div>
                <span className="font-bold text-[#1A1A1A]">{counselor.priceDisplay}</span>
                <div className="text-[10px] text-green-600 font-bold mt-0.5">Next Available: {counselor.nextAvailable}</div>
              </div>
              <button 
                onClick={() => navigate('/app/checkout', { state: { item: { ...counselor, description: counselor.specialty } } })}
                className="bg-[#E26D5C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#E26D5C]/20"
              >
                <Calendar size={16} /> Book Session
              </button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No counselors found.
          </div>
        )}
      </main>

    </div>
  );
};

export default AllCounselors;
