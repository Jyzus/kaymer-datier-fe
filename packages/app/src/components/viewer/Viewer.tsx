import { GitHubLogoIcon, LayersIcon, ReaderIcon } from '@radix-ui/react-icons';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { lazy, Suspense } from 'react';

import { useSchemaEntity } from '@/atoms/modules/sidebar';

import * as styles from './Viewer.styles';

interface ViewerProps {}

const LazyEditor = lazy(() => import('@/components/viewer/editor/Editor'));

const Viewer: React.FC<ViewerProps> = () => {
  const value = useSchemaEntity();
  const loading = <Text size="4">Loading...</Text>;

  return (
    <Flex css={styles.root} direction="column" align="center" justify="center">
      {value.state === 'hasError' ? (
        <div css={styles.card}>
          <div css={styles.iconContainer}>
            <LayersIcon width="32" height="32" />
          </div>

          <Heading
            size="6"
            weight="bold"
            mb="2"
            style={{ color: 'var(--gray-12)' }}
          >
            Diseño de Esquemas ERD
          </Heading>

          <Text size="2" color="gray" mb="5" style={{ lineHeight: '1.6' }}>
            Selecciona un esquema existente en la barra lateral o crea uno nuevo
            para empezar a diseñar tu base de datos.
          </Text>

          <Flex gap="3" width="100%" justify="center">
            <Button
              asChild
              variant="soft"
              size="2"
              style={{ cursor: 'pointer' }}
            >
              <a
                href="https://docs.erd-editor.io/docs/category/guides"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <ReaderIcon width="16" height="16" />
                Guía de Edición
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="2"
              style={{ cursor: 'pointer' }}
            >
              <a
                href="https://github.com/dineug/erd-editor"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <GitHubLogoIcon width="16" height="16" />
                GitHub
              </a>
            </Button>
          </Flex>
        </div>
      ) : value.state === 'loading' ? (
        loading
      ) : (
        <Suspense fallback={loading}>
          <LazyEditor entity={value.data} />
        </Suspense>
      )}
    </Flex>
  );
};

export default Viewer;
