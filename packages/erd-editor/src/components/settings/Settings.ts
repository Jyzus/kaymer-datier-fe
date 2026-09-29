import { toJson } from '@dineug/erd-editor-schema';
import { delay } from '@dineug/go';
import {
  createRef,
  FC,
  html,
  observable,
  onUpdated,
  ref,
  repeat,
} from '@dineug/r-html';

import { useAppContext } from '@/components/appContext';
import { menus as databaseMenus } from '@/components/erd/erd-context-menu/menus/databaseMenus';
import Button from '@/components/primitives/button/Button';
import Menu from '@/components/primitives/context-menu/menu/Menu';
import Icon from '@/components/primitives/icon/Icon';
import Separator from '@/components/primitives/separator/Separator';
import Switch from '@/components/primitives/switch/Switch';
import TextInput from '@/components/primitives/text-input/TextInput';
import Toast from '@/components/primitives/toast/Toast';
import SettingsLnb, {
  Lnb,
} from '@/components/settings/settings-lnb/SettingsLnb';
import Shortcuts from '@/components/settings/shortcuts/Shortcuts';
import { COLUMN_MIN_WIDTH } from '@/constants/layout';
import { ColumnTypeToName, SaveSettingType } from '@/constants/schema';
import {
  changeColumnOrderAction,
  changeIgnoreSaveSettingsAction,
  changeMaxWidthCommentAction,
  changeRelationshipDataTypeSyncAction,
} from '@/engine/modules/settings/atom.actions';
import { convertAllColumnDataTypesAction$ } from '@/engine/modules/table-column/generator.actions';
import { fontSize6 } from '@/styles/typography.styles';
import { bHas } from '@/utils/bit';
import { recalculateTableWidth } from '@/utils/calcTable';
import {
  convertSchemaValueToDatabase,
  previewColumnTypeConversion,
} from '@/utils/dataType/convertDataType';
import { onPrevent } from '@/utils/domEvent';
import { relationshipSort } from '@/utils/draw-relationship/sort';
import { duplicateToEngineAction, openToastAction } from '@/utils/emitter';
import { FlipAnimation } from '@/utils/flipAnimation';
import { fromShadowDraggable } from '@/utils/rx-operators/fromShadowDraggable';
import {
  maxWidthCommentInRange,
  toMaxWidthCommentFormat,
  toNumString,
} from '@/utils/validation';

import * as styles from './Settings.styles';

export type SettingsProps = {};

