import {
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
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '@/utils/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
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
        background: 'var(--gray-1)',
        padding: '24px',
      }}
    >
      <Flex direction="column" align="center" gap="2" mb="6">
        <Heading size="8" weight="bold" style={{ color: 'var(--accent-11)' }}>
          Datier
        </Heading>
        <Text size="3" color="gray">
          Plataforma de modelado de datos con IA y arquitectura multi-tenant
        </Text>
      </Flex>

      <Card style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <Tabs.Root value={tab} onValueChange={v => setTab(v as any)}>
          <Tabs.List mb="4">
            <Tabs.Trigger value="login" style={{ flex: 1 }}>
              Iniciar Sesión
            </Tabs.Trigger>
            <Tabs.Trigger value="register" style={{ flex: 1 }}>
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
                  <Text as="div" size="2" mb="1" weight="bold">
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
                  <Text as="div" size="2" mb="1" weight="bold">
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
                  style={{ width: '100%' }}
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
                <Callout.Text>{regSuccess}</Callout.Text>
              </Callout.Root>
            )}

            <form onSubmit={handleRegister}>
              <Flex direction="column" gap="3">
                <Flex gap="2">
                  <label style={{ flex: 1 }}>
                    <Text as="div" size="2" mb="1" weight="bold">
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
                    <Text as="div" size="2" mb="1" weight="bold">
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
                  <Text as="div" size="2" mb="1" weight="bold">
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
                  <Text as="div" size="2" mb="1" weight="bold">
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
                  style={{ width: '100%' }}
                >
                  {regLoading ? 'Creando cuenta...' : 'Registrarse'}
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
