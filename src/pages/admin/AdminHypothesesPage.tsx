import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  new: "chip",
  in_progress: "chip chip-info",
  testing: "chip chip-warning",
  won: "chip chip-success",
  lost: "chip chip-danger",
  archived: "chip",
};

export default function AdminHypothesesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    supabase
      .from("hypotheses")
      .select("id,project_id,title,description,status,priority,created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancel) return;
        if (error) setError(error.message);
        else setRows((data ?? []) as Row[]);
        setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(query));
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск гипотезы" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-warning">Не удалось загрузить: {error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Гипотеза</th>
                    <th className="text-left py-3 px-4 font-medium">Статус</th>
                    <th className="text-left py-3 px-4 font-medium">Приоритет</th>
                    <th className="text-right py-3 px-4 font-medium">Создана</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h) => (
                    <tr key={h.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30">
                      <td className="py-2.5 px-4 font-medium max-w-[420px] truncate">{h.title}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className={cn(STATUS_TONE[h.status] ?? "chip")}>
                          {h.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground capitalize">{h.priority}</td>
                      <td className="py-2.5 px-4 text-right text-xs text-muted-foreground tabular-nums">
                        {formatDate(h.created_at)}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Гипотез пока нет
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
