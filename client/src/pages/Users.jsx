import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Trash2, Clock, ShieldCheck, UserX } from 'lucide-react';
import { useApiFetch } from '../hooks/useAuth';

const STATUS_LABEL = {
  pending:  { label: 'Ожидает',    cls: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Clock },
  approved: { label: 'Подтверждён', cls: 'bg-green-50 text-green-700 border-green-200', icon: ShieldCheck },
  rejected: { label: 'Отклонён',   cls: 'bg-red-50 text-red-600 border-red-200',        icon: UserX },
};

export default function Users() {
  const apiFetch = useApiFetch();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch('/api/admin/users')
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const action = async (id, endpoint) => {
    setActionId(id);
    await apiFetch(endpoint, { method: 'POST' }).catch(() => {});
    setActionId(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Удалить пользователя?')) return;
    setActionId(id);
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }).catch(() => {});
    setActionId(null);
    load();
  };

  const pending = users.filter((u) => u.status === 'pending');
  const rest = users.filter((u) => u.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Пользователи</h1>
        <p className="text-sm text-gray-500 mt-0.5">Управление доступом к системе</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Загрузка...</div>
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ожидают подтверждения ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    busy={actionId === u.id}
                    onApprove={() => action(u.id, `/api/admin/users/${u.id}/approve`)}
                    onReject={() => action(u.id, `/api/admin/users/${u.id}/reject`)}
                    onDelete={() => remove(u.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">Все пользователи</h2>
              <div className="space-y-2">
                {rest.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    busy={actionId === u.id}
                    onApprove={() => action(u.id, `/api/admin/users/${u.id}/approve`)}
                    onReject={() => action(u.id, `/api/admin/users/${u.id}/reject`)}
                    onDelete={() => remove(u.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {users.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">Нет пользователей</div>
          )}
        </>
      )}
    </div>
  );
}

function UserRow({ user, busy, onApprove, onReject, onDelete }) {
  const st = STATUS_LABEL[user.status] || STATUS_LABEL.pending;
  const Icon = st.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
        {user.username[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{user.username}</span>
          {user.role === 'admin' && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-medium">
              Admin
            </span>
          )}
        </div>
        {user.email && <div className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</div>}
        <div className="text-xs text-gray-400 mt-0.5">{new Date(user.created_at).toLocaleDateString('ru')}</div>
      </div>

      <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${st.cls}`}>
        <Icon className="w-3.5 h-3.5" />
        {st.label}
      </div>

      {user.role !== 'admin' && (
        <div className="flex items-center gap-1 shrink-0">
          {user.status !== 'approved' && (
            <button
              onClick={onApprove}
              disabled={busy}
              title="Подтвердить"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
            >
              <CheckCircle className="w-4.5 h-4.5" />
            </button>
          )}
          {user.status !== 'rejected' && (
            <button
              onClick={onReject}
              disabled={busy}
              title="Отклонить"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
            >
              <XCircle className="w-4.5 h-4.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={busy}
            title="Удалить"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
