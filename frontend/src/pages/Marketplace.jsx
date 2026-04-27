import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, User, Calendar, ArrowRight, Search } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useCart } from '../App';

const Marketplace = () => {
  const navigate = useNavigate();
  const { cart, addToCart } = useCart();
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
    }
  ];

  const products = [
    {
      id: 1,
      name: 'Organic Plant Protein',
      brand: 'NutriLife India',
      price: 1899,
      priceDisplay: '₹1899',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'product'
    },
    {
      id: 2,
      name: 'Daily Multivitamin',
      brand: 'HealthKart',
      price: 899,
      priceDisplay: '₹899',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'product'
    },
    {
      id: 3,
      name: 'Omega-3 Fish Oil',
      brand: 'PureCatch',
      price: 1100,
      priceDisplay: '₹1100',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'product'
    },
    {
      id: 4,
      name: 'Probiotic Blend',
      brand: 'GutHealth India',
      price: 1450,
      priceDisplay: '₹1450',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1550572017-edb799988226?auto=format&fit=crop&q=80&w=300&h=300',
      type: 'product'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-6 pt-12 pb-4 rounded-b-[2rem] shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Marketplace</h1>
          <p className="text-gray-500 text-sm">Find supplements & experts</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/app/counselors')}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"
          >
            <Search size={20} />
          </button>
          <button 
            onClick={() => navigate('/app/cart')}
            className="relative w-10 h-10 bg-[#FF6B6B]/10 rounded-full flex items-center justify-center text-[#FF6B6B]"
          >
            <ShoppingBag size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1A1A1A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-6 py-6 space-y-8">
        {/* Book a Counselor Section */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-gray-800">Book a Counselor</h2>
            <button 
              onClick={() => navigate('/app/counselors')}
              className="text-sm text-[#FF6B6B] font-medium flex items-center"
            >
              See all <ArrowRight size={16} className="ml-1" />
            </button>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
            {counselors.map((counselor, idx) => (
              <motion.div
                key={counselor.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="min-w-[260px] bg-white rounded-2xl p-4 shadow-sm snap-start border border-gray-100"
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
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
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
          </div>
        </section>

        {/* Recommended Products */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recommended for You</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
              >
                <div className="aspect-square bg-gray-100 relative">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover mix-blend-multiply p-2"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                    {product.rating}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">{product.brand}</p>
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 leading-tight h-10">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">{product.priceDisplay}</span>
                    <button 
                      onClick={() => addToCart({ ...product, description: product.brand })}
                      className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-[#FF6B6B] transition-colors"
                    >
                      <ShoppingBag size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Marketplace;
