import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, Users, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchDocuments } from '@/lib/api';

const statusConfig = {
  pending: { label: 'Awaiting Signatures', variant: 'warning', icon: Clock },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
};

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No documents yet</h2>
        <p className="text-muted-foreground mb-6">Upload your first document and start collecting signatures.</p>
        <Link to="/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Documents</h1>
      <div className="grid gap-4">
        {documents.map(doc => {
          const config = statusConfig[doc.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          const signedCount = doc.signers.filter(s => s.status === 'signed').length;

          return (
            <Link key={doc.id} to={`/document/${doc.id}`} className="no-underline">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {doc.filename} &middot; Created {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>{signedCount}/{doc.signers.length} signed</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={config.variant}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
