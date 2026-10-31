import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@/api/auth.api';
import { officialsApi } from '@/api/officials.api';
import { setAccessToken, tokenStorage, apiClient } from '@/api/client';
import { OfficialProfile, RegisterOfficialPayload, SendOtpResponse, User } from '@/types/api';

const CUSTOM_NAME_KEY = 'vv_official_custom_name';

export interface OnboardingDraft {
  sportId: string;
  fullName: string;
  level: 'AMATEUR' | 'PROFESSIONAL';
  experienceYears: number;
  certificateUrl?: string | null;
  certificateFileName?: string | null;
  certificateFileSize?: string | null;
}

export interface VerifyOtpResult {
  user: User;
  profile: OfficialProfile | null;
  isOfficial: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: OfficialProfile | null;
  officialDisplayName: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  needsOnboarding: boolean;
  onboardingDraft: OnboardingDraft;
  updateOnboardingDraft: (draft: Partial<OnboardingDraft>) => void;
  updateOfficialName: (name: string) => Promise<void>;
  sendOtp: (email: string) => Promise<SendOtpResponse>;
  verifyOtp: (email: string, otp: string, name?: string) => Promise<VerifyOtpResult>;
  completeOnboarding: (override?: Partial<RegisterOfficialPayload>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const defaultOnboardingDraft: OnboardingDraft = {
  sportId: 'cricket',
  fullName: '',
  level: 'AMATEUR',
  experienceYears: 3,
  certificateUrl: null,
  certificateFileName: null,
  certificateFileSize: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OfficialProfile | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>(defaultOnboardingDraft);

  const updateOnboardingDraft = (partial: Partial<OnboardingDraft>) => {
    setOnboardingDraft((prev) => ({ ...prev, ...partial }));
  };

  // Helper to read stored name
  const loadStoredName = async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(CUSTOM_NAME_KEY);
        }
        return null;
      }
      return await SecureStore.getItemAsync(CUSTOM_NAME_KEY);
    } catch {
      return null;
    }
  };

  const persistStoredName = async (name: string | null): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          if (name) window.localStorage.setItem(CUSTOM_NAME_KEY, name);
          else window.localStorage.removeItem(CUSTOM_NAME_KEY);
        }
        return;
      }
      if (name) {
        await SecureStore.setItemAsync(CUSTOM_NAME_KEY, name);
      } else {
        await SecureStore.deleteItemAsync(CUSTOM_NAME_KEY);
      }
    } catch {
      // Ignored
    }
  };

  // Restore session on app launch
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const [storedRefreshToken, savedName] = await Promise.all([
          tokenStorage.getRefreshToken(),
          loadStoredName(),
        ]);

        if (savedName && isMounted) {
          setCustomName(savedName);
        }

        if (!storedRefreshToken) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Try refreshing access token
        const refreshRes = await authApi.refreshToken(storedRefreshToken);
        const newAccessToken = refreshRes?.data?.accessToken;
        const newRefreshToken = refreshRes?.data?.refreshToken;

        if (newAccessToken) {
          setAccessToken(newAccessToken);
          if (newRefreshToken) {
            await tokenStorage.setRefreshToken(newRefreshToken);
          }

          // Fetch fresh user
          const meRes = await authApi.getMe().catch(() => null);
          if (meRes?.data) {
            setUser(meRes.data);
            setOnboardingDraft((d) => ({
              ...d,
              fullName: savedName || meRes.data.name || '',
            }));

            // Check official profile on user object or roles
            let loadedProfile: OfficialProfile | null = meRes.data.officialProfile
              ? ((meRes.data.officialProfile as any).profile ?? meRes.data.officialProfile)
              : null;

            const isOfficial =
              Boolean(meRes.data.profiles?.official) ||
              Boolean(meRes.data.roles?.includes('OFFICIAL')) ||
              Boolean(meRes.data.roles?.includes('UMPIRE'));

            // Fetch profile
            try {
              const profileRes = await officialsApi.getProfile();
              if (profileRes?.data) {
                const fetched = (profileRes.data as any)?.profile ?? profileRes.data;
                if (fetched?.preferredSportId || fetched?.level) {
                  loadedProfile = fetched;
                }
              }
            } catch {
              if (isOfficial && !loadedProfile) {
                loadedProfile = {
                  id: meRes.data.id,
                  userId: meRes.data.id,
                  preferredSportId: 'cricket',
                  level: 'AMATEUR',
                  experienceYears: 0,
                  verificationStatus: 'VERIFIED',
                };
              }
            }

            setProfile(loadedProfile);
          }
        }
      } catch (err) {
        console.warn('Session restoration error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const sendOtp = async (email: string): Promise<SendOtpResponse> => {
    const res = await authApi.sendOtp(email);
    return res.data;
  };

  const verifyOtp = async (email: string, otp: string, name?: string): Promise<VerifyOtpResult> => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(email, otp, name);
      const { user: authedUser, accessToken, refreshToken } = res.data;

      setAccessToken(accessToken);
      if (refreshToken) {
        await tokenStorage.setRefreshToken(refreshToken);
      }

      const savedName = await loadStoredName();
      if (savedName) {
        setCustomName(savedName);
      }

      setUser(authedUser);
      setOnboardingDraft((d) => ({
        ...d,
        fullName: savedName || authedUser.name || '',
      }));

      // 1. Check whether official profile already exists on verify-otp user response
      const officialProfile = authedUser.officialProfile;
      const isOfficialFromUser = Boolean(
        authedUser.profiles?.official ||
        authedUser.roles?.includes('OFFICIAL') ||
        authedUser.roles?.includes('UMPIRE')
      );

      let loadedProfile: OfficialProfile | null = officialProfile
        ? ((officialProfile as any).profile ?? officialProfile)
        : null;

      // 2. Query /officials/me/profile to get fresh details
      try {
        const profileRes = await officialsApi.getProfile();
        if (profileRes?.data) {
          const fetched = (profileRes.data as any)?.profile ?? profileRes.data;
          if (fetched?.preferredSportId || fetched?.level) {
            loadedProfile = fetched;
          }
        }
      } catch {
        if (isOfficialFromUser && !loadedProfile) {
          loadedProfile = {
            id: authedUser.id,
            userId: authedUser.id,
            preferredSportId: 'cricket',
            level: 'AMATEUR',
            experienceYears: 0,
            verificationStatus: 'VERIFIED',
          };
        }
      }

      setProfile(loadedProfile);

      const hasOfficialSportOrLevel = Boolean(
        loadedProfile?.preferredSportId ||
        (loadedProfile as any)?.profile?.preferredSportId ||
        loadedProfile?.level
      );

      const isOfficial = Boolean(
        officialProfile ||
        isOfficialFromUser ||
        hasOfficialSportOrLevel
      );

      return {
        user: authedUser,
        profile: loadedProfile,
        isOfficial,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const updateOfficialName = async (newName: string): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setCustomName(trimmed);
    await persistStoredName(trimmed);

    // Update in-memory user
    setUser((prev) => (prev ? { ...prev, name: trimmed } : null));

    // Also try syncing to backend
    try {
      await apiClient('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      // Backend fallback gracefully handled via persistent SecureStore
    }
  };

  const completeOnboarding = async (override?: Partial<RegisterOfficialPayload>): Promise<void> => {
    setIsLoading(true);
    try {
      const activeLevel = override?.level || onboardingDraft.level || 'AMATEUR';
      const payload: RegisterOfficialPayload = {
        preferredSportId: override?.preferredSportId || onboardingDraft.sportId || 'cricket',
        level: activeLevel,
        experienceYears:
          override?.experienceYears !== undefined
            ? Number(override.experienceYears)
            : Number(onboardingDraft.experienceYears) || 0,
        certificateUrl:
          activeLevel === 'PROFESSIONAL'
            ? override?.certificateUrl ||
              onboardingDraft.certificateUrl ||
              'https://certificates.velocityventures.internal/umpire_certificate.pdf'
            : null,
      };

      if (onboardingDraft.fullName) {
        await updateOfficialName(onboardingDraft.fullName);
      }

      const res = await officialsApi.upsertProfile(payload);
      if (res?.data) {
        setProfile(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      const [profileRes, meRes] = await Promise.allSettled([
        officialsApi.getProfile(),
        authApi.getMe(),
      ]);
      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        setProfile(profileRes.value.data);
      }
      if (meRes.status === 'fulfilled' && meRes.value?.data) {
        setUser(meRes.value.data);
      }
    } catch {
      // keep existing
    }
  }, []);

  const logout = async (): Promise<void> => {
    setAccessToken(null);
    await tokenStorage.clearRefreshToken();
    await persistStoredName(null);
    setUser(null);
    setProfile(null);
    setCustomName(null);
    setOnboardingDraft(defaultOnboardingDraft);
  };

  // Derive readable name with intelligent formatting
  const officialDisplayName = useMemo(() => {
    if (customName && customName.trim()) {
      return customName.trim();
    }
    const raw = user?.name || profile?.user?.name || (profile as any)?.fullName || (profile as any)?.name;
    if (raw && typeof raw === 'string' && raw.trim()) {
      let candidate = raw.trim();
      // If it looks like an email address, extract name before @
      if (candidate.includes('@')) {
        candidate = candidate.split('@')[0];
      }
      // Replace dot or underscore with space (e.g. anubh.sharma -> anubh sharma)
      candidate = candidate.replace(/[._]/g, ' ');
      // Capitalize each word nicely
      return candidate
        .split(' ')
        .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
        .join(' ');
    }
    return 'Official';
  }, [customName, user?.name, profile]);

  const isAuthenticated = Boolean(user);
  const isOfficialRole = Boolean(
    user?.profiles?.official ||
    user?.roles?.includes('OFFICIAL') ||
    user?.roles?.includes('UMPIRE')
  );
  const preferredSport =
    profile?.preferredSportId ||
    (profile as any)?.profile?.preferredSportId ||
    user?.officialProfile?.preferredSportId ||
    (user?.officialProfile as any)?.profile?.preferredSportId;
  const isOnboarded = Boolean(
    user?.officialProfile ||
    isOfficialRole ||
    (profile && (preferredSport || profile.level))
  );
  const needsOnboarding = Boolean(isAuthenticated && !isOnboarded);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        officialDisplayName,
        isLoading,
        isAuthenticated,
        isOnboarded,
        needsOnboarding,
        onboardingDraft,
        updateOnboardingDraft,
        updateOfficialName,
        sendOtp,
        verifyOtp,
        completeOnboarding,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
