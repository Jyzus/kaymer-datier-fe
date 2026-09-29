import {
  ErdEditorElement,
  setGetShikiServiceCallback,
} from '@dineug/erd-editor';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useLayoutEffect, useRef } from 'react';

import {
  activeEditorAtom,
  aiChatOpenAtom,
  focusedTableAtom,
} from '@/atoms/modules/ai-chat';
import { nicknameStorageAtom } from '@/atoms/modules/collaborative';
import { useAddSchemaEntity } from '@/atoms/modules/schema';
import { useReplicationSchemaEntity } from '@/atoms/modules/sidebar';
import { themeAtom } from '@/atoms/modules/theme';
import { SchemaEntity } from '@/services/indexeddb/modules/schema';
import { DatabaseVendor } from '@/utils/api';
import { bridge } from '@/utils/broadcastChannel';

import * as styles from './Editor.styles';

import('@dineug/erd-editor-shiki-worker').then(({ getShikiService }) => {
  setGetShikiServiceCallback(getShikiService);
});

interface EditorProps {
  entity: SchemaEntity;
}

const Editor: React.FC<EditorProps> = props => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ErdEditorElement | null>(null);
  const [theme, setTheme] = useAtom(themeAtom);
  const replicationSchemaEntity = useReplicationSchemaEntity();
  const nickname = useAtomValue(nicknameStorageAtom);
  const nicknameRef = useRef(nickname);
  nicknameRef.current = nickname;
  const entityRef = useRef(props.entity);
  entityRef.current = props.entity;
  const setActiveEditor = useSetAtom(activeEditorAtom);
  const setFocusedTable = useSetAtom(focusedTableAtom);
  const setAiChatOpen = useSetAtom(aiChatOpenAtom);
  const addSchemaEntity = useAddSchemaEntity();

  useLayoutEffect(() => {
    const $viewer = viewerRef.current;
    if (!$viewer) return;

    const unsubscribeSet = new Set<() => void>();
    const editor = document.createElement('erd-editor');
    const sharedStore = editor.getSharedStore({
      getNickname: () => nicknameRef.current,
    });
    editorRef.current = editor;
    setActiveEditor(editor);
    editor.enableThemeBuilder = true;
    editor.setInitialValue(props.entity.value);

    unsubscribeSet
      .add(
        sharedStore.subscribe(actions => {
          replicationSchemaEntity({
            id: props.entity.id,
            actions,
          });
        })
      )
      .add(
        bridge.on({
          replicationSchemaEntity: ({ payload: { id, actions } }) => {
            if (id === props.entity.id) {
              sharedStore.dispatch(actions);
            }
          },
        })
      );

    // Listen for "Focus in AI chat" from ERD table context menu
    const handleFocusTableForAI = (event: CustomEvent) => {
      setFocusedTable(event.detail.tableName);
      setAiChatOpen(true);
    };
    editor.addEventListener(
      'focusTableForAI',
      handleFocusTableForAI as EventListener
    );

    // Listen for "Duplicate into another engine" from Settings: create a new
    // schema in the target engine seeded with the already-converted diagram.
    const handleDuplicateToEngine = (event: CustomEvent) => {
      const { database, value } = event.detail as {
        database: DatabaseVendor;
        value: string;
      };
      addSchemaEntity({
        name: `${entityRef.current.name} (${database})`,
        database,
        value,
      });
    };
    editor.addEventListener(
      'duplicateToEngine',
      handleDuplicateToEngine as EventListener
    );

    const handleChangePresetTheme = (event: Event) => {
      const e = event as CustomEvent;

      setTheme(draft => {
        draft.appearance = e.detail.appearance;
        draft.accentColor = e.detail.accentColor;
        draft.grayColor = e.detail.grayColor;
      });
    };

    editor.addEventListener('changePresetTheme', handleChangePresetTheme);
    $viewer.appendChild(editor);

    return () => {
      setActiveEditor(null);
      $viewer.removeChild(editor);
      editor.removeEventListener('changePresetTheme', handleChangePresetTheme);
      editor.removeEventListener(
        'focusTableForAI',
        handleFocusTableForAI as EventListener
      );
      editor.removeEventListener(
        'duplicateToEngine',
        handleDuplicateToEngine as EventListener
      );
      Array.from(unsubscribeSet).forEach(unsubscribe => unsubscribe());
      unsubscribeSet.clear();
      editor.destroy();
      editorRef.current = null;
    };
  }, [
    setTheme,
    replicationSchemaEntity,
    props.entity.id,
    props.entity.value,
    addSchemaEntity,
    setActiveEditor,
    setAiChatOpen,
    setFocusedTable,
  ]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.setPresetTheme({
      appearance: theme.appearance as any,
      accentColor: theme.accentColor,
      grayColor: theme.grayColor as any,
    });
  }, [theme]);

  return <div css={styles.scope} ref={viewerRef} />;
};

export default Editor;
