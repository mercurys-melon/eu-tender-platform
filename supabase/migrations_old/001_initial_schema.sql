-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE tender_status AS ENUM ('draft', 'published', 'closed', 'awarded');
CREATE TYPE supplier_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE bid_status AS ENUM ('submitted', 'under_review', 'accepted', 'rejected');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Create tenders table
CREATE TABLE tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    estimated_value DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'DKK',
    submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    publication_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status tender_status NOT NULL DEFAULT 'draft',
    espd_required BOOLEAN NOT NULL DEFAULT true,
    ted_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name VARCHAR(100) NOT NULL,
    cvr_number VARCHAR(8) NOT NULL UNIQUE,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    postal_code VARCHAR(4) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'Danmark',
    categories TEXT[] NOT NULL DEFAULT '{}',
    qualifications TEXT[] DEFAULT '{}',
    documents TEXT[] DEFAULT '{}',
    status supplier_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bids table
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'DKK',
    documents TEXT[] DEFAULT '{}',
    espd_data JSONB,
    status bid_status NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    size BIGINT NOT NULL,
    url TEXT NOT NULL,
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_category ON tenders(category);
CREATE INDEX idx_tenders_deadline ON tenders(submission_deadline);
CREATE INDEX idx_tenders_entity ON tenders(entity_id);

CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_cvr ON suppliers(cvr_number);
CREATE INDEX idx_suppliers_categories ON suppliers USING GIN(categories);

CREATE INDEX idx_bids_tender ON bids(tender_id);
CREATE INDEX idx_bids_supplier ON bids(supplier_id);
CREATE INDEX idx_bids_status ON bids(status);

CREATE INDEX idx_documents_tender ON documents(tender_id);
CREATE INDEX idx_documents_supplier ON documents(supplier_id);
CREATE INDEX idx_documents_bid ON documents(bid_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON tenders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Tenders policies
CREATE POLICY "Tenders are viewable by everyone" ON tenders
    FOR SELECT USING (true);

CREATE POLICY "Tenders are insertable by authenticated users" ON tenders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tenders are updatable by owner" ON tenders
    FOR UPDATE USING (auth.uid()::text = entity_id);

-- Suppliers policies
CREATE POLICY "Suppliers are viewable by owner" ON suppliers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Suppliers are insertable by authenticated users" ON suppliers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Suppliers are updatable by owner" ON suppliers
    FOR UPDATE USING (auth.uid() = user_id);

-- Bids policies
CREATE POLICY "Bids are viewable by owner and tender entity" ON bids
    FOR SELECT USING (
        auth.uid() = supplier_id OR 
        EXISTS (
            SELECT 1 FROM tenders 
            WHERE tenders.id = bids.tender_id 
            AND tenders.entity_id = auth.uid()::text
        )
    );

CREATE POLICY "Bids are insertable by authenticated suppliers" ON bids
    FOR INSERT WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Bids are updatable by owner" ON bids
    FOR UPDATE USING (auth.uid() = supplier_id);

-- Documents policies
CREATE POLICY "Documents are viewable by related parties" ON documents
    FOR SELECT USING (
        auth.uid() = uploaded_by OR
        auth.uid() = supplier_id OR
        EXISTS (
            SELECT 1 FROM tenders 
            WHERE tenders.id = documents.tender_id 
            AND tenders.entity_id = auth.uid()::text
        )
    );

CREATE POLICY "Documents are insertable by authenticated users" ON documents
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Notifications policies
CREATE POLICY "Notifications are viewable by owner" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notifications are insertable by system" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Notifications are updatable by owner" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('tender-documents', 'tender-documents', false),
('supplier-documents', 'supplier-documents', false),
('bid-documents', 'bid-documents', false);

-- Create storage policies
CREATE POLICY "Tender documents are accessible by tender entity" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'tender-documents' AND
        EXISTS (
            SELECT 1 FROM tenders 
            WHERE tenders.id::text = (storage.foldername(name))[1]
            AND tenders.entity_id = auth.uid()::text
        )
    );

CREATE POLICY "Supplier documents are accessible by owner" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'supplier-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Bid documents are accessible by bid owner" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'bid-documents' AND
        EXISTS (
            SELECT 1 FROM bids 
            WHERE bids.id::text = (storage.foldername(name))[1]
            AND bids.supplier_id = auth.uid()
        )
    );

-- Insert sample data
INSERT INTO tenders (title, description, entity_id, category, estimated_value, currency, submission_deadline, publication_date, status) VALUES
('IT Konsulentydelser', 'Søger IT konsulenter til udvikling af nye digitale løsninger', 'Københavns Kommune', 'IT Services', 500000, 'DKK', '2024-12-31 23:59:59+00', '2024-01-01 00:00:00+00', 'published'),
('Byggeprojekt - Skole', 'Nyt skolebyggeri i København', 'Københavns Kommune', 'Construction', 25000000, 'DKK', '2024-11-30 23:59:59+00', '2024-01-15 00:00:00+00', 'published'),
('Rengøringstjenester', 'Rengøring af kommunale bygninger', 'Aarhus Kommune', 'Cleaning Services', 2000000, 'DKK', '2024-10-31 23:59:59+00', '2024-01-10 00:00:00+00', 'published'); 