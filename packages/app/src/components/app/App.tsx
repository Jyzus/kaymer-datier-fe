import { Flex } from '@radix-ui/themes';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useSetSelectedProjectId } from '@/atoms/modules/project';
import { AiChatPanel, AiChatToggle } from '@/components/ai-chat/AiChatPanel';
import Sidebar from '@/components/sidebar/Sidebar';
import SidebarSash from '@/components/sidebar-sash/SidebarSash';
import Viewer from '@/components/viewer/Viewer';

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const setSelectedProjectId = useSetSelectedProjectId();

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
        <AiChatToggle />
      </Flex>
      <SidebarSash />
    </>
  );
};

export default App;
