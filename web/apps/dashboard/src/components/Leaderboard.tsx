import { useLeaderboard } from '../api';

export function Leaderboard() {
  const { data = [] } = useLeaderboard();
  return (
    <div className="panel flex flex-col p-4">
      <span className="panel-title mb-2">Operator Leaderboard</span>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-neon-cyan/50">
            <tr>
              <th className="text-left font-normal">#</th>
              <th className="text-left font-normal">operator</th>
              <th className="text-right font-normal">lvl</th>
              <th className="text-right font-normal">xp</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e, i) => (
              <tr key={e.username} className="border-t border-neon-cyan/10">
                <td className={`py-1 ${i < 3 ? 'text-neon-amber' : 'text-neon-cyan/50'}`}>{i + 1}</td>
                <td className="text-neon-green">{e.username}</td>
                <td className="text-right text-neon-cyan">{e.level}</td>
                <td className="text-right text-neon-cyan/80">{e.xp.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
