'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusModal from '@/components/StatusModal';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modal, setModal] = useState({ open: false, msg: '', type: 'error' as any });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/admin/dashboard');
    });
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      setModal({ open: true, msg: 'Please enter email and password', type: 'error' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setModal({ open: true, msg: error.message, type: 'error' });
    } else {
      router.push('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A] p-6">
      <StatusModal
        isOpen={modal.open}
        message={modal.msg}
        type={modal.type}
        onClose={() => setModal({ ...modal, open: false })}
      />

      <div className="bg-white p-8 rounded-[32px] w-full max-w-sm shadow-2xl text-center">
        <h1 className="text-xl font-bold mb-8 uppercase tracking-widest text-stone-800">Admin Access</h1>
        <input
          type="email"
          className="input-field mb-4 bg-stone-50 border-stone-200"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="input-field mb-6 bg-stone-50 border-stone-200"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Login'}
        </button>
      </div>
    </div>
  );
}