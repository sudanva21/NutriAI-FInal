import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Star, Calendar, Search, ChevronRight, Zap, Pill, Droplets, Dumbbell, Leaf } from 'lucide-react';
import { useCart } from '../App';

// ─── SHARED DATA (also used by ProductDetail) ──────────────────────────────
export const COUNSELORS = [
  {
    id: 'c1', name: 'Dr. Neha Sharma', specialty: 'Clinical Nutritionist', rating: 4.9, reviews: 128,
    price: 1500, priceDisplay: '₹1500/session', type: 'counselor',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
    availableDays: [1,2,3,4,5], workingHours: ['09:00','10:00','11:00','14:00','15:00','16:00'],
    bio: 'Over 10 years of clinical experience in therapeutic nutrition, diabetes management, and gut health.',
    nextAvailable: 'Tomorrow',
  },
  {
    id: 'c2', name: 'Rahul Khanna', specialty: 'Sports Dietitian', rating: 4.8, reviews: 94,
    price: 1200, priceDisplay: '₹1200/session', type: 'counselor',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300',
    availableDays: [1,3,5], workingHours: ['08:00','09:00','10:00','17:00','18:00'],
    bio: 'Specialises in performance nutrition for athletes and body composition optimization.',
    nextAvailable: 'Today',
  },
  {
    id: 'c3', name: 'Dr. Priya Desai', specialty: 'Weight Management Expert', rating: 4.7, reviews: 112,
    price: 1350, priceDisplay: '₹1350/session', type: 'counselor',
    image: 'https://images.unsplash.com/photo-1594824432258-f58c735d4d31?auto=format&fit=crop&q=80&w=300&h=300',
    availableDays: [2,4], workingHours: ['11:00','12:00','13:00','15:00','16:00'],
    bio: 'Expert in sustainable weight loss strategies combining nutrition, behaviour change, and lifestyle.',
    nextAvailable: 'Wed',
  },
  {
    id: 'c4', name: 'Arjun Patel', specialty: 'Holistic Health Coach', rating: 4.9, reviews: 87,
    price: 1100, priceDisplay: '₹1100/session', type: 'counselor',
    image: 'https://images.unsplash.com/photo-1537368910025-702800faa86b?auto=format&fit=crop&q=80&w=300&h=300',
    availableDays: [1,2,3,4,5,6], workingHours: ['07:00','08:00','09:00','18:00','19:00'],
    bio: 'Integrative approach combining Ayurveda, modern nutrition, mindfulness, and movement coaching.',
    nextAvailable: 'Today',
  },
];

