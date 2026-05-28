import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccountDetailStore } from "@/store/useAccountDetailStore";
import { Account } from "@/types";
import { useEffect } from "react";

export function AccountPhaseSelector({ account }: { account: Account }) {
    const {viewPhase, setViewPhase} = useAccountDetailStore()
    
    useEffect(() => {
        if (account?.phase) {
          setViewPhase(account.phase)
        }
    }, [account]);
    
    return (
        <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
            <Tabs defaultValue="1" value={String(viewPhase)} onValueChange={(v) => setViewPhase(Number(v))}>
              <TabsList className="bg-transparent">
                <TabsTrigger value="1" className="data-[state=active]:shadow-sm">Fase 1</TabsTrigger>
                {(account.totalPhases ?? 1) >= 2 && (
                  <TabsTrigger value="2" className="data-[state=active]:shadow-sm" disabled={account.status !== 'Funded' && (account.phase || 1) < 2}>
                    Fase 2
                  </TabsTrigger>
                )}
                {account.status === 'Funded' && (
                  <TabsTrigger value="3" className="data-[state=active]:text-emerald-600 data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/30 data-[state=active]:shadow-sm">
                    Funded
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
    )
}