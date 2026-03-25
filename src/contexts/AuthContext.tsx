import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  organization_id: string | null;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
}

interface Organization {
  id: string;
  name: string;
  industry: string;
  region: string;
  company_size: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userObj: User) => {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userObj.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return;
    }

    if (profileData) {
      // Fetch user role FIRST so we know if they are a super admin
      let finalRole = "viewer"; 
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userObj.id)
        .maybeSingle();
      
      if (!roleError && roleData) {
        finalRole = roleData.role;
      } else {
        // Self-heal role if missing
        const intendedRole = userObj.user_metadata?.role || "hr_admin";
        try {
          await supabase.from("user_roles").insert([{ user_id: userObj.id, role: intendedRole }]);
          finalRole = intendedRole;
        } catch (e) {
          console.error("Failed to self-heal user role", e);
        }
      }
      setUserRole(finalRole);

      // ONLY execute organization self-healing if the user is NOT a super_admin
      // Super admins are platform-wide and should specifically have organization_id = null
      if (finalRole !== "super_admin") {
        // FIX: If the user was invited, the database trigger might have missed the organization_id.
        if (!profileData.organization_id && userObj.user_metadata?.organization_id) {
          const orgId = userObj.user_metadata.organization_id;
          try {
            await supabase.from("profiles").update({ organization_id: orgId }).eq("id", profileData.id);
            profileData.organization_id = orgId;
          } catch (e) {
            console.error("Failed to self-heal profile organization_id", e);
          }
        }

        // FIX: If a new HR Admin registered, but the postgres trigger failed to create their organization,
        if (!profileData.organization_id && userObj.user_metadata?.organization_name) {
          try {
            const { data: newOrg, error: createError } = await supabase
              .from("organizations")
              .insert([{
                name: userObj.user_metadata.organization_name,
                industry: userObj.user_metadata.industry || "other",
                company_size: userObj.user_metadata.company_size || "1_50",
                region: userObj.user_metadata.region || "pan_india"
              }])
              .select()
              .single();

            if (createError) throw createError;
            
            if (newOrg) {
              await supabase.from("profiles").update({ organization_id: newOrg.id }).eq("id", profileData.id);
              profileData.organization_id = newOrg.id;
            }
          } catch (e) {
            console.error("Failed to self-heal organization creation", e);
          }
        }
      }
      
      setProfile(profileData as Profile);

      if (profileData.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profileData.organization_id)
          .maybeSingle();

        if (orgError) {
          console.error("Error fetching organization:", orgError);
        } else if (orgData) {
          setOrganization(orgData as Organization);
        }
      } else {
        setOrganization(null);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => fetchProfile(session.user), 0);
        } else {
          setProfile(null);
          setOrganization(null);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setProfile(null);
    setOrganization(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        userRole,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
