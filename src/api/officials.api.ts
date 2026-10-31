import { apiClient } from './client';
import {
  ApiResponse,
  OfficialMatch,
  OfficialProfile,
  OfficialTournament,
  RegisterOfficialPayload,
  SportRegistry,
  TournamentInvitation,
} from '@/types/api';

export const officialsApi = {
  async getSportRegistry(): Promise<ApiResponse<SportRegistry>> {
    return apiClient<ApiResponse<SportRegistry>>('/api/v1/officials/sports/registry', {
      skipAuth: true,
    });
  },

  async getProfile(): Promise<ApiResponse<OfficialProfile>> {
    const res = await apiClient<ApiResponse<any>>('/api/v1/officials/me/profile');
    if (res?.data) {
      const flattened = res.data.profile ? { ...res.data.profile, ...res.data } : res.data;
      return { ...res, data: flattened };
    }
    return res;
  },

  async upsertProfile(payload: RegisterOfficialPayload): Promise<ApiResponse<OfficialProfile>> {
    return apiClient<ApiResponse<OfficialProfile>>('/api/v1/officials/me/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getInvitations(status?: string): Promise<ApiResponse<TournamentInvitation[]>> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    let res: ApiResponse<TournamentInvitation[]> | null = null;
    try {
      res = await apiClient<ApiResponse<TournamentInvitation[]>>(
        `/api/v1/officials/me/invitations${query}`
      );
    } catch {
      // Fallback to /api/v1/tournaments/invitations/my-invitations
    }

    if (!res?.data) {
      try {
        res = await apiClient<ApiResponse<TournamentInvitation[]>>(
          `/api/v1/tournaments/invitations/my-invitations${query}`
        );
      } catch {
        // Handled gracefully
      }
    }

    if (res?.data && Array.isArray(res.data)) {
      const enriched = await Promise.all(
        res.data.map(async (inv) => {
          const tId = inv.sourceId || inv.tournamentId;
          const role =
            inv.role ||
            (inv.type === 'ORGANIZER_OFFICIAL' ? 'Match Official / Umpire' : undefined);

          let tournament = inv.tournament;
          if (!tournament?.name && tId) {
            try {
              const tourneyRes = await apiClient<ApiResponse<any>>(`/api/v1/tournaments/${tId}`, {
                skipAuth: true,
              });
              if (tourneyRes?.data) {
                const t = tourneyRes.data;
                tournament = {
                  id: t.id,
                  name: t.name,
                  sportId: t.sportId,
                  startDate: t.startDate,
                  endDate: t.endDate,
                  venue: t.location || t.venue,
                  location: t.location,
                  organizer: t.organizer || {
                    id: t.organizerId,
                    name: t.organizerName || 'Tournament Organizer',
                  },
                };
              }
            } catch {
              // Gracefully handle if tournament details cannot be retrieved
            }
          }

          return {
            ...inv,
            tournamentId: tId || inv.id,
            role,
            tournament: tournament || (tId ? { id: tId, name: 'Tournament Invitation' } : undefined),
          };
        })
      );

      return {
        ...res,
        data: enriched,
      };
    }

    return res || { status: 'success', data: [] };
  },

  async getInvitationById(id: string): Promise<ApiResponse<TournamentInvitation>> {
    const res = await apiClient<ApiResponse<TournamentInvitation>>(`/api/v1/officials/me/invitations/${id}`);
    if (res?.data) {
      const inv = res.data;
      const tId = inv.sourceId || inv.tournamentId;
      let tournament = inv.tournament;
      if (!tournament?.name && tId) {
        try {
          const tourneyRes = await apiClient<ApiResponse<any>>(`/api/v1/tournaments/${tId}`, {
            skipAuth: true,
          });
          if (tourneyRes?.data) {
            const t = tourneyRes.data;
            tournament = {
              id: t.id,
              name: t.name,
              sportId: t.sportId,
              startDate: t.startDate,
              endDate: t.endDate,
              venue: t.location || t.venue,
              location: t.location,
              organizer: t.organizer || {
                id: t.organizerId,
                name: t.organizerName || 'Tournament Organizer',
              },
            };
          }
        } catch {
          // ignore
        }
      }
      return {
        ...res,
        data: {
          ...inv,
          tournamentId: tId || inv.id,
          role: inv.role || (inv.type === 'ORGANIZER_OFFICIAL' ? 'Match Official / Umpire' : undefined),
          tournament: tournament || (tId ? { id: tId, name: 'Tournament Invitation' } : undefined),
        },
      };
    }
    return res;
  },

  async respondInvitation(
    id: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<ApiResponse<any>> {
    const action = status === 'ACCEPTED' ? 'accept' : 'reject';
    try {
      return await apiClient<ApiResponse<any>>(
        `/api/v1/tournaments/invitations/${id}/${action}`,
        { method: 'POST' }
      );
    } catch {
      // Fallback to officials/me/invitations/:id/respond
    }

    return apiClient<ApiResponse<any>>(`/api/v1/officials/me/invitations/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async getTournaments(): Promise<ApiResponse<OfficialTournament[]>> {
    return apiClient<ApiResponse<OfficialTournament[]>>('/api/v1/officials/me/tournaments');
  },

  async getAssignedMatches(): Promise<ApiResponse<OfficialMatch[]>> {
    return apiClient<ApiResponse<OfficialMatch[]>>('/api/v1/officials/me/matches');
  },
};
