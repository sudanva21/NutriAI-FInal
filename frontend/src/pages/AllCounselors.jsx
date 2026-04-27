import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Calendar, Search } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const AllCounselors = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const counselors = [
    {
      id: 1,
      name: 'Dr. Neha Sharma',
      specialty: 'Clinical Nutritionist',
      rating: 4.9,
      reviews: 128,
      price: 1500,
      priceDisplay: '₹1500/session',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'counselor'
    },
    {
      id: 2,
      name: 'Rahul Khanna',
      specialty: 'Sports Dietitian',
      rating: 4.8,
      reviews: 94,
      price: 1200,
      priceDisplay: '₹1200/session',
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'counselor'
    },
    {
      id: 3,
      name: 'Dr. Priya Desai',
      specialty: 'Weight Management Expert',
      rating: 4.7,
      reviews: 112,
      price: 1350,
      priceDisplay: '₹1350/session',
      image: 'https://images.unsplash.com/photo-1594824432258-f58c735d4d31?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'counselor'
    },
    {
      id: 4,
      name: 'Arjun Patel',
      specialty: 'Holistic Health Coach',
      rating: 4.9,
      reviews: 87,
      price: 1100,
      priceDisplay: '₹1100/session',
      image: 'https://images.unsplash.com/photo-1537368910025-702800faa86b?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'counselor'
    }
  ];

  const filtered = counselors.filter(c => 
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
            <div className="flex gap-4 items-center mb-4">
              <img 
                src={counselor.image} 
                alt={counselor.name} 
                className="w-16 h-16 rounded-full object-cover border-2 border-[#FF6B6B]/20"
              />
              <div>
                <h3 className="font-semibold text-gray-800">{counselor.name}</h3>
                <p className="text-xs text-gray-500">{counselor.specialty}</p>
                <div className="flex items-center gap-1 mt-1 text-xs font-medium text-amber-500">
                  <Star size={12} className="fill-amber-500" />
                  <span>{counselor.rating}</span>
                  <span className="text-gray-400 font-normal">({counselor.reviews})</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="font-bold text-gray-800">{counselor.priceDisplay}</span>
              <button 
                onClick={() => navigate('/app/checkout', { state: { item: { ...counselor, description: counselor.specialty } } })}
                className="bg-[#FF6B6B] text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <Calendar size={14} /> Book
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

      <BottomNav />
    </div>
  );
};

export default AllCounselors;
