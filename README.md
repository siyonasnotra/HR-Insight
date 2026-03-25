# HR-Insight: Comprehensive HR Assessment & Certification Platform

## 📋 Project Overview

**HR-Insight** is a modern, enterprise-grade Human Resource Management platform designed to assess, analyze, and certify organizational HR excellence. Built with React, TypeScript, and Supabase, it implements the **SIPMAA framework** (6 core HR domains) for comprehensive HR maturity evaluation.

### 🎯 Core Purpose
- **Assessment Management**: Create, distribute, and track HR practice assessments
- **Performance Analytics**: Visualize team data with interactive dashboards and reports
- **Certification System**: Issue and verify HR excellence certificates
- **Action Planning**: Generate actionable improvement plans based on assessment results
- **Benchmarking**: Compare organizational performance against industry standards
- **Team Collaboration**: Multi-user platform with role-based access control

### 🏗️ Architecture Overview
```
Frontend (React + TypeScript)
├── Pages (32+ components)
├── Components (UI + Business Logic)
├── Services (API Layer)
├── Hooks & Utils
└── Context Providers

Backend (Supabase)
├── PostgreSQL Database
├── Authentication (Auth0)
├── Real-time Subscriptions
├── Row-Level Security (RLS)
└── Storage (File uploads)
```

---

## 🛠️ Technology Stack

### **Frontend Framework**
- **React 18** - Component-based UI framework
- **TypeScript** - Type-safe JavaScript with strict typing
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing with protected routes

### **Styling & UI**
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Modern icon library

### **State Management & Data**
- **TanStack Query (React Query)** - Server state management
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **Context API** - Global state (Auth, Theme)

### **Backend & Database**
- **Supabase** - PostgreSQL with real-time capabilities
- **Supabase Auth** - JWT-based authentication
- **Supabase Storage** - File upload management
- **Row-Level Security** - Database-level access control

### **Development Tools**
- **ESLint** - Code linting and quality enforcement
- **TypeScript Compiler** - Type checking
- **Bun** - Fast JavaScript runtime (package manager)
- **jsPDF** - PDF generation for reports

---

## 📊 Database Schema & Migrations

### **Core Tables**

#### **1. Organizations** (`organizations`)
```sql
- id: uuid (PK)
- name: text
- industry: industry_vertical
- region: region_type
- company_size: company_size_type
- logo_url: text
- website: text
- latest_assessment_id: uuid (FK)
- latest_score: numeric
- latest_status: text
- latest_report_url: text
- created_at: timestamp
- updated_at: timestamp
```

#### **2. Profiles** (`profiles`)
```sql
- id: uuid (PK)
- user_id: uuid (FK → auth.users)
- organization_id: uuid (FK)
- full_name: text
- email: text
- avatar_url: text
- job_title: text
- created_at: timestamp
- updated_at: timestamp
```

#### **3. User Roles** (`user_roles`)
```sql
- id: uuid (PK)
- user_id: uuid (FK)
- role: app_role (super_admin, hr_admin, hr_manager, viewer)
- created_at: timestamp
```

#### **4. Assessment Categories** (`assessment_categories`)
```sql
- id: uuid (PK)
- name: text
- description: text
- icon: text
- display_order: integer
- weight: numeric
- created_at: timestamp
```

#### **5. Questions** (`questions`)
```sql
- id: uuid (PK)
- category_id: uuid (FK)
- question_text: text
- question_type: question_type (likert, yes_no, numeric, mcq)
- options: jsonb
- weight: numeric
- max_score: numeric
- display_order: integer
- is_active: boolean
- created_at: timestamp
```

#### **6. Assessments** (`assessments`)
```sql
- id: uuid (PK)
- organization_id: uuid (FK)
- title: text
- status: assessment_status (draft, in_progress, completed)
- overall_score: numeric
- certification_level: certification_level
- created_by: uuid (FK)
- started_at: timestamp
- completed_at: timestamp
- created_at: timestamp
- updated_at: timestamp
```

