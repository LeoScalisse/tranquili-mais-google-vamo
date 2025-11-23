import React from 'react';

interface AuthScreenProps {
  onNewUser: () => void;
  onExistingUser: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onNewUser, onExistingUser }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#38b6ff] to-blue-200 text-white p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">
          Bem-vindo(a) ao Tranquili<span className="text-[#ffde59]">+</span>
        </h1>
        <p className="text-lg opacity-80 mt-2">Seu refúgio de calma e clareza.</p>
      </div>
      <div className="bg-white/20 backdrop-blur-lg p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <h2 className="text-2xl font-semibold mb-6">Como começamos?</h2>
        <div className="space-y-4">
          <button
            onClick={onNewUser}
            className="w-full bg-white text-[#38b6ff] font-bold py-3 rounded-xl shadow-md hover:bg-gray-100 transition-all transform hover:scale-105"
          >
            Sou Novo Por Aqui
          </button>
          <button
            onClick={onExistingUser}
            className="w-full bg-transparent border-2 border-white text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-all transform hover:scale-105"
          >
            Já Tenho Conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
