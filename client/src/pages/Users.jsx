import { useEffect, useState } from 'react';
import {
  Trash2, UserPlus, Eye, EyeOff, X,
  ShieldCheck, User, CheckCircle, Clock, XCircle,
  Users as UsersIcon, AlertCircle,
} from 'lucide-react';
import { useApiFetch } from '../hooks/useAuth';

const STATUS_CFG = {
  approved: { label: 'Активен',     icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:  { label: 'Ожидает',     icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'Отклонён',    icon: XCircle,      cls: 'bg-red-50 text-red-600 border-red-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.approved;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function Users() {
  const apiFetch = useApiFetch();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionId, setActionId] = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch('/api/admin/users')
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (id) => {
    setActionId(id);
    await apiFetch(`/api/admin/users/${id}/approve`, { method: 'POST' }).catch(() => {});
    setActionId(null);
    load();
  };

  const reject = async (id) => {
    setActionId(id);
    await apiFetch(`/api/admin/users/${id}/reject`, { method: 'POST' }).catch(() => {});
    setActionId(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Удалить пользователя? Это действие необратимо.')) return;
    setActionId(id);
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }).catch(() => {});
    setActionId(null);
    load();
  };

  const pending  = users.filter((u) => u.status === 'pending');
  const rest     = users.filter((u) => u.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление доступом к системе</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
          <UserPlus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {showForm && (
        <CreateUserForm
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
          apiFetch={apiFetch}
        />
      )}

      {loading ? (
        <div className="card p-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="w-7 h-7 text-brand-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Нет пользователей</h3>
          <p className="text-sm text-gray-400 mb-5">Создайте первого пользователя для доступа к системе</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
            <UserPlus className="w-4 h-4" />Добавить пользователя
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending approvals */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Ожидают подтверждения</h2>
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                  {pending.length}
                </span>
              </div>
              <div className="space-y-2">
                {pending.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    actionId={actionId}
                    onApprove={approve}
                    onReject={reject}
                    onDelete={remove}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All users */}
          {rest.length > 0 && (
            <div>
              {pending.length > 0 && <h2 className="text-sm font-semibold text-gray-700 mb-3">Все пользователи</h2>}
              <div className="space-y-2">
                {rest.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    actionId={actionId}
                    onApprove={approve}
                    onReject={reject}
                    onDelete={remove}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserRow({ user: u, actionId, onApprove, onReject, onDelete }) {
  const busy = actionId === u.id;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 shadow-card">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
        {u.username[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{u.username}</span>
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium ${
            u.role === 'admin'
              ? 'bg-brand-50 text-brand-700 border-brand-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {u.role === 'admin' ? 'Admin' : 'User'}
          </span>
          <StatusBadge status={u.status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
          {u.email && <span className="truncate">{u.email}</span>}
          <span>
            {new Date(u.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {u.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(u.id)}
              disabled={busy}
              title="Одобрить"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-40"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Одобрить
            </button>
            <button
              onClick={() => onReject(u.id)}
              disabled={busy}
              title="Отклонить"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-40"
            >
              <XCircle className="w-3.5 h-3.5" />
              Отклонить
            </button>
          </>
        )}
        {u.role !== 'admin' && (
          <button
            onClick={() => onDelete(u.id)}
            disabled={busy}
            title="Удалить"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function CreateUserForm({ onClose, onCreated, apiFetch }) {
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('user');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, email: email || undefined, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 shadow-card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
            <UserPlus className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <h2 className="font-semibold text-gray-900 text-sm">Новый пользователь</h2>
        </div>
        <button onClick={onClose} className="btn-icon btn-ghost text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="input"
              required
              minLength={3}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Email <span className="text-gray-400">(необязательно)</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Пароль</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 8 символов"
                className="input pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Роль</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="user">User — обычный доступ</option>
              <option value="admin">Admin — полный доступ</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost text-sm px-4 py-2">Отмена</button>
          <button type="submit" disabled={loading} className="btn-primary text-sm px-5 py-2">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><UserPlus className="w-3.5 h-3.5" />Создать</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}

