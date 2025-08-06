# EU Tender Platform - Denmark

A comprehensive tender management platform for public entities to conduct EU tenders in Denmark, compatible with ESPD and TED (Tenders Electronic Daily).

## 🚀 Features

### Core Functionality
- **Tender Management**: Create, edit, and manage tender documents
- **ESPD Integration**: European Single Procurement Document support
- **TED Compatibility**: Integration with Tenders Electronic Daily
- **Supplier Portal**: Registration and qualification management
- **Document Management**: Secure document upload and version control
- **Notification System**: Real-time alerts and email notifications
- **Search & Filter**: Advanced search capabilities for tenders
- **Dashboard**: Analytics and reporting for public entities

### Technical Stack
- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **File Storage**: Supabase Storage
- **Email**: Resend or Supabase Edge Functions

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd eu-tender-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations
   - Set up storage buckets

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utility functions
│   ├── supabase/         # Supabase client
│   ├── utils/            # Helper functions
│   └── validations/      # Zod schemas
├── types/                # TypeScript types
└── hooks/                # Custom React hooks
```

## 🎯 Key Features Implementation

### 1. Tender Management
- Create and edit tender documents
- ESPD form generation and validation
- Document version control
- Approval workflows

### 2. Supplier Portal
- Registration and profile management
- Qualification assessment
- Document submission
- Bid management

### 3. ESPD Integration
- European Single Procurement Document
- XML export/import
- Validation against EU standards

### 4. TED Integration
- Tenders Electronic Daily compatibility
- XML format support
- Automated publishing

### 5. Search & Discovery
- Advanced search filters
- Category-based browsing
- Saved searches
- Email alerts

## 🔧 Development

### Database Schema
The platform uses the following main tables:
- `tenders` - Tender information
- `suppliers` - Supplier profiles
- `documents` - Document storage
- `bids` - Bid submissions
- `notifications` - User notifications

### API Routes
- `/api/tenders` - Tender CRUD operations
- `/api/suppliers` - Supplier management
- `/api/documents` - Document handling
- `/api/espd` - ESPD generation
- `/api/ted` - TED integration

## 🚀 Deployment

1. **Vercel Deployment**
   ```bash
   npm run build
   vercel --prod
   ```

2. **Environment Setup**
   - Configure production environment variables
   - Set up custom domains
   - Configure Supabase production project

## 📚 Documentation

- [EU Tender Regulations](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32014L0024)
- [ESPD Documentation](https://ec.europa.eu/growth/single-market/public-procurement/digital-procurement/espd_en)
- [TED Guidelines](https://ted.europa.eu/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository. 