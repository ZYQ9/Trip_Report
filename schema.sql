-- Trip Report flat table: one row = one meeting
CREATE TABLE IF NOT EXISTS trip_reports (
    id              SERIAL PRIMARY KEY,
    customer        VARCHAR(255) NOT NULL,
    ae              VARCHAR(255) NOT NULL,
    meeting_date    DATE NOT NULL,
    topic           VARCHAR(500) NOT NULL,
    full_report_text TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes for search performance
CREATE INDEX idx_trip_reports_customer ON trip_reports (customer);
CREATE INDEX idx_trip_reports_ae ON trip_reports (ae);
CREATE INDEX idx_trip_reports_meeting_date ON trip_reports (meeting_date);
CREATE INDEX idx_trip_reports_topic ON trip_reports USING gin (to_tsvector('english', topic));
