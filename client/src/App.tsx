import { useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import CopyEditor from "@/components/CopyEditor";
import { watchCopyOverrides } from "@/lib/copyOverrides";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  // Textos gravados no editor (content/copy.json) aplicam-se antes da primeira
  // pintura, para nao haver um piscar do texto antigo ao carregar a pagina.
  useLayoutEffect(() => watchCopyOverrides(), []);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          {/* Editor de texto: existe apenas em desenvolvimento (o servidor do
              Vite e' quem grava o ficheiro) e nunca entra no build. */}
          {import.meta.env.DEV && <CopyEditor />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
