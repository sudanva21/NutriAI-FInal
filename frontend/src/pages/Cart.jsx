import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Plus, Minus, CreditCard, ShoppingBag } from 'lucide-react';
import { useCart } from '../App';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();

  const handleCheckout = () => {
    // Navigate to checkout and pass the cart as the item to purchase
    // We pass a composite item representing the whole cart
    navigate('/app/checkout', { 
      state: { 
        isCart: true,
        item: {
          id: 'cart_' + Date.now(),
          name: 'Cart Checkout',
          description: `${cart.length} items`,
          price: cartTotal,
          image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=300&h=300',
          type: 'cart'
        }
      } 
    });
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-20">
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Your Cart</h1>
      </header>

      <main className="p-6">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag size={32} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Cart is empty</h2>
            <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <button 
              onClick={() => navigate('/app/marketplace')}
              className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-bold"
            >
              Explore Marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <motion.div 
                key={`${item.type}_${item.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl shadow-sm flex gap-4"
              >
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-20 h-20 rounded-xl object-cover"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.brand || item.specialty}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-[#FF6B6B]">₹{item.price * item.quantity}</span>
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                      <button 
                        onClick={() => {
                          if (item.quantity > 1) updateQuantity(item.id, item.type, item.quantity - 1);
                          else removeFromCart(item.id, item.type);
                        }}
                        className="w-6 h-6 bg-white rounded flex items-center justify-center text-gray-600 shadow-sm"
                      >
                        {item.quantity === 1 ? <Trash2 size={12} className="text-red-500"/> : <Minus size={12} />}
                      </button>
                      <span className="text-xs font-bold text-gray-800 min-w-[1ch] text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                        className="w-6 h-6 bg-white rounded flex items-center justify-center text-gray-600 shadow-sm"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="bg-white rounded-3xl p-6 shadow-sm mt-8">
              <h2 className="text-sm uppercase tracking-wider text-gray-400 font-bold mb-4">Summary</h2>
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taxes (Estimated)</span>
                  <span>₹{Math.round(cartTotal * 0.18)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-800 pt-3 border-t border-gray-100">
                  <span>Total</span>
                  <span>₹{cartTotal + Math.round(cartTotal * 0.18)}</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 shadow-xl shadow-gray-900/20"
              >
                <CreditCard size={20} />
                Checkout ₹{cartTotal + Math.round(cartTotal * 0.18)}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
