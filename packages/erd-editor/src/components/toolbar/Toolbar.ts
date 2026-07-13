import { FC, html, observable } from '@dineug/r-html';

import { useAppContext } from '@/components/appContext';
import Icon from '@/components/primitives/icon/Icon';
import TextInput from '@/components/primitives/text-input/TextInput';
import { Open } from '@/constants/open';
import { CanvasType } from '@/constants/schema';
import { changeOpenMapAction } from '@/engine/modules/editor/atom.actions';
import {
  loadSchemaSQLAction$,
  unselectAllAction$,
} from '@/engine/modules/editor/generator.actions';
import {
  changeCanvasTypeAction,
  changeDatabaseNameAction,
  resizeAction,
} from '@/engine/modules/settings/atom.actions';
import { changeZoomLevelAction$ } from '@/engine/modules/settings/generator.actions';
import { openThemeBuilderAction, toggleSearchAction } from '@/utils/emitter';
import { createSchemaSQL } from '@/utils/schema-sql';
import {
  canvasSizeInRange,
  toNumString,
  toZoomFormat,
  zoomLevelInRange,
} from '@/utils/validation';

import * as styles from './Toolbar.styles';

export type ToolbarProps = {
  enableThemeBuilder: boolean;
  readonly: boolean;
};

const mergeDDL = (currentSql: string, newSql: string): string => {
  const splitStatements = (sql: string): string[] => {
    return sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const getCreateTableName = (statement: string): string | null => {
    const match = statement.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_"`\.-]+)/i
    );
    if (!match) return null;
    return match[1]
      .replace(/["'`\[\]]/g, '')
      .trim()
      .toLowerCase();
  };

  const currentStatements = splitStatements(currentSql);
  const newStatements = splitStatements(newSql);

  const mergedStatements = [...currentStatements];

  for (const newStmt of newStatements) {
    const newTableName = getCreateTableName(newStmt);

    if (newTableName) {
      const existingIdx = mergedStatements.findIndex(stmt => {
        const name = getCreateTableName(stmt);
        return name === newTableName;
      });

      if (existingIdx !== -1) {
        mergedStatements[existingIdx] = newStmt;
      } else {
        mergedStatements.push(newStmt);
      }
    } else {
      mergedStatements.push(newStmt);
    }
  }

  return mergedStatements.join(';\n\n') + ';';
};

const Toolbar: FC<ToolbarProps> = (props, ctx) => {
  const app = useAppContext(ctx);

  const state = observable({
    isOpenImportModal: false,
    ddlValue: '',
  });

  const handleCloseModal = () => {
    state.isOpenImportModal = false;
    state.ddlValue = '';
  };

  const handleCloseModalOnOverlay = (e: MouseEvent) => {
    e.stopPropagation();
    handleCloseModal();
  };

  const handleTextareaInput = (event: InputEvent) => {
    const el = event.target as HTMLTextAreaElement | null;
    if (el) {
      state.ddlValue = el.value;
    }
  };

  const handleMergeDDL = () => {
    if (!state.ddlValue.trim()) return;
    try {
      const { store } = app.value;
      const currentSql = createSchemaSQL(store.state);
      const mergedSql = mergeDDL(currentSql, state.ddlValue);

      store.dispatchSync(loadSchemaSQLAction$(mergedSql));
      handleCloseModal();
    } catch (err: any) {
      alert(`Error al combinar DDL: ${err.message}`);
    }
  };

  const handleChangeDatabaseName = (event: InputEvent) => {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;

    const { store } = app.value;
    store.dispatch(changeDatabaseNameAction({ value: el.value }));
  };

  const handleResize = (event: Event) => {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;

    const size = canvasSizeInRange(el.value);
    const { store } = app.value;
    el.value = size.toString();
    store.dispatch(resizeAction({ width: size, height: size }));
  };

  const handleZoomLevel = (event: Event) => {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;

    const zoomLevel = zoomLevelInRange(Number(toNumString(el.value)) / 100);
    const { store } = app.value;
    el.value = toZoomFormat(zoomLevel);
    store.dispatch(changeZoomLevelAction$(zoomLevel));
  };

  const handleChangeCanvasType = (value: string) => {
    const { store } = app.value;
    store.dispatch(changeCanvasTypeAction({ value }));
  };

  const handleUndo = () => {
    const { store } = app.value;
    store.undo();
  };

  const handleRedo = () => {
    const { store } = app.value;
    store.redo();
  };

  const handleUnselectAll = () => {
    const { store } = app.value;
    store.dispatch(unselectAllAction$());
  };

  const handleSearch = () => {
    const { emitter } = app.value;
    emitter.emit(toggleSearchAction());
  };

  const handleTheme = () => {
    const { emitter } = app.value;
    emitter.emit(openThemeBuilderAction());
  };

  const handleOpenTimeTravel = () => {
    const { store } = app.value;
    const { editor } = store.state;

    if (editor.hasUndo || editor.hasRedo) {
      store.dispatch(changeOpenMapAction({ [Open.timeTravel]: true }));
    }
  };

  return () => {
    const { store } = app.value;
    const { settings, editor, doc } = store.state;

    const showAutomaticTablePlacement =
      editor.openMap[Open.automaticTablePlacement];
    const showTableProperties = editor.openMap[Open.tableProperties];
    const showTimeTravel = editor.openMap[Open.timeTravel];
    const showDiffViewer = editor.openMap[Open.diffViewer];

    const showUndoRedo =
      settings.canvasType === CanvasType.ERD &&
      !showAutomaticTablePlacement &&
      !showTableProperties &&
      !showDiffViewer &&
      !showTimeTravel &&
      !props.readonly;

    return html`
      <div
        class=${['toolbar', styles.root]}
        @mousedown=${handleUnselectAll}
        @touchstart=${handleUnselectAll}
      >
        <${TextInput}
          title="database name"
          placeholder="database name"
          width=${150}
          value=${settings.databaseName}
          .onInput=${handleChangeDatabaseName}
        />
        <${TextInput}
          title="canvas size"
          placeholder="canvas size"
          width=${45}
          value=${settings.width.toString()}
          numberOnly=${true}
          .onChange=${handleResize}
        />
        <${TextInput}
          title="zoom level"
          placeholder="zoom level"
          width=${45}
          value=${toZoomFormat(settings.zoomLevel)}
          numberOnly=${true}
          .onChange=${handleZoomLevel}
        />
        <div class=${styles.vertical}></div>
        <div
          class=${[
            styles.menu,
            { active: settings.canvasType === CanvasType.ERD },
          ]}
          title="Entity Relationship Diagram"
          @click=${() => handleChangeCanvasType(CanvasType.ERD)}
        >
          <${Icon} name="diagram-project" size=${16} />
        </div>
        <div
          class=${[
            styles.menu,
            { active: settings.canvasType === CanvasType.visualization },
          ]}
          title="Visualization"
          @click=${() => handleChangeCanvasType(CanvasType.visualization)}
        >
          <${Icon} prefix="mdi" name="chart-scatter-plot" size=${16} />
        </div>
        <div
          class=${[
            styles.menu,
            { active: settings.canvasType === CanvasType.schemaSQL },
          ]}
          title="Schema SQL"
          @click=${() => handleChangeCanvasType(CanvasType.schemaSQL)}
        >
          <${Icon} prefix="mdi" name="database-export" size=${16} />
        </div>
        <div
          class=${[
            styles.menu,
            { active: settings.canvasType === CanvasType.generatorCode },
          ]}
          title="Code Generator"
          @click=${() => handleChangeCanvasType(CanvasType.generatorCode)}
        >
          <${Icon} name="file-code" size=${16} />
        </div>
        <div
          class=${[
            styles.menu,
            { active: settings.canvasType === CanvasType.settings },
          ]}
          title="Settings"
          @click=${() => handleChangeCanvasType(CanvasType.settings)}
        >
          <${Icon} name="gear" size=${16} />
        </div>
        <div class=${styles.vertical}></div>
        <div
          class=${styles.menu}
          title="Importar y Fusionar DDL"
          @click=${() => {
            state.isOpenImportModal = true;
          }}
        >
          <${Icon} prefix="mdi" name="database-import" size=${16} />
        </div>
        <div class=${styles.vertical}></div>
        <div class=${styles.menu} title="Search" @click=${handleSearch}>
          <${Icon} name="magnifying-glass" size=${16} />
        </div>
        ${props.enableThemeBuilder
          ? html`
              <div class=${styles.menu} title="Theme" @click=${handleTheme}>
                <${Icon} name="circle-half-stroke" size=${16} />
              </div>
            `
          : null}
        <div class=${styles.vertical}></div>
        ${showUndoRedo
          ? html`
              <div
                class=${[
                  'undo-redo',
                  styles.menu,
                  {
                    active: editor.hasUndo,
                  },
                ]}
                title="Undo"
                @click=${handleUndo}
              >
                <${Icon} name="rotate-left" size=${16} />
              </div>
              <div
                class=${[
                  'undo-redo',
                  styles.menu,
                  {
                    active: editor.hasRedo,
                  },
                ]}
                title="Redo"
                @click=${handleRedo}
              >
                <${Icon} name="rotate-right" size=${16} />
              </div>
              <div
                class=${[
                  'undo-redo',
                  styles.menu,
                  {
                    active: editor.hasUndo || editor.hasRedo,
                  },
                ]}
                title="Time Travel"
                style=${{
                  'max-width': '26px',
                }}
                @click=${handleOpenTimeTravel}
              >
                <${Icon} prefix="mdi" name="av-timer" size=${20} />
              </div>
            `
          : null}
        <div class=${styles.tableCount}>Table: ${doc.tableIds.length}</div>
      </div>

      ${state.isOpenImportModal
        ? html`
            <div
              class=${styles.modalOverlay}
              @mousedown=${handleCloseModalOnOverlay}
            >
              <div
                class=${styles.modalContent}
                @mousedown=${(e: MouseEvent) => e.stopPropagation()}
              >
                <h3 class=${styles.modalTitle}>Importar y Fusionar DDL</h3>
                <textarea
                  class=${styles.modalTextarea}
                  placeholder="Pega tu código DDL SQL aquí (CREATE TABLE, ALTER TABLE, etc.)..."
                  .value=${state.ddlValue}
                  @input=${handleTextareaInput}
                ></textarea>
                <div class=${styles.modalActions}>
                  <button
                    class="${styles.modalButton} cancel"
                    @click=${handleCloseModal}
                  >
                    Cancelar
                  </button>
                  <button
                    class="${styles.modalButton} merge"
                    @click=${handleMergeDDL}
                  >
                    Fusionar Esquema
                  </button>
                </div>
              </div>
            </div>
          `
        : null}
    `;
  };
};

export default Toolbar;
