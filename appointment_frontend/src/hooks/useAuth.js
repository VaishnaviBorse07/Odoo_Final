// Thin re-export of auth context for pages and components that need session state.
import { useAuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  return useAuthContext();
}
