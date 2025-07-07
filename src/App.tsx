import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Browse from "./pages/Browse";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Categories from "./pages/Categories";
import CategoryContent from "./pages/CategoryContent";
import Collections from "./pages/Collections";
import CollectionDetails from "./pages/CollectionDetails";
import CreateCollection from "./pages/CreateCollection";
import ContentDetails from "./pages/ContentDetails";
import MyUploads from "./pages/MyUploads";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/search" element={<Browse />} />
            <Route path="/favorites" element={<Profile />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:name" element={<CategoryContent />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/new" element={<CreateCollection />} />
            <Route path="/collections/:id" element={<CollectionDetails />} />
            <Route path="/content/:id" element={<ContentDetails />} />
            <Route path="/my-uploads" element={<MyUploads />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
