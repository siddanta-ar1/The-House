'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [modal, setModal] = useState({ open: false, msg: '', type: 'error' as any });
  const router = useRouter();

  useEffect(() => {
    if (sessionStorage.getItem('house_admin_session')) router.push('/admin/dashboard');
  }, [router]);

  const handleLogin = () => {
    if (password === 'House2025') {
      sessionStorage.setItem('house_admin_session', 'true');
      router.push('/admin/dashboard');
    } else {
      setModal({ open: true, msg: 'Incorrect Password', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A] p-6">
      <StatusModal 
        isOpen={modal.open} 
        message={modal.msg} 
        type={modal.type} 
        onClose={() => setModal({...modal, open: false})} 
      />

      <div className="bg-white p-8 rounded-[32px] w-full max-w-sm shadow-2xl text-center">
        <h1 className="text-xl font-bold mb-8 uppercase tracking-widest text-stone-800">Admin Access</h1>
        <input 
          type="password" 
          className="input-field mb-6 bg-stone-50 border-stone-200"
          placeholder="Enter Password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-bold uppercase tracking-widest">
          Login
        </button>
      </div>
    </div>
  );
}