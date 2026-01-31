import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { SkillChip } from '@/components/skills/SkillChip';
import { mockSkills } from '@/data/mockData';
import type { Skill } from '@/types/database';

type SkillCategory = 'technical' | 'tools' | 'frameworks';

const categorizeSkills = (skills: Skill[]): Record<SkillCategory, Skill[]> => {
  const categories: Record<SkillCategory, string[]> = {
    technical: ['Python', 'JavaScript', 'SQL', 'Algorithms', 'System Design', 'Distributed Systems'],
    frameworks: ['React'],
    tools: ['Git'],
  };
  
  const result: Record<SkillCategory, Skill[]> = {
    technical: [],
    tools: [],
    frameworks: [],
  };
  
  skills.forEach(skill => {
    if (categories.tools.includes(skill.skill_name)) {
      result.tools.push(skill);
    } else if (categories.frameworks.includes(skill.skill_name)) {
      result.frameworks.push(skill);
    } else {
      result.technical.push(skill);
    }
  });
  
  return result;
};

const categoryLabels: Record<SkillCategory, string> = {
  technical: 'Technical Skills',
  frameworks: 'Frameworks & Libraries',
  tools: 'Tools & Platforms',
};

export default function SkillsReview() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>(mockSkills);
  const [newSkill, setNewSkill] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<SkillCategory | null>(null);

  const categorizedSkills = categorizeSkills(skills);

  const handleUpdateSkill = (id: string, name: string) => {
    setSkills(prev => prev.map(s => 
      s.id === id ? { ...s, skill_name: name } : s
    ));
  };

  const handleRemoveSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSkill = (category: SkillCategory) => {
    if (!newSkill.trim()) return;
    
    const skill: Skill = {
      id: `skill-new-${Date.now()}`,
      user_id: 'user-demo-123',
      source: 'resume',
      skill_name: newSkill.trim(),
      score: 0.5,
      evidence: 'Added manually',
      created_at: new Date().toISOString(),
    };
    
    setSkills(prev => [...prev, skill]);
    setNewSkill('');
    setAddingToCategory(null);
  };

  const totalSkills = skills.length;
  const strongSkills = skills.filter(s => s.score > 0.7).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              Review Your Skills
            </h1>
            <p className="text-muted-foreground">
              We extracted {totalSkills} skills from your resume. Edit or add more below.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              {strongSkills} strong skills
            </span>
          </div>
        </div>

        {/* Skill Categories */}
        <div className="space-y-6 mb-8">
          {(Object.keys(categorizedSkills) as SkillCategory[]).map(category => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{categoryLabels[category]}</CardTitle>
                <CardDescription>
                  {categorizedSkills[category].length} skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {categorizedSkills[category].map(skill => (
                    <SkillChip
                      key={skill.id}
                      skill={skill}
                      onUpdate={handleUpdateSkill}
                      onRemove={handleRemoveSkill}
                    />
                  ))}
                  
                  {categorizedSkills[category].length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No skills in this category yet
                    </p>
                  )}
                </div>
                
                {addingToCategory === category ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSkill(category);
                        if (e.key === 'Escape') setAddingToCategory(null);
                      }}
                      placeholder="Enter skill name..."
                      className="max-w-xs"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleAddSkill(category)}>
                      Add
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setAddingToCategory(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddingToCategory(category)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add skill
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          <Button onClick={() => navigate('/planner')}>
            Continue to Planner
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}
