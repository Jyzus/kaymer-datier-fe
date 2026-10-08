import {
  CheckCircledIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import {
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Tabs,
  Text,
  TextField,
} from '@radix-ui/themes';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { api, setAuth } from '@/utils/api';

const GoogleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    style={{ marginRight: 10, flexShrink: 0 }}
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Handle incoming OAuth redirection tokens or errors
  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setLoginError(decodeURIComponent(errorParam));
    } else if (token) {
      setAuth({
        access_token: token,
        refresh_token: refresh || undefined,
      });

      api
        .getMe()
        .then(() => {
          navigate('/', { replace: true });
        })
        .catch(() => {
          navigate('/', { replace: true });
        });
    }
  }, [searchParams, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = api.getGoogleAuthUrl();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      await api.login(loginEmail, loginPassword);
      navigate('/');
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    setRegLoading(true);

    try {
      await api.register({
        email: regEmail,
        password: regPassword,
        first_name: regFirstName,
        last_name: regLastName,
      });

      // Auto-login after registration
      await api.login(regEmail, regPassword);
      navigate('/');
    } catch (err: any) {
      setRegError(err.message || 'Error al registrar usuario');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        width: '100vw',
        background:
          'radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-a3), transparent 70%), var(--gray-1)',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Header */}
      <Flex
        direction="column"
        align="center"
        gap="2"
        mb="6"
        style={{ textAlign: 'center' }}
      >
        <Flex
          align="center"
          justify="center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background:
              'linear-gradient(135deg, var(--accent-9), var(--accent-11))',
            color: 'white',
            fontWeight: 800,
            fontSize: 22,
            boxShadow: '0 8px 16px -4px var(--accent-a7)',
            marginBottom: 8,
          }}
        >
          D
        </Flex>
        <Heading
          size="8"
          weight="bold"
          style={{
            letterSpacing: '-0.03em',
            background:
              'linear-gradient(135deg, var(--gray-12), var(--accent-11))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Datier
        </Heading>
        <Text size="3" color="gray" style={{ maxWidth: 380, lineHeight: 1.4 }}>
          Plataforma de modelado de datos con IA y arquitectura multi-tenant
        </Text>
      </Flex>

      {/* Auth Card */}
      <Card
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 32,
          borderRadius: 16,
          background: 'var(--color-surface, var(--gray-2))',
          boxShadow:
            '0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--gray-a4)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Google OAuth Button */}
        <Button
          size="3"
          variant="surface"
          color="gray"
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--gray-a5)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: 16,
          }}
        >
          <GoogleIcon />
          Continuar con Google
        </Button>

        {/* Divider */}
        <Flex align="center" gap="3" mb="4">
          <div
            style={{ flex: 1, height: '1px', background: 'var(--gray-a4)' }}
          />
          <Text
            size="1"
            color="gray"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: 11,
              userSelect: 'none',
            }}
          >
            o continúa con correo
          </Text>
          <div
            style={{ flex: 1, height: '1px', background: 'var(--gray-a4)' }}
          />
        </Flex>

        <Tabs.Root value={tab} onValueChange={v => setTab(v as any)}>
          <Tabs.List mb="4" style={{ borderRadius: 8 }}>
            <Tabs.Trigger value="login" style={{ flex: 1, fontWeight: 500 }}>
              Iniciar Sesión
            </Tabs.Trigger>
            <Tabs.Trigger value="register" style={{ flex: 1, fontWeight: 500 }}>
              Registrarse
            </Tabs.Trigger>
          </Tabs.List>

          {/* TAB: LOGIN */}
          <Tabs.Content value="login">
            {loginError && (
              <Callout.Root color="red" mb="4" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>{loginError}</Callout.Text>
              </Callout.Root>
            )}

            <form onSubmit={handleLogin}>
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Correo Electrónico
                  </Text>
                  <TextField.Root>
                    <TextField.Slot>
                      <EnvelopeClosedIcon height="16" width="16" />
                    </TextField.Slot>
                    <TextField.Input
                      type="email"
                      required
                      placeholder="tu@correo.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                  </TextField.Root>
                </label>

                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Contraseña
                  </Text>
                  <TextField.Root>
                    <TextField.Slot>
                      <LockClosedIcon height="16" width="16" />
                    </TextField.Slot>
                    <TextField.Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                  </TextField.Root>
                </label>

                <Button
                  size="3"
                  type="submit"
                  mt="3"
                  disabled={loginLoading}
                  style={{
                    width: '100%',
                    fontWeight: 600,
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  {loginLoading ? 'Iniciando sesión...' : 'Entrar a Datier'}
                </Button>
              </Flex>
            </form>
          </Tabs.Content>

          {/* TAB: REGISTER */}
          <Tabs.Content value="register">
            {regError && (
              <Callout.Root color="red" mb="4" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>{regError}</Callout.Text>
              </Callout.Root>
            )}

            {regSuccess && (
              <Callout.Root color="green" mb="4" size="1">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>{regSuccess}</Callout.Text>
              </Callout.Root>
            )}

            <form onSubmit={handleRegister}>
              <Flex direction="column" gap="3">
                <Flex gap="2">
                  <label style={{ flex: 1 }}>
                    <Text as="div" size="2" mb="1" weight="medium">
                      Nombre
                    </Text>
                    <TextField.Root>
                      <TextField.Slot>
                        <PersonIcon height="16" width="16" />
                      </TextField.Slot>
                      <TextField.Input
                        required
                        placeholder="Nombre"
                        value={regFirstName}
                        onChange={e => setRegFirstName(e.target.value)}
                      />
                    </TextField.Root>
                  </label>

                  <label style={{ flex: 1 }}>
                    <Text as="div" size="2" mb="1" weight="medium">
                      Apellidos
                    </Text>
                    <TextField.Root>
                      <TextField.Input
                        placeholder="Apellidos"
                        value={regLastName}
                        onChange={e => setRegLastName(e.target.value)}
                      />
                    </TextField.Root>
                  </label>
                </Flex>

                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Correo Electrónico
                  </Text>
                  <TextField.Root>
                    <TextField.Slot>
                      <EnvelopeClosedIcon height="16" width="16" />
                    </TextField.Slot>
                    <TextField.Input
                      type="email"
                      required
                      placeholder="tu@correo.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </TextField.Root>
                </label>

                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Contraseña
                  </Text>
                  <TextField.Root>
                    <TextField.Slot>
                      <LockClosedIcon height="16" width="16" />
                    </TextField.Slot>
                    <TextField.Input
                      type="password"
                      required
                      placeholder="Mínimo 8 caracteres"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                    />
                  </TextField.Root>
                </label>

                <Button
                  size="3"
                  type="submit"
                  mt="3"
                  disabled={regLoading}
                  style={{
                    width: '100%',
                    fontWeight: 600,
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  {regLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </Flex>
            </form>
          </Tabs.Content>
        </Tabs.Root>
      </Card>
    </Flex>
  );
};

export default LoginPage;
