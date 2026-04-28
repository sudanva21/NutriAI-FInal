import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ShieldCheck, CreditCard, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { API, useAuth } from '../App';
import axios from 'axios';

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatSlotKey(counselorId, dateStr, time) {
  return `nutriai_booking_${counselorId}_${dateStr}_${time}`;
}

function isSlotBooked(counselorId, dateStr, time) {
  return !!localStorage.getItem(formatSlotKey(counselorId, dateStr, time));
}

function bookSlot(counselorId, dateStr, time) {
  localStorage.setItem(formatSlotKey(counselorId, dateStr, time), '1');
}

// Returns array of {date: Date, dateStr: string} for next 14 days matching counselor's availableDays
function getAvailableDates(counselor, weeks = 2) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (counselor.availableDays.includes(d.getDay())) {
      const dateStr = d.toISOString().split('T')[0];
      dates.push({ date: d, dateStr });
    }
  }
  return dates;
}

// ── DateTimePicker ────────────────────────────────────────────────────────────
function DateTimePicker({ counselor, selectedDate, selectedTime, onDateChange, onTimeChange }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const allDates = getAvailableDates(counselor, 4);
  // Show 7 at a time, paginated
  const page = allDates.slice(weekOffset * 5, weekOffset * 5 + 5);
  const canPrev = weekOffset > 0;
  const canNext = (weekOffset + 1) * 5 < allDates.length;

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#1A1A1A]">Pick a Date</span>
          <div className="flex gap-1">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              disabled={!canPrev}
              className="w-7 h-7 rounded-full bg-[#F2EFEB] flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              disabled={!canNext}
              className="w-7 h-7 rounded-full bg-[#F2EFEB] flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {page.map(({ date, dateStr }) => {
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => { onDateChange(dateStr); onTimeChange(null); }}
                className={`flex-shrink-0 flex flex-col items-center py-3 px-4 rounded-2xl transition-all ${
                  isSelected
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F2EFEB] text-[#1A1A1A] hover:bg-[#E8E3DC]'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">{DAY_NAMES[date.getDay()]}</span>
                <span className="text-xl font-display font-medium mt-0.5">{date.getDate()}</span>
                <span className="text-[10px] opacity-60 mt-0.5">{MONTH_NAMES[date.getMonth()]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slot selector */}
      {selectedDate && (
        <div>
          <div className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#6B635E]" strokeWidth={1.75} /> Available Times
          </div>
          <div className="grid grid-cols-3 gap-2">
            {counselor.workingHours.map(time => {
              const booked = isSlotBooked(counselor.id, selectedDate, time);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  disabled={booked}
                  onClick={() => onTimeChange(time)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                    booked
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                      : isSelected
                      ? 'bg-[#E26D5C] text-white shadow-[0_4px_12px_rgba(226,109,92,0.3)]'
                      : 'bg-[#F2EFEB] text-[#1A1A1A] hover:bg-[#E8E3DC]'
                  }`}
                >
                  {time}
                  {booked && (
                    <span className="block text-[9px] uppercase tracking-wider font-normal opacity-60 mt-0.5">Booked</span>
                  )}
                </button>
              );
            })}
          </div>
          {counselor.workingHours.every(t => isSlotBooked(counselor.id, selectedDate, t)) && (
            <div className="mt-3 text-center text-xs text-[#E26D5C] font-semibold bg-[#E26D5C]/10 py-2 rounded-xl">
              All slots booked for this date. Try another day.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Checkout ─────────────────────────────────────────────────────────────
const Checkout = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedInfo, setBookedInfo] = useState(null);

  const item = loc.state?.item;
  const isCounselor = item?.type === 'counselor';

  useEffect(() => {
    if (!item) navigate('/app/marketplace', { replace: true });
  }, [item, navigate]);

  const loadRazorpay = () => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handlePayment = async () => {
    if (isCounselor && (!selectedDate || !selectedTime)) {
      setError('Please select a date and time slot before proceeding.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await loadRazorpay();
      if (!res) { setError('Razorpay SDK failed to load. Are you online?'); setLoading(false); return; }

      const { data: order } = await axios.post(`${API}/payment/create-order`, { amount: item.price });

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: order.amount,
        currency: order.currency,
        name: 'NutriAI Marketplace',
        description: isCounselor
          ? `Session with ${item.name} on ${selectedDate} at ${selectedTime}`
          : `Payment for ${item.name}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              item_id: item.id,
              item_type: item.type,
            });
            // Lock slot in localStorage
            if (isCounselor) {
              bookSlot(item.id, selectedDate, selectedTime);
              setBookedInfo({ date: selectedDate, time: selectedTime });
            }
            setSuccess(true);
          } catch {
            setError('Payment verification failed. Please contact support if amount was deducted.');
          }
        },
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#E26D5C' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      setLoading(false);
    } catch (err) {
      setError('Could not initialize payment. Please try again.');
      setLoading(false);
    }
  };

  if (!item) return null;

  const total = item.price + Math.round(item.price * 0.18);

  if (success) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-2xl font-medium mb-2">Confirmed! 🎉</h2>
          {isCounselor && bookedInfo ? (
            <p className="text-[#6B635E] text-sm mb-6">
              Your session with <strong>{item.name}</strong> is booked for <strong>{bookedInfo.date}</strong> at <strong>{bookedInfo.time}</strong>. Check your email for the meeting link.
            </p>
          ) : (
            <p className="text-[#6B635E] text-sm mb-6">
              Your order for <strong>{item.name}</strong> has been confirmed. You will receive an email with details shortly.
            </p>
          )}
          <button onClick={() => navigate('/app/marketplace')} className="w-full bg-[#E26D5C] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#E26D5C]/30">
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-32">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-black/5 sticky top-0 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-[#F2EFEB] rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <h1 className="font-display text-xl font-medium">Checkout</h1>
      </header>

      <main className="max-w-lg mx-auto p-5 space-y-4">
        {/* Order summary */}
        <div className="card p-5">
          <h2 className="text-xs uppercase tracking-widest text-[#6B635E] font-bold mb-4">Order Summary</h2>
          <div className="flex gap-4 items-center mb-5 pb-5 border-b border-black/5">
            <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
            <div>
              <h3 className="font-display text-lg font-medium leading-tight mb-1">{item.name}</h3>
              <p className="text-sm text-[#6B635E] mb-2">{item.description}</p>
              <p className="font-bold text-[#E26D5C]">₹{item.price}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#6B635E]"><span>Subtotal</span><span>₹{item.price}</span></div>
            <div className="flex justify-between text-[#6B635E]"><span>GST (18%)</span><span>₹{Math.round(item.price * 0.18)}</span></div>
            <div className="flex justify-between font-bold text-lg text-[#1A1A1A] pt-2 border-t border-black/5">
              <span>Total</span><span>₹{total}</span>
            </div>
          </div>
        </div>

        {/* Booking slot picker — only for counselors */}
        {isCounselor && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#E26D5C]" strokeWidth={1.75} />
              <h2 className="font-display text-lg font-medium">Select Appointment</h2>
            </div>
            <DateTimePicker
              counselor={item}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateChange={setSelectedDate}
              onTimeChange={setSelectedTime}
            />
            {selectedDate && selectedTime && (
              <div className="mt-4 bg-[#E26D5C]/10 text-[#E26D5C] rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" strokeWidth={2} />
                Slot selected: {selectedDate} at {selectedTime}
              </div>
            )}
          </div>
        )}

        <div className="bg-[#F2EFEB] rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#E26D5C] mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <p className="text-xs text-[#6B635E] leading-relaxed">
            Safe &amp; secure payments. 100% Authentic products and certified professionals.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm border border-red-100">{error}</div>
        )}
      </main>

      {/* Fixed pay button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-5 py-4 z-20">
        <div className="max-w-lg mx-auto">
          {isCounselor && !selectedDate && (
            <p className="text-xs text-center text-[#6B635E] mb-3">⬆ Select a date and time to continue</p>
          )}
          <button
            onClick={handlePayment}
            disabled={loading || (isCounselor && (!selectedDate || !selectedTime))}
            className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:bg-gray-800 shadow-xl shadow-gray-900/20"
            data-testid="pay-btn"
          >
            {loading ? (
              <span className="animate-pulse">Processing…</span>
            ) : (
              <>
                <CreditCard className="w-5 h-5" strokeWidth={1.75} />
                Pay ₹{total}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
