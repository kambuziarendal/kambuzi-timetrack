import { create } from 'zustand';
export type Role = 'ADMIN'|'EMPLOYEE';
type User = { id: string; companyId: string; role: Role; email: string; firstName: string; lastName: string };
type AuthState = { user?: User; accessToken?: string; refreshToken?: string; setAuth: (v: { user: User; accessToken: string; refreshToken: string }) => void; setAccessToken: (t: string) => void; logout: () => void };
export const useAuthStore = create<AuthState>(set => ({ setAuth: v => set(v), setAccessToken: accessToken => set({ accessToken }), logout: () => set({ user: undefined, accessToken: undefined, refreshToken: undefined }) }));
