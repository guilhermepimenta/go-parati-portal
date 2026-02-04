
import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import Logo from './Logo';

import { authService } from '../auth';
import { User } from '../types';

interface AdminLoginProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail corporativo acima para recuperar a senha.');
      return;
    }

    if (!window.confirm(`Enviar link de recuperação para ${email}?`)) return;

    setIsLoading(true);
    setError('');

    try {
      await authService.resetPassword(email);
      alert('Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError('');

    try {

      const user = await authService.login(email, password);

      onLogin(user);
    } catch (err: any) {
      console.error('[AdminLogin] Login error caught:', err);
      setError(err.message || 'Erro ao realizar login');
    } finally {
      console.log('[AdminLogin] Finished loading state.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o portal
        </button>

        <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/50 backdrop-blur-xl">
          <div className="flex justify-center mb-10">
            <Logo hideText />
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Painel Administrativo</h2>
            <p className="text-slate-500 text-sm">Faça login para gerenciar o portal GoParaty.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100 flex items-center justify-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
                  placeholder="admin@paraty.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Senha</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-sky-600 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-sky-600 text-white font-bold rounded-2xl shadow-lg shadow-sky-600/30 hover:bg-sky-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar no Painel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
