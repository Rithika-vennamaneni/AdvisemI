import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { SkillGapDashboard } from '@/components/planner/SkillGapDashboard';
import { ProgressSummary } from '@/components/planner/ProgressSummary';
import { CourseTile } from '@/components/planner/CourseTile';
import { SemesterPlanDropZone } from '@/components/planner/SemesterPlanDropZone';
import { 
  mockProfile,
  mockGapSkills, 
  mockSkills,
  getRecommendationsWithCourses,
  getCourseById,
  courseSkillBoosts,
} from '@/data/mockData';
import type { Course } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const MAX_COURSES = 4;
const MAX_CREDITS = 16;

export default function Planner() {
  const { toast } = useToast();
  const [plannedCourseIds, setPlannedCourseIds] = useState<string[]>([]);
  const [skillScores, setSkillScores] = useState<Record<string, number>>(() => {
    const scores: Record<string, number> = {};
    mockSkills.forEach(s => {
      scores[s.skill_name] = s.score;
    });
    // Map gap skills that might have different names
    scores['SQL/Databases'] = scores['SQL'] || 0.45;
    return scores;
  });
  const [boostedSkills, setBoostedSkills] = useState<string[]>([]);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [matchImprovement, setMatchImprovement] = useState(0);

  const recommendations = getRecommendationsWithCourses();
  
  const plannedCourses: Course[] = plannedCourseIds
    .map(id => getCourseById(id))
    .filter((c): c is Course => c !== undefined);

  const totalCredits = plannedCourses.reduce((sum, c) => sum + c.credits, 0);

  const addCourse = useCallback((courseId: string) => {
    if (plannedCourseIds.includes(courseId)) return;
    if (plannedCourseIds.length >= MAX_COURSES) {
      toast({
        title: "Maximum courses reached",
        description: `You can only add up to ${MAX_COURSES} courses per semester.`,
        variant: "destructive",
      });
      return;
    }

    const course = getCourseById(courseId);
    if (!course) return;

    if (totalCredits + course.credits > MAX_CREDITS) {
      toast({
        title: "Credit limit exceeded",
        description: `Adding this course would exceed the ${MAX_CREDITS} credit limit.`,
        variant: "destructive",
      });
      return;
    }

    setPlannedCourseIds(prev => [...prev, courseId]);
    setNewlyAddedId(courseId);

    // Apply skill boosts
    const boosts = courseSkillBoosts[courseId];
    if (boosts) {
      const boostedSkillNames = Object.keys(boosts);
      setBoostedSkills(boostedSkillNames);
      
      setSkillScores(prev => {
        const updated = { ...prev };
        let totalBoost = 0;
        boostedSkillNames.forEach(skill => {
          updated[skill] = Math.min(1, (updated[skill] || 0) + boosts[skill]);
          totalBoost += Math.round(boosts[skill] * 100);
        });
        setMatchImprovement(prev => prev + Math.round(totalBoost / boostedSkillNames.length));
        return updated;
      });

      // Show toast with skill improvements
      const boostMessages = boostedSkillNames.map(skill => 
        `${skill} +${Math.round(boosts[skill] * 100)}%`
      ).join(', ');
      
      toast({
        title: `Added ${course.subject} ${course.number}`,
        description: boostMessages,
      });

      // Clear boost highlight after animation
      setTimeout(() => setBoostedSkills([]), 1500);
    } else {
      toast({
        title: `Added ${course.subject} ${course.number}`,
        description: course.title,
      });
    }

    // Clear newly added highlight
    setTimeout(() => setNewlyAddedId(null), 500);
  }, [plannedCourseIds, totalCredits, toast]);

  const removeCourse = useCallback((courseId: string) => {
    const course = getCourseById(courseId);
    if (!course) return;

    setPlannedCourseIds(prev => prev.filter(id => id !== courseId));

    // Reverse skill boosts
    const boosts = courseSkillBoosts[courseId];
    if (boosts) {
      const boostedSkillNames = Object.keys(boosts);
      
      setSkillScores(prev => {
        const updated = { ...prev };
        let totalBoost = 0;
        boostedSkillNames.forEach(skill => {
          updated[skill] = Math.max(0, (updated[skill] || 0) - boosts[skill]);
          totalBoost += Math.round(boosts[skill] * 100);
        });
        setMatchImprovement(prev => Math.max(0, prev - Math.round(totalBoost / boostedSkillNames.length)));
        return updated;
      });
    }

    toast({
      title: `Removed ${course.subject} ${course.number}`,
      description: course.title,
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Plan Your Semester
          </h1>
          <p className="text-muted-foreground">
            Target: <span className="font-medium text-foreground">{mockProfile.dream_role}</span>
          </p>
        </div>

        {/* Dashboard Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SkillGapDashboard 
            gapSkills={mockGapSkills} 
            skillScores={skillScores}
            boostedSkills={boostedSkills}
          />
          <ProgressSummary
            coursesAdded={plannedCourseIds.length}
            maxCourses={MAX_COURSES}
            creditsPlanned={totalCredits}
            maxCredits={MAX_CREDITS}
            matchImprovement={matchImprovement}
          />
        </div>

        {/* Planning Board */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommended Courses */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recommended Courses</h2>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <CourseTile
                  key={rec.id}
                  course={rec.course}
                  recommendation={rec}
                  onAdd={addCourse}
                  isAdded={plannedCourseIds.includes(rec.course.id)}
                />
              ))}
            </div>
          </div>

          {/* Semester Plan */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SemesterPlanDropZone
              term={mockProfile.term}
              courses={plannedCourses}
              onDrop={addCourse}
              onRemove={removeCourse}
              newlyAddedId={newlyAddedId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
