import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { CareerProgress } from '@/components/planner/CareerProgress';
import { CourseRecommendationCard } from '@/components/planner/CourseRecommendationCard';
import { SemesterPlan } from '@/components/planner/SemesterPlan';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Course, GapSkill } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { fetchGapSkills, fetchRecommendationsWithCourses, fetchProfile, parseTerm } from '@/lib/supabaseQueries';
import { generateCourseRecommendations } from '@/lib/courseRecommendationApi';
import type { RecommendationWithCourse } from '@/lib/supabaseQueries';
import { getStoredGuestUserId } from '@/lib/guestSession';

const MAX_COURSES = 4;
const MAX_CREDITS = 16;

export default function Planner() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get user_id and run_id from URL params or localStorage (validated UUID)
  const userId = searchParams.get('user_id') ?? getStoredGuestUserId() ?? '';
  const runId = searchParams.get('run_id') ?? '';
  
  
  const [plannedCourseIds, setPlannedCourseIds] = useState<string[]>([]);
  const [boostedSkills, setBoostedSkills] = useState<string[]>([]);
  const [skillScores, setSkillScores] = useState<Record<string, number>>({});
  
  // Data state
  const [gapSkills, setGapSkills] = useState<GapSkill[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationWithCourse[]>([]);
  const [profile, setProfile] = useState<{ dream_role: string | null; term: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!userId) {
      toast({
        title: 'No user session',
        description: 'Please start from the beginning and upload your resume.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [gapSkillsData, recommendationsData, profileData] = await Promise.all([
        fetchGapSkills(userId, runId || undefined),
        fetchRecommendationsWithCourses(userId, runId || undefined),
        fetchProfile(userId),
      ]);

      setGapSkills(gapSkillsData);
      setRecommendations(recommendationsData);
      setProfile(profileData);

      // Initialize skill scores from gap skills (for display purposes)
      const scores: Record<string, number> = {};
      gapSkillsData.forEach(skill => {
        // Lower priority = higher gap = lower score
        scores[skill.skill_name] = Math.max(0, 1 - (skill.priority * 0.1));
      });
      setSkillScores(scores);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Failed to load data',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!profile?.term) {
      toast({
        title: 'Missing term information',
        description: 'Please set your term in your profile first',
        variant: 'destructive',
      });
      return;
    }

    const termInfo = parseTerm(profile.term);
    if (!termInfo) {
      toast({
        title: 'Invalid term format',
        description: 'Term must be in format YYYY-semester (e.g., 2026-spring)',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateCourseRecommendations({
        user_id: userId,
        run_id: runId,
        year: termInfo.year,
        semester: termInfo.semester,
        limit: 20,
      });

      toast({
        title: 'Recommendations generated',
        description: 'Your course recommendations have been updated',
      });

      // Reload recommendations
      const newRecommendations = await fetchRecommendationsWithCourses(userId, runId || undefined);
      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      toast({
        title: 'Failed to generate recommendations',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const plannedCourses: Course[] = recommendations
    .filter(rec => plannedCourseIds.includes(rec.course.id))
    .map(rec => rec.course);

  const totalCredits = plannedCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

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

    const recommendation = recommendations.find(rec => rec.course.id === courseId);
    if (!recommendation) return;

    const course = recommendation.course;
    const courseCredits = course.credits || 0;

    if (totalCredits + courseCredits > MAX_CREDITS) {
      toast({
        title: "Credit limit reached",
        description: `This would exceed the ${MAX_CREDITS} credit limit.`,
        variant: "destructive",
      });
      return;
    }

    setPlannedCourseIds(prev => [...prev, courseId]);

    // Track matched gaps for animation
    if (recommendation.matched_gaps.length > 0) {
      setBoostedSkills(recommendation.matched_gaps);
      setTimeout(() => setBoostedSkills([]), 1500);
    }

    toast({
      title: `Added ${course.subject} ${course.number}`,
      description: course.title,
    });
  }, [plannedCourseIds, totalCredits, recommendations, toast]);

  const removeCourse = useCallback((courseId: string) => {
    const recommendation = recommendations.find(rec => rec.course.id === courseId);
    if (!recommendation) return;

    const course = recommendation.course;
    setPlannedCourseIds(prev => prev.filter(id => id !== courseId));

    // Track matched gaps for animation
    if (recommendation.matched_gaps.length > 0) {
      setBoostedSkills(recommendation.matched_gaps);
      setTimeout(() => setBoostedSkills([]), 1500);
    }

    toast({
      title: `Removed ${course.subject} ${course.number}`,
    });
  }, [recommendations, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  const dreamRole = profile?.dream_role || 'your target role';
  const term = profile?.term || '2026-spring';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-6xl px-4 py-8">
        {/* Zone 1: Career Progress Overview */}
        <section className="mb-12">
          <CareerProgress 
            dreamRole={dreamRole}
            gapSkills={gapSkills}
            skillScores={skillScores}
            boostedSkills={boostedSkills}
          />
        </section>

        {/* Zone 2 & 3: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Zone 2: Recommended Courses (Primary) */}
          <section className="lg:col-span-3 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Recommended for you</h2>
                <p className="text-sm text-muted-foreground">
                  {dreamRole ? (
                    <>Based on your goal to become a {dreamRole}, here are courses that will help you get there</>
                  ) : (
                    <>Courses recommended based on your skill gaps</>
                  )}
                </p>
              </div>
              <Button
                onClick={handleGenerateRecommendations}
                disabled={isGenerating || gapSkills.length === 0}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            
            {recommendations.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  {gapSkills.length === 0 
                    ? 'No skill gaps found. Upload a resume and run gap analysis first.'
                    : 'No course recommendations yet. Click "Generate" to find courses that match your skill gaps.'}
                </p>
                {gapSkills.length > 0 && (
                  <Button
                    onClick={handleGenerateRecommendations}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating recommendations...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Generate Recommendations
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
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
            )}
          </section>

          {/* Zone 3: Semester Plan */}
          <section className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <SemesterPlan
                term={term}
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
