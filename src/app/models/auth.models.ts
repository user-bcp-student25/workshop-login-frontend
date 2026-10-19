export interface User {
  username: string;
  displayName?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginRequest extends LoginCredentials {
  client: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserSession {
  token: string;
  user: User;
}