#### **7. Assessment Responses** (`assessment_responses`)
```sql
- id: uuid (PK)
- assessment_id: uuid (FK)
- question_id: uuid (FK)
- response_value: text
- score: numeric
- created_at: timestamp
```

#### **8. Category Scores** (`category_scores`)
```sql
- id: uuid (PK)
- assessment_id: uuid (FK)
- category_id: uuid (FK)
- score: numeric
- max_possible_score: numeric
- percentage: numeric
- created_at: timestamp
```

#### **9. Certifications** (`certifications`)
```sql
- id: uuid (PK)
- organization_id: uuid (FK)
- assessment_id: uuid (FK)
- level: certification_level (diamond, gold, silver, none)
- verification_code: text
- issued_at: timestamp
- expires_at: timestamp
- is_active: boolean
- created_at: timestamp
```

#### **10. Action Plans** (`action_plans`)
```sql
- id: uuid (PK)
- organization_id: uuid (FK)
- assessment_id: uuid (FK)
- category_id: uuid (FK)
- title: text
- description: text
- priority: priority_level (high, medium, low)
- status: action_status (pending, in_progress, completed)
- assigned_to: uuid (FK)
- due_date: date
- created_at: timestamp
- updated_at: timestamp
```

### **Database Migrations** (Chronological Order)
1. `20260108175139_e5e93125-6a35-4f68-9ea0-8fc16bbcb8e3.sql` - Initial schema setup
2. `20260108175222_413cf865-e206-4544-a274-3a158bfbfa29.sql` - Core tables creation
3. `20260314000000_superadmin_rls.sql` - Super admin role and RLS policies
4. `20260319000000_self_assessment_and_reports.sql` - Self-assessment features
5. `20260321000000_org_latest_assessment.sql` - Organization assessment tracking
6. `20260321100000_sync_org_assessments.sql` - Assessment synchronization
7. `20260324164000_super_admin_full_access.sql` - Super admin permissions
8. `20260324193000_assign_super_admin_role.sql` - Role assignment logic
9. `20260324194500_fix_super_admin_rls_all_tables.sql` - RLS policy fixes
10. `20260325000000_add_profiles_user_roles_relationship.sql` - Profile-role relationships
11. `update_database.sql` - Database updates and fixes

---

## 🔐 Authentication & Security

### **Role-Based Access Control (RBAC)**
```typescript
type AppRole = 'super_admin' | 'hr_admin' | 'hr_manager' | 'viewer';
```

#### **Role Permissions**
- **Super Admin**: Full system access, user management, all organizations
- **HR Admin**: Organization management, assessment creation, team invites
- **HR Manager**: Assessment execution, report viewing, action plan management
- **Viewer**: Read-only access to reports and dashboards

### **Security Features**
- **JWT Authentication** via Supabase Auth
- **Row-Level Security (RLS)** on all database tables
- **Protected Routes** with role-based navigation
- **Session Management** with automatic refresh
- **Password Complexity** validation
- **Email Verification** for new accounts

