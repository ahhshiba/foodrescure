import { GameShell } from './components/GameShell';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './store/auth';

export default function App() {
  const token = useAuth((s) => s.token);
  return token ? <GameShell /> : <LoginScreen />;
}
