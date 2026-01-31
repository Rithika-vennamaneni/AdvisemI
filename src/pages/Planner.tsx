import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { CareerProgress } from '@/components/planner/CareerProgress';
import { CourseRecommendationCard } from '@/components/planner/CourseRecommendationCard';
import { SemesterPlan } from '@/components/planner/SemesterPlan';
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
  const [boostedSkills, setBoostedSkills] = useState<string[]>([]);
  const [skillScores, setSkillScores] = useState<Record<string, number>>(() => {
    const scores: Record<string, number> = {};
    mockSkills.forEach(s => {
      scores[s.skill_name] = s.score;
    });
    scores['SQL/Databases'] = scores['SQL'] || 0.45;
    return scores;
  });

  const recommendations = getRecommendationsWithCourses();
  
  const plannedCourses: Course[] = plannedCourseIds
    .map(id => getCourseById(id))
    .filter((c): c is Course => c !== undefined);

  const totalCredits = plannedCourses.reduce((sum, c) => sum + c.credits, 0);

  const addCourse = useCallback((courseId: string) => {
    if (plannedCourseIds.includes(courseId)) return;
    if (plannedCourseIds.length >= MAX_COURSES) {
      toast({
        title: "Semester is full",
        description: `You can add up to ${MAX_COURSES} courses per semester.`,
        variant: "destructive",
      });
      return;
    }

    const course = getCourseById(courseId);
    if (!course) return;

    if (totalCredits + course.credits > MAX_CREDITS) {
      toast({
        title: "Credit limit reached",
        description: `This would exceed the ${MAX_CREDITS} credit limit.`,
        variant: "destructive",
      });
      return;
    }

    setPlannedCourseIds(prev => [...prev, courseId]);

    // Apply skill boosts
    const boosts = courseSkillBoosts[courseId];
    if (boosts) {
      // Track which skills are being boosted for animation
      const boostKeys = Object.keys(boosts);
      setBoostedSkills(boostKeys);
      
      // Clear boost highlight after animation
      setTimeout(() => setBoostedSkills([]), 1500);

      setSkillScores(prev => {
        const updated = { ...prev };
        Object.keys(boosts).forEach(skill => {
          updated[skill] = Math.min(1, (updated[skill] || 0) + boosts[skill]);
        });
        return updated;
      });

      // Show percentage boost toast
      const boostDescriptions = Object.entries(boosts)
        .map(([skill, boost]) => `${skill} +${Math.round(boost * 100)}%`)
        .join(', ');
      
      toast({
        title: `Added ${course.subject} ${course.number}`,
        description: boostDescriptions,
      });
    } else {
      toast({
        title: `Added ${course.subject} ${course.number}`,
        description: course.title,
      });
    }
  }, [plannedCourseIds, totalCredits, toast]);

  const removeCourse = useCallback((courseId: string) => {
    const course = getCourseById(courseId);
    if (!course) return;

    setPlannedCourseIds(prev => prev.filter(id => id !== courseId));

    const boosts = courseSkillBoosts[courseId];
    if (boosts) {
      // Track which skills are being reduced for animation
      const boostKeys = Object.keys(boosts);
      setBoostedSkills(boostKeys);
      setTimeout(() => setBoostedSkills([]), 1500);

      setSkillScores(prev => {
        const updated = { ...prev };
        Object.keys(boosts).forEach(skill => {
          updated[skill] = Math.max(0, (updated[skill] || 0) - boosts[skill]);
        });
        return updated;
      });

      const reduceDescriptions = Object.entries(boosts)
        .map(([skill, boost]) => `${skill} -${Math.round(boost * 100)}%`)
        .join(', ');
      
      toast({
        title: `Removed ${course.subject} ${course.number}`,
        description: reduceDescriptions,
      });
    } else {
      toast({
        title: `Removed ${course.subject} ${course.number}`,
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-6xl px-4 py-8">
        {/* Zone 1: Career Progress Overview */}
        <section className="mb-12">
          <CareerProgress 
            dreamRole={mockProfile.dream_role}
            gapSkills={mockGapSkills}
            skillScores={skillScores}
            boostedSkills={boostedSkills}
          />
        </section>

        {/* Zone 2 & 3: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Zone 2: Recommended Courses (Primary) */}
          <section className="lg:col-span-3 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Recommended for you</h2>
              <p className="text-sm text-muted-foreground">
                Based on your goal to become a {mockProfile.dream_role}, here are courses that will help you get there
              </p>
            </div>
            
            <div className="space-y-5">
              {recommendations.map((rec) => (
                <CourseRecommendationCard
                  key={rec.id}
                  course={rec.course}
                  recommendation={rec}
                  onAdd={addCourse}
                  isAdded={plannedCourseIds.includes(rec.course.id)}
                />
              ))}
            </div>
          </section>

          {/* Zone 3: Semester Plan */}
          <section className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <SemesterPlan
                term={mockProfile.term}
                courses={plannedCourses}
                onDrop={addCourse}
                onRemove={removeCourse}
                maxCredits={MAX_CREDITS}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
