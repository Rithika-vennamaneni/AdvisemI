import { useState } from 'react';
import { Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { SkillChip } from '@/components/skills/SkillChip';
import { mockProfile, mockSkills } from '@/data/mockData';
import type { Skill } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const termOptions = [
  { value: '2025-fall', label: 'Fall 2025' },
  { value: '2026-spring', label: 'Spring 2026' },
  { value: '2026-fall', label: 'Fall 2026' },
  { value: '2027-spring', label: 'Spring 2027' },
];

export default function Profile() {
  const { toast } = useToast();
  const [dreamRole, setDreamRole] = useState(mockProfile.dream_role);
  const [term, setTerm] = useState(mockProfile.term);
  const [skills, setSkills] = useState<Skill[]>(mockSkills);

  const handleUpdateSkill = (id: string, name: string) => {
    setSkills(prev => prev.map(s => 
      s.id === id ? { ...s, skill_name: name } : s
    ));
  };

  const handleRemoveSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = () => {
    toast({
      title: "Profile saved",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">Manage your career goals and skills</p>
          </div>
        </div>

        {/* Career Goals */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Career Goals</CardTitle>
            <CardDescription>
              Set your target role and graduation timeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dream-role">Dream Role</Label>
              <Input
                id="dream-role"
                value={dreamRole}
                onChange={(e) => setDreamRole(e.target.value)}
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Target Graduation Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger id="term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {termOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Skills</CardTitle>
            <CardDescription>
              Edit or remove skills extracted from your resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <SkillChip
                  key={skill.id}
                  skill={skill}
                  onUpdate={handleUpdateSkill}
                  onRemove={handleRemoveSkill}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </main>
    </div>
  );
}
