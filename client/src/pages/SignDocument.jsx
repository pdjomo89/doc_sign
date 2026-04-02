import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { PenLine, CheckCircle2, RotateCcw, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchSigningInfo, submitSignature } from '@/lib/api';

export default function SignDocument() {
  const { token } = useParams();
  const navigate = useNavigate();
  const sigPad = useRef(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    fetchSigningInfo(token)
      .then(data => {
        setInfo(data);
        if (data.signer.status === 'signed') setDone(true);
      })
      .catch(() => setError('This signing link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const clearSignature = () => {
    sigPad.current.clear();
    setHasSigned(false);
  };

  const handleSign = async () => {
    if (sigPad.current.isEmpty()) {
      setError('Please draw your signature first.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      const result = await submitSignature(token, signatureData);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Signature Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you, {info.signer.name}. Your signature on "{info.document.title}" has been recorded.
              You'll receive a copy once all parties have signed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <PenLine className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-xl text-primary">DocSign</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Document Info */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{info.document.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Sent by {info.document.owner_name} &middot; Signing as {info.signer.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Document Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <iframe
                src={`${info.pdfUrl}#toolbar=1`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Signature</CardTitle>
            <CardDescription>Draw your signature in the box below</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white">
              <SignatureCanvas
                ref={sigPad}
                penColor="#1a1a2e"
                canvasProps={{
                  width: 600,
                  height: 200,
                  className: 'w-full',
                  style: { width: '100%', height: '200px' },
                }}
                onEnd={() => setHasSigned(true)}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <Button variant="ghost" size="sm" onClick={clearSignature}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <span className="text-xs text-muted-foreground">
                By signing, you agree to the contents of this document.
              </span>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm mb-4">{error}</div>
        )}

        <Button
          className="w-full h-12 text-base"
          onClick={handleSign}
          disabled={submitting || !hasSigned}
        >
          {submitting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Sign Document
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
