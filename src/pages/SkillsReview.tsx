import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowRight, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { SkillCard, SkillWithLevel, scoreToLevel } from '@/components/skills/SkillCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SkillsReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('run_id');
  
  const [skills, setSkills] = useState<SkillWithLevel[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch skills for the current run
  useEffect(() => {
    async function fetchSkills() {
      if (!runId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('run_id', runId)
        .eq('source', 'resume');

      if (error) {
        console.error('Error fetching skills:', error);
        toast.error('Failed to load skills');
      } else if (data) {
        // Map DB rows to our type, initializing expertise_level from score if not set
        const mappedSkills: SkillWithLevel[] = data.map(s => ({
          id: s.id,
          user_id: s.user_id,
          source: s.source as 'resume' | 'market',
          skill_name: s.skill_name,
          score: s.score ?? 0.5,
          evidence: s.evidence ?? '',
          created_at: s.created_at,
          expertise_level: s.expertise_level || scoreToLevel(s.score ?? 0.5),
        }));
        setSkills(mappedSkills);
      }
      setIsLoading(false);
    }

    fetchSkills();
  }, [runId]);

  const handleUpdateSkill = (id: string, updates: Partial<SkillWithLevel>) => {
    setSkills(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const handleRemoveSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim() || !runId) return;
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error('Please log in to add skills');
      return;
    }

    const newSkill: SkillWithLevel = {
      id: `skill-new-${Date.now()}`,
      user_id: userData.user.id,
      source: 'resume',
      skill_name: newSkillName.trim(),
      score: 0.5,
      evidence: 'Added by you',
      created_at: new Date().toISOString(),
      expertise_level: 'Intermediate',
    };
    
    setSkills(prev => [...prev, newSkill]);
    setNewSkillName('');
    setIsAddingSkill(false);
  };

  const handleContinue = async () => {
    if (!runId) {
      navigate('/planner');
      return;
    }

    setIsSaving(true);

    try {
      // Update each skill's expertise_level in Supabase
      const updates = skills.map(skill => 
        supabase
          .from('skills')
          .update({ expertise_level: skill.expertise_level })
          .eq('id', skill.id)
          .eq('source', 'resume')
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error('Errors updating skills:', errors);
        toast.error('Some skills failed to save');
      } else {
        toast.success('Skills saved successfully');
      }

      navigate(`/planner?run_id=${runId}`);
    } catch (error) {
      console.error('Error saving skills:', error);
      toast.error('Failed to save skills');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      
      {isLoading ? (
        <main className="container max-w-2xl px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
      ) : (
        <main className="container max-w-2xl px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Let's review your skills
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              We found {skills.length} skills in your resume. Adjust anything that doesn't look right.
            </p>
          </div>

          {/* Collaborative Message */}
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    The system suggests, you confirm
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    We've made our best guesses from your resume. Feel free to adjust skill levels — your input helps us recommend better courses.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills List */}
          <div className="space-y-4 mb-6">
            {skills.map(skill => (
              <div key={skill.id} className="group">
                <SkillCard
                  skill={skill}
                  onUpdate={handleUpdateSkill}
                  onRemove={handleRemoveSkill}
                />
              </div>
            ))}
          </div>

          {/* Add Skill */}
          {isAddingSkill ? (
            <Card className="mb-8">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSkill();
                      if (e.key === 'Escape') setIsAddingSkill(false);
                    }}
                    placeholder="Enter skill name..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button onClick={handleAddSkill} disabled={!newSkillName.trim()}>
                    Add Skill
                  </Button>
                  <Button variant="ghost" onClick={() => setIsAddingSkill(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingSkill(true)}
              className="w-full mb-8 h-12 border-dashed hover:border-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add a skill we missed
            </Button>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/upload')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              size="lg" 
              onClick={handleContinue} 
              disabled={isSaving}
              className="rounded-full px-8 gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  See Recommended Courses
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}
