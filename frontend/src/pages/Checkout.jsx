import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, ShieldCheck, CreditCard } from 'lucide-react';
import { API, useAuth } from '../App';
import axios from 'axios';

const Checkout = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const item = loc.state?.item;

  useEffect(() => {
    if (!item) {
      navigate('/app/marketplace', { replace: true });
    }
  }, [item, navigate]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadRazorpay();

      if (!res) {
        setError('Razorpay SDK failed to load. Are you online?');
        setLoading(false);
        return;
      }

      // Create order
      const { data: order } = await axios.post(`${API}/payment/create-order`, {
        amount: item.price
      });

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_placeholder', 
        amount: order.amount,
        currency: order.currency,
        name: 'NutriAI Marketplace',
        description: `Payment for ${item.name}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // Verify payment
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              item_id: item.id,
              item_type: item.type
            });
            setSuccess(true);
          } catch (err) {
            console.error('Verification failed', err);
            setError('Payment verification failed. Please contact support if amount was deducted.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#FF6B6B',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Could not initialize payment. Please try again.');
      setLoading(false);
    }
  };

  if (!item) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full text-center"
        >
          <CheckCircle size={64} className="text-green-500 mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-500 mb-8">Your booking for {item.name} has been confirmed. You will receive an email with details shortly.</p>
          <button 
            onClick={() => navigate('/app/marketplace')}
            className="w-full bg-[#FF6B6B] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#FF6B6B]/30"
          >
            Back to Marketplace
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-20">
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Checkout</h1>
      </header>

      <main className="p-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-3xl p-6 shadow-sm mb-6"
        >
          <h2 className="text-sm uppercase tracking-wider text-gray-400 font-bold mb-4">Order Summary</h2>
          
          <div className="flex gap-4 items-center mb-6 pb-6 border-b border-gray-100">
            <img 
              src={item.image} 
              alt={item.name} 
              className="w-20 h-20 rounded-2xl object-cover shadow-sm"
            />
            <div>
              <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{item.description}</p>
              <p className="font-bold text-[#FF6B6B]">₹{item.price}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{item.price}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxes</span>
              <span>₹{Math.round(item.price * 0.18)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-800 pt-3 border-t border-gray-100">
              <span>Total</span>
              <span>₹{item.price + Math.round(item.price * 0.18)}</span>
            </div>
          </div>

          <div className="bg-[#FF6B6B]/5 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck size={20} className="text-[#FF6B6B] mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Safe & secure payments. 100% Authentic products and certified professionals.
            </p>
          </div>
        </motion.div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <button 
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-70 transition-all hover:bg-gray-800 shadow-xl shadow-gray-900/20"
        >
          {loading ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <CreditCard size={20} />
              Pay ₹{item.price + Math.round(item.price * 0.18)}
            </>
          )}
        </button>
      </main>
    </div>
  );
};

export default Checkout;
