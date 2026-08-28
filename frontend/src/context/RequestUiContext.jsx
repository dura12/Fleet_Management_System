import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import RequestDetail from '../pages/RequestDetail';
import RequestFormModal from '../components/RequestFormModal';

const RequestUiContext = createContext(null);

export function RequestUiProvider({ children }) {
  const [detailId, setDetailId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const notifyChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new CustomEvent('fms-notifications-refresh'));
  }, []);

  const openDetail = useCallback((id) => {
    if (!id) return;
    setCreateOpen(false);
    setDetailId(id);
  }, []);

  const openCreate = useCallback(() => {
    setDetailId(null);
    setCreateOpen(true);
  }, []);

  const close = useCallback(() => {
    setDetailId(null);
    setCreateOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openDetail, openCreate, close, detailId, createOpen, refreshKey, notifyChanged }),
    [openDetail, openCreate, close, detailId, createOpen, refreshKey, notifyChanged],
  );

  return (
    <RequestUiContext.Provider value={value}>
      {children}
      {createOpen && (
        <RequestFormModal
          onClose={close}
          onCreated={(created) => {
            notifyChanged();
            if (created?._id) openDetail(created._id);
            else close();
          }}
        />
      )}
      {detailId && (
        <Modal
          title="Request details"
          size="lg"
          onClose={close}
        >
          <RequestDetail
            requestId={detailId}
            embedded
            onClose={close}
            onChanged={notifyChanged}
          />
        </Modal>
      )}
    </RequestUiContext.Provider>
  );
}

export function useRequestUi() {
  const ctx = useContext(RequestUiContext);
  if (!ctx) {
    throw new Error('useRequestUi must be used within RequestUiProvider');
  }
  return ctx;
}
