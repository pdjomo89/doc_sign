import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Trash2, FileText, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createDocument } from '@/lib/api';

export default function NewDocument() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [signers, setSigners] = useState([{ name: '', email: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addSigner = () => setSigners([...signers, { name: '', email: '' }]);

  const removeSigner = (index) => {
    if (signers.length > 1) setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index, field, value) => {
    const updated = [...signers];
    updated[index][field] = value;
    setSigners(updated);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      if (!title) setTitle(selected.name.replace('.pdf', ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validSigners = signers.filter(s => s.name && s.email);
    if (!file || !title || !ownerName || !ownerEmail || validSigners.length === 0) {
      setError('Please fill in all fields and add at least one signer.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('ownerName', ownerName);
      formData.append('ownerEmail', ownerEmail);
      formData.append('signers', JSON.stringify(validSigners));

      const result = await createDocument(formData);
      navigate(`/document/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Document</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload PDF</CardTitle>
            <CardDescription>Select the document that needs to be signed</CardDescription>
          </CardHeader>
          <CardContent>
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer hover:bg-accent/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload PDF</span>
                <span className="text-xs text-muted-foreground mt-1">Max 20MB</span>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <FileText className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Document Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Rental Agreement" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Name</label>
                <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Email</label>
                <Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="john@example.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signers</CardTitle>
            <CardDescription>Add the people who need to sign this document</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {signers.map((signer, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {i + 1}
                </div>
                <Input
                  placeholder="Name"
                  value={signer.name}
                  onChange={e => updateSigner(i, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={signer.email}
                  onChange={e => updateSigner(i, 'email', e.target.value)}
                  className="flex-1"
                />
                {signers.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSigner(i)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full mt-2" onClick={addSigner}>
              <Plus className="w-4 h-4 mr-2" />
              Add Signer
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
        )}

        <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send for Signing
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
