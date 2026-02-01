import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { SkillCard } from '@/components/skills/SkillCard';
import { mockSkills } from '@/data/mockData';
import type { Skill } from '@/types/database';
import type { SkillsReviewLocationState } from '@/types/navigation';
import type { CanonicalSkillCategory } from '@/types/resumeParser';
import { updateSkillLevels, type SkillLevelUpdate } from '@/lib/skillsApi';
import { useToast } from '@/hooks/use-toast';

export default function SkillsReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as SkillsReviewLocationState;
  const parsedResume = state.parsedResume;
  const runId = state.run_id ?? null;
  const userId = state.user_id ?? null;
  const { toast } = useToast();

  const parsedSkills = useMemo(() => {
    if (!parsedResume?.canonical_skills) return null;

    const skills: Skill[] = [];
    const now = new Date().toISOString();

    const categories = Object.keys(parsedResume.canonical_skills) as CanonicalSkillCategory[];
    for (const category of categories) {
      const items = parsedResume.canonical_skills[category] || [];
      for (const name of items) {
        const trimmed = (name || '').trim();
        if (!trimmed) continue;
        skills.push({
          id: `resume-${category}-${trimmed.toLowerCase().replace(/\s+/g, '-')}`,
          user_id: 'user-demo-123',
          source: 'resume',
          skill_name: trimmed,
          score: 0.6,
          evidence: `Extracted from resume (${category.replace(/_/g, ' ')})`,
          created_at: now,
        });
      }
    }

    const seen = new Set<string>();
    return skills.filter((s) => {
      const key = s.skill_name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [parsedResume]);

  const [skills, setSkills] = useState<Skill[]>(parsedSkills ?? mockSkills);
  const [newSkillName, setNewSkillName] = useState('');
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  useEffect(() => {
    if (parsedSkills) {
      setSkills(parsedSkills);
    }
  }, [parsedSkills]);

  const handleUpdateSkill = (id: string, updates: Partial<Skill>) => {
    setSkills(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const handleRemoveSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveLevels = async () => {
    if (!userId || !runId) {
      toast({ title: 'Cannot save yet', description: 'Missing user or run id.' });
      return;
    }

    const updates: SkillLevelUpdate[] = skills
      .filter((skill) => skill.source === 'resume' && skill.expertise_level)
      .map((skill) => ({
        skill_name: skill.skill_name,
        expertise_level: skill.expertise_level as SkillLevelUpdate['expertise_level']
      }));

    if (updates.length === 0) {
      toast({ title: 'No changes to save', description: 'Adjust a skill level first.' });
      return;
    }

    try {
      const response = await updateSkillLevels(userId, runId, updates);
      toast({ title: 'Skills saved', description: `${response.updated_count} skill levels updated.` });
      if (response.not_found.length > 0) {
        toast({ title: 'Some skills not found', description: response.not_found.join(', ') });
      }
    } catch (error) {
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    
    const skill: Skill = {
      id: `skill-new-${Date.now()}`,
      user_id: 'user-demo-123',
      source: 'resume',
      skill_name: newSkillName.trim(),
      score: 0.5,
      evidence: 'Added by you',
      created_at: new Date().toISOString(),
    };
    
    setSkills(prev => [...prev, skill]);
    setNewSkillName('');
    setIsAddingSkill(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      
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
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSaveLevels}>
              Save Skill Levels
            </Button>
            <Button size="lg" onClick={() => navigate('/planner')} className="rounded-full px-8 gap-2">
            See Recommended Courses
            <ArrowRight className="w-4 h-4" />
          </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
