# EU Tender Platform - Setup Guide

## 🚀 Quick Start

### 1. Install Node.js
First, install Node.js (v18 or higher) from [nodejs.org](https://nodejs.org/)

### 2. Install Dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Copy the environment template and fill in your values:
```bash
cp env.example .env.local
```

Edit `.env.local` with your actual values:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_FROM_EMAIL=noreply@yourdomain.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EU Tender Platform
```

### 4. Set up Supabase

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

#### Run Database Migrations
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Run the migration:
   ```bash
   supabase db push
   ```

### 5. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📁 Project Structure

```
eu-tender-platform/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Dashboard pages
│   │   ├── api/               # API routes
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # Reusable components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── forms/            # Form components
│   │   ├── layout/           # Layout components
│   │   └── tender-card.tsx   # Tender display component
│   ├── lib/                  # Utility functions
│   │   ├── supabase/         # Supabase client
│   │   ├── utils/            # Helper functions
│   │   └── validations/      # Zod schemas
│   ├── types/                # TypeScript types
│   └── hooks/                # Custom React hooks
├── supabase/                 # Database migrations
├── public/                   # Static assets
├── package.json              # Dependencies
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── next.config.js           # Next.js configuration
```

## 🔧 Key Features Implemented

### ✅ Completed
- [x] Project structure and configuration
- [x] Database schema with RLS policies
- [x] Supabase client setup
- [x] TypeScript types and interfaces
- [x] Validation schemas (Zod)
- [x] Utility functions for formatting
- [x] UI components (Button, Input, Card)
- [x] Tender card component
- [x] Landing page with modern design
- [x] Global styles and Tailwind configuration

### 🚧 Next Steps
- [ ] Authentication system
- [ ] Tender listing and search
- [ ] Tender creation and management
- [ ] Supplier registration
- [ ] Bid submission system
- [ ] ESPD integration
- [ ] TED integration
- [ ] Document upload system
- [ ] Notification system
- [ ] Dashboard for public entities
- [ ] Dashboard for suppliers

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate TypeScript types
npm run db:push          # Push migrations to Supabase
npm run db:reset         # Reset database

# Type checking
npm run type-check       # Run TypeScript compiler
```

## 📚 Documentation

### Database Schema
The platform uses the following main tables:
- `tenders` - Tender information and metadata
- `suppliers` - Supplier profiles and qualifications
- `bids` - Bid submissions and ESPD data
- `documents` - File storage and management
- `notifications` - User notifications and alerts

### API Routes
- `/api/tenders` - Tender CRUD operations
- `/api/suppliers` - Supplier management
- `/api/documents` - Document handling
- `/api/espd` - ESPD generation and validation
- `/api/ted` - TED integration

### Authentication
The platform uses Supabase Auth with the following features:
- Email/password authentication
- Row Level Security (RLS) policies
- Role-based access control
- Session management

## 🚀 Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Environment Variables for Production
Make sure to set these in your Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## 🔒 Security Features

- Row Level Security (RLS) on all tables
- Input validation with Zod schemas
- XSS protection with proper headers
- CSRF protection
- Secure file upload with size and type validation
- Environment variable validation

## 📞 Support

For questions and support:
1. Check the documentation in `/docs`
2. Create an issue on GitHub
3. Contact the development team

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Basic project setup
- [x] Database schema
- [x] UI components
- [ ] Authentication system
- [ ] Basic tender listing

### Phase 2
- [ ] Tender management
- [ ] Supplier portal
- [ ] Bid submission
- [ ] Document upload

### Phase 3
- [ ] ESPD integration
- [ ] TED integration
- [ ] Advanced search
- [ ] Analytics dashboard

### Phase 4
- [ ] Advanced features
- [ ] Mobile app
- [ ] API documentation
- [ ] Performance optimization 