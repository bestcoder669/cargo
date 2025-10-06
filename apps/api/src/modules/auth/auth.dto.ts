export interface CreateUserDto {
  telegramId: bigint;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  cityId?: number;
}

export interface LoginDto {
  phone: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface VerifyBotDto {
  telegramId: number;
}

export interface GenerateAdminTokenDto {
  adminId: number;
  expiresIn?: string;
}
