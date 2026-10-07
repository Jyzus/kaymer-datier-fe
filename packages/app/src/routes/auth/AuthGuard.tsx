import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { getAccessToken, getRefreshToken } from '@/utils/api';

export const AuthGuard: React.FC = () => {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!token && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