const Settings: FC<SettingsProps> = (props, ctx) => {
  const app = useAppContext(ctx);
  const root = createRef<HTMLDivElement>();
  const flipAnimation = new FlipAnimation(
    root,
    `.${styles.columnOrderItem}`,
    'column-order-move'
  );

  const state = observable({
    lnb: Lnb.preferences as Lnb,
    isOpenEngineModal: false,
    targetDatabase: -1 as number,
  });

  const handleChangeRelationshipDataTypeSync = (value: boolean) => {
    const { store } = app.value;
    store.dispatch(changeRelationshipDataTypeSyncAction({ value }));
  };

  const handleOpenEngineModal = () => {
    state.targetDatabase = app.value.store.state.settings.database;
    state.isOpenEngineModal = true;
  };

  const handleCloseEngineModal = () => {
    state.isOpenEngineModal = false;
  };

  const handleSelectTargetDatabase = (event: Event) => {
    const el = event.target as HTMLSelectElement | null;
    if (el) state.targetDatabase = Number(el.value);
  };

  const handleConvertEngine = () => {
    const { store } = app.value;
    if (state.targetDatabase !== store.state.settings.database) {
      store.dispatch(convertAllColumnDataTypesAction$(state.targetDatabase));
    }
    handleCloseEngineModal();
  };

  const handleDuplicateEngine = () => {
    const { store, emitter } = app.value;
    if (state.targetDatabase === store.state.settings.database) {
      handleCloseEngineModal();
      return;
    }
    // Convert a copy of the current diagram (does NOT mutate this schema) and
    // hand it to the host app, which creates the new schema via the backend.
    const { value } = convertSchemaValueToDatabase(
      toJson(store.state),
      state.targetDatabase
    );
    emitter.emit(
      duplicateToEngineAction({
        database: engineName(state.targetDatabase),
        value,
      })
    );
    handleCloseEngineModal();
  };

  const handleRecalculationTableWidth = () => {
    const { store, emitter, toWidth } = app.value;
    recalculateTableWidth(store.state, { toWidth, clock: store.context.clock });
    relationshipSort(store.state);
    emitter.emit(
      openToastAction({
        close: delay(2000),
        message: html`<${Toast} title="Recalculated table width" />`,
      })
    );
  };

  const handleChangeColumnOrderAction = (value: number, target: number) => {
    const { store } = app.value;

    if (value !== target) {
      flipAnimation.snapshot();
      store.dispatch(changeColumnOrderAction({ value, target }));
    }
  };

  const handleDragstartColumnOrder = (event: DragEvent) => {
    const $root = root.value;
    const $target = event.target as HTMLElement | null;
    if (!$root || !$target) return;

    const id = $target.dataset?.id;
    if (!id) return;

    const columnType = Number(id);
    const elements = Array.from<HTMLElement>(
      $root.querySelectorAll(`.${styles.columnOrderItem}`)
    );
    elements.forEach(el => el.classList.add('none-hover'));
    $target.classList.add('dragging');

    fromShadowDraggable(elements, el => el.dataset.id as string).subscribe({
      next: target => {
        handleChangeColumnOrderAction(columnType, Number(target));
      },
      complete: () => {
        $target.classList.remove('dragging');
        elements.forEach(el => el.classList.remove('none-hover'));
      },
    });
  };

  onUpdated(() => flipAnimation.play());

  const handleChangeLnb = (value: Lnb) => {
    state.lnb = value;
  };

  const handleSwitchMaxWidthComment = (checked: boolean) => {
    const { store } = app.value;
    store.dispatch(
      changeMaxWidthCommentAction({ value: checked ? COLUMN_MIN_WIDTH : -1 })
    );
  };

  const handleChangeMaxWidthComment = (event: Event) => {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;

    const maxWidthComment = maxWidthCommentInRange(
      Number(toNumString(el.value))
    );
    const { store } = app.value;
    el.value = toMaxWidthCommentFormat(maxWidthComment);
    store.dispatch(changeMaxWidthCommentAction({ value: maxWidthComment }));
  };

  const handleChangeScrollSaveSettings = (value: boolean) => {
    const { store } = app.value;

    store.dispatch(
      changeIgnoreSaveSettingsAction({
        saveSettingType: SaveSettingType.scroll,
        value: !value,
      })
    );
  };

  const handleChangeZoomLevelSaveSettings = (value: boolean) => {
    const { store } = app.value;

    store.dispatch(
      changeIgnoreSaveSettingsAction({
        saveSettingType: SaveSettingType.zoomLevel,
        value: !value,
      })
    );
  };

  const engineName = (value: number) =>
    databaseMenus.find(menu => menu.value === value)?.name ?? 'Unknown';

  return () => {
    const { store } = app.value;
    const { settings } = store.state;
    const maxWidthCommentDisabled = settings.maxWidthComment === -1;

    const enginePreviews = state.isOpenEngineModal
      ? previewColumnTypeConversion(store.state, state.targetDatabase)
      : [];
    const engineChanged = enginePreviews.filter(
      preview => preview.changed && !preview.unmapped
    );
    const engineUnmapped = enginePreviews.filter(preview => preview.unmapped);
    const engineSame = state.targetDatabase === settings.database;

    return html`
      <div class=${styles.root} ${ref(root)}>
        <div class=${styles.lnbArea}>
          <${SettingsLnb} value=${state.lnb} .onChange=${handleChangeLnb} />
        </div>
        <div class=${styles.contentArea}>
          <div class=${fontSize6}>${state.lnb}</div>
          <${Separator} space=${12} />
          <div class=${['scrollbar', styles.content]}>
            ${state.lnb === Lnb.preferences
              ? html`
                  <div class=${styles.section}>
                    <div class=${styles.row}>
                      <div>Motor de base de datos</div>
                      <div class=${styles.vertical(16)}></div>
                      <div>
                        ${databaseMenus.find(
                          menu => menu.value === settings.database
                        )?.name ?? 'Unknown'}
                      </div>
                      <div class=${styles.vertical(8)}></div>
                      <${Button}
                        variant="soft"
                        size="1"
                        text="Cambiar…"
                        .onClick=${handleOpenEngineModal}
                      />
                    </div>

                    <div class=${styles.row}>
                      <div>Relationship DataType Sync</div>
                      <div class=${styles.vertical(16)}></div>
                      <${Switch}
                        value=${settings.relationshipDataTypeSync}
                        .onChange=${handleChangeRelationshipDataTypeSync}
                      />
                    </div>

                    <div class=${styles.row}>
                      <div>Save Scroll Information</div>
                      <div class=${styles.vertical(16)}></div>
                      <${Switch}
                        value=${!bHas(
                          settings.ignoreSaveSettings,
                          SaveSettingType.scroll
                        )}
                        .onChange=${handleChangeScrollSaveSettings}
                      />
                    </div>

                    <div class=${styles.row}>
                      <div>Save Zoom Information</div>
                      <div class=${styles.vertical(16)}></div>
                      <${Switch}
                        value=${!bHas(
                          settings.ignoreSaveSettings,
                          SaveSettingType.zoomLevel
                        )}
                        .onChange=${handleChangeZoomLevelSaveSettings}
                      />
                    </div>

                    <div class=${styles.row}>
                      <div>Maximum comment width</div>
                      <div class=${styles.vertical(16)}></div>
                      <${Switch}
                        value=${!maxWidthCommentDisabled}
                        .onChange=${handleSwitchMaxWidthComment}
                      />
                      <div class=${styles.vertical(8)}></div>
                      <${TextInput}
                        title="Maximum comment width"
                        placeholder="Maximum comment width"
                        width=${45}
                        value=${maxWidthCommentDisabled
                          ? toMaxWidthCommentFormat(COLUMN_MIN_WIDTH)
                          : toMaxWidthCommentFormat(settings.maxWidthComment)}
                        disabled=${maxWidthCommentDisabled}
                        numberOnly=${true}
                        .onChange=${handleChangeMaxWidthComment}
                      />
                    </div>

                    <div class=${styles.row}>
                      <div>Recalculation table width</div>
                      <div class=${styles.vertical(16)}></div>
                      <${Button}
                        variant="soft"
                        size="1"
                        text=${html`
                          <${Icon} size=${14} name="rotate" />
                          <div class=${styles.vertical(8)}></div>
                          <span>Sync</span>
                        `}
                        .onClick=${handleRecalculationTableWidth}
                      />
                    </div>
                    <div class=${styles.columnOrderSection}>
                      <div>Column Order</div>
                      <${Separator} space=${12} />
                      <div
                        class=${styles.columnOrderList}
                        @dragenter=${onPrevent}
                        @dragover=${onPrevent}
                      >
                        ${repeat(
                          settings.columnOrder,
                          columnType => columnType,
                          columnType => html`
                            <div
                              class=${styles.columnOrderItem}
                              draggable="true"
                              data-id=${columnType}
                              @dragstart=${handleDragstartColumnOrder}
                            >
                              <${Menu}
                                icon=${html`<${Icon} name="bars" size=${14} />`}
                                name=${ColumnTypeToName[columnType]}
                              />
                            </div>
                          `
                        )}
                      </div>
                    </div>
                  </div>
                `
              : state.lnb === Lnb.shortcuts
                ? html`<${Shortcuts} />`
                : null}
          </div>
        </div>
      </div>
      ${state.isOpenEngineModal
        ? html`
            <div
              class=${styles.modalOverlay}
              @mousedown=${handleCloseEngineModal}
            >
              <div
                class=${styles.modalContent}
                @mousedown=${(e: MouseEvent) => e.stopPropagation()}
              >
                <h3 class=${styles.modalTitle}>
                  Cambiar motor de base de datos
                </h3>
                <div class=${styles.row}>
                  <div>Motor destino</div>
                  <div class=${styles.vertical(16)}></div>
                  <select
                    class=${styles.modalSelect}
                    .value=${String(state.targetDatabase)}
                    @change=${handleSelectTargetDatabase}
                  >
                    ${databaseMenus.map(
                      menu => html`
                        <option
                          value=${menu.value}
                          ?selected=${menu.value === state.targetDatabase}
                        >
                          ${menu.name}
                        </option>
                      `
                    )}
                  </select>
                </div>
                <div class=${styles.modalWarning}>
                  ${engineSame
                    ? html`Elige un motor distinto de
                        <span class=${styles.modalWarningStrong}
                          >${engineName(settings.database)}</span
                        >
                        para convertir.`
                    : html`Se convertirán
                        <span class=${styles.modalWarningStrong}
                          >${engineChanged.length}</span
                        >
                        columna(s) de
                        <span class=${styles.modalWarningStrong}
                          >${engineName(settings.database)}</span
                        >
                        a
                        <span class=${styles.modalWarningStrong}
                          >${engineName(state.targetDatabase)}</span
                        >.${engineUnmapped.length
                          ? html` <span class=${styles.previewBadge}
                              >${engineUnmapped.length} sin equivalente exacto
                              (se dejan tal cual, revisar).</span
                            >`
                          : null}`}
                </div>
                ${!engineSame && enginePreviews.length
                  ? html`
                      <div class=${styles.previewList}>
                        ${enginePreviews.map(
                          preview => html`
                            <div
                              class=${[
                                styles.previewRow,
                                preview.unmapped ? 'unmapped' : '',
                              ]}
                            >
                              <span class=${styles.previewColumn}
                                >${preview.tableName}.${preview.columnName}</span
                              >
                              <span class=${styles.previewFrom}
                                >${preview.from || '∅'}</span
                              >
                              <span>→</span>
                              <span class=${styles.previewTo}
                                >${preview.to || '∅'}</span
                              >
                              ${preview.unmapped
                                ? html`<span class=${styles.previewBadge}
                                    >revisar</span
                                  >`
                                : null}
                            </div>
                          `
                        )}
                      </div>
                    `
                  : null}
                <div class=${styles.modalActions}>
                  <button
                    class="${styles.modalButton} cancel"
                    @click=${handleCloseEngineModal}
                  >
                    Cancelar
                  </button>
                  <button
                    class="${styles.modalButton} cancel"
                    ?disabled=${engineSame}
                    @click=${handleDuplicateEngine}
                  >
                    Crear copia
                  </button>
                  <button
                    class="${styles.modalButton} confirm"
                    ?disabled=${engineSame}
                    @click=${handleConvertEngine}
                  >
                    Convertir aquí
                  </button>
                </div>
              </div>
            </div>
          `
        : null}
    `;
  };
};

export default Settings;
