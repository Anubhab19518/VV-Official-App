import { apiClient } from './client';
import { ApiResponse, AuthTokens, SendOtpResponse, User } from '@/types/api';

export const authApi = {
  async sendOtp(email: string): Promise<ApiResponse<SendOtpResponse>> {
    return apiClient<ApiResponse<SendOtpResponse>>('/api/v1/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  async verifyOtp(email: string, otp: string, name?: string): Promise<ApiResponse<AuthTokens>> {
    const payload: { email: string; otp: string; name?: string } = { email, otp };
    if (name) payload.name = name;
    return apiClient<ApiResponse<AuthTokens>>('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  async googleLogin(email: string, idToken: string, name?: string): Promise<ApiResponse<AuthTokens>> {
    return apiClient<ApiResponse<AuthTokens>>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, idToken, name }),
      skipAuth: true,
    });
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return apiClient<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/api/v1/auth/refresh-token',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
      }
    );
  },

  async getMe(): Promise<ApiResponse<User>> {
    return apiClient<ApiResponse<User>>('/api/v1/auth/me');
  },
};
