import * as vscode from 'vscode';
import { BUILD_DATE } from './buildDate';

interface TesbihItem {
  id: string;
  name: string;
  target: number;
  current: number;
  mode: 'ascending' | 'descending';
  color: string;
  checkedDate?: string;
}

const COLOR_MAP: Record<string, { hex: string; emoji: string }> = {
  green:  { hex: '#66bb6a', emoji: '🟢' },
  red:    { hex: '#ef5350', emoji: '🔴' },
  blue:   { hex: '#42a5f5', emoji: '🔵' },
  yellow: { hex: '#ffca28', emoji: '🟡' },
  orange: { hex: '#ffa726', emoji: '🟠' },
  purple: { hex: '#ab47bc', emoji: '🟣' },
  brown:  { hex: '#8d6e63', emoji: '🟤' },
  gray:   { hex: '#bdbdbd', emoji: '⚪' },
  cyan:   { hex: '#4fc3f7', emoji: '🩵' },
  pink:   { hex: '#f06292', emoji: '🩷' },
};

const COLOR_KEYS = Object.keys(COLOR_MAP);
const DEFAULT_COLOR = 'green';

interface TesbihState {
  items: TesbihItem[];
  activeId: string;
}

interface HistoryEntry {
  id: string;
  itemName: string;
  target: number;
  current: number;
  completedAt: number;
  mode: 'ascending' | 'descending';
  completed: boolean;
}

const STORAGE_KEY = 'tesbihState';
const HISTORY_KEY = 'tesbihHistory';
const LANG_KEY = 'tesbihLang';
const SOUND_KEY = 'tesbihSound';