### **Authentication Flow**
```typescript
// AuthContext provides:
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  userRole: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

---

## 🎯 Core Features & Components

### **1. Dashboard (`/dashboard`)**
**File**: `src/pages/Dashboard.tsx`
**Purpose**: Centralized overview of HR metrics and activities
**Features**:
- Real-time assessment progress tracking
- Category-wise performance visualization
- Recent activity feed
- Quick action buttons
- Role-based content display

**Key Components**:
- Assessment status cards
- Progress bars and metrics
- Real-time data subscriptions
- Responsive grid layout

### **2. Assessment Management (`/assessments`)**
**Files**: `src/pages/Assessments.tsx`, `src/pages/AssessmentTake.tsx`
**Purpose**: Complete assessment lifecycle management

#### **Assessment List Page** (`Assessments.tsx`)
**Features**:
- Organization vs Self-assessment tabs
- Assessment history with status badges
- Certification level display
- Progress tracking
- New assessment creation

#### **Assessment Taking Page** (`AssessmentTake.tsx`)
**Features**:
- Category-based navigation
- Multiple question types (Likert, Yes/No, Numeric)
- Auto-save functionality
- Progress tracking
- Read-only mode for completed assessments

**Question Types Supported**:
```typescript
type QuestionType = 'likert' | 'yes_no' | 'numeric' | 'mcq';
```

### **3. Reports & Analytics (`/reports`)**
**File**: `src/pages/Reports.tsx`
**Purpose**: Comprehensive reporting and data visualization
**Features**:
- Organization performance reports
- Category-wise analysis
- Trend analysis over time
- PDF report generation
- Benchmark comparisons

### **4. Benchmarking (`/benchmarks`)**
**Files**: `src/pages/Benchmarks.tsx`, `src/pages/BenchmarkAnalytics.tsx`
**Purpose**: Industry performance comparison

**Features**:
- Radar chart visualizations
- Industry average comparisons
- Leaderboard rankings
- Static benchmark data for 6 HR domains
- Performance gap analysis

### **5. Certifications (`/certifications`)**
**Files**: `src/pages/Certifications.tsx`, `src/pages/CertificationsAdmin.tsx`
**Purpose**: Certificate management and verification

**Features**:
- Certificate issuance based on assessment scores
- Verification code generation
- Expiry date management
- PDF certificate generation
- Public verification portal

**Certification Levels**:
```typescript
type CertificationLevel = 'diamond' | 'gold' | 'silver' | 'none';
const LEVEL_RANGES = {
  'diamond': { min: 85, max: 100, label: 'Diamond - Elite Excellence' },
  'gold': { min: 65, max: 84, label: 'Gold - Excellent Performance' },
  'silver': { min: 45, max: 64, label: 'Silver - Good Performance' },
  'none': { min: 0, max: 44, label: 'Not Certified - Needs Improvement' }
};
```

### **6. Action Plans (`/action-plans`)**
**File**: `src/pages/ActionPlans.tsx`
**Purpose**: Improvement initiative tracking

**Features**:
- Action plan creation from assessment results
- Priority-based organization
- Status tracking (pending, in_progress, completed)
- Assignment to team members
- Due date management

### **7. Team Management (`/team`)**
**File**: `src/pages/Team.tsx`
**Purpose**: User and role management

**Features**:
- Team member invitation system
- Role assignment and management
- User profile management
- Organization membership tracking

### **8. Organization Management (`/organizations`)**
**Files**: `src/pages/Organizations.tsx`, `src/pages/NewOrganization.tsx`, `src/pages/OrganizationProfile.tsx`
**Purpose**: Multi-tenant organization management

**Features**:
- Organization creation and configuration
- Industry and size classification
- Logo and branding management
- Assessment history tracking

### **9. Self-Assessments (`/self-assessments`)**
**Files**: `src/pages/SelfAssessments.tsx`, `src/pages/SelfAssessmentTake.tsx`
**Purpose**: Individual skill assessment

**Features**:
- Personal skill evaluation
- Multiple question types (rating, MCQ, descriptive)
- Improvement suggestions generation
- Skill gap analysis
- Local storage fallback

### **10. Admin Panels**
#### **Super Admin Dashboard** (`/super-admin-dashboard`)
- System-wide user management
- Organization oversight
- Platform analytics

#### **Users Admin** (`/users-admin`)
- User role management
- Bulk operations
- Access control

#### **Assessments Admin** (`/assessments-admin`)
- Question bank management
- Assessment template creation
- Category configuration

### **11. Supporting Pages**
- **Settings** (`/settings`): User preferences and configuration
- **Contact** (`/contact`): Support and feedback
- **Pricing** (`/pricing`): Subscription plans
- **About** (`/about`): Platform information
- **NotFound** (`/404`): Error handling

---

## 🔧 Service Layer Architecture

### **1. Assessment Service** (`src/services/assessmentService.ts`)
**Core Functions**:
```typescript
- getAssessmentCategories(): Promise<AssessmentCategory[]>
- getQuestionsByCategory(categoryId: string): Promise<Question[]>
- createAssessment(assessment: Partial<Assessment>): Promise<Assessment>
- saveAssessmentResponse(response: AssessmentResponse): Promise<void>
- getOrganizationAssessments(orgId: string): Promise<Assessment[]>
- calculateMaturityScore(assessmentId: string): Promise<HRMaturityScore>
```

### **2. Certification Service** (`src/services/certificationService.ts`)
**Core Functions**:
```typescript
- createCertification(params: CertificationParams): Promise<Certification>
- getCertificationByOrganization(orgId: string): Promise<Certification | null>
- verifyCertification(code: string): Promise<Certification>
- generateVerificationCode(): string
- renewCertification(certId: string): Promise<Certification>
```

### **3. Benchmark Service** (`src/services/benchmarkService.ts`)
**Core Functions**:
```typescript
- getBenchmarkData(assessmentId: string): Promise<BenchmarkMetrics>
- calculateIndustryAverages(): Promise<Record<string, number>>
- getLeaderboardData(limit?: number): Promise<Organization[]>
- comparePerformance(orgId: string): Promise<BenchmarkComparison>
```

### **4. Action Plan Service** (`src/services/actionPlanService.ts`)
**Core Functions**:
```typescript
- createActionPlan(plan: ActionPlanInput): Promise<ActionPlan>
- getOrganizationActionPlans(orgId: string): Promise<ActionPlan[]>
- updateActionPlanStatus(planId: string, status: ActionStatus): Promise<void>
- getAssessmentActionPlans(assessmentId: string): Promise<ActionPlan[]>
```

### **5. Organization Service** (`src/services/organizationService.ts`)
**Core Functions**:
```typescript
- getOrganizations(): Promise<Organization[]>
- createOrganization(org: OrganizationInput): Promise<Organization>
- updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>
- sendTeamInvitation(email: string, role: AppRole): Promise<void>
- getOrganizationMembers(orgId: string): Promise<UserProfile[]>
```

### **6. Self-Assessment Service** (`src/services/selfAssessmentService.ts`)
**Core Functions**:
```typescript
- getSelfAssessmentsByUser(userId: string): Promise<SelfAssessment[]>
- createSelfAssessment(assessment: SelfAssessmentInput): Promise<SelfAssessment>
- saveSelfAssessmentResponse(response: SelfAssessmentResponse): Promise<void>
- generateImprovementSuggestions(assessmentId: string): Promise<UserImprovementSuggestion[]>
```

### **7. User Report Service** (`src/services/userReportService.ts`)
**Core Functions**:
```typescript
- getUserReport(userId: string): Promise<UserReport>
- generatePDFReport(report: UserReport): Promise<Blob>
- exportReportData(userId: string, format: 'json' | 'csv'): Promise<Blob>
```

### **8. Maturity Scoring Service** (`src/services/maturityScoringService.ts`)
**Core Functions**:
```typescript
- calculateMaturityScore(assessmentId: string): Promise<HRMaturityScore>
- getCategoryScores(assessmentId: string): Promise<CategoryScore[]>
- determineCertificationLevel(score: number): CertificationLevel
- generateMaturityInsights(scores: CategoryScore[]): Promise<string[]>
```

### **9. Improvement Service** (`src/services/improvementService.ts`)
**Core Functions**:
```typescript
- getUserImprovements(userId: string): Promise<UserImprovementSuggestion[]>
- getUserSkillScores(userId: string): Promise<UserSkillScore[]>
- generatePersonalizedSuggestions(responses: SelfAssessmentResponse[]): Promise<UserImprovementSuggestion[]>
```

---

## 🎨 UI Components Library

### **Core UI Components** (`src/components/ui/`)
**Available Components**: 35+ pre-built components

#### **Form Components**
- `Button` - Multiple variants (default, destructive, outline, ghost, link, hero, success, warning, premium)
- `Input` - Text input with validation
- `Textarea` - Multi-line text input
- `Select` - Dropdown selection
- `Checkbox` - Boolean input
- `RadioGroup` - Single selection from options
- `Switch` - Toggle input
- `Slider` - Range input
- `InputOTP` - One-time password input

#### **Layout Components**
- `Card` - Content container with header, content, footer
- `Dialog` - Modal dialogs
- `Sheet` - Slide-out panels
- `Sidebar` - Navigation sidebar with collapsible functionality
- `Tabs` - Tabbed content organization
- `Accordion` - Collapsible content sections
- `Collapsible` - Expandable content areas

#### **Data Display**
- `Table` - Data tables with sorting
- `Badge` - Status indicators and labels
- `Progress` - Progress bars and indicators
- `Chart` - Data visualization (Recharts integration)
- `Avatar` - User profile images
- `Skeleton` - Loading state placeholders

#### **Feedback Components**
- `Alert` - Information, warning, error messages
- `Toast` - Non-intrusive notifications
- `Tooltip` - Contextual help
- `Popover` - Floating content
- `HoverCard` - Rich hover information

#### **Navigation Components**
- `NavigationMenu` - Multi-level navigation
- `Breadcrumb` - Navigation hierarchy
- `Pagination` - Page navigation
- `Menubar` - Application menu
- `DropdownMenu` - Context menus

### **Business Logic Components**

#### **Landing Page Components** (`src/components/landing/`)
- `Hero` - Main landing section with CTA
- `Features` - Feature showcase
- `CertificationLevels` - Certification tier display
- `CTASection` - Call-to-action sections
- `Footer` - Site footer
- `Header` - Navigation header
- `OrganizationsShowcase` - Client showcase

#### **Authentication Components** (`src/components/auth/`)
- `ProtectedRoute` - Route protection wrapper

#### **Organization Components** (`src/components/organizations/`)
- `OrganizationCard` - Organization display card

#### **Certification Components** (`src/components/certifications/`)
- `CertificationCard` - Certificate display

#### **Action Plan Components** (`src/components/action-plans/`)
- `ActionPlanCard` - Action plan display

#### **Maturity Components** (`src/components/maturity/`)
- `MaturityScoreDisplay` - Maturity score visualization

---

## 🔧 Configuration & Setup

### **Environment Variables** (`.env`)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Alternative key name
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### **TypeScript Configuration** (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### **ESLint Configuration** (`eslint.config.js`)
```javascript
export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
```

### **Tailwind Configuration** (`tailwind.config.ts`)
```typescript
export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        // Custom color palette
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        // ... additional color definitions
      }
    }
  },
  plugins: [tailwindcssAnimate],
};
```

### **Vite Configuration** (`vite.config.ts`)
```typescript
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

