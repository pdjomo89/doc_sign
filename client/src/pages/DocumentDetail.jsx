import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, Download, ArrowLeft, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchDocument } from '@/lib/api';

export default function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchDocument(id)
      .then(setDoc)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const copySignLink = (signer) => {
    navigator.clipboard.writeText(`${window.location.origin}/sign/${signer.token}`);
    setCopied(signer.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doc) {
    return <div className="text-center py-20 text-muted-foreground">Document not found.</div>;
  }

  const signedCount = doc.signers.filter(s => s.status === 'signed').length;
  const isCompleted = doc.status === 'completed';

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 no-underline">
        <ArrowLeft className="w-4 h-4" />
        Back to Documents
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Created {new Date(doc.created_at).toLocaleDateString()} &middot; {doc.filename}
          </p>
        </div>
        <Badge variant={isCompleted ? 'success' : 'warning'} className="text-sm px-3 py-1">
          {isCompleted ? (
            <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed</>
          ) : (
            <><Clock className="w-3.5 h-3.5 mr-1" /> {signedCount}/{doc.signers.length} Signed</>
          )}
        </Badge>
      </div>

      {/* Progress */}
      <div className="w-full bg-secondary rounded-full h-2 mb-8">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${(signedCount / doc.signers.length) * 100}%` }}
        />
      </div>

      {/* Signers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Signers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {doc.signers.map((signer) => (
            <div key={signer.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
              <div className="flex items-center gap-3">
                {signer.status === 'signed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{signer.name}</p>
                  <p className="text-xs text-muted-foreground">{signer.email}</p>
                  {signer.signed_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Signed {new Date(signer.signed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              {signer.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copySignLink(signer)}
                  className="shrink-0"
                >
                  {copied === signer.id ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1" /> Copy Link</>
                  )}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <a href={`/api/documents/${doc.id}/download`} className="flex-1">
          <Button variant={isCompleted ? 'default' : 'outline'} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            {isCompleted ? 'Download Signed PDF' : 'Download Original'}
          </Button>
        </a>
      </div>
    </div>
  );
}