const HOST_I18N: Record<string, Record<string, string>> = {
  tr: {
    confirm_clear_history: 'Tüm geçmiş silinecek. Emin misiniz?',
    confirm_delete_item: '{0} silinecek. Emin misiniz?',
    confirm_reset_item: '{0} ({1}/{2}) sıfırlansın mı?',
    confirm_reset_all: 'Tüm tesbihler sıfırlansın ve işaretler kaldırılsın mı?',
    confirm_import: 'Mevcut tesbihler değiştirilecek. Emin misiniz?',
    btn_delete: 'Sil',
    btn_reset: 'Sıfırla',
    btn_reset_all: 'Tümünü Sıfırla',
    btn_import: 'İçe Aktar',
    this_tesbih: 'Bu tesbih',
  },
  en: {
    confirm_clear_history: 'All history will be deleted. Are you sure?',
    confirm_delete_item: '{0} will be deleted. Are you sure?',
    confirm_reset_item: 'Reset {0} ({1}/{2})?',
    confirm_reset_all: 'Reset all dhikrs and remove checkmarks?',
    confirm_import: 'Existing dhikrs will be replaced. Are you sure?',
    btn_delete: 'Delete',
    btn_reset: 'Reset',
    btn_reset_all: 'Reset All',
    btn_import: 'Import',
    this_tesbih: 'This Dhikr',
  },
  de: {
    confirm_clear_history: 'Gesamter Verlauf wird gelöscht. Fortfahren?',
    confirm_delete_item: '{0} wird gelöscht. Fortfahren?',
    confirm_reset_item: '{0} ({1}/{2}) zurücksetzen?',
    confirm_reset_all: 'Alle Dhikrs zurücksetzen und Markierungen entfernen?',
    confirm_import: 'Bestehende Dhikrs werden ersetzt. Fortfahren?',
    btn_delete: 'Löschen',
    btn_reset: 'Zurücksetzen',
    btn_reset_all: 'Alle zurücksetzen',
    btn_import: 'Importieren',
    this_tesbih: 'Dieses Dhikr',
  },
  fr: {
    confirm_clear_history: 'Tout l\'historique sera supprimé. Continuer ?',
    confirm_delete_item: '{0} sera supprimé. Continuer ?',
    confirm_reset_item: 'Réinitialiser {0} ({1}/{2}) ?',
    confirm_reset_all: 'Réinitialiser tous les dhikrs et retirer les coches ?',
    confirm_import: 'Les dhikrs existants seront remplacés. Continuer ?',
    btn_delete: 'Supprimer',
    btn_reset: 'Réinitialiser',
    btn_reset_all: 'Tout réinitialiser',
    btn_import: 'Importer',
    this_tesbih: 'Ce Dhikr',
  },
  ar: {
    confirm_clear_history: 'سيتم حذف السجل بالكامل. هل أنت متأكد؟',
    confirm_delete_item: 'سيتم حذف {0}. هل أنت متأكد؟',
    confirm_reset_item: 'تصفير {0} ({1}/{2})؟',
    confirm_reset_all: 'تصفير جميع الأذكار وإزالة العلامات؟',
    confirm_import: 'سيتم استبدال الأذكار الحالية. هل أنت متأكد؟',
    btn_delete: 'حذف',
    btn_reset: 'تصفير',
    btn_reset_all: 'تصفير الكل',
    btn_import: 'استيراد',
    this_tesbih: 'هذا الذكر',
  },
  zh: {
    confirm_clear_history: '将删除所有历史记录。确定吗？',
    confirm_delete_item: '将删除 {0}。确定吗？',
    confirm_reset_item: '重置 {0} ({1}/{2})？',
    confirm_reset_all: '重置所有赞词并移除标记？',
    confirm_import: '将替换现有赞词。确定吗？',
    btn_delete: '删除',
    btn_reset: '重置',
    btn_reset_all: '全部重置',
    btn_import: '导入',
    this_tesbih: '此赞词',
  },
  es: {
    confirm_clear_history: 'Se eliminará todo el historial. ¿Continuar?',
    confirm_delete_item: 'Se eliminará {0}. ¿Continuar?',
    confirm_reset_item: '¿Restablecer {0} ({1}/{2})?',
    confirm_reset_all: '¿Restablecer todos los dhikrs y quitar marcas?',
    confirm_import: 'Los dhikrs existentes serán reemplazados. ¿Continuar?',
    btn_delete: 'Eliminar',
    btn_reset: 'Restablecer',
    btn_reset_all: 'Restablecer todo',
    btn_import: 'Importar',
    this_tesbih: 'Este Dhikr',
  },
  ru: {
    confirm_clear_history: 'Вся история будет удалена. Продолжить?',
    confirm_delete_item: '{0} будет удалён. Продолжить?',
    confirm_reset_item: 'Сбросить {0} ({1}/{2})?',
    confirm_reset_all: 'Сбросить все зикры и снять отметки?',
    confirm_import: 'Существующие зикры будут заменены. Продолжить?',
    btn_delete: 'Удалить',
    btn_reset: 'Сбросить',
    btn_reset_all: 'Сбросить все',
    btn_import: 'Импорт',
    this_tesbih: 'Этот зикр',
  },
  ja: {
    confirm_clear_history: 'すべての履歴が削除されます。よろしいですか？',
    confirm_delete_item: '{0} を削除します。よろしいですか？',
    confirm_reset_item: '{0} ({1}/{2}) をリセットしますか？',
    confirm_reset_all: 'すべてのズィクルをリセットし、マークを外しますか？',
    confirm_import: '既存のズィクルが置き換えられます。よろしいですか？',
    btn_delete: '削除',
    btn_reset: 'リセット',
    btn_reset_all: '全リセット',
    btn_import: 'インポート',
    this_tesbih: 'このズィクル',
  },
  ko: {
    confirm_clear_history: '모든 기록이 삭제됩니다. 계속하시겠습니까?',
    confirm_delete_item: '{0}이(가) 삭제됩니다. 계속하시겠습니까?',
    confirm_reset_item: '{0} ({1}/{2})을(를) 초기화하시겠습니까?',
    confirm_reset_all: '모든 지크르를 초기화하고 표시를 제거하시겠습니까?',
    confirm_import: '기존 지크르가 교체됩니다. 계속하시겠습니까?',
    btn_delete: '삭제',
    btn_reset: '초기화',
    btn_reset_all: '전체 초기화',
    btn_import: '가져오기',
    this_tesbih: '이 지크르',
  },
  pt: {
    confirm_clear_history: 'Todo o histórico será excluído. Continuar?',
    confirm_delete_item: '{0} será excluído. Continuar?',
    confirm_reset_item: 'Redefinir {0} ({1}/{2})?',
    confirm_reset_all: 'Redefinir todos os dhikrs e remover marcas?',
    confirm_import: 'Os dhikrs existentes serão substituídos. Continuar?',
    btn_delete: 'Excluir',
    btn_reset: 'Redefinir',
    btn_reset_all: 'Redefinir tudo',
    btn_import: 'Importar',
    this_tesbih: 'Este Dhikr',
  },
  it: {
    confirm_clear_history: 'Tutta la cronologia sarà eliminata. Continuare?',
    confirm_delete_item: '{0} sarà eliminato. Continuare?',
    confirm_reset_item: 'Azzerare {0} ({1}/{2})?',
    confirm_reset_all: 'Azzerare tutti i dhikr e rimuovere i segni?',
    confirm_import: 'I dhikr esistenti saranno sostituiti. Continuare?',
    btn_delete: 'Elimina',
    btn_reset: 'Azzera',
    btn_reset_all: 'Azzera tutto',
    btn_import: 'Importa',
    this_tesbih: 'Questo Dhikr',
  },
  hi: {
    confirm_clear_history: 'सारा इतिहास मिट जाएगा। जारी रखें?',
    confirm_delete_item: '{0} हटाया जाएगा। जारी रखें?',
    confirm_reset_item: '{0} ({1}/{2}) रीसेट करें?',
    confirm_reset_all: 'सभी ज़िक्र रीसेट करें और निशान हटाएं?',
    confirm_import: 'मौजूदा ज़िक्र बदल दिए जाएंगे। जारी रखें?',
    btn_delete: 'हटाएं',
    btn_reset: 'रीसेट',
    btn_reset_all: 'सभी रीसेट',
    btn_import: 'आयात',
    this_tesbih: 'यह ज़िक्र',
  },
  id: {
    confirm_clear_history: 'Semua riwayat akan dihapus. Lanjutkan?',
    confirm_delete_item: '{0} akan dihapus. Lanjutkan?',
    confirm_reset_item: 'Reset {0} ({1}/{2})?',
    confirm_reset_all: 'Reset semua dzikir dan hapus tanda?',
    confirm_import: 'Dzikir yang ada akan diganti. Lanjutkan?',
    btn_delete: 'Hapus',
    btn_reset: 'Reset',
    btn_reset_all: 'Reset Semua',
    btn_import: 'Impor',
    this_tesbih: 'Dzikir ini',
  },
  ur: {
    confirm_clear_history: 'پوری تاریخ حذف ہو جائے گی۔ جاری رکھیں؟',
    confirm_delete_item: '{0} حذف ہو جائے گا۔ جاری رکھیں؟',
    confirm_reset_item: '{0} ({1}/{2}) ری سیٹ کریں؟',
    confirm_reset_all: 'تمام اذکار ری سیٹ کریں اور نشانات ہٹائیں؟',
    confirm_import: 'موجودہ اذکار بدل دیے جائیں گے۔ جاری رکھیں؟',
    btn_delete: 'حذف',
    btn_reset: 'ری سیٹ',
    btn_reset_all: 'سب ری سیٹ',
    btn_import: 'درآمد',
    this_tesbih: 'یہ ذکر',
  },
  ms: {
    confirm_clear_history: 'Semua sejarah akan dipadam. Teruskan?',
    confirm_delete_item: '{0} akan dipadam. Teruskan?',
    confirm_reset_item: 'Set semula {0} ({1}/{2})?',
    confirm_reset_all: 'Set semula semua zikir dan buang tanda?',
    confirm_import: 'Zikir sedia ada akan diganti. Teruskan?',
    btn_delete: 'Padam',
    btn_reset: 'Set semula',
    btn_reset_all: 'Set semula semua',
    btn_import: 'Import',
    this_tesbih: 'Zikir ini',
  },
  bn: {
    confirm_clear_history: 'সম্পূর্ণ ইতিহাস মুছে যাবে। চালিয়ে যাবেন?',
    confirm_delete_item: '{0} মুছে যাবে। চালিয়ে যাবেন?',
    confirm_reset_item: '{0} ({1}/{2}) রিসেট করবেন?',
    confirm_reset_all: 'সব যিকির রিসেট করবেন এবং চিহ্ন মুছবেন?',
    confirm_import: 'বিদ্যমান যিকির প্রতিস্থাপিত হবে। চালিয়ে যাবেন?',
    btn_delete: 'মুছুন',
    btn_reset: 'রিসেট',
    btn_reset_all: 'সব রিসেট',
    btn_import: 'আমদানি',
    this_tesbih: 'এই যিকির',
  },
  fa: {
    confirm_clear_history: 'تمام تاریخچه حذف خواهد شد. ادامه می‌دهید؟',
    confirm_delete_item: '{0} حذف خواهد شد. ادامه می‌دهید؟',
    confirm_reset_item: 'بازنشانی {0} ({1}/{2})؟',
    confirm_reset_all: 'بازنشانی همه اذکار و حذف علائم؟',
    confirm_import: 'اذکار فعلی جایگزین خواهند شد. ادامه می‌دهید؟',
    btn_delete: 'حذف',
    btn_reset: 'بازنشانی',
    btn_reset_all: 'بازنشانی همه',
    btn_import: 'واردات',
    this_tesbih: 'این ذکر',
  },
  uk: {
    confirm_clear_history: 'Вся історія буде видалена. Продовжити?',
    confirm_delete_item: '{0} буде видалено. Продовжити?',
    confirm_reset_item: 'Скинути {0} ({1}/{2})?',
    confirm_reset_all: 'Скинути всі зікри та зняти позначки?',
    confirm_import: 'Існуючі зікри будуть замінені. Продовжити?',
    btn_delete: 'Видалити',
    btn_reset: 'Скинути',
    btn_reset_all: 'Скинути все',
    btn_import: 'Імпорт',
    this_tesbih: 'Цей зікр',
  },
  pl: {
    confirm_clear_history: 'Cała historia zostanie usunięta. Kontynuować?',
    confirm_delete_item: '{0} zostanie usunięty. Kontynuować?',
    confirm_reset_item: 'Zresetować {0} ({1}/{2})?',
    confirm_reset_all: 'Zresetować wszystkie dhikry i usunąć znaczniki?',
    confirm_import: 'Istniejące dhikry zostaną zastąpione. Kontynuować?',
    btn_delete: 'Usuń',
    btn_reset: 'Resetuj',
    btn_reset_all: 'Resetuj wszystko',
    btn_import: 'Importuj',
    this_tesbih: 'Ten Dhikr',
  },
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getDefaultState(): TesbihState {
  return {
    items: [
      { id: generateId(), name: 'SubhanAllah', target: 33, current: 0, mode: 'ascending', color: 'green' },
      { id: generateId(), name: 'Alhamdulillah', target: 33, current: 0, mode: 'ascending', color: 'red' },
      { id: generateId(), name: 'Allahu Akbar', target: 34, current: 0, mode: 'ascending', color: 'blue' },
    ],
    activeId: '',
  };
}

class TesbihProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tesbihPanel';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg) => {
      this._handleMessage(msg);
    });
  }

  private _getState(): TesbihState {
    const raw = this._context.globalState.get<TesbihState>(STORAGE_KEY);
    if (!raw) {
      const empty: TesbihState = { items: [], activeId: '' };
      this._context.globalState.update(STORAGE_KEY, empty);
      return empty;
    }
    if (!raw.items) {
      raw.items = [];
    }
    if (raw.items.length === 0) {
      raw.activeId = '';
      return raw;
    }
    for (const item of raw.items) {
      if ((item as any).colorIdx !== undefined && !item.color) {
        item.color = COLOR_KEYS[(item as any).colorIdx] || DEFAULT_COLOR;
        delete (item as any).colorIdx;
      }
      if (!item.color) {
        item.color = DEFAULT_COLOR;
      }
    }
    if (!raw.activeId || !raw.items.find((i) => i.id === raw.activeId)) {
      raw.activeId = raw.items.length > 0 ? raw.items[0].id : '';
    }
    return raw;
  }

  private async _saveState(state: TesbihState) {
    await this._context.globalState.update(STORAGE_KEY, state);
  }

  private _getHistory(): HistoryEntry[] {
    return this._context.globalState.get<HistoryEntry[]>(HISTORY_KEY) || [];
  }

  private _saveHistory(history: HistoryEntry[]) {
    this._context.globalState.update(HISTORY_KEY, history);
  }

  private _sendMessage(msg: object) {
    this._view?.webview.postMessage(msg);
  }

  private _t(key: string, ...args: string[]): string {
    const lang = this._context.globalState.get<string>(LANG_KEY) || 'tr';
    let text = (HOST_I18N[lang] && HOST_I18N[lang][key]) || HOST_I18N.tr[key] || key;
    args.forEach((arg, i) => { text = text.split(`{${i}}`).join(arg); });
    return text;
  }

  private async _handleMessage(msg: { type: string; data?: any }) {
    const state = this._getState();

    switch (msg.type) {
      case 'getState':
        this._sendMessage({ type: 'state', data: this._getState() });
        this._sendMessage({ type: 'lang', data: this._context.globalState.get<string>(LANG_KEY) || 'tr' });
        this._sendMessage({ type: 'sound', data: this._context.globalState.get<boolean>(SOUND_KEY) !== false });
        break;

      case 'getHistory':
        this._sendMessage({ type: 'history', data: this._getHistory() });
        break;

      case 'clearHistory': {
        const confirm = await vscode.window.showWarningMessage(
          this._t('confirm_clear_history'),
          { modal: true },
          this._t('btn_delete')
        );
        if (confirm === this._t('btn_delete')) {
          this._saveHistory([]);
          this._sendMessage({ type: 'history', data: [] });
        }
        break;
      }

      case 'increment': {
        const item = state.items.find((i) => i.id === state.activeId);
        if (!item) break;
        const count = (msg.data && msg.data.count) || 1;
        for (let i = 0; i < count; i++) {
          if (item.mode === 'ascending') {
            if (item.current < item.target) {
              item.current++;
            }
          } else {
            if (item.current > 0) {
              item.current--;
            }
          }
        }

        const isDone = item.mode === 'ascending' ? item.current >= item.target : item.current <= 0;
        const history = this._getHistory();
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayEntry = history.find(e => e.itemName === item.name && new Date(e.completedAt).toISOString().slice(0, 10) === todayStr);
        if (todayEntry) {
          todayEntry.current += count;
          todayEntry.completed = todayEntry.completed || isDone;
        } else {
          history.push({
            id: generateId(),
            itemName: item.name,
            target: item.target,
            current: count,
            completedAt: Date.now(),
            mode: item.mode,
            completed: isDone,
          });
        }
        this._saveHistory(history);

        if (isDone) {
          item.checkedDate = new Date().toISOString().slice(0, 10);
          vscode.window.showInformationMessage(`✅ ${item.name} tamamlandı!`);
        }
        this._saveState(state);
        this._sendMessage({ type: 'state', data: state });
        this._sendMessage({ type: 'history', data: history });
        break;
      }

      case 'setActive': {
        state.activeId = msg.data.id;
        this._saveState(state);
        this._sendMessage({ type: 'state', data: state });
        break;
      }

      case 'addItem': {
        const name = (msg.data.name || 'Yeni Tesbih').trim();
        if (state.items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
          vscode.window.showWarningMessage(`"${name}" adında bir tesbih zaten var.`);
          break;
        }
        const target = msg.data.target || 33;
        const mode = msg.data.mode || 'ascending';
        const color = msg.data.color || COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
        const newItem: TesbihItem = {
          id: generateId(),
          name,
          target,
          current: mode === 'ascending' ? 0 : target,
          mode,
          color,
        };
        state.items.push(newItem);
        state.activeId = newItem.id;
        this._saveState(state);
        this._sendMessage({ type: 'state', data: state });
        break;
      }

      case 'deleteItem': {
        const itemToDelete = state.items.find((i) => i.id === msg.data.id);
        const deleteName = itemToDelete ? `"${itemToDelete.name}"` : this._t('this_tesbih');
        const btnDel = this._t('btn_delete');
        const confirmDel = await vscode.window.showWarningMessage(
          this._t('confirm_delete_item', deleteName),
          { modal: true },
          btnDel
        );
        if (confirmDel !== btnDel) break;
        state.items = state.items.filter((i) => i.id !== msg.data.id);
        if (state.activeId === msg.data.id) {
          state.activeId = state.items.length > 0 ? state.items[0].id : '';
        }
        this._saveState(state);
        this._sendMessage({ type: 'state', data: state });
        break;
      }

      case 'restartItem': {
        const item = state.items.find((i) => i.id === state.activeId);
        if (item) {
          item.current = item.mode === 'ascending' ? 0 : item.target;
          this._saveState(state);
          this._sendMessage({ type: 'state', data: state });
        }
        break;
      }

      case 'resetItemById': {
        const item = state.items.find((i) => i.id === msg.data.id);
        if (item) {
          const hasProgress = item.mode === 'ascending' ? item.current > 0 : item.current < item.target;
          if (hasProgress) {
            const btnRst = this._t('btn_reset');
            const confirmReset = await vscode.window.showWarningMessage(
              this._t('confirm_reset_item', `"${item.name}"`, String(item.current), String(item.target)),
              { modal: true },
              btnRst
            );
            if (confirmReset !== btnRst) break;
          }
          item.current = item.mode === 'ascending' ? 0 : item.target;
          this._saveState(state);
          this._sendMessage({ type: 'state', data: state });
        }
        break;
      }

      case 'resetItem': {
        const item = state.items.find((i) => i.id === state.activeId);
        if (item) {
          const hasProgress = item.mode === 'ascending' ? item.current > 0 : item.current < item.target;
          if (hasProgress) {
            const btnRst = this._t('btn_reset');
            const confirmReset = await vscode.window.showWarningMessage(
              this._t('confirm_reset_item', `"${item.name}"`, String(item.current), String(item.target)),
              { modal: true },
              btnRst
            );
            if (confirmReset !== btnRst) break;
          }
          item.current = item.mode === 'ascending' ? 0 : item.target;
          this._saveState(state);
          this._sendMessage({ type: 'state', data: state });
        }
        break;
      }

      case 'resetAll': {
        const btnRstAll = this._t('btn_reset_all');
        const confirmResetAll = await vscode.window.showWarningMessage(
          this._t('confirm_reset_all'),
          { modal: true },
          btnRstAll
        );
        if (confirmResetAll !== btnRstAll) break;
        for (const item of state.items) {
          item.current = item.mode === 'ascending' ? 0 : item.target;
          item.checkedDate = '';
        }
        this._saveState(state);
        this._sendMessage({ type: 'state', data: state });
        break;
      }

      case 'updateItem': {
        const itemId = msg.data.id || state.activeId;
        const item = state.items.find((i) => i.id === itemId);
        if (item) {
          if (msg.data.name !== undefined) {
            const trimmed = msg.data.name.trim();
            const duplicate = state.items.find(i => i.id !== itemId && i.name.toLowerCase() === trimmed.toLowerCase());
            if (duplicate) {
              vscode.window.showWarningMessage(`"${trimmed}" adında bir tesbih zaten var.`);
            } else {
              item.name = trimmed;
            }
          }
          if (msg.data.target !== undefined) {
            item.target = msg.data.target;
            if (item.mode === 'descending' && item.current > item.target) {
              item.current = item.target;
            }
            if (item.mode === 'ascending' && item.current > item.target) {
              item.current = item.target;
            }
          }
          if (msg.data.mode !== undefined) {
            item.mode = msg.data.mode;
            item.current = item.mode === 'ascending' ? 0 : item.target;
          }
          if (msg.data.color !== undefined) {
            item.color = msg.data.color;
          }
          this._saveState(state);
          this._sendMessage({ type: 'state', data: state });
        }
        break;
      }

      case 'reorderItem': {
        const fromIdx = state.items.findIndex((i) => i.id === msg.data.id);
        if (fromIdx === -1) break;
        const toIdx = msg.data.toIdx;
        if (toIdx < 0 || toIdx >= state.items.length) break;
        const [moved] = state.items.splice(fromIdx, 1);
        state.items.splice(toIdx, 0, moved);
        this._saveState(state);
        this._sendMessage({ type: 'state', data: state });
        break;
      }

      case 'setLang': {
        this._context.globalState.update(LANG_KEY, msg.data.lang || 'tr');
        break;
      }

      case 'toggleSound': {
        const current = this._context.globalState.get<boolean>(SOUND_KEY) !== false;
        this._context.globalState.update(SOUND_KEY, !current);
        this._sendMessage({ type: 'sound', data: !current });
        break;
      }

      case 'toggleChecked': {
        const item = state.items.find((i) => i.id === msg.data.id);
        if (item) {
          const today = new Date().toISOString().slice(0, 10);
          item.checkedDate = item.checkedDate === today ? '' : today;
          this._saveState(state);
          this._sendMessage({ type: 'state', data: state });
        }
        break;
      }

      case 'exportData': {
        const uri = await vscode.window.showSaveDialog({
          filters: { 'JSON': ['json'] },
          defaultUri: vscode.Uri.file('tesbih-backup.json'),
        });
        if (!uri) break;
        const expState = this._getState();
        const cleanItems = expState.items.map(i => ({
          name: i.name,
          target: i.target,
          current: i.current,
          mode: i.mode,
          color: i.color,
        }));
        const fs = require('fs');
        fs.writeFileSync(uri.fsPath, JSON.stringify({ items: cleanItems }, null, 2), 'utf8');
        vscode.window.showInformationMessage(`Tesbih verileri dışa aktarıldı: ${uri.fsPath}`);
        break;
      }

      case 'importData': {
        const uris = await vscode.window.showOpenDialog({
          filters: { 'JSON': ['json'] },
          canSelectMany: false,
        });
        if (!uris || uris.length === 0) break;
        const fs = require('fs');
        try {
          const raw = fs.readFileSync(uris[0].fsPath, 'utf8');
          const data = JSON.parse(raw);
          const items = data.items || (data.state && data.state.items);
          if (!items || !Array.isArray(items)) {
            vscode.window.showErrorMessage('Geçersiz tesbih dosyası.');
            break;
          }
          const btnImp = this._t('btn_import');
          const confirmImport = await vscode.window.showWarningMessage(
            this._t('confirm_import'),
            { modal: true },
            btnImp
          );
          if (confirmImport !== btnImp) break;
          const imported = items.map(i => ({
            id: generateId(),
            name: i.name || 'Tesbih',
            target: i.target || 33,
            current: i.current !== undefined ? i.current : 0,
            mode: i.mode || 'ascending',
            color: i.color || 'green',
          }));
          const newState = { items: imported, activeId: imported[0]?.id || '' };
          this._saveState(newState);
          this._sendMessage({ type: 'state', data: this._getState() });
          this._sendMessage({ type: 'history', data: this._getHistory() });
          vscode.window.showInformationMessage('Tesbih verileri içe aktarıldı.');
        } catch {
          vscode.window.showErrorMessage('Dosya okunamadı veya geçersiz format.');
        }
        break;
      }

      case 'loadDefaults': {
        const def = getDefaultState();
        def.activeId = def.items[0].id;
        this._saveState(def);
        this._sendMessage({ type: 'state', data: def });
        break;
      }

    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    return /*html*/ `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}' 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-inline'; img-src data: https://api.qrserver.com;">
  <title>Tesbih</title>
  <style nonce="${nonce}">
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --accent: var(--vscode-button-background);
      --accent-hover: var(--vscode-button-hoverBackground);
      --fg-button: var(--vscode-button-foreground);
      --border: var(--vscode-panel-border, rgba(255,255,255,0.1));
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --input-border: var(--vscode-input-border);
      --secondary: var(--vscode-button-secondaryBackground);
      --secondary-hover: var(--vscode-button-secondaryHoverBackground);
      --secondary-fg: var(--vscode-button-secondaryForeground);
      --ring-track: rgba(255,255,255,0.08);
      --ring-done: #66bb6a;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, sans-serif);
      background: var(--bg);
      color: var(--fg);
      padding: 12px;
      user-select: none;
      overflow-x: hidden;
    }

    .tabs {
      display: flex;
      gap: 0;
      margin-bottom: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    .tabs button {
      width: 36px;
      height: 32px;
      padding: 0;
      border: none;
      font-size: 15px;
      font-family: inherit;
      cursor: pointer;
      background: var(--input-bg);
      color: var(--fg);
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      opacity: 0.6;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tabs button.active {
      background: var(--accent);
      color: var(--fg-button);
      opacity: 1;
    }

    .tabs button:hover:not(.active) {
      background: var(--secondary);
      opacity: 0.8;
    }

    .tabs-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 12px;
    }

    .tabs-wrap .tabs {
      margin-bottom: 0;
      gap: 2px;
    }

    .tabs-right {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
    }

    .sound-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--input-bg);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
      transition: border-color 0.15s;
    }
    .sound-btn:hover {
      border-color: var(--accent);
    }
    .lang-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--input-bg);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      position: relative;
      transition: border-color 0.15s;
    }

    .lang-btn:hover {
      border-color: var(--fg);
    }

    .lang-arrow {
      font-size: 10px;
      opacity: 0.5;
      margin-left: 1px;
    }

    .donate-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      z-index: 300;
      width: 300px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .donate-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .donate-popup-title {
      font-size: 16px;
      font-weight: 700;
    }
    .donate-popup-close {
      background: none;
      border: 1px solid var(--border);
      color: var(--fg);
      opacity: 0.5;
      cursor: pointer;
      font-size: 14px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s, background 0.15s;
      line-height: 1;
    }
    .donate-popup-close:hover {
      opacity: 1;
      background: var(--accent);
      color: var(--fg-button);
      border-color: var(--accent);
    }
    .donate-popup-desc {
      font-size: 12px;
      line-height: 1.6;
      opacity: 0.7;
      margin-bottom: 10px;
    }
    .donate-popup-about {
      font-size: 13px;
      line-height: 1.7;
      opacity: 0.65;
      margin-bottom: 12px;
    }
    .donate-popup-about div {
      margin-bottom: 2px;
    }
    .donate-popup-meta {
      opacity: 0.5;
      font-size: 12px;
    }
    .donate-popup-section {
      padding-top: 0;
      margin-top: 0;
    }
    .donate-popup-label {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .donate-popup-network {
      font-size: 12px;
      opacity: 0.6;
      margin-bottom: 6px;
      text-align: center;
    }
    .donate-popup-qr {
      text-align: center;
      margin-bottom: 10px;
    }
    .donate-popup-qr img {
      width: 120px;
      height: 120px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .donate-popup-addr-wrap {
      display: flex;
      align-items: stretch;
      gap: 0;
      margin-bottom: 8px;
    }
    .donate-popup-addr {
      flex: 1;
      font-size: 10.5px;
      font-family: monospace;
      word-break: break-all;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px 0 0 4px;
      padding: 8px;
      line-height: 1.4;
      user-select: all;
    }
    .donate-popup-copy {
      border: 1px solid var(--border);
      border-left: none;
      border-radius: 0 4px 4px 0;
      background: transparent;
      color: var(--fg);
      font-size: 13px;
      padding: 0 10px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      opacity: 0.4;
    }
    .donate-popup-copy:hover {
      background: var(--accent);
      color: var(--fg-button);
      border-color: var(--accent);
      opacity: 1;
    }
    .donate-popup-trust {
      display: block;
      text-align: center;
      margin-top: 8px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: transparent;
      color: var(--fg);
      font-size: 12px;
      font-family: inherit;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s;
    }
    .donate-popup-trust:hover {
      background: #3375e0;
      color: #fff;
      border-color: #3375e0;
    }
    .donate-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 299;
    }
    .notify-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent);
      color: var(--fg-button);
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-family: inherit;
      z-index: 400;
      animation: notify-in 0.2s ease-out, notify-out 0.3s ease-in 1.5s forwards;
      pointer-events: none;
    }
    @keyframes notify-in {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes notify-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    .lang-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      z-index: 200;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      min-width: 130px;
    }

    .lang-dropdown button {
      width: 100%;
      padding: 8px 10px;
      border: none;
      background: transparent;
      color: var(--fg);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      text-align: left;
      transition: background 0.15s;
      white-space: nowrap;
    }

    .lang-dropdown button:hover {
      background: var(--secondary);
    }

    .lang-dropdown button.active {
      background: var(--accent);
      color: var(--fg-button);
    }

    .navigator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .navigator button {
      background: var(--secondary);
      color: var(--secondary-fg);
      border: none;
      border-radius: 6px;
      width: 40px;
      height: 40px;
      font-size: 22px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .navigator button:hover { background: var(--secondary-hover); }

    .navigator .name {
      flex: 1;
      text-align: center;
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-mode {
      font-size: 15px;
      opacity: 0.5;
      font-weight: 400;
    }

    .nav-info-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 12px;
      opacity: 0.5;
    }

    .top-actions {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
    }

    .top-actions button {
      flex: 1;
      background: var(--secondary);
      color: var(--secondary-fg);
      border: none;
      border-radius: 4px;
      padding: 6px 0;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .top-actions button:hover { background: var(--secondary-hover); }

    .ring-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 8px 0 12px;
      position: relative;
    }

    .ring-container svg {
      width: 180px;
      height: 180px;
      transform: rotate(-90deg);
    }

    .ring-track {
      fill: none;
      stroke: var(--ring-track);
      stroke-width: 10;
    }

    .ring-fill {
      fill: none;
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.1s ease-out, stroke 0.15s;
    }

    .ring-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .ring-text .count {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.1;
    }

    .ring-text .label {
      font-size: 11px;
      opacity: 0.6;
    }

    .count-btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s, opacity 0.4s;
      margin-bottom: 16px;
    }
    .count-btn:active { transform: scale(0.97); }

    .btn-counter-reset {
      width: 100%;
      padding: 9px;
      border: 1px solid rgba(198, 40, 40, 0.5);
      border-radius: 6px;
      background: rgba(198, 40, 40, 0.08);
      color: #ef5350;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      opacity: 0.75;
      transition: opacity 0.15s, background 0.15s, border-color 0.15s;
    }

    .btn-counter-reset:hover {
      opacity: 1;
      background: rgba(198, 40, 40, 0.15);
      border-color: #ef5350;
    }

    .timer-divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 16px 0 12px;
    }

    .timer-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .timer-row button {
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--input-bg);
      color: var(--fg);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .timer-row button:hover {
      border-color: var(--fg);
      background: var(--secondary);
    }

    .timer-row button.timer-active {
      background: var(--accent);
      color: var(--fg-button);
      border-color: var(--accent);
    }

    .timer-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      white-space: nowrap;
      margin-right: 8px;
    }

    .timer-display {
      flex: 1;
      text-align: right;
      font-size: 16px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.5px;
    }

    .timer-info {
      text-align: center;
      font-size: 12px;
      opacity: 0.5;
      margin-top: 10px;
      font-variant-numeric: tabular-nums;
    }

    .count-btn--say {
      background: var(--accent);
      color: var(--fg-button);
    }
    .count-btn--say:hover { background: var(--accent-hover); }

    .count-btn--done {
      background: #43a047;
      color: #fff;
      cursor: default;
      pointer-events: none;
      animation: doneFadeIn 0.3s ease;
    }

    @keyframes doneFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
    }

    #confetti-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }

    .done-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      opacity: 0;
      transition: opacity 0.4s;
    }

    .done-actions.visible {
      opacity: 1;
    }

    .done-actions button {
      flex: 1;
      padding: 14px 8px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }

    .done-actions button:active { transform: scale(0.97); }

    .done-actions .btn-restart {
      background: var(--accent);
      color: var(--fg-button);
    }
    .done-actions .btn-restart:hover { background: var(--accent-hover); }

    .done-actions .btn-next {
      background: var(--secondary);
      color: var(--secondary-fg);
    }
    .done-actions .btn-next:hover { background: var(--secondary-hover); }

    .bottom-actions {
      display: flex;
      gap: 6px;
    }

    .bottom-actions button {
      flex: 1;
      padding: 8px 0;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    }

    .bottom-actions .btn-outlined {
      border: 1px solid var(--border) !important;
      background: transparent !important;
      color: var(--fg);
      opacity: 0.6;
    }

    .bottom-actions .btn-outlined:hover {
      opacity: 1;
      background: var(--input-bg) !important;
      border-color: var(--fg) !important;
    }

    .btn-delete {
      background: #c62828;
      color: #fff;
    }
    .btn-delete:hover { background: #e53935; }

    .no-items {
      text-align: center;
      padding: 24px;
      opacity: 0.5;
      font-size: 13px;
    }

    .loading-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 120px;
    }
    .loading-spinner {
      width: 28px;
      height: 28px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .page-indicator {
      text-align: center;
      font-size: 10px;
      opacity: 0.4;
      margin-top: 4px;
      margin-bottom: 8px;
    }

    .stats-filter {
      display: flex;
      gap: 0;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .stats-filter button {
      flex: 1;
      padding: 6px 0;
      border: none;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      background: var(--input-bg);
      color: var(--fg);
      transition: background 0.15s, color 0.15s;
    }

    .stats-filter button.active {
      background: var(--accent);
      color: var(--fg-button);
    }

    .stats-filter button:hover:not(.active) {
      background: var(--secondary);
    }

    .stats-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }

    .stat-card {
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      text-align: center;
    }

    .stat-card--total {
      margin-bottom: 8px;
      border-color: #43a047;
    }

    .stat-card .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent);
    }

    .stat-value--total {
      font-size: 32px !important;
      color: #43a047 !important;
    }

    .stat-card .stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      margin-top: 2px;
    }

    .stats-totals {
      margin-bottom: 16px;
    }

    .stats-totals h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      margin-bottom: 8px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
    }

    .total-row:last-child { border-bottom: none; }

    .total-row .total-name { flex: 1; }
    .total-row .total-count {
      font-weight: 600;
      color: var(--accent);
      min-width: 28px;
      text-align: right;
    }

    .history-list h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      margin-bottom: 8px;
    }

    .history-date-group {
      margin-bottom: 12px;
    }

    .history-date {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.5;
      margin-bottom: 4px;
      padding-left: 4px;
    }

    .history-entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 12px;
      background: var(--input-bg);
      margin-bottom: 3px;
    }

    .history-entry .h-name { flex: 1; }
    .history-entry .h-target {
      opacity: 0.5;
      font-size: 11px;
      margin-left: 8px;
    }
    .history-entry .h-time {
      opacity: 0.4;
      font-size: 11px;
      margin-left: 8px;
    }

    .no-history {
      text-align: center;
      padding: 32px 12px;
      opacity: 0.4;
      font-size: 13px;
    }

    .clear-history-btn {
      width: 100%;
      padding: 8px;
      margin-top: 16px;
      background: #c62828;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }
    .clear-history-btn:hover { background: #e53935; }

    .list-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      position: relative;
    }

    .list-item:hover {
      background: var(--input-bg);
    }

    .list-item.active {
      border-color: var(--accent);
      background: var(--input-bg);
    }

    .list-item .li-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .list-item .li-info {
      flex: 1;
      min-width: 0;
    }

    .list-item .li-name {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .li-mode {
      font-size: 13px;
      opacity: 0.5;
      font-weight: 400;
    }

    .list-item .li-progress {
      font-size: 11px;
      opacity: 0.5;
    }

    .li-progress--done {
      color: #43a047;
      opacity: 0.8;
    }

    .list-item .li-color-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid var(--border);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background: transparent;
    }

    .list-item .li-color-btn:hover {
      border-color: var(--fg);
    }

    .li-checkbox {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 2px solid var(--border);
      background: var(--input-bg);
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: border-color 0.15s, background 0.15s;
    }

    .li-checkbox:hover {
      border-color: var(--fg);
    }

    .li-checkbox.checked {
      background: var(--accent);
      border-color: var(--accent);
    }

    .li-drag-handle {
      cursor: grab;
      flex-shrink: 0;
      opacity: 0;
      font-size: 12px;
      padding: 0 1px;
      transition: opacity 0.15s;
    }

    .list-item:hover .li-drag-handle {
      opacity: 0.3;
    }

    .li-drag-handle:hover {
      opacity: 0.7 !important;
    }

    .li-drag-handle:active {
      cursor: grabbing;
    }

    .li-action-btns {
      position: absolute;
      right: 40px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      gap: 4px;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .list-item:hover .li-action-btns {
      opacity: 1;
    }

    .li-action-btn {
      width: 26px;
      height: 26px;
      border-radius: 4px;
      border: 1px solid var(--border);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      background: var(--input-bg);
      color: var(--fg);
      transition: background 0.15s, border-color 0.15s;
    }

    .li-action-btn:hover {
      border-color: var(--fg);
      background: var(--secondary);
    }

    .li-delete-btn:hover {
      border-color: #ef5350;
      color: #ef5350;
    }

    .load-defaults-link {
      display: block;
      width: 100%;
      text-align: center;
      margin-top: 20px;
      background: none;
      border: none;
      color: var(--fg);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.15s;
      text-decoration: underline;
    }
    .load-defaults-link:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    .item-form {
      margin-top: 8px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .item-form-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.5;
      text-align: center;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border);
      position: relative;
    }
    .item-form-close {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: 2px solid rgba(239, 83, 80, 0.7);
      color: #ef5350;
      opacity: 1;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      padding: 1px 7px;
      line-height: 1.4;
      border-radius: 4px;
      transition: opacity 0.15s, background 0.15s, border-color 0.15s;
    }
    .item-form-close:hover {
      background: #ef5350;
      border-color: #ef5350;
      color: #fff;
    }
    .item-form-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .item-form-actions .mode-toggle {
      flex: 1;
    }
    .item-form-actions .btn-primary {
      border: 1px solid var(--accent) !important;
      background: transparent !important;
      color: var(--accent);
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      opacity: 0.9;
      white-space: nowrap;
      transition: opacity 0.15s, background 0.15s, border-color 0.15s;
    }
    .item-form-actions .btn-primary:hover {
      background: var(--accent) !important;
      color: var(--fg-button) !important;
    }

    .mode-toggle {
      display: flex;
      gap: 0;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--input-border);
    }

    .mode-toggle button {
      flex: 1;
      padding: 6px 0;
      border: none;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      background: var(--input-bg);
      color: var(--fg);
      transition: background 0.15s, color 0.15s;
    }

    .mode-toggle button.active {
      background: var(--accent);
      color: var(--fg-button);
    }

    .item-form label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
      margin-bottom: 2px;
      display: block;
    }

    .item-form input, .item-form select {
      width: 100%;
      padding: 6px 8px;
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
    }

    .item-form input:focus, .item-form select:focus {
      border-color: var(--accent);
    }

    .item-form-colors {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .item-form-colors button {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      font-size: 13px;
      padding: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-form-colors button.selected {
      border-color: var(--fg);
    }

    .list-item.dragging {
      opacity: 0.4;
      border-style: dashed;
    }

    .list-item.drag-over {
      border-top: 2px solid var(--accent);
    }

    .color-picker-popup {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .color-picker-popup button {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      padding: 0;
      background: transparent;
    }

    .color-picker-popup button:hover {
      border-color: var(--fg);
    }

    .color-picker-popup button.selected {
      border-color: var(--fg);
    }

  </style>
</head>
<body>
  <div id="confetti-container"></div>
  <div id="donateArea"></div>
  <div id="app"></div>

  <script nonce="${nonce}">
    const vscodeApi = acquireVsCodeApi();
    const BUILD_DATE = '${BUILD_DATE}';
    let state = null;
    let history = null;
    let currentView = 'list';
    let statsFilter = 'all';
    let statsLimit = 100;
    let openColorPicker = null;
    let showAddForm = false;
    let editItemId = null;
    let doneTimer = null;
    const celebratedItems = new Set();
    const doneItems = new Set();
    const timerStates = {};
    const countingStates = {};
    let addMode = 'ascending';
    let editMode = 'ascending';
    let addNameValue = '';
    let addTargetValue = '33';
    let editNameValue = '';
    let editTargetValue = '';
    let lang = 'tr';
    let openLangMenu = false;
    let showDonatePopup = false;

    const LANGS = {
      tr: { cc: 'tr', name: 'Türkçe' },
      en: { cc: 'gb', name: 'English' },
      de: { cc: 'de', name: 'Deutsch' },
      fr: { cc: 'fr', name: 'Français' },
      ar: { cc: 'sa', name: 'العربية' },
      zh: { cc: 'cn', name: '中文' },
      es: { cc: 'es', name: 'Español' },
      ru: { cc: 'ru', name: 'Русский' },
      ja: { cc: 'jp', name: '日本語' },
      ko: { cc: 'kr', name: '한국어' },
      pt: { cc: 'br', name: 'Português' },
      it: { cc: 'it', name: 'Italiano' },
      hi: { cc: 'in', name: 'हिन्दी' },
      id: { cc: 'id', name: 'Indonesia' },
      ur: { cc: 'pk', name: 'اردو' },
      ms: { cc: 'my', name: 'Melayu' },
      bn: { cc: 'bd', name: 'বাংলা' },
      fa: { cc: 'ir', name: 'فارسی' },
      uk: { cc: 'ua', name: 'Українська' },
      pl: { cc: 'pl', name: 'Polski' },
    };
    const FLAGS = {
      tr:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbCAMAAAA5zj1cAAAARVBMVEXjChf70dPqRlDnMDvnLDflIi383N7jCxj////kFCHmJjL4v8Pwe4LvbnbtZW3sUlv+8PHlHSn0naL3trrpO0XyjZPyiZBeDlMuAAAAjUlEQVQ4y+WTyxKDIAwAw0NYQETR9v8/tQenehHl3ObE7OxAQhLx0hVeflZctOkQ/egAlf2DODhQU1zKdC/6BHk/xVvxBfWgw9AUPRAOapNYcy0aUCfVzC5ciwXWLwsVKI2nI7iTbrNTjRtl7sxRRnj3VC2SYP/qYB86o6BuIY65r9er7pse+4c7cyd+AOKjBXOHX0j9AAAAAElFTkSuQmCC',
      gb:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAMAAADImI+JAAAANlBMVEX////w8vfyxcx8jbJCWpAOLHFVa5sBIWnIEC7WTGLnv8qAkLTheYpecqHx0digrMfz3+T21dqBS5WQAAAApUlEQVQoz8WTyxpFMAyEpyqOuhTv/7IntImmurAzC59kfsIIhA5wnn6iASMLgzbIT2Fk6joUaAUKBsiJm+kJ0iyuR1mQBam8Cex1dINkZ6EesSZwrR8JfdYWl7AcbCRw5ypytYmPpy6w3X6jL8HXL6PxOODgTPYEcnXmFe94cuBsdJzwpIFrRwK3WPkJLQqL2aUoUVisXjOvLizWWNyMVljrV0gz/wdhEi0lRIbcAAAAAElFTkSuQmCC',
      de:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAYAgMAAAD16ldTAAAACVBMVEUAAADdAAD/zgDGIigcAAAAFUlEQVQY02NgoBEIhQPqMlfBAVWZANYST7G6bxb2AAAAAElFTkSuQmCC',
      fr:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbBAMAAAD8PtBdAAAAD1BMVEUAJlT////OESbvr7aqtsYrjF9NAAAAGUlEQVQoz2NgAAMWQTAwUgIDhlHBUUG8ggBpKyX5efKDZQAAAABJRU5ErkJggg==',
      sa:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbCAMAAAA5zj1cAAAAQlBMVEUAVDBvnoohakoTYD9bkHkGWDU7e2ACVTFDgWaBq5kmbU95pZJRinFVjXU1d1pLhm2Os6OiwbMtclRkl4EKWje50MYuwG0pAAAAnklEQVQ4y+XTuQ4DMQgEULABj+9r9/9/NV0qK0qRajP1k9AgoEBfJdBDoRJdpD5cpEtTUtJ0HWEraXNp1sCoq0ssUo/QbY3ZyoZUKa5ice9H2GXbkI6SknCrSFHkCCtszlmQMTJ2he98Hg0Doy1nc9y5GXuzcoQ2B3oemfdwbQgyO3feYwruIu+8Nu8V60FHoZ/K+BzfueOUf3iFH8EXincH0Y/Lci4AAAAASUVORK5CYII=',
      cn:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAA1CAMAAADh9px2AAAANlBMVEXuHCX//wDwLyHyVBvuIiP5qw3xPx71dRX+5wP3jRL4mRD/9gHzXxnySxz7wQn6tgv7ygj80QdOKUmjAAAAwElEQVQYGe3BSXLDMAwEwBkQBFct+f9nbSVOpORIwYdUsRv/msKTmBS42lvEbYZTZKuKe2TFDytrwl2JgpME3LUy4TcxKIYpueKPHAsGaDgUsoXDghepjQtG9MbTh+FFLcaqGCE7v1VcFMUYReGnHHClGLfxkOBFGw8RXjqZK9kUV0EwKnJTWGbHSUKsQTBEc8KTxoiLQhaMMcOXjgvL2eBpEQlws8CTpFThKnLvcCSZ2wJHoj3BmWCapmmapumtHrOgA8RDdxj4AAAAAElFTkSuQmCC',
      es:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbCAMAAAA5zj1cAAAApVBMVEX6vQCtFRnBPxP3tgCkSRTxsQC9miCtkjL3ugDcdwrVkwndpwauUEi3k3ecLQyvGx01YomtXy3Zhha+gw+4LiCzn4jKeBKyYgjmoAOkXUK/RhC1kJmmKh+0oKCbYwN5OAWWHxSVi0HypQNcdGsDAgC9g1j6vgSWhnLfsSXCn169cE24eBuaNwzQaiOYagW8bxWIOhqoKhPLdq4yUHR+UgVZLWaBHkAs3esWAAAAk0lEQVQ4y+WTVxLDIAxESQwBAwb33tKc3sv9j5YbWJp8JvurNzsrzYpMkCI/BU6RIt9phqIcJSOpEGBu7c2WA+iXOWmbtTmTACh42PdelSgwp+d2nXdvTjuAc3X5vL6qJo4XQEZ9qd8PXaR7yDE5GFOf6XbNRrmB8cgcKaUraJm5z4NiE4RLH3FyIUaG6Pb85XN9AIg9CvrV7UGSAAAAAElFTkSuQmCC',
      ru:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbAgMAAABzfiX9AAAACVBMVEUAOabVKx7///95ANL1AAAAFUlEQVQY02NYBQcMtGLSAYTCAa2YAJQLWaccQRfwAAAAAElFTkSuQmCC',
      jp:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbCAMAAAA5zj1cAAAAOVBMVEW8AC3dfJPMPF7ILFHQTGvuvcjADzn////55urjkaXyzte9BTHqrbvDHEP++fr77/Hst8PmobHXZ4H4lhdsAAAAcUlEQVQ4y9XTuw6AIAyF4XKVclXf/2FNjDF0OMjgwj9/YWgLbZPRkjA4Zhc+YbB0Z8MYHp6efB7BmOgtRQyroQ6aCmEm0Q6hklBBqCXUEHoJPYRm9kUr4QkhS8gQttK70vBmHM1tRkyS/7me+Xtc+hdeTWcZDIhvaeAAAAAASUVORK5CYII=',
      kr:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbCAMAAAA5zj1cAAAAvVBMVEX///8AR6DNLjrt7e6cnJwKCgoaGhrY2NiMjIxAQEB5eXmvr6+8vLyEhIQdQ5IgICCYmJivMUn59vfExMQ6OjrGxsaJiYlkZGReXl5wcHDQR1P55OYMT6TyyczH1ur+/f0RERGVlZWhoaEhISFoiLzZ4/HmvsZnOWx7n84HRZzlk5rOND/FLj3109XOMT3Ozs5HR0ff398zMzMgXqyFNl3dcXmWkrfkjpVKPXvCgpUmYq65zOXIqLuwvtqfudvB4UIoAAABKklEQVQ4y7WTWXeCMBCFmZCEQEBRW8oiKuC+Vbvv//9nFdLIaRPl+GDvS3KG73CTmRvD+D9Zpl4zLb02vHN6aq3nXOkgawfU/fNT06WsjVVuTzjB5PZ36ZpkJA9UczvahXb0s082XbHe2OFONccFpgGtvifLGCH0mFTeDqe5Yo75yCduuUlXSGiVCnOfcuWUlmeH5TLdIqltKsw9vUGsvHI3RrXiypydaPr0QHXWCG0apvMksRYsZmjZAI4fJFfq5bkBnMNsLTmA1wZwALCQGMDHCai6tfEGtVrDo7eWfRz0a/DzaB/rydTkVxUz4o+UyeQFo5mYtTm/B+iP38WsXZqpQbMjzg7pmUwMmR7GtejuyzT6ah59grU8Gqzw9IR7esLPfzNnv8KL6RtMsRLeZtvj3wAAAABJRU5ErkJggg==',
      br:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAA4CAMAAABdaI+oAAAAw1BMVEUAlED/ywAwJoEHlj4SmDs3LHv7yAKnuBZYpypCoi5trCXtyATixQYgmjf9ygG8lSk2LYT0xwQyKIE+NIdNPW5MRJGKsh25uxHHvg4vnjPWwgpmX6JFN3OsiDNgTWJeV5y74syKbUjYrBh8da5VRGmdu7vX7OGopsql2rzJnyGMhre0tdDI59aZtRp6riKVkL2V0rBWUJj4/PpaUpq018h5fKppwI7Q3d7Mx8CNpa58iqulycCjkISAdpbVrS9uaKTPuH6BIXwtAAACKElEQVRYw+1XaXOiQBDNtGJAUUaORMUDRQHFRI3mzm72//+qpYZhist1RKitVPm+WGrXq+7pN697bm6uuCJCrVYunyTLUol09VsU4LZeFp/YQgQtsRS69j1iuG9fztfsohi6zQvp+j2UQq9/iVbuOiiDzl1hBUkDwtBYTse6IOjj6bJBfhgUU1D9IaQbDYFhOAopHwooSJRJfYoOCegKOQVZLCRlhBQBUhCU8J/zZN6kUlYgB5Sxxa+gdqSVmZBHKMxou3t8Mq89NihfYw65mLOARw4F9QdMcSM4ghELGfTPkHL3fbE4bA+fi/fNs4njhMMur8wlOXYl/ljW1vLWznb99PLkLD522M2mGChIOqkVii/b3BsYG3vT/nBf15538E1KOE0EHlNQZHsRxuDGyjRdxwvynJAv42RkrlHGbS/EMN0L03deLEKpp2OzRpm0PYKMCCeq4QeHGuQtZIIzRvkPwlWcdOdvnU+Dg/BUyapKP8FeW9av0yXnNgUwaFG5E8ZtvHpvHE3JyKYzBdhQPtWIV47dNy7ZpIW9NOygwlV4RzRGt9Iw/OYTdurqdeYxpugMg+K1/fycCRMzB+KGz0BStG1W8CZyRB5zSNhXmCL4lEkzQd1puw2wBLns67jBYgzfGGvMYFGvfeEI0FYwMYuMgLwhRZtiGMWGFBujaJYeo2G9svj/B335q0gFy1L561wFC2cFK3H5S3sFz4ryHz4VPM2u+NH4C4s2LLeHO8TWAAAAAElFTkSuQmCC',
      it:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbBAMAAAD8PtBdAAAAElBMVEXOKzcAkkb///+q28EBkkbvt7tlcfnnAAAAGUlEQVQoz2NwFAQBYSUwCGCAgFHBUUG8ggBTFC/I4rFoIQAAAABJRU5ErkJggg==',
      in:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbBAMAAAD8PtBdAAAAMFBMVEUEajj/aCD////f3/GpqNhPTa7MzOiOjMthX7f5+fxubLyFg8b4+Py+veF1dMD9/f41r+HyAAAATElEQVQoz2MQxAIYhoqgEhRoloZPgrHhgqZuKcEYgotNnK3QBfXb/J5koAsq722NuG2Ern2Z95YsDDOLTZzNMQRPuKX0YAiiuHMoAwA5/S6KfoLQ6QAAAABJRU5ErkJggg==',
      id:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbAgMAAABzfiX9AAAACVBMVEX/AAD/////f3/sDLJDAAAAFUlEQVQY02NgGFxgFRwwhMLBYGACAOpnMc9afqfwAAAAAElFTkSuQmCC',
      pk:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbCAMAAAA5zj1cAAAASFBMVEUBQRw0Z0ro7era494PTCnE08oIRiL///8AQBsYUzFtknxCclaAoI6dtqjy9fN5m4cjWzpdhm6Pq5v5+vlKd122yL5SfmWovrFMT0WcAAAAqUlEQVQ4y82T2RKDIAxFWQIxgIJr//9Pq8UqrQN0+mReuAlnCAmB4WGsbDcEm81YUwMBdrwM0pAcXAB7Sa9VQ0peQT66XanFn9mvoEQexdKNoXDHCbsoghfYFkCH6r3XAuk8qFAe1actuoDdV+ubHCgR+w8wl/qBKOAX0K8yKZZniwGxakW7ZyD/hHZzxDBpHazipaFwZ8xUpmeOkZmqg0vWGEt3/1x/g0+JGQvLRID/bQAAAABJRU5ErkJggg==',
      my:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAMAAADImI+JAAAAP1BMVEUAAGbPNjkWElwtJFPlf3/YPz9mADPyv7/////MAAD+ywBKO0hkUD3tvQd5YTXPpRKZeiiLby4NCmC1kR2kgyQNwyLcAAAAiElEQVQoz62ROw7DQAgFJ2AnMftf+/5nTWFLSYHWW2Q6xBMjABw2h6ulrYZvcHE4Oy0F6F36Wb4cAMhJAYkxylhtFSCUVMJwoloEtJpZ1VFQrAESk6UsQ/VegB5yy2M1Ug4AVb07T99Lvja+OThdfz7zduDp4KofDquDq3HV6yTzwf+rl0mm1R+RJBEw0tYURgAAAABJRU5ErkJggg==',
      bd:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAYBAMAAAB6qqLzAAAAHlBMVEX0KkEAak6JRUYwXEq2OUPjLUEFZ03GNUPeL0JrTUfISCBBAAAAYklEQVQY02MQxAIYqCNo5BqijC6YxAAEaqiCwgUgQXZDFEEhBjBQRBE0gAgyowgqQASZUAQLIIIsKIIBEEEOFMEGbIIO2LRjtQjqpGAUQUmI4EQUQTGINxMJBwj2oKNqHAEAY1EgMcMScm8AAAAASUVORK5CYII=',
      ir:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAXCAMAAABODP0nAAAAVFBMVEXaAAAjn0D////wkZHkSUme1KtfunRduHOo2bTjRERYtW7xmpriPT2k17DujIzxl5f+9PT96enxnZ30sLBDrVzfJyeKy5nrd3fsfn7tg4P4y8v0s7NKuoUCAAAAkElEQVQoz+WPRxLDMAhFlSBLVrOae+5/zyCcsrAXrBPKvIH/FyBuzBA/ZRyVtlprq9QbloDdoOyhj2LuuxC6nvKF7xw+8yzu58j5Ynk2pr0+9sQwuhpLLQxjWcGtHCNsw7AB58bsfebciF+nq68XBxAhDggAR4jQgI1FAuqLmKSRHkvKBmMaDEHS1hz6JP4ynkIfCksRzajdAAAAAElFTkSuQmCC',
      ua:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAbAgMAAABzfiX9AAAACVBMVEUAW7v/1QCAmF1B+3A0AAAAFUlEQVQY02NgGFxgFRwwhMLBYGACAOpnMc9afqfwAAAAAElFTkSuQmCC',
      pl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAYAgMAAAD16ldTAAAACVBMVEXcFDz////tip5hJkzaAAAAFElEQVQY02MIhQOGAWOuggOGQQAAG50ufcR4g+sAAAAASUVORK5CYII=',
    };
    function flagImg(code, size) {
      size = size || 20;
      const src = FLAGS[code] || '';
      return '<img src="' + src + '" width="' + size + '" height="' + Math.round(size * 0.75) + '" style="vertical-align:middle;display:inline-block;border-radius:2px;">';
    }
    let audioCtx = null;
    function playClick() {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch(e) {}
    }
    function playWin() {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.3);
        });
      } catch(e) {}
    }
    function showNotify(text) {
      const el = document.createElement('div');
      el.className = 'notify-toast';
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(() => { el.remove(); }, 2000);
    }

    function spawnConfetti() {
      const container = document.getElementById('confetti-container');
      if (!container) return;
      container.innerHTML = '';
      const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bcb','#a66cff','#ff9f43'];
      for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        const size = Math.random() * 8 + 4;
        p.style.cssText = 'position:fixed;left:' + (Math.random() * 100) + '%;top:-10px;width:' + size + 'px;height:' + size + 'px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';opacity:1;pointer-events:none;z-index:9999;animation:confetti-fall ' + (Math.random() * 1.5 + 1.5) + 's ease-out forwards;animation-delay:' + (Math.random() * 0.5) + 's;';
        container.appendChild(p);
      }
      setTimeout(() => { container.innerHTML = ''; }, 4000);
    }
    let soundEnabled = true;

    function formatTimer(ms) {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const pad2 = n => String(n).padStart(2, '0');
      if (h > 0) return h + ':' + pad2(m) + ':' + pad2(s);
      if (m > 0) return m + ':' + pad2(s);
      return String(s);
    }

    function getTimerDisplay() {
      return formatTimer(getTimerMs());
    }

    function updateTimerDisplay() {
      const el = document.getElementById('timerDisplay');
      if (el) el.textContent = getTimerDisplay();
    }

    function updateTimerInfo() {
      const el = document.getElementById('timerInfo');
      if (el) el.textContent = getTimerInfo();
    }

    function getTimerState() {
      const item = getActive();
      if (!item || !timerStates[item.id]) return { running: false, start: 0, elapsed: 0, interval: null };
      return timerStates[item.id];
    }

    function getTimerMs() {
      const ts = getTimerState();
      if (ts.running) return ts.elapsed + (Date.now() - ts.start);
      return ts.elapsed;
    }

    function startTimer() {
      const item = getActive();
      if (!item) return;
      if (!timerStates[item.id]) timerStates[item.id] = { running: false, start: 0, elapsed: 0, interval: null };
      const ts = timerStates[item.id];
      if (ts.running) return;
      ts.running = true;
      ts.start = Date.now();
      ts.interval = setInterval(updateTimerDisplay, 200);
    }

    function pauseTimer(id) {
      const itemId = id || (getActive() ? getActive().id : null);
      if (!itemId || !timerStates[itemId]) return;
      const ts = timerStates[itemId];
      if (!ts.running) return;
      ts.running = false;
      ts.elapsed += Date.now() - ts.start;
      clearInterval(ts.interval);
      ts.interval = null;
    }

    function resetTimer() {
      const item = getActive();
      if (!item) return;
      const ts = timerStates[item.id];
      if (!ts) return;
      if (ts.interval) clearInterval(ts.interval);
      timerStates[item.id] = { running: false, start: 0, elapsed: 0, interval: null };
    }

    function getTimerInfo() {
      const item = getActive();
      if (!item) return '';
      const cs = countingStates[item.id];
      if (!cs) return '';
      const elapsed = Date.now() - cs.startedAt;
      if (elapsed < 60000) return t('timer_wait');
      const dc = localCurrent !== null ? localCurrent : item.current;
      const elapsedMin = elapsed / 60000;
      const counted = item.mode === 'ascending' ? dc - cs.base : cs.base - dc;
      if (counted <= 0) return '';
      const perMin = counted / elapsedMin;
      const remaining = item.mode === 'ascending' ? item.target - dc : dc;
      const perMinStr = Math.round(perMin) + ' ' + t('timer_per_min');
      if (remaining <= 0 || perMin <= 0) return perMinStr;
      const estMin = Math.ceil(remaining / perMin);
      if (estMin < 1) return perMinStr;
      return perMinStr + '     ~' + estMin + ' ' + t('timer_est');
    }

    const I18N = {
      tr: {
        tabs_list: 'Liste', tabs_counter: 'Sayaç', tabs_stats: 'İstatistik',
        count: 'Say', done: 'Tamamlandı', restart: 'Tekrar Başla', next: 'Sonrakine Geç',
        reset: 'Sıfırla', reset_all: 'Tümünü Sıfırla',
        add: '+ Tesbih Ekle', export: 'Dışa Aktar', import_: 'İçe Aktar',
        no_items: 'Henüz tesbih eklenmedi',
        form_title_add: 'Yeni Tesbih Ekle', form_title_edit: 'Tesbih Düzenle',
        label_name: 'Tesbih Adı', label_target: 'Hedef Sayı', label_mode: 'Mod', label_color: 'Renk',
        mode_asc: 'Artan', mode_desc: 'Azalan', mode_asc_full: 'Artan (0 → hedef)', mode_desc_full: 'Azanan (hedef → 0)',
        btn_save: 'Kaydet', btn_cancel: 'İptal', btn_add: 'Ekle',
        stats_total: 'Toplam Sayılan', stats_completed: 'Tamamlanan', stats_variety: 'Çeşit',
        filter_today: 'Bugün', filter_yesterday: 'Dün', filter_week: 'Hafta', filter_month: 'Ay', filter_all: 'Tümü',
        history: 'Geçmiş', no_history: 'Henüz kayıt yok', clear_history: 'Geçmişi Temizle', show_more: 'Daha Fazla Göster',
        piece: 'adet', placeholder_name: 'Tesbih adı girin',
        tooltip_edit: 'Düzenle', tooltip_reset: 'Sıfırla', tooltip_delete: 'Sil', tooltip_drag: 'Sürükle',         tooltip_sound: 'Ses Aç/Kapat', tooltip_donate: 'Bağış', donate_copy: 'Kopyala', donate_desc: 'Destek vermek isterseniz aşağıdaki yöntemleri kullanabilirsiniz.', donate_crypto: 'Kripto Bağış', donate_about: 'VS Code için dijital tesbih sayacı. Zikir ve tesbihatlarınızı takip edin, istatistiklerinizi görüntüleyin. Hızlı ve kolay sayaç deneyimi sunar.', donate_author: 'Geliştirici', donate_email: 'E-posta', donate_updated: 'Son Güncelleme', donate_copied: 'Kopyalandı!',         load_defaults: 'Varsayılan Tesbihleri Yükle', timer_label: 'Süre', timer_start: 'Başlat', timer_pause: 'Durdur', timer_reset: 'Sıfırla', timer_per_min: '/dk', timer_wait: '1 dakika sayımdan sonra hız bilgisi gözükür', timer_est: 'Tahmini Kalan Süre',
      },
      en: {
        tabs_list: 'List', tabs_counter: 'Counter', tabs_stats: 'Stats',
        count: 'Count', done: 'Completed', restart: 'Restart', next: 'Next',
        reset: 'Reset', reset_all: 'Reset All',
        add: '+ Add Dhikr', export: 'Export', import_: 'Import',
        no_items: 'No dhikr added yet',
        form_title_add: 'Add New Dhikr', form_title_edit: 'Edit Dhikr',
        label_name: 'Name', label_target: 'Target', label_mode: 'Mode', label_color: 'Color',
        mode_asc: 'Ascending', mode_desc: 'Descending', mode_asc_full: 'Ascending (0 → target)', mode_desc_full: 'Descending (target → 0)',
        btn_save: 'Save', btn_cancel: 'Cancel', btn_add: 'Add',
        stats_total: 'Total Counted', stats_completed: 'Completed', stats_variety: 'Variety',
        filter_today: 'Today', filter_yesterday: 'Yesterday', filter_week: 'Week', filter_month: 'Month', filter_all: 'All',
        history: 'History', no_history: 'No records yet', clear_history: 'Clear History', show_more: 'Show More',
        piece: 'pcs', placeholder_name: 'Enter dhikr name',
        tooltip_edit: 'Edit', tooltip_reset: 'Reset', tooltip_delete: 'Delete', tooltip_drag: 'Drag',         tooltip_sound: 'Sound On/Off', tooltip_donate: 'Donate', donate_copy: 'Copy', donate_desc: 'If you would like to support us, you can use the methods below.', donate_crypto: 'Crypto Donation', donate_about: 'Digital tesbih counter for VS Code', donate_author: 'Developer', donate_email: 'Email', donate_updated: 'Last Updated', donate_copied: 'Copied!',         load_defaults: 'Load Default Dhikrs', timer_label: 'Time', timer_start: 'Start', timer_pause: 'Pause', timer_reset: 'Reset', timer_per_min: '/min', timer_wait: 'Geschwindigkeitsinfo nach 1 Min. Zählung', timer_est: 'Estimated Remaining Time',
      },
      de: {
        tabs_list: 'Liste', tabs_counter: 'Zähler', tabs_stats: 'Statistik',
        count: 'Zählen', done: 'Fertig', restart: 'Neustart', next: 'Nächster',
        reset: 'Zurücksetzen', reset_all: 'Alle zurücksetzen',
        add: '+ Dhikr hinzufügen', export: 'Exportieren', import_: 'Importieren',
        no_items: 'Noch kein Dhikr hinzugefügt',
        form_title_add: 'Neues Dhikr', form_title_edit: 'Dhikr bearbeiten',
        label_name: 'Name', label_target: 'Ziel', label_mode: 'Modus', label_color: 'Farbe',
        mode_asc: 'Aufsteigend', mode_desc: 'Absteigend', mode_asc_full: 'Aufsteigend (0 → Ziel)', mode_desc_full: 'Absteigend (Ziel → 0)',
        btn_save: 'Speichern', btn_cancel: 'Abbrechen', btn_add: 'Hinzufügen',
        stats_total: 'Gesamt gezählt', stats_completed: 'Fertig', stats_variety: 'Sorten',
        filter_today: 'Heute', filter_yesterday: 'Gestern', filter_week: 'Woche', filter_month: 'Monat', filter_all: 'Alle',
        history: 'Verlauf', no_history: 'Noch keine Einträge', clear_history: 'Verlauf löschen', show_more: 'Mehr anzeigen',
        piece: 'Stk', placeholder_name: 'Dhikr-Name eingeben',
        tooltip_edit: 'Bearbeiten', tooltip_reset: 'Zurücksetzen', tooltip_delete: 'Löschen', tooltip_drag: 'Ziehen',         tooltip_sound: 'Ton An/Aus', tooltip_donate: 'Spenden', donate_copy: 'Kopieren', donate_desc: 'Wenn Sie uns unterstützen möchten, können Sie die folgenden Methoden verwenden.', donate_crypto: 'Krypto-Spende', donate_about: 'Digitaler Tesbih-Zähler für VS Code', donate_author: 'Entwickler', donate_email: 'E-Mail', donate_updated: 'Letztes Update', donate_copied: 'Kopiert!',         load_defaults: 'Standard-Dhikr laden', timer_label: 'Zeit', timer_start: 'Start', timer_pause: 'Pause', timer_reset: 'Reset', timer_per_min: '/min', timer_wait: 'Geschwindigkeitsinfo nach 1 Min. Zählung', timer_est: 'Geschätzte Verbleibende Zeit',
      },
      fr: {
        tabs_list: 'Liste', tabs_counter: 'Compteur', tabs_stats: 'Statistiques',
        count: 'Compter', done: 'Terminé', restart: 'Recommencer', next: 'Suivant',
        reset: 'Réinitialiser', reset_all: 'Tout réinitialiser',
        add: '+ Ajouter un Dhikr', export: 'Exporter', import_: 'Importer',
        no_items: 'Aucun dhikr ajouté',
        form_title_add: 'Nouveau Dhikr', form_title_edit: 'Modifier le Dhikr',
        label_name: 'Nom', label_target: 'Objectif', label_mode: 'Mode', label_color: 'Couleur',
        mode_asc: 'Croissant', mode_desc: 'Décroissant', mode_asc_full: 'Croissant (0 → objectif)', mode_desc_full: 'Décroissant (objectif → 0)',
        btn_save: 'Enregistrer', btn_cancel: 'Annuler', btn_add: 'Ajouter',
        stats_total: 'Total compté', stats_completed: 'Terminé', stats_variety: 'Variétés',
        filter_today: "Aujourd'hui", filter_yesterday: 'Hier', filter_week: 'Semaine', filter_month: 'Mois', filter_all: 'Tout',
        history: 'Historique', no_history: 'Aucun enregistrement', clear_history: 'Effacer', show_more: 'Afficher plus',
        piece: 'pcs', placeholder_name: 'Nom du dhikr',
        tooltip_edit: 'Modifier', tooltip_reset: 'Réinitialiser', tooltip_delete: 'Supprimer', tooltip_drag: 'Glisser',         tooltip_sound: 'Son Activé/Désactivé', tooltip_donate: 'Faire un don', donate_copy: 'Copier', donate_desc: 'Si vous souhaitez nous soutenir, vous pouvez utiliser les méthodes ci-dessous.', donate_crypto: 'Don Crypto', donate_about: 'Compteur de tesbih numérique pour VS Code', donate_author: 'Développeur', donate_email: 'E-mail', donate_updated: 'Dernière mise à jour', donate_copied: 'Copié !',         load_defaults: 'Charger les dhikrs par défaut', timer_label: 'Durée', timer_start: 'Démarrer', timer_pause: 'Pause', timer_reset: 'Réinit.', timer_per_min: '/min', timer_wait: 'Infos vitesse visibles après 1 min de comptage', timer_est: 'Temps Restant Estimé',
      },
      ar: {
        tabs_list: 'القائمة', tabs_counter: 'العداد', tabs_stats: 'الإحصائيات',
        count: 'سبّح', done: 'تم', restart: 'إعادة', next: 'التالي',
        reset: 'تصفير', reset_all: 'تصفير الكل',
        add: '+ إضافة ذكر', export: 'تصدير', import_: 'استيراد',
        no_items: 'لم يتم إضافة أذكار',
        form_title_add: 'إضافة ذكر جديد', form_title_edit: 'تعديل الذكر',
        label_name: 'الاسم', label_target: 'الهدف', label_mode: 'الوضع', label_color: 'اللون',
        mode_asc: 'تصاعدي', mode_desc: 'تنازلي', mode_asc_full: 'تصاعدي (0 → الهدف)', mode_desc_full: 'تنازلي (الهدف → 0)',
        btn_save: 'حفظ', btn_cancel: 'إلغاء', btn_add: 'إضافة',
        stats_total: 'المجموع', stats_completed: 'مكتمل', stats_variety: 'الأنواع',
        filter_today: 'اليوم', filter_yesterday: 'أمس', filter_week: 'الأسبوع', filter_month: 'الشهر', filter_all: 'الكل',
        history: 'السجل', no_history: 'لا سجلات', clear_history: 'مسح السجل', show_more: 'عرض المزيد',
        piece: 'عدد', placeholder_name: 'أدخل اسم الذكر',
        tooltip_edit: 'تعديل', tooltip_reset: 'إعادة تعيين', tooltip_delete: 'حذف', tooltip_drag: 'سحب',         tooltip_sound: 'تشغيل/إيقاف الصوت', tooltip_donate: 'تبرع', donate_copy: 'نسخ', donate_desc: 'إذا كنت ترغب في الدعم، يمكنك استخدام الطرق أدناه.', donate_crypto: 'تبرع بالعملة الرقمية', donate_about: 'عداد تسبيح رقمي لـ VS Code', donate_author: 'المطور', donate_email: 'البريد الإلكتروني', donate_updated: 'آخر تحديث', donate_copied: 'تم النسخ!',         load_defaults: 'تحميل الأذكار الافتراضية', timer_label: 'المدة', timer_start: 'تشغيل', timer_pause: 'إيقاف', timer_reset: 'تصفير', timer_per_min: '/د', timer_wait: 'يظهر معدل السرعة بعد دقيقة واحدة من العد', timer_est: 'الوقت المتبقي المقدر',
      },
      zh: {
        tabs_list: '列表', tabs_counter: '计数器', tabs_stats: '统计',
        count: '计数', done: '已完成', restart: '重新开始', next: '下一个',
        reset: '重置', reset_all: '全部重置',
        add: '+ 添加赞词', export: '导出', import_: '导入',
        no_items: '尚未添加赞词',
        form_title_add: '添加新赞词', form_title_edit: '编辑赞词',
        label_name: '名称', label_target: '目标', label_mode: '模式', label_color: '颜色',
        mode_asc: '递增', mode_desc: '递减', mode_asc_full: '递增 (0 → 目标)', mode_desc_full: '递减 (目标 → 0)',
        btn_save: '保存', btn_cancel: '取消', btn_add: '添加',
        stats_total: '总计', stats_completed: '已完成', stats_variety: '种类',
        filter_today: '今天', filter_yesterday: '昨天', filter_week: '本周', filter_month: '本月', filter_all: '全部',
        history: '历史', no_history: '暂无记录', clear_history: '清除历史', show_more: '显示更多',
        piece: '个', placeholder_name: '输入赞词名称',
        tooltip_edit: '编辑', tooltip_reset: '重置', tooltip_delete: '删除', tooltip_drag: '拖动',         tooltip_sound: '声音 开/关', tooltip_donate: '捐赠', donate_copy: '复制', donate_desc: '如果您想支持我们，可以使用以下方式。', donate_crypto: '加密货币捐赠', donate_about: 'VS Code 数字念珠计数器', donate_author: '开发者', donate_email: '邮箱', donate_updated: '最后更新', donate_copied: '已复制!',         load_defaults: '加载默认赞词', timer_label: '时长', timer_start: '开始', timer_pause: '暂停', timer_reset: '重置', timer_per_min: '/分', timer_wait: '计数1分钟后显示速度信息', timer_est: '预计剩余时间',
      },
      es: {
        tabs_list: 'Lista', tabs_counter: 'Contador', tabs_stats: 'Estadísticas',
        count: 'Contar', done: 'Completado', restart: 'Reiniciar', next: 'Siguiente',
        reset: 'Restablecer', reset_all: 'Restablecer todo',
        add: '+ Añadir Dhikr', export: 'Exportar', import_: 'Importar',
        no_items: 'No hay dhikrs añadidos',
        form_title_add: 'Nuevo Dhikr', form_title_edit: 'Editar Dhikr',
        label_name: 'Nombre', label_target: 'Objetivo', label_mode: 'Modo', label_color: 'Color',
        mode_asc: 'Ascendente', mode_desc: 'Descendente', mode_asc_full: 'Ascendente (0 → objetivo)', mode_desc_full: 'Descendente (objetivo → 0)',
        btn_save: 'Guardar', btn_cancel: 'Cancelar', btn_add: 'Añadir',
        stats_total: 'Total contado', stats_completed: 'Completado', stats_variety: 'Variedad',
        filter_today: 'Hoy', filter_yesterday: 'Ayer', filter_week: 'Semana', filter_month: 'Mes', filter_all: 'Todo',
        history: 'Historial', no_history: 'Sin registros', clear_history: 'Borrar historial', show_more: 'Mostrar más',
        piece: 'uds', placeholder_name: 'Nombre del dhikr',
        tooltip_edit: 'Editar', tooltip_reset: 'Restablecer', tooltip_delete: 'Eliminar', tooltip_drag: 'Arrastrar',         tooltip_sound: 'Sonido Sí/No', tooltip_donate: 'Donar', donate_copy: 'Copiar', donate_desc: 'Si deseas apoyarnos, puedes usar los métodos a continuación.', donate_crypto: 'Donación Cripto', donate_about: 'Contador de tesbih digital para VS Code', donate_author: 'Desarrollador', donate_email: 'Correo', donate_updated: 'Última actualización', donate_copied: '¡Copiado!',         load_defaults: 'Cargar dhikrs predeterminados', timer_label: 'Tiempo', timer_start: 'Iniciar', timer_pause: 'Pausar', timer_reset: 'Reiniciar', timer_per_min: '/m', timer_wait: 'Aparece info de velocidad tras 1 min de conteo', timer_est: 'Tiempo Restante Estimado',
      },
      ru: {
        tabs_list: 'Список', tabs_counter: 'Счётчик', tabs_stats: 'Статистика',
        count: 'Считать', done: 'Завершено', restart: 'Заново', next: 'Далее',
        reset: 'Сброс', reset_all: 'Сбросить все',
        add: '+ Добавить зикр', export: 'Экспорт', import_: 'Импорт',
        no_items: 'Зикры не добавлены',
        form_title_add: 'Новый зикр', form_title_edit: 'Редактировать зикр',
        label_name: 'Название', label_target: 'Цель', label_mode: 'Режим', label_color: 'Цвет',
        mode_asc: 'Возрастание', mode_desc: 'Убывание', mode_asc_full: 'Возрастание (0 → цель)', mode_desc_full: 'Убывание (цель → 0)',
        btn_save: 'Сохранить', btn_cancel: 'Отмена', btn_add: 'Добавить',
        stats_total: 'Всего', stats_completed: 'Завершено', stats_variety: 'Разновидности',
        filter_today: 'Сегодня', filter_yesterday: 'Вчера', filter_week: 'Неделя', filter_month: 'Месяц', filter_all: 'Все',
        history: 'История', no_history: 'Нет записей', clear_history: 'Очистить историю', show_more: 'Показать ещё',
        piece: 'шт', placeholder_name: 'Введите название зикра',
        tooltip_edit: 'Редактировать', tooltip_reset: 'Сброс', tooltip_delete: 'Удалить', tooltip_drag: 'Перетащить',         tooltip_sound: 'Звук Вкл/Выкл', tooltip_donate: 'Пожертвовать', donate_copy: 'Копировать', donate_desc: 'Если вы хотите поддержать нас, используйте методы ниже.', donate_crypto: 'Крипто-пожертвование', donate_about: 'Цифровой тасбих-счётчик для VS Code', donate_author: 'Разработчик', donate_email: 'Эл. почта', donate_updated: 'Последнее обновление', donate_copied: 'Скопировано!',         load_defaults: 'Загрузить стандартные зикры', timer_label: 'Время', timer_start: 'Старт', timer_pause: 'Пауза', timer_reset: 'Сброс', timer_per_min: '/мин', timer_wait: 'Информация о скорости появится через 1 минуту счёта', timer_est: 'Оставшееся Время',
      },
      ja: {
        tabs_list: 'リスト', tabs_counter: 'カウンター', tabs_stats: '統計',
        count: 'カウント', done: '完了', restart: 'リスタート', next: '次へ',
        reset: 'リセット', reset_all: '全リセット',
        add: '+ ズィクルを追加', export: 'エクスポート', import_: 'インポート',
        no_items: 'ズィクルがありません',
        form_title_add: 'ズィクル追加', form_title_edit: 'ズィクル編集',
        label_name: '名前', label_target: '目標', label_mode: 'モード', label_color: '色',
        mode_asc: '増加', mode_desc: '減少', mode_asc_full: '増加 (0 → 目標)', mode_desc_full: '減少 (目標 → 0)',
        btn_save: '保存', btn_cancel: 'キャンセル', btn_add: '追加',
        stats_total: '合計', stats_completed: '完了', stats_variety: '種類',
        filter_today: '今日', filter_yesterday: '昨日', filter_week: '今週', filter_month: '今月', filter_all: '全て',
        history: '履歴', no_history: '記録なし', clear_history: '履歴クリア', show_more: 'もっと見る',
        piece: '回', placeholder_name: 'ズィクル名を入力',
        tooltip_edit: '編集', tooltip_reset: 'リセット', tooltip_delete: '削除', tooltip_drag: 'ドラッグ',         tooltip_sound: 'サウンド ON/OFF', tooltip_donate: '寄付', donate_copy: 'コピー', donate_desc: 'サポートをご希望の場合は、以下の方法をご利用ください。', donate_crypto: '暗号通貨寄付', donate_about: 'VS Code用デジタルテスビーカウンター', donate_author: '開発者', donate_email: 'メール', donate_updated: '最終更新', donate_copied: 'コピーしました!',         load_defaults: 'デフォルトズィクルを読み込む', timer_label: '時間', timer_start: '開始', timer_pause: '一時停止', timer_reset: 'リセット', timer_per_min: '/分', timer_wait: '计数1分钟后显示速度信息', timer_est: '推定残り時間',
      },
      ko: {
        tabs_list: '목록', tabs_counter: '카운터', tabs_stats: '통계',
        count: '카운트', done: '완료', restart: '재시작', next: '다음',
        reset: '초기화', reset_all: '전체 초기화',
        add: '+ 지크르 추가', export: '내보내기', import_: '가져오기',
        no_items: '지크르가 없습니다',
        form_title_add: '지크르 추가', form_title_edit: '지크르 편집',
        label_name: '이름', label_target: '목표', label_mode: '모드', label_color: '색상',
        mode_asc: '증가', mode_desc: '감소', mode_asc_full: '증가 (0 → 목표)', mode_desc_full: '감소 (목표 → 0)',
        btn_save: '저장', btn_cancel: '취소', btn_add: '추가',
        stats_total: '총합', stats_completed: '완료', stats_variety: '종류',
        filter_today: '오늘', filter_yesterday: '어제', filter_week: '이번 주', filter_month: '이번 달', filter_all: '전체',
        history: '기록', no_history: '기록 없음', clear_history: '기록 삭제', show_more: '더 보기',
        piece: '개', placeholder_name: '지크르 이름 입력',
        tooltip_edit: '편집', tooltip_reset: '초기화', tooltip_delete: '삭제', tooltip_drag: '드래그',         tooltip_sound: '소리 켜기/끄기', tooltip_donate: '후원', donate_copy: '복사', donate_desc: '지원을 원하시면 아래 방법을 사용해 주세요.', donate_crypto: '암호화폐 기부', donate_about: 'VS Code용 디지털 테스비 카운터', donate_author: '개발자', donate_email: '이메일', donate_updated: '최근 업데이트', donate_copied: '복사됨!',         load_defaults: '기본 지크르 불러오기', timer_label: '시간', timer_start: '시작', timer_pause: '일시정지', timer_reset: '초기화', timer_per_min: '/분', timer_wait: '1분 카운트 후 속도 정보가 표시됩니다', timer_est: '예상 남은 시간',
      },
      pt: {
        tabs_list: 'Lista', tabs_counter: 'Contador', tabs_stats: 'Estatísticas',
        count: 'Contar', done: 'Concluído', restart: 'Reiniciar', next: 'Próximo',
        reset: 'Redefinir', reset_all: 'Redefinir tudo',
        add: '+ Adicionar Dhikr', export: 'Exportar', import_: 'Importar',
        no_items: 'Nenhum dhikr adicionado',
        form_title_add: 'Novo Dhikr', form_title_edit: 'Editar Dhikr',
        label_name: 'Nome', label_target: 'Objetivo', label_mode: 'Modo', label_color: 'Cor',
        mode_asc: 'Crescente', mode_desc: 'Decrescente', mode_asc_full: 'Crescente (0 → objetivo)', mode_desc_full: 'Decrescente (objetivo → 0)',
        btn_save: 'Salvar', btn_cancel: 'Cancelar', btn_add: 'Adicionar',
        stats_total: 'Total contado', stats_completed: 'Concluído', stats_variety: 'Variedade',
        filter_today: 'Hoje', filter_yesterday: 'Ontem', filter_week: 'Semana', filter_month: 'Mês', filter_all: 'Tudo',
        history: 'Histórico', no_history: 'Sem registros', clear_history: 'Limpar histórico', show_more: 'Mostrar mais',
        piece: 'un', placeholder_name: 'Nome do dhikr',
        tooltip_edit: 'Editar', tooltip_reset: 'Redefinir', tooltip_delete: 'Excluir', tooltip_drag: 'Arrastar',         tooltip_sound: 'Som Sim/Não', tooltip_donate: 'Doar', donate_copy: 'Copiar', donate_desc: 'Se deseja nos apoiar, pode usar os métodos abaixo.', donate_crypto: 'Doação Cripto', donate_about: 'Contador de tesbih digital para VS Code', donate_author: 'Desenvolvedor', donate_email: 'E-mail', donate_updated: 'Última atualização', donate_copied: 'Copiado!',         load_defaults: 'Carregar dhikrs padrão', timer_label: 'Tempo', timer_start: 'Iniciar', timer_pause: 'Pausar', timer_reset: 'Redefinir', timer_per_min: '/min', timer_wait: 'Info de velocidade após 1 min de contagem', timer_est: 'Tempo Restante Estimado',
      },
      it: {
        tabs_list: 'Elenco', tabs_counter: 'Contatore', tabs_stats: 'Statistiche',
        count: 'Conta', done: 'Completato', restart: 'Riavvia', next: 'Successivo',
        reset: 'Azzera', reset_all: 'Azzera tutto',
        add: '+ Aggiungi Dhikr', export: 'Esporta', import_: 'Importa',
        no_items: 'Nessun dhikr aggiunto',
        form_title_add: 'Nuovo Dhikr', form_title_edit: 'Modifica Dhikr',
        label_name: 'Nome', label_target: 'Obiettivo', label_mode: 'Modalità', label_color: 'Colore',
        mode_asc: 'Crescente', mode_desc: 'Decrescente', mode_asc_full: 'Crescente (0 → obiettivo)', mode_desc_full: 'Decrescente (obiettivo → 0)',
        btn_save: 'Salva', btn_cancel: 'Annulla', btn_add: 'Aggiungi',
        stats_total: 'Totale contato', stats_completed: 'Completato', stats_variety: 'Varietà',
        filter_today: 'Oggi', filter_yesterday: 'Ieri', filter_week: 'Settimana', filter_month: 'Mese', filter_all: 'Tutto',
        history: 'Cronologia', no_history: 'Nessun record', clear_history: 'Cancella cronologia', show_more: 'Mostra altro',
        piece: 'pz', placeholder_name: 'Nome del dhikr',
        tooltip_edit: 'Modifica', tooltip_reset: 'Azzera', tooltip_delete: 'Elimina', tooltip_drag: 'Trascina',         tooltip_sound: 'Audio Sì/No', tooltip_donate: 'Donazione', donate_copy: 'Copia', donate_desc: 'Se desideri supportarci, puoi utilizzare i metodi seguenti.', donate_crypto: 'Donazione Crypto', donate_about: 'Contatore tesbih digitale per VS Code', donate_author: 'Sviluppatore', donate_email: 'E-mail', donate_updated: 'Ultimo aggiornamento', donate_copied: 'Copiato!',         load_defaults: 'Carica dhikr predefiniti', timer_label: 'Tempo', timer_start: 'Avvia', timer_pause: 'Pausa', timer_reset: 'Azzera', timer_per_min: '/m', timer_wait: 'Info velocità visibile dopo 1 min di conteggio', timer_est: 'Tempo Rimanente Stimato',
      },
      hi: {
        tabs_list: 'सूची', tabs_counter: 'काउंटर', tabs_stats: 'आँकड़े',
        count: 'गिनें', done: 'पूर्ण', restart: 'पुनः आरंभ', next: 'अगला',
        reset: 'रीसेट', reset_all: 'सभी रीसेट',
        add: '+ ज़िक्र जोड़ें', export: 'निर्यात', import_: 'आयात',
        no_items: 'कोई ज़िक्र नहीं',
        form_title_add: 'नया ज़िक्र', form_title_edit: 'ज़िक्र संपादित करें',
        label_name: 'नाम', label_target: 'लक्ष्य', label_mode: 'मोड', label_color: 'रंग',
        mode_asc: 'बढ़ता', mode_desc: 'घटता', mode_asc_full: 'बढ़ता (0 → लक्ष्य)', mode_desc_full: 'घटता (लक्ष्य → 0)',
        btn_save: 'सहेजें', btn_cancel: 'रद्द करें', btn_add: 'जोड़ें',
        stats_total: 'कुल गिनती', stats_completed: 'पूर्ण', stats_variety: 'प्रकार',
        filter_today: 'आज', filter_yesterday: 'कल', filter_week: 'सप्ताह', filter_month: 'महीना', filter_all: 'सभी',
        history: 'इतिहास', no_history: 'कोई रिकॉर्ड नहीं', clear_history: 'इतिहास मिटाएं', show_more: 'और दिखाएं',
        piece: 'बार', placeholder_name: 'ज़िक्र का नाम दें',
        tooltip_edit: 'संपादित करें', tooltip_reset: 'रीसेट', tooltip_delete: 'हटाएं', tooltip_drag: 'खींचें',         tooltip_sound: 'ध्वनि चालू/बंद', tooltip_donate: 'दान', donate_copy: 'कॉपी', donate_desc: 'यदि आप हमें समर्थन देना चाहते हैं, तो नीचे दी गई विधियों का उपयोग करें।', donate_crypto: 'क्रिप्टो दान', donate_about: 'VS Code के लिए डिजिटल तसबीह काउंटर', donate_author: 'डेवलपर', donate_email: 'ईमेल', donate_updated: 'अंतिम अपडेट', donate_copied: 'कॉपी किया गया!',         load_defaults: 'डिफ़ॉल्ट ज़िक्र लोड करें', timer_label: 'समय', timer_start: 'शुरू', timer_pause: 'रोकें', timer_reset: 'रीसेट', timer_per_min: '/मि', timer_wait: '1 मिनट की गिनती के बाद गति जानकारी दिखाई देगी', timer_est: 'अनुमानित शेष समय',
      },
      id: {
        tabs_list: 'Daftar', tabs_counter: 'Penghitung', tabs_stats: 'Statistik',
        count: 'Hitung', done: 'Selesai', restart: 'Ulang', next: 'Berikutnya',
        reset: 'Reset', reset_all: 'Reset Semua',
        add: '+ Tambah Dzikir', export: 'Ekspor', import_: 'Impor',
        no_items: 'Belum ada dzikir',
        form_title_add: 'Dzikir Baru', form_title_edit: 'Edit Dzikir',
        label_name: 'Nama', label_target: 'Target', label_mode: 'Mode', label_color: 'Warna',
        mode_asc: 'Naik', mode_desc: 'Turun', mode_asc_full: 'Naik (0 → target)', mode_desc_full: 'Turun (target → 0)',
        btn_save: 'Simpan', btn_cancel: 'Batal', btn_add: 'Tambah',
        stats_total: 'Total dihitung', stats_completed: 'Selesai', stats_variety: 'Jenis',
        filter_today: 'Hari ini', filter_yesterday: 'Kemarin', filter_week: 'Minggu', filter_month: 'Bulan', filter_all: 'Semua',
        history: 'Riwayat', no_history: 'Belum ada catatan', clear_history: 'Hapus riwayat', show_more: 'Tampilkan lagi',
        piece: 'kali', placeholder_name: 'Nama dzikir',
        tooltip_edit: 'Edit', tooltip_reset: 'Reset', tooltip_delete: 'Hapus', tooltip_drag: 'Seret', tooltip_sound: 'Suara Nyala/Mati', tooltip_donate: 'Donasi', donate_copy: 'Salin', donate_desc: 'Jika Anda ingin mendukung, gunakan metode di bawah ini.', donate_crypto: 'Donasi Kripto', donate_about: 'Penghitung tesbih digital untuk VS Code', donate_author: 'Pengembang', donate_email: 'Email', donate_updated: 'Pembaruan Terakhir', donate_copied: 'Disalin!',         load_defaults: 'Muat dzikir bawaan', timer_label: 'Waktu', timer_start: 'Mulai', timer_pause: 'Jeda', timer_reset: 'Reset', timer_per_min: '/min', timer_wait: 'Info velocità visibile dopo 1 min di conteggio', timer_est: 'Estimasi Waktu Tersisa',
      },
      ur: {
        tabs_list: 'فہرست', tabs_counter: 'گنتی', tabs_stats: 'اعدادوشمار',
        count: 'تسبیح', done: 'مکمل', restart: 'دوبارہ شروع', next: 'اگلا',
        reset: 'ری سیٹ', reset_all: 'سب ری سیٹ',
        add: '+ ذکر شامل کریں', export: 'برآمد', import_: 'درآمد',
        no_items: 'کوئی ذکر شامل نہیں',
        form_title_add: 'نیا ذکر', form_title_edit: 'ذکر میں ترمیم',
        label_name: 'نام', label_target: 'ہدف', label_mode: 'موڈ', label_color: 'رنگ',
        mode_asc: 'بڑھتا', mode_desc: 'گھٹتا', mode_asc_full: 'بڑھتا (0 → ہدف)', mode_desc_full: 'گھٹتا (ہدف → 0)',
        btn_save: 'محفوظ کریں', btn_cancel: 'منسوخ', btn_add: 'شامل کریں',
        stats_total: 'کل گنتی', stats_completed: 'مکمل', stats_variety: 'اقسام',
        filter_today: 'آج', filter_yesterday: 'کل', filter_week: 'ہفتہ', filter_month: 'ماہ', filter_all: 'سب',
        history: 'تاریخ', no_history: 'کوئی ریکارڈ نہیں', clear_history: 'تاریخ صاف کریں', show_more: 'مزید دکھائیں',
        piece: 'بار', placeholder_name: 'ذکر کا نام',
        tooltip_edit: 'ترمیم', tooltip_reset: 'ری سیٹ', tooltip_delete: 'حذف', tooltip_drag: 'گھسیٹیں',         tooltip_sound: 'آواز آن/آف', tooltip_donate: 'عطیہ', donate_copy: 'کاپی', donate_desc: 'اگر آپ سپورٹ کرنا چاہتے ہیں، تو نیچے دیے گئے طریقے استعمال کریں۔', donate_crypto: 'کرپٹو عطیہ', donate_about: 'VS Code کے لیے ڈیجیٹل تسبیح کاؤنٹر', donate_author: 'ڈویلپر', donate_email: 'ای میل', donate_updated: 'آخری اپ ڈیٹ', donate_copied: 'کاپی ہو گیا!',         load_defaults: 'پہلے سے طے شدہ اذکار لوڈ کریں', timer_label: 'وقت', timer_start: 'شروع', timer_pause: 'روکیں', timer_reset: 'ری سیٹ', timer_per_min: '/min', timer_wait: 'Info kecepatan muncul setelah 1 menit menghitung', timer_est: 'تخمینی باقی وقت',
      },
      ms: {
        tabs_list: 'Senarai', tabs_counter: 'Pengira', tabs_stats: 'Statistik',
        count: 'Kira', done: 'Selesai', restart: 'Mula semula', next: 'Seterusnya',
        reset: 'Set semula', reset_all: 'Set semula semua',
        add: '+ Tambah Zikir', export: 'Eksport', import_: 'Import',
        no_items: 'Tiada zikir ditambah',
        form_title_add: 'Zikir Baharu', form_title_edit: 'Edit Zikir',
        label_name: 'Nama', label_target: 'Sasaran', label_mode: 'Mod', label_color: 'Warna',
        mode_asc: 'Menaik', mode_desc: 'Menurun', mode_asc_full: 'Menaik (0 → sasaran)', mode_desc_full: 'Menurun (sasaran → 0)',
        btn_save: 'Simpan', btn_cancel: 'Batal', btn_add: 'Tambah',
        stats_total: 'Jumlah dikira', stats_completed: 'Selesai', stats_variety: 'Jenis',
        filter_today: 'Hari ini', filter_yesterday: 'Semalam', filter_week: 'Minggu', filter_month: 'Bulan', filter_all: 'Semua',
        history: 'Sejarah', no_history: 'Tiada rekod', clear_history: 'Padam sejarah', show_more: 'Tunjukkan lagi',
        piece: 'kali', placeholder_name: 'Nama zikir',
        tooltip_edit: 'Edit', tooltip_reset: 'Set semula', tooltip_delete: 'Padam', tooltip_drag: 'Seret', tooltip_sound: 'Suara Nyala/Mati', tooltip_donate: 'Donasi', donate_copy: 'Salin', donate_desc: 'Jika Anda ingin mendukung, gunakan metode di bawah ini.', donate_crypto: 'Donasi Kripto', donate_about: 'Penghitung tesbih digital untuk VS Code', donate_author: 'Pemaju', donate_email: 'E-mel', donate_updated: 'Kemas Kini Terakhir', donate_copied: 'Disalin!',         load_defaults: 'Muat zikir lalai', timer_label: 'Masa', timer_start: 'Mula', timer_pause: 'Jeda', timer_reset: 'Set semula', timer_per_min: '/min', timer_wait: '1 منٹ گنتی کے بعد رفتار کی معلومات ظاہر ہوں گی', timer_est: 'Anggaran Masa Berbaki',
      },
      bn: {
        tabs_list: 'তালিকা', tabs_counter: 'কাউন্টার', tabs_stats: 'পরিসংখ্যান',
        count: 'গণনা', done: 'সম্পন্ন', restart: 'পুনরায় শুরু', next: 'পরবর্তী',
        reset: 'রিসেট', reset_all: 'সব রিসেট',
        add: '+ যিকির যোগ করুন', export: 'রপ্তানি', import_: 'আমদানি',
        no_items: 'কোনো যিকির নেই',
        form_title_add: 'নতুন যিকির', form_title_edit: 'যিকির সম্পাদনা',
        label_name: 'নাম', label_target: 'লক্ষ্য', label_mode: 'মোড', label_color: 'রঙ',
        mode_asc: 'বর্ধমান', mode_desc: 'হ্রাসমান', mode_asc_full: 'বর্ধমান (0 → লক্ষ্য)', mode_desc_full: 'হ্রাসমান (লক্ষ্য → 0)',
        btn_save: 'সংরক্ষণ', btn_cancel: 'বাতিল', btn_add: 'যোগ করুন',
        stats_total: 'মোট গণনা', stats_completed: 'সম্পন্ন', stats_variety: 'প্রকারভেদ',
        filter_today: 'আজ', filter_yesterday: 'গতকাল', filter_week: 'সপ্তাহ', filter_month: 'মাস', filter_all: 'সব',
        history: 'ইতিহাস', no_history: 'কোনো রেকর্ড নেই', clear_history: 'ইতিহাস মুছুন', show_more: 'আরও দেখুন',
        piece: 'বার', placeholder_name: 'যিকিরের নাম',
        tooltip_edit: 'সম্পাদনা', tooltip_reset: 'রিসেট', tooltip_delete: 'মুছুন', tooltip_drag: 'টানুন',         tooltip_sound: 'শব্দ চালু/বন্ধ', tooltip_donate: 'অনুদান', donate_copy: 'কপি', donate_desc: 'আপনি সমর্থন করতে চাইলে নিচের পদ্ধতিগুলো ব্যবহার করতে পারেন।', donate_crypto: 'ক্রিপ্টো অনুদান', donate_about: 'VS Code এর জন্য ডিজিটাল তাসবিহ কাউন্টার', donate_author: 'ডেভেলপার', donate_email: 'ইমেইল', donate_updated: 'সর্বশেষ আপডেট', donate_copied: 'কপি হয়েছে!',         load_defaults: 'ডিফল্ট যিকির লোড করুন', timer_label: 'সময়', timer_start: 'শুরু', timer_pause: 'বিরতি', timer_reset: 'রিসেট', timer_per_min: '/মি', timer_wait: '১ মিনিট গণনার পর গতি তথ্য দেখা যাবে', timer_est: 'আনুমানিক অবশিষ্ট সময়',
      },
      fa: {
        tabs_list: 'فهرست', tabs_counter: 'شمارنده', tabs_stats: 'آمار',
        count: 'شمارش', done: 'تکمیل', restart: 'شروع مجدد', next: 'بعدی',
        reset: 'بازنشانی', reset_all: 'بازنشانی همه',
        add: '+ افزودن ذکر', export: 'صادرات', import_: 'واردات',
        no_items: 'ذکری اضافه نشده',
        form_title_add: 'ذکر جدید', form_title_edit: 'ویرایش ذکر',
        label_name: 'نام', label_target: 'هدف', label_mode: 'حالت', label_color: 'رنگ',
        mode_asc: 'صعودی', mode_desc: 'نزولی', mode_asc_full: 'صعودی (0 → هدف)', mode_desc_full: 'نزولی (هدف → 0)',
        btn_save: 'ذخیره', btn_cancel: 'لغو', btn_add: 'افزودن',
        stats_total: 'مجموع شمارش', stats_completed: 'تکمیل شده', stats_variety: 'تنوع',
        filter_today: 'امروز', filter_yesterday: 'دیروز', filter_week: 'هفته', filter_month: 'ماه', filter_all: 'همه',
        history: 'تاریخچه', no_history: 'بدون سابقه', clear_history: 'پاک کردن تاریخچه', show_more: 'بیشتر نشان بده',
        piece: 'عدد', placeholder_name: 'نام ذکر',
        tooltip_edit: 'ویرایش', tooltip_reset: 'بازنشانی', tooltip_delete: 'حذف', tooltip_drag: 'کشیدن',         tooltip_sound: 'صدا روشن/خاموش', tooltip_donate: 'کمک مالی', donate_copy: 'کپی', donate_desc: 'اگر می‌خواهید حمایت کنید، از روش‌های زیر استفاده کنید.', donate_crypto: 'اهدا رمزارز', donate_about: 'شمارنده دیجیتال تسبیح برای VS Code', donate_author: 'توسعه‌دهنده', donate_email: 'ایمیل', donate_updated: 'آخرین به‌روزرسانی', donate_copied: 'کپی شد!',         load_defaults: 'بارگذاری اذکار پیش‌فرض', timer_label: 'زمان', timer_start: 'شروع', timer_pause: 'مکث', timer_reset: 'بازنشانی', timer_per_min: '/د', timer_wait: 'يظهر معدل السرعة بعد دقيقة واحدة من العد', timer_est: 'زمان باقیمانده تخمینی',
      },
      uk: {
        tabs_list: 'Список', tabs_counter: 'Лічильник', tabs_stats: 'Статистика',
        count: 'Рахувати', done: 'Завершено', restart: 'Спочатку', next: 'Далі',
        reset: 'Скинути', reset_all: 'Скинути все',
        add: '+ Додати зікр', export: 'Експорт', import_: 'Імпорт',
        no_items: 'Зікра немає',
        form_title_add: 'Новий зікр', form_title_edit: 'Редагувати зікр',
        label_name: 'Назва', label_target: 'Ціль', label_mode: 'Режим', label_color: 'Колір',
        mode_asc: 'Зростання', mode_desc: 'Спадання', mode_asc_full: 'Зростання (0 → ціль)', mode_desc_full: 'Спадання (ціль → 0)',
        btn_save: 'Зберегти', btn_cancel: 'Скасувати', btn_add: 'Додати',
        stats_total: 'Всього', stats_completed: 'Завершено', stats_variety: 'Різновиди',
        filter_today: 'Сьогодні', filter_yesterday: 'Вчора', filter_week: 'Тиждень', filter_month: 'Місяць', filter_all: 'Все',
        history: 'Історія', no_history: 'Немає записів', clear_history: 'Очистити історію', show_more: 'Показати ще',
        piece: 'шт', placeholder_name: 'Введіть назву зікра',
        tooltip_edit: 'Редагувати', tooltip_reset: 'Скинути', tooltip_delete: 'Видалити', tooltip_drag: 'Перетягнути',         tooltip_sound: 'Звук Увімк/Вимк', tooltip_donate: 'Пожертва', donate_copy: 'Копіювати', donate_desc: 'Якщо ви хочете підтримати нас, використовуйте методи нижче.', donate_crypto: 'Крипто-пожертва', donate_about: 'Цифровий лічильник тасбіху для VS Code', donate_author: 'Розробник', donate_email: 'Ел. пошта', donate_updated: 'Останнє оновлення', donate_copied: 'Скопійовано!',         load_defaults: 'Завантажити стандартні зікри', timer_label: 'Час', timer_start: 'Старт', timer_pause: 'Пауза', timer_reset: 'Скинути', timer_per_min: '/хв', timer_wait: 'Інфо про швидкість з\\\'явиться через 1 хвилину рахунку', timer_est: 'Оцінка Залишку Часу',
      },
      pl: {
        tabs_list: 'Lista', tabs_counter: 'Licznik', tabs_stats: 'Statystyki',
        count: 'Policz', done: 'Ukończono', restart: 'Restart', next: 'Następny',
        reset: 'Resetuj', reset_all: 'Resetuj wszystko',
        add: '+ Dodaj Dhikr', export: 'Eksportuj', import_: 'Importuj',
        no_items: 'Brak dhikrów',
        form_title_add: 'Nowy Dhikr', form_title_edit: 'Edytuj Dhikr',
        label_name: 'Nazwa', label_target: 'Cel', label_mode: 'Tryb', label_color: 'Kolor',
        mode_asc: 'Rosnący', mode_desc: 'Malejący', mode_asc_full: 'Rosnący (0 → cel)', mode_desc_full: 'Malejący (cel → 0)',
        btn_save: 'Zapisz', btn_cancel: 'Anuluj', btn_add: 'Dodaj',
        stats_total: 'Łącznie policzono', stats_completed: 'Ukończono', stats_variety: 'Różnorodność',
        filter_today: 'Dzisiaj', filter_yesterday: 'Wczoraj', filter_week: 'Tydzień', filter_month: 'Miesiąc', filter_all: 'Wszystko',
        history: 'Historia', no_history: 'Brak rekordów', clear_history: 'Wyczyść historię', show_more: 'Pokaż więcej',
        piece: 'szt', placeholder_name: 'Nazwa dhikru',
        tooltip_edit: 'Edytuj', tooltip_reset: 'Resetuj', tooltip_delete: 'Usuń', tooltip_drag: 'Przeciągnij',         tooltip_sound: 'Dźwięk Wł/Wył', tooltip_donate: 'Darowizna', donate_copy: 'Kopiuj', donate_desc: 'Jeśli chcesz nas wesprzeć, użyj poniższych metod.', donate_crypto: 'Darowizna Krypto', donate_about: 'Cyfrowy licznik tesbih dla VS Code', donate_author: 'Twórca', donate_email: 'E-mail', donate_updated: 'Ostatnia aktualizacja', donate_copied: 'Skopiowano!',         load_defaults: 'Załaduj domyślne dhikry', timer_label: 'Czas', timer_start: 'Start', timer_pause: 'Pauza', timer_reset: 'Resetuj', timer_per_min: '/m', timer_wait: 'Info o prędkości pojawi się po 1 min liczenia', timer_est: 'Szacowany Pozostały Czas',
      },
    };

    function t(key) { return (I18N[lang] && I18N[lang][key]) || I18N.tr[key] || key; }

    const app = document.getElementById('app');

    const CIRCUMFERENCE = 2 * Math.PI * 70;

    const COLOR_MAP = {
      green:  { hex: '#66bb6a', emoji: '🟢' },
      red:    { hex: '#ef5350', emoji: '🔴' },
      blue:   { hex: '#42a5f5', emoji: '🔵' },
      yellow: { hex: '#ffca28', emoji: '🟡' },
      orange: { hex: '#ffa726', emoji: '🟠' },
      purple: { hex: '#ab47bc', emoji: '🟣' },
      brown:  { hex: '#8d6e63', emoji: '🟤' },
      gray:   { hex: '#bdbdbd', emoji: '⚪' },
      cyan:   { hex: '#4fc3f7', emoji: '🩵' },
      pink:   { hex: '#f06292', emoji: '🩷' },
    };
    const COLOR_KEYS = Object.keys(COLOR_MAP);

    function getColor(c) {
      return COLOR_MAP[c] || COLOR_MAP.green;
    }

    let localCurrent = null;
    let syncPending = 0;
    let syncTimer = null;

    function syncToBackend() {
      syncTimer = null;
      if (syncPending > 0) {
        vscodeApi.postMessage({ type: 'increment', data: { count: syncPending } });
        syncPending = 0;
      }
    }

    function getDisplayCurrent(item) {
      if (localCurrent !== null) return localCurrent;
      return item.current;
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'state') {
        state = msg.data;
        const active = state.items.find(i => i.id === state.activeId);
        if (currentView === 'counter' && active && doneItems.has(active.id)) {
          // keep done UI, don't re-render
        } else if (currentView !== 'counter' || localCurrent === null) {
          if (localCurrent !== null) localCurrent = null;
          render();
        }
      }
      if (msg.type === 'history') {
        history = msg.data;
        if (currentView !== 'counter') {
          render();
        }
      }
      if (msg.type === 'lang') {
        lang = msg.data || 'tr';
        render();
      }
      if (msg.type === 'sound') {
        soundEnabled = msg.data !== false;
        render();
      }
    });

    document.addEventListener('click', (e) => {
      const langPick = e.target.closest('[data-cmd="setLang"]');
      if (langPick) {
        e.stopPropagation();
        lang = langPick.getAttribute('data-val') || 'tr';
        openLangMenu = false;
        vscodeApi.postMessage({ type: 'setLang', data: { lang } });
        render();
        return;
      }

      const langBtn = e.target.closest('[data-cmd="toggleLang"]');
      if (langBtn) {
        e.stopPropagation();
        openLangMenu = !openLangMenu;
        render();
        return;
      }

      const soundBtn = e.target.closest('[data-cmd="toggleSound"]');
      if (soundBtn) {
        e.stopPropagation();
        vscodeApi.postMessage({ type: 'toggleSound' });
        return;
      }

      if (openLangMenu) {
        openLangMenu = false;
        render();
        return;
      }

      if (showDonatePopup) {
        showDonatePopup = false;
        render();
        return;
      }

      const donateBtn = e.target.closest('[data-cmd="showDonate"]');
      if (donateBtn) {
        e.stopPropagation();
        showDonatePopup = true;
        render();
        return;
      }

      const closeDonate = e.target.closest('[data-cmd="closeDonate"]');
      if (closeDonate) {
        e.stopPropagation();
        showDonatePopup = false;
        render();
        return;
      }

      const copyBtn = e.target.closest('[data-cmd="copyAddress"]');
      if (copyBtn) {
        e.stopPropagation();
        navigator.clipboard.writeText('TDyUnmDZrRbgydCpYepVLLvrbitS8mZyJc');
        showNotify(t('donate_copied'));
        return;
      }

      const colorBtn = e.target.closest('[data-cmd="openColorPicker"]');
      if (colorBtn) {
        e.stopPropagation();
        const id = colorBtn.getAttribute('data-id');
        openColorPicker = openColorPicker === id ? null : id;
        render();
        return;
      }

      const colorPick = e.target.closest('[data-cmd="pickColor"]');
      if (colorPick) {
        e.stopPropagation();
        const id = colorPick.getAttribute('data-id');
        const idx = parseInt(colorPick.getAttribute('data-idx'));
        const colorKey = COLOR_KEYS[idx];
        vscodeApi.postMessage({ type: 'updateItem', data: { id, color: colorKey } });
        openColorPicker = null;
        return;
      }

      if (openColorPicker !== null) {
        openColorPicker = null;
        render();
        return;
      }

      const el = e.target.closest('[data-cmd]');
      if (!el) return;
      const cmd = el.getAttribute('data-cmd');
      const val = el.getAttribute('data-val');

      if (cmd === 'openColorPicker' || cmd === 'pickColor' || cmd === 'toggleCheck') {
        e.stopPropagation();
      }

      switch (cmd) {
        case 'increment': {
          const incItem = getActive();
          if (!incItem) break;
          if (localCurrent === null) {
            localCurrent = incItem.current;
          }
          if (!countingStates[incItem.id]) {
            countingStates[incItem.id] = { startedAt: Date.now(), base: incItem.current };
          }
          const alreadyDone = doneItems.has(incItem.id) || (incItem.mode === 'ascending' ? localCurrent >= incItem.target : localCurrent <= 0);
          if (alreadyDone) break;
          if (soundEnabled) playClick();
          localCurrent = incItem.mode === 'ascending' ? localCurrent + 1 : localCurrent - 1;
          syncPending++;
          updateCounterDisplay();
          updateTimerInfo();
          if (!syncTimer) {
            syncTimer = setTimeout(syncToBackend, 150);
          }
          const isNowDone = incItem.mode === 'ascending' ? localCurrent >= incItem.target : localCurrent <= 0;
          if (isNowDone) {
            pauseTimer();
            doneItems.add(incItem.id);
            incItem.current = localCurrent;
            localCurrent = null;
            if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
            if (syncPending > 0) {
              vscodeApi.postMessage({ type: 'increment', data: { count: syncPending } });
              syncPending = 0;
            }
            render();
          }
          break;
        }
        case 'nav': {
          if (state && state.items.length > 1) {
            const oldItem = getActive();
            if (oldItem) {
              if (localCurrent !== null) {
                oldItem.current = localCurrent;
                localCurrent = null;
                if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
                if (syncPending > 0) {
                  vscodeApi.postMessage({ type: 'increment', data: { count: syncPending } });
                  syncPending = 0;
                }
              }
              pauseTimer(oldItem.id);
            }
            const idx = state.items.findIndex(i => i.id === state.activeId);
            const next = (idx + parseInt(val) + state.items.length) % state.items.length;
            state.activeId = state.items[next].id;
            render();
            vscodeApi.postMessage({ type: 'setActive', data: { id: state.items[next].id } });
          }
          break;
        }
        case 'resetAll':
          vscodeApi.postMessage({ type: 'resetAll' });
          break;
        case 'resetCounter':
          localCurrent = null;
          if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
          if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
          syncPending = 0;
          { const ri = getActive(); if (ri) { delete countingStates[ri.id]; delete timerStates[ri.id]; celebratedItems.delete(ri.id); doneItems.delete(ri.id); } }
          vscodeApi.postMessage({ type: 'resetItem' });
          break;
        case 'timerToggle':
          if (getTimerState().running) { pauseTimer(); } else { startTimer(); }
          render();
          break;
        case 'timerReset':
          resetTimer();
          render();
          break;
        case 'delete':
          vscodeApi.postMessage({ type: 'deleteItem', data: { id: state.activeId } });
          break;
        case 'showAdd':
          showAddForm = !showAddForm;
          if (showAddForm) {
            editItemId = null;
            addNameValue = '';
            addTargetValue = '33';
          }
          render();
          if (showAddForm) setTimeout(() => document.getElementById('addName')?.focus(), 50);
          break;
        case 'cancelAdd':
          showAddForm = false;
          addMode = 'ascending';
          addNameValue = '';
          addTargetValue = '33';
          render();
          break;
        case 'setAddMode': {
          const anEl = document.getElementById('addName');
          const atEl = document.getElementById('addTarget');
          if (anEl) addNameValue = anEl.value;
          if (atEl) addTargetValue = atEl.value;
          addMode = val;
          render();
          break;
        }
        case 'setEditMode': {
          const enEl = document.getElementById('editName');
          const etEl = document.getElementById('editTarget');
          if (enEl) editNameValue = enEl.value;
          if (etEl) editTargetValue = etEl.value;
          editMode = val;
          render();
          break;
        }
        case 'doAdd': {
          const addNameEl = document.getElementById('addName');
          const addTargetEl = document.getElementById('addTarget');
          const name = (addNameEl?.value || '').trim();
          const targetVal = addTargetEl?.value || '';
          if (!name) { addNameEl?.focus(); break; }
          if (!targetVal || parseInt(targetVal) < 1) { addTargetEl?.focus(); break; }
          const target = parseInt(targetVal);
          const mode = addMode;
          const colorIdx = parseInt(document.querySelector('.item-form-colors-pick.selected')?.getAttribute('data-idx') || '0');
          const color = COLOR_KEYS[colorIdx] || 'green';
          showAddForm = false;
          addNameValue = '';
          addTargetValue = '33';
          vscodeApi.postMessage({ type: 'addItem', data: { name, target, mode, color } });
          break;
        }
        case 'pickAddColor':
          document.querySelectorAll('.add-color-pick').forEach(b => b.classList.remove('selected'));
          e.target.closest('.add-color-pick')?.classList.add('selected');
          break;
        case 'toggleCheck':
          vscodeApi.postMessage({ type: 'toggleChecked', data: { id: val } });
          break;
        case 'restartAndReset':
          localCurrent = null;
          if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
          if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
          syncPending = 0;
          { const ri = getActive(); if (ri) { delete countingStates[ri.id]; delete timerStates[ri.id]; celebratedItems.delete(ri.id); doneItems.delete(ri.id); } }
          vscodeApi.postMessage({ type: 'restartItem' });
          break;
        case 'goNext':
          if (state && state.items.length > 1) {
            const nxtItem = getActive();
            if (nxtItem && localCurrent !== null) {
              nxtItem.current = localCurrent;
            }
            localCurrent = null;
            if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
            if (syncPending > 0) {
              vscodeApi.postMessage({ type: 'increment', data: { count: syncPending } });
              syncPending = 0;
            }
            const idx = state.items.findIndex(i => i.id === state.activeId);
            const next = (idx + 1) % state.items.length;
            state.activeId = state.items[next].id;
            render();
            vscodeApi.postMessage({ type: 'setActive', data: { id: state.items[next].id } });
          }
          break;
        case 'switchView': {
          if (localCurrent !== null) {
            const it = getActive();
            if (it) it.current = localCurrent;
            localCurrent = null;
            if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
            if (syncPending > 0) {
              vscodeApi.postMessage({ type: 'increment', data: { count: syncPending } });
              syncPending = 0;
            }
          }
          currentView = val;
          if (val === 'stats') {
            vscodeApi.postMessage({ type: 'getHistory' });
          }
          render();
          break;
        }
        case 'setFilter':
          statsFilter = val;
          statsLimit = 100;
          render();
          break;
        case 'showMore':
          statsLimit += 100;
          render();
          break;
        case 'clearHistory':
          vscodeApi.postMessage({ type: 'clearHistory' });
          break;
        case 'selectItem': {
          if (localCurrent !== null) {
            const oldItem = getActive();
            if (oldItem) {
              oldItem.current = localCurrent;
              pauseTimer(oldItem.id);
            }
          }
          localCurrent = null;
          state.activeId = val;
          currentView = 'counter';
          render();
          vscodeApi.postMessage({ type: 'setActive', data: { id: val } });
          break;
        }
        case 'editItem': {
          const targetId = el.getAttribute('data-id');
          editItemId = editItemId === targetId ? null : targetId;
          if (editItemId) {
            showAddForm = false;
            const target = state.items.find(i => i.id === editItemId);
            if (target) editMode = target.mode;
            editNameValue = target ? target.name : '';
            editTargetValue = target ? String(target.target) : '33';
          }
          render();
          if (editItemId) setTimeout(() => document.getElementById('editName')?.focus(), 50);
          break;
        }
        case 'cancelEdit':
          editItemId = null;
          editNameValue = '';
          editTargetValue = '';
          render();
          break;
        case 'saveEdit': {
          const editId = el.getAttribute('data-id');
          const editNameEl = document.getElementById('editName');
          const editTargetEl = document.getElementById('editTarget');
          if (editNameEl && editTargetEl) {
            const name = editNameEl.value.trim();
            if (!name) { editNameEl.focus(); break; }
            const targetVal = editTargetEl.value;
            if (!targetVal || parseInt(targetVal) < 1) { editTargetEl.focus(); break; }
            const target = parseInt(targetVal);
            const mode = editMode;
            vscodeApi.postMessage({ type: 'updateItem', data: { id: editId, name, target, mode } });
          }
          editItemId = null;
          editNameValue = '';
          editTargetValue = '';
          render();
          break;
        }
        case 'deleteFromList': {
          const delId = el.getAttribute('data-id');
          vscodeApi.postMessage({ type: 'deleteItem', data: { id: delId } });
          break;
        }
        case 'resetItemFromList': {
          const rstId = el.getAttribute('data-id');
          vscodeApi.postMessage({ type: 'resetItemById', data: { id: rstId } });
          break;
        }
        case 'exportData':
          vscodeApi.postMessage({ type: 'exportData' });
          break;
        case 'importData':
          vscodeApi.postMessage({ type: 'importData' });
          break;
        case 'loadDefaults':
          vscodeApi.postMessage({ type: 'loadDefaults' });
          break;
      }
    });

    vscodeApi.postMessage({ type: 'getState' });

    function getActive() {
      if (!state || !state.items) return null;
      return state.items.find(i => i.id === state.activeId) || null;
    }

    function formatDate(ts) {
      const d = new Date(ts);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return day + '.' + month + '.' + year;
    }

    function formatTime(ts) {
      const d = new Date(ts);
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function isToday(ts) {
      const d = new Date(ts);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    function isThisWeek(ts) {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return ts >= weekStart.getTime();
    }

    function isThisMonth(ts) {
      const d = new Date(ts);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    function isYesterday(ts) {
      const d = new Date(ts);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
    }

    function getFilteredHistory() {
      if (!history) return [];
      switch (statsFilter) {
        case 'today': return history.filter(e => isToday(e.completedAt));
        case 'yesterday': return history.filter(e => isYesterday(e.completedAt));
        case 'week': return history.filter(e => isThisWeek(e.completedAt));
        case 'month': return history.filter(e => isThisMonth(e.completedAt));
        default: return history;
      }
    }

    function getAddFormHtml() {
      const colorBtns = COLOR_KEYS.map((k, i) => \`
        <button class="item-form-colors-pick \${i === 0 ? 'selected' : ''}" data-idx="\${i}" data-cmd="pickAddColor">\${COLOR_MAP[k].emoji}</button>
      \`).join('');
      return \`
        <div class="item-form">
          <div class="item-form-title">\${t('form_title_add')}<button class="item-form-close" data-cmd="cancelAdd" title="\${t('btn_cancel')}">✕</button></div>
          <div>
            <label>\${t('label_name')}</label>
            <input id="addName" type="text" value="\${addNameValue}" placeholder="\${t('placeholder_name')}" />
           </div>
           <div>
             <label>\${t('label_target')}</label>
            <input id="addTarget" type="number" value="\${addTargetValue}" min="1" />
          </div>
          <div class="item-form-actions">
            <div class="mode-toggle" id="addMode">
              <button class="\${addMode === 'ascending' ? 'active' : ''}" data-cmd="setAddMode" data-val="ascending">↑ \${t('mode_asc')}</button>
              <button class="\${addMode === 'descending' ? 'active' : ''}" data-cmd="setAddMode" data-val="descending">↓ \${t('mode_desc')}</button>
            </div>
            <button class="btn-primary" data-cmd="doAdd">✓ \${t('btn_add')}</button>
          </div>
          <div>
            <label>\${t('label_color')}</label>
            <div class="item-form-colors">\${colorBtns}</div>
          </div>
        </div>
      \`;
    }

    function buildTabsHtml() {
      const langFlag = LANGS[lang] ? flagImg(LANGS[lang].cc, 18) : flagImg('tr', 18);
      let langDrop = '';
      if (openLangMenu) {
        const btns = Object.keys(LANGS).map(k => \`<button class="\${k === lang ? 'active' : ''}" data-cmd="setLang" data-val="\${k}">\${flagImg(LANGS[k].cc, 18)} \${LANGS[k].name}</button>\`).join('');
        langDrop = '<div class="lang-dropdown">' + btns + '</div>';
      }
      return \`
        <div class="tabs-wrap">
          <div class="tabs">
            <button class="\${currentView === 'list' ? 'active' : ''}" data-cmd="switchView" data-val="list" title="\${t('tabs_list')}">☰</button>
            <button class="\${currentView === 'counter' ? 'active' : ''}" data-cmd="switchView" data-val="counter" title="\${t('tabs_counter')}">◎</button>
            <button class="\${currentView === 'stats' ? 'active' : ''}" data-cmd="switchView" data-val="stats" title="\${t('tabs_stats')}">▦</button>
          </div>
          <div class="tabs-right">
            <div class="sound-btn" data-cmd="toggleSound" title="\${t('tooltip_sound')}">\${soundEnabled ? '🔊' : '🔇'}</div>
            <div class="sound-btn" data-cmd="showDonate" title="\${t('tooltip_donate')}">❤️</div>
            <div class="lang-btn" data-cmd="toggleLang">\${langFlag} <span class="lang-arrow">▾</span>\${langDrop}</div>
          </div>
        </div>
      \`;
    }

    function updateCounterDisplay() {
      if (!state) return;
      const item = getActive();
      if (!item) return;
      const displayCurrent = getDisplayCurrent(item);
      const clampedDisplay = Math.max(0, Math.min(displayCurrent, item.target));
      const itemColor = getColor(item.color).hex;
      const progress = item.mode === 'ascending'
        ? clampedDisplay / item.target
        : (item.target - clampedDisplay) / item.target;
      const offset = CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 1));

      const countEl = document.querySelector('.ring-text .count');
      const ringFill = document.querySelector('.ring-fill');
      if (countEl) countEl.textContent = clampedDisplay;
      if (ringFill) {
        ringFill.setAttribute('stroke', itemColor);
        ringFill.setAttribute('stroke-dashoffset', String(offset));
      }
    }

    function render() {
      if (!state) {
        app.innerHTML = '<div class="loading-screen"><div class="loading-spinner"></div></div>';
        return;
      }
      const tabsHtml = buildTabsHtml();

      if (currentView === 'list') {
        renderList(tabsHtml);
        const donateEl = document.getElementById('donateArea');
        if (donateEl) donateEl.innerHTML = renderDonatePopup();
        return;
      }

      if (currentView === 'stats') {
        renderStats(tabsHtml);
        const donateEl = document.getElementById('donateArea');
        if (donateEl) donateEl.innerHTML = renderDonatePopup();
        return;
      }

      const item = getActive();

      if (!item) {
        app.innerHTML = tabsHtml + \`
          <div class="no-items">\${t('no_items')}</div>
          <div class="top-actions">
            <button data-cmd="showAdd">\${showAddForm ? t('btn_cancel') : t('add')}</button>
          </div>
          \${showAddForm ? getAddFormHtml() : ''}
          <button class="load-defaults-link" data-cmd="loadDefaults">\${t('load_defaults')}</button>
        \`;
        const donateEl = document.getElementById('donateArea');
        if (donateEl) donateEl.innerHTML = renderDonatePopup();
        return;
      }

      const itemColor = getColor(item.color).hex;
      const dc = getDisplayCurrent(item);
      const clampedDc = Math.max(0, Math.min(dc, item.target));
      const progress = item.mode === 'ascending'
        ? clampedDc / item.target
        : (item.target - clampedDc) / item.target;

      const offset = CIRCUMFERENCE * (1 - Math.min(progress, 1));
      const isDone = doneItems.has(item.id) || (item.mode === 'ascending' ? clampedDc >= item.target : clampedDc <= 0);
      const displayCurrent = clampedDc;
      const idx = state.items.findIndex(i => i.id === state.activeId) + 1;

      app.innerHTML = tabsHtml + \`
        <div class="navigator">
          <button data-cmd="nav" data-val="-1" title="Önceki">‹</button>
          <div class="name">\${item.name}</div>
          <button data-cmd="nav" data-val="1" title="Sonraki">›</button>
        </div>
        <div class="nav-info-row"><span class="nav-mode">\${item.mode === 'ascending' ? '↑' : '↓'}</span> \${item.mode === 'ascending' ? t('mode_asc') : t('mode_desc')}<span>·</span>\${idx} / \${state.items.length}</div>

        <div class="ring-container">
          <svg viewBox="0 0 160 160">
            <circle class="ring-track" cx="80" cy="80" r="70"/>
            <circle class="ring-fill"
              cx="80" cy="80" r="70"
              stroke="\${itemColor}"
              stroke-dasharray="\${CIRCUMFERENCE}"
              stroke-dashoffset="\${offset}"/>
          </svg>
          <div class="ring-text">
            <div class="count">\${displayCurrent}</div>
            <div class="label">/ \${item.target}</div>
          </div>
        </div>

        \${isDone ? \`
          <div id="doneArea">
            \${celebratedItems.has(item.id) ? \`
              <div class="done-actions visible"><button class="btn-restart" data-cmd="restartAndReset">🔄 \${t('restart')}</button><button class="btn-next" data-cmd="goNext">⏭ \${t('next')}</button></div>
            \` : \`
              <div class="count-btn count-btn--done">✅ \${t('done')}</div>
            \`}
          </div>
        \` : \`
          <button class="count-btn count-btn--say" data-cmd="increment">\${t('count')}</button>
        \`}

        \${isDone ? '' : \`<button class="btn-counter-reset" data-cmd="resetCounter">\${t('reset')}</button>\`}

        <hr class="timer-divider" />
        <div class="timer-row">
          <div class="timer-label">⏱ \${t('timer_label')}</div>
          \${isDone ? '' : \`<button \${getTimerState().running ? '' : 'class="timer-active"'} data-cmd="timerToggle">\${getTimerState().running ? t('timer_pause') : t('timer_start')}</button>
          <button data-cmd="timerReset">\${t('timer_reset')}</button>\`}
          <div class="timer-display" id="timerDisplay">\${getTimerDisplay()}</div>
        </div>
        <div class="timer-info" id="timerInfo">\${getTimerInfo()}</div>

      \`;

      if (isDone) {
        if (!celebratedItems.has(item.id) && soundEnabled) { playWin(); spawnConfetti(); }
        if (doneTimer) clearTimeout(doneTimer);
        if (!celebratedItems.has(item.id)) {
          celebratedItems.add(item.id);
          doneTimer = setTimeout(() => {
            const a = document.getElementById('doneArea');
            if (a) {
              a.innerHTML = '<div class="done-actions visible"><button class="btn-restart" data-cmd="restartAndReset">🔄 ' + t('restart') + '</button><button class="btn-next" data-cmd="goNext">⏭ ' + t('next') + '</button></div>';
            }
          }, 3000);
        }
      } else {
        if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
      }

      const donateEl = document.getElementById('donateArea');
      if (donateEl) donateEl.innerHTML = renderDonatePopup();
    }

    function renderList(tabsHtml) {
      if (!state || state.items.length === 0) {
        app.innerHTML = tabsHtml + \`
          <div class="no-items">\${t('no_items')}</div>
          <div class="bottom-actions" style="margin-top:8px">
            <button class="btn-outlined" data-cmd="showAdd">\${t('add')}</button>
            <button class="btn-outlined" data-cmd="importData">↓ \${t('import_')}</button>
          </div>
          \${showAddForm ? getAddFormHtml() : ''}
          <button class="load-defaults-link" data-cmd="loadDefaults">\${t('load_defaults')}</button>
        \`;
        const donateEl = document.getElementById('donateArea');
        if (donateEl) donateEl.innerHTML = renderDonatePopup();
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const items = state.items.map((item) => {
        const color = getColor(item.color).hex;
        const isActive = item.id === state.activeId;
        const isDone = item.mode === 'ascending' ? item.current >= item.target : item.current <= 0;
        const isChecked = item.checkedDate === today;
        const isEditing = editItemId === item.id;

        let pickerHtml = '';
        if (openColorPicker === item.id) {
          const buttons = COLOR_KEYS.map((k, i) => \`
            <button data-cmd="pickColor" data-id="\${item.id}" data-idx="\${i}" class="\${item.color === k ? 'selected' : ''}">\${COLOR_MAP[k].emoji}</button>
          \`).join('');
          pickerHtml = '<div class="color-picker-popup">' + buttons + '</div>';
        }

        let editFormHtml = '';
        if (isEditing) {
          editFormHtml = \`
            <div class="item-form">
              <div class="item-form-title">\${t('form_title_edit')}<button class="item-form-close" data-cmd="cancelEdit" title="\${t('btn_cancel')}">✕</button></div>
              <div>
                <label>\${t('label_name')}</label>
                <input id="editName" type="text" value="\${editNameValue || item.name}" />
              </div>
              <div>
                <label>\${t('label_target')}</label>
                <input id="editTarget" type="number" value="\${editTargetValue || item.target}" min="1" />
              </div>
              <div class="item-form-actions">
                <div class="mode-toggle" id="editMode">
                  <button class="\${editMode === 'ascending' ? 'active' : ''}" data-cmd="setEditMode" data-val="ascending">↑ \${t('mode_asc')}</button>
                  <button class="\${editMode === 'descending' ? 'active' : ''}" data-cmd="setEditMode" data-val="descending">↓ \${t('mode_desc')}</button>
                </div>
                <button class="btn-primary" data-cmd="saveEdit" data-id="\${item.id}">✓ \${t('btn_save')}</button>
              </div>
            </div>
          \`;
        }

        return \`
          <div class="list-item \${isActive ? 'active' : ''}" data-id="\${item.id}" draggable="\${isEditing ? 'false' : 'true'}">
            <span class="li-drag-handle" title="\${t('tooltip_drag')}">⠿</span>
            <div class="li-checkbox \${isChecked ? 'checked' : ''}" data-cmd="toggleCheck" data-val="\${item.id}">
              \${isChecked ? '✓' : ''}
            </div>
            <div class="li-dot" style="background:\${color}"></div>
            <div class="li-info" data-cmd="selectItem" data-val="\${item.id}">
              <div class="li-name">\${item.name} <span class="li-mode">\${item.mode === 'ascending' ? '↑' : '↓'}</span></div>
              <div class="li-progress \${isDone ? 'li-progress--done' : ''}">\${item.current} / \${item.target}</div>
            </div>
            <div class="li-action-btns">
              <button class="li-action-btn" data-cmd="editItem" data-id="\${item.id}" title="\${t('tooltip_edit')}">✏️</button>
              <button class="li-action-btn" data-cmd="resetItemFromList" data-id="\${item.id}" title="\${t('tooltip_reset')}">↺</button>
              <button class="li-action-btn li-delete-btn" data-cmd="deleteFromList" data-id="\${item.id}" title="\${t('tooltip_delete')}">✕</button>
            </div>
            <button class="li-color-btn" data-cmd="openColorPicker" data-id="\${item.id}">\${getColor(item.color).emoji}</button>
            \${pickerHtml}
          </div>
          \${editFormHtml}
        \`;
      }).join('');

      app.innerHTML = tabsHtml + \`
        <div class="list-container" id="listContainer">
          \${items}
        </div>
        <div class="bottom-actions" style="margin-top:36px">
          <button class="btn-outlined" data-cmd="resetAll">↺ \${t('reset_all')}</button>
          <button class="btn-outlined" data-cmd="showAdd">\${t('add')}</button>
        </div>
        <div class="bottom-actions" style="margin-top:4px">
          <button class="btn-outlined" data-cmd="exportData">↑ \${t('export')}</button>
          <button class="btn-outlined" data-cmd="importData">↓ \${t('import_')}</button>
        </div>
        \${showAddForm ? getAddFormHtml() : ''}
      \`;

      setupDragDrop();
    }

    function renderDonatePopup() {
      if (!showDonatePopup) return '';
      const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TDyUnmDZrRbgydCpYepVLLvrbitS8mZyJc';
      return \`<div class="donate-overlay" data-cmd="closeDonate"></div>
        <div class="donate-popup">
          <div class="donate-popup-header">
            <div class="donate-popup-title">📿 Tesbih</div>
            <button class="donate-popup-close" data-cmd="closeDonate" title="\${t('btn_cancel')}">✕</button>
          </div>
          <div class="donate-popup-meta" style="margin-bottom:16px;">\${t('donate_updated')}: \${BUILD_DATE}</div>
          <div class="donate-popup-about">
            <div>\${t('donate_about')}</div>
          </div>
          <div style="font-size:13px;opacity:0.55;margin-bottom:12px;line-height:1.7;">
            <div>\${t('donate_author')}: Suat Erenler</div>
            <div>\${t('donate_email')}: suaterenler@gmail.com</div>
          </div>
          <hr style="border:none;border-top:1px solid rgba(128,128,128,0.35);margin:28px 0;">
          <div class="donate-popup-label" style="text-align:center;margin-bottom:12px;">\${t('donate_crypto')}</div>
          <div class="donate-popup-section">
            <div class="donate-popup-network">USDT-Tether (TRC20)</div>
            <div class="donate-popup-qr"><img src="\${qrUrl}" alt="QR" onerror="this.style.display=\\'none\\'"></div>
            <div class="donate-popup-addr-wrap">
              <div class="donate-popup-addr">TDyUnmDZrRbgydCpYepVLLvrbitS8mZyJc</div>
              <button class="donate-popup-copy" data-cmd="copyAddress" title="\${t('donate_copy')}">⧉</button>
            </div>
            <a class="donate-popup-trust" href="https://link.trustwallet.com/send?asset=c195_tTR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&address=TDyUnmDZrRbgydCpYepVLLvrbitS8mZyJc" target="_blank">🔐 Trust Wallet</a>
          </div>
        </div>\`;
    }

    let dragSrcId = null;

    function setupDragDrop() {
      const container = document.getElementById('listContainer');
      if (!container) return;

      container.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
          dragSrcId = item.getAttribute('data-id');
          item.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
          container.querySelectorAll('.list-item').forEach(el => el.classList.remove('drag-over'));
          dragSrcId = null;
        });

        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          container.querySelectorAll('.list-item').forEach(el => el.classList.remove('drag-over'));
          item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
          item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
          e.preventDefault();
          item.classList.remove('drag-over');
          const targetId = item.getAttribute('data-id');
          if (!dragSrcId || dragSrcId === targetId) return;
          const fromIdx = state.items.findIndex(i => i.id === dragSrcId);
          const toIdx = state.items.findIndex(i => i.id === targetId);
          if (fromIdx === -1 || toIdx === -1) return;
          vscodeApi.postMessage({ type: 'reorderItem', data: { id: dragSrcId, toIdx } });
        });
      });
    }

    function renderStats(tabsHtml) {
      const filtered = getFilteredHistory();
      const totalFiltered = filtered.length;

      const uniqueCount = new Set(filtered.map(e => e.itemName)).size;
      const completedCount = filtered.filter(e => e.completed).length;
      const totalCount = filtered.reduce((sum, e) => sum + e.current, 0);

      const fmt = (n) => n.toLocaleString();

      let summaryHtml = \`
        <div class="stat-card stat-card--total">
          <div class="stat-value stat-value--total">\${fmt(totalCount)}</div>
          <div class="stat-label">\${t('stats_total')}</div>
        </div>
        <div class="stats-summary" style="margin-bottom:16px">
          <div class="stat-card">
            <div class="stat-value">\${fmt(completedCount)}</div>
            <div class="stat-label">\${t('stats_completed')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${fmt(uniqueCount)}</div>
            <div class="stat-label">\${t('stats_variety')}</div>
          </div>
        </div>
      \`;

      const allDateGroups = {};
      filtered.sort((a, b) => b.completedAt - a.completedAt).forEach(e => {
        const key = formatDate(e.completedAt);
        if (!allDateGroups[key]) allDateGroups[key] = {};
        if (!allDateGroups[key][e.itemName]) allDateGroups[key][e.itemName] = 0;
        allDateGroups[key][e.itemName] += e.current;
      });

      const allDateKeys = Object.keys(allDateGroups);
      const limitedDateKeys = allDateKeys.slice(0, statsLimit);

      let historyHtml = '';
      if (limitedDateKeys.length > 0) {
        const groups = limitedDateKeys.map(date => {
          const nameEntries = Object.entries(allDateGroups[date])
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => \`
              <div class="history-entry">
                <span class="h-name">\${name}</span>
                <span class="h-target">\${fmt(count)} \${t('piece')}</span>
              </div>
            \`).join('');
          return '<div class="history-date-group"><div class="history-date">' + date + '</div>' + nameEntries + '</div>';
        }).join('');

        historyHtml = '<div class="history-list"><h3 style="display:flex;align-items:center;justify-content:space-between">' + t('history') + (totalFiltered > 0 ? '<a href="#" data-cmd="clearHistory" style="font-size:11px;color:#e53935;text-decoration:none;opacity:0.8;cursor:pointer;margin-left:auto">' + t('clear_history') + '</a>' : '') + '</h3>' + groups + '</div>';
      }

      const emptyHtml = totalFiltered === 0 ? '<div class="no-history">' + t('no_history') + '</div>' : '';
      const showMoreHtml = allDateKeys.length > limitedDateKeys.length ? '<div style="text-align:center;padding:8px"><a href="#" class="load-defaults-link" data-cmd="showMore" style="font-size:12px">' + t('show_more') + '</a></div>' : '';

      app.innerHTML = tabsHtml + \`
        <div class="stats-filter">
          <button class="\${statsFilter === 'today' ? 'active' : ''}" data-cmd="setFilter" data-val="today">\${t('filter_today')}</button>
          <button class="\${statsFilter === 'yesterday' ? 'active' : ''}" data-cmd="setFilter" data-val="yesterday">\${t('filter_yesterday')}</button>
          <button class="\${statsFilter === 'week' ? 'active' : ''}" data-cmd="setFilter" data-val="week">\${t('filter_week')}</button>
          <button class="\${statsFilter === 'month' ? 'active' : ''}" data-cmd="setFilter" data-val="month">\${t('filter_month')}</button>
          <button class="\${statsFilter === 'all' ? 'active' : ''}" data-cmd="setFilter" data-val="all">\${t('filter_all')}</button>
        </div>
        \${summaryHtml}
        \${historyHtml}
        \${showMoreHtml}
        \${emptyHtml}
      \`;
    }
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function activate(context: vscode.ExtensionContext) {
  // Seed fake history
  const fk = 'tesbihHistory';
  const names = ['Süphanallah', 'Elhamdülillah', 'Allahu Ekber', 'Subhanallahi ve bihamdihi', 'La ilahe illallah', 'Estağfirullah'];
  const fakeHistory = [];
  const now = Date.now();
  const day = 86400000;
  for (let d = 0; d < 7; d++) {
    const count = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < count; j++) {
      const name = names[Math.floor(Math.random() * names.length)];
      const target = [33, 99, 100, 34, 50][Math.floor(Math.random() * 5)];
      const current = target;
      fakeHistory.push({
        id: 'fk' + d + j + name,
        itemName: name,
        target,
        current,
        completedAt: now - d * day + Math.floor(Math.random() * 36000000),
        mode: 'ascending' as const,
        completed: true,
      });
    }
  }
  context.globalState.update(fk, fakeHistory);

  const provider = new TesbihProvider(vscode.Uri.parse(''), context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TesbihProvider.viewType, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tesbih.increment', () => {
      provider['_handleMessage']({ type: 'increment' });
      const state = provider['_getState']();
      const item = state.items.find((i) => i.id === state.activeId);
      if (item) {
        vscode.window.setStatusBarMessage(`📿 ${item.name}: ${item.current}/${item.target}`, 2000);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tesbih.reset', () => {
      provider['_handleMessage']({ type: 'resetItem' });
    })
  );
}

export function deactivate() {}