---

## 🚀 Development Workflow

### **Prerequisites**
- Node.js 18+ or Bun
- Supabase account and project
- Git

### **Installation**
```bash
# Clone repository
git clone <repository-url>
cd hr-insight

# Install dependencies
bun install  # or npm install

# Copy environment file
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
bun run dev  # or npm run dev
```

### **Available Scripts**
```json
{
  "dev": "vite",                    // Start development server
  "build": "vite build",           // Production build
  "build:dev": "vite build --mode development",  // Development build
  "lint": "eslint .",              // Run ESLint
  "preview": "vite preview"        // Preview production build
}
```

### **Project Structure**
```
hr-insight/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── landing/       # Landing page components
│   │   ├── auth/          # Authentication components
│   │   └── ...
│   ├── pages/             # Page components (32 pages)
│   ├── services/          # API service layer (9 services)
│   ├── contexts/          # React contexts (Auth)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and helpers
│   ├── types/             # TypeScript type definitions
│   └── integrations/      # External service integrations
├── supabase/
│   └── migrations/        # Database migrations (11 files)
├── bun.lockb              # Dependency lock file
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── eslint.config.js       # ESLint configuration
└── components.json        # shadcn/ui configuration
```

---

## 📈 Key Features Implementation Details

### **1. SIPMAA HR Framework**
The platform implements 6 core HR domains:
1. **Talent Acquisition & Onboarding**
2. **Performance Management**
3. **Learning & Development**
4. **Employee Engagement & Culture**
5. **CSR & Social Impact**
6. **Organizational Climate**

