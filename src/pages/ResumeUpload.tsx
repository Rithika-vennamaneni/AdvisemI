import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ChevronDown, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { parseResumePdf } from '@/lib/resumeParserApi';
import { getOrCreateGuestUserId } from '@/lib/guestSession';

export default function ResumeUpload() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isTextOpen, setIsTextOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.type.includes('document'))) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);

    try {
      // Backend integration: PDF upload -> POST ${VITE_RESUME_PARSER_URL}/parse
      if (!file) {
        throw new Error('Please upload a PDF resume to extract skills.');
      }

      const userId = await getOrCreateGuestUserId();
      const parsed = await parseResumePdf(file, { userId });
      console.log('Parsed resume payload (frontend):', parsed);

      // Backend integration: pass parsed JSON to the skills page
      navigate('/skills', { state: { parsedResume: parsed, run_id: parsed.run_id ?? null, user_id: parsed.user_id ?? userId } });
    } catch (e) {
      console.error('Resume parse failed:', e);
      setError(e instanceof Error ? e.message : 'Resume parse failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const canProceed = file || resumeText.trim().length > 50;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Let's build your career path
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload your resume and we'll extract your skills to find the perfect courses for your goals.
          </p>
        </div>

        {/* Upload Zone */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <label
              htmlFor="file-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              {file ? (
                <>
                  <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
                    <FileText className="w-7 h-7 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click or drag to replace
                  </p>
                </>
              ) : (
                <>
                  <div className={cn(
                    'flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-colors',
                    isDragging ? 'bg-primary/20' : 'bg-muted'
                  )}>
                    <Upload className={cn(
                      'w-7 h-7 transition-colors',
                      isDragging ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <p className="font-medium text-foreground">
                    Drop your resume here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse • PDF or Word
                  </p>
                </>
              )}
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </CardContent>
        </Card>

        {/* Text Fallback */}
        <Collapsible open={isTextOpen} onOpenChange={setIsTextOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span>Or paste your resume text</span>
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform',
                isTextOpen && 'rotate-180'
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Textarea
              placeholder="Paste your resume content here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[200px] resize-none"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Privacy Note */}
        <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 mb-8">
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Your resume is processed securely and only used to extract relevant skills. 
            We don't store the original file.
          </p>
        </div>

        {error ? (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleExtract}
            disabled={!canProceed || isExtracting}
          >
            {isExtracting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Extracting Skills...
              </>
            ) : (
              'Extract My Skills'
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/skills')}
          >
            Enter Skills Manually
          </Button>
        </div>
      </main>
    </div>
  );
}