export const PRODUCTS = [
  // Protein
  {
    id: 'p1', category: 'protein', name: 'Whey Protein Isolate', brand: 'MuscleBlaze', price: 2499,
    priceDisplay: '₹2,499', rating: 4.8, image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '30g', servings: 60,
    description: 'Ultra-pure whey isolate with 27g protein per scoop. Fast absorbing, low carb, low fat.',
    nutrition: { calories: 120, protein_g: 27, carbs_g: 2, fat_g: 0.5, fiber_g: 0 },
    ingredients: ['Whey Protein Isolate', 'Cocoa Powder', 'Soy Lecithin', 'Sucralose', 'Natural Flavours'],
    tags: ['High Protein', 'Low Carb'],
  },
  {
    id: 'p2', category: 'protein', name: 'Organic Plant Protein', brand: 'NutriLife India', price: 1899,
    priceDisplay: '₹1,899', rating: 4.7, image: 'https://images.unsplash.com/photo-1597075095100-f6a57b2a2b3a?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '35g', servings: 30,
    description: 'A blend of pea, brown rice, and hemp protein. Vegan, non-GMO, and easy to digest.',
    nutrition: { calories: 130, protein_g: 20, carbs_g: 8, fat_g: 3, fiber_g: 2 },
    ingredients: ['Pea Protein', 'Brown Rice Protein', 'Hemp Seed Protein', 'Coconut Sugar', 'Vanilla Extract'],
    tags: ['Vegan', 'Non-GMO'],
  },
  {
    id: 'p3', category: 'protein', name: 'Micellar Casein (Night Protein)', brand: 'Optimum Nutrition', price: 3199,
    priceDisplay: '₹3,199', rating: 4.6, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '33g', servings: 56,
    description: 'Slow-digesting casein protein ideal before sleep. Sustained amino acid release for 7–8 hours.',
    nutrition: { calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1, fiber_g: 1 },
    ingredients: ['Micellar Casein', 'Calcium Caseinate', 'Cocoa Powder', 'Sunflower Lecithin'],
    tags: ['Slow Release', 'Night Recovery'],
  },
  {
    id: 'p4', category: 'protein', name: 'Egg White Protein Powder', brand: 'PurePower', price: 2199,
    priceDisplay: '₹2,199', rating: 4.5, image: 'https://images.unsplash.com/photo-1491975474562-1f4e30bc9468?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '28g', servings: 45,
    description: 'Derived from pasteurised egg whites. Lactose-free, complete amino acid profile, zero fat.',
    nutrition: { calories: 100, protein_g: 22, carbs_g: 1, fat_g: 0, fiber_g: 0 },
    ingredients: ['Dried Egg White', 'Sunflower Lecithin', 'Natural Vanilla Flavour'],
    tags: ['Lactose-Free', 'Zero Fat'],
  },
  // Carbs / Mass
  {
    id: 'p5', category: 'carbs', name: 'Mass Gainer XXL', brand: 'BigMuscles', price: 2799,
    priceDisplay: '₹2,799', rating: 4.4, image: 'https://images.unsplash.com/photo-1543340713-8a08109da31b?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '165g', servings: 20,
    description: 'High-calorie mass gainer with complex carbs and protein. Ideal for hard gainers.',
    nutrition: { calories: 650, protein_g: 30, carbs_g: 120, fat_g: 5, fiber_g: 4 },
    ingredients: ['Maltodextrin', 'Whey Protein Concentrate', 'Oat Flour', 'Creatine Monohydrate', 'MCT Oil'],
    tags: ['High Calorie', 'Mass Building'],
  },
  {
    id: 'p6', category: 'carbs', name: 'Dextrose Monohydrate', brand: 'Healthfarm', price: 599,
    priceDisplay: '₹599', rating: 4.3, image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '50g', servings: 40,
    description: 'Pure fast-acting carbohydrate for post-workout glycogen replenishment.',
    nutrition: { calories: 192, protein_g: 0, carbs_g: 50, fat_g: 0, fiber_g: 0 },
    ingredients: ['Dextrose Monohydrate'],
    tags: ['Post-Workout', 'Fast Carbs'],
  },
  {
    id: 'p7', category: 'carbs', name: 'Oat Flour (Gluten-Free)', brand: 'NutriOats', price: 349,
    priceDisplay: '₹349', rating: 4.6, image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '40g', servings: 50,
    description: 'Whole grain oat flour, rich in beta-glucan. Ideal for clean bulking shakes.',
    nutrition: { calories: 148, protein_g: 5, carbs_g: 27, fat_g: 2.5, fiber_g: 4 },
    ingredients: ['Whole Grain Oat Flour'],
    tags: ['Gluten-Free', 'Complex Carbs'],
  },
  // Performance
  {
    id: 'p8', category: 'performance', name: 'Creatine Monohydrate', brand: 'AS-IT-IS Nutrition', price: 799,
    priceDisplay: '₹799', rating: 4.9, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '5g', servings: 60,
    description: 'Micronised creatine for increased strength, power, and muscle volume. Most researched supplement.',
    nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    ingredients: ['Creatine Monohydrate (Creapure®)'],
    tags: ['Strength', 'Power Output'],
  },
  {
    id: 'p9', category: 'performance', name: 'BCAA 2:1:1 Powder', brand: 'MuscleBlaze', price: 1199,
    priceDisplay: '₹1,199', rating: 4.7, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '10g', servings: 40,
    description: 'Instantized BCAA in the optimal 2:1:1 ratio. Reduces muscle soreness and supports recovery.',
    nutrition: { calories: 20, protein_g: 5, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    ingredients: ['L-Leucine', 'L-Isoleucine', 'L-Valine', 'Citric Acid', 'Natural Flavour'],
    tags: ['Recovery', 'Anti-Catabolic'],
  },
  // Vitamins
  {
    id: 'p10', category: 'vitamins', name: 'Daily Multivitamin (60 caps)', brand: 'HealthKart', price: 899,
    priceDisplay: '₹899', rating: 4.9, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '1 capsule', servings: 60,
    description: '23 essential vitamins and minerals. Supports immunity, energy, and bone health.',
    nutrition: { calories: 5, protein_g: 0, carbs_g: 1, fat_g: 0, fiber_g: 0 },
    ingredients: ['Vitamin A', 'Vitamin C', 'Vitamin D3', 'Vitamin B12', 'Zinc', 'Iron', 'Magnesium'],
    tags: ['Immunity', 'Energy'],
  },
  {
    id: 'p11', category: 'vitamins', name: 'Vitamin D3 + K2 Drops', brand: 'Carbamide Forte', price: 499,
    priceDisplay: '₹499', rating: 4.8, image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '0.5ml', servings: 60,
    description: 'Liquid D3 + K2 for superior absorption. Supports bone density and immune function.',
    nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    ingredients: ['Cholecalciferol (D3)', 'Menaquinone-7 (K2)', 'MCT Oil Base'],
    tags: ['Bone Health', 'Immunity'],
  },
  {
    id: 'p12', category: 'vitamins', name: 'Omega-3 Fish Oil (1000mg)', brand: 'PureCatch', price: 1100,
    priceDisplay: '₹1,100', rating: 4.6, image: 'https://images.unsplash.com/photo-1550572017-edb799988226?auto=format&fit=crop&q=80&w=400',
    type: 'product', servingSize: '1 softgel', servings: 90,
    description: 'High-potency EPA + DHA. Supports heart health, joint flexibility, and brain function.',
    nutrition: { calories: 10, protein_g: 0, carbs_g: 0, fat_g: 1, fiber_g: 0 },
    ingredients: ['Fish Oil Concentrate', 'EPA 180mg', 'DHA 120mg', 'Gelatin Capsule Shell'],
    tags: ['Heart Health', 'Anti-Inflammatory'],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Leaf },
  { id: 'protein', label: 'Protein', icon: Dumbbell },
  { id: 'carbs', label: 'Carbs', icon: Zap },
  { id: 'performance', label: 'Performance', icon: Zap },
  { id: 'vitamins', label: 'Vitamins', icon: Pill },
];

const Marketplace = () => {
  const navigate = useNavigate();
  const { cart, addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = PRODUCTS.filter(p => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-28">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 sticky top-0 z-20 border-b border-black/5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="tiny text-[#6B635E]">Explore</div>
              <h1 className="font-display text-2xl font-medium tracking-tight mt-0.5">Marketplace</h1>
            </div>
            <button
              onClick={() => navigate('/app/cart')}
              className="relative w-10 h-10 bg-[#E26D5C]/10 rounded-full flex items-center justify-center text-[#E26D5C]"
              data-testid="cart-btn"
            >
              <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1A1A1A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B635E] w-4 h-4" strokeWidth={1.75} />
            <input
              className="w-full bg-[#F2EFEB] rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E26D5C]/30"
              placeholder="Search products, brands…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-5 space-y-8">
        {/* ── Book a Counselor ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-medium">Book a Counselor</h2>
            <button onClick={() => navigate('/app/counselors')} className="text-sm text-[#E26D5C] font-medium flex items-center gap-1">
              See all <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {COUNSELORS.slice(0, 3).map(c => (
              <div key={c.id} className="min-w-[220px] bg-white rounded-2xl p-4 border border-black/5 shadow-sm flex-shrink-0">
                <div className="flex items-start gap-3 mb-3">
                  <img src={c.image} alt={c.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#E26D5C]/20 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#1A1A1A] truncate">{c.name}</div>
                    <div className="text-[11px] text-[#6B635E] truncate">{c.specialty}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-500">{c.rating}</span>
                      <span className="text-xs text-[#6B635E]">({c.reviews})</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-black/5">
                  <div>
                    <div className="font-bold text-sm text-[#1A1A1A]">{c.priceDisplay}</div>
                    <div className="text-[10px] text-green-600 font-semibold mt-0.5">⚡ Next: {c.nextAvailable}</div>
                  </div>
                  <button
                    onClick={() => navigate('/app/checkout', { state: { item: { ...c, description: c.specialty } } })}
                    className="bg-[#E26D5C] text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" strokeWidth={2} /> Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Supplements Shop ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-medium">Supplements</h2>
            <span className="text-xs text-[#6B635E]">{filtered.length} items</span>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-black/10 text-[#6B635E]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-2xl overflow-hidden border border-black/5 shadow-sm cursor-pointer active:scale-[0.98] transition"
                onClick={() => navigate(`/app/product/${p.id}`)}
                data-testid={`product-card-${p.id}`}
              >
                <div className="aspect-square bg-[#F2EFEB] relative overflow-hidden">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover mix-blend-multiply p-2" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />{p.rating}
                  </div>
                  {p.tags?.[0] && (
                    <div className="absolute bottom-2 left-2 bg-[#1A1A1A]/70 text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
                      {p.tags[0]}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[9px] uppercase tracking-widest text-[#6B635E] font-bold mb-1">{p.brand}</div>
                  <div className="text-sm font-medium text-[#1A1A1A] line-clamp-2 leading-tight mb-1 h-10">{p.name}</div>
                  <div className="text-[10px] text-[#6B635E] mb-2">{p.nutrition.protein_g}g protein · {p.nutrition.carbs_g}g carbs</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A1A1A]">{p.priceDisplay}</span>
                    <button
                      onClick={e => { e.stopPropagation(); addToCart({ ...p, description: p.brand }); }}
                      className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-[#E26D5C] transition-colors"
                      data-testid={`add-to-cart-${p.id}`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-10 text-[#6B635E]">No products found.</div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Marketplace;