### **2. Assessment Engine**
- **Question Types**: Likert scale, Yes/No, Numeric input, Multiple choice
- **Scoring Algorithm**: Weighted scoring with category aggregation
- **Real-time Saving**: Auto-save responses to prevent data loss
- **Progress Tracking**: Visual progress indicators

### **3. Certification System**
- **Automated Issuance**: Based on assessment scores
- **Verification Codes**: Unique codes for certificate validation
- **PDF Generation**: Professional certificate creation
- **Expiry Management**: 2-year certificate validity

### **4. Benchmarking System**
- **Industry Comparisons**: Static benchmark data
- **Radar Charts**: Multi-dimensional performance visualization
- **Leaderboard**: Competitive ranking system
- **Gap Analysis**: Performance improvement identification

### **5. Action Planning**
- **Automated Generation**: Based on assessment weaknesses
- **Priority Classification**: High/Medium/Low priority levels
- **Status Tracking**: Implementation progress monitoring
- **Assignment System**: Team member task assignment

### **6. Real-time Features**
- **Live Updates**: Supabase real-time subscriptions
- **Collaborative Editing**: Multi-user assessment support
- **Notification System**: Toast notifications for user feedback

### **7. PDF Report Generation**
- **Assessment Reports**: Detailed performance analysis
- **Certification Documents**: Professional certificate PDFs
- **Analytics Reports**: Visual data exports

