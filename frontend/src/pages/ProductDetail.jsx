import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingBag, ShoppingCart, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useCart } from '../App';
import { PRODUCTS } from './Marketplace';

const MacroBar = ({ label, value, max, color }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#6B635E]">{label}</span>
        <span className="font-semibold text-[#1A1A1A]">{value}g</span>
      </div>
      <div className="h-2 bg-[#F2EFEB] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const [added, setAdded] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);

  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0]">
        <div className="text-center">
          <p className="text-[#6B635E] mb-4">Product not found.</p>
          <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
        </div>
      </div>
    );
  }

  const inCart = cart.some(i => i.id === product.id);
  const n = product.nutrition;
  const totalMacros = (n.protein_g || 0) + (n.carbs_g || 0) + (n.fat_g || 0);

  const handleAddToCart = () => {
    addToCart({ ...product, description: product.brand });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-28">
      {/* Hero Image */}
      <div className="relative bg-white">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-72 object-cover mix-blend-multiply"
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-5 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
          data-testid="product-back-btn"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <button
          onClick={() => navigate('/app/cart')}
          className="absolute top-12 right-5 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
        >
          <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#E26D5C] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>

        {/* Category badge */}
        <div className="absolute bottom-4 left-5">
          <span className="bg-[#1A1A1A] text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full">
            {product.category}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        {/* Title & Rating */}
        <div className="card p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#6B635E] font-bold mb-1">{product.brand}</div>
          <h1 className="font-display text-2xl font-medium leading-tight mb-2">{product.name}</h1>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`}
                  strokeWidth={1}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-amber-500">{product.rating}</span>
          </div>
          <p className="text-sm text-[#6B635E] leading-relaxed">{product.description}</p>

          {/* Tags */}
          {product.tags && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {product.tags.map(tag => (
                <span key={tag} className="text-xs bg-[#E26D5C]/10 text-[#E26D5C] px-3 py-1 rounded-full font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Nutrition Breakdown */}
        <div className="card p-5">
          <h2 className="font-display text-lg font-medium mb-1">Nutrition per Serving</h2>
          <p className="text-xs text-[#6B635E] mb-4">Serving size: {product.servingSize} · {product.servings} servings per container</p>

          {/* Calorie hero */}
          <div className="bg-[#1A1A1A] text-white rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Calories</div>
              <div className="font-display text-3xl font-light">{n.calories}</div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-60 mb-1">Per serving</div>
              <div className="text-xs opacity-60">{product.servingSize}</div>
            </div>
          </div>

          {/* Macro bars */}
          <div className="space-y-3">
            <MacroBar label="Protein" value={n.protein_g} max={Math.max(30, totalMacros)} color="#729B79" />
            <MacroBar label="Carbohydrates" value={n.carbs_g} max={Math.max(30, totalMacros)} color="#E0A96D" />
            <MacroBar label="Fat" value={n.fat_g} max={Math.max(30, totalMacros)} color="#3D5A80" />
            {n.fiber_g > 0 && (
              <MacroBar label="Fiber" value={n.fiber_g} max={Math.max(30, totalMacros)} color="#9B8EA6" />
            )}
          </div>

          {/* Macro summary grid */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Protein', val: `${n.protein_g}g`, color: '#729B79' },
              { label: 'Carbs', val: `${n.carbs_g}g`, color: '#E0A96D' },
              { label: 'Fat', val: `${n.fat_g}g`, color: '#3D5A80' },
              { label: 'Fiber', val: `${n.fiber_g}g`, color: '#9B8EA6' },
            ].map(m => (
              <div key={m.label} className="bg-[#F2EFEB] rounded-xl p-2.5 text-center">
                <div className="font-display text-base font-semibold" style={{ color: m.color }}>{m.val}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#6B635E] mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div className="card overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-5"
            onClick={() => setShowIngredients(!showIngredients)}
          >
            <h2 className="font-display text-lg font-medium">Ingredients</h2>
            {showIngredients
              ? <ChevronUp className="w-5 h-5 text-[#6B635E]" strokeWidth={1.75} />
              : <ChevronDown className="w-5 h-5 text-[#6B635E]" strokeWidth={1.75} />
            }
          </button>
          {showIngredients && (
            <div className="px-5 pb-5 flex flex-wrap gap-2 border-t border-black/5 pt-4">
              {product.ingredients.map((ing, i) => (
                <span key={i} className="text-xs bg-[#F2EFEB] text-[#1A1A1A] px-3 py-1.5 rounded-full">
                  {ing}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-5 py-4 pb-safe z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div>
            <div className="text-xs text-[#6B635E]">Price</div>
            <div className="font-display text-xl font-semibold">{product.priceDisplay}</div>
          </div>
          <button
            onClick={handleAddToCart}
            className={`flex-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
              added
                ? 'bg-green-500 text-white'
                : inCart
                ? 'bg-[#F2EFEB] text-[#1A1A1A]'
                : 'bg-[#E26D5C] text-white shadow-[0_8px_24px_rgba(226,109,92,0.3)]'
            }`}
            data-testid="add-to-cart-btn"
          >
            {added ? (
              <><Check className="w-5 h-5" strokeWidth={2} /> Added!</>
            ) : inCart ? (
              <><ShoppingBag className="w-5 h-5" strokeWidth={1.75} /> Add More</>
            ) : (
              <><ShoppingBag className="w-5 h-5" strokeWidth={1.75} /> Add to Cart</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
