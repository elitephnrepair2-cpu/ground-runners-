import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Upload, CheckCircle, Store, User, Camera, Play, ArrowLeft, Search, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase, type Submission } from './supabase';

// --- PORTAL COMPONENT ---
function UploadPortal() {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    runnerName: '',
    businessName: '',
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mediaFiles.length === 0) return alert('Please select at least one photo or video.');
    
    setIsUploading(true);
    setErrorMsg('');
    
    try {
      const inserts = [];

      for (const file of mediaFiles) {
        // 1. Upload each to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('flyer-media')
          .upload(fileName, file);

        if (uploadError) throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('flyer-media')
          .getPublicUrl(uploadData.path);

        // Queue insertion
        inserts.push({
          runner_name: formData.runnerName,
          business_name: formData.businessName,
          media_type: file.type.startsWith('video') ? 'video' : 'image',
          media_url: publicUrl
        });
      }

      // 3. Insert all records into Database
      const { error: dbError } = await supabase
        .from('submissions')
        .insert(inserts);

      if (dbError) throw new Error(`Database error: ${dbError.message}`);
      
      setIsSuccess(true);
      setFormData({ runnerName: '', businessName: '' });
      setMediaFiles([]);
      setTimeout(() => setIsSuccess(false), 4000);
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="portal-container animate-fade-in">
      <header className="portal-header">
        <div className="logo-icon"><Camera size={32} /></div>
        <h1 className="gradient-text">Ground Runners</h1>
        <p>Proof of Distribution Tracker</p>
      </header>
      
      <main className="portal-main card">
        {isSuccess ? (
          <div className="success-state animate-slide-up">
            <CheckCircle size={64} className="success-icon" />
            <h2>Upload Successful!</h2>
            <p>Your work has been securely recorded.</p>
            <button className="btn-primary" onClick={() => setIsSuccess(false)}>Submit Another</button>
          </div>
        ) : (
          <form className="upload-form" onSubmit={handleSubmit}>
            {errorMsg && (
              <div style={{color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center'}}>
                {errorMsg}
                <br/>
                <small>Ensure you have connected your Supabase instance.</small>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="runnerName"><User size={16}/> Your Name / PIN</label>
              <input 
                type="text" 
                id="runnerName" 
                placeholder="Enter your identifier" 
                value={formData.runnerName}
                onChange={e => setFormData({...formData, runnerName: e.target.value})}
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="businessName"><Store size={16}/> Business Promoted</label>
              <input 
                type="text" 
                id="businessName" 
                placeholder="Which business flyers are these?" 
                value={formData.businessName}
                onChange={e => setFormData({...formData, businessName: e.target.value})}
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="media"><Upload size={16}/> Upload Photo or Video</label>
              <div 
                className={`file-upload-box ${mediaFiles.length > 0 ? 'has-file' : ''}`}
              >
                {mediaFiles.length > 0 ? (
                   <span className="file-name">{mediaFiles.length} file(s) selected</span>
                ) : (
                   <span>+ Tap to Select Multiple Media</span>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  id="media" 
                  multiple
                  accept="image/*,video/*" 
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      setMediaFiles(Array.from(e.target.files));
                    }
                  }}
                />
              </div>
            </div>

            <button type="submit" className={`btn-primary ${isUploading ? 'loading' : ''}`} disabled={isUploading}>
              {isUploading ? <><Loader2 size={16} className="animate-spin" style={{marginRight: '8px', animation: 'spin 1s linear infinite'}}/> Uploading...</> : 'Submit Info'}
            </button>
          </form>
        )}
      </main>

      <footer className="portal-footer">
        <Link to="/admin">Admin Login</Link>
      </footer>
    </div>
  );
}

// --- ADMIN COMPONENT ---
function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const filteredSubmissions = submissions.filter(sub => 
    sub.runner_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sub.business_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-container animate-fade-in">
      <header className="admin-header">
        <div className="admin-brand">
          <Camera className="text-accent" size={24}/>
          <h2>Dashboard</h2>
        </div>
        <Link to="/" className="btn-secondary"><ArrowLeft size={16} /> Back</Link>
      </header>
      
      <main className="admin-main">
        <div className="admin-controls">
          <div className="search-bar">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by runner or business..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {errorMsg && (
          <div style={{color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center'}}>
            Error loading data: {errorMsg}
          </div>
        )}

        {isLoading ? (
          <p className="empty-state">Loading submissions...</p>
        ) : (
          <>
            <h3 style={{ marginBottom: '1rem', marginTop: '1rem', color: 'var(--text-primary)' }}>Photos</h3>
            {filteredSubmissions.filter(sub => sub.media_type === 'image').length === 0 ? (
              <p className="empty-state card">No photos found.</p>
            ) : (
              <div className="submissions-grid">
                {filteredSubmissions.filter(sub => sub.media_type === 'image').map((sub, idx) => (
                  <div key={sub.id} className="submission-card card animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="media-container">
                      <img src={sub.media_url} alt="Proof" className="media-preview" />
                      <div className="media-badge">
                        <ImageIcon size={12}/>
                      </div>
                    </div>
                    <div className="submission-details">
                      <h3>{sub.business_name}</h3>
                      <p className="runner-tag"><User size={12}/> {sub.runner_name}</p>
                      <p className="date-tag">{new Date(sub.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ marginBottom: '1rem', marginTop: '2.5rem', color: 'var(--text-primary)' }}>Videos</h3>
            {filteredSubmissions.filter(sub => sub.media_type === 'video').length === 0 ? (
              <p className="empty-state card">No videos found.</p>
            ) : (
              <div className="submissions-grid">
                {filteredSubmissions.filter(sub => sub.media_type === 'video').map((sub, idx) => (
                  <div key={sub.id} className="submission-card card animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="media-container">
                      <video src={sub.media_url} controls className="media-preview" />
                      <div className="media-badge">
                        <Play size={12}/>
                      </div>
                    </div>
                    <div className="submission-details">
                      <h3>{sub.business_name}</h3>
                      <p className="runner-tag"><User size={12}/> {sub.runner_name}</p>
                      <p className="date-tag">{new Date(sub.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPortal />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