---

## 🔒 Security Implementation

### **Authentication Security**
- JWT tokens with automatic refresh
- Password complexity requirements
- Email verification for new accounts
- Session timeout handling

### **Authorization**
- Role-based access control (RBAC)
- Database-level row security (RLS)
- API endpoint protection
- Route-level protection

### **Data Protection**
- Sensitive data encryption
- Secure file upload handling
- Input validation and sanitization
- XSS protection

---

## 📊 Performance & Scalability

### **Frontend Optimization**
- Code splitting with Vite
- Lazy loading for routes
- Optimized bundle size
- Efficient re-rendering with React.memo

### **Database Optimization**
- Indexed queries for performance
- Efficient data fetching patterns
- Real-time subscriptions for live updates
- Connection pooling

### **Caching Strategy**
- React Query for server state caching
- Browser caching for static assets
- CDN integration for global distribution

---

## 🧪 Testing Strategy

### **Testing Types**
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API service layer testing
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Load and stress testing

### **Testing Tools**
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing
- **Lighthouse**: Performance auditing

---

## 🚀 Deployment & Production

### **Build Process**
```bash
# Production build
npm run build

# Preview production build
npm run preview
```

### **Environment Setup**
- Production Supabase project
- Environment variable configuration
- SSL certificate setup
- CDN configuration

### **Deployment Platforms**
- **Vercel**: Recommended for React apps
- **Netlify**: Alternative deployment option
- **Docker**: Containerized deployment
- **AWS/GCP**: Cloud platform deployment

---

## 📚 API Reference

### **Supabase Client Configuration**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

### **Common API Patterns**
```typescript
// Data fetching with error handling
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value');

if (error) throw error;

// Real-time subscriptions
const channel = supabase
  .channel('table_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_name'
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

---

## 🤝 Contributing

### **Development Guidelines**
1. Follow TypeScript strict mode
2. Use ESLint rules
3. Write comprehensive commit messages
4. Test all changes
5. Update documentation

### **Code Style**
- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices
- Use TypeScript interfaces for all data structures

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

## 🔄 Version History

### **v1.0.0** - Initial Release
- Complete HR assessment platform
- 6 SIPMAA domain framework
- Certification system
- Benchmarking capabilities
- Action planning features
- Multi-tenant architecture
- Role-based access control

---

*This README provides comprehensive documentation for the HR-Insight platform, covering all technical aspects, features, and implementation details for examination purposes.*

Ensure you have the following installed:
-   [Node.js](https://nodejs.org/) (v18 or higher recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)

## ⚡ Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd people-pulse-peak
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (if not already present). The application requires the following Supabase configuration:

```env
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"
```

> **Note**: These keys are required for authentication and database connectivity.

### 4. Run the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:8080` (or the port shown in your terminal).

## 🧪 Build for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```
