import { useLocalStorage } from "./hooks/use-local-storage";
import { PackageInput } from "./components/PackageInput";
import { PackageList } from "./components/PackageList";

function App() {
  const { packages, addPackage, removePackage } = useLocalStorage();

  const handleAddPackage = (packageName: string) => {
    addPackage(packageName);
  };

  const handleRemovePackage = (packageName: string) => {
    removePackage(packageName);
  };

  return (
    <div className="grain min-h-screen py-4 px-5 sm:py-10 sm:px-8 w-full">
      <div className="max-w-6xl mx-auto w-full">
        <header className="relative mb-8 sm:mb-16 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="font-display text-4xl sm:text-6xl lg:text-7xl tracking-tight mb-2 sm:mb-3"
                style={{
                  color: "var(--text-primary)",
                  lineHeight: 1.05,
                }}
              >
                npm
                <br />
                <span style={{ color: "var(--accent)" }}>stats</span>
              </h1>
              <p
                className="text-base sm:text-lg max-w-md"
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Track download trends for your favorite packages.
              </p>
            </div>
          </div>
        </header>

        <div
          className="mb-10 animate-fade-slide-in"
          style={{ animationDelay: "0.1s" }}
        >
          <PackageInput onAdd={handleAddPackage} />
        </div>

        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <PackageList packages={packages} onRemove={handleRemovePackage} />
        </div>
      </div>
    </div>
  );
}

export default App;
