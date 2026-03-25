import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ClipboardCheck,
  Award,
  TrendingUp,
  Users,
  Settings,
  Menu,
  LogOut,
  Bell,
  Target,
  FileText,
  Building2,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const sidebarItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Assessments", url: "/assessments", icon: ClipboardCheck },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Action Plans & Improvements", url: "/action-plans", icon: CheckCircle2 },
  { title: "Benchmarks", url: "/benchmarks", icon: TrendingUp },
  { title: "Certifications", url: "/certifications", icon: Award },
  { title: "Team", url: "/team", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

const superAdminItems = [
  { title: "Dashboard", url: "/super-admin-dashboard", icon: BarChart3 },
  { title: "Organizations", url: "/organizations", icon: Building2 },
  { title: "Assessment Config", url: "/assessment-config", icon: Target },
  { title: "System Settings", url: "/system-settings", icon: Settings },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const { userRole } = useAuth();
  const isCollapsed = state === "collapsed";

  const items = userRole === "super_admin" ? superAdminItems : sidebarItems;
  const dashboardUrl = userRole === "super_admin" ? "/super-admin-dashboard" : "/dashboard";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to={dashboardUrl} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">HR-Insight</span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export const AppLayout = ({ children, title }: AppLayoutProps) => {
  const { signOut, organization, userRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              {userRole === "super_admin" ? (
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  Platform Admin
                </span>
              ) : (
                organization && (
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {organization.name}
                  </span>
                )
              )}
              {userRole === "super_admin" && (
                <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:inline">
                  Super Admin
                </span>
              )}
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};
