import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { playSound } from '../services/soundService';

interface LoginScreenProps {
  onBack: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) {
        playSound('error');
        setError(error.message === 'Invalid login credentials' ? 'Email ou senha inválidos.' : error.message);
    } else {
        playSound('confirm');
        // onAuthStateChange in App.tsx will handle navigation
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
                Fazer Login
            </h1>
            <p className="text-gray-500 mt-2">Que bom te ver de volta!</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-gray-50 text-gray-900 focus:outline-none focus:ring-[#38b6ff] focus:border-[#38b6ff] sm:text-sm"
                placeholder="voce@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-gray-50 text-gray-900 focus:outline-none focus:ring-[#38b6ff] focus:border-[#38b6ff] sm:text-sm"
                placeholder="Sua senha"
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#38b6ff] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#38b6ff] disabled:opacity-50"
                disabled={!email || !password || loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
            <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-800">
                &larr; Voltar
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;