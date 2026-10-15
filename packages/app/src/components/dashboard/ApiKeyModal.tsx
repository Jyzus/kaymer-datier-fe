import {
  CheckCircledIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LockClosedIcon,
  PlusIcon,
  ReloadIcon,
  TokensIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  Badge,
  Button,
  Callout,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Tabs,
  Text,
  TextField,
  Tooltip,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import React, { useEffect, useState } from 'react';

import { api, ApiKeyItem } from '@/utils/api';

import * as styles from './ApiKeyModal.styles';

export interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Key creation state
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Revocation state
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Snippet copy feedback
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getApiKeys();
      setApiKeys(res.keys || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchKeys();
      setCreatedKey(null);
      setCopiedKey(false);
      setKeyToRevoke(null);
      setError(null);
    }
  }, [open]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || creating) return;

    try {
      setCreating(true);
      setError(null);
      const res = await api.createApiKey(newKeyName.trim(), 'account');
      setCreatedKey(res.api_key);
      setCopiedKey(false);
      setNewKeyName('');
      await fetchKeys();
    } catch (err: any) {
      setError(err.message || 'Error al generar la API key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopySnippet = (snippet: string, label: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2200);
  };

  const handleConfirmRevoke = async () => {
    if (!keyToRevoke) return;
    try {
      setRevoking(true);
      await api.revokeApiKey(keyToRevoke.id);
      setKeyToRevoke(null);
      await fetchKeys();
    } catch (err: any) {
      setError(err.message || 'Error al revocar la API key');
    } finally {
      setRevoking(false);
    }
  };

  const formatCreationDate = (dateStr: string) => {
    try {
      const dt = DateTime.fromISO(dateStr).setLocale('es');
      return dt.isValid ? dt.toFormat('dd MMM yyyy, HH:mm') : dateStr;
    } catch {
      return dateStr;
    }
  };

  const placeholderKey = createdKey || 'datier_live_sec_TU_API_KEY';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content css={styles.dialogContent}>
        {/* Header */}
        <div css={styles.header}>
          <Flex align="center" gap="3">
            <div css={styles.iconBadge}>
              <TokensIcon width="22" height="22" />
            </div>
            <div>
              <Dialog.Title
                style={{
                  margin: 0,
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                Gestión de API Keys (M2M)
              </Dialog.Title>
              <Dialog.Description
                size="2"
                color="gray"
                style={{ marginTop: 2 }}
              >
                Genera tokens para conectar Planifier Docs, agentes de IA,
                migraciones y cURL.
              </Dialog.Description>
            </div>
          </Flex>

          <Dialog.Close>
            <IconButton
              size="2"
              variant="ghost"
              color="gray"
              style={{ cursor: 'pointer', borderRadius: '50%' }}
            >
              <Cross2Icon width="18" height="18" />
            </IconButton>
          </Dialog.Close>
        </div>

        {/* Global Error Callout */}
        {error && (
          <Callout.Root color="red" mb="4" size="1">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {/* Newly Created Key Reveal Card */}
        {createdKey && (
          <div css={styles.revealCard}>
            <Flex align="center" justify="space-between">
              <Flex align="center" gap="2">
                <CheckCircledIcon
                  width="18"
                  height="18"
                  color="var(--green-11)"
                />
                <Text
                  size="2"
                  weight="bold"
                  style={{ color: 'var(--green-11)' }}
                >
                  ¡API Key generada con éxito!
                </Text>
              </Flex>
              <Badge color="green" variant="soft" size="1">
                Secreto Activo
              </Badge>
            </Flex>

            <Text size="1" color="gray">
              ⚠️ Copia y guarda tu clave en un lugar seguro (como un archivo{' '}
              <code>.env</code>). Por razones de seguridad,{' '}
              <strong>no volverá a mostrarse en texto claro</strong>.
            </Text>

            <div css={styles.keyBox}>
              <code style={{ fontSize: 13, color: 'var(--gray-12)' }}>
                {createdKey}
              </code>
              <Button
                type="button"
                size="2"
                variant={copiedKey ? 'solid' : 'surface'}
                color={copiedKey ? 'green' : 'gray'}
                onClick={handleCopyKey}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              >
                {copiedKey ? (
                  <>
                    <CheckIcon width="16" height="16" /> Copiada
                  </>
                ) : (
                  <>
                    <CopyIcon width="16" height="16" /> Copiar Clave
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Create Key Card */}
        <div css={styles.creationCard}>
          <Flex align="center" justify="space-between">
            <Text size="2" weight="bold">
              Crear nueva API Key
            </Text>
            <Badge color="cyan" variant="surface" size="1">
              Ámbito: Cuenta global
            </Badge>
          </Flex>

          <form onSubmit={handleCreateKey}>
            <Flex gap="2" align="center">
              <TextField.Root style={{ flex: 1 }}>
                <TextField.Slot>
                  <LockClosedIcon
                    height="15"
                    width="15"
                    color="var(--gray-9)"
                  />
                </TextField.Slot>
                <TextField.Input
                  placeholder="Nombre o descripción (ej. Planifier Integration, Servidor Tyto...)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  disabled={creating}
                />
              </TextField.Root>

              <Button
                type="submit"
                size="2"
                variant="solid"
                disabled={creating || !newKeyName.trim()}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              >
                {creating ? (
                  <>
                    <ReloadIcon
                      width="14"
                      height="14"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    Generando...
                  </>
                ) : (
                  <>
                    <PlusIcon width="15" height="15" /> Generar Clave
                  </>
                )}
              </Button>
            </Flex>
          </form>
        </div>

        {/* Active Keys Header */}
        <Flex align="center" justify="space-between" mb="3">
          <Flex align="center" gap="2">
            <Text size="2" weight="bold">
              Claves Activas
            </Text>
            <Badge color="gray" variant="soft" size="1">
              {apiKeys.length}
            </Badge>
          </Flex>

          <Tooltip content="Recargar lista de claves">
            <IconButton
              size="1"
              variant="ghost"
              color="gray"
              onClick={fetchKeys}
              disabled={loading}
              style={{ cursor: 'pointer' }}
            >
              <ReloadIcon
                width="13"
                height="13"
                style={{
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </IconButton>
          </Tooltip>
        </Flex>

        {/* Inline Revocation Confirmation Alert */}
        {keyToRevoke && (
          <div css={styles.confirmRevokeBox}>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <ExclamationTriangleIcon
                  color="var(--red-9)"
                  width="16"
                  height="16"
                />
                <Text size="2" weight="bold" color="red">
                  ¿Revocar la clave &ldquo;{keyToRevoke.name}&rdquo;?
                </Text>
              </Flex>
              <Text size="1" color="gray">
                Esta acción es irreversible. Todos los agentes, scripts o
                sistemas que utilicen el prefijo{' '}
                <code>{keyToRevoke.key_prefix}...</code> perderán acceso de
                inmediato.
              </Text>
              <Flex gap="2" justify="end" mt="1">
                <Button
                  size="1"
                  variant="soft"
                  color="gray"
                  disabled={revoking}
                  onClick={() => setKeyToRevoke(null)}
                  style={{ cursor: 'pointer' }}
                >
                  Cancelar
                </Button>
                <Button
                  size="1"
                  variant="solid"
                  color="red"
                  disabled={revoking}
                  onClick={handleConfirmRevoke}
                  style={{ cursor: 'pointer' }}
                >
                  {revoking ? 'Revocando...' : 'Sí, revocar definitivamente'}
                </Button>
              </Flex>
            </Flex>
          </div>
        )}

        {/* Active Keys List */}
        {apiKeys.length === 0 ? (
          <div css={styles.emptyState}>
            <InfoCircledIcon width="28" height="28" color="var(--gray-8)" />
            <Text size="2" weight="medium" color="gray">
              No tienes ninguna API Key activa aún.
            </Text>
            <Text size="1" color="gray">
              Crea tu primera clave para permitir que agentes de Planifier o
              scripts sincronicen tus diagramas.
            </Text>
          </div>
        ) : (
          <div css={styles.keyList}>
            {apiKeys.map(k => (
              <div key={k.id} css={styles.keyItem}>
                <Flex
                  direction="column"
                  gap="1"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Flex align="center" gap="2" wrap="wrap">
                    <Text
                      size="2"
                      weight="bold"
                      style={{ color: 'var(--gray-12)' }}
                    >
                      {k.name}
                    </Text>
                    <Badge color="gray" variant="surface" size="1">
                      <code style={{ fontSize: 11 }}>{k.key_prefix}...</code>
                    </Badge>
                    <Badge
                      color={k.scope_type === 'account' ? 'cyan' : 'blue'}
                      variant="soft"
                      size="1"
                    >
                      {k.scope_type === 'account'
                        ? 'Cuenta global'
                        : k.scope_type}
                    </Badge>
                  </Flex>

                  <Flex align="center" gap="3">
                    <Text size="1" color="gray">
                      Creada: {formatCreationDate(k.created_at)}
                    </Text>
                    {k.last_used_at && (
                      <Text size="1" color="gray">
                        • Último uso: {formatCreationDate(k.last_used_at)}
                      </Text>
                    )}
                  </Flex>
                </Flex>

                <Button
                  size="1"
                  variant="ghost"
                  color="red"
                  type="button"
                  onClick={() => setKeyToRevoke(k)}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                >
                  <TrashIcon width="14" height="14" /> Revocar
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Integration Quickstart Guide */}
        <div css={styles.guideCard}>
          <Flex align="center" gap="2">
            <CodeIcon width="16" height="16" color="var(--accent-11)" />
            <Text size="2" weight="bold">
              Guía de Integración Rápida
            </Text>
          </Flex>

          <Tabs.Root defaultValue="planifier">
            <Tabs.List size="1">
              <Tabs.Trigger value="planifier" style={{ cursor: 'pointer' }}>
                Planifier Docs & CLI
              </Tabs.Trigger>
              <Tabs.Trigger value="curl" style={{ cursor: 'pointer' }}>
                cURL / HTTP API
              </Tabs.Trigger>
              <Tabs.Trigger value="env" style={{ cursor: 'pointer' }}>
                Variables de Entorno (.env)
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="planifier" style={{ marginTop: 10 }}>
              <Flex direction="column" gap="2">
                <Text size="1" color="gray">
                  Para autenticar el agente de Planifier o la CLI con tu cuenta
                  de Datier:
                </Text>
                <div css={styles.codeBlock}>
                  <span>planifier datier login --key {placeholderKey}</span>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color={copiedSnippet === 'cli' ? 'green' : 'gray'}
                    onClick={() =>
                      handleCopySnippet(
                        `planifier datier login --key ${placeholderKey}`,
                        'cli'
                      )
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    {copiedSnippet === 'cli' ? (
                      <CheckIcon width="14" height="14" />
                    ) : (
                      <CopyIcon width="14" height="14" />
                    )}
                  </IconButton>
                </div>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="curl" style={{ marginTop: 10 }}>
              <Flex direction="column" gap="2">
                <Text size="1" color="gray">
                  Pasa el header <code>x-api-key</code> en cualquier petición a
                  la API pública:
                </Text>
                <div css={styles.codeBlock}>
                  <span>
                    curl -H &quot;x-api-key: {placeholderKey}&quot;
                    https://app.datier.pro/api/projects
                  </span>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color={copiedSnippet === 'curl' ? 'green' : 'gray'}
                    onClick={() =>
                      handleCopySnippet(
                        `curl -H "x-api-key: ${placeholderKey}" https://app.datier.pro/api/projects`,
                        'curl'
                      )
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    {copiedSnippet === 'curl' ? (
                      <CheckIcon width="14" height="14" />
                    ) : (
                      <CopyIcon width="14" height="14" />
                    )}
                  </IconButton>
                </div>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="env" style={{ marginTop: 10 }}>
              <Flex direction="column" gap="2">
                <Text size="1" color="gray">
                  Define la variable en tu contenedor o archivo{' '}
                  <code>.env</code>:
                </Text>
                <div css={styles.codeBlock}>
                  <span>DATIER_API_KEY={placeholderKey}</span>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color={copiedSnippet === 'env' ? 'green' : 'gray'}
                    onClick={() =>
                      handleCopySnippet(
                        `DATIER_API_KEY=${placeholderKey}`,
                        'env'
                      )
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    {copiedSnippet === 'env' ? (
                      <CheckIcon width="14" height="14" />
                    ) : (
                      <CopyIcon width="14" height="14" />
                    )}
                  </IconButton>
                </div>
              </Flex>
            </Tabs.Content>
          </Tabs.Root>
        </div>

        {/* Footer */}
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              type="button"
              style={{ cursor: 'pointer' }}
            >
              Cerrar
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ApiKeyModal;
