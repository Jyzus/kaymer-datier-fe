import { Flex } from '@radix-ui/themes';
import { useSetAtom } from 'jotai';
import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { useSetSelectedProjectId } from '@/atoms/modules/project';
import { selectedSchemaIdAtom } from '@/atoms/modules/sidebar';
import { AiChatPanel } from '@/components/ai-chat/AiChatPanel';
import Sidebar from '@/components/sidebar/Sidebar';
import SidebarSash from '@/components/sidebar-sash/SidebarSash';
import Viewer from '@/components/viewer/Viewer';

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const setSelectedProjectId = useSetSelectedProjectId();
  const setSelectedSchemaId = useSetAtom(selectedSchemaIdAtom);
  const [searchParams] = useSearchParams();

  const schemaIdFromUrl = searchParams.get('schemaId');

  // URL is the single source of truth → sync into Jotai atom on every URL change.
  // Writing to the URL happens in SidebarItem (onClick) to avoid two-way loops.
  useEffect(() => {
    setSelectedSchemaId(schemaIdFromUrl);
  }, [schemaIdFromUrl, setSelectedSchemaId]);

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, setSelectedProjectId]);

  if (!projectId) return null;

  return (
    <>
      <Sidebar />
      <Flex
        style={{
          display: 'flex',
          flexGrow: 1,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flexGrow: 1,
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Viewer />
        </div>
        <AiChatPanel />
      </Flex>
      <SidebarSash />
    </>
  );
};

export default App;
