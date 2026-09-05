import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { TruckProvider } from "./context/TruckContext";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <TruckProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TruckProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}