import { apiClient } from './client';
import {
  ApiResponse,
  MatchScorecard,
  OfficialMatch,
  MatchSquadsData,
  SetLineupPayload,
  RecordTossPayload,
  RecordTossResponse,
  StartInningsPayload,
  RecordDeliveryPayload,
  SubmitResultPayload,
  RecordDlsInterruptionPayload,
  DlsInfoResponse,
} from '@/types/api';

export const matchesApi = {
  async getAssignedMatches(): Promise<ApiResponse<OfficialMatch[]>> {
    return apiClient<ApiResponse<OfficialMatch[]>>('/api/v1/officials/me/matches');
  },

  async getMatchById(id: string): Promise<ApiResponse<OfficialMatch>> {
    try {
      const res = await apiClient<ApiResponse<OfficialMatch>>(`/api/v1/officials/me/matches/${id}`);
      if (res?.data) return res;
    } catch {
      // Fallback to /api/v1/matches/:id
    }
    return apiClient<ApiResponse<OfficialMatch>>(`/api/v1/matches/${id}`);
  },

  async getMatchSquads(matchId: string): Promise<ApiResponse<MatchSquadsData>> {
    return apiClient<ApiResponse<MatchSquadsData>>(`/api/v1/officials/matches/${matchId}/squads`);
  },

  async setLineup(matchId: string, payload: SetLineupPayload): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/officials/matches/${matchId}/lineup`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async recordToss(matchId: string, payload: RecordTossPayload): Promise<ApiResponse<RecordTossResponse>> {
    return apiClient<ApiResponse<RecordTossResponse>>(`/api/v1/officials/matches/${matchId}/toss`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getScorecard(id: string): Promise<ApiResponse<MatchScorecard>> {
    return apiClient<ApiResponse<MatchScorecard>>(`/api/v1/matches/${id}/scorecard`);
  },

  async startInnings(
    matchId: string,
    payload: StartInningsPayload
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/${matchId}/innings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async recordDelivery(
    inningsId: string,
    payload: RecordDeliveryPayload
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/innings/${inningsId}/deliveries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async undoDelivery(
    inningsId: string,
    reason?: string
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/innings/${inningsId}/undo`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async recordDlsInterruption(
    matchId: string,
    payload: RecordDlsInterruptionPayload
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/${matchId}/dls/interruptions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getDlsInfo(matchId: string): Promise<ApiResponse<DlsInfoResponse>> {
    return apiClient<ApiResponse<DlsInfoResponse>>(`/api/v1/matches/${matchId}/dls`);
  },

  async declareInnings(
    matchId: string,
    comment?: string,
    inningsId?: string
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/${matchId}/innings/declare`, {
      method: 'POST',
      body: JSON.stringify({ comment, inningsId }),
    });
  },

  async decideFollowOn(
    matchId: string,
    decision: 'ENFORCE' | 'DECLINE'
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/${matchId}/follow-on`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
  },

  async declareDraw(
    matchId: string,
    reason?: string
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/${matchId}/draw`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async submitResult(
    matchId: string,
    payload: SubmitResultPayload
  ): Promise<ApiResponse<any>> {
    return apiClient<ApiResponse<any>>(`/api/v1/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
