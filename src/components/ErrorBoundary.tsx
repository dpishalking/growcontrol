import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
          <h1 className="font-display text-xl font-semibold">
            {this.props.fallbackTitle ?? "Что-то пошло не так"}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {this.state.error.message || "Не удалось отобразить страницу."}
          </p>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => this.setState({ error: null })}>
              Попробовать снова
            </Button>
            <Button asChild>
              <Link to="/dashboard">На главную</Link>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
