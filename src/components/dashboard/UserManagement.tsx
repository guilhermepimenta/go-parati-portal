import React from 'react';
import { Plus } from 'lucide-react';
import { User } from '../../types';
import { authService } from '../../auth';

interface UserManagementProps {
    usersList: User[];
    isAddingUser: boolean;
    setIsAddingUser: (val: boolean) => void;
    editingUser: User | null;
    setEditingUser: (user: User | null) => void;
    fetchUsers: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
    usersList,
    isAddingUser,
    setIsAddingUser,
    editingUser,
    setEditingUser,
    fetchUsers
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Equipe</h1>
                    <p className="text-slate-400 font-medium text-lg">Controle de acesso e permissões.</p>
                </div>
                <button
                    onClick={() => setIsAddingUser(true)}
                    className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Novo Usuário
                </button>
            </div>

            {isAddingUser && (
                <div className="bg-white rounded-[32px] p-8 mb-8 border border-slate-100 shadow-xl">
                    <h3 className="text-xl font-bold mb-6">{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h3>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value;
                        const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                        const role = (e.currentTarget.elements.namedItem('role') as HTMLSelectElement).value;
                        const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

                        if (editingUser) {
                            await authService.updateUser({
                                ...editingUser,
                                name,
                                email,
                                role: role as any,
                                password: password || editingUser.password // Keep old password if empty
                            });
                        } else {
                            await authService.createUser({
                                name, email, role: role as any, password: password || '123'
                            });
                        }

                        fetchUsers();
                        setIsAddingUser(false);
                        setEditingUser(null);
                    }}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <input name="name" placeholder="Nome" className="p-3 bg-slate-50 rounded-xl" required defaultValue={editingUser?.name} />
                            <input name="email" placeholder="Email" className="p-3 bg-slate-50 rounded-xl" required defaultValue={editingUser?.email} />
                            <select name="role" className="p-3 bg-slate-50 rounded-xl" defaultValue={editingUser?.role}>
                                <option value="user">Colaborador</option>
                                <option value="intern">Estagiário</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <input
                                name="password"
                                type="password"
                                placeholder={editingUser ? "Senha (deixe vazio para manter)" : "Senha"}
                                className="p-3 bg-slate-50 rounded-xl"
                                required={!editingUser}
                            />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                            <button type="button" onClick={() => { setIsAddingUser(false); setEditingUser(null); }} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-sky-600 text-white rounded-xl font-bold">{editingUser ? 'Atualizar' : 'Salvar'}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-slate-400">Usuário</th>
                            <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-slate-400">Email</th>
                            <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-slate-400">Permissão</th>
                            <th className="px-8 py-5 text-right text-[10px] uppercase tracking-widest text-slate-400">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {usersList.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="px-8 py-5 font-bold text-slate-700">{u.name}</td>
                                <td className="px-8 py-5 text-slate-500">{u.email}</td>
                                <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                        u.role === 'intern' ? 'bg-amber-100 text-amber-600' :
                                            'bg-sky-100 text-sky-600'
                                        }`}>
                                        {u.role === 'user' ? 'Colaborador' : u.role === 'intern' ? 'Estagiário' : 'Admin'}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => { setEditingUser(u); setIsAddingUser(true); }}
                                            className="text-sky-500 hover:text-sky-600 font-bold text-xs"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
