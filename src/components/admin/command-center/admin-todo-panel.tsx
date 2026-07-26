import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminTodoPanel({ items, title = "Analytics pipeline TODOs" }: { items: string[]; title?: string }) {
  if (!items.length) return null;

  return (
    <Card className="glass-panel border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-amber-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
