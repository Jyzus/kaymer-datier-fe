import { Flex } from '@radix-ui/themes';
import { useAtom } from 'jotai';
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
  const [selectedSchemaId, setSelectedSchemaId] = useAtom(selectedSchemaIdAtom);
  const [searchParams, setSearchParams] = useSearchParams();

  const schemaIdFromUrl = searchParams.get('schemaId');

  // Sync URL search params -> Jotai Atom
  // Only trigger this when the URL actually changes
  useEffect(() => {
    if (schemaIdFromUrl !== selectedSchemaId) {
      setSelectedSchemaId(schemaIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaIdFromUrl, setSelectedSchemaId]); // DELIBERATELY OMITTING selectedSchemaId to avoid reverting user clicks!

  // Sync Jotai Atom -> URL search params
  // Only trigger this when the Jotai state changes
  useEffect(() => {
    if (selectedSchemaId !== schemaIdFromUrl) {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (selectedSchemaId) {
            next.set('schemaId', selectedSchemaId);
          } else {
            next.delete('schemaId');
          }
          return next;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchemaId, setSearchParams]); // DELIBERATELY OMITTING schemaIdFromUrl to avoid looping!

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
