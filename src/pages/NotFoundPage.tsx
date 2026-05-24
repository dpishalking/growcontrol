import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="font-display text-4xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2 mb-6">Страница не найдена</p>
      <Button asChild>
        <Link to="/dashboard">На главную</Link>
      </Button>
    </div>
  );
}
