import React, { useState } from 'react';
import { playSound } from '../services/soundService';

interface RegistrationModalProps {
  onRegister: (email: string, pass: string) => Promise<{ error: { message: string } | null }>;
  onSkip: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ onRegister, onSkip }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegisterClick = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setPasswordsMatch(false);
      playSound('error');
      return;
    }
    setPasswordsMatch(true);
    setLoading(true);
    
    const { error: registrationError } = await onRegister(email, password);

    setLoading(false);
    if (registrationError) {
        playSound('error');
        setError(registrationError.message === 'User already registered' ? 'Este email já está em uso.' : registrationError.message);
    } else {
        playSound('victory');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <h3 className="text-xl font-bold text-gray-800">Crie sua Conta</h3>
        <p className="text-gray-600 my-4">
          Salve seu progresso e acesse de qualquer lugar. É rápido e fácil!
        </p>
        <div className="space-y-4 text-left">
           <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#38b6ff] focus:border-[#38b6ff] sm:text-sm"
                placeholder="voce@email.com"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#38b6ff] focus:border-[#38b6ff] sm:text-sm"
                placeholder="Crie uma senha"
              />
            </div>
            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
              <input
                id="reg-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${!passwordsMatch ? 'border-red-500' : 'border-gray-300 focus:ring-[#38b6ff] focus:border-[#38b6ff]'}`}
                placeholder="Confirme sua senha"
              />
              {!passwordsMatch && <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>}
            </div>
        </div>
        {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleRegisterClick}
            disabled={!email || !password || !confirmPassword || loading}
            className="w-full px-6 py-3 rounded-lg font-semibold bg-[#38b6ff] text-white disabled:bg-gray-400"
          >
            {loading ? 'Criando...' : 'Criar Conta e Salvar'}
          </button>
          <button
            onClick={onSkip}
            className="w-full text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            Continuar sem salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;