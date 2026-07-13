import { Flex } from '@radix-ui/themes';
import { useSetAtom } from 'jotai';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

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

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
      setSelectedSchemaId(null); // Clear selected schema when changing projects
    }
  }, [projectId, setSelectedProjectId, setSelectedSchemaId]);

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
