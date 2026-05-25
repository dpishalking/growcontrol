import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AdminShellContextValue = {
  refreshToken: number;
  notifyParticipantsChanged: () => void;
  addParticipantOpen: boolean;
  openAddParticipant: () => void;
  closeAddParticipant: () => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);

  const notifyParticipantsChanged = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const value = useMemo(
    () => ({
      refreshToken,
      notifyParticipantsChanged,
      addParticipantOpen,
      openAddParticipant: () => setAddParticipantOpen(true),
      closeAddParticipant: () => setAddParticipantOpen(false),
    }),
    [refreshToken, notifyParticipantsChanged, addParticipantOpen],
  );

  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShell(): AdminShellContextValue {
  const ctx = useContext(AdminShellContext);
  if (!ctx) {
    throw new Error("useAdminShell must be used within AdminShellProvider");
  }
  return ctx;
}
