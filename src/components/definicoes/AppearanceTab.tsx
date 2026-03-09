import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  {
    value: "light",
    label: "Claro",
    icon: Sun,
    preview: {
      bg: "bg-white",
      nav: "bg-gray-100",
      accent: "bg-gray-200",
    },
  },
  {
    value: "dark",
    label: "Escuro",
    icon: Moon,
    preview: {
      bg: "bg-gray-900",
      nav: "bg-gray-800",
      accent: "bg-gray-700",
    },
  },
  {
    value: "system",
    label: "Sistema",
    icon: Monitor,
    preview: {
      bg: "bg-gradient-to-br from-white to-gray-900",
      nav: "bg-gradient-to-r from-gray-100 to-gray-800",
      accent: "bg-gradient-to-r from-gray-200 to-gray-700",
    },
  },
] as const;

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>
            Seleciona o tema visual da aplicação. A alteração é aplicada imediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-foreground mb-4">
            Qual o tema da aplicação?
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-xl">
            {themes.map(({ value, label, icon: Icon, preview }) => {
              const isSelected = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "group flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-sm font-medium transition-all duration-200",
                    "hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted/30"
                  )}
                  aria-pressed={isSelected}
                  type="button"
                >
                  {/* Mini UI preview */}
                  <div
                    className={cn(
                      "w-full rounded-lg border border-black/10 overflow-hidden shadow-sm aspect-video",
                      preview.bg
                    )}
                    aria-hidden
                  >
                    <div className={cn("h-2 w-full", preview.nav)} />
                    <div className="p-1.5 space-y-1">
                      <div className={cn("h-1.5 w-3/4 rounded-full", preview.accent)} />
                      <div className={cn("h-1.5 w-1/2 rounded-full", preview.accent, "opacity-60")} />
                    </div>
                  </div>

                  {/* Icon + Label */}
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
