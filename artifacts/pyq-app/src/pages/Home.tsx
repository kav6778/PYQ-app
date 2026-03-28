import { Link } from "wouter";
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/use-questions";
import { Button } from "@/components/ui/Button";
import { Library, BrainCircuit, Activity, BookOpen, AlertTriangle } from "lucide-react";

export function Home() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 md:px-12 lg:px-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Abstract dark background" 
            className="w-full h-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary mb-6 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              System Active & Ready
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Master Your Exams with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">AI-Extracted PYQs</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Browse, search, and quiz yourself on thousands of high-quality previous year questions extracted instantly from official PDFs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/browse">
                  Browse Questions
                  <Library className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="glass" asChild className="w-full sm:w-auto border border-white/10">
                <Link href="/quiz">
                  Start Quiz Mode
                  <BrainCircuit className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 md:px-12 lg:px-20 pb-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold">Database Overview</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 glass-card rounded-2xl animate-pulse bg-white/5" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Total Questions" 
                value={stats.total} 
                icon={<BookOpen className="w-6 h-6 text-primary" />}
                trend="+120 this week"
              />
              <StatCard 
                title="Subjects Covered" 
                value={Object.keys(stats.by_subject || {}).length} 
                icon={<Library className="w-6 h-6 text-accent" />}
              />
              <StatCard 
                title="Math Questions" 
                value={stats.math_count} 
                icon={<Activity className="w-6 h-6 text-green-400" />}
              />
              <StatCard 
                title="Needs Review" 
                value={stats.needs_review_count} 
                icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
                alert={stats.needs_review_count > 0}
              />
            </div>
          ) : (
             <div className="p-8 text-center glass-card rounded-2xl">
               <p className="text-muted-foreground">Failed to load statistics.</p>
             </div>
          )}

          {/* Quick Subject Links */}
          {stats?.by_subject && Object.keys(stats.by_subject).length > 0 && (
            <div className="mt-16">
              <h3 className="text-xl font-display font-bold mb-6">Popular Subjects</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(stats.by_subject).slice(0, 8).map(([subject, count], i) => (
                  <Link key={subject} href={`/browse?subject=${encodeURIComponent(subject)}`}>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-5 glass-card rounded-2xl hover:bg-white/5 hover:border-primary/30 transition-all cursor-pointer group"
                    >
                      <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">{subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{count} questions</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, trend, alert }: { title: string, value: number, icon: React.ReactNode, trend?: string, alert?: boolean }) {
  return (
    <div className={`p-6 glass-card rounded-2xl border ${alert ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-xl">
          {icon}
        </div>
        {trend && <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">{trend}</span>}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <h3 className="text-3xl font-display font-bold text-white">{value.toLocaleString()}</h3>
      </div>
    </div>
  );
}
